'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang = 'zh' | 'en'

interface LangContextType {
  lang: Lang
  toggleLang: () => void
  t: (zh: string, en: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'zh',
  toggleLang: () => {},
  t: (zh) => zh,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('zh')

  useEffect(() => {
    const saved = localStorage.getItem('mfp_lang') as Lang
    if (saved === 'zh' || saved === 'en') setLang(saved)
  }, [])

  const toggleLang = () => {
    const next = lang === 'zh' ? 'en' : 'zh'
    setLang(next)
    localStorage.setItem('mfp_lang', next)
  }

  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en)

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
