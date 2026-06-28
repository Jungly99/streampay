'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../../../../lib/socket'
import type { NewDonationEvent } from '@streampay/types'

function readParams() {
  if (typeof window === 'undefined') return { color: '#f59e0b', resetMin: 5, title: 'Donation Train', bg: '#0a0a1a', opacity: 88, textColor: '#e2e8f0', fontSize: 13, font: 'Arial', bold: true }
  const p = new URLSearchParams(window.location.search)
  return {
    color:     '#' + (p.get('c') ?? 'f59e0b'),
    resetMin:  Math.max(1, Math.min(30, Number(p.get('r') ?? '5'))),
    title:     p.get('t') ?? 'Donation Train',
    bg:        '#' + (p.get('bg') ?? '0a0a1a'),
    opacity:   Math.max(0, Math.min(100, Number(p.get('op') ?? '88'))),
    textColor: '#' + (p.get('fc') ?? 'e2e8f0'),
    fontSize:  Math.max(10, Math.min(20, Number(p.get('fs') ?? '13'))),
    font:      p.get('ff') ?? 'Arial',
    bold:      (p.get('fw') ?? '700') === '700',
  }
}

export default function StreakClient({ token }: { token: string }) {
  const [streak, setStreak] = useState(0)
  const [lastDonor, setLastDonor] = useState('')
  const [totalInStreak, setTotalInStreak] = useState(0)
  const [visible, setVisible] = useState(false)
  const [params, setParams] = useState(readParams)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setParams(readParams()) }, [])

  useEffect(() => {
    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => socket.emit('join-overlay', { token }))
    socket.on('lb-settings-updated', (data: any) => {
      if (!data?.streak) return
      const sk = data.streak
      setParams(p => ({
        ...p,
        color:     sk.color     ?? p.color,
        title:     sk.title     ?? p.title,
        bg:        sk.bg        ?? p.bg,
        opacity:   sk.opacity   ?? p.opacity,
        textColor: sk.textColor ?? p.textColor,
        fontSize:  sk.fontSize  ?? p.fontSize,
        font:      sk.font      ?? p.font,
        bold:      sk.bold      ?? p.bold,
        resetMin:  sk.resetMin  ?? p.resetMin,
      }))
    })
    socket.on('new-donation', (data: NewDonationEvent) => {
      setStreak(s => s + 1)
      setLastDonor(data.donorName)
      setTotalInStreak(t => t + data.amount)
      setVisible(true)

      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => {
        setStreak(0); setTotalInStreak(0); setLastDonor(''); setVisible(false)
      }, params.resetMin * 60 * 1000)
    })
    return () => { socket.disconnect(); if (resetTimer.current) clearTimeout(resetTimer.current) }
  }, [token])

  return (
    <div style={{ background: 'transparent', padding: 8 }}>
      <style>{`html,body{background:transparent!important;margin:0;padding:0}*{box-sizing:border-box}`}</style>
      <AnimatePresence>
        {visible && streak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            style={{
              background: `${params.bg}${Math.round(params.opacity * 2.55).toString(16).padStart(2,'0')}`,
              backdropFilter: 'blur(12px)', fontFamily: params.font,
              borderRadius: 16, padding: '16px 20px', border: `1px solid ${params.color}50`,
              boxShadow: `0 4px 32px rgba(0,0,0,0.5), 0 0 20px ${params.color}20`,
              textAlign: 'center', minWidth: 180,
            }}>
            <div style={{ fontSize: params.fontSize - 2, fontWeight: 800, color: params.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              ⚡ {params.title}
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, color: params.color, lineHeight: 1, marginBottom: 4, textShadow: `0 0 30px ${params.color}80` }}>
              {streak}x
            </div>
            <div style={{ fontSize: params.fontSize - 2, color: params.textColor, opacity: 0.7, marginBottom: 6 }}>
              consecutive donations
            </div>
            <div style={{ fontSize: params.fontSize + 1, fontWeight: params.bold ? 700 : 400, color: '#10b981' }}>
              ₹{totalInStreak.toLocaleString('en-IN')} total
            </div>
            {lastDonor && (
              <div style={{ fontSize: params.fontSize - 2, color: params.textColor, opacity: 0.5, marginTop: 6 }}>
                Latest: {lastDonor}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
