'use client'
import { useEffect, useRef, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'
import StyledSelect, { SelectOption } from '../../../components/ui/StyledSelect'

type Tab = 'profile' | 'bank' | 'analytics'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 13px', borderRadius: 9, fontSize: 13,
  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)',
  color: '#f8fafc', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#475569',
  letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 7,
}
const C: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={labelStyle}>{label}</label>{children}</div>
}

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('profile')
  const [profile, setProfile] = useState<any>(null)
  const [bank, setBank] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setProfile((p: any) => ({ ...p, avatarUrl: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  function handleBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 3 * 1024 * 1024) { toast.error('Banner must be under 3MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setProfile((p: any) => ({ ...p, bannerUrl: ev.target?.result as string }))
    reader.readAsDataURL(file)
  }

  useEffect(() => { fetchAll().catch(() => {}) }, [])

  async function fetchAll() {
    const [p, b] = await Promise.all([
      api.get<any>('/api/streamer/profile'),
      api.get<any>('/api/streamer/bank'),
    ])
    setProfile(p)
    setBank(b)
  }

  async function saveProfile() {
    setSaving(true)
    try {
      await api.patch('/api/streamer/profile', {
        channelName: profile.channelName ?? '',
        bio: profile.bio ?? '',
        channelLink: profile.channelLink ?? '',
        avatarUrl: profile.avatarUrl ?? '',
        bannerUrl: profile.bannerUrl ?? '',
        socialTwitter: profile.socialTwitter ?? '',
        socialInstagram: profile.socialInstagram ?? '',
        socialYoutube: profile.socialYoutube ?? '',
        socialTwitch: profile.socialTwitch ?? '',
        socialDiscord: profile.socialDiscord ?? '',
        socialKick: profile.socialKick ?? '',
        discordWebhookUrl: profile.discordWebhookUrl ?? '',
      })
      await fetchAll()
      toast.success('Profile saved!')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function saveBank() {
    setSaving(true)
    try {
      await api.patch('/api/streamer/bank', bank)
      await fetchAll()
      toast.success('Bank details saved!')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  async function requestVerification() {
    setRequesting(true)
    try {
      await api.post('/api/streamer/request-verification', {})
      await fetchAll()
      toast.success('Verification requested! Admin will review shortly.')
    } catch (e: any) { toast.error(e.message) } finally { setRequesting(false) }
  }

  const verifStatus: 'verified' | 'pending' | 'unverified' =
    profile?.isVerified ? 'verified'
    : profile?.verificationRequestedAt ? 'pending'
    : 'unverified'

  const canRequestVerification = verifStatus === 'unverified' && !!(
    profile?.channelName &&
    bank?.accountHolderName && bank?.accountNumber && bank?.ifscCode && bank?.bankName &&
    bank?.invoiceName && bank?.streetAddress && bank?.city && bank?.pincode && bank?.state
  )

if (!profile) return (
    <div style={{ padding: 28, color: '#334155', fontSize: 13 }}>Loading profile…</div>
  )

  return (
    <div style={{ padding: 28, minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header card */}
      <div style={{ ...C, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()} title="Click to change photo">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="avatar" style={{ width: 60, height: 60, borderRadius: 16, objectFit: 'cover', border: '2px solid rgba(124,58,237,0.4)' }} />
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: 16, background: 'linear-gradient(135deg,#7c3aed,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'white' }}>
                {profile.channelName?.[0]?.toUpperCase() ?? 'S'}
              </div>
            )}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
              <span style={{ fontSize: 18 }}>📷</span>
            </div>
          </div>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f8fafc', marginBottom: 4 }}>{profile.channelName}</h1>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {verifStatus === 'verified' && <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20 }}>✓ Verified</span>}
              {verifStatus === 'pending' && <span style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '2px 8px', borderRadius: 20 }}>⏳ Verification Pending</span>}
              {verifStatus === 'unverified' && <span style={{ fontSize: 11, fontWeight: 600, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 20 }}>○ Not Verified</span>}
              {profile.isActive && <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20 }}>✓ Active</span>}
              <span style={{ fontSize: 11, color: '#475569' }}>Click photo to change</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canRequestVerification && (
            <button onClick={requestVerification} disabled={requesting} style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: requesting ? 'not-allowed' : 'pointer',
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981',
              opacity: requesting ? 0.7 : 1,
            }}>
              {requesting ? 'Requesting…' : '✦ Request Verification'}
            </button>
          )}
          <button onClick={tab === 'bank' ? saveBank : saveProfile} disabled={saving} style={{
            padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white',
            boxShadow: '0 0 20px rgba(124,58,237,0.3)', opacity: saving ? 0.7 : 1,
          }}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Verification banner */}
      {verifStatus === 'verified' && (
        <div style={{ ...C, padding: '14px 20px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#10b981', margin: 0 }}>Account Verified</p>
            <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>Your account is verified — you have full access to all features.</p>
          </div>
        </div>
      )}
      {verifStatus === 'pending' && (
        <div style={{ ...C, padding: '14px 20px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⏳</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', margin: 0 }}>Verification Under Review</p>
            <p style={{ fontSize: 12, color: '#475569', margin: '2px 0 0' }}>Requested on {new Date(profile.verificationRequestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}. Our team will approve your account shortly.</p>
          </div>
        </div>
      )}
      {verifStatus === 'unverified' && (
        <div style={{ ...C, padding: '14px 20px', background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.18)' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#f87171', marginBottom: 10 }}>Complete these steps to get verified:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: 'Channel Name', done: !!profile.channelName, tab: 'profile' },
              { label: 'Account Holder Name', done: !!bank?.accountHolderName, tab: 'bank' },
              { label: 'Account Number', done: !!bank?.accountNumber, tab: 'bank' },
              { label: 'IFSC Code', done: !!bank?.ifscCode, tab: 'bank' },
              { label: 'Bank Name', done: !!bank?.bankName, tab: 'bank' },
              { label: 'Full Name (GST)', done: !!bank?.invoiceName, tab: 'bank' },
              { label: 'Street Address', done: !!bank?.streetAddress, tab: 'bank' },
              { label: 'City', done: !!bank?.city, tab: 'bank' },
              { label: 'Pincode', done: !!bank?.pincode, tab: 'bank' },
              { label: 'State', done: !!bank?.state, tab: 'bank' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: item.done ? '#10b981' : '#475569', flexShrink: 0 }}>{item.done ? '✓' : '○'}</span>
                <span style={{ fontSize: 12, color: item.done ? '#10b981' : '#475569' }}>{item.label}</span>
              </div>
            ))}
          </div>
          {canRequestVerification && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 12, color: '#10b981' }}>All fields filled — you can now request verification!</p>
              <button onClick={requestVerification} disabled={requesting} style={{
                padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: requesting ? 'not-allowed' : 'pointer',
                background: 'linear-gradient(135deg,#059669,#10b981)', border: 'none', color: 'white', opacity: requesting ? 0.7 : 1,
              }}>
                {requesting ? 'Requesting…' : 'Request Verification →'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {(['profile', 'bank', 'analytics'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: tab === t ? 'linear-gradient(135deg,#7c3aed,#db2777)' : 'rgba(255,255,255,0.04)',
            border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.07)',
            color: tab === t ? 'white' : '#64748b', transition: 'all 0.15s',
          }}>
            {{ profile: 'Profile Info', bank: 'Bank & Invoice', analytics: 'Analytics' }[t]}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Channel Banner ── */}
          <div style={{ ...C, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Channel Banner</p>
                <p style={{ fontSize: 12, color: '#475569', margin: '4px 0 0' }}>Shown as the hero background on your donation page</p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {profile.bannerUrl && (
                  <button onClick={() => setProfile((p: any) => ({ ...p, bannerUrl: '' }))} style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
                    Remove
                  </button>
                )}
                <button onClick={() => bannerInputRef.current?.click()} style={{ padding: '7px 16px', borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', color: '#a78bfa' }}>
                  {profile.bannerUrl ? '🔄 Change Banner' : '📷 Upload Banner'}
                </button>
              </div>
            </div>
            <input ref={bannerInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleBannerChange} style={{ display: 'none' }} />

            {/* Banner preview / upload area */}
            <div
              onClick={() => !profile.bannerUrl && bannerInputRef.current?.click()}
              style={{
                width: '100%', height: 160, borderRadius: 12, overflow: 'hidden',
                background: profile.bannerUrl ? 'transparent' : 'rgba(255,255,255,0.02)',
                border: profile.bannerUrl ? 'none' : '2px dashed rgba(124,58,237,0.3)',
                cursor: profile.bannerUrl ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
              {profile.bannerUrl ? (
                <img src={profile.bannerUrl} alt="Banner" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>🖼️</div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: 0 }}>Click to upload banner</p>
                  <p style={{ fontSize: 11, color: '#334155', margin: '4px 0 0' }}>or drag & drop</p>
                </div>
              )}
            </div>

            {/* Specs — like YouTube */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
              {[
                { label: 'Recommended size', value: '1920 × 480 px' },
                { label: 'Minimum width', value: '1024 px' },
                { label: 'Max file size', value: '3 MB' },
                { label: 'File types', value: 'JPG, PNG, WebP, GIF' },
              ].map(spec => (
                <div key={spec.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 9, padding: '10px 12px' }}>
                  <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 4px' }}>{spec.label}</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: 0 }}>{spec.value}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#475569', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>💡</span> Banner appears behind your avatar on your public donation page. Landscape banners work best.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}>
            {/* Basic Info */}
            <div style={{ ...C, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>Basic Information</p>

              <Field label="Channel Name">
                <input value={profile.channelName ?? ''} onChange={e => setProfile((p: any) => ({ ...p, channelName: e.target.value }))} style={inputStyle} />
              </Field>

              <Field label="Channel Link">
                <input value={profile.channelLink ?? ''} onChange={e => setProfile((p: any) => ({ ...p, channelLink: e.target.value }))} placeholder="https://youtube.com/@yourname" style={inputStyle} />
              </Field>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Bio</label>
                <textarea value={profile.bio ?? ''} onChange={e => setProfile((p: any) => ({ ...p, bio: e.target.value }))}
                  placeholder="Tell viewers about yourself… (shown on your donation page)"
                  style={{ ...inputStyle, resize: 'none' as const, flex: 1, minHeight: 100 }} />
              </div>

              {/* Donation link info */}
              <div style={{ padding: '14px 16px', borderRadius: 11, background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)' }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#7c3aed', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 8 }}>Your Donation Link</p>
                {profile.username ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontSize: 12, color: '#a78bfa', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      eztips.live/send-message/<strong>{profile.username}</strong>
                    </span>
                    <button onClick={() => { navigator.clipboard.writeText(`https://eztips.live/send-message/${profile.username}`); }} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', flexShrink: 0 }}>Copy</button>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: '#475569' }}>Set your username on the Dashboard to activate your link</p>
                )}
              </div>
            </div>

            {/* Social Links */}
            <div style={{ ...C, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>Social Links</p>
              <p style={{ fontSize: 12, color: '#475569', marginTop: -8 }}>These appear on your public donation page</p>
              {[
                { key: 'socialTwitter',   label: 'X / Twitter',  ph: 'https://x.com/username',          icon: '𝕏' },
                { key: 'socialInstagram', label: 'Instagram',    ph: 'https://instagram.com/username',   icon: '◎' },
                { key: 'socialYoutube',   label: 'YouTube',      ph: 'https://youtube.com/@username',    icon: '▶' },
                { key: 'socialTwitch',    label: 'Twitch',       ph: 'https://twitch.tv/username',       icon: '♟' },
                { key: 'socialDiscord',   label: 'Discord',      ph: 'https://discord.gg/invite',        icon: '⌘' },
                { key: 'socialKick',      label: 'Kick',         ph: 'https://kick.com/username',        icon: '⚡' },
              ].map(s => (
                <div key={s.key}>
                  <label style={labelStyle}>{s.label}</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: '#475569', width: 20, textAlign: 'center', flexShrink: 0 }}>{s.icon}</span>
                    <input value={(profile as any)[s.key] ?? ''} onChange={e => setProfile((p: any) => ({ ...p, [s.key]: e.target.value }))} placeholder={s.ph} style={{ ...inputStyle, flex: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notifications row */}
          <div style={{ ...C, padding: '22px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(88,101,242,0.15)', border: '1px solid rgba(88,101,242,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⌘</div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', margin: 0 }}>Discord Notifications</p>
                <p style={{ fontSize: 11, color: '#475569', margin: 0, marginTop: 2 }}>Get a Discord message every time you receive a tip</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Webhook URL</label>
                <input
                  value={profile.discordWebhookUrl ?? ''}
                  onChange={e => setProfile((p: any) => ({ ...p, discordWebhookUrl: e.target.value }))}
                  placeholder="https://discord.com/api/webhooks/…"
                  style={inputStyle}
                />
              </div>
              <a href="https://support.discord.com/hc/en-us/articles/228383668" target="_blank" rel="noopener noreferrer"
                style={{ padding: '10px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, color: '#94a3b8', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none', whiteSpace: 'nowrap', display: 'block' }}>
                How to get webhook →
              </a>
            </div>
            <p style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>Create a webhook in your Discord server: Channel Settings → Integrations → Webhooks → New Webhook → Copy URL</p>
          </div>
        </div>
      )}

      {tab === 'bank' && bank !== null && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ ...C, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>Bank Account Details</p>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.18)' }}>
              <p style={{ fontSize: 12, color: '#60a5fa' }}>Contact support after updating bank details</p>
            </div>
            {[
              { key: 'accountHolderName', label: 'Account Holder Name', ph: 'Full name as on account', type: 'text' },
              { key: 'accountNumber',     label: 'Account Number',       ph: 'Account number',          type: 'password' },
              { key: 'ifscCode',          label: 'IFSC Code',            ph: 'e.g. SBIN0011785',        type: 'text' },
              { key: 'bankName',          label: 'Bank Name',            ph: 'e.g. State Bank of India', type: 'text' },
            ].map(f => (
              <Field key={f.key} label={f.label}>
                <input type={f.type} value={(bank as any)[f.key] ?? ''} onChange={e => setBank((b: any) => ({ ...b, [f.key]: e.target.value }))} placeholder={f.ph} style={inputStyle} />
              </Field>
            ))}
            <div style={{ marginTop: 4, padding: '10px 14px', borderRadius: 10, background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginBottom: 3 }}>5% Platform Fee</p>
              <p style={{ fontSize: 11, color: '#475569' }}>Only charged at settlement, never on donations</p>
            </div>
          </div>

          <div style={{ ...C, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>GST Invoice Details</p>
            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.18)' }}>
              <p style={{ fontSize: 12, color: '#60a5fa' }}>Used to generate GST-compliant invoices for your settlements</p>
            </div>
            {[
              { key: 'invoiceName',   label: 'Full Name',       ph: 'Your full name' },
              { key: 'streetAddress', label: 'Street Address',  ph: 'House/Flat, Street, Area' },
              { key: 'city',          label: 'City',            ph: 'e.g. Mumbai' },
              { key: 'pincode',       label: 'Pincode',         ph: 'e.g. 400001' },
            ].map(f => (
              <Field key={f.key} label={f.label}>
                <input value={(bank as any)[f.key] ?? ''} onChange={e => setBank((b: any) => ({ ...b, [f.key]: e.target.value }))} placeholder={f.ph} style={inputStyle} />
              </Field>
            ))}
            <Field label="State">
              <StyledSelect value={bank.state ?? ''} onChange={e => setBank((b: any) => ({ ...b, state: e.target.value }))}>
                <SelectOption value="">Select State</SelectOption>
                {['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal'].map(s => (
                  <SelectOption key={s} value={s}>{s}</SelectOption>
                ))}
              </StyledSelect>
            </Field>
          </div>
        </div>
      )}

      {tab === 'analytics' && <AnalyticsTab />}
    </div>
  )
}

// ── Analytics Tab ─────────────────────────────────────────────────────────────
const AC: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14 }

function StatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color: string }) {
  return (
    <div style={{ ...AC, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
      </div>
      <p style={{ fontSize: 24, fontWeight: 800, color, margin: 0, letterSpacing: '-0.5px' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function AnalyticsTab() {
  const [data, setData] = useState<any>(null)
  const [range, setRange] = useState('30d')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get<any>(`/api/streamer/analytics?range=${range}`)
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [range])

  if (loading) return (
    <div style={{ padding: '60px', textAlign: 'center', color: '#475569', fontSize: 13 }}>
      Loading analytics…
    </div>
  )

  if (!data) return (
    <div style={{ ...AC, padding: '60px', textAlign: 'center' }}>
      <p style={{ color: '#475569', fontSize: 13 }}>Could not load analytics. Try refreshing.</p>
    </div>
  )

  const hasData = data.totals.count > 0
  const fmtDate = (d: string) => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth()+1}` }
  const peaked = data.hourDistribution.reduce((mx: any, h: any) => h.amount > (mx?.amount ?? 0) ? h : mx, null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Range toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Earnings Analytics</h2>
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 9, padding: 3, border: '1px solid rgba(255,255,255,0.07)' }}>
          {[['7d','7 Days'],['30d','30 Days'],['90d','90 Days']].map(([v,l]) => (
            <button key={v} onClick={() => setRange(v ?? '30d')} style={{
              padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              background: range === v ? 'linear-gradient(135deg,#7c3aed,#ec4899)' : 'transparent',
              border: 'none', color: range === v ? 'white' : '#64748b', transition: 'all 0.15s',
            }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        <StatCard icon="💰" label="Total Earned" value={`₹${data.totals.earned}`} sub="All time gross" color="#a78bfa" />
        <StatCard icon="📨" label="Donations" value={data.totals.count.toString()} sub="Successful payments" color="#34d399" />
        <StatCard icon="📊" label="Avg Donation" value={`₹${data.totals.avg}`} sub="Per transaction" color="#60a5fa" />
        <StatCard icon="👑" label="Top Donation" value={`₹${data.totals.max}`} sub="Single largest" color="#fbbf24" />
      </div>

      {!hasData ? (
        <div style={{ ...AC, padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>📭</div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 8px' }}>No donations yet</p>
          <p style={{ fontSize: 13, color: '#475569' }}>Share your donation link to start collecting tips</p>
        </div>
      ) : (
        <>
          {/* Earnings over time */}
          <div style={{ ...AC, padding: '18px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span>📈</span> Earnings — Last {range === '7d' ? '7' : range === '30d' ? '30' : '90'} Days
            </p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.dailyEarnings.map((d: any) => ({ ...d, date: fmtDate(d.date) }))} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip contentStyle={{ background: '#0c0d1a', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 12 }} formatter={(v: any) => [`₹${v}`, 'Earned']} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#a78bfa' }} />
                <Bar dataKey="amount" fill="url(#barGrad)" radius={[4,4,0,0]} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Top donors */}
            <div style={{ ...AC, padding: '18px 20px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}><span>🏆</span> Top Supporters</p>
              {data.topDonors.length === 0 ? (
                <p style={{ fontSize: 12, color: '#475569' }}>No donations yet</p>
              ) : data.topDonors.map((d: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, background: ['rgba(255,215,0,0.15)','rgba(192,192,192,0.1)','rgba(205,127,50,0.1)','rgba(255,255,255,0.05)','rgba(255,255,255,0.05)'][i] ?? 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
                    {['🥇','🥈','🥉','4️⃣','5️⃣'][i]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</p>
                    <p style={{ fontSize: 10, color: '#475569', margin: 0 }}>{d.count} donation{d.count !== 1 ? 's' : ''}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>₹{d.total}</span>
                </div>
              ))}
            </div>

            {/* Peak hour */}
            <div style={{ ...AC, padding: '18px 20px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}><span>⏰</span> Activity by Hour</p>
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={data.hourDistribution} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis dataKey="hour" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={h => h % 6 === 0 ? `${h}h` : ''} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#0c0d1a', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`₹${v}`, 'Earned']} labelFormatter={h => `${h}:00`} labelStyle={{ color: '#94a3b8' }} itemStyle={{ color: '#34d399' }} />
                  <Bar dataKey="amount" fill="#34d399" opacity={0.7} radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              {peaked && (
                <p style={{ fontSize: 11, color: '#475569', margin: '8px 0 0', textAlign: 'center' }}>
                  Peak at <span style={{ color: '#34d399', fontWeight: 600 }}>{peaked.hour}:00</span>
                </p>
              )}
            </div>
          </div>

          {/* Recent activity */}
          <div style={{ ...AC, padding: '18px 20px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}><span>⚡</span> Recent Donations</p>
            {data.recentDonations.map((d: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: i < data.recentDonations.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {d.amount >= 1000 ? '👑' : d.amount >= 500 ? '🔥' : d.amount >= 100 ? '💜' : '🎉'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{d.name}</p>
                  <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>{d.paidAt ? new Date(d.paidAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}</p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#a78bfa' }}>₹{d.amount}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
