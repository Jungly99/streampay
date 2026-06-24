'use client'
import Link from 'next/link'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../lib/api'

interface Props { messageLink?: string; overlayToken?: string; overlayUrl?: string; qrDataUrl?: string; inline?: boolean; username?: string }

function CopyField({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const [show, setShow] = useState(false)
  const display = masked && !show ? '•'.repeat(36) : value

  function copy() { navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied!`)) }

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{
          flex: 1, padding: '9px 12px', borderRadius: 9, fontSize: 12, color: '#94a3b8', fontFamily: 'monospace',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{display}</div>
        {masked && (
          <button onClick={() => setShow(v => !v)} style={btnStyle}>{show ? '🙈' : '👁️'}</button>
        )}
        <button onClick={copy} style={btnStyle} title="Copy">⎘</button>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  width: 34, height: 34, borderRadius: 8, flexShrink: 0, cursor: 'pointer', fontSize: 13,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
}

function Content({ messageLink, overlayToken, overlayUrl, qrDataUrl, username: initUsername }: Omit<Props, 'inline'>) {
  const [testing, setTesting] = useState(false)
  const [currentLink, setCurrentLink] = useState(messageLink)
  const [usernameInput, setUsernameInput] = useState('')
  const [settingUsername, setSettingUsername] = useState(false)

  async function submitUsername() {
    if (!usernameInput.trim()) return
    setSettingUsername(true)
    try {
      const updated = await api.post<any>('/api/streamer/profile/username', { username: usernameInput.trim() })
      const link = `${window.location.origin}/send-message/${updated.username}`
      setCurrentLink(link)
      toast.success('Username set! Your donation link is ready.')
    } catch (e: any) { toast.error(e.message) } finally { setSettingUsername(false) }
  }

  async function sendTestAlert() {
    setTesting(true)
    try {
      const res = await api.post<{ success: boolean; amount: number; name: string }>('/api/streamer/test-alert')
      toast.success(`Test alert sent! ₹${res.amount} from ${res.name} — check OBS`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, flex: 1 }}>
      {currentLink
        ? <CopyField label="Donation Link" value={currentLink} />
        : (
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>Donation Link Username</p>
            <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: '#f59e0b', margin: 0 }}>⚠ One-time only — cannot be changed after setting</p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={usernameInput}
                onChange={e => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourusername"
                onKeyDown={e => e.key === 'Enter' && submitUsername()}
                style={{ flex: 1, padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#f1f5f9', outline: 'none' }}
              />
              <button onClick={submitUsername} disabled={settingUsername || !usernameInput} style={{ padding: '9px 16px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white', fontSize: 13, fontWeight: 700, cursor: settingUsername ? 'not-allowed' : 'pointer', opacity: !usernameInput ? 0.5 : 1, flexShrink: 0 }}>
                {settingUsername ? '…' : 'Set'}
              </button>
            </div>
          </div>
        )
      }

      {overlayToken && overlayUrl && (
        <div>
          <CopyField label="OBS Overlay URL" value={overlayUrl} masked />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
            <p style={{ fontSize: 11, color: '#475569' }}>Only use in OBS Browser Source — never broadcast this URL</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            {overlayUrl && (
              <Link href={overlayUrl} target="_blank" style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 12, fontWeight: 600, color: '#7c3aed', textDecoration: 'none',
              }}>Open preview →</Link>
            )}
            <button onClick={sendTestAlert} disabled={testing} style={{
              marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer',
              background: testing ? 'rgba(167,139,250,0.05)' : 'rgba(167,139,250,0.1)',
              border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa',
              opacity: testing ? 0.6 : 1, transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 13 }}>🧪</span>
              {testing ? 'Sending…' : 'Test Alert'}
            </button>
          </div>
        </div>
      )}

      {qrDataUrl && (
        <div style={{ paddingTop: 4, marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>QR Code</p>
            <button onClick={() => { const a = document.createElement('a'); a.href = qrDataUrl; a.download = 'streampay-qr.png'; a.click() }}
              style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', cursor: 'pointer', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 6, padding: '3px 10px' }}>
              Download
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <img src={qrDataUrl} alt="Donation QR Code" width={160} height={160} style={{ borderRadius: 12, background: 'white', padding: 8, display: 'block' }} />
          </div>
          <p style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 10, fontWeight: 500 }}>Viewers scan this to open your donation page</p>
        </div>
      )}
    </div>
  )
}

export default function LinksPanel({ messageLink, overlayToken, overlayUrl, qrDataUrl, inline }: Props) {
  if (inline) return <Content messageLink={messageLink} overlayToken={overlayToken} overlayUrl={overlayUrl} qrDataUrl={qrDataUrl} />
  return (
    <div className="glass-card" style={{ padding: '22px 22px' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 18 }}>Your Links</p>
      <Content messageLink={messageLink} overlayToken={overlayToken} overlayUrl={overlayUrl} qrDataUrl={qrDataUrl} />
    </div>
  )
}
