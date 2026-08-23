'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const LIVE_ALERTS = [
  { name: 'Rahul_FPS', amount: 500,  msg: 'bhai kya stream hai 🔥' },
  { name: 'GamingDevil', amount: 200, msg: 'keep it up legend!' },
  { name: 'CryptoKing99', amount: 1000, msg: '1k because you deserve it 🙏' },
  { name: 'Priya_Clips', amount: 100, msg: 'awesome content!' },
  { name: 'StreamLord', amount: 750, msg: 'clutch play bhai 🎮' },
  { name: 'AnonymousFan', amount: 300, msg: 'love from Bangalore!' },
]

function useCycledAlert() {
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % LIVE_ALERTS.length)
        setVisible(true)
      }, 400)
    }, 3000)
    return () => clearInterval(id)
  }, [])
  return { alert: LIVE_ALERTS[idx]!, visible }
}


function AlertPreview() {
  const { alert, visible } = useCycledAlert()
  const color = alert.amount >= 500 ? '#f59e0b' : alert.amount >= 200 ? '#7c3aed' : '#10b981'
  const emoji = alert.amount >= 500 ? '👑' : alert.amount >= 200 ? '🔥' : '🎉'
  return (
    <div style={{
      transition: 'opacity 0.35s, transform 0.35s',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
      background: 'rgba(12,10,30,0.85)',
      backdropFilter: 'blur(20px)',
      border: `1.5px solid ${color}40`,
      borderRadius: 16,
      padding: '14px 20px',
      boxShadow: `0 0 32px ${color}30, 0 8px 40px rgba(0,0,0,0.6)`,
      minWidth: 280,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, border: `1.5px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 15, color: '#f8fafc' }}>{alert.name}</span>
            <span style={{ fontSize: 12, color: '#475569' }}>donated</span>
            <span style={{ fontWeight: 800, fontSize: 15, color }}>₹{alert.amount}</span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 13, color: '#94a3b8' }}>{alert.msg}</p>
        </div>
      </div>
      <div style={{ marginTop: 10, height: 3, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${color},${color}99)`,
          animation: 'drain 3s linear forwards',
        }} />
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, desc, glow = false }: { icon: string; title: string; desc: string; glow?: boolean }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '24px 22px',
        background: hovered ? 'rgba(124,58,237,0.08)' : glow ? 'rgba(124,58,237,0.05)' : 'rgba(255,255,255,0.025)',
        border: `1px solid ${hovered ? 'rgba(124,58,237,0.35)' : glow ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 16,
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 8px 32px rgba(124,58,237,0.18)' : 'none',
        cursor: 'default',
      }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 16, background: hovered ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, transition: 'background 0.2s' }}>{icon}</div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, margin: 0 }}>{desc}</p>
    </div>
  )
}

const FEATURES = [
  { icon: '⚡', title: 'Instant OBS Alerts', desc: 'Donations appear on stream the moment they land. No delay. Animated, customisable cards that look premium.' },
  { icon: '🎙️', title: 'Voice Messages', desc: 'Viewers record personal audio messages up to 20 seconds. Plays live through OBS — your audience loves it.' },
  { icon: '🎭', title: 'Custom Emojis', desc: 'Upload 5 brand emojis. Your viewers use them on donations. They appear right in the alert, fully animated.' },
  { icon: '🎯', title: 'Donation Goals', desc: 'Set a target. A live progress bar fills on your overlay. Viewers compete to hit the goal — natural FOMO.' },
  { icon: '🏆', title: 'Live Leaderboard', desc: 'Public leaderboard on your tip page. Top donors fight for the top spot. Repeat donations skyrocket.' },
  { icon: '🎤', title: 'Celebrity Voice TTS', desc: 'Read alerts in AI celebrity voices. Set your own per-donation price and platform takes 20% on those.' },
  { icon: '💬', title: 'Discord Webhooks', desc: 'Every donation fires a rich embed to your Discord. Keep your community updated automatically.' },
  { icon: '💸', title: 'Settle Anytime', desc: 'Withdraw any balance, any time. No ₹500 floor, no waiting periods, instant IMPS to your bank.' },
]

const STEPS = [
  { n: '01', title: 'Create account', desc: 'Sign up as a streamer in 30 seconds. No KYC, no documents.' },
  { n: '02', title: 'Set your link', desc: 'Pick eztips.live/send-message/you — your unique donation URL.' },
  { n: '03', title: 'Paste in OBS', desc: 'Add one Browser Source URL. Alerts fire automatically.' },
  { n: '04', title: 'Start earning', desc: 'Pin your link in stream chat and watch donations roll in.' },
]

const TICKER_ITEMS = ['⚡ Real-time alerts', '🎙️ Voice messages', '🎭 Custom emojis', '🎯 Donation goals', '🏆 Leaderboard', '💸 Instant payouts', '🎤 Celebrity TTS', '💬 Discord alerts', '📊 Analytics', '🔒 Razorpay secured']

export default function LandingClient() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#050508', color: '#f8fafc', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes drain { from { width: 100% } to { width: 0% } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse-dot { 0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(16,185,129,0.4)} 50%{opacity:0.8;box-shadow:0 0 0 6px rgba(16,185,129,0)} }
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .ticker-track { display:flex; animation: ticker 30s linear infinite; width:max-content; }
        .ticker-track:hover { animation-play-state:paused; }
        .glow-orb { position:absolute; border-radius:50%; filter:blur(80px); pointer-events:none; }
      `}</style>

      {/* ── Sticky Nav ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(5,5,8,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'all 0.3s',
      }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="eztips" style={{ height: 40, borderRadius: 10, filter: 'drop-shadow(0 0 12px rgba(124,58,237,0.7))' }} />
          <span style={{ fontWeight: 900, fontSize: 18, background: 'linear-gradient(135deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>eztips</span>
        </a>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/login" style={{ padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#94a3b8', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>Login</Link>
          <Link href="/signup?type=streamer" style={{ padding: '8px 20px', borderRadius: 9, fontSize: 13, fontWeight: 700, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#7c3aed,#db2777)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}>Start Free →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', paddingTop: 64 }}>
        {/* Background orbs */}
        <div className="glow-orb" style={{ width: 600, height: 600, background: 'rgba(124,58,237,0.15)', top: -100, left: '10%' }} />
        <div className="glow-orb" style={{ width: 400, height: 400, background: 'rgba(219,39,119,0.1)', bottom: 0, right: '5%' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', width: '100%' }}>
          {/* Left */}
          <div>
            {/* Brand logo — prominent */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 36 }}>
              <img src="/logo.png" alt="eztips" style={{
                height: 72, width: 'auto', borderRadius: 18,
                filter: 'drop-shadow(0 0 32px rgba(124,58,237,0.8)) drop-shadow(0 0 12px rgba(219,39,119,0.5))',
              }} />
              <div>
                <p style={{ fontSize: 28, fontWeight: 900, margin: 0, background: 'linear-gradient(135deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>eztips</p>
                <p style={{ fontSize: 11, color: '#475569', margin: '2px 0 0', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Streamer Monetization</p>
              </div>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24, padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse-dot 2s ease infinite' }} />
              India's #1 Streamer Monetization Platform
            </div>

            <h1 style={{ fontSize: 'clamp(40px,5vw,68px)', fontWeight: 900, lineHeight: 1.06, letterSpacing: '-2.5px', marginBottom: 24 }}>
              <span style={{ color: '#f8fafc' }}>Superchats that</span>
              <br />
              <span style={{
                background: 'linear-gradient(135deg,#a78bfa 0%,#ec4899 50%,#f59e0b 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                animation: 'shimmer 4s linear infinite',
              }}>
                actually work.
              </span>
            </h1>

            <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.75, marginBottom: 40, maxWidth: 480 }}>
              Real-time OBS alerts. Voice messages. Celebrity TTS. No viewer signup. Only <strong style={{ color: '#a78bfa' }}>7% fee</strong> on settlement — nothing per tip.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <Link href="/signup?type=streamer" style={{ padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 800, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#7c3aed,#db2777)', boxShadow: '0 4px 24px rgba(124,58,237,0.5)', letterSpacing: '-0.3px' }}>
                Create Your Page — Free →
              </Link>
              <Link href="/login" style={{ padding: '14px 28px', borderRadius: 12, fontSize: 15, fontWeight: 600, color: '#94a3b8', textDecoration: 'none', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Sign In
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[['✓', 'No viewer signup'], ['✓', 'Setup in 2 minutes'], ['✓', 'Razorpay secured']].map(([tick, text]) => (
                <span key={text} style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{tick}</span> {text}
                </span>
              ))}
            </div>
          </div>

          {/* Right — live alert demo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
            <div style={{ position: 'absolute', inset: -40, background: 'radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* OBS frame */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '14px 18px', backdropFilter: 'blur(12px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 11, color: '#334155', marginLeft: 8, fontFamily: 'monospace' }}>OBS Browser Source — overlay/your-token</span>
              </div>
              <div style={{ animation: 'float 4s ease-in-out infinite' }}>
                <AlertPreview />
              </div>
            </div>

            {/* Mini stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Platform fee', val: '7%', sub: 'Only on settlement', color: '#10b981' },
                { label: 'Viewer signup', val: 'Never', sub: 'Required on others', color: '#a78bfa' },
                { label: 'Minimum tip', val: '₹11', sub: 'vs ₹500 elsewhere', color: '#f59e0b' },
                { label: 'Setup time', val: '2 min', sub: 'No KYC needed', color: '#ec4899' },
              ].map(c => (
                <div key={c.label} style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12 }}>
                  <p style={{ fontSize: 10, color: '#475569', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>{c.label}</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: c.color, margin: '0 0 2px' }}>{c.val}</p>
                  <p style={{ fontSize: 10, color: '#334155', margin: 0 }}>{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature ticker ── */}
      <div style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 0', background: 'rgba(255,255,255,0.02)' }}>
        <div className="ticker-track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 32px', fontSize: 13, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', gap: 8 }}>
              {item}
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(124,58,237,0.4)', flexShrink: 0 }} />
            </span>
          ))}
        </div>
      </div>

      {/* ── Platform facts ── */}
      <section style={{ padding: '80px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          {[
            { val: '7%', label: 'Platform fee', sub: 'Only on settlement — nothing per tip' },
            { val: '₹11', label: 'Min donation', sub: 'vs ₹500 on most competitors' },
            { val: '0', label: 'Viewer signups', sub: 'Anyone can donate instantly' },
            { val: 'IMPS', label: 'Payout method', sub: 'Settle anytime to your bank' },
          ].map(c => (
            <div key={c.label} style={{ padding: '28px 24px', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 'clamp(28px,3.5vw,40px)', fontWeight: 900, color: '#f8fafc', margin: '0 0 4px', letterSpacing: '-1px', background: 'linear-gradient(135deg,#a78bfa,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{c.val}</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', margin: '0 0 6px' }}>{c.label}</p>
              <p style={{ fontSize: 11, color: '#475569', margin: 0, lineHeight: 1.5 }}>{c.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section style={{ padding: '80px 40px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Features</p>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#f8fafc', marginBottom: 12 }}>Everything you need, nothing you don't</h2>
            <p style={{ fontSize: 15, color: '#475569' }}>Purpose-built for Indian streaming — not adapted from a Western product</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {FEATURES.map((f, i) => <FeatureCard key={f.title} {...f} glow={i === 0} />)}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '100px 40px', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
        <div className="glow-orb" style={{ width: 500, height: 500, background: 'rgba(124,58,237,0.08)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <div style={{ maxWidth: 900, margin: '0 auto', position: 'relative' }}>
          <div style={{ textAlign: 'center', marginBottom: 72 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Setup</p>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#f8fafc', marginBottom: 12 }}>Live in 2 minutes flat</h2>
            <p style={{ fontSize: 15, color: '#475569' }}>No technical knowledge needed. If you can paste a URL, you're done.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, position: 'relative' }}>
            {/* connecting line */}
            <div style={{ position: 'absolute', top: 20, left: '12%', right: '12%', height: 1, background: 'linear-gradient(90deg,rgba(124,58,237,0.5),rgba(219,39,119,0.5))', pointerEvents: 'none' }} />
            {STEPS.map((s, i) => (
              <div key={s.n} style={{ padding: '0 20px', textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, margin: '0 auto 20px', background: 'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(219,39,119,0.3))', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#a78bfa', position: 'relative', zIndex: 1, boxShadow: '0 0 20px rgba(124,58,237,0.3)' }}>{s.n}</div>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc', marginBottom: 8 }}>{s.title}</p>
                <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live demo callout ── */}
      <section style={{ padding: '0 40px 100px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 48px', background: 'linear-gradient(135deg,rgba(124,58,237,0.08),rgba(219,39,119,0.06))', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 28, position: 'relative', overflow: 'hidden', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, background: 'radial-gradient(ellipse, rgba(219,39,119,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#ec4899', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Live Preview</p>
            <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900, color: '#f8fafc', letterSpacing: '-1px', marginBottom: 16 }}>This is what your viewers see</h2>
            <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.75, marginBottom: 28 }}>
              Every donation fires this alert in OBS automatically. Fully customisable colours, fonts, animations, sounds, and even AI celebrity voices.
            </p>
            <Link href="/signup?type=streamer" style={{ display: 'inline-block', padding: '12px 28px', borderRadius: 10, fontSize: 14, fontWeight: 700, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
              Set Up Your Alerts →
            </Link>
          </div>
          <div style={{ animation: 'float 5s ease-in-out infinite' }}>
            <AlertPreview />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '80px 40px 120px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="glow-orb" style={{ width: 700, height: 400, background: 'rgba(124,58,237,0.1)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>Ready?</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, letterSpacing: '-2px', color: '#f8fafc', marginBottom: 20 }}>
            Your viewers are<br />
            <span style={{ background: 'linear-gradient(135deg,#a78bfa,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>waiting right now.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#475569', marginBottom: 40, lineHeight: 1.7 }}>
            Join Indian streamers already using eztips to monetize their stream. Free to start, 7% only when you earn.
          </p>
          <Link href="/signup?type=streamer" style={{ display: 'inline-block', padding: '16px 48px', borderRadius: 14, fontSize: 16, fontWeight: 800, color: 'white', textDecoration: 'none', background: 'linear-gradient(135deg,#7c3aed,#db2777)', boxShadow: '0 0 60px rgba(124,58,237,0.45)', letterSpacing: '-0.3px' }}>
            Create Your Page — It's Free →
          </Link>
          <p style={{ fontSize: 12, color: '#334155', marginTop: 16 }}>No credit card · No KYC · 7% only on settlement</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.png" alt="eztips" style={{ height: 30, borderRadius: 7, filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.5))' }} />
          <span style={{ fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>eztips</span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>© 2026 eztips · Built for Indian Streamers</p>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['Login', '/login'], ['Sign Up', '/signup'], ['Privacy Policy', '/privacy'], ['Terms of Service', '/tos']].map(([l, h]) => (
            <Link key={l} href={h!} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
