import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — eztips', description: 'Privacy Policy for eztips streaming donation platform.' }

const s = {
  page: { minHeight: '100vh', background: '#050508', color: '#f8fafc', fontFamily: 'system-ui,-apple-system,sans-serif' },
  nav: { padding: '18px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky' as const, top: 0, zIndex: 50, background: 'rgba(5,5,8,0.85)', backdropFilter: 'blur(12px)' },
  container: { maxWidth: 780, margin: '0 auto', padding: '60px 24px 80px' },
  h1: { fontSize: 36, fontWeight: 800, marginBottom: 8, background: 'linear-gradient(135deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text' as const, WebkitTextFillColor: 'transparent' as const },
  meta: { fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 48 },
  h2: { fontSize: 18, fontWeight: 700, color: '#c4b5fd', marginTop: 40, marginBottom: 12 },
  p: { fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.75)', marginBottom: 16 },
  ul: { fontSize: 15, lineHeight: 1.75, color: 'rgba(255,255,255,0.75)', marginBottom: 16, paddingLeft: 24 },
  li: { marginBottom: 6 },
  footer: { borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 16 },
}

export default function PrivacyPage() {
  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="eztips" style={{ height: 30, borderRadius: 7, filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.5))' }} />
          <span style={{ fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>eztips</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/login" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '7px 16px', borderRadius: 8 }}>Login</Link>
          <Link href="/signup" style={{ fontSize: 14, color: '#fff', background: 'linear-gradient(135deg,#7c3aed,#db2777)', padding: '7px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 600 }}>Sign Up</Link>
        </div>
      </nav>

      <div style={s.container}>
        <h1 style={s.h1}>Privacy Policy</h1>
        <p style={s.meta}>Last updated: July 5, 2026 · Effective immediately</p>

        <p style={s.p}>
          At eztips, we take your privacy seriously. This Privacy Policy explains what data we collect, how we use it, and your rights as a user. By using eztips, you consent to the practices described here.
        </p>

        <h2 style={s.h2}>1. Information We Collect</h2>
        <p style={s.p}><strong style={{ color: '#e2e8f0' }}>For Streamers (registered accounts):</strong></p>
        <ul style={s.ul}>
          <li style={s.li}>Name, email address, and password (hashed).</li>
          <li style={s.li}>Channel name, bio, avatar, and social media links you provide.</li>
          <li style={s.li}>Bank account details (account number, IFSC) for settlement payouts.</li>
          <li style={s.li}>GST/invoice information (address, state) for tax compliance.</li>
          <li style={s.li}>Overlay and alert settings you configure.</li>
        </ul>
        <p style={s.p}><strong style={{ color: '#e2e8f0' }}>For Viewers (no account required):</strong></p>
        <ul style={s.ul}>
          <li style={s.li}>Donor name you enter (stored with the donation record).</li>
          <li style={s.li}>Donation message text.</li>
          <li style={s.li}>Payment details processed by Razorpay (we do not store card numbers or UPI PINs).</li>
          <li style={s.li}>Your name may be saved in your browser's localStorage for convenience on repeat visits — this data never leaves your device unless you make a donation.</li>
        </ul>
        <p style={s.p}><strong style={{ color: '#e2e8f0' }}>Automatically collected:</strong></p>
        <ul style={s.ul}>
          <li style={s.li}>IP address and approximate location (used for fraud prevention).</li>
          <li style={s.li}>Browser type, device type, and operating system.</li>
          <li style={s.li}>Pages visited and timestamps (standard server logs).</li>
        </ul>

        <h2 style={s.h2}>2. How We Use Your Information</h2>
        <ul style={s.ul}>
          <li style={s.li}><strong>Providing the service:</strong> Process payments, deliver donations to streamers, display alerts on overlays.</li>
          <li style={s.li}><strong>Settlements:</strong> Transfer earnings to streamer bank accounts via Razorpay Payouts.</li>
          <li style={s.li}><strong>Invoicing:</strong> Generate GST-compliant invoices for platform fees charged to streamers.</li>
          <li style={s.li}><strong>Account communication:</strong> Send transactional emails (settlement notifications, invoices, security alerts).</li>
          <li style={s.li}><strong>Fraud prevention:</strong> Detect and block suspicious payment activity.</li>
          <li style={s.li}><strong>Platform improvement:</strong> Analyze aggregated, anonymized usage patterns to improve features.</li>
        </ul>
        <p style={s.p}>We do not sell your personal data to third parties. We do not use your data for advertising.</p>

        <h2 style={s.h2}>3. Third-Party Services</h2>
        <p style={s.p}>We share data with the following third-party services only to the extent necessary to operate the Platform:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Razorpay</strong> — Payment processing and payouts. Razorpay collects payment details directly from viewers under their own privacy policy. We share streamer bank details with Razorpay to process settlements.</li>
          <li style={s.li}><strong>Google (YouTube Data API)</strong> — Used to detect whether a streamer is currently live on YouTube, to enhance the viewer donation page. No personal data is sent; only the streamer's YouTube channel handle/ID.</li>
          <li style={s.li}><strong>ElevenLabs</strong> — For streamers who enable Celebrity Voice TTS: donation message text is sent to ElevenLabs to generate audio. This is only activated when the streamer explicitly enables the feature.</li>
          <li style={s.li}><strong>Vercel</strong> — Frontend hosting. Vercel may log request metadata per their privacy policy.</li>
          <li style={s.li}><strong>Fly.io</strong> — Backend hosting. Fly.io may log request metadata per their privacy policy.</li>
        </ul>

        <h2 style={s.h2}>4. Cookies and Local Storage</h2>
        <p style={s.p}>We use:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>HttpOnly JWT cookies</strong> — For authentication of logged-in streamer and viewer accounts. These expire after your session or a defined period.</li>
          <li style={s.li}><strong>localStorage</strong> — On the donation page, the donor name you type may be saved locally in your browser so it auto-fills on your next visit. This data is stored on your device only and can be cleared by clearing browser storage.</li>
        </ul>
        <p style={s.p}>We do not use tracking cookies or third-party advertising cookies.</p>

        <h2 style={s.h2}>5. Data Retention</h2>
        <ul style={s.ul}>
          <li style={s.li}>Donation records are retained indefinitely for accounting and dispute resolution purposes.</li>
          <li style={s.li}>Settlement and invoice records are retained for 7 years as required under Indian tax law.</li>
          <li style={s.li}>If you delete your account, your profile data is anonymized. Donation records linked to your streamer ID are retained for legal compliance but disassociated from identifying information where possible.</li>
          <li style={s.li}>Server logs are retained for 30 days.</li>
        </ul>

        <h2 style={s.h2}>6. Your Rights</h2>
        <p style={s.p}>As a user of eztips, you have the right to:</p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
          <li style={s.li}><strong>Correction:</strong> Update inaccurate information via your profile settings or by contacting us.</li>
          <li style={s.li}><strong>Deletion:</strong> Request deletion of your account and associated data (subject to legal retention requirements).</li>
          <li style={s.li}><strong>Portability:</strong> Request an export of your donation history data in CSV format.</li>
        </ul>
        <p style={s.p}>To exercise these rights, contact us at <strong style={{ color: '#c4b5fd' }}>support@eztips.in</strong>. We will respond within 15 business days.</p>

        <h2 style={s.h2}>7. Data Security</h2>
        <p style={s.p}>
          We implement industry-standard security measures including encrypted connections (HTTPS/TLS), hashed passwords (bcrypt), HttpOnly cookies, and access controls on our database. Bank account numbers in our database are stored only for the purpose of Razorpay payout processing.
        </p>
        <p style={s.p}>
          Despite our efforts, no system is perfectly secure. In the event of a data breach that affects your personal information, we will notify affected users as required by applicable law.
        </p>

        <h2 style={s.h2}>8. Children's Privacy</h2>
        <p style={s.p}>
          eztips is not directed at individuals under the age of 18. We do not knowingly collect personal data from minors. If you believe a minor has created an account, please contact us and we will promptly delete the account.
        </p>

        <h2 style={s.h2}>9. Changes to This Policy</h2>
        <p style={s.p}>
          We may update this Privacy Policy periodically. Material changes will be communicated via email to registered accounts. The "Last updated" date at the top of this page reflects the most recent revision.
        </p>

        <h2 style={s.h2}>10. Contact Us</h2>
        <p style={s.p}>
          For any privacy-related questions or requests, please contact:<br />
          <strong style={{ color: '#c4b5fd' }}>support@eztips.in</strong>
        </p>
      </div>

      <footer style={s.footer}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/logo.png" alt="eztips" style={{ height: 30, borderRadius: 7, filter: 'drop-shadow(0 0 8px rgba(124,58,237,0.5))' }} />
          <span style={{ fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg,#c4b5fd,#f9a8d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>eztips</span>
        </Link>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>© 2026 eztips · Built for Indian Streamers</p>
        <div style={{ display: 'flex', gap: 24 }}>
          {[['Privacy Policy', '/privacy'], ['Terms of Service', '/tos']].map(([l, h]) => (
            <Link key={l} href={h!} style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
