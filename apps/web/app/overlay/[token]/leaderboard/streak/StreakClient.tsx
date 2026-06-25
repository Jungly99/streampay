'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getSocket } from '../../../../../lib/socket'
import type { NewDonationEvent } from '@streampay/types'

const RESET_AFTER_MS = 5 * 60 * 1000 // reset streak if no donation in 5 min

export default function StreakClient({ token }: { token: string }) {
  const [streak, setStreak] = useState(0)
  const [lastDonor, setLastDonor] = useState('')
  const [totalInStreak, setTotalInStreak] = useState(0)
  const [visible, setVisible] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const socket = getSocket()
    socket.connect()
    socket.on('connect', () => socket.emit('join-overlay', { token }))
    socket.on('new-donation', (data: NewDonationEvent) => {
      setStreak(s => s + 1)
      setLastDonor(data.donorName)
      setTotalInStreak(t => t + data.amount)
      setVisible(true)

      if (resetTimer.current) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => {
        setStreak(0); setTotalInStreak(0); setLastDonor(''); setVisible(false)
      }, RESET_AFTER_MS)
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
              background: 'rgba(10,10,26,0.88)', backdropFilter: 'blur(12px)',
              borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(245,158,11,0.4)',
              boxShadow: '0 4px 32px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,11,0.15)',
              textAlign: 'center', minWidth: 180,
            }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              ⚡ Donation Train
            </div>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#fbbf24', lineHeight: 1, marginBottom: 4 }}>
              {streak}x
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
              consecutive donations
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>
              ₹{totalInStreak.toLocaleString('en-IN')} total
            </div>
            {lastDonor && (
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
                Latest: {lastDonor}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
