'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { api } from '../../../lib/api'

export default function FindStreamerPage() {
  const [query, setQuery] = useState('')
  const [streamers, setStreamers] = useState<any[]>([])

  useEffect(() => {
    const t = setTimeout(() => {
      api.get<any[]>(`/api/viewer/find-streamer?q=${encodeURIComponent(query)}`).then(setStreamers).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">🔍 Find a Streamer</h2>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by channel name or username..."
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 mb-4" />

      <div className="space-y-3">
        {streamers.map(s => (
          <div key={s.username} className="glass-card p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {s.channelName?.[0] ?? 'S'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white">{s.channelName}</p>
              <p className="text-xs text-slate-500">@{s.username}</p>
              {s.bio && <p className="text-xs text-slate-400 truncate mt-0.5">{s.bio}</p>}
            </div>
            <div className="flex gap-2">
              {s.isVerified && <span className="text-xs bg-green-500/15 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">✓ Verified</span>}
              <Link href={`/send-message/${s.username}`}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                Support
              </Link>
            </div>
          </div>
        ))}
        {streamers.length === 0 && query && (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">🔍</div>
            <p>No streamers found for &quot;{query}&quot;</p>
          </div>
        )}
      </div>
    </div>
  )
}
