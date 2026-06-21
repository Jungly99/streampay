import Link from 'next/link'

const features = [
  { icon: '⚡', title: 'Real-time OBS Alerts',    desc: 'Donations appear on stream the instant they land. Zero delay, animated alerts with custom styles.' },
  { icon: '🎙️', title: 'Voice Messages',           desc: 'Viewers record personal audio messages up to 20 seconds. Plays live on stream through OBS.' },
  { icon: '👤', title: 'No Viewer Account',        desc: 'Viewers just open your link and donate. No sign-up, no friction — higher conversion.' },
  { icon: '💸', title: 'Only 5% Fee',              desc: 'We charge just 5% on settlement — not per transaction. Lower than every alternative in India.' },
  { icon: '🏦', title: 'Settle Anytime',           desc: 'Withdraw any amount, any time. No ₹500 minimums, no waiting periods.' },
  { icon: '🏆', title: 'Donation Leaderboard',     desc: 'Live leaderboard on your donation page motivates viewers to compete and donate more.' },
  { icon: '🎯', title: 'Donation Goals',           desc: 'Set a goal, watch the progress bar fill on your overlay. Viewers love contributing to a target.' },
  { icon: '💬', title: 'Discord Webhooks',         desc: 'Instant Discord notifications for every donation. Stay connected with your community.' },
]

const steps = [
  { n: '01', title: 'Create your account',   desc: 'Sign up as a streamer in 30 seconds. No KYC required to start.' },
  { n: '02', title: 'Set your username',     desc: 'Pick your unique URL — streampay.in/send-message/you' },
  { n: '03', title: 'Add to OBS',            desc: 'Copy your overlay URL into OBS Browser Source. Done.' },
  { n: '04', title: 'Start earning',         desc: 'Share your donation link in stream chat and start receiving superchats.' },
]

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#f8fafc' }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 40px',
        background: 'rgba(6,6,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg,#7c3aed,#db2777)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 14, color: 'white',
          }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>StreamPay</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/login" style={{ fontSize: 13, color: '#64748b', padding: '7px 16px', borderRadius: 8, textDecoration: 'none' }}>
            Sign In
          </Link>
          <Link href="/signup" style={{
            fontSize: 13, fontWeight: 600, color: 'white', padding: '8px 20px', borderRadius: 9,
            background: 'linear-gradient(135deg,#7c3aed,#db2777)', textDecoration: 'none',
            boxShadow: '0 0 20px rgba(124,58,237,0.35)',
          }}>
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section style={{ paddingTop: 160, paddingBottom: 100, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* glow orbs */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(ellipse at center top, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          {/* pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32,
            padding: '6px 16px', borderRadius: 99, fontSize: 12, fontWeight: 600,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
            Built for Indian Streamers · Live in Production
          </div>

          <h1 style={{ fontSize: 'clamp(42px, 7vw, 80px)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-2px', marginBottom: 24 }}>
            <span style={{ background: 'linear-gradient(135deg,#a78bfa,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Superchats
            </span>
            <br />
            <span style={{ color: '#f8fafc' }}>that actually work.</span>
          </h1>

          <p style={{ fontSize: 18, color: '#64748b', lineHeight: 1.7, marginBottom: 44, maxWidth: 560, margin: '0 auto 44px' }}>
            The most viewer-friendly donation platform for Indian streamers.
            No viewer signup. Real-time OBS alerts. Voice messages. Just 5%.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup?type=streamer" style={{
              padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700,
              color: 'white', textDecoration: 'none',
              background: 'linear-gradient(135deg,#7c3aed,#db2777)',
              boxShadow: '0 0 40px rgba(124,58,237,0.4)',
            }}>
              Start Earning — Free →
            </Link>
            <Link href="/login" style={{
              padding: '14px 32px', borderRadius: 12, fontSize: 15, fontWeight: 600,
              color: '#94a3b8', textDecoration: 'none',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            }}>
              Sign In
            </Link>
          </div>

          <p style={{ fontSize: 12, color: '#334155', marginTop: 20 }}>
            No credit card · 5% fee only on settlement · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '28px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
          {[
            { label: 'Platform Fee',    us: '5%',           them: '7% competitors',  good: true },
            { label: 'Viewer Signup',   us: 'Never Required', them: 'Required elsewhere', good: true },
            { label: 'Min Settlement',  us: 'No Minimum',   them: '₹500 elsewhere',  good: true },
          ].map((c, i) => (
            <div key={c.label} style={{
              textAlign: 'center', padding: '8px 24px',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#334155', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{c.label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color: '#10b981', marginBottom: 4 }}>{c.us}</p>
              <p style={{ fontSize: 12, color: '#475569', textDecoration: 'line-through' }}>vs {c.them}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section style={{ padding: '100px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-1px', color: '#f8fafc', marginBottom: 12 }}>
              Everything you need to monetize
            </h2>
            <p style={{ fontSize: 16, color: '#475569' }}>Built by streamers, for streamers. Every feature you actually need.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {features.map((f, i) => (
              <div key={f.title} style={{
                padding: '24px 22px',
                background: i === 0 ? 'rgba(124,58,237,0.07)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${i === 0 ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.07)'}`,
                borderRadius: 14, transition: 'border-color 0.2s',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, marginBottom: 16,
                  background: 'rgba(124,58,237,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>{f.icon}</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>{f.title}</p>
                <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', color: '#f8fafc', marginBottom: 10 }}>
              Up and running in 2 minutes
            </h2>
            <p style={{ fontSize: 15, color: '#475569' }}>No technical knowledge required</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {steps.map((s, i) => (
              <div key={s.n} style={{ position: 'relative' }}>
                {i < steps.length - 1 && (
                  <div style={{ position: 'absolute', top: 20, left: '70%', width: '60%', height: 1, background: 'linear-gradient(90deg,rgba(124,58,237,0.3),transparent)' }} />
                )}
                <div style={{
                  width: 40, height: 40, borderRadius: 10, marginBottom: 16,
                  background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(219,39,119,0.2))',
                  border: '1px solid rgba(124,58,237,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: '#a78bfa',
                }}>{s.n}</div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc', marginBottom: 6 }}>{s.title}</p>
                <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px 100px' }}>
        <div style={{
          maxWidth: 700, margin: '0 auto', textAlign: 'center',
          padding: '60px 48px',
          background: 'rgba(124,58,237,0.07)',
          border: '1px solid rgba(124,58,237,0.18)',
          borderRadius: 24, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#7c3aed', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>Get Started Today</p>
            <h2 style={{ fontSize: 38, fontWeight: 800, color: '#f8fafc', letterSpacing: '-1px', marginBottom: 16 }}>
              Your viewers are waiting
            </h2>
            <p style={{ fontSize: 15, color: '#475569', marginBottom: 36, lineHeight: 1.7 }}>
              Join Indian streamers already earning on StreamPay.
              Set up your donation page in under 2 minutes, completely free.
            </p>
            <Link href="/signup?type=streamer" style={{
              display: 'inline-block', padding: '14px 36px', borderRadius: 12,
              fontSize: 15, fontWeight: 700, color: 'white', textDecoration: 'none',
              background: 'linear-gradient(135deg,#7c3aed,#db2777)',
              boxShadow: '0 0 40px rgba(124,58,237,0.4)',
            }}>
              Create Your Page — Free →
            </Link>
            <p style={{ fontSize: 12, color: '#334155', marginTop: 16 }}>No credit card required</p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white' }}>S</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>StreamPay</span>
        </div>
        <p style={{ fontSize: 12, color: '#1e293b' }}>© 2026 StreamPay · Made for Indian Streamers</p>
        <div style={{ display: 'flex', gap: 20 }}>
          {[['Sign In', '/login'], ['Sign Up', '/signup'], ['Dashboard', '/dashboard']].map(([l, h]) => (
            <Link key={l} href={h!} style={{ fontSize: 12, color: '#334155', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
