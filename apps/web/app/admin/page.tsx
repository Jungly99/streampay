'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AdminPerms { overview:boolean; streamers:boolean; users:boolean; donations:boolean; settlements:boolean }
interface AdminMe { adminId:string; email:string; name?:string; avatar?:string; isSuperAdmin:boolean; permissions:AdminPerms }
interface Stats { totalStreamers:number; totalViewers:number; totalDonations:number; totalCollected:number; pendingSettlements:number; totalPaidOut:number }
interface BankDetails { id:string; accountHolderName:string|null; accountNumber:string|null; ifscCode:string|null; bankName:string|null; invoiceName:string|null; streetAddress:string|null; city:string|null; state:string|null; pincode:string|null }
interface Streamer { id:string; userId:string; username:string|null; channelName:string|null; channelLink:string|null; bio:string|null; email:string; displayName:string|null; isActive:boolean; isVerified:boolean; verificationRequestedAt:string|null; minDonationAmount:number; overlayToken:string|null; discordWebhookUrl:string|null; createdAt:string; donationCount:number; settlementCount:number; pendingBalance:number; pendingNet:number; totalCollected:number; bankDetails:BankDetails|null }
interface User { id:string; email:string; accountType:string; displayName:string|null; createdAt:string; streamerProfile:{id:string;username:string|null;channelName:string|null;isActive:boolean;isVerified:boolean}|null; viewerProfile:{id:string;displayName:string|null}|null }
interface Donation { id:string; donorName:string; message:string|null; amount:number; status:string; createdAt:string; cfOrderId:string; cfPaymentId:string|null; settled:boolean; streamer:{username:string|null;channelName:string|null} }
interface Settlement { id:string; grossAmount:number; feeAmount:string; netAmount:string; status:'INITIATED'|'SUCCESS'|'FAILED'; initiatedAt:string; settledAt:string|null; failureReason:string|null; cfTransferId:string|null; streamer:{username:string|null;channelName:string|null;user:{email:string};bankDetails:BankDetails|null} }
interface Role { id:string; name:string; permissions:AdminPerms; _count?:{admins:number}; createdAt:string }
interface AdminUser { id:string; email:string; name:string|null; avatar:string|null; isSuperAdmin:boolean; role:Role|null; createdAt:string }

type TabType = 'overview'|'streamers'|'users'|'donations'|'settlements'|'team'

// ─── Styles ────────────────────────────────────────────────────────────────────
const fmt = (n:number) => `₹${n.toLocaleString('en-IN')}`
const S_COLORS:Record<string,string> = { INITIATED:'#f59e0b', SUCCESS:'#10b981', FAILED:'#ef4444', PENDING:'#6b7280', REFUNDED:'#8b5cf6', streamer:'#7c3aed', viewer:'#06b6d4' }
function Badge({v}:{v:string}){ return <span style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:(S_COLORS[v]??'#6b7280')+'22',color:S_COLORS[v]??'#6b7280',textTransform:'uppercase',letterSpacing:.5}}>{v}</span> }
const card:React.CSSProperties = { background:'#1a1a2e', border:'1px solid #2d2d4e', borderRadius:14 }
const inp:React.CSSProperties = { width:'100%', padding:'8px 12px', background:'#0f0f1a', border:'1px solid #2d2d4e', borderRadius:8, color:'#e2e8f0', fontSize:13, boxSizing:'border-box' }
const btn = (bg='#7c3aed',c='#fff'):React.CSSProperties => ({ padding:'7px 16px', background:bg, color:c, border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 })
const ghostBtn:React.CSSProperties = { ...btn('transparent','#aaa'), border:'1px solid #2d2d4e' }
const dangerBtn:React.CSSProperties = btn('#ef444422','#f87171')
const ALL_PERMS:Array<keyof AdminPerms> = ['overview','streamers','users','donations','settlements']

// ─── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }:{ title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.7)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div style={{...card,padding:'28px 32px',maxWidth:600,width:'100%',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:700}}>{title}</h3>
          <button onClick={onClose} style={{...ghostBtn,padding:'4px 10px'}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
function Field({ label, value, onChange, type='text', readOnly }:{ label:string; value:string; onChange?:(v:string)=>void; type?:string; readOnly?:boolean }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>{label}</label>
      <input type={type} value={value} readOnly={readOnly} onChange={e=>onChange?.(e.target.value)}
        style={{...inp, opacity:readOnly?.5:1, cursor:readOnly?'default':'text'}} />
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [admin, setAdmin] = useState<AdminMe|null>(null)
  const [tab, setTab] = useState<TabType>('overview')

  const [stats, setStats]           = useState<Stats|null>(null)
  const [streamers, setStreamers]   = useState<Streamer[]>([])
  const [users, setUsers]           = useState<User[]>([])
  const [donations, setDonations]   = useState<Donation[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [roles, setRoles]           = useState<Role[]>([])
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])

  const [streamerSearch, setStreamerSearch]      = useState('')
  const [settlementFilter, setSettlementFilter] = useState('INITIATED')
  const [donationFilter, setDonationFilter]     = useState('')
  const [userSearch, setUserSearch]             = useState('')
  const [donationSearch, setDonationSearch]     = useState('')

  const [toast, setToast]       = useState('')
  const [transferRef, setTransferRef] = useState<Record<string,string>>({})

  const [editStreamer, setEditStreamer]   = useState<Streamer|null>(null)
  const [editBank, setEditBank]           = useState<Streamer|null>(null)
  const [editUser, setEditUser]           = useState<User|null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{id:string;label:string;type:'user'}|null>(null)
  const [sForm, setSForm]   = useState<Partial<Streamer>>({})
  const [bForm, setBForm]   = useState<Partial<BankDetails>>({})
  const [uForm, setUForm]   = useState<{email:string;displayName:string}>({email:'',displayName:''})

  // Role/admin management state
  const [newRoleName, setNewRoleName]   = useState('')
  const [newRolePerms, setNewRolePerms] = useState<AdminPerms>({ overview:false, streamers:false, users:false, donations:false, settlements:false })
  const [editRole, setEditRole]         = useState<Role|null>(null)
  const [editRolePerms, setEditRolePerms] = useState<AdminPerms>({ overview:false, streamers:false, users:false, donations:false, settlements:false })
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminRoleId, setNewAdminRoleId] = useState('')

  const showToast = useCallback((msg:string) => { setToast(msg); setTimeout(()=>setToast(''),3500) }, [])

  const api = useCallback(async (path:string, opts?:RequestInit) => {
    const r = await fetch(`/backend/api/admin${path}`, {
      credentials: 'include',
      headers: { 'Content-Type':'application/json', ...(opts?.headers as Record<string,string>|undefined) },
      ...opts,
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }, [])

  // Auth check
  useEffect(() => {
    fetch('/backend/api/admin/auth/me', { credentials:'include' })
      .then(r => { if (!r.ok) throw new Error('unauth'); return r.json() })
      .then(d => setAdmin(d.admin))
      .catch(() => router.push('/admin/login'))
  }, [router])

  // Set first allowed tab once admin loads
  useEffect(() => {
    if (!admin) return
    if (admin.isSuperAdmin) { setTab('overview'); return }
    const first = ALL_PERMS.find(p => admin.permissions[p])
    if (first) setTab(first as TabType)
  }, [admin])

  const reload = useCallback(() => {
    if (!admin) return
    if (admin.isSuperAdmin || admin.permissions.overview) api('/stats').then(setStats).catch(()=>{})
    if (tab==='streamers' && (admin.isSuperAdmin||admin.permissions.streamers)) api('/streamers').then(setStreamers).catch(()=>{})
    if (tab==='users' && (admin.isSuperAdmin||admin.permissions.users)) api('/users').then(setUsers).catch(()=>{})
    if (tab==='donations' && (admin.isSuperAdmin||admin.permissions.donations)) api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}`).then((d:any)=>setDonations(d.donations)).catch(()=>{})
    if (tab==='settlements' && (admin.isSuperAdmin||admin.permissions.settlements)) api(`/settlements${settlementFilter?`?status=${settlementFilter}`:''}`).then(setSettlements).catch(()=>{})
  }, [admin, tab, api, donationFilter, settlementFilter])

  useEffect(() => {
    if (!admin) return
    if (admin.isSuperAdmin || admin.permissions.overview) api('/stats').then(setStats).catch(()=>{})
  }, [admin, api])

  useEffect(() => {
    if (!admin) return
    if (tab==='streamers' && (admin.isSuperAdmin||admin.permissions.streamers)) api('/streamers').then(setStreamers).catch(()=>{})
    if (tab==='users' && (admin.isSuperAdmin||admin.permissions.users)) api(`/users${userSearch?`?search=${userSearch}`:''}`).then(setUsers).catch(()=>{})
    if (tab==='donations' && (admin.isSuperAdmin||admin.permissions.donations)) api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${donationSearch}`:''}`).then((d:any)=>setDonations(d.donations)).catch(()=>{})
    if (tab==='settlements' && (admin.isSuperAdmin||admin.permissions.settlements)) api(`/settlements${settlementFilter?`?status=${settlementFilter}`:''}`).then(setSettlements).catch(()=>{})
    if (tab==='team' && admin.isSuperAdmin) {
      api('/roles').then(setRoles).catch(()=>{})
      api('/admin-users').then(setAdminUsers).catch(()=>{})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, admin, settlementFilter, donationFilter])

  // ── Streamer actions ────────────────────────────────────────────────────────
  async function toggleStreamerField(id:string, field:'isActive'|'isVerified', val:boolean) {
    await api(`/streamers/${id}`, { method:'PATCH', body:JSON.stringify({ [field]:val }) })
    setStreamers(p=>p.map(s=>s.id===id?{...s,[field]:val}:s))
    showToast('Updated')
  }
  async function approveVerification(id:string) {
    await api(`/streamers/${id}/approve-verification`, { method:'POST' })
    setStreamers(p=>p.map(s=>s.id===id?{...s,isVerified:true,verificationRequestedAt:null}:s))
    showToast('✓ Streamer verified!')
  }
  async function rejectVerification(id:string) {
    await api(`/streamers/${id}/reject-verification`, { method:'POST' })
    setStreamers(p=>p.map(s=>s.id===id?{...s,verificationRequestedAt:null}:s))
    showToast('Verification request cleared')
  }
  async function saveStreamer() {
    if (!editStreamer) return
    await api(`/streamers/${editStreamer.id}`, { method:'PATCH', body:JSON.stringify(sForm) })
    setStreamers(p=>p.map(s=>s.id===editStreamer.id?{...s,...sForm}:s))
    setEditStreamer(null); showToast('Streamer saved')
  }
  async function saveBank() {
    if (!editBank) return
    await api(`/streamers/${editBank.id}/bank`, { method:'PATCH', body:JSON.stringify(bForm) })
    setStreamers(p=>p.map(s=>s.id===editBank.id?{...s,bankDetails:{...(s.bankDetails??{id:'',invoiceName:null,streetAddress:null,city:null,state:null,pincode:null}),...bForm} as BankDetails}:s))
    setEditBank(null); showToast('Bank details saved')
  }
  async function resetOverlay(id:string) {
    if (!confirm('Reset overlay token? This will break the current OBS source URL.')) return
    const res = await api(`/streamers/${id}/reset-overlay`, { method:'POST' })
    setStreamers(p=>p.map(s=>s.id===id?{...s,overlayToken:res.overlayToken}:s))
    showToast('Overlay token reset')
  }

  // ── User actions ─────────────────────────────────────────────────────────────
  async function saveUser() {
    if (!editUser) return
    await api(`/users/${editUser.id}`, { method:'PATCH', body:JSON.stringify(uForm) })
    setUsers(p=>p.map(u=>u.id===editUser.id?{...u,...uForm}:u))
    setEditUser(null); showToast('User updated')
  }
  async function deleteUser() {
    if (!confirmDelete) return
    await api(`/users/${confirmDelete.id}`, { method:'DELETE' })
    setUsers(p=>p.filter(u=>u.id!==confirmDelete.id))
    setStreamers(p=>p.filter(s=>s.userId!==confirmDelete.id))
    setConfirmDelete(null); showToast('User deleted')
  }

  // ── Donation actions ──────────────────────────────────────────────────────────
  async function updateDonationStatus(id:string, status:string) {
    await api(`/donations/${id}`, { method:'PATCH', body:JSON.stringify({ status }) })
    setDonations(p=>p.map(d=>d.id===id?{...d,status}:d))
    showToast('Status updated')
  }

  // ── Settlement actions ────────────────────────────────────────────────────────
  async function markPaid(id:string) {
    await api(`/settlements/${id}/mark-paid`, { method:'PATCH', body:JSON.stringify({ transferRef:transferRef[id]||undefined }) })
    setSettlements(p=>p.filter(s=>s.id!==id))
    setStats(p=>p?{...p,pendingSettlements:p.pendingSettlements-1}:p)
    showToast('Marked as paid ✓')
  }
  async function markFailed(id:string) {
    await api(`/settlements/${id}/mark-failed`, { method:'PATCH', body:JSON.stringify({ reason:'Marked failed by admin' }) })
    setSettlements(p=>p.filter(s=>s.id!==id))
    showToast('Marked as failed')
  }

  // ── Role actions ──────────────────────────────────────────────────────────────
  async function createRole() {
    if (!newRoleName.trim()) return
    const role = await api('/roles', { method:'POST', body:JSON.stringify({ name:newRoleName.trim(), permissions:newRolePerms }) })
    setRoles(p=>[...p, role])
    setNewRoleName(''); setNewRolePerms({ overview:false, streamers:false, users:false, donations:false, settlements:false })
    showToast('Role created')
  }
  async function saveEditRole() {
    if (!editRole) return
    const updated = await api(`/roles/${editRole.id}`, { method:'PATCH', body:JSON.stringify({ permissions:editRolePerms }) })
    setRoles(p=>p.map(r=>r.id===editRole.id?{...r,...updated}:r))
    setEditRole(null); showToast('Role updated')
  }
  async function deleteRole(id:string) {
    if (!confirm('Delete this role? Admins with this role will lose access.')) return
    await api(`/roles/${id}`, { method:'DELETE' })
    setRoles(p=>p.filter(r=>r.id!==id))
    showToast('Role deleted')
  }
  async function addAdmin() {
    if (!newAdminEmail.trim()) return
    const a = await api('/admin-users', { method:'POST', body:JSON.stringify({ email:newAdminEmail.trim(), roleId:newAdminRoleId||null }) })
    setAdminUsers(p=>[...p, a])
    setNewAdminEmail(''); setNewAdminRoleId('')
    showToast('Admin added')
  }
  async function changeAdminRole(adminId:string, roleId:string|null) {
    const updated = await api(`/admin-users/${adminId}`, { method:'PATCH', body:JSON.stringify({ roleId }) })
    setAdminUsers(p=>p.map(a=>a.id===adminId?{...a,...updated}:a))
    showToast('Role updated')
  }
  async function removeAdmin(adminId:string) {
    if (!confirm('Remove this admin?')) return
    await api(`/admin-users/${adminId}`, { method:'DELETE' })
    setAdminUsers(p=>p.filter(a=>a.id!==adminId))
    showToast('Admin removed')
  }

  async function signOut() {
    await fetch('/backend/api/admin/auth/logout', { method:'POST', credentials:'include' })
    router.push('/admin/login')
  }

  if (!admin) return (
    <div style={{minHeight:'100vh',background:'#0f0f1a',display:'flex',alignItems:'center',justifyContent:'center',color:'#888',fontFamily:'system-ui'}}>
      Authenticating…
    </div>
  )

  const canSee = (p: keyof AdminPerms) => admin.isSuperAdmin || admin.permissions[p]

  const TABS = ([
    { key:'overview'    as TabType, label:'Overview',    show:canSee('overview') },
    { key:'streamers'   as TabType, label:'Streamers',   show:canSee('streamers') },
    { key:'users'       as TabType, label:'Users',       show:canSee('users') },
    { key:'donations'   as TabType, label:'Donations',   show:canSee('donations') },
    { key:'settlements' as TabType, label:'Settlements', show:canSee('settlements') },
    { key:'team'        as TabType, label:'Team',        show:admin.isSuperAdmin },
  ] as Array<{key:TabType;label:string;show:boolean}>).filter(t=>t.show)

  return (
    <div style={{fontFamily:'system-ui,sans-serif',background:'#0f0f1a',minHeight:'100vh',color:'#e2e8f0'}}>
      {toast && <div style={{position:'fixed',top:20,right:20,zIndex:200,background:'#10b981',color:'#fff',padding:'10px 20px',borderRadius:10,fontSize:14,fontWeight:600,boxShadow:'0 4px 20px #0008'}}>{toast}</div>}

      {/* top bar */}
      <div style={{background:'#1a1a2e',borderBottom:'1px solid #2d2d4e',padding:'12px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{fontWeight:800,fontSize:18,color:'#7c3aed'}}>eztips</span>
          <span style={{color:'#555',fontSize:12}}>{admin.isSuperAdmin ? '⭐ Super Admin' : '🔑 Admin'}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          {admin.avatar && <img src={admin.avatar} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover'}}/>}
          <span style={{color:'#aaa',fontSize:13}}>{admin.name ?? admin.email}</span>
          <button onClick={reload} style={ghostBtn}>↻</button>
          <button onClick={signOut} style={ghostBtn}>Sign out</button>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:'0 auto',padding:'24px 20px'}}>
        {/* tabs */}
        <div style={{display:'flex',gap:4,marginBottom:24,background:'#1a1a2e',borderRadius:12,padding:4,width:'fit-content',border:'1px solid #2d2d4e',flexWrap:'wrap'}}>
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{padding:'8px 18px',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,
              background:tab===t.key?'#7c3aed':'transparent',color:tab===t.key?'#fff':'#888',transition:'all .15s'}}>
              {t.label}
              {t.key==='settlements'&&stats?.pendingSettlements?<span style={{marginLeft:6,background:'#f59e0b',color:'#000',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700}}>{stats.pendingSettlements}</span>:null}
              {t.key==='team'&&<span style={{marginLeft:5,fontSize:10,color:'#7c3aed',fontWeight:700}}>SA</span>}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ══════════════════════════════════════════════════════════ */}
        {tab==='overview' && stats && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:24}}>
              {[
                {label:'Streamers',   value:stats.totalStreamers,      color:'#7c3aed'},
                {label:'Viewers',     value:stats.totalViewers,        color:'#06b6d4'},
                {label:'Donations',   value:stats.totalDonations,      color:'#3b82f6'},
                {label:'Collected',   value:fmt(stats.totalCollected),  color:'#10b981'},
                {label:'Pending Pay', value:stats.pendingSettlements,  color:'#f59e0b'},
                {label:'Paid Out',    value:fmt(stats.totalPaidOut),   color:'#ec4899'},
              ].map(c=>(
                <div key={c.label} style={{...card,padding:'18px 22px'}}>
                  <p style={{color:'#666',fontSize:12,margin:'0 0 6px',textTransform:'uppercase',letterSpacing:.5}}>{c.label}</p>
                  <p style={{color:c.color,fontSize:24,fontWeight:800,margin:0}}>{c.value}</p>
                </div>
              ))}
            </div>
            {stats.pendingSettlements>0 && (
              <div style={{...card,borderColor:'#f59e0b55',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{color:'#f59e0b',fontWeight:600}}>⚠ {stats.pendingSettlements} pending settlement{stats.pendingSettlements!==1?'s':''}</span>
                {canSee('settlements') && <button onClick={()=>setTab('settlements')} style={btn()}>View →</button>}
              </div>
            )}
          </div>
        )}

        {/* ═══ STREAMERS ═════════════════════════════════════════════════════════ */}
        {tab==='streamers' && (
          <div>
            {/* Pending verification queue */}
            {streamers.filter(s=>s.verificationRequestedAt && !s.isVerified).length > 0 && (
              <div style={{...card,padding:'20px 24px',marginBottom:20,border:'1px solid rgba(245,158,11,0.35)',background:'rgba(245,158,11,0.04)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                  <span style={{fontSize:18}}>⏳</span>
                  <h3 style={{margin:0,fontSize:15,fontWeight:700,color:'#f59e0b'}}>
                    Pending Verification ({streamers.filter(s=>s.verificationRequestedAt && !s.isVerified).length})
                  </h3>
                </div>
                {streamers.filter(s=>s.verificationRequestedAt && !s.isVerified).map(s=>(
                  <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',marginBottom:8,gap:12,flexWrap:'wrap'}}>
                    <div style={{display:'flex',gap:14,alignItems:'center'}}>
                      <div style={{width:40,height:40,borderRadius:10,background:'linear-gradient(135deg,#7c3aed,#db2777)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:'white',flexShrink:0}}>
                        {s.channelName?.[0]?.toUpperCase()??'?'}
                      </div>
                      <div>
                        <p style={{margin:0,fontWeight:700,fontSize:14}}>{s.channelName??'Unnamed'}</p>
                        <p style={{margin:'2px 0 0',fontSize:12,color:'#64748b'}}>{s.email} {s.username ? `• @${s.username}` : ''}</p>
                        <p style={{margin:'2px 0 0',fontSize:11,color:'#f59e0b'}}>
                          Requested {new Date(s.verificationRequestedAt!).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                        </p>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      {s.bankDetails && (
                        <div style={{fontSize:11,color:'#64748b',lineHeight:1.5}}>
                          <p style={{margin:0}}>{s.bankDetails.bankName} •• {s.bankDetails.accountNumber?.slice(-4)}</p>
                          <p style={{margin:0}}>{s.bankDetails.ifscCode} • {s.bankDetails.city}, {s.bankDetails.state}</p>
                        </div>
                      )}
                      <button onClick={()=>approveVerification(s.id)} style={{...btn('#10b98122','#10b981'),padding:'8px 18px',fontSize:13,fontWeight:700}}>
                        ✓ Approve
                      </button>
                      <button onClick={()=>rejectVerification(s.id)} style={{...dangerBtn,padding:'8px 14px',fontSize:13}}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Streamers ({streamers.filter(s=>!streamerSearch||[s.channelName,s.username,s.email,s.displayName].some(v=>v?.toLowerCase().includes(streamerSearch.toLowerCase()))).length})</h2>
              <input
                placeholder="Search by name, username or email…"
                value={streamerSearch}
                onChange={e=>setStreamerSearch(e.target.value)}
                style={{...inp,width:280,flex:'0 0 auto'}}
              />
              {streamerSearch && <button onClick={()=>setStreamerSearch('')} style={{...ghostBtn,padding:'7px 12px',fontSize:12}}>✕ Clear</button>}
            </div>
            {streamers.filter(s=>!streamerSearch||[s.channelName,s.username,s.email,s.displayName].some(v=>v?.toLowerCase().includes(streamerSearch.toLowerCase()))).map(s=>(
              <div key={s.id} style={{...card,padding:'20px 24px',marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:12}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:15}}>{s.channelName??s.username??'Unnamed'}</span>
                      {s.username && <span style={{color:'#666',fontSize:12}}>@{s.username}</span>}
                      <Badge v={s.isActive?'SUCCESS':'FAILED'} />
                      {s.isVerified && <Badge v="verified" />}
                      {!s.isVerified && s.verificationRequestedAt && <Badge v="PENDING" />}
                    </div>
                    <p style={{color:'#666',fontSize:12,margin:0}}>{s.email} · Joined {new Date(s.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                    {[['COLLECTED',fmt(s.totalCollected),'#10b981'],['PENDING',fmt(s.pendingBalance),'#f59e0b'],['NET PAYABLE',fmt(s.pendingNet),'#7c3aed'],['DONATIONS',String(s.donationCount),'#fff']].map(([l,v,c])=>(
                      <div key={l} style={{textAlign:'center'}}>
                        <p style={{color:'#888',fontSize:11,margin:'0 0 2px'}}>{l}</p>
                        <p style={{color:c,fontWeight:700,margin:0}}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {s.bankDetails?.accountNumber ? (
                  <div style={{background:'#0f0f1a',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#aaa',display:'flex',gap:20,flexWrap:'wrap',marginBottom:12}}>
                    <span>🏦 <strong style={{color:'#fff'}}>{s.bankDetails.bankName??'—'}</strong></span>
                    <span>Acc: <strong style={{color:'#fff',fontFamily:'monospace'}}>{s.bankDetails.accountNumber}</strong></span>
                    <span>IFSC: <strong style={{color:'#fff',fontFamily:'monospace'}}>{s.bankDetails.ifscCode}</strong></span>
                    <span>Name: <strong style={{color:'#fff'}}>{s.bankDetails.accountHolderName}</strong></span>
                  </div>
                ) : (
                  <div style={{background:'#ef444411',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#f87171',marginBottom:12}}>⚠ No bank details</div>
                )}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button onClick={()=>{setEditStreamer(s);setSForm({channelName:s.channelName??'',bio:s.bio??'',channelLink:s.channelLink??'',username:s.username??'',minDonationAmount:s.minDonationAmount,discordWebhookUrl:s.discordWebhookUrl??''})}} style={btn()}>✏ Edit</button>
                  <button onClick={()=>{setEditBank(s);setBForm({accountHolderName:s.bankDetails?.accountHolderName??'',accountNumber:s.bankDetails?.accountNumber??'',ifscCode:s.bankDetails?.ifscCode??'',bankName:s.bankDetails?.bankName??'',invoiceName:s.bankDetails?.invoiceName??'',streetAddress:s.bankDetails?.streetAddress??'',city:s.bankDetails?.city??'',state:s.bankDetails?.state??'',pincode:s.bankDetails?.pincode??''})}} style={btn('#0f0f1a','#aaa')}>🏦 Bank</button>
                  {s.isVerified
                    ? <button onClick={()=>toggleStreamerField(s.id,'isVerified',false)} style={btn('#10b98122','#10b981')}>✓ Verified</button>
                    : s.verificationRequestedAt
                      ? <><button onClick={()=>approveVerification(s.id)} style={btn('#10b98122','#10b981')}>✓ Approve</button><button onClick={()=>rejectVerification(s.id)} style={dangerBtn}>✕ Reject</button></>
                      : <button onClick={()=>approveVerification(s.id)} style={btn('#7c3aed22','#7c3aed')}>◯ Verify</button>
                  }
                  <button onClick={()=>toggleStreamerField(s.id,'isActive',!s.isActive)} style={btn(s.isActive?'#ef444422':'#10b98122',s.isActive?'#f87171':'#10b981')}>{s.isActive?'Deactivate':'Activate'}</button>
                  <button onClick={()=>resetOverlay(s.id)} style={ghostBtn}>Reset Overlay</button>
                  <button onClick={()=>setConfirmDelete({id:s.userId,label:s.channelName??s.email,type:'user'})} style={dangerBtn}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ USERS ═════════════════════════════════════════════════════════════ */}
        {tab==='users' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:12}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Users ({users.length})</h2>
              <input placeholder="Search email / name…" value={userSearch} onChange={e=>setUserSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&api(`/users?search=${userSearch}`).then(setUsers)}
                style={{...inp,width:280}} />
              <button onClick={()=>api(`/users?search=${userSearch}`).then(setUsers)} style={btn()}>Search</button>
            </div>
            <div style={{...card,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr style={{background:'#0f0f1a',color:'#666'}}>
                  {['Email','Name','Type','Profile','Joined','Actions'].map(h=><th key={h} style={{padding:'11px 16px',fontWeight:600,textAlign:'left'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {users.map((u,i)=>(
                    <tr key={u.id} style={{borderTop:'1px solid #2d2d4e',background:i%2?'#ffffff04':'transparent'}}>
                      <td style={{padding:'11px 16px'}}>{u.email}</td>
                      <td style={{padding:'11px 16px',color:'#aaa'}}>{u.displayName??'—'}</td>
                      <td style={{padding:'11px 16px'}}><Badge v={u.accountType}/></td>
                      <td style={{padding:'11px 16px',color:'#aaa'}}>{u.streamerProfile?`${u.streamerProfile.channelName??''} @${u.streamerProfile.username??'—'}`:u.viewerProfile?.displayName??'—'}</td>
                      <td style={{padding:'11px 16px',color:'#666',fontSize:12}}>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{padding:'11px 16px'}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>{setEditUser(u);setUForm({email:u.email,displayName:u.displayName??''})}} style={{...btn(),padding:'5px 12px',fontSize:12}}>Edit</button>
                          <button onClick={()=>setConfirmDelete({id:u.id,label:u.email,type:'user'})} style={{...dangerBtn,padding:'5px 12px',fontSize:12}}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ DONATIONS ══════════════════════════════════════════════════════════ */}
        {tab==='donations' && (
          <div>
            <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Donations</h2>
              <select value={donationFilter} onChange={e=>setDonationFilter(e.target.value)} style={{...inp,width:'auto',padding:'7px 12px'}}>
                <option value="">All</option>
                {['SUCCESS','PENDING','FAILED','REFUNDED'].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <input placeholder="Search donor…" value={donationSearch} onChange={e=>setDonationSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${donationSearch}`:''}`).then((d:any)=>setDonations(d.donations))}
                style={{...inp,width:220}} />
              <button onClick={()=>api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${donationSearch}`:''}`).then((d:any)=>setDonations(d.donations))} style={btn()}>Search</button>
            </div>
            <div style={{...card,overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:800}}>
                <thead><tr style={{background:'#0f0f1a',color:'#666'}}>
                  {['Donor','Streamer','Amount','Message','Status','Settled','Date','Change'].map(h=><th key={h} style={{padding:'11px 16px',fontWeight:600,textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {donations.map((d,i)=>(
                    <tr key={d.id} style={{borderTop:'1px solid #2d2d4e',background:i%2?'#ffffff04':'transparent'}}>
                      <td style={{padding:'11px 16px',fontWeight:600}}>{d.donorName}</td>
                      <td style={{padding:'11px 16px',color:'#888'}}>{d.streamer.channelName??d.streamer.username??'—'}</td>
                      <td style={{padding:'11px 16px',color:'#10b981',fontWeight:700}}>{fmt(d.amount)}</td>
                      <td style={{padding:'11px 16px',color:'#aaa',maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.message??'—'}</td>
                      <td style={{padding:'11px 16px'}}><Badge v={d.status}/></td>
                      <td style={{padding:'11px 16px',color:d.settled?'#10b981':'#f59e0b'}}>{d.settled?'Yes':'No'}</td>
                      <td style={{padding:'11px 16px',color:'#666',fontSize:12}}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{padding:'11px 16px'}}>
                        <select defaultValue="" onChange={e=>e.target.value&&updateDonationStatus(d.id,e.target.value)} style={{...inp,width:'auto',padding:'5px 8px',fontSize:12}}>
                          <option value="">—</option>
                          {['SUCCESS','PENDING','FAILED','REFUNDED'].filter(s=>s!==d.status).map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ SETTLEMENTS ════════════════════════════════════════════════════════ */}
        {tab==='settlements' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Settlements</h2>
              <select value={settlementFilter} onChange={e=>{setSettlementFilter(e.target.value);setSettlements([])}} style={{...inp,width:'auto',padding:'7px 12px'}}>
                <option value="INITIATED">Pending payment</option>
                <option value="SUCCESS">Paid</option>
                <option value="FAILED">Failed</option>
                <option value="">All</option>
              </select>
            </div>
            {settlements.length===0 ? (
              <div style={{...card,padding:60,textAlign:'center',color:'#555'}}>No settlements found</div>
            ) : settlements.map(s=>{
              const b = s.streamer.bankDetails
              return (
                <div key={s.id} style={{...card,borderColor:s.status==='INITIATED'?'#f59e0b55':'#2d2d4e',padding:'22px 26px',marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontWeight:700,fontSize:15}}>{s.streamer.channelName??s.streamer.username??'—'}</span>
                        <Badge v={s.status}/>
                      </div>
                      <p style={{color:'#666',fontSize:12,margin:'0 0 10px'}}>{s.streamer.user.email} · {s.id.slice(0,8)}</p>
                      <div style={{display:'flex',gap:20,fontSize:13,flexWrap:'wrap'}}>
                        <span style={{color:'#aaa'}}>Gross: <strong style={{color:'#fff'}}>{fmt(s.grossAmount)}</strong></span>
                        <span style={{color:'#aaa'}}>Fee: <strong style={{color:'#f87171'}}>−{fmt(Math.round(Number(s.feeAmount)))}</strong></span>
                        <span style={{color:'#aaa'}}>Net: <strong style={{color:'#10b981',fontSize:15}}>{fmt(Math.round(Number(s.netAmount)))}</strong></span>
                      </div>
                      <p style={{color:'#555',fontSize:11,margin:'6px 0 0'}}>Requested: {new Date(s.initiatedAt).toLocaleString('en-IN')}</p>
                    </div>
                    {b?.accountNumber ? (
                      <div style={{background:'#0f0f1a',border:'1px solid #2d2d4e',borderRadius:10,padding:'14px 18px',minWidth:240}}>
                        <p style={{color:'#7c3aed',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Bank</p>
                        <p style={{margin:'0 0 3px',fontSize:13}}><span style={{color:'#888'}}>Name: </span><strong>{b.accountHolderName}</strong></p>
                        <p style={{margin:'0 0 3px',fontSize:13,fontFamily:'monospace'}}><span style={{color:'#888'}}>Acc: </span><strong>{b.accountNumber}</strong></p>
                        <p style={{margin:0,fontSize:13,fontFamily:'monospace'}}><span style={{color:'#888'}}>IFSC: </span><strong>{b.ifscCode}</strong></p>
                      </div>
                    ) : <div style={{background:'#ef444411',borderRadius:10,padding:'14px 18px',color:'#f87171',fontSize:13,alignSelf:'flex-start'}}>⚠ No bank details</div>}
                  </div>
                  {s.status==='INITIATED' && (
                    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid #2d2d4e',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                      <input placeholder="UTR / Transfer ref (optional)" value={transferRef[s.id]??''} onChange={e=>setTransferRef(p=>({...p,[s.id]:e.target.value}))} style={{...inp,flex:1,minWidth:220}} />
                      <button onClick={()=>markPaid(s.id)} style={btn('#10b981')}>✓ Mark Paid</button>
                      <button onClick={()=>markFailed(s.id)} style={dangerBtn}>Mark Failed</button>
                    </div>
                  )}
                  {s.status==='SUCCESS' && s.cfTransferId && (
                    <p style={{marginTop:10,fontSize:12,color:'#888'}}>Ref: <code style={{color:'#10b981'}}>{s.cfTransferId}</code> · {s.settledAt?new Date(s.settledAt).toLocaleString('en-IN'):''}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ═══ TEAM (super admin only) ════════════════════════════════════════════ */}
        {tab==='team' && admin.isSuperAdmin && (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24,alignItems:'start'}}>

            {/* Roles */}
            <div>
              <h2 style={{margin:'0 0 16px',fontSize:17,fontWeight:700}}>Roles</h2>

              {/* Create role */}
              <div style={{...card,padding:'20px 22px',marginBottom:16}}>
                <p style={{color:'#888',fontSize:12,textTransform:'uppercase',letterSpacing:.5,margin:'0 0 12px'}}>Create New Role</p>
                <input placeholder="Role name (e.g. Junior Admin)" value={newRoleName} onChange={e=>setNewRoleName(e.target.value)} style={{...inp,marginBottom:12}} />
                <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
                  {ALL_PERMS.map(p=>(
                    <label key={p} style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:13,color:newRolePerms[p]?'#a78bfa':'#888'}}>
                      <input type="checkbox" checked={!!newRolePerms[p]} onChange={e=>setNewRolePerms(prev=>({...prev,[p]:e.target.checked}))} style={{accentColor:'#7c3aed'}}/>
                      {p}
                    </label>
                  ))}
                </div>
                <button onClick={createRole} style={{...btn(),width:'100%'}}>+ Create Role</button>
              </div>

              {/* Role list */}
              {roles.map(r=>(
                <div key={r.id} style={{...card,padding:'16px 18px',marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{fontWeight:700,fontSize:14}}>{r.name}</span>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>{setEditRole(r);setEditRolePerms({...((r.permissions??{}) as AdminPerms)})}} style={{...ghostBtn,padding:'4px 10px',fontSize:12}}>Edit</button>
                      <button onClick={()=>deleteRole(r.id)} style={{...dangerBtn,padding:'4px 10px',fontSize:12}}>Delete</button>
                    </div>
                  </div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {ALL_PERMS.map(p=>(
                      <span key={p} style={{fontSize:11,padding:'2px 8px',borderRadius:12,background:(r.permissions as AdminPerms)?.[p]?'#7c3aed22':'#ffffff08',color:(r.permissions as AdminPerms)?.[p]?'#a78bfa':'#555'}}>
                        {(r.permissions as AdminPerms)?.[p]?'✓':'-'} {p}
                      </span>
                    ))}
                  </div>
                  <p style={{fontSize:11,color:'#555',margin:'8px 0 0'}}>{r._count?.admins??0} admin(s) using this role</p>
                </div>
              ))}
            </div>

            {/* Admin Users */}
            <div>
              <h2 style={{margin:'0 0 16px',fontSize:17,fontWeight:700}}>Admin Users</h2>

              {/* Add admin */}
              <div style={{...card,padding:'20px 22px',marginBottom:16}}>
                <p style={{color:'#888',fontSize:12,textTransform:'uppercase',letterSpacing:.5,margin:'0 0 12px'}}>Add Admin by Email</p>
                <input placeholder="admin@example.com" value={newAdminEmail} onChange={e=>setNewAdminEmail(e.target.value)} style={{...inp,marginBottom:10}} />
                <select value={newAdminRoleId} onChange={e=>setNewAdminRoleId(e.target.value)} style={{...inp,marginBottom:14}}>
                  <option value="">No role (no access)</option>
                  {roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button onClick={addAdmin} style={{...btn(),width:'100%'}}>+ Add Admin</button>
                <p style={{fontSize:11,color:'#555',margin:'10px 0 0'}}>They can only log in after visiting /admin/login with this Google account.</p>
              </div>

              {/* Admin list */}
              {adminUsers.map(a=>(
                <div key={a.id} style={{...card,padding:'14px 18px',marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      {a.avatar && <img src={a.avatar} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover'}}/>}
                      <div>
                        <p style={{margin:0,fontSize:13,fontWeight:600,color:'#e2e8f0'}}>{a.name??a.email}</p>
                        <p style={{margin:0,fontSize:11,color:'#555'}}>{a.email}</p>
                      </div>
                    </div>
                    {a.isSuperAdmin ? (
                      <span style={{fontSize:11,color:'#f59e0b',fontWeight:700}}>⭐ Super Admin</span>
                    ) : (
                      <button onClick={()=>removeAdmin(a.id)} style={{...dangerBtn,padding:'4px 10px',fontSize:12}}>Remove</button>
                    )}
                  </div>
                  {!a.isSuperAdmin && (
                    <select value={a.role?.id??''} onChange={e=>changeAdminRole(a.id,e.target.value||null)} style={{...inp,padding:'6px 10px',fontSize:12}}>
                      <option value="">No role (no access)</option>
                      {roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {editStreamer && (
        <Modal title={`Edit — ${editStreamer.channelName??editStreamer.username}`} onClose={()=>setEditStreamer(null)}>
          <Field label="Channel Name" value={sForm.channelName as string??''} onChange={v=>setSForm(p=>({...p,channelName:v}))} />
          <Field label="Username (slug)" value={sForm.username as string??''} onChange={v=>setSForm(p=>({...p,username:v}))} />
          <Field label="Channel Link" value={sForm.channelLink as string??''} onChange={v=>setSForm(p=>({...p,channelLink:v}))} />
          <Field label="Min Donation (₹)" value={String(sForm.minDonationAmount??11)} onChange={v=>setSForm(p=>({...p,minDonationAmount:parseInt(v)||11}))} type="number" />
          <Field label="Discord Webhook" value={sForm.discordWebhookUrl as string??''} onChange={v=>setSForm(p=>({...p,discordWebhookUrl:v}))} />
          <div style={{marginBottom:14}}>
            <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>Bio</label>
            <textarea value={sForm.bio as string??''} onChange={e=>setSForm(p=>({...p,bio:e.target.value}))} rows={3} style={{...inp,resize:'vertical'}} />
          </div>
          <Field label="Email (read-only)" value={editStreamer.email} readOnly />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setEditStreamer(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveStreamer} style={btn()}>Save</button>
          </div>
        </Modal>
      )}
      {editBank && (
        <Modal title={`Bank — ${editBank.channelName??editBank.username}`} onClose={()=>setEditBank(null)}>
          <Field label="Account Holder Name" value={bForm.accountHolderName as string??''} onChange={v=>setBForm(p=>({...p,accountHolderName:v}))} />
          <Field label="Account Number" value={bForm.accountNumber as string??''} onChange={v=>setBForm(p=>({...p,accountNumber:v}))} />
          <Field label="IFSC Code" value={bForm.ifscCode as string??''} onChange={v=>setBForm(p=>({...p,ifscCode:v}))} />
          <Field label="Bank Name" value={bForm.bankName as string??''} onChange={v=>setBForm(p=>({...p,bankName:v}))} />
          <hr style={{border:'none',borderTop:'1px solid #2d2d4e',margin:'14px 0'}}/>
          <Field label="Invoice Name" value={bForm.invoiceName as string??''} onChange={v=>setBForm(p=>({...p,invoiceName:v}))} />
          <Field label="Street Address" value={bForm.streetAddress as string??''} onChange={v=>setBForm(p=>({...p,streetAddress:v}))} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="City" value={bForm.city as string??''} onChange={v=>setBForm(p=>({...p,city:v}))} />
            <Field label="Pincode" value={bForm.pincode as string??''} onChange={v=>setBForm(p=>({...p,pincode:v}))} />
          </div>
          <Field label="State" value={bForm.state as string??''} onChange={v=>setBForm(p=>({...p,state:v}))} />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setEditBank(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveBank} style={btn()}>Save Bank</button>
          </div>
        </Modal>
      )}
      {editUser && (
        <Modal title={`Edit User — ${editUser.email}`} onClose={()=>setEditUser(null)}>
          <Field label="Email" value={uForm.email} onChange={v=>setUForm(p=>({...p,email:v}))} />
          <Field label="Display Name" value={uForm.displayName} onChange={v=>setUForm(p=>({...p,displayName:v}))} />
          <Field label="Account Type (read-only)" value={editUser.accountType} readOnly />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setEditUser(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveUser} style={btn()}>Save</button>
          </div>
        </Modal>
      )}
      {editRole && (
        <Modal title={`Edit Role — ${editRole.name}`} onClose={()=>setEditRole(null)}>
          <p style={{color:'#888',fontSize:13,marginBottom:12}}>Toggle permissions for this role:</p>
          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
            {ALL_PERMS.map(p=>(
              <label key={p} style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',padding:'10px 14px',background:editRolePerms[p]?'#7c3aed22':'#0f0f1a',borderRadius:8,border:`1px solid ${editRolePerms[p]?'#7c3aed44':'#2d2d4e'}`}}>
                <input type="checkbox" checked={!!editRolePerms[p]} onChange={e=>setEditRolePerms(prev=>({...prev,[p]:e.target.checked}))} style={{accentColor:'#7c3aed',width:16,height:16}}/>
                <span style={{fontSize:14,fontWeight:600,color:editRolePerms[p]?'#a78bfa':'#888',textTransform:'capitalize'}}>{p}</span>
                <span style={{fontSize:12,color:'#555',marginLeft:'auto'}}>{editRolePerms[p]?'✓ Allowed':'✗ Blocked'}</span>
              </label>
            ))}
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setEditRole(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveEditRole} style={btn()}>Save Permissions</button>
          </div>
        </Modal>
      )}
      {confirmDelete && (
        <Modal title="Confirm Delete" onClose={()=>setConfirmDelete(null)}>
          <p style={{color:'#f87171',margin:'0 0 20px'}}>Delete <strong>{confirmDelete.label}</strong>? This is permanent.</p>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setConfirmDelete(null)} style={ghostBtn}>Cancel</button>
            <button onClick={deleteUser} style={btn('#ef4444')}>Delete Permanently</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
