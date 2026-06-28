'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { formatINR, formatDate } from '../../../lib/utils'

const C: React.CSSProperties = { background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }

export default function LifetimeSettlementsPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    api.get('/api/settlements/lifetime').then(setData).catch(() => {})
  }, [])

  const statItems = [
    { label: 'Total Settled',    value: formatINR(data?.totalSettledGross ?? 0),  color: '#10b981', sub: 'gross earnings' },
    { label: 'Net Received',     value: formatINR(data?.totalNetReceived ?? 0),    color: '#60a5fa', sub: 'after 5% fee' },
    { label: 'Fees Paid',        value: formatINR(data?.totalFees ?? 0),           color: '#f87171', sub: 'platform fee total' },
    { label: 'Settlements',      value: data?.numberOfSettlements ?? 0,            color: '#a78bfa', sub: 'total withdrawals' },
  ]

  return (
    <div style={{ padding: 28, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px' }}>Lifetime Settlements</h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>Your complete earnings history since you joined eztips</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {statItems.map(s => (
          <div key={s.label} style={{ ...C, padding: '20px 22px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.color}80,transparent)` }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: s.color, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>{s.label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* History table */}
      <div style={{ ...C, overflow: 'hidden', flex: 1 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Settlement History</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>All withdrawals made from your eztips account</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Date', 'Type', 'Gross Amount', 'Fee %', 'Fee Deducted', 'Net Received', 'Status'].map(h => (
                <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!data?.history?.length ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', fontSize: 13, color: 'var(--text-3)' }}>No settlement records yet</td></tr>
            ) : data.history.map((s: any, i: number) => (
              <tr key={s.id} style={{ borderBottom: i < data.history.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--text-3)' }}>{formatDate(s.initiatedAt)}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--text-3)' }}>Same-Day</td>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 600, color: '#10b981' }}>{formatINR(s.grossAmount)}</td>
                <td style={{ padding: '12px 18px', fontSize: 12, color: '#f59e0b' }}>{Number(s.feePct).toFixed(0)}%</td>
                <td style={{ padding: '12px 18px', fontSize: 13, color: '#f87171' }}>{formatINR(Number(s.feeAmount))}</td>
                <td style={{ padding: '12px 18px', fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{formatINR(Number(s.netAmount))}</td>
                <td style={{ padding: '12px 18px' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20,
                    color: s.status === 'SUCCESS' ? '#10b981' : s.status === 'INITIATED' ? '#f59e0b' : '#f87171',
                    background: s.status === 'SUCCESS' ? 'rgba(16,185,129,0.1)' : s.status === 'INITIATED' ? 'rgba(245,158,11,0.1)' : 'rgba(248,113,113,0.1)',
                  }}>{s.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Explainer */}
      <div style={{ ...C, padding: '20px 24px' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 14 }}>How Settlements Work</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['Net Received', 'Amount credited to your bank after deducting the 5% platform fee'],
            ['Fees Paid', 'eztips charges 5% only at settlement — never per donation'],
            ['No Minimum', 'You can settle any amount, any time. No ₹500 minimums.'],
          ].map(([title, desc]) => (
            <div key={title as string} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#7c3aed', marginTop: 6, flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{title}: </span>{desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
