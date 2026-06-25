'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getSocket } from '../../../lib/socket'
import type { NewDonationEvent, AlertSettings, GoalUpdatedEvent } from '@streampay/types'

interface QueueItem extends NewDonationEvent {
  id: string
}

const AMOUNT_TIERS = [
  { min: 1000, emoji: '👑', color: '#ffd700' },
  { min: 500,  emoji: '🔥', color: '#ff6b35' },
  { min: 100,  emoji: '💜', color: '#8b5cf6' },
  { min: 0,    emoji: '🎉', color: '#06b6d4' },
]

function getTier(amount: number) {
  return AMOUNT_TIERS.find(t => amount >= t.min) ?? AMOUNT_TIERS[AMOUNT_TIERS.length - 1]
}

const ANIMATIONS = {
  slideDown: { initial: { y: -100, opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: -80, opacity: 0 } },
  slideUp:   { initial: { y: 100,  opacity: 0 }, animate: { y: 0, opacity: 1 }, exit: { y: 80,  opacity: 0 } },
  fadeIn:    { initial: { opacity: 0 },           animate: { opacity: 1 },       exit: { opacity: 0 } },
  bounceIn:  { initial: { scale: 0, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0, opacity: 0 }, transition: { type: 'spring' as const, bounce: 0.5 } },
  zoomIn:    { initial: { scale: 0.5, opacity: 0 }, animate: { scale: 1, opacity: 1 }, exit: { scale: 0.5, opacity: 0 } },
  none:      { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
}

function Confetti({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<{ id: number; x: number; color: string; size: number; vx: number; vy: number }[]>([])

  useEffect(() => {
    if (!active) { setParticles([]); return }
    const colors = ['#8b5cf6', '#ec4899', '#06b6d4', '#ffd700', '#ff6b35', '#10b981']
    setParticles(Array.from({ length: 60 }, (_, i) => ({
      id: i, x: 50 + (Math.random() - 0.5) * 40,
      color: colors[Math.floor(Math.random() * colors.length)] as string,
      size: 6 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 8,
      vy: -(3 + Math.random() * 8),
    })))
    const t = setTimeout(() => setParticles([]), 3000)
    return () => clearTimeout(t)
  }, [active])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{ position: 'absolute', left: `${p.x}%`, top: '40%', width: p.size, height: p.size, backgroundColor: p.color, borderRadius: 2 }}
          animate={{ x: p.vx * 40, y: p.vy * 30, opacity: 0, rotate: Math.random() * 720 }}
          transition={{ duration: 2 + Math.random(), ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export default function OverlayClient({ token }: { token: string }) {
  const [settings, setSettings] = useState<AlertSettings | null>(null)
  const [queue, setQueue]       = useState<QueueItem[]>([])
  const [current, setCurrent]   = useState<QueueItem | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [goal, setGoal]         = useState<GoalUpdatedEvent | null>(null)
  const isPlayingRef            = useRef(false)
  const audioRef                = useRef<HTMLAudioElement | null>(null)

  const playNext = useCallback(() => {
    setQueue(q => {
      if (!q.length) { isPlayingRef.current = false; setCurrent(null); return q }
      const [next, ...rest] = q
      if (!next) { isPlayingRef.current = false; return q }
      isPlayingRef.current = true
      setCurrent(next)
      setShowConfetti(true)
      return rest
    })
  }, [])

  useEffect(() => {
    if (!isPlayingRef.current && queue.length > 0) playNext()
  }, [queue, playNext])

  useEffect(() => {
    if (!current || !settings) return
    if (current.voiceMessageUrl) {
      const audio = new Audio(current.voiceMessageUrl)
      audio.volume = (settings.ttsVolume ?? 100) / 100
      audioRef.current = audio
      audio.play().catch(() => {})
    } else {
      const delay = (settings.ttsSoundDelay ?? 1) * 1000
      if (settings.enableCoinSound) {
        try {
          const ctx = new AudioContext()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain); gain.connect(ctx.destination)
          osc.frequency.setValueAtTime(880, ctx.currentTime)
          osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08)
          gain.gain.setValueAtTime((settings.coinSoundVolume ?? 50) / 100 * 0.5, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25)
          osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.25)
        } catch { /* audio not available */ }
      }

      const ttsText = `${current.donorName} donated ₹${current.amount}. ${current.message ?? ''}`
      const isCelebrityVoice = !!(
        settings.celebrityVoiceEnabled &&
        settings.celebrityVoiceId &&
        current.amount >= (settings.celebrityVoiceMinAmount ?? 1000)
      )

      if (isCelebrityVoice && settings.ttsEnabled && current.message) {
        // ElevenLabs celebrity voice
        const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
        setTimeout(async () => {
          try {
            const res = await fetch(`${backendUrl}/api/tts/celebrity`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: ttsText, voiceId: settings.celebrityVoiceId }),
            })
            if (res.ok) {
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const audio = new Audio(url)
              audio.volume = (settings.ttsVolume ?? 100) / 100
              audioRef.current = audio
              audio.play().catch(() => {})
            }
          } catch { /* celebrity voice unavailable, skip */ }
        }, delay)
      } else if (settings.ttsEnabled && current.message && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(ttsText)
        const targetLang = settings.ttsVoice ?? 'en-IN'
        u.lang = targetLang
        u.volume = (settings.ttsVolume ?? 100) / 100
        u.rate = settings.ttsRate ?? 1.0
        u.pitch = settings.ttsPitch ?? 1.0
        const voices = speechSynthesis.getVoices()
        const exact = voices.find(v => v.lang === targetLang)
        const prefix = voices.find(v => v.lang.startsWith(targetLang.split('-')[0] ?? ''))
        if (exact) u.voice = exact
        else if (prefix) u.voice = prefix
        setTimeout(() => speechSynthesis.speak(u), delay)
      }
    }
    const duration = (settings.alertDuration ?? 8) * 1000
    const timer = setTimeout(() => {
      setCurrent(null); setShowConfetti(false); isPlayingRef.current = false
      setTimeout(playNext, 500)
    }, duration)
    return () => { clearTimeout(timer); speechSynthesis.cancel(); audioRef.current?.pause() }
  }, [current, settings, playNext])

  useEffect(() => {
    const socket = getSocket()
    socket.connect()

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    socket.on('connect', () => {
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      socket.emit('join-overlay', { token })
    })
    socket.on('disconnect', () => {
      // If still disconnected after 30s, reload the page to force a fresh connection
      reconnectTimer = setTimeout(() => window.location.reload(), 30_000)
    })
    socket.on('overlay-joined', ({ settings: s }: { settings: AlertSettings }) => setSettings(s))
    socket.on('settings-updated', (s: AlertSettings) => setSettings(s))
    socket.on('new-donation', (data: NewDonationEvent) => {
      setQueue(q => [...q, { ...data, id: `${Date.now()}-${Math.random()}` }])
    })
    socket.on('goal-updated', (data: GoalUpdatedEvent) => setGoal(data))
    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket.disconnect()
    }
  }, [token])

  // Always inject transparent background styles
  const transparentStyle = <style>{`html,body{background:transparent!important;background-color:transparent!important;margin:0;padding:0}`}</style>

  if (!settings) {
    return <div style={{ position: 'fixed', inset: 0, background: 'transparent' }}>{transparentStyle}</div>
  }

  const anim = ANIMATIONS[(settings.animationStyle as keyof typeof ANIMATIONS)] ?? ANIMATIONS.slideDown
  const tier = current ? getTier(current.amount) : null

  const shadowCss = settings.enableShadow
    ? (() => {
        const r = parseInt(settings.shadowColor.slice(1,3)||'00',16)
        const g = parseInt(settings.shadowColor.slice(3,5)||'00',16)
        const b = parseInt(settings.shadowColor.slice(5,7)||'00',16)
        const a = (settings.shadowOpacity ?? 30) / 100
        return `${settings.shadowOffsetX ?? 0}px ${settings.shadowOffsetY ?? 8}px ${settings.shadowBlur ?? 20}px rgba(${r},${g},${b},${a})`
      })()
    : '0 25px 50px rgba(0,0,0,0.4)'

  const bg = settings.bgOpacity === 0 ? 'transparent' : settings.bgColor
  const bgStyle: React.CSSProperties = settings.enableGradientBg
    ? { background: `linear-gradient(135deg,${settings.bgColor},${settings.bgColor}aa)` }
    : { backgroundColor: bg }

  const tc = settings.textColor  // streamer text color
  const cardStyle: React.CSSProperties = {
    ...bgStyle,
    color: tc,
    fontSize: settings.fontSize,
    fontFamily: settings.fontStyle,
    fontWeight: settings.textBold ? 'bold' : 'normal',
    fontStyle: settings.textItalic ? 'italic' : 'normal',
    textDecoration: settings.textUnderline ? 'underline' : 'none',
    border: settings.enableBorder ? `2px solid ${tc}` : 'none',
    borderRadius: 20,
    position: 'relative',
    boxShadow: shadowCss,
  }

  // Emoji still shows tier (cosmetic only — no color impact)
  const emoji = current ? getTier(current.amount)?.emoji ?? '🎉' : '🎉'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'transparent', overflow: 'hidden' }}>
      {transparentStyle}

      {/* Alert — centered in 800×800 OBS source */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(500px, 90vw)' }}>
        <Confetti active={showConfetti} />
        <AnimatePresence>
          {current && (
            <motion.div key={current.id} {...anim} style={cardStyle}>

              {settings.template === 'superchat' && (
                <div style={{ borderRadius: 16, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, backgroundColor: `${tc}18` }}>
                    <span style={{ fontSize: 28 }}>{emoji}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: tc, fontSize: settings.fontSize ?? 18, margin: 0 }}>{current.donorName}</p>
                      <p style={{ color: tc, opacity: 0.7, fontSize: Math.max((settings.fontSize ?? 18) - 5, 11), margin: 0 }}>donated ₹{current.amount}</p>
                    </div>
                    <div style={{ padding: '6px 14px', borderRadius: 20, fontSize: Math.max((settings.fontSize ?? 18) - 5, 11), fontWeight: 700, color: bg, backgroundColor: tc, flexShrink: 0 }}>
                      ₹{current.amount}
                    </div>
                  </div>
                  {current.message && (
                    <div style={{ padding: '12px 20px', backgroundColor: `${tc}0d` }}>
                      <p style={{ color: tc, margin: 0, fontSize: Math.max((settings.fontSize ?? 18) - 3, 12) }}>&quot;{current.message}&quot;</p>
                    </div>
                  )}
                </div>
              )}

              {settings.template === 'colorful' && (
                <div style={{ borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: current.message ? 10 : 0 }}>
                    <span style={{ fontSize: 36 }}>{emoji}</span>
                    <div>
                      <p style={{ fontWeight: 700, color: tc, fontSize: settings.fontSize ?? 20, margin: 0 }}>{current.donorName}</p>
                      <p style={{ color: tc, opacity: 0.8, fontWeight: 700, fontSize: Math.max((settings.fontSize ?? 20) - 2, 13), margin: 0 }}>donated ₹{current.amount}!</p>
                    </div>
                  </div>
                  {current.message && <p style={{ color: tc, opacity: 0.85, fontStyle: 'italic', margin: 0, fontSize: Math.max((settings.fontSize ?? 20) - 4, 13) }}>&quot;{current.message}&quot;</p>}
                </div>
              )}

              {settings.template === 'custom' && (
                <div style={{ borderRadius: 16, padding: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: settings.fontSize ?? 20, margin: 0, color: tc }}>{emoji} {current.donorName} donated ₹{current.amount}</p>
                  {current.message && <p style={{ marginTop: 8, opacity: 0.8, margin: '8px 0 0', color: tc }}>&quot;{current.message}&quot;</p>}
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Goal bar lives at /overlay/[token]/goal — separate OBS browser source */}
    </div>
  )
}
