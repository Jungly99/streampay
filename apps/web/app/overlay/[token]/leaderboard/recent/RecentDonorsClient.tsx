'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../../../../lib/socket'
import type { NewDonationEvent } from '@streampay/types'

interface RecentDonor { name: string; amount: number; id: string }

function readParams() {
  if (typeof window === 'undefined') return { color: '#10b981', count: 6, title: 'Recent Donors', bg: '#0a0a1a', opacity: 85, textColor: '#e2e8f0', fontSize: 13, font: 'Arial', bold: true, rotSpeed: 2.5 }
  const p = new URLSearchParams(window.location.search)
  return {
    color:     '#' + (p.get('c') ?? '10b981'),
    count:     Math.max(3, Math.min(8, Number(p.get('n') ?? '6'))),
    title:     p.get('t') ?? 'Recent Donors',
    bg:        '#' + (p.get('bg') ?? '0a0a1a'),
    opacity:   Math.max(0, Math.min(100, Number(p.get('op') ?? '85'))),
    textColor: '#' + (p.get('fc') ?? 'e2e8f0'),
    fontSize:  Math.max(10, Math.min(20, Number(p.get('fs') ?? '13'))),
    font:      p.get('ff') ?? 'Arial',
    bold:      (p.get('fw') ?? '700') === '700',
    rotSpeed:  Math.max(1, Math.min(10, Number(p.get('rs') ?? '2.5'))),
  }
}

export default function RecentDonorsClient({ token }: { token: string }) {
  const [donors, setDonors] = useState<RecentDonor[]>([])
  const [params, setParams] = useState(readParams)
  const [activeIdx, setActiveIdx] = useState(0)
  const [nameSpin, setNameSpin] = useState(-1)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setParams(readParams()); setMounted(true) }, [])

  // Rotate spotlight through each recent donor
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
  }, [donors.length])

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
    socket.on('new-donation', (data: NewDonationEvent) => {
      setDonors(prev => [
        { name: data.donorName, amount: data.amount, id: `${Date.now()}` },
        ...prev,
      ].slice(0, params.count))
    })
    return () => { socket.disconnect() }
  }, [token])

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
        background: `${params.bg}${Math.round(params.opacity * 2.55).toString(16).padStart(2,'0')}`,
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
                      color: isActive ? '#ffffff' : i === 0 ? params.color : params.textColor,
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
