import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ClientProviders from '../components/ClientProviders'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: 'eztips — Support Your Favourite Streamers',
  description: 'The most viewer-friendly way to send superchats and donate to Indian streamers.',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#07071a' }, { media: '(prefers-color-scheme: light)', color: '#f0f2fc' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <ClientProviders>
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
        </ClientProviders>
      </body>
    </html>
  )
}
