'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../lib/api'

const BACKEND = 'https://streampay-server.fly.dev'

interface Clip {
  id: string
  videoId: string
  title: string
  requestedBy: string
  streamSecs: number
  duration: number
  createdAt: string
}

const S = {
  card: { background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 } as React.CSSProperties,
}

function fmtTime(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180, 300]

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([])
  const [clipDefaultDuration, setClipDefaultDuration] = useState(60)
  const [draftDuration, setDraftDuration] = useState(60)
  const [clipWebhookUrl, setClipWebhookUrl] = useState('')
  const [draftWebhook, setDraftWebhook] = useState('')
  const [overlayToken, setOverlayToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copiedTs, setCopiedTs] = useState(false)

  const load = useCallback(async () => {
    try {
      const [d, profile] = await Promise.all([
        api.get<{ clips: Clip[]; clipDefaultDuration: number; clipWebhookUrl: string }>('/api/clips'),
        api.get<{ overlayToken?: string }>('/api/streamer/profile'),
      ])
      setClips(d.clips)
      setClipDefaultDuration(d.clipDefaultDuration)
      setDraftDuration(d.clipDefaultDuration)
      setClipWebhookUrl(d.clipWebhookUrl || '')
      setDraftWebhook(d.clipWebhookUrl || '')
      if (profile.overlayToken) setOverlayToken(profile.overlayToken)
    } finally {
      setLoading(false)
    }
  }, [])

  const nightbotCmd = overlayToken
    ? `$(urlfetch ${BACKEND}/api/clips/nightbot?title=$(query)&token=${overlayToken})`
    : ''

  function copyCmd() {
    if (!nightbotCmd) return
    navigator.clipboard.writeText(nightbotCmd)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyTimestamps() {
    const liveClips = clips.filter(c => c.videoId !== 'unknown')
    if (!liveClips.length) return
    const lines = liveClips.map(c => `${fmtTime(c.streamSecs)} — ${c.title}`)
    const text = `🎬 Stream Highlights\n\n${lines.join('\n')}\n\n— via eztips.live`
    navigator.clipboard.writeText(text)
    setCopiedTs(true)
    setTimeout(() => setCopiedTs(false), 2000)
  }

  useEffect(() => { load() }, [load])

  async function saveSettings() {
    setSaving(true)
    try {
      await api.patch('/api/clips/settings', {
        clipDefaultDuration: draftDuration,
        clipWebhookUrl: draftWebhook.trim(),
      })
      setClipDefaultDuration(draftDuration)
      setClipWebhookUrl(draftWebhook.trim())
    } catch {}
    setSaving(false)
  }

  async function deleteClip(id: string) {
    setDeletingId(id)
    try {
      await api.delete(`/api/clips/${id}`)
      setClips(c => c.filter(x => x.id !== id))
    } catch {}
    setDeletingId(null)
  }

  const isDirty = draftDuration !== clipDefaultDuration || draftWebhook.trim() !== clipWebhookUrl
  const liveClips = clips.filter(c => c.videoId !== 'unknown')

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 9,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '32px 28px', maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui,sans-serif' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
          🎬 Stream Clips
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          When a viewer types <code style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', padding: '1px 6px', borderRadius: 4, fontSize: 13 }}>!clip Title</code> in chat, the stream timestamp is saved here. After your stream ends, copy all timestamps and paste them as a comment on your YouTube VOD.
        </p>
      </div>

      {/* Settings card */}
      <div style={{ ...S.card, padding: '20px 24px', marginBottom: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 16px' }}>Clip Settings</h2>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              DEFAULT CLIP DURATION (SECONDS)
            </label>
            <select value={draftDuration} onChange={e => setDraftDuration(Number(e.target.value))} style={{ ...inp, cursor: 'pointer' }}>
              {DURATION_OPTIONS.map(d => (
                <option key={d} value={d}>{d}s — last {d} seconds</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            DISCORD WEBHOOK URL <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional — notified on every clip)</span>
          </label>
          <input
            type="url"
            placeholder="https://discord.com/api/webhooks/..."
            value={draftWebhook}
            onChange={e => setDraftWebhook(e.target.value)}
            style={inp}
          />
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '6px 0 0', opacity: 0.7 }}>
            In Discord: channel settings → Integrations → Webhooks → New Webhook → Copy URL
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={saveSettings}
            disabled={saving || !isDirty}
            style={{
              padding: '10px 24px', borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              background: saving || !isDirty ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
              color: '#fff', border: 'none', opacity: !isDirty ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Nightbot setup */}
      <div style={{ ...S.card, padding: '20px 24px', marginBottom: 24, background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 18 }}>🤖</span>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Nightbot Setup</h2>
          <span style={{ fontSize: 11, fontWeight: 700, background: 'rgba(124,58,237,0.15)', color: '#a78bfa', padding: '2px 8px', borderRadius: 10, border: '1px solid rgba(124,58,237,0.3)' }}>RECOMMENDED</span>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.6 }}>
          Add this as a custom command on <strong style={{ color: 'var(--text-primary)' }}>nightbot.tv</strong>. When a viewer types <code style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>!clip My Title</code>, the timestamp is saved here instantly.
        </p>

        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', margin: '0 0 6px', textTransform: 'uppercase' }}>Command name</p>
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '9px 14px', fontFamily: 'monospace', fontSize: 13, color: '#a78bfa', border: '1px solid rgba(255,255,255,0.08)' }}>!clip</div>
        </div>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', margin: '0 0 6px', textTransform: 'uppercase' }}>Response (copy this)</p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, color: overlayToken ? '#e2e8f0' : 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.08)', wordBreak: 'break-all', lineHeight: 1.5 }}>
              {overlayToken ? nightbotCmd : 'Loading your token…'}
            </div>
            <button onClick={copyCmd} disabled={!overlayToken} style={{ padding: '0 16px', borderRadius: 8, border: 'none', background: copied ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg,#7c3aed,#db2777)', color: copied ? '#10b981' : '#fff', fontWeight: 700, fontSize: 13, cursor: overlayToken ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { n: '1', t: 'Go to nightbot.tv → Commands → Custom → Add Command' },
            { n: '2', t: 'Set Command to !clip and paste the Response above' },
            { n: '3', t: 'Viewer types !clip My Title → timestamp saved here' },
            { n: '4', t: 'After stream, copy all timestamps → paste as YouTube comment' },
          ].map(({ n, t }) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: '1 1 180px' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff', flexShrink: 0, marginTop: 1 }}>{n}</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Clips list */}
      <div style={S.card}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Recorded Timestamps {clips.length > 0 && <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>({clips.length})</span>}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {liveClips.length > 0 && (
              <button
                onClick={copyTimestamps}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(124,58,237,0.3)', background: copiedTs ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.1)', color: copiedTs ? '#10b981' : '#a78bfa', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {copiedTs ? '✓ Copied!' : '📋 Copy for YouTube'}
              </button>
            )}
            {clips.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Most recent first</span>}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Loading…</div>
        ) : clips.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>No clips yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
              When you&apos;re live, viewers type <strong>!clip Title</strong> in chat and the moment appears here.
            </p>
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 90px 80px 48px', gap: 8, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              {['Title / Requested by', 'Timestamp', 'Duration', 'Saved', ''].map((h, i) => (
                <span key={i} style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {clips.map((clip, i) => (
              <div
                key={clip.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 90px 80px 48px', gap: 8,
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < clips.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clip.title}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>by {clip.requestedBy}</p>
                </div>

                {clip.videoId !== 'unknown' ? (
                  <a
                    href={`https://www.youtube.com/watch?v=${clip.videoId}&t=${clip.streamSecs}s`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>▶ {fmtTime(clip.streamSecs)}</span>
                    <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(167,139,250,0.6)' }}>Open VOD</span>
                  </a>
                ) : (
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>—</span>
                )}

                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{clip.duration}s</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(clip.createdAt)}</span>

                <button
                  onClick={() => deleteClip(clip.id)}
                  disabled={deletingId === clip.id}
                  title="Delete"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', borderRadius: 7, padding: '5px 8px', fontSize: 13, cursor: 'pointer', opacity: deletingId === clip.id ? 0.5 : 1 }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
