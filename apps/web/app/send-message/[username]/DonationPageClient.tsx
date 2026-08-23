'use client'
import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { api } from '../../../lib/api'
import { formatINR } from '../../../lib/utils'
import { useIsMobile } from '../../../lib/useIsMobile'
import type { DonationPageStreamer } from '../../../lib/types'

const ALL_QUICK_AMOUNTS = [50, 100, 250, 500, 1000, 2000, 5000]

const SOCIALS = [
  { key: 'socialTwitter',   icon: '𝕏',  label: 'Twitter',  color: '#e7e7e7' },
  { key: 'socialInstagram', icon: '📷', label: 'Instagram', color: '#e1306c' },
  { key: 'socialYoutube',   icon: '▶',  label: 'YouTube',   color: '#ff4444' },
  { key: 'socialTwitch',    icon: '🎮', label: 'Twitch',    color: '#9146ff' },
  { key: 'socialDiscord',   icon: '💬', label: 'Discord',   color: '#5865f2' },
  { key: 'socialKick',      icon: '🟢', label: 'Kick',      color: '#53fc18' },
] as const

export default function DonationPageClient({ streamer }: { streamer: DonationPageStreamer & { activeGoal?: any } }) {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const saved = localStorage.getItem('donation_page_theme')
    if (saved) setIsDark(saved === 'dark')
  }, [])
  function toggleTheme() {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('donation_page_theme', next ? 'dark' : 'light')
  }
  const isMobile = useIsMobile()

  // Theme-aware colors
  const pageBg      = isDark ? '#07071a' : '#f0f2fc'
  const card        = isDark ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16 } as const
                             : { background: 'rgba(255,255,255,0.9)',  border: '1px solid rgba(100,80,220,0.1)',  borderRadius: 16 } as const
  const inp: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10, fontSize: 14,
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(100,80,220,0.15)',
    color: isDark ? '#f8fafc' : '#1e1b4b', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const textPrimary  = isDark ? '#f1f5f9' : '#1e1b4b'
  const textSecond   = isDark ? '#94a3b8' : '#4c4a82'
  const textMuted    = isDark ? '#64748b' : '#7c78b8'
  const topBarBg     = isDark ? 'rgba(7,7,26,0.85)' : 'rgba(240,242,252,0.9)'
  const topBarBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(100,80,220,0.1)'
  const subtleBg     = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(100,80,220,0.05)'
  const subtleBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,80,220,0.15)'
  const btnUnselText = isDark ? '#94a3b8' : '#6b6b9a'
  const dividerColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(100,80,220,0.1)'
  const barBg        = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(100,80,220,0.1)'
  const labelColor   = isDark ? '#64748b' : '#6366f1'
  const labelOptColor = isDark ? '#334155' : '#9ca3af'
  const lockedTierBg  = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(100,80,220,0.03)'
  const lockedTierBorder = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(100,80,220,0.1)'
  const lockedAmtColor = isDark ? '#475569' : '#9ca3af'
  const lockedCharsColor = isDark ? '#334155' : '#9ca3af'
  const secureTextColor = isDark ? '#475569' : '#6b6b9a'

  const [amount, setAmount] = useState<number | ''>('')
  const [customAmount, setCustomAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'text' | 'voice'>('text')
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const emojiBtnRef = useRef<HTMLButtonElement | null>(null)
  const [emojiPos, setEmojiPos] = useState<{top:number;right:number}|null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  // Server handles YouTube detection (redirect method). Kick is checked client-side
  // because Kick blocks requests from cloud/datacenter server IPs.
  const [liveInfo, setLiveInfo] = useState<typeof streamer.liveStream>(streamer.liveStream ?? null)

  useEffect(() => {
    if (!streamer.streamEmbedEnabled || !streamer.socialKick) return
    const raw = streamer.socialKick
    const username = raw.replace(/https?:\/\/(www\.)?kick\.com\//i, '').split('/')[0]?.split('?')[0]?.trim()
    if (!username) return
    fetch(`https://kick.com/api/v2/channels/${username}/livestream`, { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(d => {
        if (d?.data) setLiveInfo({ platform: 'kick', embedUrl: `https://player.kick.com/${username}?autoplay=true`, chatUrl: null })
      })
      .catch(() => {})
  }, [streamer.streamEmbedEnabled, streamer.socialKick])

  const streamerCustomEmojis: string[] = (streamer as any).customEmojis ?? []
  // Only add the streamer tab for actual text/unicode emojis (not image uploads)
  const streamerTextEmojis = streamerCustomEmojis.filter(e => !e.startsWith('data:') && !e.startsWith('http'))
  const EMOJI_CATEGORIES = [
    ...(streamerTextEmojis.length ? [{ label: '⭐ Streamer', emojis: streamerTextEmojis }] : []),
    { label: '😊 Faces', emojis: ['😂','😍','🥰','😭','😎','🤣','🥳','😤','😊','🤩','😏','🥺','😢','😠','🤯','😱','🤔','🙄','😴','🤫','🫡','😇','🥶','🥵','😈','👿','🤑','😋','😜','🤪','😝','🫠','🤗','😔','😞','🫥'] },
    { label: '👋 Hands', emojis: ['👏','🙏','💪','🤝','👊','✊','🤜','🤛','🫶','❤️','🖐️','✌️','🤞','🤟','🤘','👌','🤌','🫰','👈','👉','👆','👇','☝️','💅','🤙','👋','🤚','🖖','💪'] },
    { label: '❤️ Hearts', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💓','💗','💖','💘','💝','💟','♥️','❣️','💔','❤️‍🔥','❤️‍🩹'] },
    { label: '🎉 Celebration', emojis: ['🎉','🎊','🎈','🎁','🏆','🥇','🥈','🥉','🎯','🎮','🎲','🎰','🎳','🎪','🎭','🎨','🎤','🎧','🎸','🎵','🎶','🎺','🥁','🎷'] },
    { label: '🔥 Hype', emojis: ['🔥','⚡','💥','✨','🌟','💫','⭐','🌙','☀️','🌈','💯','💸','👑','💎','🚀','🛸','⚔️','🗡️','🏅','🐐','👾','🤖','👽','💀','☠️','🫧'] },
    { label: '🐾 Animals', emojis: ['🐐','🦁','🐯','🦊','🐺','🦝','🐸','🐧','🦅','🦋','🐉','🦄','🐢','🦈','🦍','🐻','🐼','🐨','🦘','🐮','🐷','🦙','🦒','🦓'] },
  ]
  const [emojiTab, setEmojiTab] = useState(0)
  const [inlineStickers, setInlineStickers] = useState<string[]>([])

  function insertEmoji(emoji: string) {
    const ta = textareaRef.current
    if (!ta) { setMessage(m => (m + emoji).slice(0, charLimit)); return }
    const start = ta.selectionStart ?? message.length
    const end = ta.selectionEnd ?? message.length
    const next = (message.slice(0, start) + emoji + message.slice(end)).slice(0, charLimit)
    setMessage(next)
    setTimeout(() => { ta.focus(); const pos = start + emoji.length; ta.setSelectionRange(pos, pos) }, 0)
  }

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
        { streamerId: streamer.id, donorName: donorName.trim() || 'Anonymous', message: message.trim() || undefined, amount: finalAmount, stickerIndexes: inlineStickers.length ? inlineStickers.map(url => streamerCustomEmojis.indexOf(url)).filter(i => i !== -1) : undefined }
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
        prefill: { name: donorName.trim(), email: 'donor@eztips.live', contact: '' },
        readonly: { email: true, name: true },
        theme: { color: '#7c3aed' },
        modal: { ondismiss: () => setLoading(false) },
      })
      rzp.open()
    } catch (e: any) { toast.error(e.message); setLoading(false) }
  }

  const sortedTiers = [...(streamer.messageTiers ?? [])].sort((a, b) => a.minAmount - b.minAmount)
  const showStream = !isMobile && !!liveInfo

  return (
    <div style={{ minHeight: '100vh', background: pageBg, color: textPrimary, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>

      {/* Top bar */}
      <div style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(100,80,220,0.08)'}`, padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: topBarBg, backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo.png" alt="EzTips" style={{ height: 28, width: 'auto', borderRadius: 7, filter: 'drop-shadow(0 0 6px rgba(124,58,237,0.5))' }} />
        </a>
        <span style={{ fontSize: 12, color: textMuted }}>· 0% fee on viewers · Secured by Razorpay</span>
        <button onClick={toggleTheme} title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(100,80,220,0.2)'}`, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(100,80,220,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
          {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* ── STREAM MODE: 2-panel layout ── */}
      {showStream && liveInfo && (
        <div style={{ display: 'flex', height: 'calc(100vh - 50px)', overflow: 'hidden' }}>

          {/* Left: stream + chat */}
          <div style={{ flex: '0 0 62%', display: 'flex', flexDirection: 'column', background: '#000', overflow: 'hidden', borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,80,220,0.1)'}` }}>
            {/* Stream iframe */}
            <div style={{ flex: liveInfo.chatUrl ? '0 0 65%' : 1, position: 'relative' }}>
              <iframe
                src={liveInfo.embedUrl}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
                allowFullScreen
                allow="autoplay; fullscreen; picture-in-picture; microphone; camera"
                title={`${streamer.channelName} live stream`}
              />
            </div>
            {/* Chat (Twitch) */}
            {liveInfo.chatUrl && (
              <div style={{ flex: '0 0 35%', borderTop: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <iframe
                  src={liveInfo.chatUrl}
                  style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                  title="Stream chat"
                />
              </div>
            )}
          </div>

          {/* Right: scrollable donation panel */}
          <div style={{ flex: '0 0 38%', overflowY: 'auto', background: pageBg, display: 'flex', flexDirection: 'column', gap: 12, padding: '0 0 24px' }}>

            {/* Profile header (no banner in stream mode) */}
            <div style={{ ...card, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {streamer.avatarUrl
                ? <img src={streamer.avatarUrl} alt={streamer.channelName} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(124,58,237,0.4)' }} />
                : <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white', flexShrink: 0 }}>{streamer.channelName?.[0]?.toUpperCase() ?? 'S'}</div>
              }
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: textPrimary, letterSpacing: '-0.3px' }}>{streamer.channelName}</span>
                  {streamer.isVerified && <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: '2px 7px', borderRadius: 20 }}>✓ Verified</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', padding: '2px 7px', borderRadius: 20, animation: 'pulse 2s infinite' }}>🔴 LIVE</span>
                </div>
                {streamer.bio && <p style={{ fontSize: 11, color: textMuted, margin: '0 0 6px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{streamer.bio}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  {(() => {
                    const links = SOCIALS.filter(s => (streamer as any)[s.key])
                    return links.length > 0 ? (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {links.map(s => (
                          <a key={s.key} href={(streamer as any)[s.key]} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 20, background: `${s.color}12`, border: `1px solid ${s.color}30`, fontSize: 10, fontWeight: 600, color: s.color, textDecoration: 'none' }}>
                            <span>{s.icon}</span> {s.label}
                          </a>
                        ))}
                      </div>
                    ) : null
                  })()}
                  {streamer.channelLink && (
                    <a href={streamer.channelLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#a78bfa', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>🔗 Visit Channel</a>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 14px' }}>

            {/* Goal (if active) */}
            {streamer.activeGoal && (() => {
              const g = streamer.activeGoal
              const pct = Math.min((g.currentAmount / Math.max(g.targetAmount, 1)) * 100, 100)
              return (
                <div style={{ ...card, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: textPrimary }}>{g.title}</span>
                    <span style={{ fontSize: 11, color: textMuted }}>₹{g.currentAmount.toLocaleString('en-IN')} / ₹{g.targetAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ height: 8, background: barBg, borderRadius: 8 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#db2777)', borderRadius: 8, transition: 'width 0.6s' }} />
                  </div>
                  <p style={{ fontSize: 11, color: textMuted, marginTop: 5 }}>{Math.round(pct)}% reached</p>
                </div>
              )
            })()}

            {/* Amount selector */}
            <div style={{ ...card, padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: textSecond, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 10px' }}>Select Amount</p>
              <input type="number" value={customAmount} min={streamer.minDonationAmount} max={10000}
                onChange={e => { setCustomAmount(e.target.value); setAmount('') }}
                placeholder={`Custom (₹${streamer.minDonationAmount}–₹10,000)`}
                style={{ ...inp, marginBottom: 10, fontSize: 13 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
                {ALL_QUICK_AMOUNTS.filter(a => a >= streamer.minDonationAmount).slice(0, 6).map(a => {
                  const isCelebrity = streamer.celebrityVoiceEnabled && a >= (streamer.celebrityVoiceMinAmount ?? 1000)
                  const isSelected = amount === a
                  return (
                    <button key={a} onClick={() => selectAmount(a)} style={{
                      padding: '10px 0', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', position: 'relative',
                      background: isSelected ? 'linear-gradient(135deg,#7c3aed,#db2777)' : isCelebrity ? 'rgba(245,158,11,0.06)' : subtleBg,
                      border: isSelected ? '1.5px solid transparent' : `1.5px solid ${isCelebrity ? 'rgba(245,158,11,0.3)' : subtleBorder}`,
                      color: isSelected ? 'white' : isCelebrity ? '#f59e0b' : btnUnselText,
                      boxShadow: isSelected ? '0 4px 16px rgba(124,58,237,0.4)' : 'none',
                    }}>
                      {isCelebrity && <span style={{ position: 'absolute', top: -6, right: -4, fontSize: 8, fontWeight: 800, background: '#f59e0b', color: '#000', padding: '1px 4px', borderRadius: 8 }}>🎤</span>}
                      ₹{a.toLocaleString('en-IN')}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Donor name + message + pay */}
            <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                  Your Name <span style={{ fontWeight: 400, textTransform: 'none', color: labelOptColor }}>(optional)</span>
                </label>
                <input value={donorName} onChange={e => setDonorName(e.target.value)} maxLength={30} placeholder="Anonymous" style={{ ...inp, fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Message <span style={{ fontWeight: 400, textTransform: 'none', color: labelOptColor }}>(optional)</span></label>
                <textarea value={message} onChange={e => setMessage(e.target.value.slice(0, charLimit))} rows={3}
                  placeholder="Write something for the streamer…"
                  style={{ ...inp, resize: 'none', fontFamily: 'inherit', fontSize: 13 }} />
                <span style={{ fontSize: 11, color: labelOptColor }}>{message.length}/{charLimit}</span>
              </div>
              {finalAmount > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 9, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>Sending</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: '#a78bfa' }}>{formatINR(finalAmount)}</span>
                </div>
              )}
              <button onClick={handlePay} disabled={loading || !finalAmount} style={{
                width: '100%', padding: '14px', borderRadius: 11, fontSize: 15, fontWeight: 800,
                cursor: !finalAmount ? 'not-allowed' : 'pointer',
                background: !finalAmount ? subtleBg : 'linear-gradient(135deg,#7c3aed,#db2777)',
                border: `1px solid ${!finalAmount ? subtleBorder : 'transparent'}`, color: !finalAmount ? btnUnselText : 'white',
                boxShadow: !finalAmount ? 'none' : '0 4px 20px rgba(124,58,237,0.5)',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
              }}>
                {loading ? '⏳ Opening payment…' : finalAmount ? `Pay ${formatINR(finalAmount)} →` : 'Select an amount'}
              </button>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: 11, color: secureTextColor }}>🔒 Secured by Razorpay · UPI, Cards, Net Banking</span>
              </div>
            </div>

            {/* Top supporters */}
            {leaderboard.length > 0 && (
              <div style={{ ...card, padding: '14px 16px' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: textSecond, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 12px' }}>🏆 Top Supporters</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {leaderboard.slice(0, 5).map((l, i) => (
                    <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 20, fontSize: 14, flexShrink: 0 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${l.rank}`}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: i === 0 ? '#fbbf24' : textSecond, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: i === 0 ? '#fbbf24' : '#a78bfa', flexShrink: 0, marginLeft: 6 }}>{formatINR(l.total)}</span>
                        </div>
                        <div style={{ height: 3, background: barBg, borderRadius: 3 }}>
                          <div style={{ height: '100%', width: `${(l.total / leaderboard[0].total) * 100}%`, background: i === 0 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#7c3aed,#db2777)', borderRadius: 3 }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>{/* end inner padding wrapper */}
          </div>
        </div>
      )}

      {/* ── NORMAL MODE ── */}
      {!showStream && (<>

      {/* ── HERO (full-width) ── */}
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '24px 20px 0' }}>
        <div style={{ ...card, overflow: 'hidden', marginBottom: 24, backdropFilter: 'blur(8px)' }}>
          {/* Banner */}
          <div style={{ position: 'relative', background: streamer.bannerUrl ? '#000' : 'linear-gradient(135deg,#3b0764 0%,#701a75 50%,#1e1b4b 100%)', overflow: 'hidden' }}>
            {streamer.bannerUrl ? (
              <img src={streamer.bannerUrl} alt="" style={{ width: '100%', display: 'block', maxHeight: 260, objectFit: 'cover', objectPosition: 'center center' }} />
            ) : (
              <div style={{ height: 160 }}>
                <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(45deg,rgba(255,255,255,0.02) 0px,rgba(255,255,255,0.02) 1px,transparent 1px,transparent 20px)' }} />
              </div>
            )}
          </div>
          <div style={{ padding: '0 28px 24px' }}>
            {/* Avatar — overlaps banner with negative margin */}
            <div style={{ marginTop: -42, marginBottom: 14, position: 'relative', zIndex: 1 }}>
              {streamer.avatarUrl ? (
                <img src={streamer.avatarUrl} alt={streamer.channelName} style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${pageBg}`, boxShadow: '0 0 0 3px rgba(124,58,237,0.5), 0 8px 24px rgba(0,0,0,0.6)', display: 'block' }} />
              ) : (
                <div style={{ width: 84, height: 84, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'white', border: `3px solid ${pageBg}`, boxShadow: '0 0 0 3px rgba(124,58,237,0.5)' }}>
                  {streamer.channelName?.[0]?.toUpperCase() ?? 'S'}
                </div>
              )}
            </div>

            {/* Title row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: 22, fontWeight: 900, color: textPrimary, margin: 0, letterSpacing: '-0.5px' }}>Support {streamer.channelName}</h1>
                {streamer.isVerified && <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', padding: '3px 10px', borderRadius: 20 }}>✓ Verified</span>}
              </div>
              {streamer.channelLink && (
                <a href={streamer.channelLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#a78bfa', fontWeight: 600, textDecoration: 'none', padding: '5px 12px', borderRadius: 8, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', flexShrink: 0 }}>
                  🔗 Visit Channel
                </a>
              )}
            </div>

            {/* Subtitle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: streamer.bio ? 8 : 0, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: textMuted }}>No account required</span>
              {streamer.bio && <><span style={{ fontSize: 12, color: textMuted }}>·</span><span style={{ fontSize: 12, color: textSecond }}>{streamer.bio}</span></>}
            </div>

            {/* Socials */}
            {(() => {
              const links = SOCIALS.filter(s => (streamer as any)[s.key])
              return links.length > 0 ? (
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {links.map(s => (
                    <a key={s.key} href={(streamer as any)[s.key]} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, background: `${s.color}12`, border: `1px solid ${s.color}30`, fontSize: 12, fontWeight: 600, color: s.color, textDecoration: 'none' }}>
                      <span>{s.icon}</span> {s.label}
                    </a>
                  ))}
                </div>
              ) : null
            })()}
          </div>
        </div>
      </div>

      {/* ── 2-COLUMN GRID ── */}
      <div className="donation-layout">

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Amount selector */}
          <div style={{ ...card, padding: '20px 22px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: textSecond, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 14px' }}>Select Amount</p>

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
                    background: isSelected ? 'linear-gradient(135deg,#7c3aed,#db2777)' : isCelebrity ? 'rgba(245,158,11,0.06)' : subtleBg,
                    border: isSelected ? '1.5px solid transparent' : isCelebrity ? '1.5px solid rgba(245,158,11,0.3)' : `1.5px solid ${subtleBorder}`,
                    color: isSelected ? 'white' : isCelebrity ? '#f59e0b' : btnUnselText,
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
                <span style={{ fontSize: 12, color: secureTextColor }}>100% goes to streamer</span>
              </div>
            )}
          </div>

          {/* Message Tiers */}
          {sortedTiers.length > 0 && (
            <div style={{ ...card, padding: '20px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: textSecond, letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>Message Tiers</p>
                <span style={{ fontSize: 11, color: textMuted }}>Tip more → longer messages</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sortedTiers.map((tier, i) => {
                  const isActive = finalAmount > 0 && finalAmount >= tier.minAmount && (i === sortedTiers.length - 1 || finalAmount < sortedTiers[i + 1]!.minAmount)
                  const isUnlocked = finalAmount >= tier.minAmount
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10, transition: 'all 0.2s',
                      background: isActive ? 'rgba(124,58,237,0.1)' : isUnlocked ? 'rgba(16,185,129,0.05)' : lockedTierBg,
                      border: `1px solid ${isActive ? 'rgba(124,58,237,0.3)' : isUnlocked ? 'rgba(16,185,129,0.2)' : lockedTierBorder}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>{isActive ? '🔓' : isUnlocked ? '✅' : '🔒'}</span>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? '#a78bfa' : isUnlocked ? '#10b981' : lockedAmtColor }}>₹{tier.minAmount}+</span>
                          {isActive && <span style={{ fontSize: 11, color: '#7c3aed', marginLeft: 6, fontWeight: 600 }}>current tier</span>}
                        </div>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isActive ? '#a78bfa' : isUnlocked ? '#10b981' : lockedCharsColor }}>{tier.charLimit} chars</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <div style={{ ...card, padding: '20px 22px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: textSecond, letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 16px' }}>🏆 Top Supporters</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {leaderboard.slice(0, 5).map((l, i) => (
                  <div key={l.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 24, fontSize: 16, flexShrink: 0 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${l.rank}`}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: i === 0 ? '#fbbf24' : textSecond, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: i === 0 ? '#fbbf24' : '#a78bfa', flexShrink: 0, marginLeft: 8 }}>{formatINR(l.total)}</span>
                      </div>
                      <div style={{ height: 4, background: barBg, borderRadius: 4 }}>
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
        <div className="donation-sticky" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ ...card, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: textPrimary, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Your Message</h2>
              <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Anonymous donations welcome — no account needed</p>
            </div>

            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
                Your Name <span style={{ fontWeight: 400, textTransform: 'none', color: labelOptColor }}>(optional)</span>
              </label>
              <input value={donorName} onChange={e => setDonorName(e.target.value)} maxLength={30} placeholder="Anonymous" style={inp} />
              {donorName.length > 0 && (
                <p style={{ fontSize: 11, color: labelOptColor, marginTop: 5 }}>{donorName.length}/30 · Saved for next visit</p>
              )}
            </div>

            {/* Message type toggle */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: labelColor, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Message Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: streamer.voiceMessagesEnabled ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 14 }}>
                <button onClick={() => setMessageType('text')} style={{
                  padding: '11px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  background: messageType === 'text' ? 'rgba(124,58,237,0.15)' : subtleBg,
                  border: `2px solid ${messageType === 'text' ? 'rgba(124,58,237,0.5)' : subtleBorder}`,
                  color: messageType === 'text' ? '#7c3aed' : btnUnselText, transition: 'all 0.15s',
                }}>
                  ✏️ Text
                </button>
                {streamer.voiceMessagesEnabled && (
                  <button onClick={() => setMessageType('voice')} style={{
                    padding: '11px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700, position: 'relative',
                    background: messageType === 'voice' ? 'rgba(219,39,119,0.15)' : subtleBg,
                    border: `2px solid ${messageType === 'voice' ? 'rgba(219,39,119,0.5)' : subtleBorder}`,
                    color: messageType === 'voice' ? '#db2777' : btnUnselText, transition: 'all 0.15s',
                  }}>
                    🎙 Voice
                    <span style={{ position: 'absolute', top: -7, right: -4, fontSize: 9, fontWeight: 800, background: '#db2777', color: 'white', padding: '1px 5px', borderRadius: 10 }}>NEW</span>
                  </button>
                )}
              </div>

              {messageType === 'text' && (
                <div style={{ position: 'relative' }}>
                  {/* Quick-tap custom image emojis */}
                  {streamerCustomEmojis.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: textMuted }}>Quick:</span>
                      {streamerCustomEmojis.map((e, idx) => {
                        const isImg = e.startsWith('data:') || e.startsWith('http')
                        const isSelected = isImg && inlineStickers.includes(e)
                        return (
                          <button key={idx} type="button"
                            onClick={() => isImg
                              ? setInlineStickers(prev => prev.includes(e) ? prev.filter(x => x !== e) : [...prev, e])
                              : insertEmoji(e)}
                            style={{ width: 34, height: 34, borderRadius: 9, padding: 2, cursor: 'pointer', background: isSelected ? 'rgba(124,58,237,0.2)' : subtleBg, border: `1.5px solid ${isSelected ? '#7c3aed' : subtleBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', overflow: 'hidden', flexShrink: 0 }}
                            title={isSelected ? 'Click to remove' : 'Click to add'}>
                            {isImg
                              ? <img src={e} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 6 }} />
                              : <span style={{ fontSize: 20 }}>{e}</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Message box — stickers + textarea in ONE bordered container */}
                  <div style={{ ...inp, padding: 0, overflow: 'hidden' }}>
                    {/* Selected image stickers shown as small emoji row inside the box */}
                    {inlineStickers.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '8px 12px 4px', borderBottom: `1px solid ${subtleBorder}` }}>
                        {inlineStickers.map((src, i) => (
                          <div key={i} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                            <img src={src} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6, display: 'block' }} />
                            <button type="button"
                              onClick={() => setInlineStickers(prev => prev.filter((_, j) => j !== i))}
                              style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                              ×
                            </button>
                          </div>
                        ))}
                        <span style={{ fontSize: 10, color: textMuted, alignSelf: 'center', marginLeft: 2 }}>will show on alert</span>
                      </div>
                    )}

                    {/* Textarea */}
                    <div style={{ position: 'relative' }}>
                      <textarea ref={textareaRef} value={message} onChange={e => setMessage(e.target.value.slice(0, charLimit))} rows={4}
                        placeholder="Write something for the streamer… (optional)"
                        style={{ width: '100%', padding: '10px 44px 10px 12px', background: 'transparent', border: 'none', outline: 'none', resize: 'none' as const, color: 'var(--text-1)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
                      <button ref={emojiBtnRef} onClick={() => {
                        if (showEmoji) { setShowEmoji(false); setEmojiPos(null); return }
                        const r = emojiBtnRef.current?.getBoundingClientRect()
                        if (r) setEmojiPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
                        setShowEmoji(true)
                      }} style={{ position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 7, border: `1px solid ${subtleBorder}`, background: showEmoji ? 'rgba(124,58,237,0.15)' : subtleBg, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        😊
                      </button>
                      {showEmoji && emojiPos && (
                        <>
                          <div onClick={() => { setShowEmoji(false); setEmojiPos(null) }} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                          <div style={{ position: 'fixed', top: emojiPos.top, right: emojiPos.right, zIndex: 50, borderRadius: 14, background: isDark ? '#12122a' : '#fff', border: `1px solid ${subtleBorder}`, boxShadow: '0 8px 32px rgba(0,0,0,0.45)', width: 300 }}>
                            <div style={{ display: 'flex', overflowX: 'auto', padding: '8px 8px 0', gap: 4, borderBottom: `1px solid ${dividerColor}`, scrollbarWidth: 'none' as any }}>
                              {EMOJI_CATEGORIES.map((cat, i) => (
                                <button key={i} onClick={() => setEmojiTab(i)} style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', background: emojiTab === i ? 'rgba(124,58,237,0.18)' : 'transparent', color: emojiTab === i ? '#a78bfa' : textMuted }}>
                                  {cat.label}
                                </button>
                              ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 2, padding: 10, maxHeight: 240, overflowY: 'auto' }}>
                              {EMOJI_CATEGORIES[emojiTab]?.emojis.map(e => (
                                <button key={e} onClick={() => { insertEmoji(e); setShowEmoji(false); setEmojiPos(null) }} style={{ width: 34, height: 34, borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  onMouseEnter={ev => (ev.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(100,80,220,0.1)')}
                                  onMouseLeave={ev => (ev.currentTarget.style.background = 'transparent')}>
                                  {e}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: message.length > charLimit * 0.8 ? '#f59e0b' : labelOptColor }}>{message.length}/{charLimit} characters</span>
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
            <div style={{ height: 1, background: dividerColor }} />

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
                background: !finalAmount ? subtleBg : 'linear-gradient(135deg,#7c3aed,#db2777)',
                border: `1px solid ${!finalAmount ? subtleBorder : 'transparent'}`, color: !finalAmount ? btnUnselText : 'white',
                boxShadow: !finalAmount ? 'none' : '0 4px 24px rgba(124,58,237,0.5)',
                opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                letterSpacing: '-0.3px',
              }}>
                {loading ? '⏳ Opening payment…' : finalAmount ? `Pay ${formatINR(finalAmount)} →` : 'Select an amount'}
              </button>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
                <span style={{ fontSize: 12, color: secureTextColor }}>🔒</span>
                <span style={{ fontSize: 12, color: secureTextColor }}>Secured by Razorpay · UPI, Cards, Net Banking</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      </>)}
    </div>
  )
}
