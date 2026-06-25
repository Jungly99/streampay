'use client'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'
import { formatINR } from '../../../lib/utils'
import type { DonationPageStreamer } from '@streampay/types'

const ALL_QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 2000, 5000]

const inp: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  color: '#f8fafc', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
}

const SOCIALS = [
  { key: 'socialTwitter',   icon: '𝕏',  label: 'Twitter',  color: '#e7e7e7' },
  { key: 'socialInstagram', icon: '📷', label: 'Instagram', color: '#e1306c' },
  { key: 'socialYoutube',   icon: '▶',  label: 'YouTube',   color: '#ff4444' },
  { key: 'socialTwitch',    icon: '🎮', label: 'Twitch',    color: '#9146ff' },
  { key: 'socialDiscord',   icon: '💬', label: 'Discord',   color: '#5865f2' },
  { key: 'socialKick',      icon: '🟢', label: 'Kick',      color: '#53fc18' },
] as const

export default function DonationPageClient({ streamer }: { streamer: DonationPageStreamer & { activeGoal?: any } }) {
  const [amount, setAmount] = useState<number | ''>('')
  const [customAmount, setCustomAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'voice'>('text')
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [leaderboard, setLeaderboard] = useState<any[]>([])

  const finalAmount = amount || Number(customAmount) || 0

  function getCharLimit(amt: number): number {
    const tiers = streamer.messageTiers ?? []
    if (!tiers.length) return streamer.messageMaxLength ?? 100
    const sorted = [...tiers].sort((a, b) => a.minAmount - b.minAmount)
    let limit = sorted[0]?.charLimit ?? 100
    for (const t of sorted) { if (amt >= t.minAmount) limit = t.charLimit; else break }
    return limit
  }
  const charLimit = finalAmount > 0 ? getCharLimit(finalAmount) : (streamer.messageTiers?.length ? (streamer.messageTiers[0] as any)?.charLimit ?? 100 : streamer.messageMaxLength ?? 100)

  const allowedVoiceDuration = streamer.voiceTiers
    ?.filter(t => t.isEnabled && finalAmount >= t.minAmount)
    ?.reduce((max, t) => Math.max(max, t.durationSeconds), 0) ?? 0

  useEffect(() => {
    const saved = localStorage.getItem('streampay_donor_name')
    if (saved) setDonorName(saved)
    fetch(`/backend/api/donations/leaderboard/${streamer.username}`)
      .then(r => r.json()).then(setLeaderboard).catch(() => {})
  }, [streamer.username])

  function selectAmount(a: number) { setAmount(a); setCustomAmount('') }

  async function startRecording() {
    if (!allowedVoiceDuration) { toast.error(`Donate ₹${streamer.voiceTiers?.[0]?.minAmount ?? 100}+ to unlock voice`); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      const chunks: Blob[] = []
      mr.ondataavailable = e => chunks.push(e.data)
      mr.onstop = () => { const blob = new Blob(chunks, { type: 'audio/webm' }); setAudioBlob(blob); setAudioUrl(URL.createObjectURL(blob)) }
      mr.start(); setRecording(true); setRecordingTime(0)
      const iv = setInterval(() => setRecordingTime(t => t + 1), 1000)
      timerRef.current = setTimeout(() => { stopRecording(); clearInterval(iv) }, allowedVoiceDuration * 1000)
    } catch { toast.error('Microphone access denied') }
  }

  function stopRecording() { mediaRecorderRef.current?.stop(); if (timerRef.current) clearTimeout(timerRef.current); setRecording(false) }

  async function handlePay() {
    if (!finalAmount || finalAmount < streamer.minDonationAmount) { toast.error(`Minimum: ${formatINR(streamer.minDonationAmount)}`); return }
    if (donorName.trim()) localStorage.setItem('streampay_donor_name', donorName.trim())
    setLoading(true)
    try {
      const res = await api.post<{ donationId: string; razorpayOrderId: string; amount: number; currency: string }>(
        '/api/donations/create-order',
        { streamerId: streamer.id, donorName: donorName.trim() || 'Anonymous', message: message.trim() || undefined, amount: finalAmount }
      )
      await new Promise<void>((resolve, reject) => {
        if ((window as any).Razorpay) { resolve(); return }
        const s = document.createElement('script')
        s.src = 'https://checkout.razorpay.com/v1/checkout.js'
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Failed to load payment gateway'))
        document.head.appendChild(s)
      })
      const rzp = new (window as any).Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: res.amount, currency: res.currency,
        name: 'eztips', description: `Tip to ${streamer.channelName}`,
        order_id: res.razorpayOrderId,
        handler: () => { window.location.href = `/payment/success?donation_id=${res.donationId}` },
        prefill: { name: donorName.trim(), email: 'donor@streampay.in', contact: '9999999999' },
        theme: { color: '#7c3aed' },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch (e: any) { toast.error(e.message); setLoading(false) }
  }

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, backdropFilter: 'blur(8px)',
  }

  const sortedTiers = [...(streamer.messageTiers ?? [])].sort((a, b) => a.minAmount - b.minAmount)

  return (
    <div style={{ minHeight: '100vh', background: '#07071a', color: '#f8fafc', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* Top bar */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 12, color: '#334155' }}>Powered by </span>
        <span style={{ fontSize: 12, fontWeight: 800, background: 'linear-gradient(135deg,#a78bfa,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '0 4px' }}>eztips</span>
        <span style={{ fontSize: 12, color: '#334155' }}> · 0% fee on viewers · Secured by Razorpay</span>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '32px 20px 60px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Streamer hero card */}
          <div style={{ ...card, overflow: 'hidden' }}>
            {/* Banner */}
            <div style={{ height: 90, background: 'linear-gradient(135deg,#3b0764,#701a75,#1e1b4b)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.02) 0px,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 20px)' }} />
            </div>
            <div style={{ padding: '0 24px 24px', marginTop: -40 }}>
              {/* Avatar */}
              <div style={{ marginBottom: 14 }}>
                {streamer.avatarUrl ? (
                  <img src={streamer.avatarUrl} alt={streamer.channelName} style={{ width: 76, height: 76, borderRadius: '50%', objectFit: 'cover', border: '3px solid #07071a', boxShadow: '0 0 0 3px rgba(124,58,237,0.5), 0 8px 24px rgba(0,0,0,0.6)' }} />
                ) : (
                  <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: 'white', border: '3px solid #07071a', boxShadow: '0 0 0 3px rgba(124,58,237,0.5)' }}>
                    {streamer.channelName?.[0]?.toUpperCase() ?? 'S'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 900, color: '#f1f5f9', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
                    Support {streamer.channelName}
                  </h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {streamer.isVerified && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '3px 10px', borderRadius: 20 }}>✓ Verified</span>
                    )}
                    <span style={{ fontSize: 12, color: '#475569' }}>No account required</span>
                  </div>
                </div>
                {streamer.channelLink && (
                  <a href={streamer.channelLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#a78bfa', fontWeight: 600, textDecoration: 'none', padding: '6px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', flexShrink: 0 }}>
                    🔗 Visit Channel
                  </a>
                )}
              </div>

              {streamer.bio && (
                <p style={{ fontSize: 13, color: '#64748b', margin: '14px 0 0', lineHeight: 1.7 }}>{streamer.bio}</p>
              )}

              {/* Socials */}
              {(() => {
                const links = SOCIALS.filter(s => (streamer as any)[s.key])
                return links.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
                    {links.map(s => (
                      <a key={s.key} href={(streamer as any)[s.key]} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: `${s.color}12`, border: `1px solid ${s.color}30`, fontSize: 12, fontWeight: 600, color: s.color, textDecoration: 'none' }}>
                        <span>{s.icon}</span> {s.label}
                      </a>
                    ))}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          {/* Amount selector */}
          <div style={{ ...card, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 14px' }}>Select Amount</p>

            <input type="number" value={customAmount} min={streamer.minDonationAmount} max={10000}
              onChange={e => { setCustomAmount(e.target.value); setAmount('') }}
              placeholder={`Custom amount (₹${streamer.minDonationAmount} – ₹10,000)`}
              style={{ ...inp, marginBottom: 12 }} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {ALL_QUICK_AMOUNTS.filter(a => a >= streamer.minDonationAmount).slice(0, 6).map(a => {
                const isCelebrity = streamer.celebrityVoiceEnabled && a >= (streamer.celebrityVoiceMinAmount ?? 1000)
                const isSelected = amount === a
                return (
                  <button key={a} onClick={() => selectAmount(a)} style={{
                    padding: '13px 0', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    position: 'relative', transition: 'all 0.15s',
                    background: isSelected ? 'linear-gradient(135deg,#7c3aed,#db2777)' : isCelebrity ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.04)',
                    border: isSelected ? '1.5px solid transparent' : isCelebrity ? '1.5px solid rgba(245,158,11,0.3)' : '1.5px solid rgba(255,255,255,0.08)',
                    color: isSelected ? 'white' : isCelebrity ? '#f59e0b' : '#94a3b8',
                    boxShadow: isSelected ? '0 4px 20px rgba(124,58,237,0.4)' : 'none',
                    transform: isSelected ? 'translateY(-1px)' : 'none',
                  }}>
                    {isCelebrity && <span style={{ position: 'absolute', top: -7, right: -4, fontSize: 9, fontWeight: 800, background: '#f59e0b', color: '#000', padding: '1px 5px', borderRadius: 10, letterSpacing: '0.02em' }}>🎤 CELEB</span>}
                    ₹{a.toLocaleString('en-IN')}
                  </button>
                )
              })}
            </div>

            {finalAmount > 0 && (
              <div style={{ marginTop: 14, padding: '11px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Sending {formatINR(finalAmount)}</span>
                <span style={{ fontSize: 12, color: '#334155' }}>100% goes to streamer</span>
              </div>
            )}
          </div>

          {/* Message Tiers */}
          {sortedTiers.length > 0 && (
            <div style={{ ...card, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Message Tiers</p>
                <span style={{ fontSize: 11, color: '#475569' }}>Tip more → longer messages</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sortedTiers.map((tier, i) => {
                  const isActive = finalAmount > 0 && finalAmount >= tier.minAmount && (i === sortedTiers.length - 1 || finalAmount < sortedTiers[i + 1]!.minAmount)
                  const isUnlocked = finalAmount >= tier.minAmount
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10, transition: 'all 0.2s',
                      background: isActive ? 'rgba(124,58,237,0.1)' : isUnlocked ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${isActive ? 'rgba(124,58,237,0.3)' : isUnlocked ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{isActive ? '🔓' : isUnlocked ? '✅' : '🔒'}</span>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#a78bfa' : isUnlocked ? '#10b981' : '#475569' }}>₹{tier.minAmount}+</span>
                          {isActive && <span style={{ fontSize: 11, color: '#7c3aed', marginLeft: 6, fontWeight: 600 }}>current tier</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isActive ? '#a78bfa' : isUnlocked ? '#10b981' : '#334155' }}>{tier.charLimit} chars</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div style={{ ...card, padding: '20px 22px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 16px' }}>🏆 Top Supporters</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leaderboard.slice(0, 5).map((l, i) => (
                  <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 24, fontSize: 16, flexShrink: 0 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${l.rank}`}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? '#fbbf24' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? '#fbbf24' : '#a78bfa', flexShrink: 0, marginLeft: 8 }}>{formatINR(l.total)}</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                        <div style={{ height: 4, borderRadius: 4, background: i === 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#7c3aed,#db2777)', width: `${(l.total / leaderboard[0].total) * 100}%`, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (sticky) ── */}
        <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ ...card, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px', letterSpacing: '-0.3px' }}>Your Message</h2>
              <p style={{ fontSize: 12, color: '#475569', margin: 0 }}>Anonymous donations welcome — no account needed</p>
            </div>

            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Your Name <span style={{ fontWeight: 400, textTransform: 'none', color: '#334155' }}>(optional)</span>
              </label>
              <input value={donorName} onChange={e => setDonorName(e.target.value)} maxLength={30} placeholder="Anonymous" style={inp} />
              {donorName.length > 0 && (
                <p style={{ fontSize: 11, color: '#334155', marginTop: 5 }}>{donorName.length}/30 · Saved for next visit</p>
              )}
            </div>

            {/* Message type toggle */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Message Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: streamer.voiceMessagesEnabled ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 14 }}>
                <button onClick={() => setMessageType('text')} style={{
                  padding: '11px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: messageType === 'text' ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `2px solid ${messageType === 'text' ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                  color: messageType === 'text' ? '#c4b5fd' : '#64748b', transition: 'all 0.15s',
                }}>
                  ✏️ Text
                </button>
                {streamer.voiceMessagesEnabled && (
                  <button onClick={() => setMessageType('voice')} style={{
                    padding: '11px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, position: 'relative',
                    background: messageType === 'voice' ? 'rgba(219,39,119,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${messageType === 'voice' ? 'rgba(219,39,119,0.5)' : 'rgba(255,255,255,0.07)'}`,
                    color: messageType === 'voice' ? '#f9a8d4' : '#64748b', transition: 'all 0.15s',
                  }}>
                    🎙 Voice
                    <span style={{ position: 'absolute', top: -7, right: -4, fontSize: 9, fontWeight: 800, background: '#db2777', color: 'white', padding: '1px 5px', borderRadius: 10 }}>NEW</span>
                  </button>
                )}
              </div>

              {messageType === 'text' && (
                <div>
                  <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, charLimit))} rows={4}
                    placeholder="Write something for the streamer… (optional)"
                    style={{ ...inp, resize: 'none' as const }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: message.length > charLimit * 0.8 ? '#f59e0b' : '#334155' }}>{message.length}/{charLimit} characters</span>
                    {sortedTiers.length > 0 && finalAmount === 0 && (
                      <span style={{ fontSize: 11, color: '#7c3aed' }}>tip more → more chars</span>
                    )}
                  </div>
                </div>
              )}

              {messageType === 'voice' && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  {!audioUrl ? (
                    <>
                      <button onClick={recording ? stopRecording : startRecording} style={{
                        width: 72, height: 72, borderRadius: '50%', cursor: 'pointer', fontSize: 26, border: 'none',
                        background: recording ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
                        boxShadow: recording ? '0 0 0 8px rgba(220,38,38,0.15), 0 0 24px rgba(220,38,38,0.4)' : '0 0 0 8px rgba(124,58,237,0.1), 0 0 24px rgba(124,58,237,0.4)',
                        transition: 'all 0.2s',
                      }}>
                        {recording ? '⏹' : '🎙'}
                      </button>
                      <p style={{ fontSize: 13, color: recording ? '#f87171' : '#475569', marginTop: 14, fontWeight: recording ? 700 : 400 }}>
                        {recording ? `● Recording… ${recordingTime}s / ${allowedVoiceDuration}s` : allowedVoiceDuration ? `Tap to record up to ${allowedVoiceDuration}s` : 'Increase donation to unlock voice'}
                      </p>
                    </>
                  ) : (
                    <div>
                      <audio src={audioUrl} controls style={{ width: '100%', borderRadius: 10 }} />
                      <button onClick={() => { setAudioBlob(null); setAudioUrl('') }} style={{ fontSize: 12, color: '#f87171', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        ↩ Record again
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

            {/* Pay button */}
            <div>
              {finalAmount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>You're sending</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: '#a78bfa', letterSpacing: '-0.5px' }}>{formatINR(finalAmount)}</span>
                </div>
              )}
              <button onClick={handlePay} disabled={loading || !finalAmount} style={{
                width: '100%', padding: '16px', borderRadius: 13, fontSize: 16, fontWeight: 800,
                cursor: !finalAmount ? 'not-allowed' : 'pointer',
                background: !finalAmount ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg,#7c3aed,#db2777)',
                border: 'none', color: !finalAmount ? '#334155' : 'white',
                boxShadow: !finalAmount ? 'none' : '0 4px 24px rgba(124,58,237,0.5)',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                letterSpacing: '-0.3px',
              }}>
                {loading ? '⏳ Opening payment…' : finalAmount ? `Pay ${formatINR(finalAmount)} →` : 'Select an amount'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 12, color: '#1e293b' }}>🔒</span>
                <span style={{ fontSize: 12, color: '#1e293b' }}>Secured by Razorpay · UPI, Cards, Net Banking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
