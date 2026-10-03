'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useToast } from '@/context/ToastContext'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WorkoutForm } from '@/components/personal-workout/WorkoutForm'
import { PersonalWorkout, TYPE_META, exerciseSummary } from '@/components/personal-workout/types'

// 一条个人训练记录：查看 / 编辑 / 删除 / 照这次再记一次

export default function RecordDetailPage() {
  const { user, userRole } = useAuth()
  const { lang, t } = useLang()
  const { showToast } = useToast()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [w, setW] = useState<PersonalWorkout | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const headers = { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' }

  useEffect(() => {
    if (!user || !id) return
    fetch(`/api/personal-workouts/${id}`, { headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' } })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(r.status === 404 ? t('这条记录不存在或已删除', 'Not found') : (d.error || '加载失败'))
        setW(d)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  // t 不放进依赖：它不一定是稳定引用，放进去可能每次渲染都重新拉
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userRole, id])

  const handleDelete = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      const r = await fetch(`/api/personal-workouts/${id}`, { method: 'DELETE', headers })
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || '删除失败')
      showToast(t('已删除', 'Deleted'), 'success')
      router.replace('/dashboard/my-training/records')
    } catch (e: any) {
      showToast(e.message, 'error')
      setDeleting(false)
    }
  }

  const meta = w ? (TYPE_META[w.type] || TYPE_META.other) : TYPE_META.other
  const fmtDate = (d: string) => {
    const dt = new Date(d + 'T00:00:00')
    return lang === 'zh'
      ? `${dt.getFullYear()}年${dt.getMonth() + 1}月${dt.getDate()}日 周${'日一二三四五六'[dt.getDay()]}`
      : dt.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' })
  }

  const card: React.CSSProperties = { background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)' }
  const btn: React.CSSProperties = {
    flex: 1, padding: 11, borderRadius: 10, fontSize: 14, cursor: 'pointer',
    border: '1px solid var(--c-border)', background: 'var(--c-card-bg)', color: 'var(--c-text-primary)',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard/my-training/records" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 14 }}>← {t('训练记录', 'Workouts')}</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          {editing ? t('编辑记录', 'Edit') : ''}
        </h1>
        {w && !editing && (
          <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', color: 'var(--c-brand)', fontSize: 14, cursor: 'pointer' }}>
            {t('编辑', 'Edit')}
          </button>
        )}
      </header>

      <main style={{ padding: 'var(--sp-5)', maxWidth: 640, margin: '0 auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)', padding: 40 }}>{t('加载中…', 'Loading…')}</p>
        ) : error || !w ? (
          <div style={{ background: 'var(--c-error-bg)', border: '1px solid var(--c-error)', color: '#8C4A4A', padding: 12, borderRadius: 8, fontSize: 13 }}>{error}</div>
        ) : editing ? (
          <WorkoutForm
            userId={user!.id} userRole={userRole || ''} lang={lang} t={t}
            mode="edit" workoutId={w.id} initial={w}
            onSaved={nw => { setW(nw); setEditing(false); showToast(t('已保存', 'Saved'), 'success') }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div style={{ ...card, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 12, padding: '2px 9px', borderRadius: 8, background: meta.bg, color: meta.color, fontWeight: 600 }}>
                  {lang === 'zh' ? meta.zh : meta.en}
                </span>
                {w.source === 'timer' && <span style={{ fontSize: 11, color: 'var(--c-text-secondary)' }}>⏱ {t('计时器记录', 'From timer')}</span>}
              </div>
              <h2 style={{ margin: '0 0 6px', fontSize: 20, color: 'var(--c-text-primary)' }}>
                {w.title || (lang === 'zh' ? `${meta.zh}训练` : `${meta.en} workout`)}
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--c-text-secondary)' }}>
                {fmtDate(w.date)}
                {w.duration_min ? ` · ${w.duration_min} ${t('分钟', 'min')}` : ''}
              </p>
              {w.notes && <p style={{ margin: '12px 0 0', fontSize: 14, color: 'var(--c-text-primary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{w.notes}</p>}
            </div>

            <div style={{ ...card, overflow: 'hidden', marginBottom: 18 }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--c-border)', fontSize: 14, fontWeight: 600, color: 'var(--c-text-primary)' }}>
                {t('动作明细', 'Exercises')}<span style={{ fontWeight: 400, color: 'var(--c-text-secondary)', marginLeft: 6 }}>{w.exercises.length}</span>
              </div>
              {w.exercises.length === 0 ? (
                <p style={{ margin: 0, padding: 20, textAlign: 'center', color: '#bbb', fontSize: 13 }}>{t('没有记动作', 'No exercises logged')}</p>
              ) : w.exercises.map((e, i) => (
                <div key={e.id || i} style={{ padding: '11px 14px', borderBottom: i < w.exercises.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--c-text-primary)' }}>
                      {i + 1}. {e.exercise_id
                        ? <Link href={`/dashboard/exercises/${e.exercise_id}`} style={{ color: 'inherit', textDecoration: 'none' }}>{e.name}</Link>
                        : e.name}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--c-brand)', fontWeight: 600, whiteSpace: 'nowrap' }}>{exerciseSummary(e, lang)}</span>
                  </div>
                  {e.notes && <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--c-text-secondary)' }}>{e.notes}</p>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <Link href={`/dashboard/my-training/records/new?copy=${w.id}`}
                style={{ ...btn, textAlign: 'center', textDecoration: 'none', color: 'var(--c-brand)', borderColor: 'var(--c-brand)' }}>
                {t('照这次再记一次', 'Log again')}
              </Link>
            </div>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)} style={{ ...btn, width: '100%', color: '#B07A7A' }}>{t('删除这条记录', 'Delete')}</button>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmDel(false)} style={btn}>{t('取消', 'Cancel')}</button>
                <button onClick={handleDelete} disabled={deleting} style={{ ...btn, background: '#C08A8A', color: 'white', border: 'none' }}>
                  {deleting ? t('删除中…', 'Deleting…') : t('确认删除', 'Confirm delete')}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
