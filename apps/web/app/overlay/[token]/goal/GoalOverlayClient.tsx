'use client'
import { useEffect, useRef, useState } from 'react'
import { getSocket } from '../../../../lib/socket'

interface GoalState {
  title: string
  currentAmount: number
  targetAmount: number
  isActive: boolean
}

export default function GoalOverlayClient({ token }: { token: string }) {
  const [goal, setGoal] = useState<GoalState | null>(null)
  const [barColor, setBarColor] = useState('#7c3aed')
  const [celebrated, setCelebrated] = useState(false)
  const prevPct = useRef(0)

  useEffect(() => {
    document.documentElement.style.background = 'transparent'
    document.body.style.background = 'transparent'

    // Fetch initial state from validate endpoint
    fetch(`/backend/api/overlay/validate/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.activeGoal) setGoal({ ...d.activeGoal, isActive: d.activeGoal.isActive ?? true })
        if (d.settings?.goalBarColor) setBarColor(d.settings.goalBarColor)
      })
      .catch(() => {})

    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => socket.emit('join-overlay', { token }))
    socket.on('overlay-joined', ({ settings }: any) => {
      if (settings?.goalBarColor) setBarColor(settings.goalBarColor)
    })
    socket.on('settings-updated', (s: any) => {
      if (s?.goalBarColor) setBarColor(s.goalBarColor)
    })
    socket.on('goal-updated', (data: any) => {
      setGoal(g => ({ ...g, ...data }))
    })
    return () => { socket.disconnect() }
  }, [token])

  if (!goal?.isActive) {
    return <style>{`html,body{background:transparent!important;margin:0;padding:0}`}</style>
  }

  const pct = Math.min(((goal.currentAmount ?? 0) / Math.max(goal.targetAmount, 1)) * 100, 100)

  // Detect goal completion
  if (pct >= 100 && prevPct.current < 100) setCelebrated(true)
  prevPct.current = pct

  return (
    <>
      <style>{`
        html,body{background:transparent!important;margin:0;padding:0}
        @keyframes goalPulse{0%,100%{transform:scaleX(1)}50%{transform:scaleX(1.01)}}
        @keyframes goalCelebrate{0%{transform:scale(1)}50%{transform:scale(1.05)}100%{transform:scale(1)}}
      `}</style>
      <div style={{ padding: '0 0 12px 0', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif', userSelect: 'none' }}>
        <div style={{
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(12px)',
          borderRadius: 14,
          padding: '14px 18px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: celebrated ? 'goalCelebrate 0.5s ease' : undefined,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>
              {goal.title || 'Donation Goal'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600 }}>
              ₹{(goal.currentAmount ?? 0).toLocaleString('en-IN')} / ₹{goal.targetAmount.toLocaleString('en-IN')}
            </span>
          </div>

          {/* Track */}
          <div style={{ height: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${barColor}, #ec4899)`,
              borderRadius: 8,
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: `0 0 12px ${barColor}66`,
            }}/>
            {/* Shimmer */}
            {pct > 0 && pct < 100 && (
              <div style={{
                position: 'absolute', top: 0, left: 0, height: '100%', width: '100%',
                background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.8s infinite',
              }}/>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              {pct >= 100 ? '🎊 Goal reached!' : `${Math.round(pct)}% reached`}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
              ₹{Math.max(0, goal.targetAmount - (goal.currentAmount ?? 0)).toLocaleString('en-IN')} to go
            </span>
          </div>
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}`}</style>
    </>
  )
}
