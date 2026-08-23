'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../../../../lib/socket'
import type { NewDonationEvent } from '../../../../../lib/types'

interface Donor { rank: number; name: string; total: number }

function readParams() {
  if (typeof window === 'undefined') return { color: '#7c3aed', count: 5, title: 'Top Donors', bg: '#0d0d14', opacity: 90, textColor: '#ffffff', fontSize: 14, font: 'Inter,system-ui,sans-serif', bold: true, rotSpeed: 3, layout: 'ticker', width: 500, height: 0 }
  const p = new URLSearchParams(window.location.search)
  return {
    color:     '#' + (p.get('c') ?? '7c3aed'),
    count:     Math.max(3, Math.min(10, Number(p.get('n') ?? '5'))),
    title:     p.get('t') ?? 'Top Donors',
    bg:        '#' + (p.get('bg') ?? '0d0d14'),
    opacity:   Math.max(0, Math.min(100, Number(p.get('op') ?? '90'))),
    textColor: '#' + (p.get('fc') ?? 'ffffff'),
    fontSize:  Math.max(10, Math.min(24, Number(p.get('fs') ?? '14'))),
    font:      p.get('ff') ?? 'Inter,system-ui,sans-serif',
    bold:      (p.get('fw') ?? '700') === '700',
    rotSpeed:  Math.max(1, Math.min(10, Number(p.get('rs') ?? '3'))),
    layout:    p.get('ly') ?? 'ticker',
    width:     Number(p.get('w') ?? '0'),
    height:    Number(p.get('h') ?? '0'),
  }
}

const CACHE_KEY = (token: string) => `lb_top_${token}`

export default function TopLeaderboardClient({ token }: { token: string }) {
  const [donors, setDonors] = useState<Donor[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY(token)) ?? '[]') } catch { return [] }
  })
  const [params, setParams] = useState(readParams)
  const [activeIdx, setActiveIdx] = useState(0)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(donors.length === 0)

  useEffect(() => { setParams(readParams()); setMounted(true) }, [])

  useEffect(() => {
    if (donors.length <= 1) return
    const id = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % donors.length)
    }, params.rotSpeed * 1000)
    return () => clearInterval(id)
  }, [donors.length, params.rotSpeed])

  useEffect(() => {
    fetch(`/backend/api/donations/overlay-leaderboard/${token}`)
      .then(r => r.json())
      .then(d => {
        const list = (d.topDonors ?? []).slice(0, params.count)
        setDonors(list)
        try { sessionStorage.setItem(CACHE_KEY(token), JSON.stringify(list)) } catch {}
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => socket.emit('join-overlay', { token }))
    socket.on('lb-settings-updated', (data: any) => {
      if (!data?.top) return
      const t = data.top
      setParams(p => ({ ...p, color: t.color ?? p.color, count: t.count ?? p.count, title: t.title ?? p.title, bg: t.bg ?? p.bg, opacity: t.opacity ?? p.opacity, textColor: t.textColor ?? p.textColor, fontSize: t.fontSize ?? p.fontSize, font: t.font ?? p.font, bold: t.bold ?? p.bold, rotSpeed: t.rotSpeed ?? p.rotSpeed, layout: t.layout ?? p.layout, width: t.width ?? p.width, height: t.height ?? p.height }))
    })
    socket.on('new-donation', (data: NewDonationEvent) => {
      setDonors(prev => {
        const updated = [...prev]
        const idx = updated.findIndex(d => d.name.toLowerCase() === data.donorName.toLowerCase())
        if (idx >= 0 && updated[idx]) {
          updated[idx] = { name: updated[idx]!.name, rank: updated[idx]!.rank, total: updated[idx]!.total + data.amount }
        } else {
          updated.push({ rank: updated.length + 1, name: data.donorName, total: data.amount })
        }
        const next = updated.sort((a, b) => b.total - a.total).map((d, i): Donor => ({ name: d.name, total: d.total, rank: i + 1 })).slice(0, params.count)
        try { sessionStorage.setItem(CACHE_KEY(token), JSON.stringify(next)) } catch {}
        return next
      })
    })
    return () => { socket.disconnect() }
  }, [token])

  const opHex = Math.round(params.opacity * 2.55).toString(16).padStart(2, '0')
  const current = donors[activeIdx]
  const wStyle: React.CSSProperties = {
    ...(params.width  > 0 ? { width:  params.width  } : {}),
    ...(params.height > 0 ? { height: params.height, overflow: 'hidden' } : {}),
  }

  // ── TICKER LAYOUT ─────────────────────────────────────────────────────────────
  if (params.layout === 'ticker') {
    return (
      <div style={{ background: 'transparent', padding: '4px 0', ...wStyle }}>
        <style>{`
          html,body{background:transparent!important;margin:0;padding:0}*{box-sizing:border-box}
        `}</style>
        {!donors.length ? (
          loading ? null : (
          <div style={{ display:'flex', alignItems:'center', background:`${params.bg}${opHex}`, borderRadius:6, overflow:'hidden', fontFamily:params.font, minHeight:46 }}>
            <div style={{ width:3, alignSelf:'stretch', background:params.color, flexShrink:0 }} />
            <span style={{ padding:'0 16px', fontSize:params.fontSize, fontWeight:700, color:params.color }}>{params.title}</span>
            <span style={{ fontSize:params.fontSize-1, color:'rgba(255,255,255,0.3)' }}>No donations yet</span>
          </div>
          )
        ) : (
          <div style={{ display:'flex', alignItems:'stretch', background:`${params.bg}${opHex}`, borderRadius:6, overflow:'hidden', fontFamily:params.font, minHeight:46 }}>
            {/* Left accent stripe */}
            <div style={{ width:3, alignSelf:'stretch', background:params.color, flexShrink:0 }} />
            {/* Label */}
            <div style={{ display:'flex', alignItems:'center', padding:'0 16px', borderRight:`1px solid rgba(255,255,255,0.08)`, flexShrink:0 }}>
              <span style={{ fontSize:params.fontSize-1, fontWeight:700, color:params.color, letterSpacing:'0.04em', whiteSpace:'nowrap' }}>
                {params.title}
              </span>
            </div>
            {/* Animated donor */}
            <div style={{ flex:1, overflow:'hidden', minWidth:0, position:'relative', display:'flex', alignItems:'center', padding:'0 16px' }}>
              <AnimatePresence mode="wait" initial={!mounted}>
                {current && (
                  <motion.div
                    key={activeIdx}
                    initial={{ opacity:0, y:7 }}
                    animate={{ opacity:1, y:0 }}
                    exit={{ opacity:0, y:-7 }}
                    transition={{ duration:0.25, ease:'easeOut' }}
                    style={{ display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', gap:12 }}
                  >
                    <span style={{ fontSize:params.fontSize+1, fontWeight:params.bold?700:500, color:params.textColor, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {current.name}
                    </span>
                    <span style={{ fontSize:params.fontSize+1, fontWeight:700, color:params.color, flexShrink:0 }}>
                      ₹{current.total.toLocaleString('en-IN')}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── CARD LAYOUT ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'transparent', padding: 8, minWidth: 280, ...wStyle }}>
      <style>{`html,body{background:transparent!important;margin:0;padding:0}*{box-sizing:border-box}`}</style>
      {!donors.length ? (
        loading ? null : (
        <div style={{ background:`${params.bg}${opHex}`, borderRadius:8, overflow:'hidden', fontFamily:params.font, border:`1px solid rgba(255,255,255,0.07)` }}>
          <div style={{ padding:'11px 16px', borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
            <span style={{ fontSize:params.fontSize-1, fontWeight:700, color:params.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{params.title}</span>
          </div>
          <div style={{ padding:'14px 16px', color:'rgba(255,255,255,0.3)', fontSize:params.fontSize-1, textAlign:'center' }}>No donations yet</div>
        </div>
        )
      ) : (
        <div style={{ background:`${params.bg}${opHex}`, borderRadius:8, overflow:'hidden', fontFamily:params.font, border:`1px solid rgba(255,255,255,0.07)` }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderBottom:`1px solid rgba(255,255,255,0.06)` }}>
            <div style={{ width:3, height:14, borderRadius:2, background:params.color, flexShrink:0 }} />
            <span style={{ fontSize:params.fontSize-1, fontWeight:700, color:params.color, letterSpacing:'0.05em', textTransform:'uppercase' }}>{params.title}</span>
          </div>
          {/* Rows */}
          <AnimatePresence initial={mounted}>
            {donors.map((d, i) => (
              <motion.div
                key={d.name}
                layout
                initial={{ opacity:0, x:-16 }}
                animate={{ opacity:1, x:0 }}
                exit={{ opacity:0, x:16 }}
                transition={{ duration:0.28, delay:mounted ? 0 : i * 0.07, layout:{ duration:0.35, type:'spring', stiffness:280, damping:28 } }}
                style={{
                  display:'flex', alignItems:'center', gap:12,
                  padding:'10px 16px',
                  borderBottom: i < donors.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                  background: i === 0 ? `${params.color}0d` : undefined,
                }}
              >
                <span style={{ fontSize:params.fontSize-1, fontWeight:700, color: i < 3 ? params.color : `${params.color}55`, width:24, flexShrink:0 }}>
                  #{i + 1}
                </span>
                <span style={{ flex:1, fontSize:params.fontSize, fontWeight:params.bold ? 700 : 500, color:params.textColor, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {d.name}
                </span>
                <span style={{ fontSize:params.fontSize, fontWeight:700, color: i === 0 ? params.color : `${params.color}bb`, flexShrink:0 }}>
                  ₹{d.total.toLocaleString('en-IN')}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
