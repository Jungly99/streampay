'use client'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'

const CELEBRITY_VOICES = [
  { value: 'JBFqnCBsd6RMkjVDRZzb', label: 'Narendra Modi', flag: '🇮🇳', desc: 'Indian Prime Minister style' },
  { value: 'TxGEqnHWrfWFTfGW9XjX', label: 'Donald Trump',  flag: '🇺🇸', desc: 'US President style' },
  { value: 'pNInz6obpgDQGcFmaJgB', label: 'Morgan Freeman', flag: '🎬', desc: 'Deep cinematic narration' },
  { value: 'ErXwobaYiN019PkySvjV', label: 'Deep Indian Male', flag: '🇮🇳', desc: 'Authoritative Indian voice' },
]

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

type Settings = {
  celebrityVoiceEnabled: boolean
  celebrityVoiceId: string | null
  celebrityVoiceMinAmount: number
}

function toggle(val: boolean) {
  return (
    <div style={{ width: 40, height: 22, borderRadius: 11, background: val ? '#7c3aed' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s', boxShadow: val ? '0 0 10px rgba(124,58,237,0.4)' : 'none' }}>
      <div style={{ position: 'absolute', top: 3, left: val ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
    </div>
  )
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

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
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
        body: JSON.stringify({ text: 'Hello! This is a preview of the celebrity voice alert. Your donation has been received. Thank you!', voiceId }),
      })
      if (!res.ok) { toast.error('Preview failed — check your ElevenLabs API key'); return }
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
  const standardFee = Math.round(minAmt * 0.05)
  const celebrityFee = Math.round(minAmt * 0.20)
  const standardNet = minAmt - standardFee
  const celebrityNet = minAmt - celebrityFee

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 14, padding: '22px 24px', marginBottom: 16,
  }
  const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }

  return (
    <div style={{ padding: 28, maxWidth: 780, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', overflowY: 'auto', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px', margin: 0 }}>Celebrity Voice</h1>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', padding: '3px 10px', borderRadius: 20, letterSpacing: '0.06em' }}>PREMIUM</span>
          </div>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Let AI celebrity voices read donation alerts — charge ₹{minAmt}+ and earn 20% fee</p>
        </div>
        <button onClick={save} disabled={saving} style={{
          padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white',
          boxShadow: '0 0 20px rgba(124,58,237,0.3)', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Enable card */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
          onClick={() => set('celebrityVoiceEnabled', !s.celebrityVoiceEnabled)}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Enable Celebrity Voice Alerts</p>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              Donations of ₹{minAmt}+ will be read by your chosen celebrity AI voice instead of browser TTS
            </p>
          </div>
          {toggle(s.celebrityVoiceEnabled)}
        </div>
        {s.celebrityVoiceEnabled && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', margin: 0 }}>Premium fee: 20% on celebrity voice donations</p>
              <p style={{ fontSize: 11, color: '#92400e', marginTop: 3 }}>Regular donations (below ₹{minAmt} or if no voice set) keep the standard 5% fee</p>
            </div>
          </div>
        )}
      </div>

      {s.celebrityVoiceEnabled && (
        <>
          {/* Voice selection */}
          <div style={card}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>Choose a Celebrity Voice</p>
            <p style={{ fontSize: 12, color: '#475569', marginBottom: 18 }}>AI-generated entertainment voices. Click Preview to hear a sample.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {CELEBRITY_VOICES.map(v => {
                const selected = s.celebrityVoiceId === v.value
                return (
                  <div key={v.value}
                    onClick={() => set('celebrityVoiceId', v.value)}
                    style={{
                      padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                      background: selected ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.03)',
                      border: `1.5px solid ${selected ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                      transition: 'all 0.15s', position: 'relative',
                    }}>
                    {selected && <div style={{ position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 6px #7c3aed' }} />}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{v.flag}</span>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: selected ? '#a78bfa' : '#e2e8f0', margin: 0 }}>{v.label}</p>
                        <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{v.desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); previewVoice(v.value) }}
                      disabled={previewing === v.value}
                      style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                        background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)',
                        color: '#a78bfa',
                      }}>
                      {previewing === v.value ? '⏳ Loading…' : '▶ Preview'}
                    </button>
                  </div>
                )
              })}
            </div>

            <div>
              <span style={lbl}>Or paste a custom ElevenLabs Voice ID</span>
              <input
                value={s.celebrityVoiceId ?? ''}
                onChange={e => set('celebrityVoiceId', e.target.value || null)}
                placeholder="e.g. JBFqnCBsd6RMkjVDRZzb — from elevenlabs.io/voice-library"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#f8fafc', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <p style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>
                Browse thousands of voices at elevenlabs.io/voice-library — search for any character or personality
              </p>
            </div>
          </div>

          {/* Minimum amount */}
          <div style={card}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>Minimum Donation for Celebrity Voice</p>
            <p style={{ fontSize: 12, color: '#475569', marginBottom: 20 }}>Donations below this amount use standard browser TTS (5% fee)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <input type="range" min={500} max={5000} step={100} value={s.celebrityVoiceMinAmount}
                onChange={e => set('celebrityVoiceMinAmount', Number(e.target.value))}
                style={{ flex: 1, accentColor: '#7c3aed' }} />
              <div style={{ minWidth: 72, padding: '8px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', textAlign: 'center' }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#a78bfa' }}>₹{s.celebrityVoiceMinAmount}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[500, 1000, 2000, 5000].map(v => (
                <button key={v} onClick={() => set('celebrityVoiceMinAmount', v)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  background: s.celebrityVoiceMinAmount === v ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${s.celebrityVoiceMinAmount === v ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: s.celebrityVoiceMinAmount === v ? '#a78bfa' : '#64748b',
                }}>₹{v}</button>
              ))}
            </div>
          </div>

          {/* Revenue preview */}
          <div style={card}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 16 }}>Revenue Preview at ₹{minAmt}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.06em', marginBottom: 12 }}>STANDARD DONATION</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Donor pays</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>₹{minAmt}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Platform fee (5%)</span>
                    <span style={{ fontSize: 12, color: '#f87171' }}>−₹{standardFee}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>You receive</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>₹{standardNet}</span>
                  </div>
                </div>
              </div>
              <div style={{ padding: '16px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.06em', marginBottom: 12 }}>🎤 CELEBRITY VOICE</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Donor pays</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>₹{minAmt}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Platform fee (20%)</span>
                    <span style={{ fontSize: 12, color: '#f87171' }}>−₹{celebrityFee}</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>You receive</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: '#10b981' }}>₹{celebrityNet}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }}>
              <p style={{ fontSize: 11, color: '#7c3aed', margin: 0 }}>
                💰 Platform earns ₹{celebrityFee - standardFee} extra per celebrity voice donation vs standard. The premium experience drives higher donation amounts.
              </p>
            </div>
          </div>
        </>
      )}

      {/* How it works */}
      <div style={card}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 18 }}>How Celebrity Voice Works</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { step: '1', color: '#7c3aed', title: 'Viewer donates ₹' + minAmt + '+', desc: 'They see the standard donation form — no extra steps' },
            { step: '2', color: '#db2777', title: 'Payment completes', desc: 'Razorpay confirms the payment, overlay receives the alert' },
            { step: '3', color: '#0891b2', title: 'ElevenLabs generates audio', desc: 'Your OBS overlay calls our server → ElevenLabs API → returns celebrity voice audio' },
            { step: '4', color: '#059669', title: 'Alert plays on stream', desc: 'Donation alert animates on screen with the celebrity AI voice reading the message' },
          ].map(item => (
            <div key={item.step} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: `${item.color}20`, border: `1.5px solid ${item.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: item.color }}>
                {item.step}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0 }}>{item.title}</p>
                <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legal note */}
      <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <p style={{ fontSize: 11, color: '#334155', margin: 0 }}>
          ⚠️ AI-generated voices are for entertainment only. Voices in the ElevenLabs library are community-contributed and are not endorsed by or affiliated with any real person.
        </p>
      </div>
    </div>
  )
}
