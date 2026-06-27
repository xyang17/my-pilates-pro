'use client'

import { useLang } from '@/context/LanguageContext'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { lang, toggleLang } = useLang()

  return (
    <>
      {children}
      {/* Floating language toggle */}
      <button
        onClick={toggleLang}
        title={lang === 'zh' ? 'Switch to English' : '切换中文'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 1000,
          backgroundColor: '#9B7DB5',
          color: 'white',
          border: 'none',
          borderRadius: '20px',
          padding: '8px 16px',
          fontSize: '13px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          letterSpacing: '0.5px',
        }}
      >
        {lang === 'zh' ? 'EN' : '中文'}
      </button>
    </>
  )
}
