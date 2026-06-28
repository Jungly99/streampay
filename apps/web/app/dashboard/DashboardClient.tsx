'use client'
import { useState } from 'react'
import { api } from '../../lib/api'
import toast from 'react-hot-toast'

interface AS { ttsEnabled: boolean; ttsVolume: number; voiceMessagesEnabled: boolean; voiceVolume?: number; ttsVoice: string }

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`toggle-track ${on ? 'on' : 'off'}`}>
      <span className="toggle-thumb" />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '18px 20px' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 16 }}>{title}</p>
      {children}
    </div>
  )
}

function Row({ label, desc, right }: { label: string; desc?: string; right: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{label}</p>
        {desc && <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{desc}</p>}
      </div>
      {right}
    </div>
  )
}

export default function DashboardClient({ token, initialSettings }: { token: string; initialSettings?: AS }) {
  const [s, setS] = useState<AS>(initialSettings ?? { ttsEnabled: true, ttsVolume: 100, voiceMessagesEnabled: false, voiceVolume: 100, ttsVoice: 'en-IN' })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try { await api.patch('/api/streamer/alert-settings', s); toast.success('Saved!') }
    catch (e: any) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  function previewTTS() {
    if (!('speechSynthesis' in window)) return toast.error('Not supported')
    const u = new SpeechSynthesisUtterance('Rahul donated ₹500. Thanks bhai!')
    u.lang = s.ttsVoice; u.volume = s.ttsVolume / 100; speechSynthesis.speak(u)
  }

  return (
    <>
      <Section title="Text to Speech">
        <Row label="Enable TTS" desc="Read donation alerts aloud" right={<Toggle on={s.ttsEnabled} onChange={v => setS(p => ({ ...p, ttsEnabled: v }))} />} />
        <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>Volume</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>{s.ttsVolume}%</span>
          </div>
          <input type="range" min={0} max={100} value={s.ttsVolume} onChange={e => setS(p => ({ ...p, ttsVolume: +e.target.value }))} />
        </div>
        <button onClick={previewTTS} style={{
          width: '100%', marginTop: 14, padding: '9px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', transition: 'opacity 0.15s',
        }}>
          ▶ Preview TTS
        </button>
      </Section>

      <Section title="Voice Messages">
        <Row label="Enable Voice" desc="Let viewers record messages" right={<Toggle on={s.voiceMessagesEnabled} onChange={v => setS(p => ({ ...p, voiceMessagesEnabled: v }))} />} />
        <div style={{ padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>Playback Volume</p>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>{s.voiceVolume ?? 100}%</span>
          </div>
          <input type="range" min={0} max={100} value={s.voiceVolume ?? 100} onChange={e => setS(p => ({ ...p, voiceVolume: +e.target.value }))} />
        </div>
      </Section>

      <button onClick={save} disabled={saving} style={{
        width: '100%', padding: '11px', borderRadius: 10, fontSize: 13, fontWeight: 700,
        color: 'white', cursor: 'pointer', border: 'none', flexShrink: 0,
        background: 'linear-gradient(135deg,#7c3aed,#db2777)',
        boxShadow: '0 4px 20px rgba(124,58,237,0.35)', opacity: saving ? 0.7 : 1, transition: 'opacity 0.15s',
      }}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </>
  )
}
