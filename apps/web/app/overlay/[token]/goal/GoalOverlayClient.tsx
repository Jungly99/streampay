'use client'
import { useEffect, useRef, useState } from 'react'
import { getSocket } from '../../../../lib/socket'

interface GoalState {
  title: string
  currentAmount: number
  targetAmount: number
}

const STYLES = `
  html, body { background: transparent !important; background-color: transparent !important; margin: 0; padding: 0; }
  @keyframes shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
  @keyframes popIn { 0% { transform: scale(0.95); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
  @keyframes celebrate { 0%,100% { transform: scale(1) } 40% { transform: scale(1.04) } }
`

export default function GoalOverlayClient({ token }: { token: string }) {
  const [goal, setGoal] = useState<GoalState | null>(null)
  const [barColor, setBarColor] = useState('#7c3aed')
  const [ready, setReady] = useState(false)
  const prevPct = useRef(0)
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    // Fetch initial state
    fetch(`/backend/api/overlay/validate/${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.settings?.goalBarColor) setBarColor(d.settings.goalBarColor)
        if (d.activeGoal) {
          setGoal({
            title: d.activeGoal.title,
            currentAmount: d.activeGoal.currentAmount ?? 0,
            targetAmount: d.activeGoal.targetAmount,
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
    })
    socket.on('settings-updated', (s: any) => {
      if (s?.goalBarColor) setBarColor(s.goalBarColor)
    })
    socket.on('goal-updated', (data: any) => {
      setGoal(g => ({
        title: data.title ?? g?.title ?? '',
        currentAmount: data.currentAmount ?? 0,
        targetAmount: data.targetAmount ?? g?.targetAmount ?? 0,
      }))
    })
    return () => { socket.disconnect() }
  }, [token])

  // Detect when goal is newly reached
  useEffect(() => {
    if (!goal) return
    const pct = (goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100
    if (pct >= 100 && prevPct.current < 100) {
      setCelebrating(true)
      setTimeout(() => setCelebrating(false), 600)
    }
    prevPct.current = pct
  }, [goal])

  const pct = goal ? Math.min((goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100, 100) : 0

  return (
    <>
      <style>{STYLES}</style>

      {/* Always render a card so OBS shows the source is working */}
      <div style={{ padding: '8px 12px', minWidth: 320, maxWidth: 520, animation: 'popIn 0.3s ease' }}>
        <div style={{
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderRadius: 14,
          padding: '14px 18px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: celebrating ? 'celebrate 0.6s ease' : undefined,
        }}>
          {!ready ? (
            /* Skeleton while loading */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ height: 14, width: '50%', background: 'rgba(255,255,255,0.1)', borderRadius: 6 }}/>
                <div style={{ height: 14, width: '25%', background: 'rgba(255,255,255,0.06)', borderRadius: 6 }}/>
              </div>
              <div style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 8 }}/>
            </>
          ) : !goal ? (
            /* No goal set */
            <div style={{ textAlign: 'center', padding: '4px 0' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>No goal set — add one in the dashboard</p>
            </div>
          ) : (
            /* Goal bar */
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ color: 'white', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px', fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}>
                  {goal.title || 'Donation Goal'}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}>
                  ₹{goal.currentAmount.toLocaleString('en-IN')} / ₹{goal.targetAmount.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Progress track */}
              <div style={{ height: 14, background: 'rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${barColor}, #ec4899)`,
                  borderRadius: 8,
                  transition: 'width 0.9s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: `0 0 14px ${barColor}55`,
                  position: 'relative',
                }}>
                  {/* Shimmer overlay */}
                  {pct > 0 && pct < 100 && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s linear infinite',
                    }}/>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, fontFamily: '-apple-system,BlinkMacSystemFont,sans-serif' }}>
                <span style={{ fontSize: 11, color: pct >= 100 ? '#fbbf24' : 'rgba(255,255,255,0.35)', fontWeight: pct >= 100 ? 700 : 400 }}>
                  {pct >= 100 ? '🎊 Goal reached!' : `${Math.round(pct)}% reached`}
                </span>
                {pct < 100 && (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                    ₹{Math.max(0, goal.targetAmount - goal.currentAmount).toLocaleString('en-IN')} to go
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
