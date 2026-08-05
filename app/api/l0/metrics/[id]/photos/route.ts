import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/l0-server'

const BUCKET = 'assessment-photos'

// POST /api/l0/metrics/[id]/photos — 上传体测照片/设备报告截图
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: '仅支持 JPG/PNG/WEBP/HEIC 格式' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `l0/${id}/${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET).upload(path, arrayBuffer, { contentType: file.type, upsert: false })

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found')) {
        await supabaseAdmin.storage.createBucket(BUCKET, { public: true })
        const { error: retryError } = await supabaseAdmin.storage
          .from(BUCKET).upload(path, arrayBuffer, { contentType: file.type, upsert: false })
        if (retryError) return NextResponse.json({ error: retryError.message }, { status: 500 })
      } else {
        return NextResponse.json({ error: uploadError.message }, { status: 500 })
      }
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { data: existing } = await supabaseAdmin
      .from('l0_body_metric').select('photo_urls').eq('id', id).single()

    await supabaseAdmin
      .from('l0_body_metric')
      .update({ photo_urls: [...(existing?.photo_urls || []), publicUrl] })
      .eq('id', id)

    return NextResponse.json({ url: publicUrl })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE /api/l0/metrics/[id]/photos  body: { url }
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userId = req.headers.get('x-user-id')
    const userRole = req.headers.get('x-user-role')
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (userRole === 'CLIENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { url } = await req.json()
    if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

    const { data: existing } = await supabaseAdmin
      .from('l0_body_metric').select('photo_urls').eq('id', id).single()

    await supabaseAdmin
      .from('l0_body_metric')
      .update({ photo_urls: (existing?.photo_urls || []).filter((u: string) => u !== url) })
      .eq('id', id)

    const storageBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`
    if (url.startsWith(storageBase)) {
      await supabaseAdmin.storage.from(BUCKET).remove([url.replace(storageBase, '')])
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
