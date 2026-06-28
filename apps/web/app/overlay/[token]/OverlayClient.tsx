'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { getSocket } from '../../../lib/socket'
import type { NewDonationEvent, AlertSettings, GoalUpdatedEvent } from '@streampay/types'

interface QueueItem extends NewDonationEvent {
  id: string
}

function applyProfanityFilter(text: string, settings: AlertSettings): string {
  if (!settings.enableProfanityFilter || !settings.customBlocklist) return text
  const words = settings.customBlocklist.split(',').map(w => w.trim()).filter(Boolean)
  let result = text
  for (const word of words) {
    if (!word) continue
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(escaped, 'gi')
    result = result.replace(re, m => m[0] + '*'.repeat(Math.max(m.length - 1, 3)))
  }
  return result
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
          const vol = (settings.coinSoundVolume ?? 50) / 100 * 0.6
          const soundType = settings.alertSoundType ?? 'coin'
          if (soundType === 'custom' || soundType === 'custom_url') {
            // customAlertSoundUrl holds the data URL saved to DB — works in OBS too
            const src = settings.customAlertSoundUrl || localStorage.getItem('eztips_custom_alert_sound')
            if (src) { const a = new Audio(src); a.volume = vol; a.play().catch(() => {}) }
          } else {
            const ctx = new AudioContext()
            const t = ctx.currentTime
            const playTone = (freq: number, start: number, dur: number, type: OscillatorType = 'sine') => {
              const osc = ctx.createOscillator(); const g = ctx.createGain()
              osc.connect(g); g.connect(ctx.destination)
              osc.type = type; osc.frequency.setValueAtTime(freq, t + start)
              g.gain.setValueAtTime(vol, t + start); g.gain.exponentialRampToValueAtTime(0.001, t + start + dur)
              osc.start(t + start); osc.stop(t + start + dur)
            }
            if (soundType === 'coin') { const osc = ctx.createOscillator(); const g = ctx.createGain(); osc.connect(g); g.connect(ctx.destination); osc.frequency.setValueAtTime(880,t); osc.frequency.exponentialRampToValueAtTime(440,t+0.08); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.25); osc.start(t); osc.stop(t+0.25) }
            else if (soundType === 'ding') { playTone(1200, 0, 0.6) }
            else if (soundType === 'bell') { [523,659,784].forEach((f,i) => playTone(f, i*0.01, 1.2)) }
            else if (soundType === 'chime') { [523,659,784,1047].forEach((f,i) => playTone(f, i*0.12, 0.5)) }
            else if (soundType === 'pop') { const osc = ctx.createOscillator(); const g = ctx.createGain(); osc.connect(g); g.connect(ctx.destination); osc.type='triangle'; osc.frequency.setValueAtTime(200,t); osc.frequency.exponentialRampToValueAtTime(40,t+0.1); g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.12); osc.start(t); osc.stop(t+0.12) }
            else if (soundType === 'levelup') { [440,554,659,880].forEach((f,i) => playTone(f, i*0.1, 0.3)) }
          }
        } catch { /* audio not available */ }
      }

      const ttsFiltered = current.message ? applyProfanityFilter(current.message, settings) : ''
      const ttsText = `${current.donorName} donated ₹${current.amount}. ${ttsFiltered}`
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
  const transparentStyle = (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;700&family=Open+Sans:wght@400;700&family=Lato:wght@400;700&family=Poppins:wght@400;600;700&family=Nunito:wght@400;700&family=Raleway:wght@400;700&family=Oswald:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Bebas+Neue&family=Anton&family=Barlow+Condensed:wght@400;700&family=Orbitron:wght@400;700&family=Rajdhani:wght@400;700&family=Play:wght@400;700&family=Share+Tech+Mono&family=Press+Start+2P&family=VT323&family=Bungee&display=swap" />
      <style>{`html,body{background:transparent!important;background-color:transparent!important;margin:0;padding:0}`}</style>
    </>
  )

  if (!settings) {
    return <div style={{ position: 'fixed', inset: 0, background: 'transparent' }}>{transparentStyle}</div>
  }

  const anim = ANIMATIONS[(settings.animationStyle as keyof typeof ANIMATIONS)] ?? ANIMATIONS.slideDown
  const tier = current ? getTier(current.amount) : null
  const filteredMessage = current?.message ? applyProfanityFilter(current.message, settings) : ''

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
    <div style={{ position: 'fixed', inset: 0, background: 'transparent' }}>
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
                  {filteredMessage && (
                    <div style={{ padding: '12px 20px', backgroundColor: `${tc}0d` }}>
                      <p style={{ color: tc, margin: 0, fontSize: Math.max((settings.fontSize ?? 18) - 3, 12) }}>&quot;{filteredMessage}&quot;</p>
                    </div>
                  )}
                </div>
              )}

              {settings.template === 'colorful' && (
                <div style={{ borderRadius: 16, padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: filteredMessage ? 10 : 0 }}>
                    <span style={{ fontSize: 36 }}>{emoji}</span>
                    <div>
                      <p style={{ fontWeight: 700, color: tc, fontSize: settings.fontSize ?? 20, margin: 0 }}>{current.donorName}</p>
                      <p style={{ color: tc, opacity: 0.8, fontWeight: 700, fontSize: Math.max((settings.fontSize ?? 20) - 2, 13), margin: 0 }}>donated ₹{current.amount}!</p>
                    </div>
                  </div>
                  {filteredMessage && <p style={{ color: tc, opacity: 0.85, fontStyle: 'italic', margin: 0, fontSize: Math.max((settings.fontSize ?? 20) - 4, 13) }}>&quot;{filteredMessage}&quot;</p>}
                </div>
              )}

              {settings.template === 'custom' && (
                <div style={{ borderRadius: 16, padding: 20 }}>
                  <p style={{ fontWeight: 700, fontSize: settings.fontSize ?? 20, margin: 0, color: tc }}>{emoji} {current.donorName} donated ₹{current.amount}</p>
                  {filteredMessage && <p style={{ marginTop: 8, opacity: 0.8, margin: '8px 0 0', color: tc }}>&quot;{filteredMessage}&quot;</p>}
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
