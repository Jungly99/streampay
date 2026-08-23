'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../../lib/api'

interface TicketMessage { id: string; body: string; fromAdmin: boolean; adminName: string | null; createdAt: string }
interface Ticket { id: string; subject: string; status: string; createdAt: string; messages: TicketMessage[] }

type View = 'list' | 'thread' | 'new'

function isImageBody(body: string) { return body.startsWith('data:image') }

export default function SupportWidget() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>('list')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [active, setActive] = useState<Ticket | null>(null)
  const [loading, setLoading] = useState(false)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [reply, setReply] = useState('')
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (open) loadTickets()
  }, [open])

  // Poll for new messages every 5s while thread is open
  useEffect(() => {
    if (view === 'thread' && active && active.status === 'OPEN') {
      pollRef.current = setInterval(async () => {
        try {
          const updated = await api.get<Ticket[]>('/api/support/tickets')
          const fresh = updated.find(t => t.id === active.id)
          if (fresh && fresh.messages.length !== active.messages.length) {
            setActive(fresh)
            setTickets(updated)
          }
        } catch {}
      }, 5000)
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [view, active?.id, active?.messages.length, active?.status])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [active?.messages.length])

  async function loadTickets() {
    setLoading(true)
    try { setTickets(await api.get<Ticket[]>('/api/support/tickets')) } catch {}
    finally { setLoading(false) }
  }

  function openTicket(t: Ticket) { setActive(t); setView('thread') }

  async function createTicket() {
    if (!subject.trim() || (!body.trim() && !pendingImage)) return
    setSending(true)
    try {
      const msgBody = pendingImage ? (body.trim() ? `${body.trim()}\n${pendingImage}` : pendingImage) : body.trim()
      const t = await api.post<Ticket>('/api/support/tickets', { subject, body: msgBody })
      setTickets(prev => [t, ...prev])
      setSubject(''); setBody(''); setPendingImage(null)
      setActive(t); setView('thread')
    } catch (e: any) { alert(e.message) }
    finally { setSending(false) }
  }

  async function sendReply() {
    if ((!reply.trim() && !pendingImage) || !active) return
    setSending(true)
    try {
      const msgBody = pendingImage ? (reply.trim() ? `${reply.trim()}\n${pendingImage}` : pendingImage) : reply.trim()
      const msg = await api.post<TicketMessage>(`/api/support/tickets/${active.id}/messages`, { body: msgBody })
      setActive(prev => prev ? { ...prev, messages: [...prev.messages, msg] } : prev)
      setReply(''); setPendingImage(null)
    } catch (e: any) { alert(e.message) }
    finally { setSending(false) }
  }

  const handleImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = e => setPendingImage(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const unread = tickets.filter(t => t.status === 'OPEN' && t.messages.at(-1)?.fromAdmin).length

  const renderBody = (body: string) => {
    const lines = body.split('\n')
    return lines.map((line, i) =>
      isImageBody(line)
        ? <img key={i} src={line} alt="attachment" style={{ maxWidth: '100%', borderRadius: 8, marginTop: 4, display: 'block' }} />
        : <span key={i} style={{ display: line ? 'block' : 'none' }}>{line}</span>
    )
  }

  return (
    <>
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = '' }} />

      {/* Backdrop — closes widget when clicking outside */}
      {open && <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 1099, background: 'rgba(0,0,0,0.45)' }} />}

      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1101,
        width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg,#7c3aed,#db2777)',
        boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color: 'white', transition: 'transform 0.2s',
        transform: open ? 'rotate(45deg)' : 'none',
      }} title="Support">
        {open ? '✕' : '💬'}
        {!open && unread > 0 && (
          <span style={{ position: 'absolute', top: 0, right: 0, width: 18, height: 18, borderRadius: '50%', background: '#ef4444', fontSize: 10, fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)' }}>{unread}</span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div style={{ position: 'fixed', bottom: 88, right: 24, zIndex: 1100, width: 360, maxHeight: 540, borderRadius: 18, background: 'var(--dropdown-bg)', border: '1px solid var(--border-2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg,#7c3aed,#db2777)', flexShrink: 0 }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>
                {view === 'new' ? 'New Ticket' : view === 'thread' && active ? active.subject : 'Support'}
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 }}>eztips support team</p>
            </div>
            {view !== 'list' && (
              <button onClick={() => { setView('list'); setActive(null); setPendingImage(null) }}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>
                ← Back
              </button>
            )}
          </div>

          {/* LIST VIEW */}
          {view === 'list' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                <button onClick={() => setView('new')} style={{ width: '100%', padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 700, fontSize: 13 }}>
                  + New Support Ticket
                </button>
              </div>
              {loading && <p style={{ padding: 16, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>Loading…</p>}
              {!loading && tickets.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 28 }}>💬</p>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>No tickets yet</p>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>Open a ticket to talk with our team</p>
                </div>
              )}
              {tickets.map(t => {
                const last = t.messages.at(-1)
                const hasAdminReply = last?.fromAdmin
                return (
                  <div key={t.id} onClick={() => openTicket(t)} style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: hasAdminReply ? 'rgba(124,58,237,0.04)' : 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{t.subject}</p>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: t.status === 'OPEN' ? '#10b98120' : '#6b728020', color: t.status === 'OPEN' ? '#10b981' : '#6b7280' }}>{t.status}</span>
                    </div>
                    {last && <p style={{ fontSize: 11, color: hasAdminReply ? '#7c3aed' : 'var(--text-3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {hasAdminReply ? `Admin: ${isImageBody(last.body) ? '📷 Image' : last.body}` : (isImageBody(last.body) ? '📷 Image' : last.body)}
                    </p>}
                  </div>
                )
              })}
            </div>
          )}

          {/* NEW TICKET VIEW */}
          {view === 'new' && (
            <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>Subject</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Brief summary of your issue"
                  style={{ width: '100%', padding: '8px 11px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-2)', color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 5 }}>Message</label>
                <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Describe your issue…" rows={4}
                  style={{ width: '100%', padding: '8px 11px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-2)', color: 'var(--text-1)', outline: 'none', resize: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              {pendingImage && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={pendingImage} alt="preview" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, display: 'block' }} />
                  <button onClick={() => setPendingImage(null)} style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 22, height: 22, color: '#fff', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => fileRef.current?.click()} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.07)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 16 }} title="Attach image">📎</button>
                <button onClick={createTicket} disabled={sending || !subject.trim() || (!body.trim() && !pendingImage)} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: sending ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', opacity: sending ? 0.7 : 1 }}>
                  {sending ? 'Submitting…' : 'Submit Ticket'}
                </button>
              </div>
            </div>
          )}

          {/* THREAD VIEW */}
          {view === 'thread' && active && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {active.messages.map(m => (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.fromAdmin ? 'flex-start' : 'flex-end' }}>
                    {m.fromAdmin && <span style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2, marginLeft: 4 }}>{m.adminName ?? 'Support'}</span>}
                    {(() => {
                      const isPureImage = m.body.split('\n').every(l => !l.trim() || isImageBody(l))
                      if (isPureImage) return <img src={m.body.trim()} alt="attachment" style={{ maxWidth: '80%', maxHeight: 220, borderRadius: 12, display: 'block', border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} />
                      return <div style={{ maxWidth: '82%', padding: '8px 12px', borderRadius: m.fromAdmin ? '4px 14px 14px 14px' : '14px 4px 14px 14px', background: m.fromAdmin ? 'var(--surface)' : 'linear-gradient(135deg,#7c3aed,#db2777)', border: m.fromAdmin ? '1px solid var(--border)' : 'none', color: m.fromAdmin ? 'var(--text-1)' : '#fff', fontSize: 13, lineHeight: 1.5 }}>{renderBody(m.body)}</div>
                    })()}
                    <span style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, marginLeft: 4, marginRight: 4 }}>
                      {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
                {active.status === 'CLOSED' && <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', padding: '8px 0' }}>🔒 This ticket is closed</p>}
                <div ref={bottomRef} />
              </div>
              {active.status === 'OPEN' && (
                <>
                  {pendingImage && (
                    <div style={{ padding: '6px 12px 0', position: 'relative', display: 'inline-block', marginLeft: 12 }}>
                      <img src={pendingImage} alt="preview" style={{ maxHeight: 80, maxWidth: 200, borderRadius: 8, display: 'block' }} />
                      <button onClick={() => setPendingImage(null)} style={{ position: 'absolute', top: 10, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    </div>
                  )}
                  <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                    <button onClick={() => fileRef.current?.click()} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'rgba(255,255,255,0.07)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 15, flexShrink: 0 }} title="Attach image">📎</button>
                    <input value={reply} onChange={e => setReply(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                      placeholder="Type a message…"
                      style={{ flex: 1, padding: '8px 11px', borderRadius: 9, fontSize: 13, background: 'rgba(255,255,255,0.07)', border: '1px solid var(--border-2)', color: 'var(--text-1)', outline: 'none' }} />
                    <button onClick={sendReply} disabled={sending || (!reply.trim() && !pendingImage)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', fontWeight: 700, fontSize: 13, opacity: sending || (!reply.trim() && !pendingImage) ? 0.6 : 1 }}>↑</button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  )
}
