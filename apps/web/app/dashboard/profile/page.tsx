'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../../lib/api'
import toast from 'react-hot-toast'

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
  const [usernameInput, setUsernameInput] = useState('')
  const [settingUsername, setSettingUsername] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return }
    const reader = new FileReader()
    reader.onload = ev => setProfile((p: any) => ({ ...p, avatarUrl: ev.target?.result as string }))
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
        socialTwitter: profile.socialTwitter ?? '',
        socialInstagram: profile.socialInstagram ?? '',
        socialYoutube: profile.socialYoutube ?? '',
        socialTwitch: profile.socialTwitch ?? '',
        socialDiscord: profile.socialDiscord ?? '',
        socialKick: profile.socialKick ?? '',
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

  async function setUsername() {
    if (!usernameInput) return
    setSettingUsername(true)
    try {
      const updated = await api.post<any>('/api/streamer/profile/username', { username: usernameInput })
      setProfile((p: any) => ({ ...p, username: updated.username }))
      toast.success('Username set!')
    } catch (e: any) { toast.error(e.message) } finally { setSettingUsername(false) }
  }

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
              {profile.isVerified && <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20 }}>✓ Verified</span>}
              {profile.isActive && <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: 20 }}>✓ Active</span>}
              <span style={{ fontSize: 11, color: '#475569' }}>Click photo to change</span>
            </div>
          </div>
        </div>
        <button onClick={tab === 'bank' ? saveBank : saveProfile} disabled={saving} style={{
          padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
          background: 'linear-gradient(135deg,#7c3aed,#db2777)', border: 'none', color: 'white',
          boxShadow: '0 0 20px rgba(124,58,237,0.3)', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ ...C, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>Basic Information</p>

            <Field label="Channel Name">
              <input value={profile.channelName ?? ''} onChange={e => setProfile((p: any) => ({ ...p, channelName: e.target.value }))} style={inputStyle} />
            </Field>

            <Field label="Channel Link">
              <input value={profile.channelLink ?? ''} onChange={e => setProfile((p: any) => ({ ...p, channelLink: e.target.value }))} placeholder="https://youtube.com/@yourname" style={inputStyle} />
            </Field>

            <Field label="Donation Link Username">
              {profile.username ? (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <p style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>✓ Username Set</p>
                  <p style={{ fontSize: 12, color: '#94a3b8' }}>send-message/<span style={{ color: '#a78bfa', fontWeight: 700 }}>{profile.username}</span></p>
                  <p style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>Permanent — cannot be changed</p>
                </div>
              ) : (
                <>
                  <div style={{ padding: '8px 12px', borderRadius: 9, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)', marginBottom: 8 }}>
                    <p style={{ fontSize: 11, color: '#f59e0b' }}>⚠ One-time only — cannot be changed after setting</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={usernameInput} onChange={e => setUsernameInput(e.target.value)} placeholder="yourusername" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={setUsername} disabled={settingUsername} style={{ padding: '10px 16px', borderRadius: 9, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      Set
                    </button>
                  </div>
                </>
              )}
            </Field>

            <Field label="Bio">
              <textarea value={profile.bio ?? ''} onChange={e => setProfile((p: any) => ({ ...p, bio: e.target.value }))} rows={3}
                placeholder="Tell viewers about yourself…" style={{ ...inputStyle, resize: 'none' as const }} />
            </Field>
          </div>

          <div style={{ ...C, padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc', marginBottom: 2 }}>Social Links</p>
            {[
              { key: 'socialTwitter',   label: 'X / Twitter',  ph: 'https://x.com/username' },
              { key: 'socialInstagram', label: 'Instagram',    ph: 'https://instagram.com/username' },
              { key: 'socialYoutube',   label: 'YouTube',      ph: 'https://youtube.com/@username' },
              { key: 'socialTwitch',    label: 'Twitch',       ph: 'https://twitch.tv/username' },
              { key: 'socialDiscord',   label: 'Discord',      ph: 'https://discord.gg/invite' },
              { key: 'socialKick',      label: 'Kick',         ph: 'https://kick.com/username' },
            ].map(s => (
              <Field key={s.key} label={s.label}>
                <input value={(profile as any)[s.key] ?? ''} onChange={e => setProfile((p: any) => ({ ...p, [s.key]: e.target.value }))} placeholder={s.ph} style={inputStyle} />
              </Field>
            ))}
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
              <select value={bank.state ?? ''} onChange={e => setBank((b: any) => ({ ...b, state: e.target.value }))} style={{ ...inputStyle }}>
                <option value="">Select State</option>
                {['Andhra Pradesh','Delhi','Gujarat','Karnataka','Kerala','Maharashtra','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','West Bengal'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      )}

      {tab === 'analytics' && (
        <div style={{ ...C, padding: '80px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#f8fafc', marginBottom: 8 }}>Analytics Coming Soon</p>
          <p style={{ fontSize: 13, color: '#475569' }}>Detailed earnings charts and donor insights will appear here</p>
        </div>
      )}
    </div>
  )
}
