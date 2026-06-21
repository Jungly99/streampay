'use client'
import { useEffect, useState } from 'react'
import { api } from '../../../lib/api'
import Button from '../../../components/ui/Button'
import Input from '../../../components/ui/Input'
import toast from 'react-hot-toast'

export default function ViewerProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get<any>('/api/viewer/profile').then(p => {
      setProfile(p)
      setDisplayName(p.displayName ?? '')
    }).catch(() => {})
  }, [])

  async function save() {
    setLoading(true)
    try {
      await api.patch('/api/viewer/profile', { displayName })
      toast.success('Profile updated')
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-4">👤 My Profile</h2>
      <div className="glass-card p-6 space-y-5 max-w-lg">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-bold">
            {displayName?.[0] ?? 'V'}
          </div>
          <div>
            <p className="font-bold text-white text-lg">{displayName}</p>
            <p className="text-xs text-slate-500">{profile?.email}</p>
          </div>
        </div>
        <Input label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
        <Button onClick={save} loading={loading}>Save Changes</Button>
      </div>
    </div>
  )
}
