'use client'
import { useEffect, useRef, useState } from 'react'
import { getSocket } from '../../../../lib/socket'

interface GoalState {
  title: string
  currentAmount: number
  targetAmount: number
}

const STYLES = `
  html, body {
    background: transparent !important;
    background-color: transparent !important;
    margin: 0; padding: 0; overflow: hidden;
  }
  @keyframes shimmer {
    0%   { background-position: -200% 0 }
    100% { background-position:  200% 0 }
  }
  @keyframes popIn {
    0%   { transform: scale(0.92) translateX(-50%); opacity: 0 }
    100% { transform: scale(1)    translateX(-50%); opacity: 1 }
  }
  @keyframes celebrate {
    0%,100% { transform: scale(1)    translateX(-50%) }
    40%     { transform: scale(1.04) translateX(-50%) }
  }
`

export default function GoalOverlayClient({ token }: { token: string }) {
  const [goal, setGoal]           = useState<GoalState | null>(null)
  const [barColor, setBarColor]   = useState('#7c3aed')
  const [opacity, setOpacity]     = useState(100)
  const [ready, setReady]         = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const prevPct = useRef(0)

  useEffect(() => {
    fetch(`/backend/api/overlay/validate/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.settings?.goalBarColor) setBarColor(d.settings.goalBarColor)
        if (d.settings?.goalBarOpacity != null) setOpacity(d.settings.goalBarOpacity)
        if (d.activeGoal) {
          setGoal({
            title:         d.activeGoal.title,
            currentAmount: d.activeGoal.currentAmount ?? 0,
            targetAmount:  d.activeGoal.targetAmount,
          })
        }
        setReady(true)
      })
      .catch(() => setReady(true))

    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => socket.emit('join-overlay', { token }))
    socket.on('overlay-joined', ({ settings }: any) => {
      if (settings?.goalBarColor) setBarColor(settings.goalBarColor)
      if (settings?.goalBarOpacity != null) setOpacity(settings.goalBarOpacity)
    })
    socket.on('settings-updated', (s: any) => {
      if (s?.goalBarColor) setBarColor(s.goalBarColor)
      if (s?.goalBarOpacity != null) setOpacity(s.goalBarOpacity)
    })
    socket.on('goal-updated', (data: any) => {
      setGoal(g => ({
        title:         data.title         ?? g?.title         ?? '',
        currentAmount: data.currentAmount ?? 0,
        targetAmount:  data.targetAmount  ?? g?.targetAmount  ?? 0,
      }))
    })
    return () => { socket.disconnect() }
  }, [token])

  useEffect(() => {
    if (!goal) return
    const pct = (goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100
    if (pct >= 100 && prevPct.current < 100) {
      setCelebrating(true)
      setTimeout(() => setCelebrating(false), 700)
    }
    prevPct.current = pct
  }, [goal])

  const pct = goal
    ? Math.min((goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100, 100)
    : 0

  return (
    <>
      <style>{STYLES}</style>

      {/* Full 800×800 transparent canvas — same pattern as OverlayClient */}
      <div style={{ position: 'fixed', inset: 0, background: 'transparent', overflow: 'hidden' }}>

        {/* Goal bar: horizontally centered, bottom 15% of the canvas */}
        <div style={{
          position:  'absolute',
          bottom:    '15%',
          left:      '50%',
          width:     'min(680px, 88vw)',
          opacity:   opacity / 100,
          animation: celebrating
            ? 'celebrate 0.7s ease'
            : ready ? 'popIn 0.35s ease forwards' : undefined,
          // popIn uses translateX so we start at left:50% and the animation handles centering
          transform: celebrating ? undefined : 'translateX(-50%)',
        }}>
          <div style={{
            background:       'rgba(0,0,0,0.78)',
            backdropFilter:   'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius:     16,
            padding:          '18px 24px',
            border:           '1px solid rgba(255,255,255,0.1)',
            boxShadow:        '0 12px 40px rgba(0,0,0,0.55)',
          }}>
            {!ready ? (
              /* Skeleton */
              <>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ height:16, width:'45%', background:'rgba(255,255,255,0.08)', borderRadius:6 }}/>
                  <div style={{ height:16, width:'22%', background:'rgba(255,255,255,0.05)', borderRadius:6 }}/>
                </div>
                <div style={{ height:16, background:'rgba(255,255,255,0.07)', borderRadius:8 }}/>
              </>
            ) : !goal ? (
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14, margin:0, textAlign:'center', fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
                No goal set — create one in the dashboard
              </p>
            ) : (
              <>
                {/* Header row */}
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12, fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
                  <span style={{ color:'white', fontWeight:700, fontSize:18, letterSpacing:'-0.4px' }}>
                    {goal.title || 'Donation Goal'}
                  </span>
                  <span style={{ color:'rgba(255,255,255,0.55)', fontSize:15, fontWeight:600 }}>
                    ₹{goal.currentAmount.toLocaleString('en-IN')} / ₹{goal.targetAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Track */}
                <div style={{ height:18, background:'rgba(255,255,255,0.1)', borderRadius:10, overflow:'hidden', position:'relative' }}>
                  <div style={{
                    height:     '100%',
                    width:      `${pct}%`,
                    background: `linear-gradient(90deg, ${barColor}, #ec4899)`,
                    borderRadius: 10,
                    transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                    boxShadow:  `0 0 16px ${barColor}66`,
                    position:   'relative',
                  }}>
                    {pct > 2 && pct < 100 && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.22) 50%, transparent 100%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 2s linear infinite',
                      }}/>
                    )}
                  </div>
                </div>

                {/* Footer row */}
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif' }}>
                  <span style={{ fontSize:13, color: pct >= 100 ? '#fbbf24' : 'rgba(255,255,255,0.4)', fontWeight: pct >= 100 ? 700 : 400 }}>
                    {pct >= 100 ? '🎊 Goal reached!' : `${Math.round(pct)}% reached`}
                  </span>
                  {pct < 100 && (
                    <span style={{ fontSize:13, color:'rgba(255,255,255,0.25)' }}>
                      ₹{Math.max(0, goal.targetAmount - goal.currentAmount).toLocaleString('en-IN')} to go
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
