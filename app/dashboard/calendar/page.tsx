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
}

const DAY_NAMES_CN = ['日', '一', '二', '三', '四', '五', '六']
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_NAMES_CN = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

export default function CalendarPage() {
  const { user, userRole, loading: authLoading } = useAuth()
  const router = useRouter()
  const { lang, t } = useLang()

  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [classes, setClasses] = useState<CalendarClass[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) { router.push('/auth/login'); return }
    if (user) fetchClasses()
  }, [user, authLoading, year, month])

  const fetchClasses = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/classes', {
        headers: { 'x-user-id': user?.id || '', 'x-user-role': userRole || '' },
      })
      if (res.ok) {
        const data = await res.json()
        // API may return { classes: [] } or []
        setClasses(Array.isArray(data) ? data : (data.classes || []))
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = today.toISOString().slice(0, 10)

  // Map classes to date strings
  const classByDate: Record<string, CalendarClass[]> = {}
  classes.forEach(c => {
    if (!classByDate[c.date]) classByDate[c.date] = []
    classByDate[c.date].push(c)
  })

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  const formatDateStr = (d: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  const selectedClasses = selectedDate ? (classByDate[selectedDate] || []) : []

  if (authLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <header style={{ backgroundColor: '#9B7DB5', color: 'white', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link href="/dashboard" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>← 返回 Back</Link>
        <h1 style={{ margin: 0, fontSize: '18px', flex: 1 }}>{t('课程日历', 'Calendar')}</h1>
        <Link href="/dashboard/classes/new" style={{ backgroundColor: 'white', color: '#9B7DB5', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>
          + 新建课程
        </Link>
      </header>

      <main style={{ padding: '16px', maxWidth: '700px', margin: '0 auto' }}>
        {/* Month nav */}
        <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button onClick={prevMonth} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>{lang === 'zh' ? `${year}年 ${MONTH_NAMES_CN[month]}` : `${MONTH_NAMES_EN[month]} ${year}`}</span>
            </div>
            <button onClick={nextMonth} style={{ background: 'none', border: '1px solid #ddd', borderRadius: '8px', width: '36px', height: '36px', cursor: 'pointer', fontSize: '16px' }}>›</button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '4px' }}>
            {(lang === 'zh' ? DAY_NAMES_CN : DAY_NAMES_EN).map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '12px', color: i === 0 || i === 6 ? '#E8A87C' : '#999', padding: '4px 0' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ aspectRatio: '1', padding: '2px' }} />
            ))}
            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = formatDateStr(day)
              const dayClasses = classByDate[dateStr] || []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDate
              const isWeekend = (new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6)

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    aspectRatio: '1',
                    padding: '2px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? '#f3eef9' : isToday ? '#f9f6fc' : 'transparent',
                    border: isSelected ? '2px solid #9B7DB5' : isToday ? '2px solid #d4b8f0' : '2px solid transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                  }}
                >
                  <span style={{
                    fontSize: '13px',
                    fontWeight: isToday || isSelected ? 'bold' : 'normal',
                    color: isSelected ? '#9B7DB5' : isToday ? '#9B7DB5' : isWeekend ? '#E8A87C' : '#333',
                    lineHeight: '1.4',
                  }}>{day}</span>
                  {/* Dots for classes */}
                  {dayClasses.length > 0 && (
                    <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {dayClasses.slice(0, 3).map((c, idx) => (
                        <div key={idx} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: c.color || '#9B7DB5' }} />
                      ))}
                      {dayClasses.length > 3 && <span style={{ fontSize: '9px', color: '#999' }}>+{dayClasses.length - 3}</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Selected date classes */}
        {selectedDate && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', borderBottom: '2px solid #f3eef9', paddingBottom: '10px' }}>
              {new Date(selectedDate + 'T12:00:00').toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', day: 'numeric', weekday: 'long' })}
              <span style={{ fontSize: '13px', color: '#999', marginLeft: '8px' }}>
                {selectedClasses.length > 0 ? `${selectedClasses.length} 节课` : '无课程'}
              </span>
            </h3>
            {selectedClasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#bbb' }}>
                <p style={{ margin: '0 0 12px 0' }}>{t('暂无课程', 'No classes')}</p>
                <Link href="/dashboard/classes/new" style={{ color: '#9B7DB5', fontSize: '14px' }}>{t('+ 新建课程', '+ Add Class')}</Link>
              </div>
            ) : (
              selectedClasses
                .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))
                .map(c => <CalendarClassCard key={c.id} c={c} />)
            )}
          </div>
        )}

        {/* If no date selected, show today's or upcoming classes */}
        {!selectedDate && (
          <div style={{ backgroundColor: 'white', borderRadius: '10px', padding: '20px' }}>
            <h3 style={{ margin: '0 0 14px 0', fontSize: '15px', borderBottom: '2px solid #f3eef9', paddingBottom: '10px' }}>
              {t(`${MONTH_NAMES_CN[month]} 本月课程`, `${MONTH_NAMES_EN[month]} Overview`)}
              {isLoading && <span style={{ fontSize: '12px', color: '#bbb', marginLeft: '8px' }}>{t('加载中...', 'Loading...')}</span>}
            </h3>
            {(() => {
              const monthClasses = classes
                .filter(c => c.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
                .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')))
              if (monthClasses.length === 0 && !isLoading) return (
                <p style={{ color: '#bbb', textAlign: 'center', padding: '20px 0' }}>{t('本月暂无课程', 'No classes this month')}</p>
              )
              return monthClasses.map(c => <CalendarClassCard key={c.id} c={c} showDate />)
            })()}
          </div>
        )}
      </main>
    </div>
  )
}

function CalendarClassCard({ c, showDate }: { c: CalendarClass; showDate?: boolean }) {
  const { lang, t } = useLang()
  const STATUS_LABEL_ZH: Record<string, string> = { planned: '未开始', in_progress: '进行中', completed: '已完成' }
  const STATUS_LABEL_EN: Record<string, string> = { planned: 'Planned', in_progress: 'In Progress', completed: 'Completed' }
  const STATUS_LABEL = lang === 'zh' ? STATUS_LABEL_ZH : STATUS_LABEL_EN
  const STATUS_BG: Record<string, string> = { planned: '#EBF5FB', in_progress: '#FEF9E7', completed: '#EAFAF1' }
  const STATUS_COLOR: Record<string, string> = { planned: '#2980B9', in_progress: '#D4AC0D', completed: '#1E8449' }

  return (
    <Link href={`/dashboard/classes/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f5f5f5' }}>
        <div style={{ width: '4px', height: '48px', borderRadius: '2px', backgroundColor: c.color || '#9B7DB5', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{c.name}</p>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', backgroundColor: STATUS_BG[c.status] || '#f0f0f0', color: STATUS_COLOR[c.status] || '#888' }}>
              {STATUS_LABEL[c.status] || c.status}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#999' }}>
            {showDate && `${new Date(c.date + 'T12:00:00').toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' })} · `}
            {c.start_time && `${c.start_time.slice(0, 5)} · `}
            {c.duration}{t('分钟', 'min')}
            {c.discipline && ` · ${c.discipline}`}
          </p>
        </div>
        <span style={{ fontSize: '12px', color: '#9B7DB5' }}>→</span>
      </div>
    </Link>
  )
}
