'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eztips.live'
const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`

const card: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '22px 24px' }
const inp: React.CSSProperties = { width: '100%', padding: '9px 13px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, color: '#f1f5f9', fontSize: 13, boxSizing: 'border-box' }
const btn = (bg = '#22d3ee', c = '#04262b'): React.CSSProperties => ({ padding: '9px 18px', background: bg, color: c, border: 'none', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 700 })
const ghostBtn: React.CSSProperties = { ...btn('transparent', '#94a3b8'), border: '1px solid rgba(255,255,255,0.12)' }

interface Stats { pendingBalance: number; lifetimeEarned: number; referredCount: number; referralCode: string | null; isVerified: boolean; verificationRequestedAt: string | null; minPayout: number }
interface Bank { accountHolderName?: string; accountNumber?: string; ifscCode?: string; bankName?: string; upiId?: string }
interface ReferredStreamer { id: string; channelName: string | null; username: string | null; createdAt: string; donationCount: number; earnedFromThem: number }
interface Settlement { id: string; amount: string; status: 'INITIATED' | 'SUCCESS' | 'FAILED'; initiatedAt: string; settledAt: string | null; failureReason: string | null }

export default function ReferDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [bank, setBank] = useState<Bank>({})
  const [streamers, setStreamers] = useState<ReferredStreamer[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [settling, setSettling] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Stats>('/api/referral/stats'),
      api.get<Bank>('/api/referral/bank'),
      api.get<ReferredStreamer[]>('/api/referral/referred-streamers'),
      api.get<Settlement[]>('/api/referral/settlements'),
    ]).then(([s, b, rs, st]) => { setStats(s); setBank(b); setStreamers(rs); setSettlements(st) })
      .catch(() => router.push('/refer'))
      .finally(() => setLoading(false))
  }, [router])

  async function saveBank() {
    setSaving(true)
    try { await api.patch('/api/referral/bank', bank); toast.success('Bank details saved') }
    catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function requestVerification() {
    setRequesting(true)
    try {
      const updated = await api.post<any>('/api/referral/request-verification')
      setStats(s => s ? { ...s, verificationRequestedAt: updated.verificationRequestedAt } : s)
      toast.success('Verification requested — we’ll review your bank details soon')
    } catch (e: any) { toast.error(e.message) } finally { setRequesting(false) }
  }

  async function generateCode() {
    if (stats?.referralCode && !confirm('Generate a new code? Your old code will stop working for new signups (streamers already referred are unaffected).')) return
    setGenerating(true)
    try {
      const updated = await api.post<any>('/api/referral/generate-code')
      setStats(s => s ? { ...s, referralCode: updated.referralCode } : s)
      toast.success('Referral code ready!')
    } catch (e: any) { toast.error(e.message) } finally { setGenerating(false) }
  }

  async function requestPayout() {
    setSettling(true)
    try {
      const s = await api.post<Settlement>('/api/referral/settlements')
      setSettlements(p => [s, ...p])
      setStats(s2 => s2 ? { ...s2, pendingBalance: 0 } : s2)
      toast.success('Payout requested!')
    } catch (e: any) { toast.error(e.message) } finally { setSettling(false) }
  }

  function copyLink() {
    if (!stats?.referralCode) return
    navigator.clipboard.writeText(`${SITE}/signup?ref=${stats.referralCode}`)
    setCopied(true); setTimeout(() => setCopied(false), 1500)
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/refer')
  }

  if (loading || !stats) {
    return <div style={{ minHeight: '100vh', background: '#06060f', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'system-ui' }}>Loading…</div>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#06060f', color: '#e2e8f0', fontFamily: 'system-ui,sans-serif' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/logo.png" alt="EzTips" style={{ height: 32, borderRadius: 7 }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#22d3ee', background: 'rgba(34,211,238,0.1)', padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(34,211,238,0.25)' }}>Referral Partner</span>
        </div>
        <button onClick={signOut} style={ghostBtn}>Sign out</button>
      </div>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {!stats.isVerified && (
          <div style={{ ...card, border: '1px solid rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.05)' }}>
            <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#fbbf24', fontSize: 14 }}>
              {stats.verificationRequestedAt ? '⏳ Verification pending review' : '⚠ Get verified to start referring'}
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              {stats.verificationRequestedAt
                ? 'Our team is reviewing your bank details. You’ll be able to create a referral code once approved.'
                : 'Add your bank details below, then request verification. Once approved you can create your referral code and start earning.'}
            </p>
          </div>
        )}

        <div style={{ ...card }}>
          <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Bank Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input style={inp} placeholder="Account Holder Name" value={bank.accountHolderName ?? ''} onChange={e => setBank(b => ({ ...b, accountHolderName: e.target.value }))} />
            <input style={inp} placeholder="Bank Name" value={bank.bankName ?? ''} onChange={e => setBank(b => ({ ...b, bankName: e.target.value }))} />
            <input style={inp} placeholder="Account Number" value={bank.accountNumber ?? ''} onChange={e => setBank(b => ({ ...b, accountNumber: e.target.value }))} />
            <input style={inp} placeholder="IFSC Code" value={bank.ifscCode ?? ''} onChange={e => setBank(b => ({ ...b, ifscCode: e.target.value }))} />
          </div>
          <input style={{ ...inp, marginBottom: 14 }} placeholder="UPI ID (optional)" value={bank.upiId ?? ''} onChange={e => setBank(b => ({ ...b, upiId: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={saveBank} disabled={saving} style={btn()}>{saving ? 'Saving…' : 'Save Bank Details'}</button>
            {!stats.isVerified && !stats.verificationRequestedAt && (
              <button onClick={requestVerification} disabled={requesting || !bank.accountNumber} style={ghostBtn}>{requesting ? 'Requesting…' : 'Request Verification'}</button>
            )}
          </div>
        </div>

        {stats.isVerified && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              <div style={card}><p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pending Balance</p><p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fbbf24' }}>{fmt(stats.pendingBalance)}</p></div>
              <div style={card}><p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Lifetime Earned</p><p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#34d399' }}>{fmt(stats.lifetimeEarned)}</p></div>
              <div style={card}><p style={{ margin: '0 0 6px', fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Streamers Referred</p><p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#8b5cf6' }}>{stats.referredCount}</p></div>
            </div>

            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Your Referral Code</h3>
              {stats.referralCode ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 800, color: '#22d3ee', letterSpacing: '0.05em' }}>{stats.referralCode}</span>
                    <button onClick={generateCode} disabled={generating} style={{ ...ghostBtn, padding: '5px 12px', fontSize: 12 }}>{generating ? '…' : 'Regenerate'}</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 9, padding: '9px 13px' }}>
                    <span style={{ flex: 1, fontSize: 12.5, color: '#94a3b8', fontFamily: "'JetBrains Mono',monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{SITE}/signup?ref={stats.referralCode}</span>
                    <button onClick={copyLink} style={{ ...btn(copied ? '#34d399' : '#22d3ee'), padding: '5px 12px', fontSize: 12 }}>{copied ? 'Copied!' : 'Copy'}</button>
                  </div>
                </>
              ) : (
                <button onClick={generateCode} disabled={generating} style={btn()}>{generating ? 'Generating…' : 'Generate My Code'}</button>
              )}
            </div>

            <div style={card}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Referred Streamers ({streamers.length})</h3>
              {streamers.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 13 }}>No one has signed up with your code yet.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '6px 10px', fontWeight: 600 }}>Streamer</th>
                      <th style={{ padding: '6px 10px', fontWeight: 600 }}>Joined</th>
                      <th style={{ padding: '6px 10px', fontWeight: 600 }}>Donations</th>
                      <th style={{ padding: '6px 10px', fontWeight: 600, textAlign: 'right' }}>Earned</th>
                    </tr></thead>
                    <tbody>
                      {streamers.map(s => (
                        <tr key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '10px' }}>{s.channelName ?? s.username ?? '—'}</td>
                          <td style={{ padding: '10px', color: '#94a3b8' }}>{new Date(s.createdAt).toLocaleDateString('en-IN')}</td>
                          <td style={{ padding: '10px', color: '#94a3b8' }}>{s.donationCount}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>{fmt(s.earnedFromThem)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Payouts</h3>
                <button onClick={requestPayout} disabled={settling || stats.pendingBalance < stats.minPayout} style={btn()}>
                  {settling ? 'Requesting…' : `Request Payout (min ${fmt(stats.minPayout)})`}
                </button>
              </div>
              {settlements.length === 0 ? (
                <p style={{ color: '#475569', fontSize: 13 }}>No payout requests yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {settlements.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 9 }}>
                      <span style={{ fontSize: 13 }}>{fmt(Number(s.amount))}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{new Date(s.initiatedAt).toLocaleDateString('en-IN')}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, textTransform: 'uppercase',
                        color: s.status === 'SUCCESS' ? '#34d399' : s.status === 'FAILED' ? '#f87171' : '#fbbf24',
                        background: s.status === 'SUCCESS' ? 'rgba(52,211,153,0.1)' : s.status === 'FAILED' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)',
                      }}>{s.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
