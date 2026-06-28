'use client'
import { useEffect, useRef, useState } from 'react'
import { getSocket } from '../../../../lib/socket'

interface GoalState { title: string; currentAmount: number; targetAmount: number }
interface GS {
  barColor: string; secondColor: string; barOpacity: number; layout: string
  fontSize: number; fontFamily: string; textColor: string; barTextColor: string
  enableTextShadow: boolean; enableBg: boolean; bgColor: string; bgOpacity: number
  barHeight: number; enableCelebration: boolean
}

const DEF: GS = {
  barColor:'#7c3aed', secondColor:'#ec4899', barOpacity:100, layout:'standard',
  fontSize:16, fontFamily:'Arial', textColor:'#ffffff', barTextColor:'#ffffff',
  enableTextShadow:true, enableBg:true, bgColor:'#000000', bgOpacity:78,
  barHeight:18, enableCelebration:true,
}

function mapS(d: any): GS {
  return {
    barColor:          d.goalBarColor           ?? DEF.barColor,
    secondColor:       d.goalSecondColor        ?? DEF.secondColor,
    barOpacity:        d.goalBarOpacity         ?? DEF.barOpacity,
    layout:            d.goalLayout             ?? DEF.layout,
    fontSize:          d.goalFontSize           ?? DEF.fontSize,
    fontFamily:        d.goalFontFamily         ?? DEF.fontFamily,
    textColor:         d.goalTextColor          ?? DEF.textColor,
    barTextColor:      d.goalBarTextColor       ?? DEF.barTextColor,
    enableTextShadow:  d.goalEnableTextShadow   ?? DEF.enableTextShadow,
    enableBg:          d.goalEnableBg           ?? DEF.enableBg,
    bgColor:           d.goalBgColor            ?? DEF.bgColor,
    bgOpacity:         d.goalBgOpacity          ?? DEF.bgOpacity,
    barHeight:         d.goalBarHeight          ?? DEF.barHeight,
    enableCelebration: d.enableGoalCelebration  ?? DEF.enableCelebration,
  }
}

function hex2rgba(hex: string, pct: number) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
  return `rgba(${r},${g},${b},${pct/100})`
}

const GFONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;700&family=Oswald:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Orbitron:wght@400;700&family=Press+Start+2P&display=swap'

function Bar({ pct, s }: { pct: number; s: GS }) {
  return (
    <div style={{ height:s.barHeight, background:'rgba(255,255,255,0.1)', borderRadius:s.barHeight, overflow:'hidden', position:'relative' }}>
      <div style={{
        height:'100%', width:`${pct}%`,
        background:`linear-gradient(90deg,${s.barColor},${s.secondColor})`,
        borderRadius:s.barHeight, transition:'width 0.9s cubic-bezier(0.4,0,0.2,1)',
        boxShadow:`0 0 14px ${s.barColor}66`, position:'relative',
      }}>
        {pct > 5 && pct < 100 && (
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.22) 50%,transparent 100%)', backgroundSize:'200% 100%', animation:'shimmer 2s linear infinite' }}/>
        )}
      </div>
    </div>
  )
}

function fmt(n: number) { return '₹'+n.toLocaleString('en-IN') }

export default function GoalOverlayClient({ token }: { token: string }) {
  const [goal, setGoal]       = useState<GoalState | null>(null)
  const [s, setS]             = useState<GS>(DEF)
  const [ready, setReady]     = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const prevPct = useRef(0)

  useEffect(() => {
    fetch(`/backend/api/overlay/validate/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.settings) setS(mapS(d.settings))
        if (d.activeGoal) setGoal({ title: d.activeGoal.title, currentAmount: d.activeGoal.currentAmount ?? 0, targetAmount: d.activeGoal.targetAmount })
        setReady(true)
      }).catch(() => setReady(true))

    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => socket.emit('join-overlay', { token }))
    socket.on('overlay-joined', ({ settings: st }: any) => { if (st) setS(mapS(st)) })
    socket.on('settings-updated', (st: any) => { if (st) setS(mapS(st)) })
    socket.on('goal-updated', (data: any) => {
      setGoal(g => ({ title: data.title ?? g?.title ?? '', currentAmount: data.currentAmount ?? 0, targetAmount: data.targetAmount ?? g?.targetAmount ?? 0 }))
    })
    return () => { socket.disconnect() }
  }, [token])

  useEffect(() => {
    if (!goal) return
    const pct = (goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100
    if (pct >= 100 && prevPct.current < 100 && s.enableCelebration) {
      setCelebrating(true); setTimeout(() => setCelebrating(false), 700)
    }
    prevPct.current = pct
  }, [goal, s.enableCelebration])

  const pct = goal ? Math.min((goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100, 100) : 0
  const remaining = goal ? Math.max(0, goal.targetAmount - goal.currentAmount) : 0
  const reached = pct >= 100

  const ff = s.fontFamily === 'Arial' ? 'Arial,sans-serif' : `'${s.fontFamily}',sans-serif`
  const sh = s.enableTextShadow ? '0 1px 5px rgba(0,0,0,0.85)' : 'none'
  const cardBg = s.enableBg ? hex2rgba(s.bgColor, s.bgOpacity) : 'transparent'
  const cardStyle: React.CSSProperties = {
    background: cardBg,
    backdropFilter: s.enableBg ? 'blur(14px)' : 'none',
    WebkitBackdropFilter: s.enableBg ? 'blur(14px)' : 'none',
    borderRadius: 14,
    padding: s.enableBg ? '16px 20px' : '0',
    border: s.enableBg ? '1px solid rgba(255,255,255,0.08)' : 'none',
    boxShadow: s.enableBg ? '0 8px 32px rgba(0,0,0,0.45)' : 'none',
  }
  const titleSt: React.CSSProperties = { color: s.textColor, fontWeight:700, fontSize: s.fontSize, textShadow: sh, letterSpacing:'-0.3px' }
  const dimSt: React.CSSProperties   = { color: s.textColor, opacity: 0.55, fontSize: s.fontSize * 0.85, textShadow: sh }

  function renderLayout() {
    if (!goal) return null
    switch (s.layout) {

      // ──────────────── 1. STANDARD ─────────────────────────────────────────────
      case 'standard': default: return (
        <div style={cardStyle}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:10, fontFamily:ff }}>
            <span style={titleSt}>{goal.title || 'Donation Goal'}</span>
            <span style={dimSt}>{fmt(goal.currentAmount)} / {fmt(goal.targetAmount)}</span>
          </div>
          <Bar pct={pct} s={s} />
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontFamily:ff }}>
            <span style={{ fontSize:s.fontSize*0.78, color: reached ? '#fbbf24' : s.textColor, opacity: reached ? 1 : 0.45, fontWeight: reached ? 700 : 400, textShadow:sh }}>
              {reached ? '🎊 Goal reached!' : `${Math.round(pct)}% reached`}
            </span>
            {!reached && <span style={{ fontSize:s.fontSize*0.78, color:s.textColor, opacity:0.3, textShadow:sh }}>{fmt(remaining)} to go</span>}
          </div>
        </div>
      )

      // ──────────────── 2. MINIMAL ──────────────────────────────────────────────
      case 'minimal': return (
        <div style={{ fontFamily:ff }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <span style={{ ...titleSt, fontSize:s.fontSize*0.9 }}>{goal.title || 'Donation Goal'}</span>
            <span style={{ ...dimSt }}>{fmt(goal.currentAmount)} / {fmt(goal.targetAmount)}</span>
          </div>
          <Bar pct={pct} s={s} />
          <div style={{ textAlign:'center', marginTop:5 }}>
            <span style={{ fontSize:s.fontSize*0.72, color:s.barColor, fontWeight:700, textShadow:sh }}>{Math.round(pct)}%</span>
          </div>
        </div>
      )

      // ──────────────── 3. BAR LABELS (text inside bar) ─────────────────────────
      case 'bar-labels': return (
        <div style={cardStyle}>
          <div style={{ marginBottom:10, fontFamily:ff }}>
            <span style={titleSt}>{goal.title || 'Donation Goal'}</span>
          </div>
          <div style={{ position:'relative', height:Math.max(s.barHeight, 26) }}>
            <div style={{ height:'100%', background:'rgba(255,255,255,0.1)', borderRadius:Math.max(s.barHeight,26), overflow:'hidden', position:'relative' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${s.barColor},${s.secondColor})`, borderRadius:Math.max(s.barHeight,26), transition:'width 0.9s cubic-bezier(0.4,0,0.2,1)', boxShadow:`0 0 14px ${s.barColor}66` }}/>
            </div>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:s.fontSize*0.78, color:s.barTextColor, fontWeight:700, textShadow:sh, fontFamily:ff, pointerEvents:'none' }}>
              {Math.round(pct)}%
            </span>
            {!reached && remaining > 0 && (
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:s.fontSize*0.72, color:s.textColor, opacity:0.6, textShadow:sh, fontFamily:ff, pointerEvents:'none' }}>
                {fmt(remaining)} to go
              </span>
            )}
            {reached && (
              <span style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', fontSize:s.fontSize*0.78, color:'#fbbf24', fontWeight:700, textShadow:sh, fontFamily:ff }}>
                🎊 Done!
              </span>
            )}
          </div>
        </div>
      )

      // ──────────────── 4. SPLIT LAYOUT ─────────────────────────────────────────
      case 'split': return (
        <div style={cardStyle}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', alignItems:'center', gap:16, marginBottom:12, fontFamily:ff }}>
            <span style={{ ...titleSt, fontSize:s.fontSize*1.15 }}>{goal.title || 'Donation Goal'}</span>
            <div style={{ textAlign:'right' }}>
              <div style={{ color:s.barColor, fontSize:s.fontSize*1.3, fontWeight:800, textShadow:`0 0 12px ${s.barColor}99`, lineHeight:1.1 }}>{fmt(goal.currentAmount)}</div>
              <div style={{ color:s.textColor, opacity:0.45, fontSize:s.fontSize*0.8, marginTop:2, textShadow:sh }}>of {fmt(goal.targetAmount)}</div>
            </div>
          </div>
          <Bar pct={pct} s={s} />
          {reached && <div style={{ textAlign:'center', marginTop:8, fontFamily:ff, color:'#fbbf24', fontWeight:700, fontSize:s.fontSize*0.85, textShadow:sh }}>🎊 Goal reached!</div>}
        </div>
      )

      // ──────────────── 5. COMPACT PILL ─────────────────────────────────────────
      case 'compact': return (
        <div style={{ display:'flex', alignItems:'center', gap:10, background:cardBg, backdropFilter:'blur(14px)', borderRadius:50, padding:`6px 16px 6px 14px`, border:'1px solid rgba(255,255,255,0.08)', fontFamily:ff }}>
          <span style={{ ...titleSt, fontSize:s.fontSize*0.88, whiteSpace:'nowrap', flexShrink:0 }}>{goal.title || 'Donation Goal'}</span>
          <div style={{ flex:1, minWidth:80 }}><Bar pct={pct} s={s} /></div>
          <span style={{ color:s.barColor, fontWeight:800, fontSize:s.fontSize*0.9, whiteSpace:'nowrap', textShadow:`0 0 8px ${s.barColor}88`, flexShrink:0 }}>{Math.round(pct)}%</span>
          <span style={{ color:s.textColor, opacity:0.5, fontSize:s.fontSize*0.78, whiteSpace:'nowrap', flexShrink:0 }}>{fmt(goal.currentAmount)}/{fmt(goal.targetAmount)}</span>
        </div>
      )

      // ──────────────── 6. NEON GLOW (unique) ────────────────────────────────────
      case 'neon': return (
        <div style={{
          ...cardStyle,
          background: s.enableBg ? hex2rgba(s.bgColor, Math.min(s.bgOpacity, 90)) : 'transparent',
          border: `1.5px solid ${s.barColor}55`,
          boxShadow: `0 0 30px ${s.barColor}33, 0 0 60px ${s.barColor}18, inset 0 0 30px ${s.barColor}08`,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, fontFamily:ff }}>
            <span style={{ ...titleSt, color:s.barColor, textShadow:`0 0 10px ${s.barColor}cc, 0 0 20px ${s.barColor}66` }}>{goal.title || 'Donation Goal'}</span>
            <span style={{ color:s.textColor, opacity:0.7, fontSize:s.fontSize*0.85, textShadow:sh }}>
              {fmt(goal.currentAmount)} <span style={{ opacity:0.4 }}>/</span> {fmt(goal.targetAmount)}
            </span>
          </div>
          <div style={{ height:s.barHeight, background:'rgba(255,255,255,0.06)', borderRadius:s.barHeight, overflow:'hidden', border:`1px solid ${s.barColor}33` }}>
            <div style={{ height:'100%', width:`${pct}%`, background:`linear-gradient(90deg,${s.barColor},${s.secondColor})`, borderRadius:s.barHeight, transition:'width 0.9s cubic-bezier(0.4,0,0.2,1)', boxShadow:`0 0 20px ${s.barColor}, 0 0 40px ${s.barColor}88` }}/>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontFamily:ff }}>
            <span style={{ fontSize:s.fontSize*0.78, color:s.barColor, fontWeight:700, textShadow:`0 0 8px ${s.barColor}` }}>
              {reached ? '⚡ GOAL REACHED!' : `${Math.round(pct)}% COMPLETE`}
            </span>
            {!reached && <span style={{ fontSize:s.fontSize*0.72, color:s.textColor, opacity:0.35 }}>{fmt(remaining)} remaining</span>}
          </div>
        </div>
      )
    }
  }

  return (
    <>
      <style>{`
        @import url('${GFONTS}');
        html,body{background:transparent!important;margin:0;padding:0;overflow:hidden}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes popIn{0%{transform:scale(0.92) translateX(-50%);opacity:0}100%{transform:scale(1) translateX(-50%);opacity:1}}
        @keyframes celebrate{0%,100%{transform:scale(1) translateX(-50%)}40%{transform:scale(1.05) translateX(-50%)}}
      `}</style>
      <div style={{ position:'fixed', inset:0, background:'transparent', overflow:'hidden' }}>
        <div style={{
          position:'absolute', bottom:'15%', left:'50%',
          width:'min(700px,90vw)',
          opacity: s.barOpacity / 100,
          animation: celebrating ? 'celebrate 0.7s ease' : ready ? 'popIn 0.35s ease forwards' : undefined,
          transform: celebrating ? undefined : 'translateX(-50%)',
        }}>
          {ready && !goal && (
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14, margin:0, textAlign:'center', fontFamily:'Arial,sans-serif' }}>
              No active goal — create one in the dashboard
            </p>
          )}
          {ready && goal && renderLayout()}
        </div>
      </div>
    </>
  )
}
