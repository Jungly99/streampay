'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../../../../lib/socket'
import type { NewDonationEvent } from '@streampay/types'

interface RecentDonor { name: string; amount: number; id: string }

function readParams() {
  if (typeof window === 'undefined') return { color: '#10b981', count: 6, title: 'Recent Donors', bg: '#0a0a1a', opacity: 85, textColor: '#e2e8f0', fontSize: 13, font: 'Arial', bold: true, rotSpeed: 2.5, layout: 'card' }
  const p = new URLSearchParams(window.location.search)
  return {
    color:     '#' + (p.get('c') ?? '10b981'),
    count:     Math.max(3, Math.min(8, Number(p.get('n') ?? '6'))),
    title:     p.get('t') ?? 'Recent Donors',
    bg:        '#' + (p.get('bg') ?? '0a0a1a'),
    opacity:   Math.max(0, Math.min(100, Number(p.get('op') ?? '85'))),
    textColor: '#' + (p.get('fc') ?? 'e2e8f0'),
    fontSize:  Math.max(10, Math.min(24, Number(p.get('fs') ?? '13'))),
    font:      p.get('ff') ?? 'Arial',
    bold:      (p.get('fw') ?? '700') === '700',
    rotSpeed:  Math.max(1, Math.min(10, Number(p.get('rs') ?? '2.5'))),
    layout:    p.get('ly') ?? 'card',
  }
}

export default function RecentDonorsClient({ token }: { token: string }) {
  const [donors, setDonors] = useState<RecentDonor[]>([])
  const [params, setParams] = useState(readParams)
  const [activeIdx, setActiveIdx] = useState(0)
  const [nameSpin, setNameSpin] = useState(-1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setParams(readParams()); setMounted(true) }, [])

  useEffect(() => {
    if (donors.length <= 1) return
    const id = setInterval(() => {
      setActiveIdx(prev => {
        const next = (prev + 1) % donors.length
        setNameSpin(next)
        setTimeout(() => setNameSpin(-1), 500)
        return next
      })
    }, params.rotSpeed * 1000)
    return () => clearInterval(id)
  }, [donors.length, params.rotSpeed])

  useEffect(() => {
    fetch(`/backend/api/donations/overlay-leaderboard/${token}`)
      .then(r => r.json())
      .then(d => setDonors(
        (d.recentDonors ?? []).slice(0, params.count).map((r: any, i: number) => ({ name: r.name, amount: r.amount, id: `init-${i}` }))
      ))
      .catch(() => {})

    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => socket.emit('join-overlay', { token }))
    socket.on('lb-settings-updated', (data: any) => {
      if (!data?.recent) return
      const r = data.recent
      setParams(p => ({
        ...p,
        color:     r.color     ?? p.color,
        count:     r.count     ?? p.count,
        title:     r.title     ?? p.title,
        bg:        r.bg        ?? p.bg,
        opacity:   r.opacity   ?? p.opacity,
        textColor: r.textColor ?? p.textColor,
        fontSize:  r.fontSize  ?? p.fontSize,
        font:      r.font      ?? p.font,
        bold:      r.bold      ?? p.bold,
        rotSpeed:  r.rotSpeed  ?? p.rotSpeed,
        layout:    r.layout    ?? p.layout,
      }))
    })
    socket.on('new-donation', (data: NewDonationEvent) => {
      setDonors(prev => [
        { name: data.donorName, amount: data.amount, id: `${Date.now()}` },
        ...prev,
      ].slice(0, params.count))
      setActiveIdx(0)
    })
    return () => { socket.disconnect() }
  }, [token])

  const opHex = Math.round(params.opacity * 2.55).toString(16).padStart(2, '0')
  const current = donors[activeIdx]

  // ── TICKER LAYOUT ────────────────────────────────────────────────────────────
  if (params.layout === 'ticker') {
    return (
      <div style={{ background: 'transparent', padding: '6px 8px' }}>
        <style>{`
          html,body{background:transparent!important;margin:0;padding:0}*{box-sizing:border-box}
          @keyframes rc-glow{0%,100%{box-shadow:0 0 10px ${params.color}40,0 3px 16px rgba(0,0,0,0.5)}50%{box-shadow:0 0 24px ${params.color}88,0 6px 28px rgba(0,0,0,0.6)}}
          @keyframes rc-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.65)}}
          @keyframes rc-new{0%{background:${params.color}30}100%{background:transparent}}
        `}</style>
        {!donors.length ? (
          <div style={{ display:'flex', alignItems:'center', gap:12, background:`${params.bg}${opHex}`, backdropFilter:'blur(14px)', borderRadius:50, padding:'10px 18px', border:`1px solid ${params.color}30` }}>
            <span style={{ fontSize:params.fontSize, fontWeight:800, color:params.color }}>💰 {params.title}</span>
            <span style={{ fontSize:params.fontSize-1, color:'#64748b' }}>No donations yet</span>
          </div>
        ) : (
          <div style={{
            display:'flex', alignItems:'stretch',
            background:`${params.bg}${opHex}`, backdropFilter:'blur(14px)',
            borderRadius:50, overflow:'hidden',
            border:`1px solid ${params.color}45`,
            boxShadow:`0 4px 24px rgba(0,0,0,0.5), 0 0 20px ${params.color}18`,
            animation:'rc-glow 2.5s ease-in-out infinite',
            fontFamily:params.font,
          }}>
            {/* Label section */}
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px 10px 16px', background:`${params.color}22`, borderRight:`1px solid ${params.color}35`, flexShrink:0 }}>
              <span style={{ fontSize:params.fontSize+2 }}>💰</span>
              <span style={{ fontSize:params.fontSize, fontWeight:800, color:params.color, textTransform:'uppercase', letterSpacing:'0.07em', whiteSpace:'nowrap' }}>
                {params.title}
              </span>
            </div>
            {/* Animated donor */}
            <div style={{ flex:1, position:'relative', overflow:'hidden', minWidth:0 }}>
              <AnimatePresence mode="wait" initial={!mounted}>
                {current && (
                  <motion.div
                    key={current.id}
                    initial={{ opacity:0, y:10 }}
                    animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0, y:-10 }}
                    transition={{ duration:0.32, ease:'easeOut' }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 18px', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, overflow:'hidden' }}>
                      <span style={{ fontSize:params.fontSize+1, flexShrink:0 }}>{activeIdx===0?'🕐':activeIdx===1?'🕑':'🕒'}</span>
                      <span style={{
                        fontSize:params.fontSize+1, fontWeight:params.bold?800:600,
                        color:params.textColor, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                        textShadow:`0 0 14px ${params.color}80`,
                      }}>
                        {current.name}
                      </span>
                    </div>
                    <span style={{ fontSize:params.fontSize+1, fontWeight:800, flexShrink:0, color:params.color, textShadow:`0 0 12px ${params.color}cc` }}>
                      ₹{current.amount.toLocaleString('en-IN')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Pagination dots */}
            {donors.length > 1 && (
              <div style={{ display:'flex', alignItems:'center', gap:4, padding:'0 14px', flexShrink:0 }}>
                {donors.map((_, i) => (
                  <div key={i} style={{
                    width:5, height:5, borderRadius:'50%',
                    background: i===activeIdx ? params.color : `${params.color}40`,
                    animation: i===activeIdx ? 'rc-dot 1s ease-in-out infinite' : undefined,
                    transition:'background 0.3s',
                  }}/>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── CARD LAYOUT (original) ────────────────────────────────────────────────────
  if (!donors.length) return (
    <div style={{ background: 'transparent', padding: 8, minWidth: 240 }}>
      <style>{`html,body{background:transparent!important;margin:0;padding:0}*{box-sizing:border-box}`}</style>
      <div style={{ background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 16px', border: `1px solid ${params.color}30` }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: params.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>👥 {params.title}</p>
        <p style={{ margin: 0, fontSize: 11, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>No recent donations yet</p>
      </div>
    </div>
  )

  return (
    <div style={{ background: 'transparent', padding: 8, minWidth: 240 }}>
      <style>{`
        html,body{background:transparent!important;margin:0;padding:0}
        *{box-sizing:border-box}
        @keyframes rc-pulse{0%,100%{box-shadow:0 0 8px ${params.color}50,0 2px 12px rgba(0,0,0,0.4)}50%{box-shadow:0 0 22px ${params.color}99,0 4px 24px rgba(0,0,0,0.6)}}
        @keyframes rc-pop{0%{transform:scale(1)}40%{transform:scale(1.25) rotate(-8deg)}70%{transform:scale(0.95) rotate(4deg)}100%{transform:scale(1) rotate(0deg)}}
        @keyframes rc-shimmer{0%{opacity:0.7}50%{opacity:1}100%{opacity:0.7}}
      `}</style>
      <div style={{
        background: `${params.bg}${opHex}`,
        backdropFilter: 'blur(12px)', fontFamily: params.font,
        borderRadius: 16, padding: '14px 16px', border: `1px solid ${params.color}40`,
        boxShadow: `0 4px 32px rgba(0,0,0,0.5), 0 0 20px ${params.color}10`,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: params.fontSize, fontWeight: 800, color: params.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          👥 {params.title}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence initial={mounted}>
            {donors.map((d, i) => {
              const isActive = i === activeIdx
              const isPop = i === nameSpin
              return (
                <motion.div
                  key={d.id}
                  layout
                  initial={{ opacity: 0, x: -20, scale: 0.92 }}
                  animate={{ opacity: Math.max(1 - i * 0.12, 0.35), x: 0, scale: isActive ? 1.04 : 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.9 }}
                  transition={{ duration: 0.3, layout: { duration: 0.4, type: 'spring', stiffness: 300, damping: 30 } }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 12px', borderRadius: 9,
                    background: isActive
                      ? `linear-gradient(135deg, ${params.color}22 0%, ${params.color}08 100%)`
                      : i === 0 ? `${params.color}12` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? params.color + '75' : i === 0 ? params.color + '35' : 'rgba(255,255,255,0.06)'}`,
                    animation: isActive ? 'rc-pulse 1.6s ease-in-out infinite' : undefined,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <span style={{
                      fontSize: 14, display: 'inline-block', flexShrink: 0,
                      animation: isPop ? 'rc-pop 0.5s ease-in-out' : undefined,
                      filter: isActive ? `drop-shadow(0 0 5px ${params.color}bb)` : undefined,
                    }}>
                      {i === 0 ? '🕐' : i === 1 ? '🕑' : i === 2 ? '🕒' : '👤'}
                    </span>
                    <span style={{
                      fontSize: params.fontSize, fontWeight: isActive ? 800 : (params.bold ? 600 : 400),
                      color: i === 0 ? params.color : params.textColor,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 130,
                      textShadow: isActive ? `0 0 12px ${params.color}80` : undefined,
                      animation: isActive ? 'rc-shimmer 1.6s ease-in-out infinite' : undefined,
                    }}>
                      {d.name}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 800, flexShrink: 0, marginLeft: 8,
                    color: isActive ? params.color : i === 0 ? params.color : '#64748b',
                    textShadow: isActive ? `0 0 10px ${params.color}cc` : undefined,
                  }}>
                    ₹{d.amount.toLocaleString('en-IN')}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
