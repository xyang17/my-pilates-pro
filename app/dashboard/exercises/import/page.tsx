'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface ImportResult {
  created: number
  failed: number
  errors: { exercise: string; error: string }[]
}

export default function ImportExercisesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  const parseFile = (f: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result as ArrayBuffer, { type: 'array' })
        const ws = wb.Sheets['Exercises']
        if (!ws) { setError('找不到 "Exercises" sheet / Sheet "Exercises" not found'); return }
        const rows = XLSX.utils.sheet_to_json(ws)
        setPreview(rows.slice(0, 3))
        setError('')
      } catch {
        setError('文件解析失败，请检查格式 / Failed to parse file')
      }
    }
    reader.readAsArrayBuffer(f)
  }

  const handleFileChange = (f: File | null) => {
    if (!f) return
    if (!f.name.endsWith('.xlsx')) {
      setError('只支持 .xlsx 格式 / Only .xlsx files are supported')
      return
    }
    setFile(f)
    setError('')
    setResult(null)
    parseFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFileChange(e.dataTransfer.files?.[0] || null)
  }

  const handleSubmit = async () => {
    if (!file) return
    setIsLoading(true)
    setError('')
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const wb = XLSX.read(e.target?.result as ArrayBuffer, { type: 'array' })
          const ws = wb.Sheets['Exercises']
          if (!ws) { setError('找不到 "Exercises" sheet'); setIsLoading(false); return }
          const rows = XLSX.utils.sheet_to_json(ws)
          if (rows.length === 0) { setError('文件中没有数据 / No data found'); setIsLoading(false); return }

          const res = await fetch('/api/exercises/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': user?.id || '' },
            body: JSON.stringify({ exercises: rows }),
          })
          const data = await res.json()
          if (!res.ok) { setError(data.error || '导入失败'); setIsLoading(false); return }
          setResult(data)
          setFile(null)
          setPreview([])
        } catch (err: any) {
          setError(err.message)
        } finally {
          setIsLoading(false)
        }
      }
      reader.readAsArrayBuffer(file)
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  const downloadTemplate = () => {
    const headers = [
      'name_en', 'name_cn', 'type_en', 'type_cn', 'difficulty_en', 'difficulty_cn',
      'target_muscles_en', 'target_muscles_cn', 'description_en', 'description_cn',
      'instructions_en', 'instructions_cn', 'default_sets', 'default_reps',
      'default_weight', 'default_weight_unit', 'default_duration', 'default_duration_unit',
      'featured_image_url',
    ]
    const example = [
      'Roll Up', '脊椎伸展', 'Pilates Mat', '垫上普拉提', 'Beginner', '初级',
      'Core, Spine', '核心, 脊椎', 'A classic mat exercise', '经典垫上动作',
      '1. Lie flat 2. Roll up slowly', '1. 平躺 2. 缓慢卷起', 3, 10, '', 'kg', 30, 'seconds', '',
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Exercises')
    XLSX.writeFile(wb, 'Exercise_Import_Template.xlsx')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard/exercises" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>← 返回 Back</Link>
        <h1 style={{ margin: 0, fontSize: '18px' }}>批量导入动作 Import Exercises</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>

        {/* Success */}
        {result && (
          <div style={{ backgroundColor: result.failed === 0 ? '#EAFAF1' : '#FEF9E7', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: `1px solid ${result.failed === 0 ? '#82E0AA' : '#F7DC6F'}` }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '16px' }}>
              {result.failed === 0 ? '✅ 导入成功 Import Successful' : '⚠️ 部分导入 Partial Import'}
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>成功 Created: <strong>{result.created}</strong> 条</p>
            {result.failed > 0 && <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#E74C3C' }}>失败 Failed: <strong>{result.failed}</strong> 条</p>}
            {result.errors.map((e, i) => (
              <p key={i} style={{ margin: '4px 0', fontSize: '12px', color: '#E74C3C' }}>• {e.exercise}: {e.error}</p>
            ))}
            <Link href="/dashboard/exercises" style={{ display: 'inline-block', marginTop: '12px', color: '#9B7DB5', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>
              → 查看动作库 View Library
            </Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: '#FDEDEC', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#E74C3C', fontSize: '14px' }}>
            ❌ {error}
          </div>
        )}

        {/* Instructions */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ margin: '0 0 12px 0', fontSize: '15px' }}>使用说明 How to Import</h2>
          <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '2', fontSize: '13px', color: '#555' }}>
            <li>下载模板 / Download the template below</li>
            <li>在 <strong>Exercises</strong> sheet 填写动作数据 / Fill exercises in the Exercises sheet</li>
            <li>必填：name_en（英文名）、name_cn（中文名）/ Required: name_en, name_cn</li>
            <li>保存为 .xlsx 格式 / Save as .xlsx</li>
            <li>上传文件点击导入 / Upload and click Import</li>
          </ol>
          <button
            onClick={downloadTemplate}
            style={{ marginTop: '14px', padding: '10px 20px', backgroundColor: '#9B7DB5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            📥 下载模板 Download Template
          </button>
        </div>

        {/* Upload */}
        {!result && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>上传文件 Upload File</h2>

            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? '#9B7DB5' : '#ddd'}`,
                borderRadius: '10px',
                padding: '40px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: dragging ? '#f9f6fc' : '#fafafa',
                marginBottom: '16px',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
              {file ? (
                <>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#9B7DB5' }}>{file.name}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>点击重新选择 / Click to change</p>
                </>
              ) : (
                <>
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#666' }}>拖拽或点击选择文件</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>Drag & drop or click to select · .xlsx only</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx" onChange={e => handleFileChange(e.target.files?.[0] || null)} style={{ display: 'none' }} />

            {/* Preview */}
            {preview.length > 0 && (
              <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9f6fc', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#9B7DB5', fontWeight: 'bold' }}>预览前 {preview.length} 行 / Preview first {preview.length} rows</p>
                {preview.map((row, i) => (
                  <p key={i} style={{ margin: '2px 0', fontSize: '12px', color: '#555' }}>
                    {i + 1}. {(row as any).name_en || '—'} / {(row as any).name_cn || '—'}
                  </p>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <Link href="/dashboard/exercises" style={{ flex: 1, padding: '12px', textAlign: 'center', backgroundColor: '#f0f0f0', color: '#333', textDecoration: 'none', borderRadius: '8px', fontSize: '14px' }}>
                取消 Cancel
              </Link>
              <button
                onClick={handleSubmit}
                disabled={!file || isLoading}
                style={{ flex: 2, padding: '12px', backgroundColor: '#9B7DB5', color: 'white', border: 'none', borderRadius: '8px', cursor: file && !isLoading ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px', opacity: file && !isLoading ? 1 : 0.5 }}
              >
                {isLoading ? '导入中... Importing...' : `导入动作 Import${preview.length > 0 ? ` (预览 ${preview.length} 行+)` : ''}`}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
