'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

const DEFAULT_TIERS = [
  { durationSeconds: 4, minAmount: 100, isEnabled: true },
  { durationSeconds: 8, minAmount: 200, isEnabled: true },
  { durationSeconds: 12, minAmount: 500, isEnabled: true },
  { durationSeconds: 20, minAmount: 1000, isEnabled: false },
]

const C: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
      background: on ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.12)',
      transition: 'background 0.2s',
    }}>
      <span style={{
        position: 'absolute', top: 2, left: 2, width: 20, height: 20, borderRadius: '50%', background: 'white',
        transition: 'transform 0.2s', transform: on ? 'translateX(20px)' : 'none',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  )
}

export default function VoiceSettingsPage() {
  const [settings, setSettings] = useState<any>({ voiceMessagesEnabled: false })
  const [tiers, setTiers] = useState(DEFAULT_TIERS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<any>('/api/streamer/alert-settings'),
      api.get<any[]>('/api/streamer/voice-tiers'),
    ]).then(([s, t]) => {
      setSettings(s)
      if (t?.length) setTiers(t)
    }).catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      await Promise.all([
        api.patch('/api/streamer/alert-settings', { voiceMessagesEnabled: settings.voiceMessagesEnabled }),
        api.put('/api/streamer/voice-tiers', tiers),
      ])
      toast.success('Voice settings saved!')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  function updateTier(idx: number, key: string, val: any) {
    setTiers(t => t.map((tier, i) => i === idx ? { ...tier, [key]: val } : tier))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13,
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
    color: '#f8fafc', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: 28, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' }}>Voice Messages</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>Let viewers record personal audio messages with their donations</p>
        </div>
        <button onClick={save} disabled={saving} style={{
          padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white',
          boxShadow: '0 0 20px rgba(124,58,237,0.3)', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Enable toggle */}
      <div style={{ ...C, padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>Enable Voice Messages</p>
            <p style={{ fontSize: 13, color: '#475569' }}>When enabled, viewers can record audio up to the tier limit and it plays live on your overlay</p>
          </div>
          <Toggle on={settings.voiceMessagesEnabled} onChange={v => setSettings((s: any) => ({ ...s, voiceMessagesEnabled: v }))} />
        </div>
        {settings.voiceMessagesEnabled && (
          <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Voice messages are active on your overlay</p>
          </div>
        )}
      </div>

      {/* Tiers */}
      <div style={{ ...C, padding: '22px 24px' }}>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>Voice Duration Tiers</p>
          <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
            <p style={{ fontSize: 12, color: '#f59e0b' }}>Set the minimum donation amount required to unlock each voice duration. Viewers will see these tiers on your donation page.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
          {tiers.map((tier, idx) => (
            <div key={tier.durationSeconds} style={{
              padding: '18px 20px', borderRadius: 12,
              background: tier.isEnabled ? 'rgba(124,58,237,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${tier.isEnabled ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.2s',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{tier.durationSeconds}s</p>
                  <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{tier.durationSeconds} second message</p>
                </div>
                <Toggle on={tier.isEnabled} onChange={v => updateTier(idx, 'isEnabled', v)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7 }}>Min Donation (₹)</label>
                <input type="number" value={tier.minAmount}
                  onChange={e => updateTier(idx, 'minAmount', Number(e.target.value))}
                  disabled={!tier.isEnabled} style={{ ...inputStyle, opacity: tier.isEnabled ? 1 : 0.4 }} />
                <p style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>
                  Donors of ₹{tier.minAmount}+ unlock {tier.durationSeconds}s audio
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
