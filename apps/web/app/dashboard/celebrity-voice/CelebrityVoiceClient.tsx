'use client'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'

const CELEBRITY_VOICES = [
  { value: 'JBFqnCBsd6RMkjVDRZzb', label: 'Narendra Modi',    flag: '🇮🇳', desc: 'Indian Prime Minister style',  genre: 'Political' },
  { value: 'TxGEqnHWrfWFTfGW9XjX', label: 'Donald Trump',     flag: '🇺🇸', desc: 'US President style',          genre: 'Political' },
  { value: 'pNInz6obpgDQGcFmaJgB', label: 'Morgan Freeman',   flag: '🎬', desc: 'Deep cinematic narration',     genre: 'Cinema' },
  { value: 'ErXwobaYiN019PkySvjV', label: 'Deep Indian Male', flag: '🎙️', desc: 'Authoritative Indian voice',   genre: 'Neutral' },
]

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Settings = {
  celebrityVoiceEnabled: boolean
  celebrityVoiceId: string | null
  celebrityVoiceMinAmount: number
}

export default function CelebrityVoiceClient({ initialSettings }: { initialSettings: any }) {
  const [s, setS] = useState<Settings>({
    celebrityVoiceEnabled: initialSettings?.celebrityVoiceEnabled ?? false,
    celebrityVoiceId: initialSettings?.celebrityVoiceId ?? null,
    celebrityVoiceMinAmount: initialSettings?.celebrityVoiceMinAmount ?? 1000,
  })
  const [saving, setSaving] = useState(false)
  const [previewing, setPreviewing] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function upd<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS(prev => ({ ...prev, [k]: v }))
  }

  async function save() {
    setSaving(true)
    try {
      await api.patch('/api/streamer/alert-settings', s)
      toast.success('Celebrity voice settings saved')
    } catch { toast.error('Failed to save') }
    setSaving(false)
  }

  async function previewVoice(voiceId: string) {
    if (previewing) return
    setPreviewing(voiceId)
    try {
      const res = await fetch(`${BACKEND_URL}/api/tts/celebrity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello! Viewer donated one thousand rupees. Keep it up, great content as always!', voiceId }),
      })
      if (!res.ok) { toast.error('Preview failed — ElevenLabs API key not set yet'); setPreviewing(null); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) audioRef.current.pause()
      const audio = new Audio(url)
      audioRef.current = audio
      audio.play()
    } catch { toast.error('Preview failed') }
    setPreviewing(null)
  }

  const minAmt = s.celebrityVoiceMinAmount
  const standardFee  = Math.round(minAmt * 0.05)
  const celebrityFee = Math.round(minAmt * 0.20)
  const standardNet  = minAmt - standardFee
  const celebrityNet = minAmt - celebrityFee
  const extraPerAlert = celebrityFee - standardFee

  const selectedVoice = CELEBRITY_VOICES.find(v => v.value === s.celebrityVoiceId)

  const C: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16,
  }
  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#f8fafc', outline: 'none',
  }

  return (
    <div style={{ padding: '24px 28px', height: '100%', overflowY: 'auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── HERO HEADER ──────────────────────────────────────── */}
      <div style={{
        borderRadius: 18, padding: '28px 32px',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(245,158,11,0.10) 50%, rgba(219,39,119,0.12) 100%)',
        border: '1px solid rgba(124,58,237,0.2)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(245,158,11,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, left: 200, width: 160, height: 160, borderRadius: '50%', background: 'rgba(124,58,237,0.08)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>🎤</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.5px', margin: 0 }}>Celebrity Voice</h1>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.08em' }}>PREMIUM</span>
                </div>
                <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>AI-powered celebrity voices for donation alerts — earn more with premium tiers</p>
              </div>
            </div>
          </div>
          <button onClick={save} disabled={saving} style={{
            padding: '11px 26px', borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white',
            boxShadow: '0 4px 20px rgba(124,58,237,0.4)', opacity: saving ? 0.7 : 1, flexShrink: 0,
          }}>
            {saving ? '⏳ Saving…' : '💾 Save Changes'}
          </button>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 20, position: 'relative', zIndex: 1 }}>
          {[
            { label: 'Standard Fee', value: '5%', color: '#64748b', sub: 'regular donations' },
            { label: 'Celebrity Fee', value: '20%', color: '#f59e0b', sub: 'premium donations' },
            { label: 'Min Amount', value: `₹${minAmt}`, color: '#a78bfa', sub: 'for celebrity voice' },
            { label: 'Extra per Alert', value: `+₹${extraPerAlert}`, color: '#10b981', sub: 'vs standard' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>
              <p style={{ fontSize: 11, color: '#475569', margin: '0 0 4px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{stat.label}</p>
              <p style={{ fontSize: 20, fontWeight: 800, color: stat.color, margin: 0, letterSpacing: '-0.5px' }}>{stat.value}</p>
              <p style={{ fontSize: 10, color: '#334155', margin: '2px 0 0' }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN 2-COLUMN GRID ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, flex: 1, minHeight: 0 }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Enable toggle */}
          <div style={{ ...C, padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', gap: 16 }}
              onClick={() => upd('celebrityVoiceEnabled', !s.celebrityVoiceEnabled)}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Enable Celebrity Voice Alerts</p>
                  {s.celebrityVoiceEnabled && selectedVoice && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(16,185,129,0.12)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 8px', borderRadius: 20 }}>
                      {selectedVoice.flag} {selectedVoice.label} active
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>
                  Donations of ₹{minAmt}+ are read by your chosen AI voice. Platform takes 20% on these (vs 5% standard).
                </p>
              </div>
              <div style={{
                width: 48, height: 26, borderRadius: 13, flexShrink: 0, position: 'relative', cursor: 'pointer',
                background: s.celebrityVoiceEnabled ? 'linear-gradient(90deg,#7c3aed,#f59e0b)' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.2s', boxShadow: s.celebrityVoiceEnabled ? '0 0 12px rgba(124,58,237,0.5)' : 'none',
              }}>
                <div style={{ position: 'absolute', top: 3, left: s.celebrityVoiceEnabled ? 25 : 3, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
              </div>
            </div>
          </div>

          {/* Voice selection */}
          <div style={{ ...C, padding: '20px 22px', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Choose a Celebrity Voice</p>
                <p style={{ fontSize: 12, color: '#475569', marginTop: 3 }}>AI-generated entertainment voices — click a card to select, Preview to hear it</p>
              </div>
              {s.celebrityVoiceId && (
                <button onClick={() => upd('celebrityVoiceId', null)} style={{ fontSize: 11, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                  Clear ✕
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {CELEBRITY_VOICES.map(v => {
                const selected = s.celebrityVoiceId === v.value
                return (
                  <div key={v.value} onClick={() => upd('celebrityVoiceId', v.value)} style={{
                    padding: '16px', borderRadius: 14, cursor: 'pointer',
                    background: selected ? 'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(245,158,11,0.08))' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${selected ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 0.15s', position: 'relative',
                    boxShadow: selected ? '0 4px 20px rgba(124,58,237,0.15)' : 'none',
                  }}>
                    {selected && (
                      <div style={{ position: 'absolute', top: 12, right: 12, width: 18, height: 18, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#f59e0b)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 800 }}>✓</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 28, lineHeight: 1 }}>{v.flag}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: selected ? '#a78bfa' : '#e2e8f0', margin: 0 }}>{v.label}</p>
                        <span style={{ fontSize: 9, fontWeight: 700, color: selected ? '#f59e0b' : '#334155', background: selected ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.05)', padding: '1px 7px', borderRadius: 10, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{v.genre}</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#475569', margin: '0 0 12px' }}>{v.desc}</p>
                    <button
                      onClick={e => { e.stopPropagation(); previewVoice(v.value) }}
                      disabled={previewing === v.value}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', width: '100%',
                        background: previewing === v.value ? 'rgba(255,255,255,0.04)' : 'rgba(124,58,237,0.12)',
                        border: `1px solid ${selected ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.2)'}`,
                        color: '#a78bfa', transition: 'all 0.15s',
                      }}>
                      {previewing === v.value ? '⏳ Loading audio…' : '▶ Preview Voice'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>Custom ElevenLabs Voice ID</p>
              <input
                value={CELEBRITY_VOICES.find(v => v.value === s.celebrityVoiceId) ? '' : (s.celebrityVoiceId ?? '')}
                onChange={e => upd('celebrityVoiceId', e.target.value || null)}
                placeholder="Paste any voice ID from elevenlabs.io/voice-library"
                style={inp}
              />
              <p style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>
                Browse 1000s of voices — search "Modi", "Trump", "Amitabh", any character or personality
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Min amount */}
          <div style={{ ...C, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', margin: '0 0 4px' }}>Minimum Amount</p>
            <p style={{ fontSize: 11, color: '#475569', marginBottom: 16 }}>Below this → standard TTS (5%). At or above → celebrity voice (20%)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <input type="range" min={500} max={5000} step={100} value={s.celebrityVoiceMinAmount}
                onChange={e => upd('celebrityVoiceMinAmount', Number(e.target.value))}
                style={{ flex: 1, accentColor: '#7c3aed', height: 4 }} />
              <div style={{ minWidth: 66, padding: '8px 12px', borderRadius: 10, background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(245,158,11,0.1))', border: '1px solid rgba(124,58,237,0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#a78bfa' }}>₹{minAmt}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[500, 1000, 2000, 5000].map(v => (
                <button key={v} onClick={() => upd('celebrityVoiceMinAmount', v)} style={{
                  flex: 1, padding: '7px 0', borderRadius: 9, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: s.celebrityVoiceMinAmount === v ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${s.celebrityVoiceMinAmount === v ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.07)'}`,
                  color: s.celebrityVoiceMinAmount === v ? '#a78bfa' : '#475569',
                }}>₹{v >= 1000 ? `${v/1000}k` : v}</button>
              ))}
            </div>
          </div>

          {/* Revenue preview */}
          <div style={{ ...C, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', margin: '0 0 14px' }}>Revenue at ₹{minAmt}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Standard */}
              <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: '0.08em', margin: '0 0 10px', textTransform: 'uppercase' }}>Standard Donation</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>Donor pays</span>
                    <span style={{ fontWeight: 700, color: '#e2e8f0' }}>₹{minAmt}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>Platform fee (5%)</span>
                    <span style={{ color: '#f87171' }}>−₹{standardFee}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>You receive</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>₹{standardNet}</span>
                  </div>
                </div>
              </div>
              {/* Celebrity */}
              <div style={{ padding: '14px', borderRadius: 12, background: 'linear-gradient(135deg,rgba(245,158,11,0.07),rgba(124,58,237,0.05))', border: '1px solid rgba(245,158,11,0.22)' }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.08em', margin: '0 0 10px', textTransform: 'uppercase' }}>🎤 Celebrity Voice</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>Donor pays</span>
                    <span style={{ fontWeight: 700, color: '#e2e8f0' }}>₹{minAmt}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#64748b' }}>Platform fee (20%)</span>
                    <span style={{ color: '#f87171' }}>−₹{celebrityFee}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>You receive</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#10b981' }}>₹{celebrityNet}</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16 }}>💰</span>
                <p style={{ fontSize: 11, color: '#10b981', margin: 0 }}>Platform earns <strong>₹{extraPerAlert} extra</strong> per celebrity alert vs standard</p>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div style={{ ...C, padding: '20px 22px', flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', margin: '0 0 16px' }}>How It Works</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { n: '1', color: '#7c3aed', icon: '₹', title: `Viewer donates ₹${minAmt}+`, desc: 'No extra steps for the viewer — same donation form' },
                { n: '2', color: '#0891b2', icon: '✓', title: 'Razorpay confirms payment', desc: 'Overlay receives the donation event instantly' },
                { n: '3', color: '#f59e0b', icon: '🎤', title: 'ElevenLabs generates audio', desc: 'Our server calls ElevenLabs → streams celebrity voice' },
                { n: '4', color: '#10b981', icon: '▶', title: 'Alert plays on stream', desc: 'Animation + celebrity voice reads the message live' },
              ].map((item, i, arr) => (
                <div key={item.n} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${item.color}20`, border: `1.5px solid ${item.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: item.color, zIndex: 1 }}>
                      {item.n}
                    </div>
                    {i < arr.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />}
                  </div>
                  <div style={{ paddingBottom: i < arr.length - 1 ? 14 : 0, paddingTop: 4 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{item.title}</p>
                    <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Setup note */}
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', margin: '0 0 4px' }}>⚙️ Setup Required</p>
              <p style={{ fontSize: 11, color: '#78716c', margin: 0, lineHeight: 1.5 }}>
                Admin must set <code style={{ color: '#a78bfa', background: 'rgba(124,58,237,0.12)', padding: '1px 5px', borderRadius: 4 }}>ELEVENLABS_API_KEY</code> on Fly.io for previews and live alerts to work.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Legal */}
      <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        <p style={{ fontSize: 11, color: '#334155', margin: 0 }}>
          ⚠️ AI-generated voices are for entertainment only. Community voices in ElevenLabs are not endorsed by or affiliated with any real person named.
        </p>
      </div>
    </div>
  )
}
