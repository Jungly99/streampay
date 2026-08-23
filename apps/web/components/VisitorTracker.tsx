'use client'
import { useEffect } from 'react'

export default function VisitorTracker({ page }: { page: 'website' | 'dashboard' }) {
  useEffect(() => {
    const url = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000') + '/api/track/visit'
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page }),
    }).catch(() => {})
  }, [page])
  return null
}
