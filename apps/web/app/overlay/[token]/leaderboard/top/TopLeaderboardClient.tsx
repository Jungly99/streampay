'use client'
import { useEffect, useState } from 'react'
import { getSocket } from '../../../../../lib/socket'
import type { NewDonationEvent } from '@streampay/types'

interface Donor { rank: number; name: string; total: number }

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
const BACKEND = ''  // use relative /backend proxy so OBS browser source works

function readParams() {
  if (typeof window === 'undefined') return { color: '#7c3aed', count: 5, title: 'Top Donors' }
  const p = new URLSearchParams(window.location.search)
  return {
    color: '#' + (p.get('c') ?? '7c3aed'),
    count: Math.max(3, Math.min(10, Number(p.get('n') ?? '5'))),
    title: p.get('t') ?? 'Top Donors',
  }
}

export default function TopLeaderboardClient({ token }: { token: string }) {
  const [donors, setDonors] = useState<Donor[]>([])
  const [params, setParams] = useState(readParams)

  useEffect(() => { setParams(readParams()) }, [])

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
        <p style={{ margin: 0, fontSize: 11, color: '#64748b', textAlign: 'center', padding: '8px 0' }}>No donations yet this month</p>
      </div>
    </div>
  )

  return (
    <div style={{ background: 'transparent', padding: 8, minWidth: 260 }}>
      <style>{`html,body{background:transparent!important;margin:0;padding:0}*{box-sizing:border-box}`}</style>
      <div style={{
        background: 'rgba(10,10,26,0.85)', backdropFilter: 'blur(12px)',
        borderRadius: 16, padding: '14px 16px', border: `1px solid ${params.color}40`,
        boxShadow: `0 4px 32px rgba(0,0,0,0.5), 0 0 20px ${params.color}10`,
      }}>
        <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 800, color: params.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          🏆 {params.title}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {donors.map((d, i) => (
            <div key={d.name} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 12px', borderRadius: 10,
              background: i === 0 ? `${params.color}18` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${i === 0 ? params.color + '50' : 'rgba(255,255,255,0.07)'}`,
            }}>
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{MEDALS[i]}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: i === 0 ? params.color : '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: i === 0 ? params.color : params.color + 'bb' }}>₹{d.total.toLocaleString('en-IN')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
