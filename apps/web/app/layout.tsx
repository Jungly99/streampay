import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: 'eztips — Support Your Favourite Streamers',
  description: 'The most viewer-friendly way to send superchats and donate to Indian streamers.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} bg-[#0a0a1a] text-slate-100 antialiased`}>
        <div className="ambient" />
        <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        <Toaster
          position="top-right"
          containerStyle={{ top: 64 }}
          toastOptions={{
            style: {
              background: 'rgba(18,18,42,0.95)',
              color: '#f1f5f9',
              border: '1px solid rgba(139,92,246,0.3)',
              backdropFilter: 'blur(20px)',
            },
          }}
        />
      </body>
    </html>
  )
}
