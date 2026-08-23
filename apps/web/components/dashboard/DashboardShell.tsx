'use client'
import { useState } from 'react'
import Sidebar from './Sidebar'
import VerificationGate from './VerificationGate'
import SupportWidget from './SupportWidget'
import { useTheme } from '../../lib/theme'

interface Props {
  channelName: string; email: string; username: string
  overlayToken: string; avatarUrl: string | null; todayEarnings: number; followers: number
  isPremium: boolean; isVerified: boolean; verificationRequestedAt: string | null
  platformFeePct?: number
  children: React.ReactNode
}

export default function DashboardShell({ channelName, email, username, overlayToken, avatarUrl, todayEarnings, followers, isPremium, isVerified, verificationRequestedAt, platformFeePct, children }: Props) {
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
        <Sidebar channelName={channelName} email={email} username={username} overlayToken={overlayToken} avatarUrl={avatarUrl} todayEarnings={todayEarnings} followers={followers} isPremium={isPremium} platformFeePct={platformFeePct} />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="sidebar-drawer">
          <div className="sidebar-drawer-backdrop" onClick={() => setSidebarOpen(false)} />
          <div className="sidebar-drawer-panel">
            <Sidebar channelName={channelName} email={email} username={username} overlayToken={overlayToken} avatarUrl={avatarUrl} todayEarnings={todayEarnings} followers={followers} isPremium={isPremium} platformFeePct={platformFeePct} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Desktop top bar — logo centered, always visible */}
        <div className="desktop-topbar" style={{
          flexShrink: 0, height: 96,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: topbarBg, backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${topbarBorder}`,
          position: 'relative',
        }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <img src="/logo.png" alt="EzTips" style={{
              height: 80, width: 'auto', borderRadius: 16,
              filter: 'drop-shadow(0 0 24px rgba(124,58,237,0.65)) drop-shadow(0 0 10px rgba(219,39,119,0.4))',
              cursor: 'pointer',
            }} />
          </a>
        </div>

        {/* Mobile top bar */}
        <div className="mobile-topbar" style={{ background: topbarBg, backdropFilter: 'blur(12px)', borderBottom: `1px solid ${topbarBorder}` }}>
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${hamBtnBorder}`, background: hamBtnBg, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: textPrimary }}>
            ☰
          </button>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="EzTips" style={{ height: 36, width: 'auto', borderRadius: 8 }} />
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

      <SupportWidget />
    </div>
  )
}
