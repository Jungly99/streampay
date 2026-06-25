'use client'
import { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

export interface ThemeColors {
  pageBg: string; pageBg2: string
  cardBg: string; cardBg2: string
  sidebarBg: string; inputBg: string
  border: string; border2: string
  text1: string; text2: string; text3: string; text4: string
}

const DARK: ThemeColors = {
  pageBg:    '#07071a', pageBg2:   '#06060f',
  cardBg:    'rgba(255,255,255,0.025)', cardBg2: 'rgba(255,255,255,0.06)',
  sidebarBg: 'linear-gradient(180deg,#0c0d1a 0%,#080910 100%)', inputBg: 'rgba(255,255,255,0.04)',
  border:    'rgba(255,255,255,0.07)',  border2: 'rgba(255,255,255,0.12)',
  text1: '#f8fafc', text2: '#94a3b8', text3: '#475569', text4: '#334155',
}

const LIGHT: ThemeColors = {
  pageBg:    '#f0f2fc', pageBg2:   '#e8edf8',
  cardBg:    'rgba(255,255,255,0.92)', cardBg2: '#ffffff',
  sidebarBg: 'linear-gradient(180deg,#edeaff 0%,#f3f1ff 100%)', inputBg: 'rgba(0,0,0,0.04)',
  border:    'rgba(100,80,220,0.1)',   border2: 'rgba(100,80,220,0.18)',
  text1: '#1e1b4b', text2: '#4c4a82', text3: '#7c78b8', text4: '#a8a4cc',
}

interface ThemeCtx { theme: Theme; toggleTheme: () => void; colors: ThemeColors; isDark: boolean }
const Ctx = createContext<ThemeCtx>({ theme: 'dark', toggleTheme: () => {}, colors: DARK, isDark: true })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('eztips_theme') as Theme | null
    const preferred: Theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    applyTheme(saved ?? preferred)
  }, [])

  function applyTheme(t: Theme) {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('eztips_theme', t)
  }

  return (
    <Ctx.Provider value={{ theme, toggleTheme: () => applyTheme(theme === 'dark' ? 'light' : 'dark'), colors: theme === 'dark' ? DARK : LIGHT, isDark: theme === 'dark' }}>
      {children}
    </Ctx.Provider>
  )
}

export const useTheme = () => useContext(Ctx)
