'use client'

import { useAuth } from '@/context/AuthContext'
import { useLang } from '@/context/LanguageContext'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface CalendarClass {
  id: string
  name: string
  date: string
  start_time?: string
  duration: number
  discipline?: string
  class_type: string
  level?: string
  status: string
  color?: string
  trainer_id?: string
  assigned_to?: string | null
}

const DAY_NAMES_CN = ['日', '一', '二', '三', '四', '五', '六']
const MONTH_NAMES_CN = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

const STATUS_CONFIG: Record<string, { bar: string; bg: string; color: string; border: string; label: string }> = {
  planned:     { bar: '#C2AFCC', bg: '#EDE6F4', color: '#9888B0', border: '1px solid #C2AFCC',    label: '未开始' },
  in_progress: { bar: '#9880B8', bg: '#C2AFCC', color: '#fff',    border: '1px solid #9880B8',    label: '进行中' },
  completed:   { bar: '#9880B8', bg: '#EDE6F4', color: '#5A4878', border: '1.5px solid #9880B8',  label: '已完成' },
}

export default function CalendarPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { lang, t } = useLang()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [classes, setClasses] = useState<CalendarClass[]>([])
  const [clientMap, setClientMap] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) {
      fetchClasses()
      if (userRole === 'ADMIN' || userRole === 'TRAINER') fetchClients()
    }
  }, [user, authLoading, year, month])

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients', { headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' } })
      if (res.ok) {
        const data: { id: string; name: string; email: string }[] = await res.json()
        const map: Record<string, string> = {}
        data.forEach(c => { map[c.id] = c.name || c.email })
        setClientMap(map)
      }
    } catch { /* non-critical */ }
  }

  const fetchClasses = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/classes', { headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' } })
      if (res.ok) {
        const data = await res.json()
        setClasses(Array.isArray(data) ? data : (data.classes || []))
      }
    } finally { setIsLoading(false) }
  }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = today.toISOString().slice(0, 10)

  const classByDate: Record<string, CalendarClass[]> = {}
  classes.forEach(c => {
    if (!classByDate[c.date]) classByDate[c.date] = []
    classByDate[c.date].push(c)
  })

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1); setSelectedDate(null) }
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1); setSelectedDate(null) }
  const formatDateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const selectedClasses = selectedDate ? (classByDate[selectedDate] || []) : []

  if (authLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>加载中…</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--c-page-bg)' }}>
      {/* Header */}
      <header style={{
        background: 'var(--c-card-bg)',
        borderBottom: '1px solid var(--c-border)',
        padding: '0 var(--sp-5)',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <Link href="/dashboard" style={{ color: 'var(--c-text-secondary)', textDecoration: 'none', fontSize: 'var(--text-sm)' }}>← 返回</Link>
        <h1 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 600, color: 'var(--c-text-primary)', flex: 1 }}>
          {userRole === 'CLIENT' ? '我的课程' : '课程日历'}
        </h1>
        {userRole !== 'CLIENT' && (
          <Link href="/dashboard/classes/new" style={{
            padding: '7px 16px',
            background: 'var(--c-brand)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: 'var(--r-sm)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
          }}>
            + 新建
          </Link>
        )}
      </header>

      <main style={{ padding: 'var(--sp-4)', maxWidth: 700, margin: '0 auto' }}>
        {/* 日历卡片 */}
        <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)', marginBottom: 'var(--sp-4)' }}>
          {/* 月份导航 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-5)' }}>
            <button onClick={prevMonth} style={{
              background: 'var(--c-fill-light)', border: '1px solid var(--c-border)',
              borderRadius: 'var(--r-sm)', width: 36, height: 36,
              cursor: 'pointer', fontSize: 18, color: 'var(--c-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>‹</button>
            <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
              {lang === 'zh' ? `${year}年 ${MONTH_NAMES_CN[month]}` : `${MONTH_NAMES_EN[month]} ${year}`}
            </span>
            <button onClick={nextMonth} style={{
              background: 'var(--c-fill-light)', border: '1px solid var(--c-border)',
              borderRadius: 'var(--r-sm)', width: 36, height: 36,
              cursor: 'pointer', fontSize: 18, color: 'var(--c-text-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>›</button>
          </div>

          {/* 星期头 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {DAY_NAMES_CN.map((d, i) => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 'var(--text-xs)',
                color: i === 0 || i === 6 ? 'var(--c-pink-mist)' : 'var(--c-text-hint)',
                padding: '4px 0', fontWeight: 500,
              }}>{d}</div>
            ))}
          </div>

          {/* 日期格子 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} style={{ aspectRatio: '1' }} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = formatDateStr(day)
              const dayClasses = classByDate[dateStr] || []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    aspectRatio: '1', padding: 2, cursor: 'pointer',
                    borderRadius: 'var(--r-sm)',
                    background: isSelected ? 'var(--c-fill-light)' : isToday ? '#F5F0F8' : 'transparent',
                    border: isSelected ? '1.5px solid var(--c-brand)' : isToday ? '1.5px solid var(--c-lavender)' : '1.5px solid transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--c-fill-light)' }}
                  onMouseLeave={e => { if (!isSelected && !isToday) e.currentTarget.style.background = 'transparent'; else if (isToday && !isSelected) e.currentTarget.style.background = '#F5F0F8' }}
                >
                  <span style={{
                    fontSize: 'var(--text-sm)',
                    fontWeight: isToday || isSelected ? 600 : 400,
                    color: isSelected ? 'var(--c-brand)' : isToday ? 'var(--c-brand)' : 'var(--c-text-primary)',
                    lineHeight: 1.6,
                  }}>{day}</span>
                  {dayClasses.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayClasses.slice(0, 3).map((c, idx) => (
                        <div key={idx} style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: c.color || 'var(--c-lavender)',
                        }} />
                      ))}
                      {dayClasses.length > 3 && <span style={{ fontSize: 9, color: 'var(--c-text-hint)' }}>+{dayClasses.length - 3}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 选中日期的课程 */}
        {selectedDate && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-4)', paddingBottom: 'var(--sp-4)', borderBottom: '1px solid var(--c-border)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </h3>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--c-text-hint)' }}>
                {selectedClasses.length > 0 ? `${selectedClasses.length} 节` : '无课程'}
              </span>
            </div>
            {selectedClasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--sp-6) 0', color: 'var(--c-text-hint)' }}>
                <p style={{ margin: '0 0 var(--sp-3)' }}>暂无课程</p>
                <Link href="/dashboard/classes/new" style={{ color: 'var(--c-brand)', fontSize: 'var(--text-sm)', textDecoration: 'none' }}>+ 新建课程</Link>
              </div>
            ) : (
              selectedClasses
                .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                .map(c => <CalendarClassCard key={c.id} c={c} clientMap={clientMap} />)
            )}
          </div>
        )}

        {/* 未选中日期：本月概览 */}
        {!selectedDate && (
          <div style={{ background: 'var(--c-card-bg)', border: '1px solid var(--c-border)', borderRadius: 'var(--r-lg)', padding: 'var(--sp-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 'var(--sp-4)', paddingBottom: 'var(--sp-4)', borderBottom: '1px solid var(--c-border)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--c-text-primary)' }}>
                {MONTH_NAMES_CN[month]} 本月课程
              </h3>
              {isLoading && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--c-text-hint)' }}>加载中…</span>}
            </div>
            {(() => {
              const monthClasses = classes
                .filter(c => c.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
                .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')))
              if (monthClasses.length === 0 && !isLoading) return (
                <p style={{ color: 'var(--c-text-hint)', textAlign: 'center', padding: 'var(--sp-6) 0', fontSize: 'var(--text-base)' }}>本月暂无课程</p>
              )
              return monthClasses.map(c => <CalendarClassCard key={c.id} c={c} showDate clientMap={clientMap} />)
            })()}
          </div>
        )}
      </main>
    </div>
  )
}

function CalendarClassCard({ c, showDate, clientMap = {} }: { c: CalendarClass; showDate?: boolean; clientMap?: Record<string, string> }) {
  const { lang, t } = useLang()
  const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.planned
  const clientName = c.class_type === 'private' && c.assigned_to ? clientMap[c.assigned_to] : null

  return (
    <Link href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        padding: 'var(--sp-3) 0', borderBottom: '1px solid var(--c-border)',
        transition: 'opacity 0.1s',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {/* 状态色条 */}
        <div style={{ width: 3, alignSelf: 'stretch', minHeight: 36, borderRadius: 2, background: cfg.bar, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 3 }}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--c-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.name}
            </p>
            <span style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--r-full)', background: cfg.bg, color: cfg.color, border: cfg.border, fontWeight: 500, flexShrink: 0 }}>
              {cfg.label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--c-text-secondary)' }}>
            {showDate && `${new Date(c.date + 'T12:00:00').toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })} · `}
            {c.start_time && `${c.start_time.slice(0, 5)} · `}
            {c.duration} 分钟
            {c.discipline && ` · ${c.discipline}`}
            {clientName && (
              <span style={{
                marginLeft: 'var(--sp-2)',
                background: 'var(--c-fill-light)',
                color: 'var(--c-brand)',
                padding: '1px 7px',
                borderRadius: 'var(--r-full)',
                fontSize: 'var(--text-xs)',
                border: '1px solid var(--c-border-em)',
              }}>
                {clientName}
              </span>
            )}
          </p>
        </div>

        <span style={{ color: 'var(--c-text-hint)', fontSize: 'var(--text-base)', flexShrink: 0 }}>›</span>
      </div>
    </Link>
  )
}
