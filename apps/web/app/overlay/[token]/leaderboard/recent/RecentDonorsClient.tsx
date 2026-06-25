'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../../../../lib/socket'
import type { NewDonationEvent } from '@streampay/types'

interface RecentDonor { name: string; amount: number; id: string }

const BACKEND = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

function readParams() {
  if (typeof window === 'undefined') return { color: '#10b981', count: 6, title: 'Recent Donors' }
  const p = new URLSearchParams(window.location.search)
  return {
    color: '#' + (p.get('c') ?? '10b981'),
    count: Math.max(3, Math.min(8, Number(p.get('n') ?? '6'))),
    title: p.get('t') ?? 'Recent Donors',
  }
}

export default function RecentDonorsClient({ token }: { token: string }) {
  const [donors, setDonors] = useState<RecentDonor[]>([])
  const [params, setParams] = useState(readParams)

  useEffect(() => { setParams(readParams()) }, [])

  useEffect(() => {
    fetch(`${BACKEND}/api/donations/overlay-leaderboard/${token}`)
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
    <div style={{ background: 'transparent' }}>
      <style>{`html,body{background:transparent!important;margin:0;padding:0}`}</style>
    </div>
  )

  return (
    <div style={{ background: 'transparent', padding: 8, minWidth: 240 }}>
      <style>{`html,body{background:transparent!important;margin:0;padding:0}*{box-sizing:border-box}`}</style>
      <div style={{
        background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(12px)',
        borderRadius: 16, padding: '14px 16px', border: `1px solid ${params.color}40`,
        boxShadow: `0 4px 32px rgba(0,0,0,0.5), 0 0 20px ${params.color}10`,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: params.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          👥 {params.title}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence initial={false}>
            {donors.map((d, i) => (
              <motion.div
                key={d.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 12px', borderRadius: 9,
                  background: i === 0 ? `${params.color}15` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${i === 0 ? params.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  opacity: Math.max(1 - i * 0.15, 0.4),
                }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? params.color : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{d.name}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? params.color : '#64748b', flexShrink: 0, marginLeft: 8 }}>₹{d.amount.toLocaleString('en-IN')}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
