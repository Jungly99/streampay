'use client'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../../lib/api'
import { formatINR, formatDate } from '../../../lib/utils'
import StyledSelect, { SelectOption } from '../../../components/ui/StyledSelect'

interface Donation {
  id: string; donorName: string; message: string | null
  amount: number; netAmount: number; status: string; createdAt: string
}
interface Stats { totalEarned: number; totalMessages: number; netPending: number; topTransaction: number }

const S = {
  card: { background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 } as React.CSSProperties,
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, [string, string]> = {
    SUCCESS: ['#10b981', 'rgba(16,185,129,0.1)'],
    PENDING: ['#f59e0b', 'rgba(245,158,11,0.1)'],
    FAILED:  ['#f87171', 'rgba(248,113,113,0.1)'],
  }
  const [c, bg] = map[s] ?? ['#64748b', 'rgba(100,116,139,0.1)']
  return <span style={{ fontSize: 11, fontWeight: 700, color: c, background: bg, padding: '3px 9px', borderRadius: 20 }}>{s}</span>
}

export default function MessagesPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [stats, setStats] = useState<Stats>({ totalEarned: 0, totalMessages: 0, netPending: 0, topTransaction: 0 })
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  function exportCsv() {
    if (!donations.length) { return }
    const headers = ['Donor', 'Message', 'Amount (₹)', 'Net (₹)', 'Status', 'Date']
    const rows = donations.map(d => [d.donorName, d.message ?? '', d.amount, Number(d.netAmount).toFixed(2), d.status, new Date(d.createdAt).toLocaleDateString('en-IN')])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `eztips-donations-${new Date().toISOString().slice(0,10)}.csv`; a.click()
  }

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), status: 'SUCCESS', ...(search ? { search } : {}), ...(period !== 'all' ? { period } : {}) })
    const [donRes, statRes] = await Promise.all([
      api.get<{ donations: Donation[]; total: number }>(`/api/donations?${params}`),
      api.get<Stats>('/api/donations/stats/summary'),
    ])
    setDonations(donRes.donations)
    setTotal(donRes.total)
    setStats(statRes)
    setLoading(false)
  }, [page, search, period])

  useEffect(() => { load() }, [load])

  const statItems = [
    { label: 'Total Earned',    value: formatINR(stats.totalEarned),      color: '#10b981' },
    { label: 'Donations',       value: stats.totalMessages,               color: '#7c3aed' },
    { label: 'Net Pending',     value: formatINR(stats.netPending),       color: '#f59e0b' },
    { label: 'Top Donation',    value: formatINR(stats.topTransaction),   color: '#db2777' },
  ]

  return (
    <div style={{ padding: 28, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px' }}>Donations</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 3 }}>Your complete donation history</p>
        </div>
        <button onClick={exportCsv} disabled={!donations.length} style={{
          padding: '8px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: donations.length ? 'pointer' : 'not-allowed',
          background: 'var(--surface-input)', border: '1px solid rgba(255,255,255,0.09)', color: 'var(--text-2)', opacity: donations.length ? 1 : 0.4,
        }}>Export CSV</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        {statItems.map(s => (
          <div key={s.label} style={{ ...S.card, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${s.color}80,transparent)` }} />
            <p style={{ fontSize: 11, fontWeight: 600, color: s.color, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>{s.label}</p>
            <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.5px' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...S.card, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or message…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-1)' }}
        />
        <StyledSelect value={period} onChange={e => { setPeriod(e.target.value); setPage(1) }} style={{ width: 'auto', padding: '7px 32px 7px 10px', fontSize: 12, borderRadius: 8 }}>
          <SelectOption value="all">All Time</SelectOption>
          <SelectOption value="today">Today</SelectOption>
          <SelectOption value="week">This Week</SelectOption>
          <SelectOption value="month">This Month</SelectOption>
        </StyledSelect>
      </div>

      {/* Table */}
      <div style={{ ...S.card, overflow: 'hidden', flex: 1 }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>
        ) : donations.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>No donations yet</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Share your donation link to start receiving support</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Donor', 'Message', 'Amount', 'Net (after 5%)', 'Status', 'Date'].map(h => (
                  <th key={h} style={{ textAlign: h === 'Message' ? 'left' : 'right', padding: '13px 18px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {h === 'Donor' ? <span style={{ textAlign: 'left', display: 'block' }}>{h}</span> : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {donations.map((d, i) => (
                <tr key={d.id} style={{ borderBottom: i < donations.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: 'white', flexShrink: 0 }}>
                        {d.donorName[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)' }}>{d.donorName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: 'var(--text-3)', maxWidth: 200 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.message ?? '—'}</span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: 14, fontWeight: 700, color: '#10b981' }}>{formatINR(d.amount)}</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: 13, color: '#60a5fa' }}>{formatINR(Number(d.netAmount))}</td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}><StatusPill s={d.status} /></td>
                  <td style={{ padding: '14px 18px', textAlign: 'right', fontSize: 12, color: 'var(--text-3)' }}>{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Summary footer row */}
        {donations.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{donations.length} donation{donations.length !== 1 ? 's' : ''} shown</span>
            <div style={{ display: 'flex', gap: 20 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Total: <strong style={{ color: '#10b981' }}>{formatINR(donations.reduce((s, d) => s + d.amount, 0))}</strong></span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Net: <strong style={{ color: '#60a5fa' }}>{formatINR(donations.reduce((s, d) => s + Number(d.netAmount), 0))}</strong></span>
            </div>
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Showing {Math.min((page-1)*20+1, total)}–{Math.min(page*20, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--surface-input)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>← Prev</button>
              <button onClick={() => setPage(p => p+1)} disabled={page*20 >= total} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--surface-input)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
