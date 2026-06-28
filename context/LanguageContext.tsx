'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type Lang = 'zh' | 'en'
export type FontSize = 'sm' | 'md' | 'lg'

const FONT_MAP: Record<FontSize, Record<string, string>> = {
  sm: { '--text-xs': '11px', '--text-sm': '12px', '--text-base': '14px', '--text-md': '15px', '--text-lg': '17px', '--text-xl': '20px', '--text-2xl': '24px' },
  md: {},  // default from globals.css
  lg: { '--text-xs': '13px', '--text-sm': '14px', '--text-base': '16px', '--text-md': '18px', '--text-lg': '20px', '--text-xl': '23px', '--text-2xl': '28px' },
}

function applyFontSize(size: FontSize) {
  const vars = FONT_MAP[size]
  const root = document.documentElement
  // Reset first
  Object.keys(FONT_MAP.sm).forEach(k => root.style.removeProperty(k))
  // Apply new values
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v))
  root.dataset.fontsize = size
}

interface LangContextType {
  lang: Lang
  setLang: (lang: Lang) => void
  toggleLang: () => void
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  t: (zh: string, en: string) => string
}

const LangContext = createContext<LangContextType>({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  fontSize: 'md',
  setFontSize: () => {},
  t: (zh) => zh,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh')
  const [fontSize, setFontSizeState] = useState<FontSize>('md')

  useEffect(() => {
    const savedLang = localStorage.getItem('mfp_lang') as Lang
    if (savedLang === 'zh' || savedLang === 'en') setLangState(savedLang)

    const savedFont = localStorage.getItem('mfp_font') as FontSize
    if (savedFont === 'sm' || savedFont === 'md' || savedFont === 'lg') {
      setFontSizeState(savedFont)
      applyFontSize(savedFont)
    }
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('mfp_lang', l)
  }

  const toggleLang = () => setLang(lang === 'zh' ? 'en' : 'zh')

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size)
    localStorage.setItem('mfp_font', size)
    applyFontSize(size)
  }

  const t = (zh: string, en: string) => (lang === 'zh' ? zh : en)

  return (
    <LangContext.Provider value={{ lang, setLang, toggleLang, fontSize, setFontSize, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
