import Link from 'next/link'

const CHANGELOG = [
  {
    version: 'v1.6.0',
    date: 'July 5, 2026',
    badge: 'Latest',
    badgeColor: '#7c3aed',
    entries: [
      { type: 'new',  text: 'Terms of Service page — accessible at eztips.live/tos, linked from footer and login page' },
      { type: 'new',  text: 'Privacy Policy page — accessible at eztips.live/privacy, linked from footer and login page' },
      { type: 'new',  text: 'Live stream embed on donation page — split-screen layout automatically activates when a streamer is live on YouTube or Kick' },
      { type: 'new',  text: 'Kick stream priority — if the streamer is live on both Kick and YouTube, Kick stream is shown on the donation page' },
      { type: 'imp',  text: 'YouTube live detection now uses the official YouTube Data API v3 with a 5-minute cache — much more reliable than page scraping' },
      { type: 'imp',  text: 'Kick live detection moved to client-side browser fetch — server-side detection was blocked by Kick\'s API for datacenter IPs' },
      { type: 'imp',  text: 'Terms of Service and Privacy Policy text on the login page are now clickable links' },
      { type: 'fix',  text: 'YouTube was sometimes showing a random live stream instead of the correct channel — fixed by using channel-specific API lookup' },
    ],
  },
  {
    version: 'v1.5.0',
    date: 'June 28, 2026',
    badge: '',
    badgeColor: '',
    entries: [
      { type: 'new',  text: 'Admin audit logs — super admin can see a full log of every action taken by other admins, with timestamp, IP, and detail' },
      { type: 'new',  text: 'Platform config — super admin can set platform-wide settings (Discord webhooks) from the Team tab' },
      { type: 'new',  text: 'Support ticket Discord webhook — super admin can set a webhook URL that fires whenever a streamer opens a new support ticket' },
      { type: 'new',  text: 'Razorpay transaction ID visible in admin donations table for every successful payment' },
      { type: 'new',  text: 'Platform fee % badge on streamer cards in admin panel' },
      { type: 'new',  text: 'Support chat widget — streamers can open tickets and chat with the support team directly from the dashboard' },
      { type: 'new',  text: 'Test Discord webhook button in streamer profile — verify your webhook is working without waiting for a real donation' },
      { type: 'imp',  text: 'Logo moved to center of top bar on all dashboard pages and is now clickable (returns to main dashboard)' },
      { type: 'imp',  text: 'Landing page refreshed — navbar removed, logo enlarged in hero' },
      { type: 'fix',  text: 'Transparent/invisible inputs in support ticket form now use correct background in both dark and light mode' },
      { type: 'fix',  text: 'Image attachments in support chat no longer show inside a colored bubble — renders cleanly with a subtle border' },
      { type: 'fix',  text: 'Discord webhook removed from dashboard setup checklist' },
    ],
  },
  {
    version: 'v1.4.0',
    date: 'June 24, 2026',
    badge: '',
    badgeColor: '',
    entries: [
      { type: 'new',  text: 'Celebrity Voice alerts — AI-powered voices (Modi, Trump, Morgan Freeman) for donations ₹1000+, powered by ElevenLabs' },
      { type: 'new',  text: 'Premium streamer accounts — admin can grant premium access to unlock Celebrity Voice' },
      { type: 'new',  text: 'Soft delete & restore — deleted accounts are preserved and can be restored by super admin' },
      { type: 'new',  text: 'restore_accounts permission — admins can be granted access to restore deleted accounts' },
      { type: 'new',  text: 'Support Us page — anyone can donate to help keep eztips running' },
      { type: 'new',  text: 'Changelog page — this page! Stay updated on what\'s new' },
      { type: 'fix',  text: 'Celebrity Voice nav item hidden from non-premium streamers in sidebar' },
      { type: 'fix',  text: 'Celebrity Voice page shows Beta gate with "Request Access" CTA for non-premium users' },
      { type: 'fix',  text: 'Removed Celebrity Voice from Quick Actions on dashboard (premium-only)' },
    ],
  },
  {
    version: 'v1.3.0',
    date: 'June 23, 2026',
    badge: '',
    badgeColor: '',
    entries: [
      { type: 'new',  text: 'Reset to Defaults buttons in Overlay Appearance tab and Goal Customization section' },
      { type: 'new',  text: 'Min donation amount and message max length controls in Tip Settings' },
      { type: 'new',  text: 'Username setup moved to dashboard for better onboarding flow' },
      { type: 'fix',  text: 'Goal overlay not updating on manual add or real donations' },
      { type: 'fix',  text: 'Goal overlay visibility and centering in OBS fixed' },
      { type: 'fix',  text: 'Toast popups overlapping the navbar in both admin and streamer app' },
      { type: 'fix',  text: '"Inactive" status label renamed to "Deactivated" on dashboard' },
      { type: 'fix',  text: 'Test alert not matching saved settings' },
    ],
  },
  {
    version: 'v1.2.0',
    date: 'June 15, 2026',
    badge: '',
    badgeColor: '',
    entries: [
      { type: 'new',  text: 'Admin role system — create custom roles with granular permissions (overview, streamers, users, donations, settlements)' },
      { type: 'new',  text: 'Admin team management — add admins by email, assign roles' },
      { type: 'new',  text: 'Streamer verification queue — approve/reject verification requests in admin' },
      { type: 'new',  text: 'Discord webhook integration for donation alerts' },
      { type: 'new',  text: 'Birthday alerts in overlay — customizable template' },
      { type: 'new',  text: 'Profanity filter with custom blocklist' },
      { type: 'fix',  text: 'OBS overlay goal bar not visible in transparent background mode' },
    ],
  },
  {
    version: 'v1.1.0',
    date: 'June 5, 2026',
    badge: '',
    badgeColor: '',
    entries: [
      { type: 'new',  text: 'Donation goals with live progress bar in OBS overlay' },
      { type: 'new',  text: 'Leaderboard on donation page — top donors visible to viewers' },
      { type: 'new',  text: 'Voice message tiers — viewers can record audio messages with donations' },
      { type: 'new',  text: 'GST invoice generation for each settlement' },
      { type: 'new',  text: 'CSV export for donations and settlements' },
      { type: 'new',  text: 'Overlay live preview in dashboard — see changes before saving' },
      { type: 'fix',  text: 'Socket.io reconnection handling in OBS overlay' },
    ],
  },
  {
    version: 'v1.0.0',
    date: 'May 28, 2026',
    badge: 'Launch',
    badgeColor: '#10b981',
    entries: [
      { type: 'new',  text: 'Initial launch — eztips goes live for Indian streamers' },
      { type: 'new',  text: 'Streamer dashboard with donation stats, settlements, invoices' },
      { type: 'new',  text: 'Real-time OBS overlay with animated donation alerts and TTS' },
      { type: 'new',  text: 'Razorpay payment integration — UPI, cards, net banking' },
      { type: 'new',  text: 'Anonymous donations — no viewer signup required' },
      { type: 'new',  text: 'Public donation page at eztips.live/send-message/[username]' },
      { type: 'new',  text: '7% platform fee — lowest in India' },
    ],
  },
]

const TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  new:  { bg: 'rgba(124,58,237,0.12)', color: '#a78bfa', label: 'NEW' },
  fix:  { bg: 'rgba(16,185,129,0.1)',  color: '#10b981', label: 'FIX' },
  imp:  { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'IMP' },
}

export default function ChangelogPage() {
  return (
    <div style={{
      minHeight: '100vh', background: '#06060f', color: '#f8fafc',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }}>
      {/* Nav */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/logo.png" alt="eztips" style={{ height: 30, borderRadius: 7, filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.5))' }} />
          <span style={{ fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>eztips</span>
        </Link>
        <Link href="/dashboard" style={{ fontSize: 13, color: '#475569', textDecoration: 'none' }}>← Dashboard</Link>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '52px 24px 80px' }}>
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '5px 14px', borderRadius: 20, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.08em' }}>CHANGELOG</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.8px' }}>What's New</h1>
          <p style={{ fontSize: 15, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
            Every update we ship to make eztips better for Indian streamers.
          </p>
        </div>

        {/* Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {CHANGELOG.map((release, ri) => (
            <div key={release.version} style={{ display: 'flex', gap: 24, position: 'relative' }}>
              {/* Timeline */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 16 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: ri === 0 ? '#7c3aed' : '#2d2d4e', border: `2px solid ${ri === 0 ? '#a78bfa' : '#3d3d5e'}`, marginTop: 6, flexShrink: 0, boxShadow: ri === 0 ? '0 0 12px rgba(124,58,237,0.5)' : 'none' }} />
                {ri < CHANGELOG.length - 1 && <div style={{ width: 1.5, flex: 1, background: 'rgba(255,255,255,0.06)', minHeight: 32, marginTop: 4, marginBottom: 4 }} />}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: ri < CHANGELOG.length - 1 ? 36 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.3px' }}>{release.version}</span>
                  {release.badge && (
                    <span style={{ fontSize: 10, fontWeight: 800, color: release.badgeColor, background: `${release.badgeColor}18`, border: `1px solid ${release.badgeColor}40`, padding: '2px 9px', borderRadius: 20, letterSpacing: '0.08em' }}>
                      {release.badge}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: '#334155', marginLeft: 'auto' }}>{release.date}</span>
                </div>

                <div style={{ padding: '16px 20px', borderRadius: 14, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {release.entries.map((e, i) => {
                    const ts = TYPE_STYLES[e.type] ?? TYPE_STYLES['new']!
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: ts.color, background: ts.bg, padding: '2px 7px', borderRadius: 6, flexShrink: 0, marginTop: 2, letterSpacing: '0.06em', minWidth: 30, textAlign: 'center' }}>
                          {ts.label}
                        </span>
                        <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>{e.text}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: '#334155', marginBottom: 12 }}>Have a feature request or found a bug?</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href="mailto:support@eztips.live" style={{ padding: '9px 20px', borderRadius: 10, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              ✉ Email us
            </a>
            <a href="https://discord.gg/sYq6UQqSt9" target="_blank" rel="noopener noreferrer" style={{ padding: '9px 20px', borderRadius: 10, background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.2)', color: '#818cf8', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Discord
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
