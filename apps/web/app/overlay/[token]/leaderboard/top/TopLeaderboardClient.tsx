'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../../../../lib/socket'
import type { NewDonationEvent } from '@streampay/types'

interface Donor { rank: number; name: string; total: number }

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']

function readParams() {
  if (typeof window === 'undefined') return { color: '#7c3aed', count: 5, title: 'Top Donors', bg: '#0a0a1a', opacity: 85, textColor: '#e2e8f0', fontSize: 13, font: 'Arial', bold: true, rotSpeed: 2.5 }
  const p = new URLSearchParams(window.location.search)
  return {
    color:     '#' + (p.get('c') ?? '7c3aed'),
    count:     Math.max(3, Math.min(10, Number(p.get('n') ?? '5'))),
    title:     p.get('t') ?? 'Top Donors',
    bg:        '#' + (p.get('bg') ?? '0a0a1a'),
    opacity:   Math.max(0, Math.min(100, Number(p.get('op') ?? '85'))),
    textColor: '#' + (p.get('fc') ?? 'e2e8f0'),
    fontSize:  Math.max(10, Math.min(20, Number(p.get('fs') ?? '13'))),
    font:      p.get('ff') ?? 'Arial',
    bold:      (p.get('fw') ?? '700') === '700',
    rotSpeed:  Math.max(1, Math.min(10, Number(p.get('rs') ?? '2.5'))),
  }
}

export default function TopLeaderboardClient({ token }: { token: string }) {
  const [donors, setDonors] = useState<Donor[]>([])
  const [params, setParams] = useState(readParams)
  const [activeIdx, setActiveIdx] = useState(0)
  const [medalSpin, setMedalSpin] = useState(-1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setParams(readParams()); setMounted(true) }, [])

  // Rotate spotlight through each rank
  useEffect(() => {
    if (donors.length <= 1) return
    const id = setInterval(() => {
      setActiveIdx(prev => {
        const next = (prev + 1) % donors.length
        setMedalSpin(next)
        setTimeout(() => setMedalSpin(-1), 600)
        return next
      })
    }, params.rotSpeed * 1000)
    return () => clearInterval(id)
  }, [donors.length])

  useEffect(() => {
    fetch(`/backend/api/donations/overlay-leaderboard/${token}`)
      .then(r => r.json())
      .then(d => setDonors((d.topDonors ?? []).slice(0, params.count)))
      .catch(() => {})

    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => socket.emit('join-overlay', { token }))
    socket.on('new-donation', (data: NewDonationEvent) => {
      setDonors(prev => {
        const updated = [...prev]
        const idx = updated.findIndex(d => d.name.toLowerCase() === data.donorName.toLowerCase())
        if (idx >= 0 && updated[idx]) {
          updated[idx] = { name: updated[idx]!.name, rank: updated[idx]!.rank, total: updated[idx]!.total + data.amount }
        } else {
          updated.push({ rank: updated.length + 1, name: data.donorName, total: data.amount })
        }
        return updated
          .sort((a, b) => b.total - a.total)
          .map((d, i): Donor => ({ name: d.name, total: d.total, rank: i + 1 }))
          .slice(0, params.count)
      })
    })
    return () => { socket.disconnect() }
  }, [token])

  if (!donors.length) return (
    <div style={{ background: 'transparent', padding: 8, minWidth: 260 }}>
      <style>{`html,body{background:transparent!important;margin:0;padding:0}*{box-sizing:border-box}`}</style>
      <div style={{ background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(12px)', borderRadius: 16, padding: '14px 16px', border: `1px solid ${params.color}30` }}>
        <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 800, color: params.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>🏆 {params.title}</p>
        <p style={{ margin: 0, fontSize: 11, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>No donations yet</p>
      </div>
    </div>
  )

  return (
    <div style={{ background: 'transparent', padding: 8, minWidth: 260 }}>
      <style>{`
        html,body{background:transparent!important;margin:0;padding:0}
        *{box-sizing:border-box}
        @keyframes lb-pulse{0%,100%{box-shadow:0 0 8px ${params.color}50,0 2px 12px rgba(0,0,0,0.4)}50%{box-shadow:0 0 22px ${params.color}99,0 4px 24px rgba(0,0,0,0.6)}}
        @keyframes lb-flip{0%{transform:rotateY(0deg) scale(1)}40%{transform:rotateY(180deg) scale(1.3)}80%{transform:rotateY(360deg) scale(1.1)}100%{transform:rotateY(360deg) scale(1)}}
        @keyframes lb-shimmer{0%{opacity:0.7}50%{opacity:1}100%{opacity:0.7}}
      `}</style>
      <div style={{
        background: `${params.bg}${Math.round(params.opacity * 2.55).toString(16).padStart(2,'0')}`,
        backdropFilter: 'blur(12px)', fontFamily: params.font,
        borderRadius: 16, padding: '14px 16px', border: `1px solid ${params.color}40`,
        boxShadow: `0 4px 32px rgba(0,0,0,0.5), 0 0 20px ${params.color}10`,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: params.fontSize, fontWeight: 800, color: params.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          🏆 {params.title}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence initial={mounted}>
            {donors.map((d, i) => {
              const isActive = i === activeIdx
              const isSpinning = i === medalSpin
              return (
                <motion.div
                  key={d.name}
                  layout
                  initial={{ opacity: 0, x: -24, scale: 0.92 }}
                  animate={{ opacity: 1, x: 0, scale: isActive ? 1.04 : 1 }}
                  exit={{ opacity: 0, x: 24, scale: 0.92 }}
                  transition={{ duration: 0.35, delay: mounted ? 0 : i * 0.09, layout: { duration: 0.4, type: 'spring', stiffness: 300, damping: 30 } }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 10,
                    background: isActive
                      ? `linear-gradient(135deg, ${params.color}22 0%, ${params.color}0a 100%)`
                      : i === 0 ? `${params.color}10` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isActive ? params.color + '80' : i === 0 ? params.color + '35' : 'rgba(255,255,255,0.07)'}`,
                    animation: isActive ? 'lb-pulse 1.6s ease-in-out infinite' : undefined,
                  }}>
                  <span style={{
                    fontSize: 18, width: 26, textAlign: 'center', display: 'inline-block', flexShrink: 0,
                    animation: isSpinning ? 'lb-flip 0.6s ease-in-out' : undefined,
                    filter: isActive ? `drop-shadow(0 0 6px ${params.color}aa)` : undefined,
                  }}>
                    {MEDALS[i]}
                  </span>
                  <span style={{
                    flex: 1, fontSize: params.fontSize + 1, fontWeight: isActive ? 800 : (params.bold ? 700 : 400),
                    color: isActive ? '#ffffff' : params.textColor,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    textShadow: isActive ? `0 0 14px ${params.color}90` : undefined,
                    animation: isActive ? 'lb-shimmer 1.6s ease-in-out infinite' : undefined,
                  }}>
                    {d.name}
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: 800, flexShrink: 0, marginLeft: 8,
                    color: isActive ? params.color : params.color + 'aa',
                    textShadow: isActive ? `0 0 12px ${params.color}cc` : undefined,
                  }}>
                    ₹{d.total.toLocaleString('en-IN')}
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
