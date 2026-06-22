'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const [secret, setSecret] = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/backend/api/admin/stats', {
      headers: { 'x-admin-secret': secret },
    })

    if (res.ok) {
      sessionStorage.setItem('admin_secret', secret)
      router.push('/admin')
    } else {
      setError('Invalid admin password')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1a1a2e', border: '1px solid #2d2d4e', borderRadius: 16, padding: 40, width: 360 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>eztips Admin</h1>
        <p style={{ color: '#888', fontSize: 14, marginBottom: 28 }}>Backend team access only</p>

        <form onSubmit={handleLogin}>
          <label style={{ display: 'block', color: '#aaa', fontSize: 13, marginBottom: 6 }}>Admin Password</label>
          <input
            type="password"
            value={secret}
            onChange={e => setSecret(e.target.value)}
            placeholder="Enter admin secret"
            required
            style={{ width: '100%', padding: '10px 14px', background: '#0f0f1a', border: '1px solid #2d2d4e', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
          />
          {error && <p style={{ color: '#f87171', fontSize: 13, marginTop: 8 }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 20, width: '100%', padding: '11px 0', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Checking…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
