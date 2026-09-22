'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import StyledSelect, { SelectOption } from '../../components/ui/StyledSelect'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

const ADMIN_GFONTS_URL = 'https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap'
const soraFont = "'Sora',system-ui,sans-serif"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface AdminPerms { overview:boolean; streamers:boolean; users:boolean; donations:boolean; settlements:boolean; restore_accounts:boolean; tickets:boolean; support:boolean; referrals:boolean }
interface AdminMe { adminId:string; email:string; name?:string; avatar?:string; isSuperAdmin:boolean; permissions:AdminPerms }
interface VisitorStats { websiteTotal:number; dashboardTotal:number; websiteToday:number; dashboardToday:number }
interface Stats { totalStreamers:number; totalViewers:number; totalDonations:number; totalCollected:number; pendingSettlements:number; totalPaidOut:number; visitors:VisitorStats }
interface BankDetails { id:string; accountHolderName:string|null; accountNumber:string|null; ifscCode:string|null; bankName:string|null; upiId:string|null; invoiceName:string|null; streetAddress:string|null; city:string|null; state:string|null; pincode:string|null }
interface Streamer { id:string; userId:string; username:string|null; channelName:string|null; channelLink:string|null; bio:string|null; email:string; displayName:string|null; isActive:boolean; isVerified:boolean; isPremium:boolean; verificationRequestedAt:string|null; minDonationAmount:number; overlayToken:string|null; discordWebhookUrl:string|null; createdAt:string; donationCount:number; settlementCount:number; pendingBalance:number; pendingNet:number; totalCollected:number; platformFeePct:number; bankDetails:BankDetails|null }
interface User { id:string; email:string; accountType:string; displayName:string|null; createdAt:string; deletedAt?:string|null; streamerProfile:{id:string;username:string|null;channelName:string|null;isActive:boolean;isVerified:boolean;_count?:{donations:number}}|null; viewerProfile:{id:string;displayName:string|null}|null }
interface Donation { id:string; donorName:string; message:string|null; amount:number; status:string; createdAt:string; cfOrderId:string; cfPaymentId:string|null; settled:boolean; streamer:{username:string|null;channelName:string|null} }
interface Settlement { id:string; grossAmount:number; feeAmount:string; netAmount:string; status:'INITIATED'|'SUCCESS'|'FAILED'; initiatedAt:string; settledAt:string|null; failureReason:string|null; cfTransferId:string|null; streamer:{username:string|null;channelName:string|null;user:{email:string};bankDetails:BankDetails|null} }
interface Role { id:string; name:string; permissions:AdminPerms; _count?:{admins:number}; createdAt:string }
interface AdminUser { id:string; email:string; name:string|null; avatar:string|null; isSuperAdmin:boolean; role:Role|null; createdAt:string }
interface SupportPayment { id:string; orderId:string; paymentId:string|null; amount:number; name:string|null; message:string|null; status:string; createdAt:string; paidAt:string|null }

type TabType = 'overview'|'streamers'|'users'|'deleted'|'donations'|'settlements'|'referrals'|'support'|'tickets'|'logs'|'team'

// ─── Styles ────────────────────────────────────────────────────────────────────
const fmt = (n:number) => `₹${n.toLocaleString('en-IN')}`
const S_COLORS:Record<string,string> = { INITIATED:'#fbbf24', SUCCESS:'#34d399', FAILED:'#f87171', PENDING:'#6b7280', REFUNDED:'#a78bfa', streamer:'#8b5cf6', viewer:'#22d3ee', verified:'#34d399' }
function Badge({v}:{v:string}){ return <span style={{padding:'3px 11px',borderRadius:20,fontSize:11,fontWeight:700,background:(S_COLORS[v]??'#6b7280')+'1e',color:S_COLORS[v]??'#6b7280',textTransform:'uppercase',letterSpacing:.5,border:`1px solid ${(S_COLORS[v]??'#6b7280')}38`}}>{v}</span> }
const card:React.CSSProperties = { background:'#131320', border:'1px solid rgba(255,255,255,0.08)', borderRadius:16, boxShadow:'0 1px 3px rgba(0,0,0,0.3)' }
const inp:React.CSSProperties = { width:'100%', padding:'9px 13px', background:'#1a1a2b', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, color:'#f5f6fb', fontSize:13, boxSizing:'border-box', colorScheme:'dark', WebkitTextFillColor:'#f5f6fb' }
const btn = (bg='#8b5cf6',c='#fff'):React.CSSProperties => ({ padding:'8px 16px', background:bg, color:c, border:'none', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:600 })
const ghostBtn:React.CSSProperties = { ...btn('transparent','#9a9cbe'), border:'1px solid rgba(255,255,255,0.1)' }
const dangerBtn:React.CSSProperties = btn('#f8717122','#f87171')
const gradBtn:React.CSSProperties = { ...btn(), background:'linear-gradient(135deg,#8b5cf6,#ec4899)', boxShadow:'0 4px 16px rgba(139,92,246,0.25)' }

// ─── Icons (lucide-style inline SVG, replaces emoji for a cleaner look) ─────────
const Icon = {
  overview:  (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="12" width="8" height="9" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></svg>,
  streamers: (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M9 21h6M12 17v4"/></svg>,
  users:     (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  deleted:   (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>,
  donations: (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  settlements:(p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3H7a2 2 0 0 0-2 2v14l4-2 3 2 3-2 3 2V5a2 2 0 0 0-2-2Z"/><path d="M9 8h6M9 12h6"/></svg>,
  support:   (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"/></svg>,
  tickets:   (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/></svg>,
  logs:      (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2M8 3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2M8 3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M9 12h6M9 16h6M9 8h2"/></svg>,
  team:      (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  referrals: (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.6l6.8-3.2M8.6 13.4l6.8 3.2"/></svg>,
  star:      (p:any)=><svg {...p} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7-6.2-3.9L6 21l1.6-7L2.2 9.2l7.1-.6z"/></svg>,
  key:       (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="15" r="4"/><path d="M10.5 12.5 19 4M16 8l2 2M19 5l2 2"/></svg>,
  refresh:   (p:any)=><svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"/></svg>,
}
const ALL_PERMS:Array<keyof AdminPerms> = ['overview','streamers','users','donations','settlements','restore_accounts','tickets','support','referrals']

// ─── Trend charts ──────────────────────────────────────────────────────────────
function fmtDay(d:string){ const dt = new Date(d+'T00:00:00Z'); return dt.toLocaleDateString('en-IN',{day:'numeric',month:'short'}) }

function TrendTooltip({active,payload,label,valueFmt}:any){
  if(!active||!payload?.length) return null
  return (
    <div style={{background:'#0f0f1a',border:'1px solid #2d2d4e',borderRadius:8,padding:'8px 12px',fontSize:12}}>
      <p style={{margin:'0 0 4px',color:'#888'}}>{fmtDay(label)}</p>
      {payload.map((p:any)=>(
        <p key={p.dataKey} style={{margin:0,color:p.color,fontWeight:700}}>{p.name}: {valueFmt?valueFmt(p.value):p.value}</p>
      ))}
    </div>
  )
}

function MiniAreaCard({title,data,dataKey,color,valueFmt}:{title:string;data:any[];dataKey:string;color:string;valueFmt?:(v:number)=>string}){
  const total = data.reduce((s,d)=>s+(d[dataKey]||0),0)
  const gradId = `grad-${dataKey}`
  return (
    <div style={{...card,padding:'16px 18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
        <p style={{color:'#888',fontSize:11,textTransform:'uppercase',letterSpacing:.5,margin:0}}>{title}</p>
        <p style={{fontFamily:soraFont,color,fontSize:17,fontWeight:800,margin:0}}>{valueFmt?valueFmt(total):total}</p>
      </div>
      <ResponsiveContainer width="100%" height={64}>
        <AreaChart data={data} margin={{top:4,right:2,left:2,bottom:0}}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35}/>
              <stop offset="100%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis dataKey="day" hide/>
          <YAxis hide domain={[0,'auto']}/>
          <Tooltip content={<TrendTooltip valueFmt={valueFmt}/>} cursor={{stroke:'#2d2d4e'}}/>
          <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{r:4}} isAnimationActive={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function SignupsTrendCard({data}:{data:any[]}){
  const totalStreamers = data.reduce((s,d)=>s+(d.newStreamers||0),0)
  const totalViewers = data.reduce((s,d)=>s+(d.newViewers||0),0)
  return (
    <div style={{...card,padding:'16px 18px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:6}}>
        <p style={{color:'#888',fontSize:11,textTransform:'uppercase',letterSpacing:.5,margin:0}}>New Signups</p>
        <p style={{fontSize:13,margin:0}}><span style={{color:S_COLORS.streamer,fontWeight:800}}>{totalStreamers}</span><span style={{color:'#555'}}> streamers · </span><span style={{color:S_COLORS.viewer,fontWeight:800}}>{totalViewers}</span><span style={{color:'#555'}}> viewers</span></p>
      </div>
      <ResponsiveContainer width="100%" height={64}>
        <BarChart data={data} margin={{top:4,right:2,left:2,bottom:0}} barGap={2}>
          <XAxis dataKey="day" hide/>
          <YAxis hide/>
          <Tooltip content={<TrendTooltip/>} cursor={{fill:'rgba(255,255,255,0.04)'}}/>
          <Bar dataKey="newStreamers" name="Streamers" fill={S_COLORS.streamer} radius={[3,3,0,0]} isAnimationActive={false}/>
          <Bar dataKey="newViewers" name="Viewers" fill={S_COLORS.viewer} radius={[3,3,0,0]} isAnimationActive={false}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

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
  const [donations, setDonations]       = useState<Donation[]>([])
  const [settlements, setSettlements]   = useState<Settlement[]>([])
  const [referralPartners, setReferralPartners] = useState<any[]>([])
  const [referralSettlements, setReferralSettlements] = useState<any[]>([])
  const [referralFilter, setReferralFilter] = useState('')
  const [editReferralBank, setEditReferralBank] = useState<any|null>(null)
  const [rbForm, setRbForm] = useState<any>({})
  const [referralTransferRef, setReferralTransferRef] = useState<Record<string,string>>({})
  const [deletedUsers, setDeletedUsers] = useState<User[]>([])
  const [supportPayments, setSupportPayments] = useState<SupportPayment[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [activeTicket, setActiveTicket] = useState<any|null>(null)
  const [ticketReply, setTicketReply] = useState('')
  const [ticketSending, setTicketSending] = useState(false)
  const [ticketImage, setTicketImage] = useState('')
  const [logs, setLogs] = useState<any[]>([])
  const [platformConfig, setPlatformConfig] = useState<Record<string,string>>({})
  const [testingWebhook, setTestingWebhook] = useState(false)
  const ticketFileRef = typeof document !== 'undefined' ? { current: null as HTMLInputElement | null } : { current: null as HTMLInputElement | null }
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
  const [hardDeleteTarget, setHardDeleteTarget]   = useState<Streamer|null>(null)
  const [hardDeleteConfirmText, setHardDeleteConfirmText] = useState('')
  const [hardDeleting, setHardDeleting]           = useState(false)
  const [sForm, setSForm]   = useState<Partial<Streamer>>({})
  const [bForm, setBForm]   = useState<Partial<BankDetails>>({})
  const [uForm, setUForm]   = useState<{email:string;displayName:string}>({email:'',displayName:''})
  const [editDonation, setEditDonation] = useState<Donation|null>(null)
  const [dForm, setDForm]   = useState<{amount:string;donorName:string;message:string;status:string}>({amount:'',donorName:'',message:'',status:'SUCCESS'})
  const [dSaving, setDSaving] = useState(false)

  // Balance adjustment + goal editing
  const [adjustTarget, setAdjustTarget] = useState<Streamer|null>(null)
  const [adjustForm, setAdjustForm]     = useState<{amount:string;reason:string}>({amount:'',reason:''})
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [goalTarget, setGoalTarget]     = useState<Streamer|null>(null)
  const [goalForm, setGoalForm]         = useState<{title:string;targetAmount:number;currentAmount:number;isActive:boolean}>({title:'',targetAmount:1000,currentAmount:0,isActive:true})
  const [goalLoading, setGoalLoading]   = useState(false)
  const [goalSaving, setGoalSaving]     = useState(false)

  // 7-day trend data
  const [trend, setTrend]           = useState<any[]>([])
  const [trendDays, setTrendDays]   = useState(7)
  const [streamerTrend, setStreamerTrend]               = useState<{id:string;data:any[]}|null>(null)
  const [streamerTrendLoading, setStreamerTrendLoading] = useState<string|null>(null)

  // Role/admin management state
  const [newRoleName, setNewRoleName]   = useState('')
  const [newRolePerms, setNewRolePerms] = useState<AdminPerms>({ overview:false, streamers:false, users:false, donations:false, settlements:false, restore_accounts:false, tickets:false, support:false, referrals:false })
  const [editRole, setEditRole]         = useState<Role|null>(null)
  const [editRolePerms, setEditRolePerms] = useState<AdminPerms>({ overview:false, streamers:false, users:false, donations:false, settlements:false, restore_accounts:false, tickets:false, support:false, referrals:false })
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminRoleId, setNewAdminRoleId] = useState('')

  const [testDonation, setTestDonation] = useState({ streamerId:'', donorName:'SuperAdmin', amount:100, message:'This is a test donation!' })
  const [testDonationSending, setTestDonationSending] = useState(false)

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
    if (admin.isSuperAdmin || admin.permissions.overview) api(`/stats/trend?days=${trendDays}`).then((d:any)=>setTrend(d.trend)).catch(()=>{})
    if (tab==='streamers' && (admin.isSuperAdmin||admin.permissions.streamers)) api('/streamers').then(setStreamers).catch(()=>{})
    if (tab==='users' && (admin.isSuperAdmin||admin.permissions.users)) api('/users').then(setUsers).catch(()=>{})
    if (tab==='donations' && (admin.isSuperAdmin||admin.permissions.donations)) api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}`).then((d:any)=>setDonations(d.donations)).catch(()=>{})
    if (tab==='settlements' && (admin.isSuperAdmin||admin.permissions.settlements)) api(`/settlements${settlementFilter?`?status=${settlementFilter}`:''}`).then(setSettlements).catch(()=>{})
    if (tab==='referrals' && (admin.isSuperAdmin||admin.permissions.referrals)) { api('/referrals').then(setReferralPartners).catch(()=>{}); api('/referral-settlements').then(setReferralSettlements).catch(()=>{}) }
    if (tab==='support' && (admin.isSuperAdmin||admin.permissions.support)) api('/support-payments').then(setSupportPayments).catch(()=>{})
    if (tab==='tickets' && (admin.isSuperAdmin||admin.permissions.tickets)) api('/tickets').then(setTickets).catch(()=>{})
    if (tab==='logs' && admin.isSuperAdmin) api('/logs').then(setLogs).catch(()=>{})
  }, [admin, tab, api, donationFilter, settlementFilter, trendDays])

  useEffect(() => {
    if (!admin) return
    if (admin.isSuperAdmin || admin.permissions.overview) api(`/stats/trend?days=${trendDays}`).then((d:any)=>setTrend(d.trend)).catch(()=>{})
  }, [admin, api, trendDays])

  useEffect(() => {
    if (!admin) return
    if (admin.isSuperAdmin || admin.permissions.overview) api('/stats').then(setStats).catch(()=>{})
    if (admin.isSuperAdmin) api('/streamers').then(setStreamers).catch(()=>{})
  }, [admin, api])

  useEffect(() => {
    if (!admin) return
    if (tab==='streamers' && (admin.isSuperAdmin||admin.permissions.streamers)) api('/streamers').then(setStreamers).catch(()=>{})
    if (tab==='users' && (admin.isSuperAdmin||admin.permissions.users)) api(`/users${userSearch?`?search=${userSearch}`:''}`).then(setUsers).catch(()=>{})
    if (tab==='donations' && (admin.isSuperAdmin||admin.permissions.donations)) api(`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${donationSearch}`:''}`).then((d:any)=>setDonations(d.donations)).catch(()=>{})
    if (tab==='settlements' && (admin.isSuperAdmin||admin.permissions.settlements)) api(`/settlements${settlementFilter?`?status=${settlementFilter}`:''}`).then(setSettlements).catch(()=>{})
    if (tab==='referrals' && (admin.isSuperAdmin||admin.permissions.referrals)) { api('/referrals').then(setReferralPartners).catch(()=>{}); api('/referral-settlements').then(setReferralSettlements).catch(()=>{}) }
    if (tab==='support' && (admin.isSuperAdmin||admin.permissions.support)) api('/support-payments').then(setSupportPayments).catch(()=>{})
    if (tab==='tickets' && (admin.isSuperAdmin||admin.permissions.tickets)) api('/tickets').then(setTickets).catch(()=>{})
    if (tab==='deleted' && (admin.isSuperAdmin||admin.permissions.restore_accounts)) api('/deleted-users').then(setDeletedUsers).catch(()=>{})
    if (tab==='team' && admin.isSuperAdmin) {
      api('/roles').then(setRoles).catch(()=>{})
      api('/admin-users').then(setAdminUsers).catch(()=>{})
      api('/config').then(setPlatformConfig).catch(()=>{})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, admin, settlementFilter, donationFilter])

  // Poll for new messages while admin has a ticket thread open
  const ticketPollRef = useRef<ReturnType<typeof setInterval>|null>(null)
  useEffect(() => {
    if (ticketPollRef.current) clearInterval(ticketPollRef.current)
    if (!activeTicket || activeTicket.status === 'CLOSED') return
    ticketPollRef.current = setInterval(async () => {
      try {
        const fresh: any[] = await api('/tickets')
        const updated = fresh.find((t: any) => t.id === activeTicket.id)
        if (updated && updated.messages.length !== activeTicket.messages?.length) {
          setActiveTicket(updated)
          setTickets(fresh)
        }
      } catch {}
    }, 5000)
    return () => { if (ticketPollRef.current) clearInterval(ticketPollRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTicket?.id, activeTicket?.messages?.length, activeTicket?.status])

  // ── Streamer actions ────────────────────────────────────────────────────────
  async function toggleStreamerField(id:string, field:'isActive'|'isVerified'|'isPremium', val:boolean) {
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

  // ── Referral partners ────────────────────────────────────────────────────────
  async function approveReferralVerification(id:string) {
    await api(`/referrals/${id}/approve-verification`, { method:'POST' })
    setReferralPartners(p=>p.map(r=>r.id===id?{...r,isVerified:true,verificationRequestedAt:null}:r))
    showToast('✓ Referral partner verified!')
  }
  async function rejectReferralVerification(id:string) {
    await api(`/referrals/${id}/reject-verification`, { method:'POST' })
    setReferralPartners(p=>p.map(r=>r.id===id?{...r,verificationRequestedAt:null}:r))
    showToast('Verification request cleared')
  }
  async function toggleReferralActive(id:string, isActive:boolean) {
    await api(`/referrals/${id}`, { method:'PATCH', body:JSON.stringify({ isActive }) })
    setReferralPartners(p=>p.map(r=>r.id===id?{...r,isActive}:r))
    showToast(isActive?'Reactivated':'Deactivated')
  }
  async function saveReferralBank() {
    if (!editReferralBank) return
    await api(`/referrals/${editReferralBank.id}/bank`, { method:'PATCH', body:JSON.stringify(rbForm) })
    setReferralPartners(p=>p.map(r=>r.id===editReferralBank.id?{...r,bankDetails:{...(r.bankDetails??{}),...rbForm}}:r))
    setEditReferralBank(null); showToast('Bank details saved')
  }
  async function markReferralSettlementPaid(id:string) {
    const ref = referralTransferRef[id] || undefined
    const updated = await api(`/referral-settlements/${id}/mark-paid`, { method:'PATCH', body:JSON.stringify({ transferRef: ref }) })
    setReferralSettlements(p=>p.map(s=>s.id===id?updated:s))
    showToast('Marked as paid')
  }
  async function markReferralSettlementFailed(id:string) {
    const updated = await api(`/referral-settlements/${id}/mark-failed`, { method:'PATCH', body:JSON.stringify({ reason:'Marked failed by admin' }) })
    setReferralSettlements(p=>p.map(s=>s.id===id?updated:s))
    showToast('Marked as failed')
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

  // ── Permanent deletion (super admin only) ───────────────────────────────────
  async function hardDeleteStreamer() {
    if (!hardDeleteTarget) return
    setHardDeleting(true)
    try {
      await api(`/streamers/${hardDeleteTarget.id}/permanent`, { method:'DELETE' })
      setStreamers(p=>p.filter(s=>s.id!==hardDeleteTarget.id))
      showToast('Permanently deleted')
      setHardDeleteTarget(null); setHardDeleteConfirmText('')
    } catch (e:any) { showToast(e.message || 'Failed to delete') }
    finally { setHardDeleting(false) }
  }

  // ── Donation editing ─────────────────────────────────────────────────────────
  async function saveDonation() {
    if (!editDonation) return
    const amount = Number(dForm.amount)
    if (!Number.isInteger(amount) || amount <= 0) { showToast('Amount must be a positive whole number'); return }
    setDSaving(true)
    try {
      const updated = await api(`/donations/${editDonation.id}`, { method:'PATCH', body:JSON.stringify({ amount, donorName: dForm.donorName, message: dForm.message, status: dForm.status }) })
      setDonations(p=>p.map(d=>d.id===editDonation.id?{...d,...updated}:d))
      showToast('Donation updated')
      setEditDonation(null)
    } catch (e:any) { showToast(e.message || 'Failed — donations already settled cannot have their amount changed') }
    finally { setDSaving(false) }
  }

  // ── Balance adjustment ───────────────────────────────────────────────────────
  async function saveAdjustment() {
    if (!adjustTarget) return
    const amount = Number(adjustForm.amount)
    if (!Number.isInteger(amount) || amount === 0) { showToast('Enter a non-zero whole number'); return }
    if (!adjustForm.reason.trim()) { showToast('A reason is required'); return }
    setAdjustSaving(true)
    try {
      await api(`/streamers/${adjustTarget.id}/adjustment`, { method:'POST', body:JSON.stringify({ amount, reason: adjustForm.reason }) })
      showToast(`${amount > 0 ? 'Credited' : 'Debited'} ${fmt(Math.abs(amount))}`)
      setAdjustTarget(null)
      reload()
    } catch (e:any) { showToast(e.message || 'Adjustment failed') }
    finally { setAdjustSaving(false) }
  }

  // ── Goal editing ─────────────────────────────────────────────────────────────
  async function openGoal(s: Streamer) {
    setGoalTarget(s)
    setGoalLoading(true)
    try {
      const detail = await api(`/streamers/${s.id}`)
      const g = detail.goals?.[0]
      setGoalForm(g
        ? { title: g.title, targetAmount: g.targetAmount, currentAmount: g.currentAmount, isActive: g.isActive }
        : { title:'', targetAmount:1000, currentAmount:0, isActive:true })
    } catch { showToast('Failed to load goal') }
    finally { setGoalLoading(false) }
  }
  async function saveGoal() {
    if (!goalTarget) return
    if (!goalForm.title.trim()) { showToast('Goal needs a title'); return }
    setGoalSaving(true)
    try {
      await api(`/streamers/${goalTarget.id}/goal`, { method:'PATCH', body:JSON.stringify(goalForm) })
      showToast('Goal updated')
      setGoalTarget(null)
    } catch (e:any) { showToast(e.message || 'Failed to save goal') }
    finally { setGoalSaving(false) }
  }

  // ── Per-creator 7-day trend ──────────────────────────────────────────────────
  async function toggleStreamerTrend(id: string) {
    if (streamerTrend?.id === id) { setStreamerTrend(null); return }
    setStreamerTrendLoading(id)
    try {
      const d = await api(`/streamers/${id}/trend?days=7`)
      setStreamerTrend({ id, data: d.trend })
    } catch { showToast('Failed to load trend') }
    finally { setStreamerTrendLoading(null) }
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
    try {
      await api(`/users/${confirmDelete.id}`, { method:'DELETE' })
      setUsers(p=>p.filter(u=>u.id!==confirmDelete.id))
      setStreamers(p=>p.filter(s=>s.userId!==confirmDelete.id))
      setConfirmDelete(null); showToast('Account deactivated — data preserved for restore')
    } catch(e:any) {
      showToast(`Failed: ${e.message}`)
      setConfirmDelete(null)
    }
  }
  async function restoreUser(id:string) {
    await api(`/users/${id}/restore`, { method:'POST' })
    setDeletedUsers(p=>p.filter(u=>u.id!==id))
    showToast('Account restored ✓')
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
    setNewRoleName(''); setNewRolePerms({ overview:false, streamers:false, users:false, donations:false, settlements:false, restore_accounts:false, tickets:false, support:false, referrals:false })
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

  const canRestore = admin.isSuperAdmin || admin.permissions.restore_accounts
  const TABS = ([
    { key:'overview'    as TabType, label:'Overview',    show:canSee('overview') },
    { key:'streamers'   as TabType, label:'Streamers',   show:canSee('streamers') },
    { key:'users'       as TabType, label:'Users',       show:canSee('users') },
    { key:'deleted'     as TabType, label:'🗑 Deleted',  show:canRestore },
    { key:'donations'   as TabType, label:'Donations',   show:canSee('donations') },
    { key:'settlements' as TabType, label:'Settlements', show:canSee('settlements') },
    { key:'referrals'   as TabType, label:'Referrals',   show:canSee('referrals') },
    { key:'support'     as TabType, label:'💜 Support Us', show:admin.isSuperAdmin || admin.permissions.support },
    { key:'tickets'     as TabType, label:'🎫 Tickets',     show:admin.isSuperAdmin || admin.permissions.tickets },
    { key:'logs'        as TabType, label:'📋 Logs',     show:admin.isSuperAdmin },
    { key:'team'        as TabType, label:'Team',        show:admin.isSuperAdmin },
  ] as Array<{key:TabType;label:string;show:boolean}>).filter(t=>t.show)

  const TAB_ICONS: Record<TabType, (p:any)=>React.ReactElement> = {
    overview:Icon.overview, streamers:Icon.streamers, users:Icon.users, deleted:Icon.deleted,
    donations:Icon.donations, settlements:Icon.settlements, referrals:Icon.referrals, support:Icon.support,
    tickets:Icon.tickets, logs:Icon.logs, team:Icon.team,
  }
  const TAB_LABELS: Record<TabType, string> = {
    overview:'Overview', streamers:'Streamers', users:'Users', deleted:'Deleted',
    donations:'Donations', settlements:'Settlements', referrals:'Referrals', support:'Support Us',
    tickets:'Tickets', logs:'Logs', team:'Team',
  }

  return (
    <div className="admin-shell" style={{fontFamily:'system-ui,sans-serif',background:'#08080f',minHeight:'100vh',color:'#f5f6fb'}}>
      <link rel="stylesheet" href={ADMIN_GFONTS_URL} />
      <style>{`
        input,textarea,select{color:#f5f6fb!important;-webkit-text-fill-color:#f5f6fb!important;background-color:#1a1a2b!important;}
        input::placeholder,textarea::placeholder{color:#5c5e80!important;-webkit-text-fill-color:#5c5e80!important;}
        input:-webkit-autofill,input:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 1000px #1a1a2b inset!important;-webkit-text-fill-color:#f5f6fb!important;}
        .admin-shell h1,.admin-shell h2,.admin-shell h3{font-family:'Sora',system-ui,sans-serif;letter-spacing:-0.01em;}
        .admin-shell button:not(:disabled){transition:filter .12s,transform .12s,opacity .12s,box-shadow .12s;}
        .admin-shell button:not(:disabled):hover{filter:brightness(1.15);}
        .admin-shell button:not(:disabled):active{transform:scale(0.97);}
        .admin-shell button:disabled{opacity:.6;cursor:not-allowed;}
        .admin-shell input:focus-visible,.admin-shell textarea:focus-visible,.admin-shell select:focus-visible,.admin-shell button:focus-visible{
          outline:2px solid #a78bfa;outline-offset:2px;
        }
        .admin-shell table tbody tr{transition:background-color .12s;}
        .admin-shell table tbody tr:hover{background-color:rgba(139,92,246,0.07)!important;}
        .admin-shell ::-webkit-scrollbar{width:8px;height:8px;}
        .admin-shell ::-webkit-scrollbar-track{background:#08080f;}
        .admin-shell ::-webkit-scrollbar-thumb{background:#252538;border-radius:8px;}
        .admin-shell ::-webkit-scrollbar-thumb:hover{background:#33334a;}
        .adm-nav{display:flex;align-items:center;gap:11px;padding:10px 14px;border-radius:11px;border:none;cursor:pointer;font-size:13.5px;font-weight:600;color:#9a9cbe;background:transparent;white-space:nowrap;width:100%;text-align:left;position:relative;}
        .adm-nav.active{background:linear-gradient(135deg,rgba(139,92,246,0.18),rgba(236,72,153,0.1));color:#fff;}
        .adm-nav.active::before{content:'';position:absolute;left:-14px;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:linear-gradient(180deg,#8b5cf6,#ec4899);}
        .adm-nav:not(.active):hover{background:rgba(255,255,255,0.05);color:#f5f6fb;}
        .adm-sidebar{width:236px;flex-shrink:0;background:#0c0c17;border-right:1px solid rgba(255,255,255,0.08);display:flex;flex-direction:column;height:100vh;position:sticky;top:0;}
        @media (max-width:900px){.adm-sidebar{position:relative;height:auto;width:100%;flex-direction:row;overflow-x:auto;border-right:none;border-bottom:1px solid rgba(255,255,255,0.08);}
          .adm-sidebar .adm-nav-scroll{flex-direction:row!important;padding:8px!important;}
          .adm-nav.active::before{display:none;}
          .adm-sidebar-head,.adm-sidebar-foot{display:none!important;}}
      `}</style>
      {toast && <div style={{position:'fixed',top:20,right:20,zIndex:200,background:'linear-gradient(135deg,#34d399,#10b981)',color:'#04150d',padding:'11px 20px',borderRadius:10,fontSize:14,fontWeight:700,boxShadow:'0 8px 28px rgba(52,211,153,0.35)'}}>{toast}</div>}

      <div style={{display:'flex',alignItems:'flex-start'}}>
        {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════════ */}
        <aside className="adm-sidebar">
          <div className="adm-sidebar-head" style={{padding:'18px 18px 14px',display:'flex',alignItems:'center',gap:10}}>
            <a href="/dashboard"><img src="/logo.png" alt="EzTips" style={{height:34,width:'auto',borderRadius:8,verticalAlign:'middle'}} /></a>
            <span style={{display:'flex',alignItems:'center',gap:5,fontSize:10.5,fontWeight:700,letterSpacing:.06,textTransform:'uppercase',color:admin.isSuperAdmin?'#fbbf24':'#8b5cf6',background:admin.isSuperAdmin?'rgba(251,191,36,0.1)':'rgba(139,92,246,0.1)',padding:'3px 9px',borderRadius:20,border:`1px solid ${admin.isSuperAdmin?'rgba(251,191,36,0.25)':'rgba(139,92,246,0.25)'}`}}>
              {admin.isSuperAdmin ? <Icon.star width={10} height={10}/> : <Icon.key width={11} height={11}/>}
              {admin.isSuperAdmin ? 'Super Admin' : 'Admin'}
            </span>
          </div>
          <nav className="adm-nav-scroll" style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:2,padding:'8px 14px'}}>
            {TABS.map(t=>{
              const TIcon = TAB_ICONS[t.key]
              return (
                <button key={t.key} onClick={()=>setTab(t.key)} className={`adm-nav ${tab===t.key?'active':''}`}>
                  <TIcon width={16} height={16}/>
                  {TAB_LABELS[t.key]}
                  {t.key==='settlements'&&stats?.pendingSettlements?<span style={{marginLeft:'auto',background:'#fbbf24',color:'#1a1206',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700}}>{stats.pendingSettlements}</span>:null}
                  {t.key==='team'&&<span style={{marginLeft:'auto',fontSize:10,color:'#8b5cf6',fontWeight:700}}>SA</span>}
                </button>
              )
            })}
          </nav>
          <div className="adm-sidebar-foot" style={{padding:14,borderTop:'1px solid rgba(255,255,255,0.08)',display:'flex',flexDirection:'column',gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:9}}>
              {admin.avatar && <img src={admin.avatar} alt="" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover',border:'1px solid rgba(255,255,255,0.12)',flexShrink:0}}/>}
              <span style={{color:'#9a9cbe',fontSize:12.5,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{admin.name ?? admin.email}</span>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={reload} title="Refresh" style={{...ghostBtn,flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'7px 9px'}}><Icon.refresh width={14} height={14}/></button>
              <button onClick={signOut} style={{...ghostBtn,flex:1}}>Sign out</button>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
        <main style={{flex:1,minWidth:0,padding:'24px 32px',maxWidth:1440,margin:'0 auto'}}>

        {/* ═══ OVERVIEW ══════════════════════════════════════════════════════════ */}
        {tab==='overview' && stats && (
          <div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:14,marginBottom:24}}>
              {[
                {label:'Streamers',   value:stats.totalStreamers,      color:'#8b5cf6'},
                {label:'Viewers',     value:stats.totalViewers,        color:'#22d3ee'},
                {label:'Donations',   value:stats.totalDonations,      color:'#60a5fa'},
                {label:'Collected',   value:fmt(stats.totalCollected),  color:'#34d399'},
                {label:'Pending Pay', value:stats.pendingSettlements,  color:'#fbbf24'},
                {label:'Paid Out',    value:fmt(stats.totalPaidOut),   color:'#ec4899'},
              ].map(c=>(
                <div key={c.label} style={{...card,padding:'18px 22px',transition:'transform .15s,box-shadow .15s'}}
                  onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.35)'}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.3)'}}>
                  <p style={{color:'#5c5e80',fontSize:11,fontWeight:600,margin:'0 0 8px',textTransform:'uppercase',letterSpacing:.6}}>{c.label}</p>
                  <p style={{fontFamily:soraFont,color:c.color,fontSize:26,fontWeight:800,margin:0,letterSpacing:'-0.01em'}}>{c.value}</p>
                </div>
              ))}
            </div>

            {/* Historical trend */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <h3 style={{margin:0,fontSize:13,fontWeight:700,color:'#888',textTransform:'uppercase',letterSpacing:.5}}>History</h3>
              <div style={{display:'flex',gap:6}}>
                {[7,14,30].map(d=>(
                  <button key={d} onClick={()=>setTrendDays(d)} style={trendDays===d?btn('#7c3aed33','#a78bfa'):ghostBtn}>{d}d</button>
                ))}
              </div>
            </div>
            {trend.length > 0 && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:14,marginBottom:24}}>
                <MiniAreaCard title="Revenue" data={trend} dataKey="revenue" color="#10b981" valueFmt={fmt}/>
                <MiniAreaCard title="Donations" data={trend} dataKey="donationCount" color="#3b82f6"/>
                <SignupsTrendCard data={trend}/>
                <MiniAreaCard title="Settlements Paid" data={trend} dataKey="settlementsNet" color="#ec4899" valueFmt={fmt}/>
              </div>
            )}

            {/* Visitor Counter */}
            <div style={{...card,padding:'20px 24px',marginBottom:16}}>
              <p style={{color:'#888',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,margin:'0 0 16px'}}>👁 Unique Visitors (by IP)</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:10,padding:'14px 18px'}}>
                  <p style={{color:'#888',fontSize:11,margin:'0 0 4px',textTransform:'uppercase',letterSpacing:.5}}>🌐 Website — All Time</p>
                  <p style={{color:'#a78bfa',fontSize:28,fontWeight:800,margin:'0 0 2px'}}>{stats.visitors?.websiteTotal ?? 0}</p>
                  <p style={{color:'#666',fontSize:11,margin:0}}>+{stats.visitors?.websiteToday ?? 0} today</p>
                </div>
                <div style={{background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:10,padding:'14px 18px'}}>
                  <p style={{color:'#888',fontSize:11,margin:'0 0 4px',textTransform:'uppercase',letterSpacing:.5}}>📊 Dashboard — All Time</p>
                  <p style={{color:'#34d399',fontSize:28,fontWeight:800,margin:'0 0 2px'}}>{stats.visitors?.dashboardTotal ?? 0}</p>
                  <p style={{color:'#666',fontSize:11,margin:0}}>+{stats.visitors?.dashboardToday ?? 0} today</p>
                </div>
              </div>
            </div>

            {stats.pendingSettlements>0 && (
              <div style={{...card,borderColor:'#f59e0b55',padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{color:'#f59e0b',fontWeight:600}}>⚠ {stats.pendingSettlements} pending settlement{stats.pendingSettlements!==1?'s':''}</span>
                {canSee('settlements') && <button onClick={()=>setTab('settlements')} style={btn()}>View →</button>}
              </div>
            )}

            {admin.isSuperAdmin && (
              <div style={{...card,padding:'20px 24px',marginTop:16,border:'1px solid rgba(219,39,119,0.25)',background:'rgba(219,39,119,0.04)'}}>
                <p style={{color:'#f472b6',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,margin:'0 0 16px'}}>🎭 Test Donation — Fire a fake alert on any streamer&apos;s overlay</p>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div>
                    <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>Streamer</label>
                    <select
                      value={testDonation.streamerId}
                      onChange={e=>setTestDonation(d=>({...d,streamerId:e.target.value}))}
                      style={{...inp,cursor:'pointer'}}
                    >
                      <option value=''>— select streamer —</option>
                      {streamers.map(s=>(
                        <option key={s.id} value={s.id}>{s.channelName || s.username || s.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>Donor Name</label>
                    <input style={inp} value={testDonation.donorName} onChange={e=>setTestDonation(d=>({...d,donorName:e.target.value}))} placeholder='SuperAdmin' />
                  </div>
                  <div>
                    <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>Amount (₹)</label>
                    <input style={inp} type='number' min={1} value={testDonation.amount} onChange={e=>setTestDonation(d=>({...d,amount:Number(e.target.value)}))} />
                  </div>
                  <div>
                    <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>Message</label>
                    <input style={inp} value={testDonation.message} onChange={e=>setTestDonation(d=>({...d,message:e.target.value}))} placeholder='You are good!' />
                  </div>
                </div>
                <button
                  disabled={testDonationSending || !testDonation.streamerId}
                  onClick={async()=>{
                    if (!testDonation.streamerId) return
                    setTestDonationSending(true)
                    try {
                      await api('/test-donation', { method:'POST', body: JSON.stringify(testDonation) })
                      showToast('Test donation sent! Check the overlay.')
                    } catch(e:any) { showToast('Error: ' + (e.message||'failed')) }
                    setTestDonationSending(false)
                  }}
                  style={{...btn('#db2777'),opacity:(!testDonation.streamerId||testDonationSending)?0.5:1}}
                >
                  {testDonationSending ? 'Sending…' : '🚀 Fire Test Donation'}
                </button>
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
                    {[['COLLECTED',fmt(s.totalCollected),'#10b981'],['PENDING',fmt(s.pendingBalance),'#f59e0b'],['NET PAYABLE',fmt(s.pendingNet),'#7c3aed'],['PLATFORM FEE',`${s.platformFeePct??7}%`,'#f59e0b'],['DONATIONS',String(s.donationCount),'#fff']].map(([l,v,c])=>(
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
                    <span>Acc: <strong style={{color:'#fff',fontFamily:"'JetBrains Mono',monospace"}}>{s.bankDetails.accountNumber}</strong></span>
                    <span>IFSC: <strong style={{color:'#fff',fontFamily:"'JetBrains Mono',monospace"}}>{s.bankDetails.ifscCode}</strong></span>
                    <span>Name: <strong style={{color:'#fff'}}>{s.bankDetails.accountHolderName}</strong></span>
                    {s.bankDetails.upiId && <span>UPI: <strong style={{color:'#fff',fontFamily:"'JetBrains Mono',monospace"}}>{s.bankDetails.upiId}</strong></span>}
                  </div>
                ) : (
                  <div style={{background:'#ef444411',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#f87171',marginBottom:12}}>⚠ No bank details</div>
                )}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <button onClick={()=>{setEditStreamer(s);setSForm({channelName:s.channelName??'',bio:s.bio??'',channelLink:s.channelLink??'',username:s.username??'',minDonationAmount:s.minDonationAmount,discordWebhookUrl:s.discordWebhookUrl??'',platformFeePct:s.platformFeePct??7})}} style={btn()}>✏ Edit</button>
                  <button onClick={()=>{setEditBank(s);setBForm({accountHolderName:s.bankDetails?.accountHolderName??'',accountNumber:s.bankDetails?.accountNumber??'',ifscCode:s.bankDetails?.ifscCode??'',bankName:s.bankDetails?.bankName??'',upiId:s.bankDetails?.upiId??'',invoiceName:s.bankDetails?.invoiceName??'',streetAddress:s.bankDetails?.streetAddress??'',city:s.bankDetails?.city??'',state:s.bankDetails?.state??'',pincode:s.bankDetails?.pincode??''})}} style={btn('#0f0f1a','#aaa')}>🏦 Bank</button>
                  {s.isVerified
                    ? <button onClick={()=>toggleStreamerField(s.id,'isVerified',false)} style={btn('#10b98122','#10b981')}>✓ Verified</button>
                    : s.verificationRequestedAt
                      ? <><button onClick={()=>approveVerification(s.id)} style={btn('#10b98122','#10b981')}>✓ Approve</button><button onClick={()=>rejectVerification(s.id)} style={dangerBtn}>✕ Reject</button></>
                      : <button onClick={()=>approveVerification(s.id)} style={btn('#7c3aed22','#7c3aed')}>◯ Verify</button>
                  }
                  <button onClick={()=>toggleStreamerField(s.id,'isActive',!s.isActive)} style={btn(s.isActive?'#ef444422':'#10b98122',s.isActive?'#f87171':'#10b981')}>{s.isActive?'Deactivate':'Activate'}</button>
                  <button onClick={()=>toggleStreamerField(s.id,'isPremium',!s.isPremium)} style={btn(s.isPremium?'#f59e0b33':'#0f0f1a',s.isPremium?'#f59e0b':'#555')}>
                    {s.isPremium ? '⭐ Premium' : '○ Premium'}
                  </button>
                  <button onClick={()=>resetOverlay(s.id)} style={ghostBtn}>Reset Overlay</button>
                  <button onClick={()=>toggleStreamerTrend(s.id)} style={streamerTrend?.id===s.id?btn('#3b82f622','#60a5fa'):ghostBtn}>
                    {streamerTrendLoading===s.id ? '…' : '📈 7-Day Trend'}
                  </button>
                  <button onClick={()=>{setAdjustTarget(s);setAdjustForm({amount:'',reason:''})}} style={btn('#f59e0b22','#f59e0b')}>💰 Adjust Balance</button>
                  <button onClick={()=>openGoal(s)} style={btn('#06b6d422','#22d3ee')}>🎯 Goal</button>
                  <button onClick={()=>setConfirmDelete({id:s.userId,label:s.channelName??s.email,type:'user'})} style={dangerBtn}>Deactivate</button>
                  {admin.isSuperAdmin && (
                    <button onClick={()=>{setHardDeleteTarget(s);setHardDeleteConfirmText('')}} style={{...btn('#7f1d1d','#fca5a5'),border:'1px solid #ef444455'}}>🗑 Delete Permanently</button>
                  )}
                </div>
                {streamerTrend?.id===s.id && (
                  <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #2d2d4e',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <MiniAreaCard title="Revenue (7d)" data={streamerTrend.data} dataKey="revenue" color="#10b981" valueFmt={fmt}/>
                    <MiniAreaCard title="Donations (7d)" data={streamerTrend.data} dataKey="donationCount" color="#3b82f6"/>
                  </div>
                )}
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

        {/* ═══ DELETED ACCOUNTS ══════════════════════════════════════════════════ */}
        {tab==='deleted' && canRestore && (
          <div>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Deleted Accounts ({deletedUsers.length})</h2>
              <span style={{fontSize:12,color:'#64748b',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',padding:'3px 10px',borderRadius:20}}>All data preserved — restore any time</span>
            </div>
            {deletedUsers.length===0 ? (
              <div style={{...card,padding:60,textAlign:'center',color:'#555'}}>No deleted accounts</div>
            ) : (
              <div style={{...card,overflow:'hidden'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead><tr style={{background:'#0f0f1a',color:'#666'}}>
                    {['Email','Name','Type','Profile','Donations','Deleted On','Restore'].map(h=><th key={h} style={{padding:'11px 16px',fontWeight:600,textAlign:'left'}}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {deletedUsers.map((u,i)=>(
                      <tr key={u.id} style={{borderTop:'1px solid #2d2d4e',background:i%2?'#ffffff04':'transparent'}}>
                        <td style={{padding:'11px 16px'}}>{u.email}</td>
                        <td style={{padding:'11px 16px',color:'#aaa'}}>{u.displayName??'—'}</td>
                        <td style={{padding:'11px 16px'}}><Badge v={u.accountType}/></td>
                        <td style={{padding:'11px 16px',color:'#aaa'}}>{u.streamerProfile?`${u.streamerProfile.channelName??''} @${u.streamerProfile.username??'—'}`:u.viewerProfile?.displayName??'—'}</td>
                        <td style={{padding:'11px 16px',color:'#64748b'}}>{u.streamerProfile?._count?.donations??0}</td>
                        <td style={{padding:'11px 16px',color:'#f87171',fontSize:12}}>{u.deletedAt?new Date(u.deletedAt).toLocaleDateString('en-IN'):''}</td>
                        <td style={{padding:'11px 16px'}}>
                          <button onClick={()=>restoreUser(u.id)} style={{...btn('#10b98122','#10b981'),padding:'5px 14px',fontSize:12}}>↩ Restore</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ DONATIONS ══════════════════════════════════════════════════════════ */}
        {tab==='donations' && (
          <div>
            <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Donations</h2>
              <StyledSelect value={donationFilter} onChange={e=>setDonationFilter(e.target.value)} style={{width:'auto',padding:'7px 32px 7px 10px'}}>
                <SelectOption value="">All</SelectOption>
                {['SUCCESS','PENDING','FAILED','REFUNDED'].map(s=><SelectOption key={s} value={s}>{s}</SelectOption>)}
              </StyledSelect>
              <input placeholder="Search donor…" value={donationSearch} onChange={e=>setDonationSearch(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') { const q=`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${encodeURIComponent(donationSearch)}`:''}${streamerSearch?`&streamer=${encodeURIComponent(streamerSearch)}`:''}`;api(q).then((d:any)=>setDonations(d.donations)) }}}
                style={{...inp,width:200}} />
              <input placeholder="Search streamer…" value={streamerSearch??''} onChange={e=>setStreamerSearch(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter') { const q=`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${encodeURIComponent(donationSearch)}`:''}${streamerSearch?`&streamer=${encodeURIComponent(streamerSearch)}`:''}`;api(q).then((d:any)=>setDonations(d.donations)) }}}
                style={{...inp,width:200}} />
              <button onClick={()=>{ const q=`/donations?limit=100${donationFilter?`&status=${donationFilter}`:''}${donationSearch?`&search=${encodeURIComponent(donationSearch)}`:''}${streamerSearch?`&streamer=${encodeURIComponent(streamerSearch)}`:''}`;api(q).then((d:any)=>setDonations(d.donations)) }} style={btn()}>Search</button>
            </div>
            <div style={{...card,overflow:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13,minWidth:800}}>
                <thead><tr style={{background:'#0f0f1a',color:'#666'}}>
                  {['Donor','Streamer','Amount','Message','Status','Settled','Date','Transaction ID',''].map(h=><th key={h} style={{padding:'11px 16px',fontWeight:600,textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}
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
                      <td style={{padding:'11px 16px',color:'#666',fontSize:12,whiteSpace:'nowrap'}}>{new Date(d.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}<br/><span style={{color:'#888',fontSize:11}}>{new Date(d.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}</span></td>
                      <td style={{padding:'11px 16px'}}>
                        {d.cfPaymentId ? (
                          <div>
                            <p style={{fontSize:10,color:'#475569',margin:'0 0 2px',letterSpacing:.3}}>Pay ID</p>
                            <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:'#a78bfa',background:'rgba(124,58,237,0.08)',padding:'2px 6px',borderRadius:4}}>{d.cfPaymentId}</span>
                          </div>
                        ) : (
                          <span style={{fontSize:11,color:'#334155',fontFamily:"'JetBrains Mono',monospace"}}>
                            {d.cfOrderId ? <span title={d.cfOrderId} style={{color:'#475569'}}>Order: {d.cfOrderId.slice(-8)}</span> : '—'}
                          </span>
                        )}
                      </td>
                      <td style={{padding:'11px 16px'}}>
                        <button onClick={()=>{setEditDonation(d);setDForm({amount:String(d.amount),donorName:d.donorName,message:d.message??'',status:d.status})}} style={{...ghostBtn,padding:'5px 12px',fontSize:12}}>✏ Edit</button>
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
              <StyledSelect value={settlementFilter} onChange={e=>{setSettlementFilter(e.target.value);setSettlements([])}} style={{width:'auto',padding:'7px 32px 7px 10px'}}>
                <SelectOption value="INITIATED">Pending payment</SelectOption>
                <SelectOption value="SUCCESS">Paid</SelectOption>
                <SelectOption value="FAILED">Failed</SelectOption>
                <SelectOption value="">All</SelectOption>
              </StyledSelect>
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
                        <p style={{margin:'0 0 3px',fontSize:13,fontFamily:"'JetBrains Mono',monospace"}}><span style={{color:'#888'}}>Acc: </span><strong>{b.accountNumber}</strong></p>
                        <p style={{margin:0,fontSize:13,fontFamily:"'JetBrains Mono',monospace"}}><span style={{color:'#888'}}>IFSC: </span><strong>{b.ifscCode}</strong></p>
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

        {/* ═══ REFERRAL PARTNERS ═══════════════════════════════════════════════════ */}
        {tab==='referrals' && (admin.isSuperAdmin||admin.permissions.referrals) && (
          <div style={{display:'flex',flexDirection:'column',gap:24}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16,flexWrap:'wrap'}}>
                <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Referral Partners ({referralPartners.length})</h2>
                <input placeholder="Search by name or email…" value={referralFilter} onChange={e=>setReferralFilter(e.target.value)} style={{...inp,width:260,flex:'0 0 auto'}} />
              </div>
              {referralPartners.filter((r:any)=>!referralFilter||[r.displayName,r.email].some((v:string)=>v?.toLowerCase().includes(referralFilter.toLowerCase()))).length===0 ? (
                <div style={{...card,padding:40,textAlign:'center',color:'#5c5e80'}}>No referral partners yet</div>
              ) : referralPartners.filter((r:any)=>!referralFilter||[r.displayName,r.email].some((v:string)=>v?.toLowerCase().includes(referralFilter.toLowerCase()))).map((r:any)=>(
                <div key={r.id} style={{...card,padding:'20px 24px',marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:12}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontWeight:700,fontSize:15}}>{r.displayName??r.email}</span>
                        <Badge v={r.isActive?'SUCCESS':'FAILED'} />
                        {r.isVerified && <Badge v="verified" />}
                        {!r.isVerified && r.verificationRequestedAt && <Badge v="PENDING" />}
                        {r.referralCode && <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:'#22d3ee',background:'rgba(34,211,238,0.1)',padding:'2px 8px',borderRadius:6}}>{r.referralCode}</span>}
                      </div>
                      <p style={{color:'#5c5e80',fontSize:12,margin:0}}>{r.email} · Joined {new Date(r.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
                      {[['REFERRED',String(r.referredCount),'#8b5cf6'],['PENDING',fmt(r.pendingBalance),'#fbbf24'],['LIFETIME EARNED',fmt(r.lifetimeEarned),'#34d399']].map(([l,v,c])=>(
                        <div key={l} style={{textAlign:'center'}}>
                          <p style={{color:'#5c5e80',fontSize:11,margin:'0 0 2px'}}>{l}</p>
                          <p style={{color:c,fontWeight:700,margin:0}}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  {r.bankDetails?.accountNumber ? (
                    <div style={{background:'#1a1a2b',borderRadius:8,padding:'10px 14px',fontSize:12,color:'#9a9cbe',display:'flex',gap:20,flexWrap:'wrap',marginBottom:12}}>
                      <span>🏦 <strong style={{color:'#f5f6fb'}}>{r.bankDetails.bankName??'—'}</strong></span>
                      <span>Acc: <strong style={{color:'#f5f6fb',fontFamily:"'JetBrains Mono',monospace"}}>{r.bankDetails.accountNumber}</strong></span>
                      <span>IFSC: <strong style={{color:'#f5f6fb',fontFamily:"'JetBrains Mono',monospace"}}>{r.bankDetails.ifscCode}</strong></span>
                      <span>Name: <strong style={{color:'#f5f6fb'}}>{r.bankDetails.accountHolderName}</strong></span>
                    </div>
                  ) : (
                    <div style={{background:'#f8717111',borderRadius:8,padding:'8px 14px',fontSize:12,color:'#f87171',marginBottom:12}}>⚠ No bank details</div>
                  )}
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <button onClick={()=>{setEditReferralBank(r);setRbForm(r.bankDetails??{})}} style={btn('#1a1a2b','#9a9cbe')}>🏦 Edit Bank</button>
                    {r.isVerified
                      ? <button onClick={()=>{}} style={{...btn('#34d39922','#34d399'),cursor:'default'}}>✓ Verified</button>
                      : r.verificationRequestedAt
                        ? <><button onClick={()=>approveReferralVerification(r.id)} style={btn('#34d39922','#34d399')}>✓ Approve</button><button onClick={()=>rejectReferralVerification(r.id)} style={dangerBtn}>✕ Reject</button></>
                        : <button onClick={()=>approveReferralVerification(r.id)} style={btn('#8b5cf622','#8b5cf6')}>◯ Verify</button>
                    }
                    <button onClick={()=>toggleReferralActive(r.id,!r.isActive)} style={btn(r.isActive?'#f8717122':'#34d39922',r.isActive?'#f87171':'#34d399')}>{r.isActive?'Deactivate':'Activate'}</button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h2 style={{margin:'0 0 16px',fontSize:18,fontWeight:700}}>Referral Payouts</h2>
              {referralSettlements.length===0 ? (
                <div style={{...card,padding:40,textAlign:'center',color:'#5c5e80'}}>No payout requests yet</div>
              ) : referralSettlements.map((s:any)=>(
                <div key={s.id} style={{...card,borderColor:s.status==='INITIATED'?'#fbbf2455':undefined,padding:'18px 22px',marginBottom:12}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontWeight:700}}>{s.referralPartner?.displayName??s.referralPartner?.user?.email}</span>
                        <Badge v={s.status}/>
                      </div>
                      <p style={{color:'#5c5e80',fontSize:12,margin:0}}>Requested {new Date(s.initiatedAt).toLocaleString('en-IN')}</p>
                      {s.referralPartner?.bankDetails?.accountNumber && (
                        <p style={{color:'#9a9cbe',fontSize:12,margin:'6px 0 0'}}>
                          {s.referralPartner.bankDetails.bankName} · <span style={{fontFamily:"'JetBrains Mono',monospace"}}>{s.referralPartner.bankDetails.accountNumber}</span> · IFSC {s.referralPartner.bankDetails.ifscCode}
                        </p>
                      )}
                    </div>
                    <p style={{fontSize:20,fontWeight:800,margin:0,color:'#fbbf24'}}>{fmt(Number(s.amount))}</p>
                  </div>
                  {s.status==='INITIATED' && (
                    <div style={{display:'flex',gap:10,marginTop:14,flexWrap:'wrap'}}>
                      <input placeholder="UTR / Transfer ref (optional)" value={referralTransferRef[s.id]??''} onChange={e=>setReferralTransferRef(p=>({...p,[s.id]:e.target.value}))} style={{...inp,flex:1,minWidth:220}} />
                      <button onClick={()=>markReferralSettlementPaid(s.id)} style={btn('#34d399')}>✓ Mark Paid</button>
                      <button onClick={()=>markReferralSettlementFailed(s.id)} style={dangerBtn}>Mark Failed</button>
                    </div>
                  )}
                  {s.status==='SUCCESS' && s.transferRef && (
                    <p style={{marginTop:10,fontSize:12,color:'#9a9cbe'}}>Ref: <code style={{color:'#34d399'}}>{s.transferRef}</code> · {s.settledAt?new Date(s.settledAt).toLocaleString('en-IN'):''}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SUPPORT US PAYMENTS ════════════════════════════════════════════════ */}
        {tab==='support' && (admin.isSuperAdmin||admin.permissions.support) && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <div>
                <h2 style={{ fontWeight:800, fontSize:17, color:'#f1f5f9', margin:0 }}>Support Us Transactions</h2>
                <p style={{ fontSize:12, color:'#475569', margin:'4px 0 0' }}>Donations received via the Support Us page</p>
              </div>
              <div style={{ fontSize:13, color:'#a78bfa', fontWeight:700 }}>
                Total: {fmt(supportPayments.filter(p=>p.status==='SUCCESS').reduce((s,p)=>s+p.amount,0))} ({supportPayments.filter(p=>p.status==='SUCCESS').length} payments)
              </div>
            </div>
            <div style={{ ...card, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #2d2d4e' }}>
                    {['Date','Name','Amount','Message','Status','Payment ID'].map(h=>(
                      <th key={h} style={{ padding:'12px 16px', textAlign:'left', color:'#475569', fontSize:11, fontWeight:700, letterSpacing:.5, textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {supportPayments.length===0 ? (
                    <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'#334155', fontSize:14 }}>No support payments yet</td></tr>
                  ) : supportPayments.map(p=>(
                    <tr key={p.id} style={{ borderBottom:'1px solid #1e1e35' }}>
                      <td style={{ padding:'12px 16px', color:'#94a3b8', whiteSpace:'nowrap' }}>{new Date(p.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</td>
                      <td style={{ padding:'12px 16px', color:'#e2e8f0', fontWeight:600 }}>{p.name||'Anonymous'}</td>
                      <td style={{ padding:'12px 16px', color:'#a78bfa', fontWeight:700 }}>{fmt(p.amount)}</td>
                      <td style={{ padding:'12px 16px', color:'#64748b', maxWidth:200 }}>{p.message||'—'}</td>
                      <td style={{ padding:'12px 16px' }}><Badge v={p.status}/></td>
                      <td style={{ padding:'12px 16px', color:'#334155', fontSize:11, fontFamily:"'JetBrains Mono',monospace" }}>{p.paymentId||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TICKETS (super admin only) ══════════════════════════════════════════ */}
        {tab==='tickets' && (admin.isSuperAdmin||admin.permissions.tickets) && (
          <div style={{display:'grid',gridTemplateColumns:'320px 1fr',gap:20,height:'calc(100vh - 180px)'}}>
            {/* Ticket list */}
            <div style={{...card,overflow:'hidden',display:'flex',flexDirection:'column'}}>
              <div style={{padding:'14px 16px',borderBottom:'1px solid #2d2d4e',flexShrink:0}}>
                <h3 style={{fontWeight:700,fontSize:14,color:'#f1f5f9',margin:0}}>Support Tickets</h3>
                <p style={{fontSize:11,color:'#475569',margin:'2px 0 0'}}>{tickets.filter(t=>t.status==='OPEN').length} open · {tickets.length} total</p>
              </div>
              <div style={{flex:1,overflowY:'auto'}}>
                {tickets.length===0 && <p style={{padding:24,textAlign:'center',color:'#475569',fontSize:13}}>No tickets yet</p>}
                {tickets.map((t:any)=>(
                  <div key={t.id} onClick={()=>{setActiveTicket(t);setTicketReply('')}}
                    style={{padding:'12px 16px',borderBottom:'1px solid #1e1e35',cursor:'pointer',
                      background:activeTicket?.id===t.id?'rgba(124,58,237,0.12)':'transparent'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:'#e2e8f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:180}}>{t.subject}</span>
                      <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:20,
                        background:t.status==='OPEN'?'#10b98120':'#6b728020',
                        color:t.status==='OPEN'?'#10b981':'#6b7280'}}>{t.status}</span>
                    </div>
                    <p style={{fontSize:11,color:'#475569',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {t.streamer?.channelName||t.streamer?.username||'Unknown'} · {t.messages?.length||0} msgs
                    </p>
                  </div>
                ))}
              </div>
            </div>
            {/* Thread */}
            <div style={{...card,display:'flex',flexDirection:'column',overflow:'hidden'}}>
              {!activeTicket ? (
                <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:8}}>
                  <p style={{fontSize:28}}>🎫</p>
                  <p style={{fontSize:14,color:'#475569'}}>Select a ticket to view</p>
                </div>
              ) : (
                <>
                  {/* Thread header */}
                  <div style={{padding:'14px 18px',borderBottom:'1px solid #2d2d4e',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <p style={{fontSize:14,fontWeight:700,color:'#f1f5f9',margin:0}}>{activeTicket.subject}</p>
                      <p style={{fontSize:11,color:'#475569',margin:'3px 0 0'}}>
                        {activeTicket.streamer?.channelName||activeTicket.streamer?.username} · {activeTicket.streamer?.user?.email}
                      </p>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      {activeTicket.status==='OPEN' ? (
                        <button onClick={async()=>{
                          await api(`/tickets/${activeTicket.id}/close`,{method:'PATCH'})
                          setActiveTicket((p:any)=>({...p,status:'CLOSED'}))
                          setTickets((prev:any[])=>prev.map((t:any)=>t.id===activeTicket.id?{...t,status:'CLOSED'}:t))
                          showToast('Ticket closed')
                        }} style={{...btn('danger'),padding:'7px 14px',fontSize:12}}>Close</button>
                      ) : (
                        <button onClick={async()=>{
                          await api(`/tickets/${activeTicket.id}/reopen`,{method:'PATCH'})
                          setActiveTicket((p:any)=>({...p,status:'OPEN'}))
                          setTickets((prev:any[])=>prev.map((t:any)=>t.id===activeTicket.id?{...t,status:'OPEN'}:t))
                          showToast('Ticket reopened')
                        }} style={{...btn(),padding:'7px 14px',fontSize:12}}>Reopen</button>
                      )}
                    </div>
                  </div>
                  {/* Messages */}
                  <div style={{flex:1,overflowY:'auto',padding:'12px 18px',display:'flex',flexDirection:'column',gap:10}}>
                    {(activeTicket.messages||[]).map((m:any)=>(
                      <div key={m.id} style={{display:'flex',flexDirection:'column',alignItems:m.fromAdmin?'flex-start':'flex-end'}}>
                        {m.fromAdmin && <span style={{fontSize:10,color:'#475569',marginBottom:2,marginLeft:4}}>{m.adminName||'Admin'}</span>}
                        <div style={{maxWidth:'80%',padding:'9px 14px',borderRadius:m.fromAdmin?'4px 14px 14px 14px':'14px 4px 14px 14px',
                          background:m.fromAdmin?'rgba(255,255,255,0.04)':'rgba(124,58,237,0.25)',
                          border:m.fromAdmin?'1px solid #2d2d4e':'1px solid rgba(124,58,237,0.3)',
                          color:'#e2e8f0',fontSize:13,lineHeight:1.5}}>
                        {m.body.split('\n').map((line:string,li:number)=>
                          line.startsWith('data:image')
                            ? <img key={li} src={line} alt="attachment" style={{maxWidth:'100%',borderRadius:8,marginTop:4,display:'block'}} />
                            : line ? <span key={li} style={{display:'block'}}>{line}</span> : null
                        )}
                      </div>
                        <span style={{fontSize:10,color:'#334155',marginTop:2,marginLeft:4,marginRight:4}}>
                          {m.fromAdmin?'':'Streamer · '}{new Date(m.createdAt).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* Reply box */}
                  {activeTicket.status==='OPEN' && (
                    <div style={{padding:'12px 18px',borderTop:'1px solid #2d2d4e',display:'flex',gap:10,flexShrink:0}}>
                      {ticketImage && (
                        <div style={{padding:'6px 0',position:'relative',display:'inline-block',marginRight:8}}>
                          <img src={ticketImage} alt="preview" style={{maxHeight:72,maxWidth:160,borderRadius:8,display:'block'}}/>
                          <button onClick={()=>setTicketImage('')} style={{position:'absolute',top:2,right:2,background:'rgba(0,0,0,0.7)',border:'none',borderRadius:'50%',width:18,height:18,color:'#fff',cursor:'pointer',fontSize:11,display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                        </div>
                      )}
                      <div style={{display:'flex',gap:8,flex:1}}>
                      <button onClick={()=>{const i=document.createElement('input');i.type='file';i.accept='image/*';i.onchange=(e:any)=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=(ev:any)=>setTicketImage(ev.target.result);r.readAsDataURL(f)};i.click()}} style={{...inp,width:40,padding:'8px',background:'rgba(255,255,255,0.04)',cursor:'pointer',flexShrink:0,textAlign:'center'}} title="Attach image">📎</button>
                      <input value={ticketReply} onChange={e=>setTicketReply(e.target.value)}
                        onKeyDown={async e=>{
                          if (e.key!=='Enter'||e.shiftKey||!ticketReply.trim()) return
                          setTicketSending(true)
                          try {
                            const msg = await api(`/tickets/${activeTicket.id}/reply`,{method:'POST',body:JSON.stringify({body:ticketImage?(ticketReply.trim()?ticketReply.trim()+'\n'+ticketImage:ticketImage):ticketReply.trim()})})
                            setActiveTicket((p:any)=>({...p,messages:[...(p.messages||[]),msg]}))
                            setTickets((prev:any[])=>prev.map((t:any)=>t.id===activeTicket.id?{...t,messages:[...(t.messages||[]),msg]}:t))
                            setTicketReply('');setTicketImage('')
                          } catch(e:any){showToast(e.message)} finally{setTicketSending(false)}
                        }}
                        placeholder="Reply to streamer… (Enter to send)"
                        style={{...inp,flex:1,background:'rgba(255,255,255,0.04)'}} />
                      <button disabled={ticketSending||!ticketReply.trim()} onClick={async()=>{
                        if (!ticketReply.trim()) return
                        setTicketSending(true)
                        try {
                          const msg = await api(`/tickets/${activeTicket.id}/reply`,{method:'POST',body:JSON.stringify({body:ticketImage?(ticketReply.trim()?ticketReply.trim()+'\n'+ticketImage:ticketImage):ticketReply.trim()})})
                          setActiveTicket((p:any)=>({...p,messages:[...(p.messages||[]),msg]}))
                          setTickets((prev:any[])=>prev.map((t:any)=>t.id===activeTicket.id?{...t,messages:[...(t.messages||[]),msg]}:t))
                          setTicketReply('');setTicketImage('')
                        } catch(e:any){showToast(e.message)} finally{setTicketSending(false)}
                      }} style={{...btn(),flexShrink:0,opacity:ticketSending||(!ticketReply.trim()&&!ticketImage)?0.5:1}}>
                        {ticketSending?'…':'Send'}
                      </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ═══ LOGS (super admin only) ════════════════════════════════════════════ */}
        {tab==='logs' && admin.isSuperAdmin && (
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <h2 style={{margin:0,fontSize:18,fontWeight:700}}>Admin Activity Logs</h2>
              <button onClick={()=>api('/logs').then(setLogs).catch(()=>{})} style={{background:'#7c3aed',color:'white',border:'none',borderRadius:8,padding:'7px 16px',fontWeight:600,cursor:'pointer',fontSize:13}}>Refresh</button>
            </div>
            <div style={{overflowX:'auto',borderRadius:12,border:'1px solid #2d2d4e'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead>
                  <tr style={{background:'#0f0f1a',color:'#64748b'}}>
                    {['Time','Admin','Action','Entity','Detail','IP'].map(h=><th key={h} style={{padding:'11px 14px',fontWeight:600,textAlign:'left',whiteSpace:'nowrap'}}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {logs.length===0 && (
                    <tr><td colSpan={6} style={{padding:32,textAlign:'center',color:'#475569'}}>No logs yet — actions will appear here</td></tr>
                  )}
                  {logs.map((l,i)=>(
                    <tr key={l.id} style={{borderTop:'1px solid #2d2d4e',background:i%2?'#ffffff04':'transparent'}}>
                      <td style={{padding:'10px 14px',color:'#64748b',fontSize:11,whiteSpace:'nowrap'}}>{new Date(l.createdAt).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'})}</td>
                      <td style={{padding:'10px 14px'}}>
                        <div style={{fontWeight:600,fontSize:12}}>{l.adminName||l.adminEmail}</div>
                        <div style={{color:'#64748b',fontSize:11}}>{l.adminEmail}</div>
                      </td>
                      <td style={{padding:'10px 14px'}}>
                        <span style={{background:'rgba(124,58,237,0.12)',color:'#a78bfa',borderRadius:6,padding:'3px 8px',fontSize:11,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{l.action}</span>
                      </td>
                      <td style={{padding:'10px 14px',color:'#94a3b8',fontSize:12}}>{l.entity??'—'}{l.entityId?<span style={{color:'#475569',fontSize:10,display:'block',fontFamily:"'JetBrains Mono',monospace"}}>{l.entityId.slice(0,12)}…</span>:null}</td>
                      <td style={{padding:'10px 14px',color:'#64748b',fontSize:11,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.detail&&l.detail!=='null'?l.detail.slice(0,80):'—'}</td>
                      <td style={{padding:'10px 14px',color:'#475569',fontSize:11,fontFamily:"'JetBrains Mono',monospace"}}>{l.ip||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ═══ TEAM (super admin only) ════════════════════════════════════════════ */}
        {tab==='team' && admin.isSuperAdmin && (
          <div style={{display:'flex',flexDirection:'column',gap:24}}>

            {/* ── Platform Webhooks ── */}
            <div style={{...card,padding:'22px 24px'}}>
              <h2 style={{margin:'0 0 6px',fontSize:17,fontWeight:700}}>🔔 Platform Webhooks</h2>
              <p style={{margin:'0 0 20px',fontSize:13,color:'#64748b'}}>Discord notifications sent automatically by the platform (not per-streamer)</p>

              {/* Tickets webhook */}
              <div style={{marginBottom:16,padding:'16px',background:'rgba(124,58,237,0.06)',border:'1px solid rgba(124,58,237,0.15)',borderRadius:10}}>
                <p style={{margin:'0 0 4px',fontSize:13,fontWeight:700,color:'#e2e8f0'}}>🎫 New Support Ticket Alert</p>
                <p style={{margin:'0 0 12px',fontSize:12,color:'#64748b'}}>Sends a Discord message every time a streamer opens a support ticket</p>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <input
                    value={platformConfig['tickets_discord_webhook']??''}
                    onChange={e=>setPlatformConfig(p=>({...p,tickets_discord_webhook:e.target.value}))}
                    placeholder="https://discord.com/api/webhooks/…"
                    style={{...inp,flex:1}}
                  />
                  <button
                    onClick={async()=>{
                      await api('/config',{method:'PATCH',body:JSON.stringify({tickets_discord_webhook:platformConfig['tickets_discord_webhook']??''})})
                      showToast('Webhook saved!')
                    }}
                    style={btn()}>Save</button>
                </div>
                <div style={{display:'flex',gap:8,alignItems:'center'}}>
                  <button
                    disabled={testingWebhook||!platformConfig['tickets_discord_webhook']}
                    onClick={async()=>{
                      setTestingWebhook(true)
                      try {
                        await api('/config/test-webhook',{method:'POST',body:JSON.stringify({url:platformConfig['tickets_discord_webhook'],type:'tickets'})})
                        showToast('Test message sent to Discord!')
                      } catch(e:any){ showToast('Failed: '+e.message) }
                      finally{ setTestingWebhook(false) }
                    }}
                    style={{...btn('#5865f2'),opacity:(!platformConfig['tickets_discord_webhook']||testingWebhook)?.5:1}}>
                    {testingWebhook?'Sending…':'🧪 Send Test'}
                  </button>
                  <span style={{fontSize:12,color:'#475569'}}>Channel Settings → Integrations → Webhooks → New Webhook → Copy URL</span>
                </div>
              </div>

              {/* Settlement webhook */}
              <div style={{marginBottom:12,padding:'16px',background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:10}}>
                <p style={{margin:'0 0 4px',fontSize:13,fontWeight:700,color:'#e2e8f0'}}>💸 Settlement Request Alert</p>
                <p style={{margin:'0 0 12px',fontSize:12,color:'#64748b'}}>Sends a Discord message every time a streamer requests a payout settlement</p>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <input
                    value={platformConfig['settlement_discord_webhook']??''}
                    onChange={e=>setPlatformConfig(p=>({...p,settlement_discord_webhook:e.target.value}))}
                    placeholder="https://discord.com/api/webhooks/…"
                    style={{...inp,flex:1}}
                  />
                  <button
                    onClick={async()=>{
                      await api('/config',{method:'PATCH',body:JSON.stringify({settlement_discord_webhook:platformConfig['settlement_discord_webhook']??''})})
                      showToast('Webhook saved!')
                    }}
                    style={btn()}>Save</button>
                </div>
                <button
                  disabled={testingWebhook||!platformConfig['settlement_discord_webhook']}
                  onClick={async()=>{
                    setTestingWebhook(true)
                    try {
                      await api('/config/test-webhook',{method:'POST',body:JSON.stringify({url:platformConfig['settlement_discord_webhook'],type:'settlement'})})
                      showToast('Test message sent to Discord!')
                    } catch(e:any){ showToast('Failed: '+e.message) }
                    finally{ setTestingWebhook(false) }
                  }}
                  style={{...btn('#5865f2'),opacity:(!platformConfig['settlement_discord_webhook']||testingWebhook)?.5:1}}>
                  {testingWebhook?'Sending…':'🧪 Send Test'}
                </button>
              </div>

              {/* Verification webhook */}
              <div style={{marginBottom:0,padding:'16px',background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:10}}>
                <p style={{margin:'0 0 4px',fontSize:13,fontWeight:700,color:'#e2e8f0'}}>✅ Verification Request Alert</p>
                <p style={{margin:'0 0 12px',fontSize:12,color:'#64748b'}}>Sends a Discord message every time a streamer submits a verification request</p>
                <div style={{display:'flex',gap:8,marginBottom:10}}>
                  <input
                    value={platformConfig['verification_discord_webhook']??''}
                    onChange={e=>setPlatformConfig(p=>({...p,verification_discord_webhook:e.target.value}))}
                    placeholder="https://discord.com/api/webhooks/…"
                    style={{...inp,flex:1}}
                  />
                  <button
                    onClick={async()=>{
                      await api('/config',{method:'PATCH',body:JSON.stringify({verification_discord_webhook:platformConfig['verification_discord_webhook']??''})})
                      showToast('Webhook saved!')
                    }}
                    style={btn()}>Save</button>
                </div>
                <button
                  disabled={testingWebhook||!platformConfig['verification_discord_webhook']}
                  onClick={async()=>{
                    setTestingWebhook(true)
                    try {
                      await api('/config/test-webhook',{method:'POST',body:JSON.stringify({url:platformConfig['verification_discord_webhook'],type:'verification'})})
                      showToast('Test message sent to Discord!')
                    } catch(e:any){ showToast('Failed: '+e.message) }
                    finally{ setTestingWebhook(false) }
                  }}
                  style={{...btn('#5865f2'),opacity:(!platformConfig['verification_discord_webhook']||testingWebhook)?.5:1}}>
                  {testingWebhook?'Sending…':'🧪 Send Test'}
                </button>
              </div>
            </div>

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
                <StyledSelect value={newAdminRoleId} onChange={e=>setNewAdminRoleId(e.target.value)} style={{marginBottom:14}}>
                  <SelectOption value="">No role (no access)</SelectOption>
                  {roles.map(r=><SelectOption key={r.id} value={r.id}>{r.name}</SelectOption>)}
                </StyledSelect>
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
                    <StyledSelect value={a.role?.id??''} onChange={e=>changeAdminRole(a.id,e.target.value||null)} style={{padding:'6px 28px 6px 10px',fontSize:12}}>
                      <SelectOption value="">No role (no access)</SelectOption>
                      {roles.map(r=><SelectOption key={r.id} value={r.id}>{r.name}</SelectOption>)}
                    </StyledSelect>
                  )}
                </div>
              ))}
            </div>
          </div>
          </div>
        )}
        </main>
      </div>

      {/* Modals */}
      {editStreamer && (
        <Modal title={`Edit — ${editStreamer.channelName??editStreamer.username}`} onClose={()=>setEditStreamer(null)}>
          <Field label="Channel Name" value={sForm.channelName as string??''} onChange={v=>setSForm(p=>({...p,channelName:v}))} />
          <Field label="Username (slug)" value={sForm.username as string??''} onChange={v=>setSForm(p=>({...p,username:v}))} />
          <Field label="Channel Link" value={sForm.channelLink as string??''} onChange={v=>setSForm(p=>({...p,channelLink:v}))} />
          <Field label="Min Donation (₹)" value={String(sForm.minDonationAmount??11)} onChange={v=>setSForm(p=>({...p,minDonationAmount:parseInt(v)||11}))} type="number" />
          <div>
            <label style={{fontSize:11,color:'#64748b',fontWeight:600,letterSpacing:.5,display:'block',marginBottom:4}}>PLATFORM FEE %</label>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="number" min={0} max={50} step={0.5} value={sForm.platformFeePct??7} onChange={e=>setSForm(p=>({...p,platformFeePct:parseFloat(e.target.value)||7}))} style={{...inp,width:100}} />
              <span style={{fontSize:12,color:'#64748b'}}>% (default 7% · max 50%)</span>
            </div>
            <p style={{fontSize:11,color:'#475569',marginTop:4}}>Applies to all future donations from this streamer</p>
          </div>
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
          <Field label="UPI ID (optional)" value={bForm.upiId as string??''} onChange={v=>setBForm(p=>({...p,upiId:v}))} />
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
      {editReferralBank && (
        <Modal title={`Bank — ${editReferralBank.displayName??editReferralBank.email}`} onClose={()=>setEditReferralBank(null)}>
          <Field label="Account Holder Name" value={rbForm.accountHolderName ?? ''} onChange={v=>setRbForm((p:any)=>({...p,accountHolderName:v}))} />
          <Field label="Account Number" value={rbForm.accountNumber ?? ''} onChange={v=>setRbForm((p:any)=>({...p,accountNumber:v}))} />
          <Field label="IFSC Code" value={rbForm.ifscCode ?? ''} onChange={v=>setRbForm((p:any)=>({...p,ifscCode:v}))} />
          <Field label="Bank Name" value={rbForm.bankName ?? ''} onChange={v=>setRbForm((p:any)=>({...p,bankName:v}))} />
          <Field label="UPI ID (optional)" value={rbForm.upiId ?? ''} onChange={v=>setRbForm((p:any)=>({...p,upiId:v}))} />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setEditReferralBank(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveReferralBank} style={btn()}>Save Bank</button>
          </div>
        </Modal>
      )}
      {adjustTarget && (
        <Modal title={`Adjust Balance — ${adjustTarget.channelName??adjustTarget.username}`} onClose={()=>setAdjustTarget(null)}>
          <p style={{fontSize:12,color:'#888',marginBottom:16,lineHeight:1.5}}>
            Adds a signed correction entry to this creator&apos;s ledger — positive credits their balance, negative debits it.
            Current pending balance: <strong style={{color:'#f59e0b'}}>{fmt(adjustTarget.pendingBalance)}</strong>.
          </p>
          <Field label="Amount (₹) — negative to debit" value={adjustForm.amount} type="number" onChange={v=>setAdjustForm(p=>({...p,amount:v}))} />
          <Field label="Reason (required, kept in the audit log)" value={adjustForm.reason} onChange={v=>setAdjustForm(p=>({...p,reason:v}))} />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setAdjustTarget(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveAdjustment} disabled={adjustSaving} style={btn('#f59e0b','#1a1206')}>{adjustSaving?'Saving…':'Apply Adjustment'}</button>
          </div>
        </Modal>
      )}
      {goalTarget && (
        <Modal title={`Goal — ${goalTarget.channelName??goalTarget.username}`} onClose={()=>setGoalTarget(null)}>
          {goalLoading ? <p style={{color:'#888',fontSize:13}}>Loading…</p> : (
            <>
              <Field label="Goal Title" value={goalForm.title} onChange={v=>setGoalForm(p=>({...p,title:v}))} />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <Field label="Target Amount (₹)" type="number" value={String(goalForm.targetAmount)} onChange={v=>setGoalForm(p=>({...p,targetAmount:Number(v)||0}))} />
                <Field label="Current Amount (₹)" type="number" value={String(goalForm.currentAmount)} onChange={v=>setGoalForm(p=>({...p,currentAmount:Number(v)||0}))} />
              </div>
              <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#ccc',marginBottom:16,cursor:'pointer'}}>
                <input type="checkbox" checked={goalForm.isActive} onChange={e=>setGoalForm(p=>({...p,isActive:e.target.checked}))} style={{accentColor:'#06b6d4',width:16,height:16}}/>
                Show on Overlay (donations only update the goal while this is on)
              </label>
              <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
                <button onClick={()=>setGoalTarget(null)} style={ghostBtn}>Cancel</button>
                <button onClick={saveGoal} disabled={goalSaving} style={btn('#06b6d4','#04222a')}>{goalSaving?'Saving…':'Save Goal'}</button>
              </div>
            </>
          )}
        </Modal>
      )}
      {editDonation && (
        <Modal title={`Donation — ${editDonation.donorName}`} onClose={()=>setEditDonation(null)}>
          {editDonation.settled && (
            <div style={{background:'#f59e0b11',border:'1px solid rgba(245,158,11,0.3)',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#f59e0b',marginBottom:14}}>
              ⚠ Already settled — amount is locked to protect historical settlement/invoice totals. Use Adjust Balance on the streamer instead for corrections.
            </div>
          )}
          <Field label="Donor Name" value={dForm.donorName} onChange={v=>setDForm(p=>({...p,donorName:v}))} />
          <Field label="Amount (₹)" type="number" value={dForm.amount} onChange={v=>setDForm(p=>({...p,amount:v}))} readOnly={editDonation.settled} />
          <Field label="Message" value={dForm.message} onChange={v=>setDForm(p=>({...p,message:v}))} />
          <div style={{marginBottom:16}}>
            <label style={{display:'block',color:'#888',fontSize:12,marginBottom:4}}>Status</label>
            <StyledSelect value={dForm.status} onChange={e=>setDForm(p=>({...p,status:e.target.value}))}>
              {['PENDING','SUCCESS','FAILED','REFUNDED'].map(s=><SelectOption key={s} value={s}>{s}</SelectOption>)}
            </StyledSelect>
          </div>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setEditDonation(null)} style={ghostBtn}>Cancel</button>
            <button onClick={saveDonation} disabled={dSaving} style={btn()}>{dSaving?'Saving…':'Save'}</button>
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
        <Modal title="Deactivate Account" onClose={()=>setConfirmDelete(null)}>
          <p style={{color:'#f87171',margin:'0 0 8px'}}>Deactivate <strong>{confirmDelete.label}</strong>?</p>
          <p style={{color:'#64748b',fontSize:13,margin:'0 0 20px'}}>Their data (donations, settlements) is preserved. Super admin can restore the account from the Deleted tab.</p>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setConfirmDelete(null)} style={ghostBtn}>Cancel</button>
            <button onClick={deleteUser} style={btn('#ef4444')}>Deactivate</button>
          </div>
        </Modal>
      )}
      {hardDeleteTarget && (
        <Modal title={`Permanently Delete — ${hardDeleteTarget.channelName??hardDeleteTarget.username}`} onClose={()=>setHardDeleteTarget(null)}>
          <div style={{background:'#7f1d1d22',border:'1px solid #ef444455',borderRadius:10,padding:'12px 14px',marginBottom:16}}>
            <p style={{color:'#fca5a5',fontWeight:700,fontSize:13,margin:'0 0 6px'}}>⚠ This cannot be undone</p>
            <p style={{color:'#f5f6fb',fontSize:12.5,margin:0,lineHeight:1.5}}>
              Permanently erases this creator&apos;s profile, bank details, goal, alert/voice settings, followers, and tickets.
              This is only possible when they have <strong>no donations or settlements</strong> on record (those must be retained
              for financial and tax purposes) — if they do, this will fail and you should Deactivate instead.
            </p>
          </div>
          <p style={{fontSize:13,color:'#9a9cbe',marginBottom:8}}>
            Type <strong style={{color:'#f5f6fb',fontFamily:"'JetBrains Mono',monospace"}}>{hardDeleteTarget.channelName??hardDeleteTarget.username}</strong> to confirm:
          </p>
          <input value={hardDeleteConfirmText} onChange={e=>setHardDeleteConfirmText(e.target.value)} style={{...inp,marginBottom:16}} placeholder="Type the channel name…" />
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button onClick={()=>setHardDeleteTarget(null)} style={ghostBtn}>Cancel</button>
            <button
              onClick={hardDeleteStreamer}
              disabled={hardDeleting || hardDeleteConfirmText !== (hardDeleteTarget.channelName??hardDeleteTarget.username)}
              style={btn('#ef4444')}
            >{hardDeleting?'Deleting…':'Permanently Delete'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
