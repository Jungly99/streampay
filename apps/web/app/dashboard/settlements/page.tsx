'use client'
import { useState, useEffect } from 'react'
import { api } from '../../../lib/api'
import { formatINR, formatDate } from '../../../lib/utils'
import toast from 'react-hot-toast'

interface FeeBreakdown { grossAmount: number; feePct: number; feeAmount: number; netAmount: number; canSettle: boolean; minSettlement: number }
interface DonationRow { id: string; donorName: string; amount: number; feeAmount: number; netAmount: number; settled: boolean; createdAt: string; settlement?: { status: string } | null }

const C: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }

export default function SettlementsPage() {
  const [breakdown, setBreakdown] = useState<FeeBreakdown | null>(null)
  const [donations, setDonations] = useState<DonationRow[]>([])
  const [stats, setStats] = useState<any>(null)
  const [settling, setSettling] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [search, setSearch] = useState('')

  async function load() {
    const params = new URLSearchParams({ ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}), ...(search ? { search } : {}) })
    const [bkdwn, res] = await Promise.all([
      api.get<FeeBreakdown>('/api/settlements/fee-breakdown'),
      api.get<{ donations: DonationRow[]; stats: any }>(`/api/settlements?${params}`),
    ])
    setBreakdown(bkdwn)
    setDonations(res.donations)
    setStats(res.stats)
  }

  useEffect(() => { load() }, [startDate, endDate, search])

  async function settle() {
    if (!breakdown?.canSettle) return
    setSettling(true)
    try {
      await api.post('/api/settlements/initiate')
      toast.success('Settlement requested! Payment will be processed within 2 business days.')
      load()
    } catch (e: any) { toast.error(e.message) } finally { setSettling(false) }
  }

  const statItems = stats ? [
    { label: 'Today Collected',  value: formatINR(stats.todayTotal),        color: '#7c3aed' },
    { label: 'Filtered Gross',   value: formatINR(stats.filteredGross),      color: '#0891b2' },
    { label: 'Filtered Net',     value: formatINR(stats.filteredNet),        color: '#10b981' },
    { label: 'Transactions',     value: stats.totalTx,                       color: '#f59e0b' },
    { label: 'Total Settled',    value: formatINR(stats.totalSettledGross),  color: '#db2777' },
    { label: 'Net Received',     value: formatINR(stats.totalNetReceived),   color: '#10b981' },
    { label: 'Last Settled',     value: formatINR(Number(stats.lastSettled)), color: '#94a3b8' },
  ] : []

  return (
    <div style={{ padding: 28, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' }}>Settlements</h1>
          <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>Withdraw your earnings to your bank account</p>
        </div>
        <button onClick={settle} disabled={settling || !breakdown?.canSettle} style={{
          padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: breakdown?.canSettle ? 'pointer' : 'not-allowed',
          background: breakdown?.canSettle ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.05)',
          border: 'none', color: breakdown?.canSettle ? 'white' : '#334155',
          boxShadow: breakdown?.canSettle ? '0 0 20px rgba(124,58,237,0.3)' : 'none',
          opacity: settling ? 0.7 : 1, transition: 'all 0.15s',
        }}>
          {settling ? 'Requesting…' : 'Request Settlement →'}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 10 }}>
          {statItems.map(s => (
            <div key={s.label} style={{ ...C, padding: '14px 14px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: s.color, marginBottom: 4 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: '#334155', lineHeight: 1.4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fee breakdown */}
      {breakdown && (
        <div style={{ ...C, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#f59e0b', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Pending Balance</p>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px' }}>{formatINR(breakdown.grossAmount)}</p>
              <p style={{ fontSize: 13, color: '#475569', marginTop: 6 }}>
                {breakdown.feePct}% fee ({formatINR(breakdown.feeAmount)}) → You receive{' '}
                <span style={{ color: '#10b981', fontWeight: 700 }}>{formatINR(breakdown.netAmount)}</span>
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
              {!breakdown.canSettle && breakdown.grossAmount > 0 && (
                <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#f59e0b', textAlign: 'right' }}>
                  Minimum ₹{breakdown.minSettlement} required to settle<br />
                  <span style={{ color: '#64748b' }}>Need {formatINR(breakdown.minSettlement - breakdown.grossAmount)} more</span>
                </div>
              )}
              {!breakdown.canSettle && breakdown.grossAmount === 0 && (
                <div style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#f59e0b' }}>
                  Nothing to settle yet
                </div>
              )}
              <div style={{ padding: '8px 14px', borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11, color: '#818cf8', textAlign: 'right' }}>
                ⏱ Settlements processed within 2 business days
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ ...C, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8,
          padding: '7px 10px', fontSize: 12, color: '#94a3b8', outline: 'none',
        }} />
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8,
          padding: '7px 10px', fontSize: 12, color: '#94a3b8', outline: 'none',
        }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search donor name…" style={{
          flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#e2e8f0',
        }} />
        <button style={{ padding: '7px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: 12, cursor: 'pointer' }}>
          Export CSV
        </button>
      </div>

      {/* Table */}
      <div style={{ ...C, overflow: 'hidden', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Donor', 'Gross Amount', 'Fee (5%)', 'Fee Deducted', 'Net Amount', 'Status', 'Date'].map(h => (
                <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {donations.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', fontSize: 13, color: '#334155' }}>No transactions found</td></tr>
            ) : donations.map((d, i) => (
              <tr key={d.id} style={{ borderBottom: i < donations.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <td style={{ padding: '13px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#a78bfa', flexShrink: 0 }}>
                      {d.donorName[0]?.toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, color: '#e2e8f0' }}>{d.donorName}</span>
                  </div>
                </td>
                <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 600, color: '#10b981' }}>{formatINR(d.amount)}</td>
                <td style={{ padding: '13px 18px', fontSize: 12, color: '#f59e0b' }}>5.00%</td>
                <td style={{ padding: '13px 18px', fontSize: 13, color: '#f87171' }}>{formatINR(Number(d.feeAmount))}</td>
                <td style={{ padding: '13px 18px', fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{formatINR(Number(d.netAmount))}</td>
                <td style={{ padding: '13px 18px' }}>
                  {!d.settled
                    ? <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '3px 9px', borderRadius: 20 }}>⏳ Pending</span>
                    : d.settlement?.status === 'SUCCESS'
                      ? <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '3px 9px', borderRadius: 20 }}>✓ Paid</span>
                      : d.settlement?.status === 'FAILED'
                        ? <span style={{ fontSize: 11, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '3px 9px', borderRadius: 20 }}>✗ Failed</span>
                        : <span style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', background: 'rgba(129,140,248,0.1)', padding: '3px 9px', borderRadius: 20 }}>🔄 Processing</span>
                  }
                </td>
                <td style={{ padding: '13px 18px', fontSize: 12, color: '#334155' }}>{formatDate(d.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
