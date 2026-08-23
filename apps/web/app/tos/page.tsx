import Link from 'next/link'

export const metadata = { title: 'Terms of Service — eztips', description: 'Terms of Service for eztips streaming donation platform.' }

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

export default function TosPage() {
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
        <h1 style={s.h1}>Terms of Service</h1>
        <p style={s.meta}>Last updated: July 5, 2026 · Effective immediately</p>

        <p style={s.p}>
          Welcome to eztips. By accessing or using our platform, you agree to these Terms of Service. Please read them carefully. If you do not agree, do not use eztips.
        </p>

        <h2 style={s.h2}>1. Acceptance of Terms</h2>
        <p style={s.p}>
          These Terms of Service ("Terms") govern your use of eztips (the "Platform"), operated by eztips ("we", "us", or "our"). By creating an account or using any part of the Platform, you confirm that you are at least 18 years old and legally capable of entering into a binding agreement under Indian law.
        </p>

        <h2 style={s.h2}>2. Description of Service</h2>
        <p style={s.p}>
          eztips is a live streaming monetization platform that allows:
        </p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Streamers</strong> to create a donation page, receive tips from viewers, and withdraw their earnings.</li>
          <li style={s.li}><strong>Viewers</strong> to send monetary tips and messages to streamers without requiring an account.</li>
        </ul>
        <p style={s.p}>
          The Platform facilitates payments but is not a bank, payment processor, or financial institution. Payment processing is provided by Razorpay.
        </p>

        <h2 style={s.h2}>3. Platform Fees</h2>
        <p style={s.p}>
          eztips charges a platform fee only at the time of settlement (withdrawal), not on each donation received. The current fee structure is:
        </p>
        <ul style={s.ul}>
          <li style={s.li}><strong>Standard donations:</strong> 5% platform fee deducted at settlement.</li>
          <li style={s.li}><strong>Celebrity Voice donations:</strong> 20% platform fee deducted at settlement.</li>
          <li style={s.li}><strong>Viewers:</strong> No fees charged on the viewer side.</li>
        </ul>
        <p style={s.p}>
          Fees are subject to change. We will notify active streamers at least 14 days before any fee changes take effect.
        </p>

        <h2 style={s.h2}>4. Streamer Accounts</h2>
        <p style={s.p}>Streamer accounts are subject to the following:</p>
        <ul style={s.ul}>
          <li style={s.li}>You must provide accurate KYC and banking information to withdraw funds.</li>
          <li style={s.li}>Your username, once set, is permanent and cannot be changed.</li>
          <li style={s.li}>You are responsible for maintaining the confidentiality of your account credentials.</li>
          <li style={s.li}>You must not share your overlay URL or token publicly in a way that enables unauthorized use.</li>
          <li style={s.li}>You agree to receive GST invoices and comply with applicable Indian tax laws on your earnings.</li>
        </ul>

        <h2 style={s.h2}>5. Prohibited Uses</h2>
        <p style={s.p}>You may not use eztips to:</p>
        <ul style={s.ul}>
          <li style={s.li}>Facilitate fraudulent, deceptive, or illegal transactions.</li>
          <li style={s.li}>Solicit donations for activities that violate Indian law.</li>
          <li style={s.li}>Send harassing, abusive, or hate-speech-containing messages via the donation message feature.</li>
          <li style={s.li}>Impersonate another person or organization.</li>
          <li style={s.li}>Attempt to reverse-engineer, scrape, or attack our infrastructure.</li>
          <li style={s.li}>Create multiple accounts to circumvent bans or restrictions.</li>
        </ul>

        <h2 style={s.h2}>6. Payments and Refunds</h2>
        <p style={s.p}>
          All payments on eztips are voluntary tips from viewers to streamers. Once a payment is successfully processed, it is generally non-refundable. However, we may issue refunds at our sole discretion in cases of:
        </p>
        <ul style={s.ul}>
          <li style={s.li}>Duplicate or erroneous charges caused by a platform error.</li>
          <li style={s.li}>Fraudulent transactions reported within 7 days.</li>
        </ul>
        <p style={s.p}>
          To request a refund, contact us at support@eztips.in within 7 days of the transaction.
        </p>

        <h2 style={s.h2}>7. Settlements and Payouts</h2>
        <p style={s.p}>
          Streamers may initiate settlements at any time for any pending balance. Settlements are processed via Razorpay Payouts (IMPS/NEFT) to the bank account on file. We are not responsible for delays caused by banking partners or network issues. Settlements are subject to applicable income tax; streamers are solely responsible for their tax obligations.
        </p>

        <h2 style={s.h2}>8. Content and Messages</h2>
        <p style={s.p}>
          Viewers may send text messages with donations. You agree that messages sent through eztips will not contain:
        </p>
        <ul style={s.ul}>
          <li style={s.li}>Personal attacks, threats, or harassment.</li>
          <li style={s.li}>Sexually explicit content.</li>
          <li style={s.li}>Spam or promotional content unrelated to the streamer.</li>
        </ul>
        <p style={s.p}>
          Streamers have full control over messages displayed on their overlay. eztips is not responsible for message content generated by users.
        </p>

        <h2 style={s.h2}>9. Account Termination</h2>
        <p style={s.p}>
          We reserve the right to suspend or terminate any account, with or without notice, for violations of these Terms. Upon termination:
        </p>
        <ul style={s.ul}>
          <li style={s.li}>Any pending balance will be settled to the streamer's registered bank account within 14 business days, minus applicable fees.</li>
          <li style={s.li}>Access to the dashboard will be revoked immediately.</li>
        </ul>

        <h2 style={s.h2}>10. Disclaimers and Limitation of Liability</h2>
        <p style={s.p}>
          The Platform is provided "as is" without warranties of any kind, express or implied. We do not guarantee uninterrupted availability. To the maximum extent permitted by law, eztips shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform.
        </p>
        <p style={s.p}>
          Our total liability to you for any claim arising from these Terms shall not exceed the platform fees you paid to us in the 3 months preceding the claim.
        </p>

        <h2 style={s.h2}>11. Governing Law and Disputes</h2>
        <p style={s.p}>
          These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India. We encourage you to contact us first at support@eztips.in to resolve disputes amicably.
        </p>

        <h2 style={s.h2}>12. Changes to These Terms</h2>
        <p style={s.p}>
          We may update these Terms from time to time. Material changes will be communicated via email to registered streamers. Continued use of the Platform after changes constitutes acceptance of the revised Terms.
        </p>

        <h2 style={s.h2}>13. Contact Us</h2>
        <p style={s.p}>
          For any questions about these Terms, please contact us at:<br />
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
