'use client'
import { useState } from 'react'
import Link from 'next/link'

const RZP_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? ''

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Razorpay'))
    document.head.appendChild(s)
  })
}

const QUICK_AMOUNTS = [11, 51, 101, 251, 501, 1001]

const PERKS = [
  { icon: '⚡', title: 'Keep servers running', desc: 'Hosting, bandwidth, DB — every rupee helps keep eztips alive 24/7' },
  { icon: '🚀', title: 'Fund new features', desc: 'More overlay templates, better TTS, mobile app — your support builds it' },
  { icon: '🔒', title: 'Stay ad-free', desc: 'We never sell data or show ads. Supporter donations keep it that way' },
  { icon: '💜', title: 'Support indie dev', desc: 'Built by a small team for Indian streamers — not a VC-backed startup' },
]

export default function SupportUsPage() {
  const [amount, setAmount] = useState<number | ''>('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [paidAmount, setPaidAmount] = useState(0)

  async function pay() {
    const amt = Number(amount)
    if (!amt || amt < 1) return
    setLoading(true)
    try {
      await loadRazorpay()
      const res = await fetch('/backend/api/support/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error); setLoading(false); return }

      const rzp = new (window as any).Razorpay({
        key: RZP_KEY,
        order_id: data.orderId,
        amount: data.amount,
        currency: 'INR',
        name: 'eztips',
        description: 'Support eztips — keep the platform alive ❤️',
        prefill: { name: name || undefined },
        theme: { color: '#7c3aed' },
        handler: (resp: any) => {
          fetch('/backend/api/support/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderId, paymentId: resp.razorpay_payment_id }),
          }).catch(() => {})
          setPaidAmount(amt); setPaid(true)
        },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch (e: any) { alert(e?.message ?? 'Something went wrong'); setLoading(false) }
  }

  const S: React.CSSProperties = {
    minHeight: '100vh', background: '#06060f',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    color: '#f8fafc',
  }

  if (paid) return (
    <div style={{ ...S, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 460, width: '100%', margin: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 20, lineHeight: 1 }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.5px' }}>Thank you so much!</h1>
        <p style={{ fontSize: 16, color: '#64748b', margin: '0 0 8px', lineHeight: 1.6 }}>
          Your <strong style={{ color: '#a78bfa' }}>₹{paidAmount}</strong> donation means the world to us.
        </p>
        <p style={{ fontSize: 14, color: '#475569', margin: '0 0 32px', lineHeight: 1.6 }}>
          It goes directly towards keeping eztips running and building better tools for Indian streamers. 💜
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ padding: '12px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: 'white', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Back to Dashboard
          </Link>
          <button onClick={() => { setPaid(false); setAmount(''); setName(''); setMessage('') }} style={{ padding: '12px 24px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Donate Again
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S}>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 13, color: 'white' }}>ez</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#f1f5f9' }}>eztips</span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}>← Back to Dashboard</Link>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18, padding: '6px 16px', borderRadius: 20, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <span style={{ fontSize: 14 }}>💜</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em' }}>SUPPORT EZTIPS</span>
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, margin: '0 0 16px', letterSpacing: '-1px', lineHeight: 1.1 }}>
            Help keep eztips alive
          </h1>
          <p style={{ fontSize: 17, color: '#64748b', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            We're a small team building the best donation platform for Indian streamers.
            Every rupee — even just ₹1 — helps us keep the lights on.
          </p>
        </div>

        {/* 2-col layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 32, alignItems: 'start' }}>

          {/* Left — perks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#94a3b8', margin: '0 0 4px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Where your support goes</h2>
            {PERKS.map(p => (
              <div key={p.title} style={{ padding: '20px 22px', borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{p.icon}</div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', margin: '0 0 4px' }}>{p.title}</p>
                  <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
                </div>
              </div>
            ))}

            <div style={{ padding: '20px 22px', borderRadius: 16, background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(219,39,119,0.06))', border: '1px solid rgba(124,58,237,0.15)', marginTop: 4 }}>
              <p style={{ fontSize: 13, color: '#7c3aed', fontWeight: 700, margin: '0 0 6px' }}>🇮🇳 Made for Indian streamers</p>
              <p style={{ fontSize: 13, color: '#475569', margin: 0, lineHeight: 1.6 }}>
                5% platform fee — the lowest in India. No viewer signups. Instant overlay alerts.
                UPI support. GST invoices. We built everything you asked for.
              </p>
            </div>
          </div>

          {/* Right — donation form */}
          <div style={{ padding: '28px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 24 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', margin: '0 0 20px', letterSpacing: '-0.3px' }}>Choose an amount</h2>

            {/* Quick amounts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
              {QUICK_AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(a)} style={{
                  padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: amount === a ? 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(219,39,119,0.15))' : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${amount === a ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: amount === a ? '#a78bfa' : '#64748b',
                  transition: 'all 0.15s',
                }}>₹{a}</button>
              ))}
            </div>

            {/* Custom amount */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Or enter custom amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: 14, fontWeight: 700 }}>₹</span>
                <input
                  type="number" min={1} placeholder="Any amount"
                  value={amount}
                  onChange={e => setAmount(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', padding: '11px 14px 11px 28px', borderRadius: 10, fontSize: 14, fontWeight: 600, boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', outline: 'none' }}
                />
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Your name (optional)</label>
              <input
                type="text" placeholder="Anonymous" maxLength={40}
                value={name} onChange={e => setName(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', outline: 'none' }}
              />
            </div>

            {/* Message */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 7 }}>Message (optional)</label>
              <textarea
                placeholder="Leave us a note…" maxLength={200} rows={2}
                value={message} onChange={e => setMessage(e.target.value)}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 13, boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc', outline: 'none', resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            {/* Pay button */}
            <button onClick={pay} disabled={!amount || Number(amount) < 1 || loading} style={{
              width: '100%', padding: '15px', borderRadius: 13, fontSize: 16, fontWeight: 800, cursor: (!amount || Number(amount) < 1 || loading) ? 'not-allowed' : 'pointer',
              background: (!amount || Number(amount) < 1) ? 'rgba(124,58,237,0.2)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
              border: 'none', color: (!amount || Number(amount) < 1) ? '#4c3a78' : 'white',
              transition: 'all 0.2s', boxShadow: (amount && Number(amount) >= 1) ? '0 4px 24px rgba(124,58,237,0.4)' : 'none',
              letterSpacing: '-0.3px',
            }}>
              {loading ? '⏳ Opening payment…' : amount && Number(amount) >= 1 ? `💜 Support with ₹${amount}` : '💜 Support eztips'}
            </button>

            <p style={{ fontSize: 11, color: '#334155', textAlign: 'center', marginTop: 12 }}>
              🔒 Secure payment via Razorpay · UPI, Cards, Net Banking
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
