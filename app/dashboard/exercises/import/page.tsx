'use client'

import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: { exercise: string; error: string }[]
}

interface HistoryExercise {
  id: string
  name_en: string
  name_cn: string
  type_en?: string
  type_cn?: string
  equipment_en?: string
  equipment_cn?: string
  created_at: string
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

  // 历史上传的动作列表
  const [history, setHistory] = useState<HistoryExercise[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyVisible, setHistoryVisible] = useState(20)

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading])

  useEffect(() => {
    if (user) fetchHistory()
  }, [user])

  const fetchHistory = async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/exercises', { headers: { 'x-user-id': user?.id || '' } })
      if (!res.ok) return
      const data: HistoryExercise[] = await res.json()
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setHistory(data)
    } catch {
      // 静默失败，不影响上传功能
    } finally {
      setHistoryLoading(false)
    }
  }

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
          fetchHistory()
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
      'target_muscles_en', 'target_muscles_cn', 'secondary_muscles_en', 'secondary_muscles_cn',
      'body_position_en', 'body_position_cn', 'equipment_en', 'equipment_cn',
      'equipment_setup_en', 'equipment_setup_cn',
      'description_en', 'description_cn', 'instructions_en', 'instructions_cn',
      'cues_en', 'cues_cn', 'contraindications_en', 'contraindications_cn',
      'default_sets', 'default_reps',
      'default_weight', 'default_weight_unit', 'default_duration', 'default_duration_unit',
      'featured_image_url', 'gif_url',
    ]
    const example = [
      'Roll Up', '脊椎伸展', 'Pilates Mat', '垫上普拉提', 'Beginner', '初级',
      'Core, Spine', '核心, 脊椎', 'Shoulders, Hip flexors', '肩部, 髂腰肌',
      'Supine', '仰卧', 'Mat', '垫子',
      '', '',
      'A classic mat exercise', '经典垫上动作',
      '1. Lie flat 2. Roll up slowly', '1. 平躺 2. 缓慢卷起',
      'Imagine zipping up from pubic bone to ribs', '想象从耻骨向肋骨拉拉链',
      'Avoid during pregnancy or with herniated disc', '孕期慎做，腰椎间盘突出禁做',
      3, 10, '', 'kg', 30, 'seconds', '', '',
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, example])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Exercises')
    XLSX.writeFile(wb, 'Exercise_Import_Template.xlsx')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{ background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)', padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', position: 'sticky', top: 0, zIndex: 10 }}>
        <Link href="/dashboard/exercises" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>批量导入动作</h1>
      </header>

      <main style={{ padding: '20px', maxWidth: '700px', margin: '0 auto' }}>

        {/* Success */}
        {result && (
          <div style={{ backgroundColor: result.failed === 0 ? '#EAFAF1' : '#FEF9E7', borderRadius: '10px', padding: '20px', marginBottom: '16px', border: `1px solid ${result.failed === 0 ? '#82E0AA' : '#F7DC6F'}` }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '16px' }}>
              {result.failed === 0 ? '✅ 导入成功 Import Successful' : '⚠️ 部分导入 Partial Import'}
            </p>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>新增 Created: <strong>{result.created}</strong> 条{result.updated > 0 && <> · 更新 Updated: <strong>{result.updated}</strong> 条</>}</p>
            {result.failed > 0 && <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#E74C3C' }}>失败 Failed: <strong>{result.failed}</strong> 条</p>}
            {result.errors.map((e, i) => (
              <p key={i} style={{ margin: '4px 0', fontSize: '12px', color: '#E74C3C' }}>• {e.exercise}: {e.error}</p>
            ))}
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <Link href="/dashboard/exercises" style={{ color: 'var(--c-brand)', fontWeight: 'bold', fontSize: '14px', textDecoration: 'none' }}>
                → 查看动作库 View Library
              </Link>
              <button
                onClick={() => setResult(null)}
                style={{ background: 'none', border: 'none', color: 'var(--c-brand)', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', padding: 0 }}
              >
                → 继续导入 Import More
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ backgroundColor: '#FDEDEC', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: '#E74C3C', fontSize: '14px' }}>
            ❌ {error}
          </div>
        )}

        {/* Instructions */}
        <div style={{ background: 'var(--c-card-bg)', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
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
            style={{ marginTop: '14px', padding: '10px 20px', backgroundColor: 'var(--c-brand)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
          >
            📥 下载模板 Download Template
          </button>
        </div>

        {/* Upload */}
        {!result && (
          <div style={{ background: 'var(--c-card-bg)', borderRadius: '10px', padding: '20px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>上传文件 Upload File</h2>

            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? 'var(--c-brand)' : '#ddd'}`,
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
                  <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: 'var(--c-brand)' }}>{file.name}</p>
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
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--c-brand)', fontWeight: 'bold' }}>预览前 {preview.length} 行 / Preview first {preview.length} rows</p>
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
                style={{ flex: 2, padding: '12px', backgroundColor: 'var(--c-brand)', color: 'white', border: 'none', borderRadius: '8px', cursor: file && !isLoading ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '14px', opacity: file && !isLoading ? 1 : 0.5 }}
              >
                {isLoading ? '导入中... Importing...' : `导入动作 Import${preview.length > 0 ? ` (预览 ${preview.length} 行+)` : ''}`}
              </button>
            </div>
          </div>
        )}

        {/* 历史上传的动作列表 */}
        <div style={{ background: 'var(--c-card-bg)', borderRadius: '10px', padding: '20px', marginTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '15px' }}>历史上传的动作</h2>
            {!historyLoading && <span style={{ fontSize: '12px', color: '#999' }}>共 {history.length} 条</span>}
          </div>

          {historyLoading ? (
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>加载中...</p>
          ) : history.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#999', margin: 0 }}>还没有上传过动作</p>
          ) : (
            <>
              <div style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                {history.slice(0, historyVisible).map((ex, i) => (
                  <Link
                    key={ex.id}
                    href={`/dashboard/exercises/${ex.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px', textDecoration: 'none', color: 'inherit',
                      borderBottom: i < Math.min(history.length, historyVisible) - 1 ? '1px solid #f2f2f2' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#bbb', width: '24px', flexShrink: 0 }}>{i + 1}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ex.name_cn || ex.name_en}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#999' }}>
                        {[ex.type_cn || ex.type_en, ex.equipment_cn || ex.equipment_en].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <span style={{ fontSize: '11px', color: '#bbb', flexShrink: 0 }}>
                      {new Date(ex.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </Link>
                ))}
              </div>

              {historyVisible < history.length && (
                <button
                  onClick={() => setHistoryVisible(v => v + 20)}
                  style={{ width: '100%', marginTop: '12px', padding: '10px', background: 'var(--c-fill-light)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--c-brand)', fontWeight: 'bold' }}
                >
                  显示更多（还有 {history.length - historyVisible} 条）
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
