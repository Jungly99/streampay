'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import { formatDate, formatINR } from '../../../lib/utils'

const C: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => {
    api.get<any[]>('/api/invoices').then(setInvoices).catch(() => {})
  }, [])

  const filtered = invoices.filter(i => !search || i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ padding: 28, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.5px' }}>Invoices</h1>
        <p style={{ fontSize: 13, color: '#475569', marginTop: 3 }}>Monthly GST-compliant invoices for your settlements</p>
      </div>

      {/* Info banner */}
      <div style={{ ...C, padding: '14px 18px', background: 'rgba(96,165,250,0.05)', border: '1px solid rgba(96,165,250,0.15)' }}>
        <p style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600, marginBottom: 4 }}>About Invoices</p>
        <p style={{ fontSize: 12, color: '#475569' }}>Invoices are auto-generated on the 1st of each month after any settlement in the previous month. All invoices are GST-compliant and usable for tax filing.</p>
      </div>

      {/* Filters */}
      <div style={{ ...C, padding: '13px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice number e.g. INV-2026-0001…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: '#e2e8f0' }} />
      </div>

      {/* Table */}
      <div style={{ ...C, overflow: 'hidden', flex: 1 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>No invoices yet</p>
            <p style={{ fontSize: 13, color: '#475569' }}>Invoices appear after your first settlement. Settle your earnings to generate your first invoice.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Invoice #', 'Period', 'Gross', 'Fee', 'Net', 'Generated', ''].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#334155', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv: any, i: number) => (
                <tr key={inv.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <td style={{ padding: '14px 18px', fontFamily: 'monospace', fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: '#475569' }}>{formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}</td>
                  <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600, color: '#10b981' }}>{formatINR(Number(inv.grossAmount))}</td>
                  <td style={{ padding: '14px 18px', fontSize: 13, color: '#f87171' }}>{formatINR(Number(inv.feeAmount))}</td>
                  <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 700, color: '#60a5fa' }}>{formatINR(Number(inv.netAmount))}</td>
                  <td style={{ padding: '14px 18px', fontSize: 12, color: '#334155' }}>{formatDate(inv.generatedAt)}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <a href={`/api/invoices/${inv.id}/download`} style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', textDecoration: 'none' }}>
                      Download PDF →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
