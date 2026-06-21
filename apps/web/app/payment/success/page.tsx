'use client'
import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../../lib/api'

function SuccessContent() {
  const params = useSearchParams()
  const orderId = params.get('order_id')
  const donationId = params.get('donation_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'pending'>('loading')

  useEffect(() => {
    if (!donationId) { setStatus('pending'); return }
    let attempts = 0
    const poll = async () => {
      try {
        const data = await api.get<{ status: string }>(`/api/donations/${donationId}/status`)
        if (data.status === 'SUCCESS') { setStatus('success'); return }
        if (++attempts < 10) setTimeout(poll, 1500)
        else setStatus('pending')
      } catch { setStatus('pending') }
    }
    poll()
  }, [donationId])

  return (
    <div className="glass-card p-12 text-center max-w-md w-full">
      {status === 'loading' && (
        <>
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-white font-semibold text-lg">Confirming your payment...</p>
          <p className="text-slate-400 text-sm mt-2">Just a moment</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="text-7xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-2">Thank You!</h1>
          <p className="text-slate-400 mb-6">Your donation was successful. The streamer will see it live on stream!</p>
          <div className="text-5xl mb-6">💸</div>
          <Link href="/" className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-3 rounded-xl inline-block hover:opacity-90 transition-opacity">
            Back to Home
          </Link>
        </>
      )}
      {status === 'pending' && (
        <>
          <div className="text-7xl mb-6">⏳</div>
          <h1 className="text-2xl font-bold text-white mb-2">Payment Processing</h1>
          <p className="text-slate-400 mb-6">Your payment is being processed. If deducted, it will be confirmed shortly.</p>
          <p className="text-xs text-slate-600 mb-6">Order ID: {orderId}</p>
          <Link href="/" className="text-purple-400 hover:text-purple-300 underline text-sm">Back to Home</Link>
        </>
      )}
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="glass-card p-12 text-center max-w-md w-full">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-6" />
          <p className="text-white">Loading...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
