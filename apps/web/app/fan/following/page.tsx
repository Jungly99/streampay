'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

export default function FollowingPage() {
  const [follows, setFollows] = useState<any[]>([])

  useEffect(() => {
    api.get<any[]>('/api/viewer/following').then(setFollows).catch(() => {})
  }, [])

  async function unfollow(username: string) {
    try {
      await api.delete(`/api/viewer/follow/${username}`)
      setFollows(f => f.filter(x => x.streamer.username !== username))
      toast.success('Unfollowed')
    } catch (e: any) { toast.error(e.message) }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">👥 Following ({follows.length})</h2>
      {follows.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-3">👥</div>
          <p className="text-white font-semibold">Not following anyone yet</p>
          <Link href="/fan/find-streamer" className="text-purple-400 text-sm mt-2 inline-block hover:text-purple-300 underline">Find streamers to follow</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {follows.map(f => (
            <div key={f.id} className="glass-card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white font-bold">
                {f.streamer.channelName?.[0] ?? 'S'}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">{f.streamer.channelName}</p>
                <p className="text-xs text-slate-500">@{f.streamer.username}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/send-message/${f.streamer.username}`}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                  Support
                </Link>
                <button onClick={() => unfollow(f.streamer.username)}
                  className="text-xs text-slate-400 hover:text-red-400 border border-white/10 px-3 py-1.5 rounded-lg transition-colors">
                  Unfollow
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
