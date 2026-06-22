'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats { totalStreamers:number; totalViewers:number; totalDonations:number; totalCollected:number; pendingSettlements:number; totalPaidOut:number }
interface BankDetails { id:string; accountHolderName:string|null; accountNumber:string|null; ifscCode:string|null; bankName:string|null; invoiceName:string|null; streetAddress:string|null; city:string|null; state:string|null; pincode:string|null }
interface Streamer { id:string; userId:string; username:string|null; channelName:string|null; channelLink:string|null; bio:string|null; email:string; displayName:string|null; isActive:boolean; isVerified:boolean; minDonationAmount:number; overlayToken:string|null; discordWebhookUrl:string|null; createdAt:string; donationCount:number; settlementCount:number; pendingBalance:number; pendingNet:number; totalCollected:number; bankDetails:BankDetails|null }
interface User { id:string; email:string; accountType:string; displayName:string|null; createdAt:string; streamerProfile:{id:string;username:string|null;channelName:string|null;isActive:boolean;isVerified:boolean}|null; viewerProfile:{id:string;displayName:string|null}|null }
interface Donation { id:string; donorName:string; message:string|null; amount:number; status:string; createdAt:string; cfOrderId:string; cfPaymentId:string|null; settled:boolean; streamer:{username:string|null;channelName:string|null} }
interface Settlement { id:string; grossAmount:number; feeAmount:string; netAmount:string; status:'INITIATED'|'SUCCESS'|'FAILED'; initiatedAt:string; settledAt:string|null; failureReason:string|null; cfTransferId:string|null; streamer:{username:string|null;channelName:string|null;user:{email:string};bankDetails:BankDetails|null} }

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
const fmt = (n:number) => `₹${n.toLocaleString('en-IN')}`
const S_COLORS:Record<string,string> = { INITIATED:'#f59e0b', SUCCESS:'#10b981', FAILED:'#ef4444', PENDING:'#6b7280', REFUNDED:'#8b5cf6', streamer:'#7c3aed', viewer:'#06b6d4' }
function Badge({v}:{v:string}){ return <span style={{padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:700,background:(S_COLORS[v]??'#6b7280')+'22',color:S_COLORS[v]??'#6b7280',textTransform:'uppercase',letterSpacing:.5}}>{v}</span> }

const card:React.CSSProperties = { background:'#1a1a2e', border:'1px solid #2d2d4e', borderRadius:14 }
const inp:React.CSSProperties = { width:'100%', padding:'8px 12px', background:'#0f0f1a', border:'1px solid #2d2d4e', borderRadius:8, color:'#e2e8f0', fontSize:13, boxSizing:'border-box' }
const btn = (bg='#7c3aed',c='#fff'):React.CSSProperties => ({ padding:'7px 16px', background:bg, color:c, border:'none', borderRadius:8, cursor:'pointer', fontSize:13, fontWeight:600 })
const ghostBtn:React.CSSProperties = { ...btn('transparent','#aaa'), border:'1px solid #2d2d4e' }
const dangerBtn:React.CSSProperties = btn('#ef444422','#f87171')

// ─── Modal wrapper ────────────────────────────────────────────────────────────
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

// ─── Field row used inside edit modals ───────────────────────────────────────
function Field({ label, value, onChange, type='text', readOnly }:{ label:string; value:string; onChange?:(v:string)=>void; type?:string; readOnly?:boolean }) {
  return (
    <div style={{marginBottom:14}}>
      <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>{label}</label>
      <input type={type} value={value} readOnly={readOnly} onChange={e=>onChange?.(e.target.value)}
        style={{...inp, opacity:readOnly?.5:1, cursor:readOnly?'default':'text'}} />
    </div>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter()
  const [secret, setSecret] = useState('')
  const [tab, setTab] = useState<'overview'|'streamers'|'users'|'donations'|'settlements'>('overview')

  // data
  const [stats, setStats] = useState<Stats|null>(null)
  const [streamers, setStreamers] = useState<Streamer[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [donations, setDonations] = useState<Donation[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])

  // filters
  const [settlementFilter, setSettlementFilter] = useState('INITIATED')
  const [donationFilter, setDonationFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [donationSearch, setDonationSearch] = useState('')

  // ui state
  const [toast, setToast] = useState('')
  const [transferRef, setTransferRef] = useState<Record<string,string>>({})

  // modals
  const [editStreamer, setEditStreamer] = useState<Streamer|null>(null)
  const [editBank, setEditBank] = useState<Streamer|null>(null)
  const [editUser, setEditUser] = useState<User|null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{id:string;label:string;type:'user'}|null>(null)

  // edit form state
  const [sForm, setSForm] = useState<Partial<Streamer>>({})
  const [bForm, setBForm] = useState<Partial<BankDetails>>({})
  const [uForm, setUForm] = useState<{email:string;displayName:string}>({email:'',displayName:''})

  const showToast = useCallback((msg:string) => { setToast(msg); setTimeout(()=>setToast(''),3500) }, [])

  useEffect(() => {
    const s = sessionStorage.getItem('admin_secret')
    if (!s) { router.push('/admin/login'); return }
    setSecret(s)
  }, [router])

  const H = useCallback(():HeadersInit => ({ 'x-admin-secret':secret, 'Content-Type':'application/json' }), [secret])
  const api = useCallback(async (path:string, opts?:RequestInit) => {
    const r = await fetch(`/backend/api/admin${path}`, { headers:H(), ...opts })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }, [H])

  // Load stats once secret is ready
  useEffect(() => {
    if (!secret) return
    api('/stats').then(setStats).catch(() => { sessionStorage.removeItem('admin_secret'); router.push('/admin/login') })
  }, [secret, api, router])

  // Load data per tab
  useEffect(() => {
    if (!secret) return
    if (tab === 'streamers') api('/streamers').then(setStreamers)
    if (tab === 'users')     api(`/users${userSearch?`?search=${userSearch}`:''}`).then(setUsers)
    if (tab === 'donations') api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${donationSearch}`:''}`).then((d:any)=>setDonations(d.donations))
    if (tab === 'settlements') api(`/settlements${settlementFilter?`?status=${settlementFilter}`:''}`).then(setSettlements)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, secret, settlementFilter, donationFilter])

  const reload = useCallback(() => {
    if (tab === 'streamers') api('/streamers').then(setStreamers)
    if (tab === 'users')     api('/users').then(setUsers)
    if (tab === 'donations') api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}`).then((d:any)=>setDonations(d.donations))
    if (tab === 'settlements') api(`/settlements${settlementFilter?`?status=${settlementFilter}`:''}`).then(setSettlements)
    api('/stats').then(setStats)
  }, [tab, api, donationFilter, settlementFilter])

  // ── Streamer actions ──
  async function toggleStreamerField(id:string, field:'isActive'|'isVerified', val:boolean) {
    await api(`/streamers/${id}`, { method:'PATCH', body:JSON.stringify({ [field]:val }) })
    setStreamers(p=>p.map(s=>s.id===id?{...s,[field]:val}:s))
    showToast(`Updated successfully`)
  }
  async function saveStreamer() {
    if (!editStreamer) return
    await api(`/streamers/${editStreamer.id}`, { method:'PATCH', body:JSON.stringify(sForm) })
    setStreamers(p=>p.map(s=>s.id===editStreamer.id?{...s,...sForm}:s))
    setEditStreamer(null); showToast('Streamer profile saved')
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

  // ── User actions ──
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
    setConfirmDelete(null); showToast('User deleted'); reload()
  }

  // ── Donation actions ──
  async function updateDonationStatus(id:string, status:string) {
    await api(`/donations/${id}`, { method:'PATCH', body:JSON.stringify({ status }) })
    setDonations(p=>p.map(d=>d.id===id?{...d,status}:d))
    showToast('Donation status updated')
  }

  // ── Settlement actions ──
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

  const TABS = ['overview','streamers','users','donations','settlements'] as const

  return (
    <div style={{fontFamily:'system-ui,sans-serif',background:'#0f0f1a',minHeight:'100vh',color:'#e2e8f0'}}>

      {/* toast */}
      {toast && <div style={{position:'fixed',top:20,right:20,zIndex:200,background:'#10b981',color:'#fff',padding:'10px 20px',borderRadius:10,fontSize:14,fontWeight:600,boxShadow:'0 4px 20px #0008'}}>{toast}</div>}

      {/* top bar */}
      <div style={{background:'#1a1a2e',borderBottom:'1px solid #2d2d4e',padding:'14px 32px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{fontWeight:800,fontSize:18,color:'#7c3aed'}}>eztips</span>
          <span style={{color:'#555',fontSize:13}}>Master Admin</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={reload} style={ghostBtn}>↻ Refresh</button>
          <button onClick={()=>{sessionStorage.removeItem('admin_secret');router.push('/admin/login')}} style={ghostBtn}>Sign out</button>
        </div>
      </div>

      <div style={{maxWidth:1280,margin:'0 auto',padding:'24px 20px'}}>

        {/* tabs */}
        <div style={{display:'flex',gap:4,marginBottom:24,background:'#1a1a2e',borderRadius:12,padding:4,width:'fit-content',border:'1px solid #2d2d4e'}}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{padding:'8px 20px',borderRadius:9,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,textTransform:'capitalize',
              background:tab===t?'#7c3aed':'transparent',color:tab===t?'#fff':'#888',transition:'all .15s'}}>
              {t}{t==='settlements'&&stats?.pendingSettlements?<span style={{marginLeft:6,background:'#f59e0b',color:'#000',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700}}>{stats.pendingSettlements}</span>:null}
            </button>
          ))}
        </div>

        {/* ═══ OVERVIEW ═══════════════════════════════════════════════════════ */}
        {tab==='overview' && stats && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:24}}>
              {[
                {label:'Streamers',   value:stats.totalStreamers,              color:'#7c3aed'},
                {label:'Viewers',     value:stats.totalViewers,                color:'#06b6d4'},
                {label:'Donations',   value:stats.totalDonations,              color:'#3b82f6'},
                {label:'Collected',   value:fmt(stats.totalCollected),         color:'#10b981'},
                {label:'Pending Pay', value:stats.pendingSettlements,          color:'#f59e0b'},
                {label:'Paid Out',    value:fmt(stats.totalPaidOut),           color:'#ec4899'},
              ].map(c=>(
                <div key={c.label} style={{...card,padding:'18px 22px'}}>
                  <p style={{color:'#666',fontSize:12,margin:'0 0 6px',textTransform:'uppercase',letterSpacing:.5}}>{c.label}</p>
                  <p style={{color:c.color,fontSize:24,fontWeight:800,margin:0}}>{c.value}</p>
                </div>
              ))}
            </div>
            {stats.pendingSettlements>0 && (
              <div style={{...card,borderColor:'#f59e0b55',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{color:'#f59e0b',fontWeight:600}}>⚠ {stats.pendingSettlements} pending settlement{stats.pendingSettlements!==1?'s':''} need payment</span>
                <button onClick={()=>setTab('settlements')} style={btn()}>View Settlements →</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ STREAMERS ══════════════════════════════════════════════════════ */}
        {tab==='streamers' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Streamers ({streamers.length})</h2>
            </div>
            {streamers.map(s=>(
              <div key={s.id} style={{...card,padding:'20px 24px',marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:12}}>
                  {/* identity */}
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span style={{fontWeight:700,fontSize:15}}>{s.channelName??s.username??'Unnamed'}</span>
                      {s.username && <span style={{color:'#666',fontSize:12}}>@{s.username}</span>}
                      <Badge v={s.isActive?'SUCCESS':'FAILED'} />
                      {s.isVerified && <Badge v="verified" />}
                    </div>
                    <p style={{color:'#666',fontSize:12,margin:0}}>{s.email} · Joined {new Date(s.createdAt).toLocaleDateString('en-IN')}</p>
                  </div>
                  {/* money */}
                  <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                    <div style={{textAlign:'center'}}>
                      <p style={{color:'#888',fontSize:11,margin:'0 0 2px'}}>COLLECTED</p>
                      <p style={{color:'#10b981',fontWeight:700,margin:0}}>{fmt(s.totalCollected)}</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{color:'#888',fontSize:11,margin:'0 0 2px'}}>PENDING</p>
                      <p style={{color:'#f59e0b',fontWeight:700,margin:0}}>{fmt(s.pendingBalance)}</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{color:'#888',fontSize:11,margin:'0 0 2px'}}>NET PAYABLE</p>
                      <p style={{color:'#7c3aed',fontWeight:700,margin:0}}>{fmt(s.pendingNet)}</p>
                    </div>
                    <div style={{textAlign:'center'}}>
                      <p style={{color:'#888',fontSize:11,margin:'0 0 2px'}}>DONATIONS</p>
                      <p style={{color:'#fff',fontWeight:700,margin:0}}>{s.donationCount}</p>
                    </div>
                  </div>
                </div>

                {/* bank details quick view */}
                {s.bankDetails?.accountNumber ? (
                  <div style={{background:'#0f0f1a',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#aaa',display:'flex',gap:20,flexWrap:'wrap',marginBottom:12}}>
                    <span>🏦 <strong style={{color:'#fff'}}>{s.bankDetails.bankName??'—'}</strong></span>
                    <span>Acc: <strong style={{color:'#fff',fontFamily:'monospace'}}>{s.bankDetails.accountNumber}</strong></span>
                    <span>IFSC: <strong style={{color:'#fff',fontFamily:'monospace'}}>{s.bankDetails.ifscCode}</strong></span>
                    <span>Name: <strong style={{color:'#fff'}}>{s.bankDetails.accountHolderName}</strong></span>
                  </div>
                ) : (
                  <div style={{background:'#ef444411',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#f87171',marginBottom:12}}>⚠ No bank details saved</div>
                )}

                {/* action bar */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button onClick={()=>{setEditStreamer(s);setSForm({channelName:s.channelName??'',bio:s.bio??'',channelLink:s.channelLink??'',username:s.username??'',minDonationAmount:s.minDonationAmount,discordWebhookUrl:s.discordWebhookUrl??''})}} style={btn()}>✏ Edit Profile</button>
                  <button onClick={()=>{setEditBank(s);setBForm({accountHolderName:s.bankDetails?.accountHolderName??'',accountNumber:s.bankDetails?.accountNumber??'',ifscCode:s.bankDetails?.ifscCode??'',bankName:s.bankDetails?.bankName??'',invoiceName:s.bankDetails?.invoiceName??'',streetAddress:s.bankDetails?.streetAddress??'',city:s.bankDetails?.city??'',state:s.bankDetails?.state??'',pincode:s.bankDetails?.pincode??''})}} style={btn('#0f0f1a','#aaa')}>🏦 Edit Bank</button>
                  <button onClick={()=>toggleStreamerField(s.id,'isVerified',!s.isVerified)} style={btn(s.isVerified?'#10b98122':'#7c3aed22',s.isVerified?'#10b981':'#7c3aed')}>
                    {s.isVerified?'✓ Verified':'◯ Verify'}
                  </button>
                  <button onClick={()=>toggleStreamerField(s.id,'isActive',!s.isActive)} style={btn(s.isActive?'#ef444422':'#10b98122',s.isActive?'#f87171':'#10b981')}>
                    {s.isActive?'Deactivate':'Activate'}
                  </button>
                  <button onClick={()=>resetOverlay(s.id)} style={ghostBtn}>Reset Overlay Token</button>
                  <button onClick={()=>setConfirmDelete({id:s.userId,label:s.channelName??s.email,type:'user'})} style={dangerBtn}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ USERS ══════════════════════════════════════════════════════════ */}
        {tab==='users' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,gap:12}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>All Users ({users.length})</h2>
              <input placeholder="Search by email / name…" value={userSearch} onChange={e=>setUserSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&api(`/users?search=${userSearch}`).then(setUsers)}
                style={{...inp,width:280}} />
              <button onClick={()=>api(`/users?search=${userSearch}`).then(setUsers)} style={btn()}>Search</button>
            </div>
            <div style={{...card,overflow:'hidden'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'#0f0f1a',color:'#666'}}>
                    {['Email','Display Name','Type','Username / Channel','Joined','Actions'].map(h=>(
                      <th key={h} style={{padding:'11px 16px',fontWeight:600,textAlign:'left'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u,i)=>(
                    <tr key={u.id} style={{borderTop:'1px solid #2d2d4e',background:i%2?'#ffffff04':'transparent'}}>
                      <td style={{padding:'11px 16px'}}>{u.email}</td>
                      <td style={{padding:'11px 16px',color:'#aaa'}}>{u.displayName??'—'}</td>
                      <td style={{padding:'11px 16px'}}><Badge v={u.accountType}/></td>
                      <td style={{padding:'11px 16px',color:'#aaa'}}>
                        {u.streamerProfile ? `${u.streamerProfile.channelName??''} @${u.streamerProfile.username??'—'}` : u.viewerProfile?.displayName ?? '—'}
                      </td>
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

        {/* ═══ DONATIONS ══════════════════════════════════════════════════════ */}
        {tab==='donations' && (
          <div>
            <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Donations</h2>
              <select value={donationFilter} onChange={e=>{setDonationFilter(e.target.value)}}
                style={{...inp,width:'auto',padding:'7px 12px'}}>
                <option value="">All</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
              <input placeholder="Search donor / message…" value={donationSearch} onChange={e=>setDonationSearch(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${donationSearch}`:''}`).then((d:any)=>setDonations(d.donations))}
                style={{...inp,width:240}} />
              <button onClick={()=>api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${donationSearch}`:''}`).then((d:any)=>setDonations(d.donations))} style={btn()}>Search</button>
            </div>
            <div style={{...card,overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:800}}>
                <thead>
                  <tr style={{background:'#0f0f1a',color:'#666'}}>
                    {['Donor','Streamer','Amount','Message','Status','Settled','Date','Change Status'].map(h=>(
                      <th key={h} style={{padding:'11px 16px',fontWeight:600,textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d,i)=>(
                    <tr key={d.id} style={{borderTop:'1px solid #2d2d4e',background:i%2?'#ffffff04':'transparent'}}>
                      <td style={{padding:'11px 16px',fontWeight:600}}>{d.donorName}</td>
                      <td style={{padding:'11px 16px',color:'#888'}}>{d.streamer.channelName??d.streamer.username??'—'}</td>
                      <td style={{padding:'11px 16px',color:'#10b981',fontWeight:700}}>{fmt(d.amount)}</td>
                      <td style={{padding:'11px 16px',color:'#aaa',maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.message??'—'}</td>
                      <td style={{padding:'11px 16px'}}><Badge v={d.status}/></td>
                      <td style={{padding:'11px 16px',color:d.settled?'#10b981':'#f59e0b'}}>{d.settled?'Yes':'No'}</td>
                      <td style={{padding:'11px 16px',color:'#666',fontSize:12,whiteSpace:'nowrap'}}>{new Date(d.createdAt).toLocaleDateString('en-IN')}</td>
                      <td style={{padding:'11px 16px'}}>
                        <select defaultValue="" onChange={e=>e.target.value&&updateDonationStatus(d.id,e.target.value)}
                          style={{...inp,width:'auto',padding:'5px 8px',fontSize:12}}>
                          <option value="">— change —</option>
                          {['SUCCESS','PENDING','FAILED','REFUNDED'].filter(s=>s!==d.status).map(s=>(
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ SETTLEMENTS ════════════════════════════════════════════════════ */}
        {tab==='settlements' && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Settlements</h2>
              <select value={settlementFilter} onChange={e=>{setSettlementFilter(e.target.value);setSettlements([])}}
                style={{...inp,width:'auto',padding:'7px 12px'}}>
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
                      <p style={{color:'#666',fontSize:12,margin:'0 0 10px'}}>{s.streamer.user.email} · ID: {s.id.slice(0,8)}</p>
                      <div style={{display:'flex',gap:20,fontSize:13,flexWrap:'wrap'}}>
                        <span style={{color:'#aaa'}}>Gross: <strong style={{color:'#fff'}}>{fmt(s.grossAmount)}</strong></span>
                        <span style={{color:'#aaa'}}>Fee: <strong style={{color:'#f87171'}}>−{fmt(Math.round(Number(s.feeAmount)))}</strong></span>
                        <span style={{color:'#aaa'}}>Net to pay: <strong style={{color:'#10b981',fontSize:15}}>{fmt(Math.round(Number(s.netAmount)))}</strong></span>
                      </div>
                      <p style={{color:'#555',fontSize:11,margin:'6px 0 0'}}>Requested: {new Date(s.initiatedAt).toLocaleString('en-IN')}</p>
                    </div>
                    {b?.accountNumber ? (
                      <div style={{background:'#0f0f1a',border:'1px solid #2d2d4e',borderRadius:10,padding:'14px 18px',minWidth:250}}>
                        <p style={{color:'#7c3aed',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:1,margin:'0 0 8px'}}>Bank Details</p>
                        <p style={{margin:'0 0 3px',fontSize:13}}><span style={{color:'#888'}}>Name: </span><strong>{b.accountHolderName}</strong></p>
                        <p style={{margin:'0 0 3px',fontSize:13}}><span style={{color:'#888'}}>Acc: </span><strong style={{fontFamily:'monospace',letterSpacing:1}}>{b.accountNumber}</strong></p>
                        <p style={{margin:'0 0 3px',fontSize:13}}><span style={{color:'#888'}}>IFSC: </span><strong style={{fontFamily:'monospace'}}>{b.ifscCode}</strong></p>
                        <p style={{margin:0,fontSize:13}}><span style={{color:'#888'}}>Bank: </span><strong>{b.bankName}</strong></p>
                      </div>
                    ) : <div style={{background:'#ef444411',borderRadius:10,padding:'14px 18px',color:'#f87171',fontSize:13,alignSelf:'flex-start'}}>⚠ No bank details</div>}
                  </div>

                  {s.status==='INITIATED' && (
                    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid #2d2d4e',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
                      <input placeholder="UTR / Transfer reference (optional)" value={transferRef[s.id]??''} onChange={e=>setTransferRef(p=>({...p,[s.id]:e.target.value}))}
                        style={{...inp,flex:1,minWidth:220}} />
                      <button onClick={()=>markPaid(s.id)} style={btn('#10b981')}>✓ Mark as Paid</button>
                      <button onClick={()=>markFailed(s.id)} style={{...dangerBtn}}>Mark Failed</button>
                    </div>
                  )}
                  {s.status==='SUCCESS' && s.cfTransferId && (
                    <p style={{marginTop:10,fontSize:12,color:'#888'}}>Transfer ref: <code style={{color:'#10b981'}}>{s.cfTransferId}</code> · Paid {s.settledAt?new Date(s.settledAt).toLocaleString('en-IN'):''}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ═══ EDIT STREAMER MODAL ══════════════════════════════════════════════ */}
      {editStreamer && (
        <Modal title={`Edit — ${editStreamer.channelName??editStreamer.username}`} onClose={()=>setEditStreamer(null)}>
          <Field label="Channel Name" value={sForm.channelName as string??''} onChange={v=>setSForm(p=>({...p,channelName:v}))} />
          <Field label="Username (slug)" value={sForm.username as string??''} onChange={v=>setSForm(p=>({...p,username:v}))} />
          <Field label="Channel Link" value={sForm.channelLink as string??''} onChange={v=>setSForm(p=>({...p,channelLink:v}))} />
          <Field label="Min Donation (₹)" value={String(sForm.minDonationAmount??11)} onChange={v=>setSForm(p=>({...p,minDonationAmount:parseInt(v)||11}))} type="number" />
          <Field label="Discord Webhook URL" value={sForm.discordWebhookUrl as string??''} onChange={v=>setSForm(p=>({...p,discordWebhookUrl:v}))} />
          <div style={{marginBottom:14}}>
            <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>Bio</label>
            <textarea value={sForm.bio as string??''} onChange={e=>setSForm(p=>({...p,bio:e.target.value}))}
              rows={3} style={{...inp,resize:'vertical'}} />
          </div>
          <Field label="Email (read-only)" value={editStreamer.email} readOnly />
          <Field label="Overlay Token (read-only)" value={editStreamer.overlayToken??'—'} readOnly />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <button onClick={()=>setEditStreamer(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveStreamer} style={btn()}>Save Changes</button>
          </div>
        </Modal>
      )}

      {/* ═══ EDIT BANK MODAL ══════════════════════════════════════════════════ */}
      {editBank && (
        <Modal title={`Bank Details — ${editBank.channelName??editBank.username}`} onClose={()=>setEditBank(null)}>
          <Field label="Account Holder Name" value={bForm.accountHolderName as string??''} onChange={v=>setBForm(p=>({...p,accountHolderName:v}))} />
          <Field label="Account Number" value={bForm.accountNumber as string??''} onChange={v=>setBForm(p=>({...p,accountNumber:v}))} />
          <Field label="IFSC Code" value={bForm.ifscCode as string??''} onChange={v=>setBForm(p=>({...p,ifscCode:v}))} />
          <Field label="Bank Name" value={bForm.bankName as string??''} onChange={v=>setBForm(p=>({...p,bankName:v}))} />
          <hr style={{border:'none',borderTop:'1px solid #2d2d4e',margin:'16px 0'}}/>
          <p style={{color:'#888',fontSize:12,marginBottom:12,textTransform:'uppercase',letterSpacing:.5}}>Invoice Details</p>
          <Field label="Full Name (for invoice)" value={bForm.invoiceName as string??''} onChange={v=>setBForm(p=>({...p,invoiceName:v}))} />
          <Field label="Street Address" value={bForm.streetAddress as string??''} onChange={v=>setBForm(p=>({...p,streetAddress:v}))} />
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            <Field label="City" value={bForm.city as string??''} onChange={v=>setBForm(p=>({...p,city:v}))} />
            <Field label="Pincode" value={bForm.pincode as string??''} onChange={v=>setBForm(p=>({...p,pincode:v}))} />
          </div>
          <Field label="State" value={bForm.state as string??''} onChange={v=>setBForm(p=>({...p,state:v}))} />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <button onClick={()=>setEditBank(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveBank} style={btn()}>Save Bank Details</button>
          </div>
        </Modal>
      )}

      {/* ═══ EDIT USER MODAL ══════════════════════════════════════════════════ */}
      {editUser && (
        <Modal title={`Edit User — ${editUser.email}`} onClose={()=>setEditUser(null)}>
          <Field label="Email" value={uForm.email} onChange={v=>setUForm(p=>({...p,email:v}))} />
          <Field label="Display Name" value={uForm.displayName} onChange={v=>setUForm(p=>({...p,displayName:v}))} />
          <Field label="Account Type (read-only)" value={editUser.accountType} readOnly />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
            <button onClick={()=>setEditUser(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveUser} style={btn()}>Save</button>
          </div>
        </Modal>
      )}

      {/* ═══ CONFIRM DELETE ═══════════════════════════════════════════════════ */}
      {confirmDelete && (
        <Modal title="Confirm Delete" onClose={()=>setConfirmDelete(null)}>
          <p style={{color:'#f87171',margin:'0 0 20px'}}>Permanently delete <strong>{confirmDelete.label}</strong>? This cannot be undone and will remove all their data.</p>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setConfirmDelete(null)} style={ghostBtn}>Cancel</button>
            <button onClick={deleteUser} style={btn('#ef4444')}>Delete Permanently</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
