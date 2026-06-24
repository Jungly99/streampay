'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'

interface Tier { minAmount: number; charLimit: number }

const C: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 14,
}
const inp: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 9, fontSize: 13, width: '100%',
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' as const,
}
const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' as const, marginBottom: 6, display: 'block' }

const PRESETS: Tier[] = [
  { minAmount: 11, charLimit: 10 },
  { minAmount: 50, charLimit: 24 },
  { minAmount: 100, charLimit: 100 },
  { minAmount: 500, charLimit: 200 },
]

export default function TipSettingsClient({
  initial,
}: {
  initial: { minDonationAmount: number; messageTiers: Tier[] }
}) {
  const [minAmount, setMinAmount] = useState(initial.minDonationAmount)
  const [tiers, setTiers] = useState<Tier[]>(initial.messageTiers.length ? initial.messageTiers : PRESETS)
  const [saving, setSaving] = useState(false)

  const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount)

  function updateTier(i: number, field: keyof Tier, value: number) {
    setTiers(prev => {
      const next = [...prev]
      next[i] = { minAmount: next[i]!.minAmount, charLimit: next[i]!.charLimit, [field]: value }
      return next
    })
  }

  function removeTier(i: number) {
    setTiers(prev => prev.filter((_, idx) => idx !== i))
  }

  function addTier() {
    const maxMin = tiers.length ? Math.max(...tiers.map(t => t.minAmount)) : 0
    setTiers(prev => [...prev, { minAmount: maxMin + 50, charLimit: 50 }])
  }

  async function save() {
    if (tiers.length === 0) { toast.error('Add at least one tier'); return }
    const dupes = tiers.map(t => t.minAmount).filter((v, i, a) => a.indexOf(v) !== i)
    if (dupes.length) { toast.error('Duplicate tier amounts — each must be unique'); return }
    setSaving(true)
    try {
      await api.patch('/api/streamer/tip-settings', { minDonationAmount: minAmount, messageTiers: tiers })
      toast.success('Tip settings saved!')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Min amount */}
      <div style={{ ...C, padding: '24px 28px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 18 }}>Minimum Tip Amount</p>
        <div style={{ maxWidth: 240 }}>
          <label style={label}>Amount (₹)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, color: '#64748b', lineHeight: 1 }}>₹</span>
            <input type="number" value={minAmount} min={1} max={10000}
              onChange={e => setMinAmount(Number(e.target.value))}
              style={{ ...inp, width: 160 }} />
          </div>
          <p style={{ fontSize: 12, color: '#475569', marginTop: 8 }}>Viewers cannot tip below this amount. Max ₹10,000.</p>
        </div>
      </div>

      {/* Tier table */}
      <div style={{ ...C, padding: '24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>Message Character Tiers</p>
            <p style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>Higher tips unlock longer messages. The highest matching tier applies.</p>
          </div>
          <button onClick={addTier} style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa', flexShrink: 0 }}>
            + Add Tier
          </button>
        </div>

        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 10, padding: '10px 0 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Min Amount (₹)</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Char Limit</span>
          <span />
        </div>

        {/* Rows */}
        {sorted.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
            No tiers yet — click "+ Add Tier" to start
          </div>
        )}
        {sorted.map((tier, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: 10, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>₹</span>
              <input type="number" value={tier.minAmount} min={1}
                onChange={e => {
                  const originalIdx = tiers.findIndex(t => t.minAmount === tier.minAmount && t.charLimit === tier.charLimit)
                  updateTier(originalIdx === -1 ? i : originalIdx, 'minAmount', Number(e.target.value))
                }}
                style={{ ...inp, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="number" value={tier.charLimit} min={1} max={500}
                onChange={e => {
                  const originalIdx = tiers.findIndex(t => t.minAmount === tier.minAmount && t.charLimit === tier.charLimit)
                  updateTier(originalIdx === -1 ? i : originalIdx, 'charLimit', Number(e.target.value))
                }}
                style={{ ...inp, width: '100%' }} />
              <span style={{ fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>chars</span>
            </div>
            <button onClick={() => {
              const originalIdx = tiers.findIndex(t => t.minAmount === tier.minAmount && t.charLimit === tier.charLimit)
              removeTier(originalIdx === -1 ? i : originalIdx)
            }} style={{ width: 32, height: 32, borderRadius: 8, cursor: 'pointer', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ×
            </button>
          </div>
        ))}

        {/* Preview note */}
        {sorted.length >= 2 && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <p style={{ fontSize: 12, color: '#a78bfa', fontWeight: 500 }}>
              Example: viewer tips ₹{sorted[1]!.minAmount} → gets {sorted[1]!.charLimit} chars &nbsp;·&nbsp; tips ₹{sorted[0]!.minAmount} → gets {sorted[0]!.charLimit} chars
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={save} disabled={saving} style={{ padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', background: saving ? 'rgba(124,58,237,0.2)' : 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* What viewers see */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div style={{ ...C, padding: '22px 24px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>What Viewers See</p>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>Your tier list appears on the donation page as viewers pick an amount</p>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Message Tiers</p>
            {sorted.length === 0 ? (
              <p style={{ fontSize: 12, color: '#334155' }}>Add tiers above to see the preview</p>
            ) : sorted.map((tier, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: i === 1 ? 'rgba(124,58,237,0.12)' : 'rgba(255,255,255,0.02)', border: `1px solid ${i === 1 ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)'}` }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12 }}>{i === 1 ? '●' : '○'}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: i === 1 ? '#a78bfa' : '#475569' }}>₹{tier.minAmount}+</span>
                  {i === 1 && <span style={{ fontSize: 10, color: '#7c3aed' }}>current tier</span>}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: i === 1 ? '#a78bfa' : '#334155' }}>{tier.charLimit} chars</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...C, padding: '22px 24px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>How Tiers Work</p>
          <p style={{ fontSize: 12, color: '#475569', marginBottom: 16 }}>The highest tier the viewer's donation meets unlocks the most characters</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '₹', color: '#7c3aed', title: 'Set minimum amount', desc: 'Blocks tips below your floor — protects against spam donations' },
              { icon: '✦', color: '#0891b2', title: 'Add tiers', desc: 'Each tier unlocks more characters. Viewers see all tiers on the donation page' },
              { icon: '↑', color: '#059669', title: 'Higher tip = more chars', desc: 'Incentivises bigger tips — viewers write longer messages for more money' },
              { icon: '⟳', color: '#d97706', title: 'Changes apply instantly', desc: 'After saving, new donations immediately use the updated tiers' },
            ].map(step => (
              <div key={step.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: `${step.color}18`, border: `1px solid ${step.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: step.color, flexShrink: 0 }}>{step.icon}</div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{step.title}</p>
                  <p style={{ fontSize: 12, color: '#475569', margin: '3px 0 0', lineHeight: 1.5 }}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
