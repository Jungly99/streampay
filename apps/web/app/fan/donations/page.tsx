'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../../../lib/api'
import { formatINR, formatDate } from '../../../lib/utils'

export default function MyDonationsPage() {
  const [donations, setDonations] = useState<any[]>([])

  useEffect(() => {
    api.get<any[]>('/api/viewer/donations').then(setDonations).catch(() => {})
  }, [])

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">💰 My Donations</h2>
      {donations.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-3">💰</div>
          <p className="text-white font-semibold">No donations yet</p>
          <Link href="/fan/find-streamer" className="text-purple-400 text-sm mt-2 inline-block hover:text-purple-300 underline">Support a streamer</Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Streamer', 'Message', 'Amount', 'Date'].map(h => (
                  <th key={h} className="text-left px-5 py-4 text-xs text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {donations.map(d => (
                <tr key={d.id} className="hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-sm font-medium text-white">{d.streamer?.channelName ?? 'Unknown'}</td>
                  <td className="px-5 py-4 text-sm text-slate-400 max-w-[150px] truncate">{d.message ?? '—'}</td>
                  <td className="px-5 py-4 text-sm font-semibold text-green-400">{formatINR(d.amount)}</td>
                  <td className="px-5 py-4 text-xs text-slate-500">{d.paidAt ? formatDate(d.paidAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
