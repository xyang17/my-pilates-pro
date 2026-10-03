'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useToast } from '@/context/ToastContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { WorkoutForm, WorkoutInitial } from '@/components/personal-workout/WorkoutForm'
import { PersonalWorkout, localToday } from '@/components/personal-workout/types'

// 新建一条个人训练记录。?copy=<id> 时以那条为底稿（"照这次再练一遍"），日期改成今天。

function NewRecordInner() {
  const { user, userRole } = useAuth()
  const { lang, t } = useLang()
  const { showToast } = useToast()
  const router = useRouter()
  const copyId = useSearchParams().get('copy')
  const [initial, setInitial] = useState<WorkoutInitial | null>(copyId ? null : {})

  useEffect(() => {
    if (!copyId || !user) return
    fetch(`/api/personal-workouts/${copyId}`, { headers: { 'x-user-id': user.id, 'x-user-role': userRole || '' } })
      .then(r => r.ok ? r.json() : null)
      .then((w: PersonalWorkout | null) => {
        if (!w) { setInitial({}); return }
        setInitial({
          date: localToday(), type: w.type, title: w.title, duration_min: w.duration_min, notes: null,
          exercises: w.exercises.map(e => ({ ...e, id: undefined, notes: null })),
        })
      })
      .catch(() => setInitial({}))
  }, [copyId, user, userRole])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      <header style={{
        background: 'var(--c-card-bg)', borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)', height: 56, display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/dashboard/my-training/records" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 14 }}>← {t('返回', 'Back')}</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
          {copyId ? t('照这次再记一次', 'Log again') : t('记一次训练', 'Log a workout')}
        </h1>
      </header>
      <main style={{ padding: 'var(--sp-5)', maxWidth: 640, margin: '0 auto' }}>
        {!user || initial === null ? (
          <p style={{ textAlign: 'center', color: 'var(--c-text-secondary)', padding: 40 }}>{t('加载中…', 'Loading…')}</p>
        ) : (
          <WorkoutForm
            userId={user.id} userRole={userRole || ''} lang={lang} t={t}
            mode="create" initial={initial}
            onSaved={w => { showToast(t('已记录', 'Saved'), 'success'); router.replace(`/dashboard/my-training/records/${w.id}`) }}
            onCancel={() => router.back()}
          />
        )}
      </main>
    </div>
  )
}

export default function NewRecordPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center' }}>加载中…</div>}>
      <NewRecordInner />
    </Suspense>
  )
}
