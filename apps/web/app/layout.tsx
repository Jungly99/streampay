import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import ClientProviders from '../components/ClientProviders'
import VisitorTracker from '../components/VisitorTracker'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
})

export const metadata: Metadata = {
  title: 'eztips — Support Your Favourite Streamers',
  description: 'The most viewer-friendly donation platform for Indian streamers. No viewer signup. Real-time OBS alerts. Voice messages. Just 7%.',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'eztips — Support Your Favourite Streamers',
    description: 'The most viewer-friendly donation platform for Indian streamers. No viewer signup. Real-time OBS alerts. Just 7% fee.',
    url: 'https://www.eztips.live',
    siteName: 'eztips',
    images: [{ url: '/logo.png', width: 512, height: 512 }],
    type: 'website',
  },
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
          <VisitorTracker page="website" />
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
