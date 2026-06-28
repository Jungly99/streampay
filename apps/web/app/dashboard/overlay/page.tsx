'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../../lib/api'
import { getSocket } from '../../../lib/socket'
import toast from 'react-hot-toast'

type Tab = 'appearance' | 'tts' | 'goal' | 'safety' | 'leaderboard'

const TEMPLATES = [
  { id: 'superchat', emoji: '💬', label: 'eztips',    desc: 'Structured card, your colors' },
  { id: 'colorful',  emoji: '🌈', label: 'Vibrant',   desc: 'Bold layout, your colors' },
  { id: 'custom',    emoji: '✦',  label: 'Minimal',   desc: 'Clean, fully your own' },
]
// Unified font list — system fonts first, then Google Fonts (all loaded via <link> on mount)
const FONTS = [
  // System / Web-safe
  'Arial','Verdana','Georgia','Trebuchet MS','Courier New','Impact','Comic Sans MS',
  // Google — Clean / Modern
  'Inter','Roboto','Open Sans','Lato','Poppins','Nunito','Raleway',
  // Google — Bold / Display
  'Oswald','Montserrat','Bebas Neue','Anton','Barlow Condensed',
  // Google — Gaming / Techy
  'Orbitron','Rajdhani','Play','Share Tech Mono',
  // Google — Decorative / Retro
  'Press Start 2P','VT323','Bungee',
]
const GFONTS_URL = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Poppins:wght@400;600;700&family=Nunito:wght@400;700&family=Raleway:wght@400;700&family=Oswald:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Bebas+Neue&family=Anton&family=Barlow+Condensed:wght@400;700&family=Orbitron:wght@400;700&family=Rajdhani:wght@400;700&family=Play:wght@400;700&family=Share+Tech+Mono&family=Press+Start+2P&family=VT323&family=Bungee&display=swap'
const ANIMATIONS = [
  { id: 'slideDown', label: 'Slide Down' },{ id: 'slideUp', label: 'Slide Up' },
  { id: 'fadeIn', label: 'Fade In' },{ id: 'bounceIn', label: 'Bounce' },
  { id: 'zoomIn', label: 'Zoom In' },{ id: 'none', label: 'Instant' },
]

// ── Style constants ──────────────────────────────────────────────────
const C: React.CSSProperties = { background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14 }
const lbl: React.CSSProperties = { display:'block', fontSize:11, fontWeight:600, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:7 }
const inp: React.CSSProperties = { width:'100%', padding:'9px 12px', borderRadius:9, fontSize:13, boxSizing:'border-box', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'#f1f5f9', outline:'none' }
const colorBox: React.CSSProperties = { width:'100%', height:38, borderRadius:9, border:'1px solid rgba(255,255,255,0.08)', background:'none', cursor:'pointer', padding:2 }
const sH: React.CSSProperties = { fontSize:13, fontWeight:700, color:'#e2e8f0', marginBottom:14, display:'flex', alignItems:'center', gap:8 }
const divider: React.CSSProperties = { height:1, background:'rgba(255,255,255,0.05)', margin:'14px 0' }

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width:42, height:23, borderRadius:12, border:'none', cursor:'pointer', position:'relative', flexShrink:0, background: on ? 'linear-gradient(90deg,#7c3aed,#ec4899)' : 'rgba(255,255,255,0.1)', transition:'background 0.2s' }}>
      <span style={{ position:'absolute', top:2, left:2, width:19, height:19, borderRadius:'50%', background:'white', transition:'transform 0.2s', transform: on ? 'translateX(19px)' : 'none', boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
    </button>
  )
}
function Row({ label: l, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ fontSize:13, fontWeight:500, color:'#cbd5e1', margin:0 }}>{l}</p>
        {tip && <p style={{ fontSize:11, color:'#475569', margin:'2px 0 0' }}>{tip}</p>}
      </div>
      {children}
    </div>
  )
}
function Slider({ label: l, value, min, max, step=1, unit, onChange }: { label:string; value:number; min:number; max:number; step?:number; unit?:string; onChange:(v:number)=>void }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
        <span style={lbl}>{l}</span>
        <span style={{ fontSize:12, color:'#7c3aed', fontWeight:700 }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width:'100%', accentColor:'#7c3aed' }} />
    </div>
  )
}
function InfoBox({ children }: { children: React.ReactNode }) {
  return <div style={{ background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'#94a3b8', lineHeight:1.6 }}>{children}</div>
}
function Select({ value, onChange, options }: { value:string; onChange:(v:string)=>void; options:{value:string;label:string}[] }) {
  const [open, setOpen] = useState(false)
  const [dropRect, setDropRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const label = options.find(o=>o.value===value)?.label ?? value

  const handleOpen = () => {
    if (btnRef.current) setDropRect(btnRef.current.getBoundingClientRect())
    setOpen(o => !o)
  }

  // Close on scroll / resize so the dropdown doesn't float away
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close) }
  }, [open])

  return (
    <div style={{ position:'relative' }}>
      <button ref={btnRef} type="button" onClick={handleOpen}
        style={{ ...inp, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)', userSelect:'none' as any }}>
        <span style={{ fontFamily: FONTS.includes(value) && !['Arial','Verdana','Georgia','Trebuchet MS','Courier New','Impact','Comic Sans MS'].includes(value) ? `'${value}',sans-serif` : undefined }}>{label}</span>
        <span style={{ fontSize:10, color:'#64748b', marginLeft:8, flexShrink:0 }}>{open?'▲':'▼'}</span>
      </button>
      {open && dropRect && (
        <>
          <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, zIndex:9998 }} />
          <div style={{
            position:'fixed',
            top: dropRect.bottom + 4,
            left: dropRect.left,
            width: dropRect.width,
            zIndex:9999,
            background:'#1a1a2e',
            border:'1px solid rgba(255,255,255,0.12)',
            borderRadius:10,
            overflow:'auto',
            maxHeight: Math.min(320, window.innerHeight - dropRect.bottom - 8),
            boxShadow:'0 12px 40px rgba(0,0,0,0.8)',
          }}>
            {options.map(o=>(
              <button key={o.value} type="button" onClick={()=>{ onChange(o.value); setOpen(false) }}
                style={{
                  display:'block', width:'100%', textAlign:'left', padding:'9px 13px', fontSize:13,
                  fontFamily: !['Arial','Verdana','Georgia','Trebuchet MS','Courier New','Impact','Comic Sans MS'].includes(o.value) ? `'${o.value}',sans-serif` : undefined,
                  background: o.value===value ? 'rgba(124,58,237,0.18)' : 'transparent',
                  color: o.value===value ? '#a78bfa' : '#e2e8f0',
                  border:'none', borderBottom:'1px solid rgba(255,255,255,0.04)', cursor:'pointer',
                }}
                onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,0.06)')}
                onMouseLeave={e=>(e.currentTarget.style.background=o.value===value?'rgba(124,58,237,0.18)':'transparent')}
              >{o.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function OverlayPage() {
  const [tab, setTab] = useState<Tab>('appearance')
  const [s, setS] = useState<any>({
    template:'superchat', bgColor:'#1a1a2e', bgOpacity:100, textColor:'#ffffff',
    fontSize:24, fontStyle:'Arial', textBold:true, textItalic:false, textUnderline:false,
    animationStyle:'slideDown', enableBorder:false, alertDuration:8,
    enableShadow:false, shadowBlur:20, shadowColor:'#ffffff', shadowOpacity:30, shadowOffsetX:0, shadowOffsetY:8,
    enableGradientBg:false,
    ttsEnabled:true, ttsVolume:100, ttsVoice:'en-IN', ttsRate:1.0, ttsPitch:1.0,
    enableCoinSound:true, coinSoundVolume:50, ttsSoundDelay:1, alertSoundType:'coin', customAlertSoundUrl:'',
    minAlertAmount:0, minTtsAmount:0,
    goalBarColor:'#7c3aed', goalBarOpacity:100, enableGoalCelebration:true,
    goalLayout:'standard', goalFontSize:16, goalFontFamily:'Arial',
    goalTextColor:'#ffffff', goalBarTextColor:'#ffffff', goalSecondColor:'#ec4899',
    goalEnableTextShadow:true, goalEnableBg:true, goalBgColor:'#000000', goalBgOpacity:78, goalBarHeight:18,
    enableBirthday:false, birthdayTemplate:'Happy Birthday {name}! 🎂',
    enableProfanityFilter:true, customBlocklist:'',
  })
  const [goal, setGoal] = useState<any>({ title:'', targetAmount:1000, isActive:false, currentAmount:0 })
  const [manualAdd, setManualAdd] = useState('')
  const [customSoundBase64, setCustomSoundBase64] = useState('')
  const [customSoundName, setCustomSoundName] = useState('')
  const [overlayToken, setOverlayToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [showGoalToken, setShowGoalToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [lbTab, setLbTab] = useState<'top'|'recent'|'streak'>('top')
  const [lbColors, setLbColors] = useState({ top: '#7c3aed', recent: '#10b981', streak: '#f59e0b' })
  const [lbTitles, setLbTitles] = useState({ top: 'Top Donors', recent: 'Recent Donors', streak: 'Donation Train' })
  const [lbCounts, setLbCounts] = useState({ top: 5, recent: 6 })
  const [lbResetMin, setLbResetMin] = useState(5)
  const [lbBg, setLbBg] = useState({ top: '#0a0a1a', recent: '#0a0a1a', streak: '#0a0a1a' })
  const [lbOpacity, setLbOpacity] = useState({ top: 85, recent: 85, streak: 88 })
  const [lbTextColor, setLbTextColor] = useState({ top: '#e2e8f0', recent: '#e2e8f0', streak: '#e2e8f0' })
  const [lbFontSize, setLbFontSize] = useState({ top: 13, recent: 13, streak: 13 })
  const [lbFont, setLbFont] = useState({ top: 'Arial', recent: 'Arial', streak: 'Arial' })
  const [lbBold, setLbBold] = useState({ top: true, recent: true, streak: true })
  const [lbRotSpeed, setLbRotSpeed] = useState({ top: 2.5, recent: 2.5 })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('eztips_lb_settings')
      if (saved) {
        const p = JSON.parse(saved)
        if (p.colors) setLbColors(p.colors)
        if (p.titles) setLbTitles(p.titles)
        if (p.counts) setLbCounts(p.counts)
        if (p.resetMin != null) setLbResetMin(p.resetMin)
        if (p.bg) setLbBg(p.bg)
        if (p.opacity) setLbOpacity(p.opacity)
        if (p.textColor) setLbTextColor(p.textColor)
        if (p.fontSize) setLbFontSize(p.fontSize)
        if (p.font) setLbFont(p.font)
        if (p.bold) setLbBold(p.bold)
        if (p.rotSpeed) setLbRotSpeed(p.rotSpeed)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('eztips_lb_settings', JSON.stringify({ colors: lbColors, titles: lbTitles, counts: lbCounts, resetMin: lbResetMin, bg: lbBg, opacity: lbOpacity, textColor: lbTextColor, fontSize: lbFontSize, font: lbFont, bold: lbBold, rotSpeed: lbRotSpeed }))
    } catch {}
  }, [lbColors, lbTitles, lbCounts, lbResetMin])

  useEffect(() => {
    Promise.all([
      api.get<any>('/api/streamer/alert-settings'),
      api.get<any>('/api/streamer/goal'),
      api.get<any>('/api/streamer/profile'),
    ]).then(([settings, g, profile]) => {
      if (settings && Object.keys(settings).length) {
        const { id: _id, streamerId: _sid, createdAt: _ca, updatedAt: _ua, ...clean } = settings
        if (clean.customAlertSoundUrl?.startsWith('data:')) {
          // DB already has the data URL — restore UI
          setCustomSoundBase64(clean.customAlertSoundUrl)
          setCustomSoundName('custom audio')
        } else {
          // DB doesn't have it — pull from localStorage so next Save persists it to DB
          const localData = localStorage.getItem('eztips_custom_alert_sound')
          const localName = localStorage.getItem('eztips_custom_alert_sound_name')
          if (localData) {
            clean.customAlertSoundUrl = localData
            clean.alertSoundType = 'custom_url'
            setCustomSoundBase64(localData)
            setCustomSoundName(localName ?? 'custom.mp3')
          }
        }
        setS((p: any) => ({ ...p, ...clean }))
      }
      if (g) setGoal(g)
      if (profile?.overlayToken) setOverlayToken(profile.overlayToken)
    }).catch(() => {})
  }, [])

  // Listen to real-time goal updates (e.g. when a donation arrives) to keep preview in sync
  useEffect(() => {
    if (!overlayToken) return
    const socket = getSocket()
    socket.connect()
    const onConnect = () => socket.emit('join-overlay', { token: overlayToken })
    const onGoal = (data: any) => setGoal((g: any) => ({ ...g, ...data }))
    socket.on('connect', onConnect)
    socket.on('goal-updated', onGoal)
    if (socket.connected) onConnect()
    return () => {
      socket.off('connect', onConnect)
      socket.off('goal-updated', onGoal)
      socket.disconnect()
    }
  }, [overlayToken])

  // Load Google Fonts for the in-dashboard preview
  useEffect(() => {
    const id = 'eztips-goal-gfonts'
    if (!document.getElementById(id)) {
      const link = document.createElement('link')
      link.id = id; link.rel = 'stylesheet'
      link.href = GFONTS_URL
      document.head.appendChild(link)
    }
  }, [])

  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }))

  const APPEARANCE_DEFAULTS = {
    template:'superchat', bgColor:'#1a1a2e', bgOpacity:100, textColor:'#ffffff',
    fontSize:24, fontStyle:'Arial', textBold:true, textItalic:false, textUnderline:false,
    animationStyle:'slideDown', enableBorder:false, alertDuration:8,
    enableShadow:false, shadowBlur:20, shadowColor:'#ffffff', shadowOpacity:30, shadowOffsetX:0, shadowOffsetY:8,
    enableGradientBg:false, minAlertAmount:0,
  }

  const GOAL_DEFAULTS = {
    goalBarColor:'#7c3aed', goalBarOpacity:100, enableGoalCelebration:true,
    goalLayout:'standard', goalFontSize:16, goalFontFamily:'Arial',
    goalTextColor:'#ffffff', goalBarTextColor:'#ffffff', goalSecondColor:'#ec4899',
    goalEnableTextShadow:true, goalEnableBg:true, goalBgColor:'#000000', goalBgOpacity:78, goalBarHeight:18,
    enableBirthday:false, birthdayTemplate:'Happy Birthday {name}! 🎂',
  }

  function resetAppearance() {
    setS((p: any) => ({ ...p, ...APPEARANCE_DEFAULTS }))
    toast.success('Appearance reset to defaults')
  }

  function resetGoalSettings() {
    setS((p: any) => ({ ...p, ...GOAL_DEFAULTS }))
    toast.success('Goal settings reset to defaults')
  }

  async function save() {
    setSaving(true)
    try {
      await Promise.all([
        api.patch('/api/streamer/alert-settings', s),
        goal.title ? api.put('/api/streamer/goal', goal) : Promise.resolve(),
      ])
      toast.success('Settings saved!')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function sendTest() {
    setTesting(true)
    try {
      // Save settings first (best-effort — don't block the test if save fails)
      try { await api.patch('/api/streamer/alert-settings', s) } catch { /* ignore */ }
      const r = await api.post<any>('/api/streamer/test-alert')
      toast.success(`Test sent — ₹${r.amount} from ${r.name}`)
    } catch (e: any) { toast.error(e.message ?? 'Failed to send test alert') } finally { setTesting(false) }
  }

  function previewVoice() {
    if (!('speechSynthesis' in window)) { toast.error('TTS not supported in this browser'); return }
    const u = new SpeechSynthesisUtterance('Sample Support donated ₹100. Keep it up!')
    u.lang = s.ttsVoice; u.volume = s.ttsVolume / 100; u.rate = s.ttsRate; u.pitch = s.ttsPitch
    speechSynthesis.cancel(); speechSynthesis.speak(u)
    toast.success('Playing voice preview…')
  }

  const SITE = typeof window !== 'undefined' ? window.location.origin : 'https://eztips.live'

  const buildLbUrl = (key: 'top'|'recent'|'streak') => {
    if (!overlayToken) return ''
    const p = new URLSearchParams()
    p.set('c',  lbColors[key].replace('#',''))
    p.set('t',  key==='top' ? lbTitles.top : key==='recent' ? lbTitles.recent : lbTitles.streak)
    p.set('bg', lbBg[key].replace('#',''))
    p.set('op', String(lbOpacity[key]))
    p.set('fc', lbTextColor[key].replace('#',''))
    p.set('fs', String(lbFontSize[key]))
    p.set('ff', lbFont[key])
    p.set('fw', lbBold[key] ? '700' : '400')
    if (key==='top')    { p.set('n', String(lbCounts.top));    p.set('rs', String(lbRotSpeed.top)) }
    if (key==='recent') { p.set('n', String(lbCounts.recent)); p.set('rs', String(lbRotSpeed.recent)) }
    if (key==='streak') p.set('r', String(lbResetMin))
    return `${SITE}/overlay/${overlayToken}/leaderboard/${key}?${p.toString()}`
  }
  const overlayUrl     = overlayToken ? `${SITE}/overlay/${overlayToken}` : ''
  const goalOverlayUrl = overlayToken ? `${SITE}/overlay/${overlayToken}/goal` : ''
  const maskUrl = (url: string) => overlayToken ? url.replace(overlayToken, '•'.repeat(16)) : url
  const maskedUrl     = maskUrl(overlayUrl)
  const maskedGoalUrl = maskUrl(goalOverlayUrl)

  const tabs: [Tab, string, string][] = [
    ['appearance','🎨','Appearance'],
    ['tts','🔊','TTS & Audio'],
    ['goal','🎯','Goal'],
    ['safety','🛡️','Safety'],
    ['leaderboard','🏆','Leaderboard'],
  ]

  // Live preview render — uses streamer colors only, no tier overrides
  const previewBg = s.enableGradientBg ? `linear-gradient(135deg,${s.bgColor},${s.bgColor}aa)` : (s.bgOpacity===0 ? 'transparent' : s.bgColor)

  return (
    <div style={{ padding:'24px 28px', minHeight:'100%', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
      <div style={{ marginBottom:22 }}>
        <h1 style={{ fontSize:20, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.5px', margin:0 }}>Overlay Settings</h1>
        <p style={{ fontSize:13, color:'#475569', margin:'4px 0 0' }}>Customize alerts, TTS, goals, and safety for your stream</p>
      </div>

      <div style={{ display:'flex', gap:20, alignItems:'flex-start' }}>

        {/* ── LEFT ──────────────────────────────────────────── */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:14 }}>

          {/* Tab bar */}
          <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.03)', borderRadius:12, padding:4, border:'1px solid rgba(255,255,255,0.06)', overflowX:'auto' }}>
            {tabs.map(([t,icon,name]) => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding:'7px 14px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap',
                display:'flex', alignItems:'center', gap:5,
                background: tab===t ? 'linear-gradient(135deg,#7c3aed,#ec4899)' : 'transparent',
                border:'none', color: tab===t ? 'white' : '#64748b', transition:'all 0.15s',
                boxShadow: tab===t ? '0 2px 10px rgba(124,58,237,0.3)' : 'none',
              }}>
                <span style={{ fontSize:13 }}>{icon}</span>{name}
              </button>
            ))}
          </div>

          {/* ── APPEARANCE ─────────────────────────── */}
          {tab==='appearance' && <>
            <div style={{ display:'flex', justifyContent:'flex-end' }}>
              <button onClick={resetAppearance} style={{ padding:'7px 14px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:600, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.18)', color:'#f87171', display:'flex', alignItems:'center', gap:6 }}>
                ↺ Reset to Defaults
              </button>
            </div>
            <div style={{ ...C, padding:'18px 20px' }}>
              <p style={sH}><span>🖼️</span> Alert Template</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                {TEMPLATES.map(t => (
                  <button key={t.id} onClick={() => set('template',t.id)} style={{
                    padding:'14px 10px', borderRadius:12, textAlign:'center', cursor:'pointer',
                    background: s.template===t.id ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                    border:`2px solid ${s.template===t.id ? '#7c3aed' : 'rgba(255,255,255,0.06)'}`,
                    transition:'all 0.15s',
                  }}>
                    <span style={{ fontSize:24, display:'block', marginBottom:6 }}>{t.emoji}</span>
                    <p style={{ fontSize:12, fontWeight:700, color: s.template===t.id ? '#f1f5f9' : '#64748b', margin:0 }}>{t.label}</p>
                    <p style={{ fontSize:10, color:'#374151', margin:'3px 0 0' }}>{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ ...C, padding:'18px 20px' }}>
              <p style={sH}><span>🎨</span> Appearance</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div><span style={lbl}>Background Color</span><input type="color" value={s.bgColor} onChange={e=>set('bgColor',e.target.value)} style={colorBox}/></div>
                  <Slider label="Opacity" value={s.bgOpacity} min={0} max={100} unit="%" onChange={v=>set('bgOpacity',v)}/>
                  <div><span style={lbl}>Text Color</span><input type="color" value={s.textColor} onChange={e=>set('textColor',e.target.value)} style={colorBox}/></div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <span style={lbl}>Font Size (px)</span>
                    <input type="number" value={s.fontSize} min={12} max={72} onChange={e=>set('fontSize',Number(e.target.value))} style={inp}/>
                  </div>
                  <div>
                    <span style={lbl}>Font</span>
                    <Select value={s.fontStyle} onChange={v=>set('fontStyle',v)} options={FONTS.map(f=>({value:f,label:f}))} />
                  </div>
                  <div>
                    <span style={lbl}>Entrance Animation</span>
                    <Select value={s.animationStyle} onChange={v=>set('animationStyle',v)} options={ANIMATIONS.map(a=>({value:a.id,label:a.label}))} />
                  </div>
                </div>
              </div>
              <div style={divider}/>
              <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                <div>
                  <span style={lbl}>Text Style</span>
                  <div style={{ display:'flex', gap:6 }}>
                    {([['textBold','B','bold'],['textItalic','I','italic'],['textUnderline','U','underline']] as const).map(([k,c,st])=>(
                      <button key={k} onClick={()=>set(k,!s[k])} style={{ width:34, height:34, borderRadius:8, cursor:'pointer', fontSize:14, fontWeight:700, fontStyle:st==='italic'?'italic':'normal', textDecoration:st==='underline'?'underline':'none', background:s[k]?'linear-gradient(135deg,#7c3aed,#ec4899)':'rgba(255,255,255,0.05)', border:s[k]?'none':'1px solid rgba(255,255,255,0.08)', color:s[k]?'white':'#64748b' }}>{c}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
                  <span style={{ ...lbl, marginBottom:0 }}>Show for</span>
                  <input type="number" value={s.alertDuration} min={3} max={30} onChange={e=>set('alertDuration',Number(e.target.value))} style={{ ...inp, width:58 }}/>
                  <span style={{ fontSize:12, color:'#475569' }}>sec</span>
                </div>
              </div>
            </div>

            <div style={{ ...C, padding:'18px 20px' }}>
              <p style={sH}><span>✦</span> Advanced Effects</p>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Row label="Card Border" tip="Outline the alert card with tier color"><Toggle on={s.enableBorder} onChange={v=>set('enableBorder',v)}/></Row>
                <Row label="Gradient Background" tip="Adds a gradient tint to your background color"><Toggle on={s.enableGradientBg} onChange={v=>set('enableGradientBg',v)}/></Row>
                <Row label="Drop Shadow" tip="Soft shadow beneath the alert card"><Toggle on={s.enableShadow} onChange={v=>set('enableShadow',v)}/></Row>
                {s.enableShadow && (
                  <div style={{ paddingLeft:12, borderLeft:'2px solid rgba(124,58,237,0.3)', display:'flex', flexDirection:'column', gap:12 }}>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                      <Slider label="Blur" value={s.shadowBlur} min={0} max={60} unit="px" onChange={v=>set('shadowBlur',v)}/>
                      <Slider label="Opacity" value={s.shadowOpacity} min={0} max={100} unit="%" onChange={v=>set('shadowOpacity',v)}/>
                      <Slider label="X Offset" value={s.shadowOffsetX} min={-30} max={30} unit="px" onChange={v=>set('shadowOffsetX',v)}/>
                      <Slider label="Y Offset" value={s.shadowOffsetY} min={-30} max={30} unit="px" onChange={v=>set('shadowOffsetY',v)}/>
                    </div>
                    <div><span style={lbl}>Shadow Color</span><input type="color" value={s.shadowColor} onChange={e=>set('shadowColor',e.target.value)} style={{ ...colorBox, height:34 }}/></div>
                  </div>
                )}
                <div style={divider}/>
                <div>
                  <span style={lbl}>Min Amount to Show on Overlay (₹)</span>
                  <input type="number" value={s.minAlertAmount} min={0} onChange={e=>set('minAlertAmount',Number(e.target.value))} style={inp}/>
                  <p style={{ fontSize:11, color:'#475569', marginTop:5 }}>Donations below this won't show on overlay (test alerts always show)</p>
                </div>
              </div>
            </div>
          </>}

          {/* ── TTS & AUDIO ──────────────────────────── */}
          {tab==='tts' && <>
            <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              <p style={sH}><span>🗣️</span> Text to Speech</p>
              <Row label="Enable TTS" tip="Reads donation messages aloud during stream"><Toggle on={s.ttsEnabled} onChange={v=>set('ttsEnabled',v)}/></Row>
              {s.ttsEnabled && <>
                <div>
                  <span style={lbl}>Voice Language</span>
                  <Select value={s.ttsVoice} onChange={v=>set('ttsVoice',v)} options={[
                    ['en-IN','English – India'],['hi-IN','Hindi – India'],
                    ['kn-IN','Kannada – India'],['ml-IN','Malayalam – India'],
                    ['mr-IN','Marathi – India'],['bn-IN','Bengali – India'],
                    ['gu-IN','Gujarati – India'],['pa-IN','Punjabi – India'],
                    ['ur-IN','Urdu – India'],
                    ['ta-IN','Tamil – India'],['te-IN','Telugu – India'],
                    ['en-US','English – US'],['en-GB','English – UK'],
                  ].map(([v,n])=>({value:v!,label:n!}))} />
                  <div style={{ marginTop:6, padding:'8px 10px', borderRadius:8, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.18)' }}>
                    <p style={{ fontSize:11, color:'#f59e0b', margin:0, lineHeight:1.5 }}>
                      <strong>Voice availability depends on your OS.</strong> English – India and Hindi – India work on most devices. Other languages require the matching language pack installed on your computer. If a language isn&apos;t available, TTS falls back to English.
                    </p>
                  </div>
                </div>
                <Slider label="Volume" value={s.ttsVolume} min={0} max={100} unit="%" onChange={v=>set('ttsVolume',v)}/>
                <Slider label="Speed" value={s.ttsRate} min={0.5} max={2} step={0.1} unit="×" onChange={v=>set('ttsRate',v)}/>
                <Slider label="Pitch" value={s.ttsPitch} min={0} max={2} step={0.1} unit="" onChange={v=>set('ttsPitch',v)}/>
                <div>
                  <span style={lbl}>Min Donation for TTS (₹)</span>
                  <input type="number" value={s.minTtsAmount} min={0} onChange={e=>set('minTtsAmount',Number(e.target.value))} style={inp}/>
                  <p style={{ fontSize:11, color:'#475569', marginTop:5 }}>TTS only plays for donations at or above this amount</p>
                </div>
                <button onClick={previewVoice} style={{ padding:'9px 18px', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:600, background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'#a78bfa', display:'flex', alignItems:'center', gap:7, width:'fit-content' }}>
                  <span>▶</span> Preview Voice
                </button>
              </>}
            </div>

            <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              <p style={sH}><span>🔔</span> Alert Sound</p>
              <Row label="Enable Alert Sound" tip="Play a sound when a donation arrives"><Toggle on={s.enableCoinSound} onChange={v=>set('enableCoinSound',v)}/></Row>

              {s.enableCoinSound && <>
                {/* Sound preset grid */}
                <div>
                  <span style={lbl}>Choose Sound</span>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:4 }}>
                    {[
                      { id:'coin',    emoji:'🪙', label:'Coin' },
                      { id:'ding',    emoji:'🔔', label:'Ding' },
                      { id:'bell',    emoji:'🎵', label:'Bell' },
                      { id:'chime',   emoji:'✨', label:'Chime' },
                      { id:'pop',     emoji:'💥', label:'Pop' },
                      { id:'levelup', emoji:'⬆️', label:'Level Up' },
                      { id:'custom',  emoji:'🎧', label:'Upload' },
                    ].map(preset => {
                      // 'custom_url' is used internally when a file is uploaded (works with old OBS code)
                      const activeType = (s.alertSoundType ?? 'coin') === 'custom_url' ? 'custom' : (s.alertSoundType ?? 'coin')
                      const active = activeType === preset.id
                      return (
                        <button key={preset.id} type="button" onClick={() => set('alertSoundType', preset.id)} style={{
                          padding:'10px 4px', borderRadius:10, fontSize:12, fontWeight:600, cursor:'pointer',
                          background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${active ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.07)'}`,
                          color: active ? '#a78bfa' : '#64748b',
                          display:'flex', flexDirection:'column', alignItems:'center', gap:4, transition:'all 0.15s',
                        }}>
                          <span style={{ fontSize:18 }}>{preset.emoji}</span>
                          {preset.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Preview button */}
                {(s.alertSoundType ?? 'coin') === 'custom' ? (
                  customSoundBase64 ? (
                    <button type="button" onClick={() => {
                      try { const a = new Audio(customSoundBase64); a.volume = (s.coinSoundVolume ?? 50) / 100 * 0.6; a.play() } catch {}
                    }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'#a78bfa' }}>
                      ▶ Preview Sound
                    </button>
                  ) : (
                    <button type="button" disabled style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'not-allowed', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', color:'#475569' }}>
                      ▶ Preview Sound (upload a file first)
                    </button>
                  )
                ) : (
                  <button type="button" onClick={() => {
                    try {
                      const ctx = new AudioContext()
                      const vol = (s.coinSoundVolume ?? 50) / 100 * 0.6
                      const t = ctx.currentTime
                      const playTone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine') => {
                        const osc = ctx.createOscillator(); const g = ctx.createGain()
                        osc.connect(g); g.connect(ctx.destination)
                        osc.type = type; osc.frequency.setValueAtTime(freq, t + start)
                        g.gain.setValueAtTime(vol, t + start); g.gain.exponentialRampToValueAtTime(0.001, t + start + dur)
                        osc.start(t + start); osc.stop(t + start + dur)
                      }
                      const type = s.alertSoundType ?? 'coin'
                      if (type === 'coin') { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.frequency.setValueAtTime(880,t); o.frequency.exponentialRampToValueAtTime(440,t+0.08); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25); o.start(t); o.stop(t+0.25) }
                      else if (type === 'ding') { playTone(1200, 0, 0.6) }
                      else if (type === 'bell') { [523,659,784].forEach((f,i) => playTone(f,i*0.01,1.2)) }
                      else if (type === 'chime') { [523,659,784,1047].forEach((f,i) => playTone(f,i*0.12,0.5)) }
                      else if (type === 'pop') { const o = ctx.createOscillator(); const g = ctx.createGain(); o.connect(g); g.connect(ctx.destination); o.type='triangle'; o.frequency.setValueAtTime(200,t); o.frequency.exponentialRampToValueAtTime(40,t+0.1); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.12); o.start(t); o.stop(t+0.12) }
                      else if (type === 'levelup') { [440,554,659,880].forEach((f,i) => playTone(f,i*0.1,0.3)) }
                    } catch { /* AudioContext not available in SSR */ }
                  }} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'#a78bfa' }}>
                    ▶ Preview Sound
                  </button>
                )}

                {/* Custom file upload */}
                {(s.alertSoundType === 'custom' || s.alertSoundType === 'custom_url') && (
                  <div>
                    <span style={lbl}>Upload Audio File</span>
                    <div style={{ background:'rgba(255,255,255,0.02)', border:'1px dashed rgba(255,255,255,0.12)', borderRadius:10, padding:'16px', textAlign:'center' }}>
                      {customSoundBase64 ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems:'center' }}>
                          <span style={{ fontSize:12, color:'#10b981', fontWeight:600 }}>✓ {customSoundName}</span>
                          <div style={{ display:'flex', gap:8 }}>
                            <button type="button" onClick={() => { try { const a = new Audio(customSoundBase64); a.volume = (s.coinSoundVolume??50)/100; a.play() } catch{} }} style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'#a78bfa' }}>▶ Preview</button>
                            <button type="button" onClick={() => { setCustomSoundBase64(''); setCustomSoundName(''); localStorage.removeItem('eztips_custom_alert_sound'); localStorage.removeItem('eztips_custom_alert_sound_name'); setS((p: any) => ({ ...p, alertSoundType: 'custom', customAlertSoundUrl: null })) }} style={{ padding:'6px 12px', borderRadius:7, fontSize:11, fontWeight:600, cursor:'pointer', background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.2)', color:'#f87171' }}>Remove</button>
                          </div>
                        </div>
                      ) : (
                        <label style={{ cursor:'pointer', display:'block' }}>
                          <input type="file" accept=".mp3,.wav,.ogg,.m4a,audio/*" style={{ display:'none' }}
                            onChange={e => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              if (file.size > 512 * 1024) { alert('File too large. Max 500 KB.'); return }
                              const reader = new FileReader()
                              reader.onload = ev => {
                                const b64 = ev.target?.result as string
                                setCustomSoundBase64(b64); setCustomSoundName(file.name)
                                localStorage.setItem('eztips_custom_alert_sound', b64)
                                localStorage.setItem('eztips_custom_alert_sound_name', file.name)
                                // Use 'custom_url' type — old OBS code already plays from settings.customAlertSoundUrl for this type
                                setS((p: any) => ({ ...p, alertSoundType: 'custom_url', customAlertSoundUrl: b64 }))
                              }
                              reader.readAsDataURL(file)
                            }}
                          />
                          <span style={{ fontSize:22, display:'block', marginBottom:6 }}>🎵</span>
                          <span style={{ fontSize:13, fontWeight:600, color:'#a78bfa' }}>Click to upload</span>
                          <p style={{ fontSize:11, color:'#475569', marginTop:4, lineHeight:1.5 }}>MP3, WAV, OGG, M4A · Max 500 KB<br/>Stored in your browser — no server upload</p>
                        </label>
                      )}
                    </div>
                    <div style={{ marginTop:8, padding:'9px 12px', borderRadius:9, background:'rgba(245,158,11,0.07)', border:'1px solid rgba(245,158,11,0.2)' }}>
                      <p style={{ fontSize:11, color:'#64748b', lineHeight:1.5 }}>MP3, WAV, OGG, M4A · Max 500 KB · Audio is saved to your account and works in OBS automatically after saving.</p>
                    </div>
                  </div>
                )}

                <Slider label="Volume" value={s.coinSoundVolume} min={0} max={100} unit="%" onChange={v=>set('coinSoundVolume',v)}/>
                <Slider label="Delay Before TTS" value={s.ttsSoundDelay} min={0} max={12} unit="s" onChange={v=>set('ttsSoundDelay',v)}/>
                <p style={{ fontSize:11, color:'#475569' }}>How long after the sound to start TTS (0–12s, default 1s)</p>
              </>}
            </div>

            <InfoBox>
              <strong style={{ color:'#a78bfa' }}>OBS Tip:</strong> Make sure &ldquo;Control audio via OBS&rdquo; is enabled on your Browser Source so TTS and sounds play through your stream.
            </InfoBox>
          </>}

          {/* ── GOAL ────────────────────────────────── */}
          {tab==='goal' && <>
            <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              <p style={sH}><span>🎯</span> Donation Goal</p>
              <div><span style={lbl}>Goal Title</span><input value={goal.title} onChange={e=>setGoal((g:any)=>({...g,title:e.target.value}))} placeholder="e.g. New Mic Fund" style={inp}/></div>
              <div><span style={lbl}>Target Amount (₹)</span><input type="number" value={goal.targetAmount} onChange={e=>setGoal((g:any)=>({...g,targetAmount:Number(e.target.value)}))} style={inp}/></div>

              {/* Progress */}
              <div style={{ background:'rgba(124,58,237,0.06)', borderRadius:10, padding:14, border:'1px solid rgba(124,58,237,0.12)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#94a3b8', marginBottom:8 }}>
                  <span style={{ fontWeight:600 }}>{goal.title || 'Goal Progress'}</span>
                  <span>₹{goal.currentAmount ?? 0} / ₹{goal.targetAmount}</span>
                </div>
                <div style={{ height:8, background:'rgba(255,255,255,0.08)', borderRadius:8 }}>
                  <div style={{ height:'100%', width:`${Math.min(((goal.currentAmount??0)/Math.max(goal.targetAmount,1))*100,100)}%`, borderRadius:8, background:`linear-gradient(90deg,${s.goalBarColor},#ec4899)`, transition:'width 0.5s' }}/>
                </div>
                <p style={{ fontSize:10, color:'#475569', margin:'6px 0 0' }}>
                  {Math.round(((goal.currentAmount??0)/Math.max(goal.targetAmount,1))*100)}% reached
                </p>
              </div>

              {/* Manual add */}
              <div>
                <span style={lbl}>Add Amount Manually (other platforms)</span>
                <div style={{ display:'flex', gap:8 }}>
                  <input type="number" value={manualAdd} onChange={e=>setManualAdd(e.target.value)} placeholder="e.g. 500" style={{ ...inp, flex:1 }}/>
                  <button onClick={async ()=>{
                    const n=Number(manualAdd); if(n<=0) return
                    try {
                      const updated = await api.patch<any>('/api/streamer/goal/amount', { add: n })
                      setGoal((g:any)=>({...g, currentAmount: updated.currentAmount}))
                      setManualAdd('')
                      toast.success(`+₹${n} added to goal`)
                    } catch(e:any){ toast.error(e.message) }
                  }} style={{ padding:'9px 16px', borderRadius:9, cursor:'pointer', background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)', color:'#a78bfa', fontSize:13, fontWeight:600, flexShrink:0 }}>+ Add</button>
                </div>
                <p style={{ fontSize:11, color:'#475569', marginTop:5 }}>Manually add donations from YouTube Superchat, etc.</p>
              </div>

              <Row label="Show on Overlay" tip="Displays progress bar on OBS Browser Source"><Toggle on={goal.isActive} onChange={v=>setGoal((g:any)=>({...g,isActive:v}))}/></Row>
            </div>

            <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:18 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <p style={{ ...sH, marginBottom:0 }}><span>🎨</span> Goal Overlay Customization</p>
                <button onClick={resetGoalSettings} style={{ padding:'6px 12px', borderRadius:9, cursor:'pointer', fontSize:11, fontWeight:600, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.18)', color:'#f87171', display:'flex', alignItems:'center', gap:5 }}>↺ Reset</button>
              </div>

              {/* Layout selector */}
              <div>
                <span style={lbl}>Layout Style</span>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:4 }}>
                  {[
                    { id:'standard',   icon:'▤', name:'Standard',    desc:'Full featured' },
                    { id:'minimal',    icon:'▬', name:'Minimal',     desc:'Clean & simple' },
                    { id:'bar-labels', icon:'▣', name:'Bar Labels',  desc:'Text on bar' },
                    { id:'split',      icon:'◫', name:'Split',       desc:'Title left, amount right' },
                    { id:'compact',    icon:'▭', name:'Compact Pill',desc:'Single line' },
                    { id:'neon',       icon:'⚡', name:'Neon Glow',  desc:'Gaming style' },
                  ].map(l => {
                    const active = (s.goalLayout ?? 'standard') === l.id
                    return (
                      <button key={l.id} type="button" onClick={() => set('goalLayout', l.id)} style={{
                        padding:'10px 8px', borderRadius:10, cursor:'pointer', textAlign:'center',
                        background: active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.03)',
                        border:`1.5px solid ${active ? 'rgba(124,58,237,0.6)' : 'rgba(255,255,255,0.07)'}`,
                        color: active ? '#a78bfa' : '#64748b', transition:'all 0.15s',
                      }}>
                        <div style={{ fontSize:18, marginBottom:3 }}>{l.icon}</div>
                        <div style={{ fontSize:11, fontWeight:700 }}>{l.name}</div>
                        <div style={{ fontSize:10, opacity:0.6, marginTop:1 }}>{l.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Colors */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                <div><span style={lbl}>Bar Color</span><input type="color" value={s.goalBarColor} onChange={e=>set('goalBarColor',e.target.value)} style={colorBox}/></div>
                <div><span style={lbl}>Gradient End</span><input type="color" value={(s as any).goalSecondColor??'#ec4899'} onChange={e=>set('goalSecondColor',e.target.value)} style={colorBox}/></div>
                <div><span style={lbl}>Text Color</span><input type="color" value={(s as any).goalTextColor??'#ffffff'} onChange={e=>set('goalTextColor',e.target.value)} style={colorBox}/></div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div><span style={lbl}>Bar Text Color</span><input type="color" value={(s as any).goalBarTextColor??'#ffffff'} onChange={e=>set('goalBarTextColor',e.target.value)} style={colorBox}/></div>
                <div>
                  <span style={lbl}>Font Family</span>
                  <Select value={(s as any).goalFontFamily??'Arial'} onChange={v=>set('goalFontFamily',v)} options={FONTS.map(f=>({value:f,label:f}))}/>
                </div>
              </div>

              {/* Sliders */}
              <Slider label="Font Size (px)" value={(s as any).goalFontSize??16} min={10} max={32} unit="px" onChange={v=>set('goalFontSize',v)}/>
              <Slider label="Bar Height (px)" value={(s as any).goalBarHeight??18} min={6} max={40} unit="px" onChange={v=>set('goalBarHeight',v)}/>
              <Slider label="Widget Opacity" value={s.goalBarOpacity??100} min={0} max={100} unit="%" onChange={v=>set('goalBarOpacity',v)}/>

              {/* Background */}
              <Row label="Enable Background" tip="Semi-transparent card behind the goal bar"><Toggle on={(s as any).goalEnableBg??true} onChange={v=>set('goalEnableBg',v)}/></Row>
              {(s as any).goalEnableBg && (
                <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'start' }}>
                  <div><span style={lbl}>Background Color</span><input type="color" value={(s as any).goalBgColor??'#000000'} onChange={e=>set('goalBgColor',e.target.value)} style={colorBox}/></div>
                  <Slider label="Background Opacity" value={(s as any).goalBgOpacity??78} min={0} max={100} unit="%" onChange={v=>set('goalBgOpacity',v)}/>
                </div>
              )}

              {/* Toggles */}
              <Row label="Text Shadow" tip="Adds shadow to text for better readability on bright backgrounds"><Toggle on={(s as any).goalEnableTextShadow??true} onChange={v=>set('goalEnableTextShadow',v)}/></Row>
              <Row label="Goal Celebration" tip="Pulse animation + colour burst when goal is reached"><Toggle on={s.enableGoalCelebration} onChange={v=>set('enableGoalCelebration',v)}/></Row>

              {/* Reset progress */}
              <button onClick={async ()=>{
                try {
                  await api.put<any>('/api/streamer/goal', { ...goal, currentAmount: 0 })
                  setGoal((g:any)=>({...g, currentAmount: 0}))
                  toast.success('Goal reset to ₹0')
                } catch(e:any){ toast.error(e.message) }
              }} style={{ padding:'9px 16px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:600, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171', alignSelf:'start' }}>↺ Reset Progress to ₹0</button>
            </div>

            <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
              <p style={sH}><span>🎂</span> Birthday Messages</p>
              <Row label="Enable Birthday Messages" tip="Appends a birthday message when a viewer donates on their birthday"><Toggle on={s.enableBirthday} onChange={v=>set('enableBirthday',v)}/></Row>
              {s.enableBirthday && <>
                <div>
                  <span style={lbl}>Birthday Template</span>
                  <textarea value={s.birthdayTemplate} onChange={e=>set('birthdayTemplate',e.target.value)} rows={2} style={{ ...inp, resize:'vertical', fontFamily:'inherit' }}/>
                  <p style={{ fontSize:11, color:'#475569', marginTop:5 }}>Use <code style={{ color:'#a78bfa' }}>{'{name}'}</code> to insert the viewer&apos;s name.</p>
                </div>
                <div style={{ ...C, padding:'12px 14px', borderRadius:10 }}>
                  <p style={{ fontSize:11, color:'#64748b', margin:'0 0 6px', fontWeight:600 }}>PREVIEW</p>
                  <p style={{ fontSize:13, color:'#f1f5f9', margin:0 }}>{s.birthdayTemplate.replace('{name}', 'Arjun')}</p>
                </div>
              </>}
            </div>
          </>}

          {/* ── SAFETY ────────────────────────────────── */}
          {tab==='safety' && <>
            <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              <p style={sH}><span>🛡️</span> Profanity Filter</p>
              <Row label="Enable Filter" tip="Replaces blocked words in donation messages with ****"><Toggle on={s.enableProfanityFilter} onChange={v=>set('enableProfanityFilter',v)}/></Row>
              {s.enableProfanityFilter && <>
                <div>
                  <span style={lbl}>Custom Blocklist</span>
                  <textarea value={s.customBlocklist} onChange={e=>set('customBlocklist',e.target.value)} rows={4} placeholder="word1, word2, bad phrase" style={{ ...inp, resize:'vertical', fontFamily:'inherit' }}/>
                  <p style={{ fontSize:11, color:'#475569', marginTop:5 }}>Comma-separated. Each blocked word is replaced with first letter + asterisks (e.g. &ldquo;bad&rdquo; → &ldquo;b**&rdquo;) in the overlay. Original is saved in your dashboard.</p>
                </div>
                <InfoBox>
                  <strong style={{ color:'#a78bfa' }}>How it works:</strong> Filtered messages are still saved in full in your Messages tab — only what appears on the OBS overlay and TTS is censored.
                </InfoBox>
              </>}
            </div>
          </>}

          {/* ── LEADERBOARD ───────────────────────────── */}
          {tab==='leaderboard' && overlayToken && (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={()=>{ setLbColors({top:'#7c3aed',recent:'#10b981',streak:'#f59e0b'}); setLbTitles({top:'Top Donors',recent:'Recent Donors',streak:'Donation Train'}); setLbCounts({top:5,recent:6}); setLbResetMin(5); setLbBg({top:'#0a0a1a',recent:'#0a0a1a',streak:'#0a0a1a'}); setLbOpacity({top:85,recent:85,streak:88}); setLbTextColor({top:'#e2e8f0',recent:'#e2e8f0',streak:'#e2e8f0'}); setLbFontSize({top:13,recent:13,streak:13}); setLbFont({top:'Arial',recent:'Arial',streak:'Arial'}); setLbBold({top:true,recent:true,streak:true}); setLbRotSpeed({top:2.5,recent:2.5}); toast.success('Leaderboard settings reset') }} style={{ padding:'7px 14px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:600, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.18)', color:'#f87171', display:'flex', alignItems:'center', gap:6 }}>
                  ↺ Reset to Defaults
                </button>
              </div>
              {/* Sub-tab switcher */}
              <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.02)', borderRadius:10, padding:4, border:'1px solid rgba(255,255,255,0.05)' }}>
                {([['top','🥇','Top Donors','#fbbf24'],['recent','👥','Recent','#10b981'],['streak','⚡','Train','#a855f7']] as const).map(([k,e,n,c])=>(
                  <button key={k} onClick={()=>setLbTab(k)} style={{ flex:1, padding:'8px 4px', borderRadius:7, fontSize:12, fontWeight:700, cursor:'pointer', border:`1.5px solid ${lbTab===k?c+'60':'transparent'}`, background:lbTab===k?`${c}15`:'transparent', color:lbTab===k?c:'#64748b', transition:'all 0.15s' }}>
                    {e} {n}
                  </button>
                ))}
              </div>

              {/* Top Donors settings */}
              {lbTab==='top' && (
                <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                  <p style={sH}><span>🥇</span> Top Donors Overlay</p>
                  <p style={{ fontSize:12, color:'#475569', margin:'-8px 0 2px' }}>Shows your top N donors all-time. Updates live as donations arrive.</p>
                  <div style={{ height:1, background:'rgba(255,255,255,0.05)' }}/>
                  <p style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', margin:0 }}>Content</p>
                  <div><span style={lbl}>Title</span><input value={lbTitles.top} onChange={e=>setLbTitles(p=>({...p,top:e.target.value}))} style={inp}/></div>
                  <Slider label="Entries to show" value={lbCounts.top} min={3} max={10} onChange={v=>setLbCounts(p=>({...p,top:v}))}/>
                  <Slider label="Rotation speed" value={lbRotSpeed.top} min={1} max={10} step={0.5} unit="s" onChange={v=>setLbRotSpeed(p=>({...p,top:v}))}/>
                  <div style={{ height:1, background:'rgba(255,255,255,0.05)' }}/>
                  <p style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', margin:0 }}>🎨 Appearance</p>
                  <div><span style={lbl}>Accent Color</span><input type="color" value={lbColors.top} onChange={e=>setLbColors(p=>({...p,top:e.target.value}))} style={colorBox}/></div>
                  <div><span style={lbl}>Background Color</span><input type="color" value={lbBg.top} onChange={e=>setLbBg(p=>({...p,top:e.target.value}))} style={colorBox}/></div>
                  <Slider label="Background Opacity" value={lbOpacity.top} min={0} max={100} unit="%" onChange={v=>setLbOpacity(p=>({...p,top:v}))}/>
                  <div><span style={lbl}>Text Color</span><input type="color" value={lbTextColor.top} onChange={e=>setLbTextColor(p=>({...p,top:e.target.value}))} style={colorBox}/></div>
                  <Slider label="Font Size (px)" value={lbFontSize.top} min={10} max={20} unit="px" onChange={v=>setLbFontSize(p=>({...p,top:v}))}/>
                  <div><span style={lbl}>Font</span><Select value={lbFont.top} onChange={v=>setLbFont(p=>({...p,top:v}))} options={FONTS.map(f=>({value:f,label:f}))}/></div>
                  <Row label="Bold text"><Toggle on={lbBold.top} onChange={v=>setLbBold(p=>({...p,top:v}))}/></Row>
                </div>
              )}

              {/* Recent Donors settings */}
              {lbTab==='recent' && (
                <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                  <p style={sH}><span>👥</span> Recent Donors Overlay</p>
                  <p style={{ fontSize:12, color:'#475569', margin:'-8px 0 2px' }}>Shows the last N donors in real-time as they donate.</p>
                  <div style={{ height:1, background:'rgba(255,255,255,0.05)' }}/>
                  <p style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', margin:0 }}>Content</p>
                  <div><span style={lbl}>Title</span><input value={lbTitles.recent} onChange={e=>setLbTitles(p=>({...p,recent:e.target.value}))} style={inp}/></div>
                  <Slider label="Entries to show" value={lbCounts.recent} min={3} max={8} onChange={v=>setLbCounts(p=>({...p,recent:v}))}/>
                  <Slider label="Rotation speed" value={lbRotSpeed.recent} min={1} max={10} step={0.5} unit="s" onChange={v=>setLbRotSpeed(p=>({...p,recent:v}))}/>
                  <div style={{ height:1, background:'rgba(255,255,255,0.05)' }}/>
                  <p style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', margin:0 }}>🎨 Appearance</p>
                  <div><span style={lbl}>Accent Color</span><input type="color" value={lbColors.recent} onChange={e=>setLbColors(p=>({...p,recent:e.target.value}))} style={colorBox}/></div>
                  <div><span style={lbl}>Background Color</span><input type="color" value={lbBg.recent} onChange={e=>setLbBg(p=>({...p,recent:e.target.value}))} style={colorBox}/></div>
                  <Slider label="Background Opacity" value={lbOpacity.recent} min={0} max={100} unit="%" onChange={v=>setLbOpacity(p=>({...p,recent:v}))}/>
                  <div><span style={lbl}>Text Color</span><input type="color" value={lbTextColor.recent} onChange={e=>setLbTextColor(p=>({...p,recent:e.target.value}))} style={colorBox}/></div>
                  <Slider label="Font Size (px)" value={lbFontSize.recent} min={10} max={20} unit="px" onChange={v=>setLbFontSize(p=>({...p,recent:v}))}/>
                  <div><span style={lbl}>Font</span><Select value={lbFont.recent} onChange={v=>setLbFont(p=>({...p,recent:v}))} options={FONTS.map(f=>({value:f,label:f}))}/></div>
                  <Row label="Bold text"><Toggle on={lbBold.recent} onChange={v=>setLbBold(p=>({...p,recent:v}))}/></Row>
                </div>
              )}

              {/* Donation Train settings */}
              {lbTab==='streak' && (
                <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                  <p style={sH}><span>⚡</span> Donation Train Overlay</p>
                  <p style={{ fontSize:12, color:'#475569', margin:'-8px 0 2px' }}>Shows a live streak counter with total raised. Resets after inactivity.</p>
                  <div style={{ height:1, background:'rgba(255,255,255,0.05)' }}/>
                  <p style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', margin:0 }}>Content</p>
                  <div><span style={lbl}>Title</span><input value={lbTitles.streak} onChange={e=>setLbTitles(p=>({...p,streak:e.target.value}))} style={inp}/></div>
                  <div>
                    <span style={lbl}>Reset Timer</span>
                    <Select value={String(lbResetMin)} onChange={v=>setLbResetMin(Number(v))} options={[{value:'2',label:'2 minutes'},{value:'5',label:'5 minutes (default)'},{value:'10',label:'10 minutes'},{value:'15',label:'15 minutes'},{value:'30',label:'30 minutes'}]}/>
                    <p style={{ fontSize:11, color:'#475569', marginTop:5 }}>Train resets if no donations arrive within this time</p>
                  </div>
                  <div style={{ height:1, background:'rgba(255,255,255,0.05)' }}/>
                  <p style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'0.05em', textTransform:'uppercase', margin:0 }}>🎨 Appearance</p>
                  <div><span style={lbl}>Accent Color</span><input type="color" value={lbColors.streak} onChange={e=>setLbColors(p=>({...p,streak:e.target.value}))} style={colorBox}/></div>
                  <div><span style={lbl}>Background Color</span><input type="color" value={lbBg.streak} onChange={e=>setLbBg(p=>({...p,streak:e.target.value}))} style={colorBox}/></div>
                  <Slider label="Background Opacity" value={lbOpacity.streak} min={0} max={100} unit="%" onChange={v=>setLbOpacity(p=>({...p,streak:v}))}/>
                  <div><span style={lbl}>Text Color</span><input type="color" value={lbTextColor.streak} onChange={e=>setLbTextColor(p=>({...p,streak:e.target.value}))} style={colorBox}/></div>
                  <Slider label="Font Size (px)" value={lbFontSize.streak} min={10} max={20} unit="px" onChange={v=>setLbFontSize(p=>({...p,streak:v}))}/>
                  <div><span style={lbl}>Font</span><Select value={lbFont.streak} onChange={v=>setLbFont(p=>({...p,streak:v}))} options={FONTS.map(f=>({value:f,label:f}))}/></div>
                  <Row label="Bold text"><Toggle on={lbBold.streak} onChange={v=>setLbBold(p=>({...p,streak:v}))}/></Row>
                </div>
              )}

              {/* URL card for active sub-tab */}
              {(['top','recent','streak'] as const).map(key => {
                if (key !== lbTab) return null
                const url = buildLbUrl(key)
                const masked = url.replace(overlayToken, '•'.repeat(16))
                const accentColors: Record<string,string> = { top:'#fbbf24', recent:'#10b981', streak:'#a855f7' }
                const col = accentColors[key]!
                return (
                  <div key={key} style={{ ...C, padding:'14px 18px' }}>
                    <p style={{ fontSize:11, fontWeight:600, color:'#64748b', letterSpacing:'0.04em', textTransform:'uppercase', margin:'0 0 10px' }}>OBS Browser Source URL</p>
                    <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'9px 12px' }}>
                      <span style={{ flex:1, fontSize:11, color:'#64748b', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{masked}</span>
                      <button onClick={()=>{ navigator.clipboard.writeText(url); toast.success('Copied!') }} style={{ background:`${col}20`, border:`1px solid ${col}40`, borderRadius:7, cursor:'pointer', fontSize:12, color:col, padding:'5px 10px', fontWeight:700, flexShrink:0 }}>Copy</button>
                    </div>
                  </div>
                )
              })}

              <div style={{ ...C, padding:'12px 16px' }}>
                <p style={{ fontSize:11, color:'#f59e0b', margin:0, display:'flex', alignItems:'center', gap:5 }}>
                  <span>⚠️</span> Each overlay is a separate OBS Browser Source (300×400px, transparent). Re-copy URL after changing settings.
                </p>
              </div>
            </div>
          )}

          {/* OBS Link — alert overlay (appearance / tts / safety) */}
          {overlayUrl && (tab==='appearance'||tab==='tts'||tab==='safety') && (
            <div style={{ ...C, padding:'16px 20px' }}>
              <p style={sH}><span>📡</span> Alert Overlay — OBS Link</p>
              <p style={{ fontSize:12, color:'#475569', margin:'0 0 12px' }}>Add to OBS as a Browser Source (1920×1080, transparent). Never share on stream.</p>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'9px 12px' }}>
                <span style={{ flex:1, fontSize:12, color:'#64748b', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{showToken ? overlayUrl : maskedUrl}</span>
                <button onClick={()=>setShowToken(t=>!t)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#64748b', flexShrink:0 }}>{showToken?'🙈':'👁️'}</button>
                <button onClick={()=>{ navigator.clipboard.writeText(overlayUrl); toast.success('Copied!') }} style={{ background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:7, cursor:'pointer', fontSize:12, color:'#a78bfa', padding:'5px 10px', fontWeight:700 }}>Copy</button>
              </div>
              <p style={{ fontSize:11, color:'#f59e0b', margin:'8px 0 0', display:'flex', alignItems:'center', gap:5 }}><span>⚠️</span> Separate from goal overlay — add both if you want both.</p>
            </div>
          )}

          {/* OBS Link — goal overlay */}
          {goalOverlayUrl && tab==='goal' && (
            <div style={{ ...C, padding:'16px 20px' }}>
              <p style={sH}><span>🎯</span> Goal Overlay — OBS Link</p>
              <p style={{ fontSize:12, color:'#475569', margin:'0 0 12px' }}>Add this as a <strong style={{ color:'#f1f5f9' }}>second separate</strong> Browser Source in OBS, positioned wherever you want the goal bar.</p>
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'9px 12px' }}>
                <span style={{ flex:1, fontSize:12, color:'#64748b', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{showGoalToken ? goalOverlayUrl : maskedGoalUrl}</span>
                <button onClick={()=>setShowGoalToken(t=>!t)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#64748b', flexShrink:0 }}>{showGoalToken?'🙈':'👁️'}</button>
                <button onClick={()=>{ navigator.clipboard.writeText(goalOverlayUrl); toast.success('Copied!') }} style={{ background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:7, cursor:'pointer', fontSize:12, color:'#a78bfa', padding:'5px 10px', fontWeight:700 }}>Copy</button>
              </div>
              <p style={{ fontSize:11, color:'#f59e0b', margin:'8px 0 0', display:'flex', alignItems:'center', gap:5 }}><span>⚠️</span> Only use in OBS Browser Source — not visible to viewers.</p>
            </div>
          )}
        </div>

        {/* ── RIGHT (preview + buttons) ────────────────── */}
        <div style={{ width:264, flexShrink:0, position:'sticky', top:24, display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ ...C, padding:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#22c55e', boxShadow:'0 0 6px #22c55e' }}/>
              <p style={{ fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:'0.06em', margin:0 }}>
                {tab==='goal' ? 'GOAL PREVIEW' : tab==='leaderboard' ? 'LEADERBOARD PREVIEW' : 'ALERT PREVIEW'}
              </p>
            </div>

            {/* Alert preview — appearance / tts / safety */}
            {(tab==='appearance'||tab==='tts'||tab==='safety') && (
              <div style={{ background:'#000', borderRadius:10, minHeight:140, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
                {s.template === 'superchat' && (
                  <div style={{ borderRadius:12, overflow:'hidden', width:'100%', fontFamily:s.fontStyle, background:previewBg, border:s.enableBorder?`2px solid ${s.textColor}`:'none', boxShadow:s.enableShadow?`${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur}px ${s.shadowColor}${Math.round(s.shadowOpacity*2.55).toString(16).padStart(2,'0')}`:'none' }}>
                    <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10, background:`${s.textColor}18` }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#db2777)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'white', flexShrink:0 }}>A</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:s.textBold?'bold':'normal', color:s.textColor, margin:0 }}>Arjun</p>
                        <p style={{ fontSize:10, color:s.textColor, opacity:0.7, margin:0 }}>🎉 donated</p>
                      </div>
                      <div style={{ padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:700, color:previewBg, background:s.textColor }}>₹500</div>
                    </div>
                    <div style={{ padding:'10px 14px', background:`${s.textColor}0d` }}>
                      <p style={{ fontSize:11, color:s.textColor, margin:0, fontStyle:s.textItalic?'italic':'normal', textDecoration:s.textUnderline?'underline':'none' }}>&ldquo;You&apos;re the best streamer!&rdquo;</p>
                    </div>
                  </div>
                )}
                {s.template === 'colorful' && (
                  <div style={{ borderRadius:14, padding:'14px 16px', width:'100%', background:previewBg, border:s.enableBorder?`2px solid ${s.textColor}`:'none', fontFamily:s.fontStyle, boxShadow:s.enableShadow?`${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur}px ${s.shadowColor}${Math.round(s.shadowOpacity*2.55).toString(16).padStart(2,'0')}`:'none' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:s.textColor, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:previewBg||'#000', flexShrink:0 }}>A</div>
                      <div>
                        <p style={{ fontSize:12, fontWeight:s.textBold?'bold':'normal', color:s.textColor, margin:0 }}>Arjun donated ₹500</p>
                      </div>
                    </div>
                    <p style={{ fontSize:11, color:s.textColor, opacity:0.85, margin:0, fontStyle:s.textItalic?'italic':'normal', textDecoration:s.textUnderline?'underline':'none' }}>&ldquo;You&apos;re the best streamer!&rdquo;</p>
                  </div>
                )}
                {s.template === 'custom' && (
                  <div style={{
                    borderRadius:14, padding:'12px 16px', textAlign:'center', width:'100%',
                    background: previewBg,
                    color: s.textColor, fontSize: s.fontSize * 0.52,
                    fontFamily: s.fontStyle,
                    fontWeight: s.textBold?'bold':'normal',
                    fontStyle: s.textItalic?'italic':'normal',
                    textDecoration: s.textUnderline?'underline':'none',
                    border: s.enableBorder?`2px solid ${s.textColor}50`:'none',
                    boxShadow: s.enableShadow?`${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur}px ${s.shadowColor}${Math.round(s.shadowOpacity*2.55).toString(16).padStart(2,'0')}`:'none',
                  }}>
                    <p style={{ fontWeight:700, margin:0 }}>🎉 Arjun donated ₹500</p>
                    <p style={{ opacity:0.8, fontSize:'0.85em', margin:'4px 0 0' }}>&ldquo;You&apos;re the best streamer!&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {/* Goal bar preview — live, mirrors GoalOverlayClient layouts */}
            {tab==='goal' && (() => {
              const gPct = Math.min(((goal.currentAmount??0)/Math.max(goal.targetAmount,1))*100, 100)
              const gReached = gPct >= 100
              const gLayout  = (s as any).goalLayout ?? 'standard'
              const gColor   = s.goalBarColor ?? '#7c3aed'
              const gColor2  = (s as any).goalSecondColor ?? '#ec4899'
              const gText    = (s as any).goalTextColor ?? '#ffffff'
              const gBtText  = (s as any).goalBarTextColor ?? '#ffffff'
              const gFs      = ((s as any).goalFontSize ?? 16) * 0.72
              const gBh      = Math.max(((s as any).goalBarHeight ?? 18) * 0.72, 6)
              const gSh      = (s as any).goalEnableTextShadow ? '0 1px 4px rgba(0,0,0,0.9)' : 'none'
              const gFf      = ((s as any).goalFontFamily ?? 'Arial') === 'Arial' ? 'Arial,sans-serif' : `'${(s as any).goalFontFamily}',sans-serif`
              const gBg      = (s as any).goalEnableBg
              const gBgC     = (s as any).goalBgColor ?? '#000000'
              const gBgO     = (s as any).goalBgOpacity ?? 78
              function h2r(h: string, pct: number) {
                const rv=parseInt(h.slice(1,3),16),gv=parseInt(h.slice(3,5),16),bv=parseInt(h.slice(5,7),16)
                return `rgba(${rv},${gv},${bv},${pct/100})`
              }
              const gCardBg = gBg ? h2r(gBgC, gBgO) : 'transparent'
              const gCardSt: React.CSSProperties = gBg ? { background:gCardBg, backdropFilter:'blur(10px)', borderRadius:10, padding:'12px 14px', border:'1px solid rgba(255,255,255,0.08)' } : { padding:'4px 0' }
              const gTitleSt: React.CSSProperties = { color:gText, fontWeight:700, fontSize:gFs, textShadow:gSh, fontFamily:gFf }
              const gDimSt: React.CSSProperties   = { color:gText, opacity:0.55, fontSize:gFs*0.85, textShadow:gSh, fontFamily:gFf }
              function GBar() {
                return (
                  <div style={{ height:gBh, background:'rgba(255,255,255,0.1)', borderRadius:gBh, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${gPct}%`, background:`linear-gradient(90deg,${gColor},${gColor2})`, borderRadius:gBh, transition:'width 0.5s', boxShadow:`0 0 8px ${gColor}66` }}/>
                  </div>
                )
              }
              const fmt = (n: number) => '₹'+n.toLocaleString('en-IN')
              return (
                <div style={{ background:'#000', borderRadius:10, padding:14, opacity:(s.goalBarOpacity??100)/100 }}>
                  {gLayout==='standard' && (
                    <div style={gCardSt}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8, gap:8 }}>
                        <span style={gTitleSt}>{goal.title||'Donation Goal'}</span>
                        <span style={gDimSt}>{fmt(goal.currentAmount??0)}/{fmt(goal.targetAmount)}</span>
                      </div>
                      <GBar/>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                        <span style={{ fontSize:gFs*0.78, color:gReached?'#fbbf24':gText, opacity:gReached?1:0.45, fontWeight:gReached?700:400, textShadow:gSh, fontFamily:gFf }}>
                          {gReached?'🎊 Goal reached!':Math.round(gPct)+'% reached'}
                        </span>
                        {!gReached && <span style={{ fontSize:gFs*0.78, color:gText, opacity:0.3, fontFamily:gFf }}>{fmt(Math.max(0,goal.targetAmount-(goal.currentAmount??0)))} to go</span>}
                      </div>
                    </div>
                  )}
                  {gLayout==='minimal' && (
                    <div style={{ fontFamily:gFf }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                        <span style={{ ...gTitleSt, fontSize:gFs*0.9 }}>{goal.title||'Donation Goal'}</span>
                        <span style={gDimSt}>{fmt(goal.currentAmount??0)}/{fmt(goal.targetAmount)}</span>
                      </div>
                      <GBar/>
                      <div style={{ textAlign:'center', marginTop:4 }}>
                        <span style={{ fontSize:gFs*0.72, color:gColor, fontWeight:700, textShadow:gSh }}>{Math.round(gPct)}%</span>
                      </div>
                    </div>
                  )}
                  {gLayout==='bar-labels' && (
                    <div style={gCardSt}>
                      <div style={{ marginBottom:8 }}><span style={gTitleSt}>{goal.title||'Donation Goal'}</span></div>
                      <div style={{ position:'relative', height:Math.max(gBh,20) }}>
                        <div style={{ height:'100%', background:'rgba(255,255,255,0.1)', borderRadius:Math.max(gBh,20), overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${gPct}%`, background:`linear-gradient(90deg,${gColor},${gColor2})`, borderRadius:Math.max(gBh,20), transition:'width 0.5s', boxShadow:`0 0 8px ${gColor}66` }}/>
                        </div>
                        <span style={{ position:'absolute', left:8, top:'50%', transform:'translateY(-50%)', fontSize:gFs*0.72, color:gBtText, fontWeight:700, textShadow:gSh, fontFamily:gFf }}>{Math.round(gPct)}%</span>
                        {!gReached && <span style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', fontSize:gFs*0.65, color:gText, opacity:0.55, fontFamily:gFf }}>{fmt(Math.max(0,goal.targetAmount-(goal.currentAmount??0)))} to go</span>}
                      </div>
                    </div>
                  )}
                  {gLayout==='split' && (
                    <div style={gCardSt}>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:10, marginBottom:8, fontFamily:gFf }}>
                        <span style={{ ...gTitleSt, fontSize:gFs*1.1 }}>{goal.title||'Donation Goal'}</span>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ color:gColor, fontSize:gFs*1.2, fontWeight:800, textShadow:`0 0 8px ${gColor}99`, lineHeight:1 }}>{fmt(goal.currentAmount??0)}</div>
                          <div style={{ color:gText, opacity:0.4, fontSize:gFs*0.75, marginTop:1 }}>of {fmt(goal.targetAmount)}</div>
                        </div>
                      </div>
                      <GBar/>
                      {gReached && <div style={{ textAlign:'center', marginTop:6, color:'#fbbf24', fontWeight:700, fontSize:gFs*0.82, fontFamily:gFf }}>🎊 Goal reached!</div>}
                    </div>
                  )}
                  {gLayout==='compact' && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, background:gCardBg, backdropFilter:'blur(10px)', borderRadius:50, padding:`5px 12px 5px 10px`, border:'1px solid rgba(255,255,255,0.08)', fontFamily:gFf }}>
                      <span style={{ ...gTitleSt, fontSize:gFs*0.85, whiteSpace:'nowrap', flexShrink:0 }}>{goal.title||'Goal'}</span>
                      <div style={{ flex:1, minWidth:50 }}><GBar/></div>
                      <span style={{ color:gColor, fontWeight:800, fontSize:gFs*0.85, whiteSpace:'nowrap', textShadow:`0 0 6px ${gColor}88`, flexShrink:0 }}>{Math.round(gPct)}%</span>
                      <span style={{ color:gText, opacity:0.45, fontSize:gFs*0.72, whiteSpace:'nowrap', flexShrink:0 }}>{fmt(goal.currentAmount??0)}/{fmt(goal.targetAmount)}</span>
                    </div>
                  )}
                  {gLayout==='neon' && (
                    <div style={{ ...gCardSt, background:gBg?h2r(gBgC,Math.min(gBgO,90)):'transparent', border:`1.5px solid ${gColor}55`, boxShadow:`0 0 18px ${gColor}22,0 0 36px ${gColor}0f,inset 0 0 18px ${gColor}06` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10, fontFamily:gFf }}>
                        <span style={{ ...gTitleSt, color:gColor, textShadow:`0 0 8px ${gColor}cc,0 0 14px ${gColor}66` }}>{goal.title||'Donation Goal'}</span>
                        <span style={{ color:gText, opacity:0.7, fontSize:gFs*0.82 }}>{fmt(goal.currentAmount??0)} / {fmt(goal.targetAmount)}</span>
                      </div>
                      <div style={{ height:gBh, background:'rgba(255,255,255,0.05)', borderRadius:gBh, overflow:'hidden', border:`1px solid ${gColor}33` }}>
                        <div style={{ height:'100%', width:`${gPct}%`, background:`linear-gradient(90deg,${gColor},${gColor2})`, borderRadius:gBh, transition:'width 0.5s', boxShadow:`0 0 14px ${gColor},0 0 28px ${gColor}88` }}/>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, fontFamily:gFf }}>
                        <span style={{ fontSize:gFs*0.72, color:gColor, fontWeight:700, textShadow:`0 0 6px ${gColor}` }}>{gReached?'⚡ GOAL REACHED!':Math.round(gPct)+'% COMPLETE'}</span>
                        {!gReached && <span style={{ fontSize:gFs*0.68, color:gText, opacity:0.3 }}>{fmt(Math.max(0,goal.targetAmount-(goal.currentAmount??0)))} remaining</span>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Leaderboard live preview — updates with settings */}
            {tab==='leaderboard' && (
              <div style={{ background:'#0a0a1a', borderRadius:10, padding:14, border:`1px solid ${lbColors[lbTab]}25` }}>
                {lbTab==='top' && (
                  <>
                    <p style={{ fontSize:10, fontWeight:800, color:lbColors.top, letterSpacing:'0.07em', textTransform:'uppercase', margin:'0 0 10px' }}>
                      🏆 {lbTitles.top || 'Top Donors'}
                    </p>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {[
                        { n:'Arjun K.', a:'₹2,500', medal:'🥇' },
                        { n:'Priya M.', a:'₹1,200', medal:'🥈' },
                        { n:'Rohan S.', a:'₹800',   medal:'🥉' },
                      ].slice(0, Math.min(lbCounts.top, 3)).map((row, i) => (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 8px', borderRadius:8, background:i===0?`${lbColors.top}18`:'rgba(255,255,255,0.03)', border:`1px solid ${i===0?lbColors.top+'40':'rgba(255,255,255,0.06)'}` }}>
                          <span style={{ fontSize:13 }}>{row.medal}</span>
                          <span style={{ flex:1, fontSize:11, fontWeight:700, color:i===0?lbColors.top:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{row.n}</span>
                          <span style={{ fontSize:11, fontWeight:800, color:i===0?lbColors.top:'#a78bfa' }}>{row.a}</span>
                        </div>
                      ))}
                      {lbCounts.top > 3 && <p style={{ fontSize:9, color:'#334155', margin:'4px 0 0', textAlign:'center' }}>+{lbCounts.top-3} more entries on stream</p>}
                    </div>
                  </>
                )}
                {lbTab==='recent' && (
                  <>
                    <p style={{ fontSize:10, fontWeight:800, color:lbColors.recent, letterSpacing:'0.07em', textTransform:'uppercase', margin:'0 0 10px' }}>
                      👥 {lbTitles.recent || 'Recent Donors'}
                    </p>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      {[{n:'Arjun K.',a:'₹500'},{n:'Priya M.',a:'₹100'},{n:'Neha G.',a:'₹250'},{n:'Rohan S.',a:'₹50'}].slice(0, Math.min(lbCounts.recent,4)).map((row,i)=>(
                        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 8px', borderRadius:8, background:i===0?`${lbColors.recent}15`:'rgba(255,255,255,0.02)', border:`1px solid ${i===0?lbColors.recent+'40':'rgba(255,255,255,0.05)'}`, opacity:Math.max(1-i*0.12,0.5) }}>
                          <span style={{ fontSize:11, fontWeight:700, color:i===0?lbColors.recent:'#94a3b8' }}>{row.n}</span>
                          <span style={{ fontSize:11, fontWeight:800, color:i===0?lbColors.recent:'#64748b' }}>{row.a}</span>
                        </div>
                      ))}
                      {lbCounts.recent > 4 && <p style={{ fontSize:9, color:'#334155', margin:'4px 0 0', textAlign:'center' }}>+{lbCounts.recent-4} more on stream</p>}
                    </div>
                  </>
                )}
                {lbTab==='streak' && (
                  <div style={{ textAlign:'center', padding:'8px 0' }}>
                    <p style={{ fontSize:10, fontWeight:800, color:lbColors.streak, letterSpacing:'0.07em', textTransform:'uppercase', margin:'0 0 10px' }}>
                      ⚡ {lbTitles.streak || 'Donation Train'}
                    </p>
                    <div style={{ fontSize:38, fontWeight:900, color:lbColors.streak, lineHeight:1, textShadow:`0 0 20px ${lbColors.streak}80` }}>3x</div>
                    <div style={{ fontSize:10, color:'#94a3b8', marginTop:6 }}>consecutive donations</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#10b981', marginTop:8 }}>₹850 total</div>
                    <div style={{ fontSize:9, color:'#334155', marginTop:4 }}>Resets after {lbResetMin} min inactivity</div>
                  </div>
                )}
              </div>
            )}

            <p style={{ fontSize:10, color:'#374151', textAlign:'center', margin:'8px 0 0' }}>Updates as you edit</p>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(tab==='appearance'||tab==='tts'||tab==='safety') && (
              <button onClick={sendTest} disabled={testing} style={{ width:'100%', padding:11, borderRadius:10, fontSize:13, fontWeight:700, cursor:testing?'not-allowed':'pointer', background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'#a78bfa', opacity:testing?0.7:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                <span>🚀</span>{testing?'Sending…':'Send Test Alert'}
              </button>
            )}
            <button onClick={save} disabled={saving} style={{ width:'100%', padding:11, borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#ec4899)', border:'none', color:'white', boxShadow:'0 4px 18px rgba(124,58,237,0.3)', opacity:saving?0.7:1 }}>
              {saving?'Saving…':'💾 Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
