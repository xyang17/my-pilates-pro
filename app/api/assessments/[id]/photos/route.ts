import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BUCKET = 'assessment-photos'

// POST /api/assessments/[id]/photos — upload photo, returns public URL
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    // Validate type
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG/PNG/WEBP/HEIC 格式' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${params.id}/${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      // Bucket may not exist yet — try creating it then retry
      if (uploadError.message.includes('Bucket not found')) {
        await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
        const { error: retryError } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(path, arrayBuffer, { contentType: file.type, upsert: false })
        if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 })
      } else {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    // Append URL to the assessment's photo_urls array
    const { data: existing } = await supabaseAdmin
      .from('body_assessment').select('photo_urls').eq('id', params.id).single()

    const currentUrls: string[] = existing?.photo_urls || []
    await supabaseAdmin
      .from('body_assessment')
      .update({ photo_urls: [...currentUrls, publicUrl] })
      .eq('id', params.id)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/assessments/[id]/photos — remove a photo URL
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const { data: existing } = await supabaseAdmin
      .from('body_assessment').select('photo_urls').eq('id', params.id).single()

    const filtered = (existing?.photo_urls || []).filter((u: string) => u !== url)
    await supabaseAdmin
      .from('body_assessment')
      .update({ photo_urls: filtered })
      .eq('id', params.id)

    // Also delete from storage
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const storageBase = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
    if (url.startsWith(storageBase)) {
      const storagePath = url.replace(storageBase, '')
      await supabaseAdmin.storage.from(BUCKET).remove([storagePath])
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
