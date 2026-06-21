'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

type OverlayTab = 'appearance' | 'tts' | 'goal' | 'leaderboard'

const TEMPLATES = [
  { id: 'superchat', label: 'Superchat',  desc: 'Auto-colored pills by amount' },
  { id: 'colorful',  label: 'Colorful',   desc: 'Vibrant gradient backgrounds' },
  { id: 'custom',    label: 'Minimal',    desc: 'Clean configurable card' },
]
const ANIMATIONS = ['none', 'slideDown', 'slideUp', 'fadeIn', 'bounceIn', 'zoomIn']
const FONTS = ['Arial', 'Verdana', 'Georgia', 'Courier New', 'Impact']

const C: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }
const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7 }
const sel: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#f8fafc', outline: 'none' }
const numInput: React.CSSProperties = { ...sel }
const colorInput: React.CSSProperties = { width: '100%', height: 38, borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'none', cursor: 'pointer', padding: 2 }

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, background: on ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.12)', transition: 'background 0.2s' }}>
      <span style={{ position: 'absolute', top: 2, left: 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'transform 0.2s', transform: on ? 'translateX(20px)' : 'none' }} />
    </button>
  )
}

export default function OverlayPage() {
  const [tab, setTab] = useState<OverlayTab>('appearance')
  const [s, setS] = useState<any>({
    template: 'superchat', bgColor: '#1a1a2e', bgOpacity: 100, textColor: '#ffffff',
    fontSize: 24, fontStyle: 'Arial', textBold: true, textItalic: false, textUnderline: false,
    animationStyle: 'slideDown', enableBorder: false, ttsEnabled: true, ttsVolume: 100, ttsVoice: 'en-IN',
    alertDuration: 8,
  })
  const [goal, setGoal] = useState<any>({ title: '', targetAmount: 1000, isActive: false })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<any>('/api/streamer/alert-settings'),
      api.get<any>('/api/streamer/goal'),
    ]).then(([settings, g]) => {
      if (settings && Object.keys(settings).length) setS(settings)
      if (g) setGoal(g)
    }).catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      const proms = [api.patch('/api/streamer/alert-settings', s)]
      if (goal.title && goal.targetAmount) proms.push(api.put('/api/streamer/goal', goal))
      await Promise.all(proms)
      toast.success('Overlay settings saved!')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function sendTestAlert() {
    setTesting(true)
    try {
      const res = await api.post<{ success: boolean; amount: number; name: string }>('/api/streamer/test-alert')
      toast.success(`Test alert sent! ₹${res.amount} from ${res.name}`)
    } catch (e: any) { toast.error(e.message) } finally { setTesting(false) }
  }

  const tabs: [OverlayTab, string][] = [['appearance', 'Appearance'], ['tts', 'TTS & Audio'], ['goal', 'Donation Goal'], ['leaderboard', 'Leaderboard']]

  const textInput: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: '#f8fafc', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ padding: 28, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' }}>Overlay Settings</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>Customize how donation alerts appear on your stream</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={sendTestAlert} disabled={testing} style={{
            padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: testing ? 'not-allowed' : 'pointer',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
            color: '#a78bfa', opacity: testing ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span style={{ fontSize: 15 }}>🧪</span>
            {testing ? 'Sending…' : 'Send Test Alert'}
          </button>
          <button onClick={save} disabled={saving} style={{ padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white', boxShadow: '0 0 20px rgba(124,58,237,0.3)', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>

        {/* Left: settings */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4 }}>
            {tabs.map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                background: tab === t ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.04)',
                border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.07)',
                color: tab === t ? 'white' : '#64748b',
              }}>{label}</button>
            ))}
          </div>

          {tab === 'appearance' && (
            <>
              {/* Templates */}
              <div style={{ ...C, padding: '20px 22px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 14 }}>Alert Template</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {TEMPLATES.map(t => (
                    <button key={t.id} onClick={() => setS((p: any) => ({ ...p, template: t.id }))} style={{
                      padding: '14px 12px', borderRadius: 11, textAlign: 'center', cursor: 'pointer',
                      background: s.template === t.id ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                      border: `2px solid ${s.template === t.id ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
                      transition: 'all 0.15s',
                    }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: s.template === t.id ? '#f8fafc' : '#64748b', marginBottom: 3 }}>{t.label}</p>
                      <p style={{ fontSize: 11, color: '#334155' }}>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors + Text */}
              <div style={{ ...C, padding: '20px 22px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Background</p>
                  <div>
                    <label style={fieldLabel}>Background Color</label>
                    <input type="color" value={s.bgColor} onChange={e => setS((p: any) => ({ ...p, bgColor: e.target.value }))} style={colorInput} />
                  </div>
                  <div>
                    <label style={fieldLabel}>Opacity: {s.bgOpacity}%</label>
                    <input type="range" min={0} max={100} value={s.bgOpacity} onChange={e => setS((p: any) => ({ ...p, bgOpacity: Number(e.target.value) }))} style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label style={fieldLabel}>Text Color</label>
                    <input type="color" value={s.textColor} onChange={e => setS((p: any) => ({ ...p, textColor: e.target.value }))} style={colorInput} />
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Text & Animation</p>
                  <div>
                    <label style={fieldLabel}>Font Size (px)</label>
                    <input type="number" value={s.fontSize} min={12} max={72} onChange={e => setS((p: any) => ({ ...p, fontSize: Number(e.target.value) }))} style={numInput} />
                  </div>
                  <div>
                    <label style={fieldLabel}>Font</label>
                    <select value={s.fontStyle} onChange={e => setS((p: any) => ({ ...p, fontStyle: e.target.value }))} style={sel}>{FONTS.map(f => <option key={f}>{f}</option>)}</select>
                  </div>
                  <div>
                    <label style={fieldLabel}>Animation</label>
                    <select value={s.animationStyle} onChange={e => setS((p: any) => ({ ...p, animationStyle: e.target.value }))} style={sel}>{ANIMATIONS.map(a => <option key={a}>{a}</option>)}</select>
                  </div>
                  <div>
                    <label style={fieldLabel}>Text Style</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['textBold', 'textItalic', 'textUnderline'] as const).map((key, idx) => (
                        <button key={key} onClick={() => setS((p: any) => ({ ...p, [key]: !p[key] }))} style={{
                          width: 34, height: 34, borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                          background: s[key] ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.05)',
                          border: s[key] ? 'none' : '1px solid rgba(255,255,255,0.09)',
                          color: s[key] ? 'white' : '#64748b',
                        }}>{['B', 'I', 'U'][idx]}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced */}
              <div style={{ ...C, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Toggle on={s.enableBorder} onChange={v => setS((p: any) => ({ ...p, enableBorder: v }))} />
                  <p style={{ fontSize: 13, color: '#94a3b8' }}>Enable border</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ ...fieldLabel, marginBottom: 0 }}>Duration (s)</label>
                  <input type="number" value={s.alertDuration} min={3} max={30} onChange={e => setS((p: any) => ({ ...p, alertDuration: Number(e.target.value) }))} style={{ ...numInput, width: 70 }} />
                </div>
              </div>
            </>
          )}

          {tab === 'tts' && (
            <div style={{ ...C, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Text to Speech</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#f8fafc' }}>Enable TTS</p>
                  <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>Read donation messages aloud on your stream</p>
                </div>
                <Toggle on={s.ttsEnabled} onChange={v => setS((p: any) => ({ ...p, ttsEnabled: v }))} />
              </div>
              <div>
                <label style={fieldLabel}>Voice Language</label>
                <select value={s.ttsVoice} onChange={e => setS((p: any) => ({ ...p, ttsVoice: e.target.value }))} style={sel}>
                  {['en-IN', 'hi-IN', 'en-US', 'en-GB'].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={fieldLabel}>Volume: {s.ttsVolume}%</label>
                <input type="range" min={0} max={100} value={s.ttsVolume} onChange={e => setS((p: any) => ({ ...p, ttsVolume: Number(e.target.value) }))} style={{ width: '100%' }} />
              </div>
            </div>
          )}

          {tab === 'goal' && (
            <div style={{ ...C, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>Donation Goal</p>
              <div>
                <label style={fieldLabel}>Goal Title</label>
                <input value={goal.title} onChange={e => setGoal((g: any) => ({ ...g, title: e.target.value }))} placeholder="e.g. New PC Fund" style={textInput} />
              </div>
              <div>
                <label style={fieldLabel}>Target Amount (₹)</label>
                <input type="number" value={goal.targetAmount} onChange={e => setGoal((g: any) => ({ ...g, targetAmount: Number(e.target.value) }))} style={textInput} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Toggle on={goal.isActive} onChange={v => setGoal((g: any) => ({ ...g, isActive: v }))} />
                <p style={{ fontSize: 13, color: '#94a3b8' }}>Show goal progress bar on overlay</p>
              </div>
            </div>
          )}

          {tab === 'leaderboard' && (
            <div style={{ ...C, padding: '80px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>Leaderboard Settings</p>
              <p style={{ fontSize: 13, color: '#475569' }}>Show top donors on your overlay — coming soon</p>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ ...C, padding: 18, position: 'sticky', top: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171' }} />
              <p style={{ fontSize: 11, fontWeight: 700, color: '#334155', letterSpacing: '0.05em' }}>LIVE PREVIEW</p>
            </div>
            <div style={{ background: '#000', borderRadius: 10, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                borderRadius: 12, padding: '14px 18px', textAlign: 'center',
                backgroundColor: s.bgColor,
                color: s.textColor,
                fontSize: s.fontSize * 0.6,
                fontFamily: s.fontStyle,
                fontWeight: s.textBold ? 'bold' : 'normal',
                fontStyle: s.textItalic ? 'italic' : 'normal',
                textDecoration: s.textUnderline ? 'underline' : 'none',
                border: s.enableBorder ? `2px solid ${s.textColor}50` : 'none',
              }}>
                <p style={{ fontWeight: 700 }}>Rahul donated ₹500</p>
                <p style={{ opacity: 0.8, fontSize: '0.85em', marginTop: 4 }}>"Keep it up bhai!"</p>
              </div>
            </div>
            <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 12 }}>This is how alerts appear on OBS</p>
          </div>
        </div>
      </div>
    </div>
  )
}
