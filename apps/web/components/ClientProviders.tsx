'use client'
import { ThemeProvider } from '../lib/theme'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}
