'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { getSocket } from '../../../lib/socket'
import toast from 'react-hot-toast'

type Tab = 'appearance' | 'tts' | 'goal' | 'safety' | 'leaderboard'

const TEMPLATES = [
  { id: 'superchat', emoji: '💬', label: 'eztips',    desc: 'Auto-colors by donation tier' },
  { id: 'colorful',  emoji: '🌈', label: 'Vibrant',   desc: 'Rich gradient backgrounds' },
  { id: 'custom',    emoji: '✦',  label: 'Minimal',   desc: 'Clean, fully your own' },
]
const FONTS = ['Arial','Verdana','Georgia','Courier New','Impact','Trebuchet MS','Poppins']
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
  const label = options.find(o=>o.value===value)?.label ?? value
  return (
    <div style={{ position:'relative' }}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{ ...inp, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', border:'1px solid rgba(255,255,255,0.08)', userSelect:'none' as any }}>
        <span>{label}</span>
        <span style={{ fontSize:10, color:'#64748b', marginLeft:8 }}>{open?'▲':'▼'}</span>
      </button>
      {open && (
        <>
          <div onClick={()=>setOpen(false)} style={{ position:'fixed', inset:0, zIndex:998 }} />
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:999, background:'#1a1a2e', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
            {options.map(o=>(
              <button key={o.value} type="button" onClick={()=>{ onChange(o.value); setOpen(false) }} style={{ display:'block', width:'100%', textAlign:'left', padding:'9px 13px', fontSize:13, background: o.value===value ? 'rgba(124,58,237,0.18)' : 'transparent', color: o.value===value ? '#a78bfa' : '#e2e8f0', border:'none', cursor:'pointer', borderBottom:'1px solid rgba(255,255,255,0.04)' }}
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
    enableShadow:false, shadowBlur:20, shadowColor:'#000000', shadowOpacity:30, shadowOffsetX:0, shadowOffsetY:8,
    enableGradientBg:false,
    ttsEnabled:true, ttsVolume:100, ttsVoice:'en-IN', ttsRate:1.0, ttsPitch:1.0,
    enableCoinSound:true, coinSoundVolume:50, ttsSoundDelay:1,
    minAlertAmount:0, minTtsAmount:0,
    goalBarColor:'#7c3aed', enableGoalCelebration:true,
    enableBirthday:false, birthdayTemplate:'Happy Birthday {name}! 🎂',
    enableProfanityFilter:true, customBlocklist:'',
  })
  const [goal, setGoal] = useState<any>({ title:'', targetAmount:1000, isActive:false, currentAmount:0 })
  const [manualAdd, setManualAdd] = useState('')
  const [overlayToken, setOverlayToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [showGoalToken, setShowGoalToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<any>('/api/streamer/alert-settings'),
      api.get<any>('/api/streamer/goal'),
      api.get<any>('/api/streamer/profile'),
    ]).then(([settings, g, profile]) => {
      if (settings && Object.keys(settings).length) {
        const { id: _id, streamerId: _sid, createdAt: _ca, updatedAt: _ua, ...clean } = settings
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

  const set = (k: string, v: any) => setS((p: any) => ({ ...p, [k]: v }))

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
      await api.patch('/api/streamer/alert-settings', s)
      const r = await api.post<any>('/api/streamer/test-alert')
      toast.success(`Test sent — ₹${r.amount} from ${r.name}`)
    } catch (e: any) { toast.error(e.message) } finally { setTesting(false) }
  }

  function previewVoice() {
    if (!('speechSynthesis' in window)) { toast.error('TTS not supported in this browser'); return }
    const u = new SpeechSynthesisUtterance('Sample Support donated ₹100. Keep it up!')
    u.lang = s.ttsVoice; u.volume = s.ttsVolume / 100; u.rate = s.ttsRate; u.pitch = s.ttsPitch
    speechSynthesis.cancel(); speechSynthesis.speak(u)
    toast.success('Playing voice preview…')
  }

  const SITE = typeof window !== 'undefined' ? window.location.origin : 'https://eztips.live'
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

  // Live preview render
  const TIERS = [{ min:1000, color:'#ffd700' },{ min:500, color:'#ff6b35' },{ min:100, color:'#8b5cf6' },{ min:0, color:'#06b6d4' }]
  const tier = TIERS.find(t => 100 >= t.min) ?? TIERS[TIERS.length-1]!
  const previewBg = s.enableGradientBg ? `linear-gradient(135deg,${s.bgColor},${tier.color}33)` : (s.bgOpacity===0 ? 'transparent' : s.bgColor)

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
                <Row label="Gradient Background" tip="Blends background with donation tier color"><Toggle on={s.enableGradientBg} onChange={v=>set('enableGradientBg',v)}/></Row>
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
              <Row label="Coin Sound" tip="A chime plays the moment a donation arrives"><Toggle on={s.enableCoinSound} onChange={v=>set('enableCoinSound',v)}/></Row>
              {s.enableCoinSound && <>
                <Slider label="Chime Volume" value={s.coinSoundVolume} min={0} max={100} unit="%" onChange={v=>set('coinSoundVolume',v)}/>
                <Slider label="Delay Before TTS" value={s.ttsSoundDelay} min={0} max={12} unit="s" onChange={v=>set('ttsSoundDelay',v)}/>
                <p style={{ fontSize:11, color:'#475569' }}>How long after the chime to start TTS (0–12s, default 1s)</p>
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

            <div style={{ ...C, padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
              <p style={sH}><span>✨</span> Goal Customization</p>
              <div><span style={lbl}>Progress Bar Color</span><input type="color" value={s.goalBarColor} onChange={e=>set('goalBarColor',e.target.value)} style={colorBox}/></div>
              <Row label="Goal Celebration" tip="Confetti burst and special alert when goal is reached"><Toggle on={s.enableGoalCelebration} onChange={v=>set('enableGoalCelebration',v)}/></Row>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={async ()=>{
                  try {
                    const updated = await api.put<any>('/api/streamer/goal', { ...goal, currentAmount: 0 })
                    setGoal((g:any)=>({...g, currentAmount: 0}))
                    toast.success('Goal reset to ₹0')
                  } catch(e:any){ toast.error(e.message) }
                }} style={{ padding:'9px 16px', borderRadius:9, cursor:'pointer', fontSize:12, fontWeight:600, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#f87171' }}>↺ Reset Goal</button>
              </div>
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
          {tab==='leaderboard' && (
            <div style={{ ...C, padding:'36px 24px', textAlign:'center' }}>
              <span style={{ fontSize:48 }}>🏆</span>
              <p style={{ fontSize:17, fontWeight:700, color:'#f1f5f9', margin:'14px 0 8px' }}>Leaderboard Overlays</p>
              <p style={{ fontSize:13, color:'#475569', maxWidth:340, margin:'0 auto 20px' }}>
                Top Supporter, Recent Donors, and Support Streak overlays are coming in the next update.
                These will be separate OBS Browser Sources you can position anywhere on your scene.
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, maxWidth:420, margin:'0 auto' }}>
                {[['🥇','Top Donor','#ffd700'],['👥','Recent Donors','#06b6d4'],['⚡','Streak','#a855f7']].map(([e,n,c])=>(
                  <div key={n} style={{ background:`${c}10`, border:`1px solid ${c}25`, borderRadius:12, padding:'16px 10px' }}>
                    <span style={{ fontSize:28 }}>{e}</span>
                    <p style={{ fontSize:12, fontWeight:600, color:'#94a3b8', margin:'8px 0 0' }}>{n}</p>
                    <span style={{ fontSize:10, color:c, fontWeight:700, marginTop:4, display:'block' }}>Coming Soon</span>
                  </div>
                ))}
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
              <div style={{ background:'#000', borderRadius:10, minHeight:140, display:'flex', alignItems:'center', justifyContent:'center', padding:16, overflow:'hidden' }}>
                {s.template === 'superchat' && (
                  <div style={{ borderRadius:12, overflow:'hidden', width:'100%', fontFamily:s.fontStyle, fontSize:s.fontSize*0.5 }}>
                    <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10, background:`${tier.color}33` }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#db2777)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'white', flexShrink:0 }}>A</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:700, color:'white', margin:0 }}>Arjun</p>
                        <p style={{ fontSize:10, color:'rgba(255,255,255,0.6)', margin:0 }}>🎉 donated</p>
                      </div>
                      <div style={{ padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:700, color:'white', background:tier.color }}>₹500</div>
                    </div>
                    <div style={{ padding:'10px 14px', background:'rgba(0,0,0,0.65)' }}>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,0.9)', margin:0 }}>&ldquo;You&apos;re the best streamer!&rdquo;</p>
                    </div>
                  </div>
                )}
                {s.template === 'colorful' && (
                  <div style={{ borderRadius:14, padding:'14px 16px', width:'100%', background:`linear-gradient(135deg,${tier.color}33,${tier.color}11)`, border:`1px solid ${tier.color}55`, fontFamily:s.fontStyle, fontSize:s.fontSize*0.5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:tier.color, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, color:'white', flexShrink:0 }}>A</div>
                      <div>
                        <p style={{ fontSize:12, fontWeight:700, color:'white', margin:0 }}>Arjun donated <span style={{ color:tier.color }}>₹500</span></p>
                      </div>
                    </div>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.8)', margin:0 }}>&ldquo;You&apos;re the best streamer!&rdquo;</p>
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
                    boxShadow: s.enableShadow?`${s.shadowOffsetX}px ${s.shadowOffsetY}px ${s.shadowBlur}px rgba(0,0,0,${s.shadowOpacity/100})`:'none',
                  }}>
                    <p style={{ fontWeight:700, margin:0 }}>🎉 Arjun donated ₹500</p>
                    <p style={{ opacity:0.8, fontSize:'0.85em', margin:'4px 0 0' }}>&ldquo;You&apos;re the best streamer!&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {/* Goal bar preview — updates live as goal settings change */}
            {tab==='goal' && (
              <div style={{ background:'#000', borderRadius:10, padding:18 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10, alignItems:'center' }}>
                  <span style={{ color:'white', fontWeight:700, fontSize:13 }}>{goal.title || 'Donation Goal'}</span>
                  <span style={{ color:'rgba(255,255,255,0.5)', fontSize:11 }}>₹{goal.currentAmount??0} / ₹{goal.targetAmount}</span>
                </div>
                <div style={{ height:14, background:'rgba(255,255,255,0.1)', borderRadius:8, overflow:'hidden' }}>
                  <div style={{
                    height:'100%',
                    width:`${Math.min(((goal.currentAmount??0)/Math.max(goal.targetAmount,1))*100,100)}%`,
                    background:`linear-gradient(90deg,${s.goalBarColor},#ec4899)`,
                    borderRadius:8,
                    transition:'width 0.5s ease',
                  }}/>
                </div>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10, margin:'8px 0 0', textAlign:'right' }}>
                  {Math.round(((goal.currentAmount??0)/Math.max(goal.targetAmount,1))*100)}% reached
                </p>
                {s.enableGoalCelebration && goal.currentAmount >= goal.targetAmount && goal.targetAmount > 0 && (
                  <p style={{ color:'#fbbf24', fontSize:11, textAlign:'center', margin:'8px 0 0', fontWeight:700 }}>🎊 Goal reached!</p>
                )}
              </div>
            )}

            {/* Leaderboard placeholder preview */}
            {tab==='leaderboard' && (
              <div style={{ background:'#000', borderRadius:10, padding:18 }}>
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:11, textAlign:'center', margin:0 }}>Leaderboard overlays</p>
                <p style={{ color:'rgba(255,255,255,0.15)', fontSize:10, textAlign:'center', margin:'4px 0 0' }}>coming soon</p>
                <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:14 }}>
                  {[['🥇','Arjun K.','₹2,500'],['🥈','Priya M.','₹1,200'],['🥉','Rohan S.','₹800']].map(([e,n,a],i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:8, opacity:0.4+i*0.1, filter:'blur(1px)' }}>
                      <span style={{ fontSize:14 }}>{e}</span>
                      <span style={{ flex:1, fontSize:11, color:'white' }}>{n}</span>
                      <span style={{ fontSize:11, color:'#a78bfa', fontWeight:700 }}>{a}</span>
                    </div>
                  ))}
                </div>
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
