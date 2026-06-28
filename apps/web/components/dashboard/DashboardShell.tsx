'use client'
import { useState } from 'react'
import Sidebar from './Sidebar'
import VerificationGate from './VerificationGate'
import { useTheme } from '../../lib/theme'

interface Props {
  channelName: string; email: string; username: string
  overlayToken: string; todayEarnings: number; followers: number
  isPremium: boolean; isVerified: boolean; verificationRequestedAt: string | null
  children: React.ReactNode
}

export default function DashboardShell({ channelName, email, username, overlayToken, todayEarnings, followers, isPremium, isVerified, verificationRequestedAt, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDark } = useTheme()

  const topbarBg = isDark ? 'rgba(6,6,15,0.95)' : 'rgba(240,242,252,0.95)'
  const topbarBorder = isDark ? 'var(--surface-2)' : 'rgba(100,80,220,0.1)'
  const textPrimary = isDark ? '#f1f5f9' : '#1e1b4b'
  const rootBg = isDark ? '#06060f' : '#f0f2fc'
  const hamBtnBg = isDark ? 'var(--surface-2)' : 'rgba(0,0,0,0.06)'
  const hamBtnBorder = isDark ? 'var(--border)' : 'rgba(100,80,220,0.12)'

  return (
    <div className="dashboard-root" style={{ display: 'flex', height: '100svh', overflow: 'hidden', background: rootBg }}>

      {/* Desktop sidebar */}
      <div className="desktop-sidebar" style={{ flexShrink: 0 }}>
        <Sidebar channelName={channelName} email={email} username={username} overlayToken={overlayToken} todayEarnings={todayEarnings} followers={followers} isPremium={isPremium} />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="sidebar-drawer">
          <div className="sidebar-drawer-backdrop" onClick={() => setSidebarOpen(false)} />
          <div className="sidebar-drawer-panel">
            <Sidebar channelName={channelName} email={email} username={username} overlayToken={overlayToken} todayEarnings={todayEarnings} followers={followers} isPremium={isPremium} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Mobile top bar */}
        <div className="mobile-topbar" style={{ background: topbarBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${topbarBorder}` }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${hamBtnBorder}`, background: hamBtnBg, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: textPrimary }}>
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: 'white' }}>ez</div>
            <span style={{ fontWeight: 800, fontSize: 14, color: textPrimary, letterSpacing: '-0.3px' }}>eztips</span>
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 13, color: isDark ? '#64748b' : '#7c78b8', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{channelName}</span>
        </div>

        {/* Scrollable content */}
        <div className="dashboard-main" style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
          <VerificationGate isVerified={isVerified} verificationRequestedAt={verificationRequestedAt} />
          {children}
        </div>
      </main>
    </div>
  )
}
