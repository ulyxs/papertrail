import './App.css'
import './login.css'

import { useEffect, useRef, useState } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────

const c = {
  bg: '#cfe3f1',
  surface: '#edf4fa',
  white: '#ffffff',
  border: '#8fb6d8',
  borderLight: '#edf4fa',
  text: '#243a5e',
  muted: '#5f86a6',
  faint: '#8fb6d8',
  link: '#5f86a6',
  badge: '#5f86a6',
  overdue: '#8b1a1a',
  flagged: '#c94f4f',
  review: '#5f86a6',
  amber: '#b87518',
  greenBar: '#2a7a3a',
  redBar: '#8b1a1a',
  onDark: '#ffffff',
  chrome: '#243a5e',
  chromeText: '#edf4fa',
  primary: '#edf4fa',
  primaryText: '#243a5e',
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function PageHeader({ title, sub }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400, color: c.text, margin: 0, lineHeight: 1.2 }}>
        {title}
      </h1>
      {sub && <p style={{ color: c.muted, marginTop: 8, lineHeight: 1.5, maxWidth: 560, fontSize: 13 }}>{sub}</p>}
    </div>
  )
}

function Panel({ children, style }) {
  return (
    <div style={{
      background: c.white,
      border: `1px solid ${c.border}`,
      borderRadius: 6,
      marginBottom: 20,
      ...style,
    }}>
      {children}
    </div>
  )
}

function PanelHeader({ title, right }) {
  return (
    <div className="panel-header" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: `1px solid ${c.border}`,
    }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400, color: c.text }}>{title}</span>
      {right && <span style={{ fontSize: 12, color: c.muted }}>{right}</span>}
    </div>
  )
}

function StatusDot({ status }) {
  const styles = {
    'Awaiting receipt': { background: c.review, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
    'For review': { background: c.review, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
    'Flagged': { background: 'transparent', border: `1.5px solid ${c.flagged}`, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
    'Receipt overdue': { background: c.overdue, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
    'Archived': { background: c.faint, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
    'Approved': { background: c.greenBar, width: 10, height: 10, borderRadius: 1, display: 'inline-block', marginRight: 6 },
  }
  return <span style={styles[status] ?? { display: 'inline-block', width: 10, height: 10, marginRight: 6 }} />
}

function DeadlineBar({ label, pct, overdue }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: overdue ? c.overdue : c.text, fontWeight: overdue ? 500 : 400, marginBottom: 4 }}>{label}</div>
      <div style={{ height: 4, background: c.borderLight, borderRadius: 2, width: 120 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: overdue ? c.redBar : c.greenBar, borderRadius: 2 }} />
      </div>
    </div>
  )
}

const money = value => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
}).format(Number(value) || 0)

// Compare and display money at cent precision instead of relying on float equality.
const cents = value => Math.round((Number(value) || 0) * 100)

const today = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysUntil(value) {
  // Compare calendar dates at midnight so the deadline does not drift with the current time.
  const due = new Date(`${value}T00:00:00`)
  const current = new Date()
  current.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - current.getTime()) / 86400000)
}

function isOverdue(record) {
  return record.status === 'awaiting_receipt' && daysUntil(record.due_on) < 0
}

function statusLabel(record) {
  if (isOverdue(record)) return 'Receipt overdue'
  return {
    awaiting_receipt: 'Awaiting receipt',
    for_review: 'For review',
    flagged: 'Flagged',
    approved: 'Approved',
  }[record.status] || record.status
}

function ApiField({ label, name, id = name, type = 'text', placeholder, required = true, min, step, defaultValue, hint }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>{label}</label>
      <input id={id} name={name} type={type} placeholder={placeholder} required={required}
        min={min} step={step} defaultValue={defaultValue}
        style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }} />
      {hint && <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function ProofUpload({ id = 'proof', label = 'Proof of payment (optional)', accept = 'image/jpeg,image/png,image/webp', formats = 'JPEG, PNG, or WebP' }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState('')

  useEffect(() => {
    const form = inputRef.current?.form
    const clearPreview = () => setPreview('')
    form?.addEventListener('reset', clearPreview)
    return () => form?.removeEventListener('reset', clearPreview)
  }, [])

  useEffect(() => {
    if (!preview) return undefined
    // Release the temporary browser URL when the selected file changes or the form unmounts.
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>{label}</label>
      <input ref={inputRef} id={id} name="proof" type="file" accept={accept}
        onChange={event => setPreview(event.target.files?.[0] ? URL.createObjectURL(event.target.files[0]) : '')}
        style={{ width: '100%', padding: 8, border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }} />
      <div style={{ minHeight: 52, marginTop: 8, padding: 8, border: `1px dashed ${c.border}`, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 12, color: c.muted, fontSize: 12 }}>
        {preview
          ? <><img src={preview} alt="Selected proof preview" style={{ maxWidth: 100, maxHeight: 72, objectFit: 'contain' }} /><span>Image preview</span></>
          : <span>No proof image selected. {formats}; maximum 5 MB.</span>}
      </div>
    </div>
  )
}

function Modal({ title, onClose, children, width = 720 }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(10, 20, 35, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="app-modal-title" onClick={event => event.stopPropagation()}
        className="app-modal"
        style={{ width: `min(${width}px, 100%)`, maxHeight: '90vh', overflow: 'auto', padding: 20, borderRadius: 6, background: c.white, border: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <h2 id="app-modal-title" style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: c.text }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 10px', background: c.surface, color: c.text, cursor: 'pointer' }}>Close</button>
        </div>
        {children}
      </section>
    </div>
  )
}

function ProofModal({ transaction, kind = 'fund', onClose, zIndex = 1000 }) {
  const [imageFailed, setImageFailed] = useState(false)
  if (!transaction) return null

  const isReceipt = kind === 'receipt'
  const hasProof = Number(isReceipt ? transaction.has_receipt_proof : transaction.has_proof) === 1
  const name = isReceipt ? transaction.purpose : transaction.source_name
  const fileName = isReceipt ? transaction.receipt_proof_name : transaction.proof_name
  const proofUrl = isReceipt
    ? `/api.php?action=receipt-proof&id=${encodeURIComponent(transaction.id)}`
    : `/api.php?action=proof&id=${encodeURIComponent(transaction.id)}`
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex, background: 'rgba(10, 20, 35, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <section role="dialog" aria-modal="true" aria-labelledby="proof-modal-title" onClick={event => event.stopPropagation()}
        className="app-modal"
        style={{ width: 'min(760px, 100%)', maxHeight: '90vh', overflow: 'auto', padding: 20, borderRadius: 6, background: c.white, border: `1px solid ${c.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16, marginBottom: 16 }}>
          <div>
            <h2 id="proof-modal-title" style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>{isReceipt ? 'Receipt proof' : 'Proof of payment'}</h2>
            <div style={{ marginTop: 4, color: c.muted, fontSize: 12 }}>{name} · {fileName || 'No file name'}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close proof preview" style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 10px', background: c.surface, color: c.text, cursor: 'pointer' }}>Close</button>
        </div>
        {hasProof && !imageFailed
          ? <img src={proofUrl} alt={`${isReceipt ? 'Receipt' : 'Payment'} proof for ${name}`} onError={() => setImageFailed(true)} style={{ display: 'block', maxWidth: '100%', maxHeight: '68vh', margin: '0 auto', objectFit: 'contain' }} />
          : <div style={{ minHeight: 220, display: 'grid', placeItems: 'center', padding: 24, border: `1px dashed ${c.border}`, borderRadius: 4, color: c.muted, textAlign: 'center' }}>
              {imageFailed ? 'The proof image could not be loaded. Check that the stored file is available.' : `No ${isReceipt ? 'receipt ' : ''}proof image was uploaded for this transaction.`}
            </div>}
      </section>
    </div>
  )
}

async function submitForm(event, onSubmit, action, actor) {
  event.preventDefault()
  const form = event.currentTarget
  const values = Object.fromEntries(new FormData(form).entries())
  const completed = await onSubmit(action, { ...values, actor })
  if (completed) form.reset()
  return completed
}

async function loadDashboard() {
  // Avoid showing stale financial records after submissions or account changes.
  const response = await fetch('/api.php', { cache: 'no-store' })
  const text = await response.text()
  let result
  try {
    result = JSON.parse(text)
  } catch {
    throw new Error('The PHP API did not return JSON. Check that the PHP server is running.')
  }
  if (!response.ok) {
    const error = new Error(result.error || 'Could not load the ledger.')
    error.status = response.status
    throw error
  }
  return result
}

async function loadAuthState() {
  const response = await fetch('/api.php?action=auth-status', { cache: 'no-store' })
  const text = await response.text()
  let result
  try {
    result = JSON.parse(text)
  } catch {
    throw new Error('The PHP API did not return JSON. Check that the PHP server is running.')
  }
  if (!response.ok) {
    const error = new Error(result.error || 'Could not check the login session.')
    error.status = response.status
    throw error
  }
  return result
}

async function postAuthAction(action, values, csrfToken) {
  const response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
    },
    body: JSON.stringify(values),
  })
  const text = await response.text()
  let result
  try {
    result = JSON.parse(text)
  } catch {
    throw new Error('The PHP API did not return JSON. Check that the PHP server is running.')
  }
  if (!response.ok) {
    const error = new Error(result.error || 'Could not complete the request.')
    error.status = response.status
    throw error
  }
  return result
}

async function postAction(action, values, csrfToken) {
  let body
  let headers
  // Funds and receipts use multipart requests to carry proof images; other actions are JSON.
  if (action === 'funds' || action === 'receipt') {
    body = new FormData()
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'proof') {
        if (value instanceof File && value.size > 0) body.append(key, value)
      } else {
        body.append(key, String(value))
      }
    })
    headers = { 'X-CSRF-Token': csrfToken }
  } else {
    body = JSON.stringify(values)
    headers = { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken }
  }

  const response = await fetch(`/api.php?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers,
    body,
  })
  const text = await response.text()
  let result
  try {
    result = JSON.parse(text)
  } catch {
    throw new Error('The PHP API did not return JSON. Check that the PHP server is running.')
  }
  if (!response.ok) {
    const error = new Error(result.error || 'Could not save this change.')
    error.status = response.status
    throw error
  }
  return result
}

function AuthPage({ csrfToken, busy, error, success, onLogin, onRegister, onRetry }) {
  const [mode, setMode] = useState('login')

  async function submitLogin(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget).entries())
    await onLogin(values)
  }

  async function submitRegistration(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form).entries())
    const registered = await onRegister(values)
    if (registered) {
      form.reset()
      setMode('login')
    }
  }

  return (
    <main className="auth-page auth-shell">
      <input className="auth-tab-control" id="login-tab" name="auth-tab" type="radio" checked={mode === 'login'} onChange={() => setMode('login')} />
      <input className="auth-tab-control" id="register-tab" name="auth-tab" type="radio" checked={mode === 'register'} onChange={() => setMode('register')} />

      <section className="auth-card" aria-label="Digital Treasury Ledger account access">
        <aside className="auth-intro">
          <div className="brand">
            <span className="brand-mark">DTL</span>
            <span className="brand-name">Digital Treasury Ledger</span>
          </div>
          <div className="intro-copy">
            <p className="eyebrow">Secure account access</p>
            <h1>Every peso,<br />accounted for.</h1>
            <p className="intro-description">A clear record of funds received, money released, receipts submitted, and every decision made along the way.</p>
          </div>
          <div className="trust-note"><span className="trust-line" /><p>Built for responsible financial stewardship.</p></div>
        </aside>

        <div className="auth-content">
          <div className="mobile-brand">
            <span className="brand-mark">DTL</span>
            <span className="brand-name">Digital Treasury Ledger</span>
          </div>
          <nav className="auth-tabs" aria-label="Choose an access option">
            <label htmlFor="login-tab">Log in</label>
            <label htmlFor="register-tab">Register</label>
          </nav>

          {(error || success) && <p className={`auth-message ${error ? 'auth-message-error' : 'auth-message-success'}`} role={error ? 'alert' : 'status'}>{error || success}</p>}
          {!csrfToken && error && <button className="primary-button auth-retry" type="button" onClick={onRetry}>Retry connection</button>}

          <div className="form-panel login-panel">
            <div className="form-heading">
              <p className="eyebrow">Welcome back</p>
              <h2>Sign in to the ledger</h2>
              <p>Use your approved account credentials.</p>
            </div>
            <form className="auth-form" onSubmit={submitLogin}>
              <div className="field">
                <label htmlFor="login-email">Email address</label>
                <input id="login-email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required type="email" />
              </div>
              <div className="field">
                <label htmlFor="login-password">Password</label>
                <input id="login-password" name="password" autoComplete="current-password" maxLength={72} placeholder="Enter your password" required type="password" />
              </div>
              <button className="primary-button" type="submit" disabled={busy || !csrfToken}>{busy ? 'Signing in…' : 'Log in'}</button>
            </form>
            <p className="switch-prompt">New to the ledger? <label htmlFor="register-tab">Create an account</label></p>
          </div>

          <div className="form-panel register-panel">
            <div className="form-heading">
              <p className="eyebrow">Account registration</p>
              <h2>Create your account</h2>
              <p>Your account will be available after Admin approval.</p>
            </div>
            <form className="auth-form" onSubmit={submitRegistration}>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="register-first-name">First name</label>
                  <input id="register-first-name" name="first_name" autoComplete="given-name" maxLength={80} required type="text" />
                </div>
                <div className="field">
                  <label htmlFor="register-last-name">Last name</label>
                  <input id="register-last-name" name="last_name" autoComplete="family-name" maxLength={80} required type="text" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="register-email">Email address</label>
                <input id="register-email" name="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required type="email" />
              </div>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="register-password">Password</label>
                  <input id="register-password" name="password" autoComplete="new-password" minLength={8} maxLength={72} placeholder="At least 8 characters" required type="password" />
                </div>
                <div className="field">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <input id="confirm-password" name="confirm_password" autoComplete="new-password" minLength={8} maxLength={72} required type="password" />
                </div>
              </div>
              <button className="primary-button" type="submit" disabled={busy || !csrfToken}>{busy ? 'Registering…' : 'Register'}</button>
            </form>
            <p className="switch-prompt">Already registered? <label htmlFor="login-tab">Return to login</label></p>
          </div>
          <p className="prototype-note">Registered accounts require Admin approval before access.</p>
        </div>
      </section>
    </main>
  )
}

function EmptyState({ children = 'No records yet.' }) {
  return <div style={{ padding: 20, color: c.muted, fontSize: 13 }}>{children}</div>
}

function usePagination(records, pageSize = 10, resetKey) {
  const [paginationState, setPaginationState] = useState(() => ({
    page: 1,
    total: records.length,
    resetKey,
  }))
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize))
  // Search/filter changes and record-count changes return the list to its first valid page.
  const resetRequired = paginationState.total !== records.length || !Object.is(paginationState.resetKey, resetKey)
  const requestedPage = resetRequired ? 1 : paginationState.page
  const page = Math.min(requestedPage, pageCount)

  const start = (page - 1) * pageSize
  return {
    records: records.slice(start, start + pageSize),
    page,
    pageCount,
    total: records.length,
    pageSize,
    setPage: nextPage => setPaginationState({ page: nextPage, total: records.length, resetKey }),
  }
}

function Pagination({ pagination }) {
  const { page, pageCount, total, pageSize, setPage } = pagination
  if (total === 0) return null

  const firstPage = Math.max(1, page - 2)
  const lastPage = Math.min(pageCount, page + 2)
  const pages = []
  for (let number = firstPage; number <= lastPage; number += 1) pages.push(number)
  const buttonStyle = {
    minWidth: 32,
    height: 32,
    padding: '0 8px',
    border: `1px solid ${c.border}`,
    borderRadius: 4,
    background: c.white,
    color: c.text,
    cursor: 'pointer',
  }
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 18px', borderTop: `1px solid ${c.borderLight}` }}>
      <span style={{ color: c.muted, fontSize: 12 }}>Showing {start}–{end} of {total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} style={{ ...buttonStyle, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
        {firstPage > 1 && <>
          <button type="button" onClick={() => setPage(1)} style={buttonStyle} aria-label="Page 1">1</button>
          {firstPage > 2 && <span style={{ padding: '0 3px', color: c.muted }}>…</span>}
        </>}
        {pages.map(number => (
          <button key={number} type="button" onClick={() => setPage(number)} aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined}
            style={{ ...buttonStyle, background: page === number ? c.primary : c.white, color: page === number ? c.primaryText : c.text, fontWeight: page === number ? 600 : 400 }}>
            {number}
          </button>
        ))}
        {lastPage < pageCount && <>
          {lastPage < pageCount - 1 && <span style={{ padding: '0 3px', color: c.muted }}>…</span>}
          <button type="button" onClick={() => setPage(pageCount)} style={buttonStyle} aria-label={`Page ${pageCount}`}>{pageCount}</button>
        </>}
        <button type="button" onClick={() => setPage(page + 1)} disabled={page === pageCount} style={{ ...buttonStyle, opacity: page === pageCount ? 0.5 : 1, cursor: page === pageCount ? 'not-allowed' : 'pointer' }}>Next</button>
      </div>
    </nav>
  )
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewPage({ dashboard }) {
  const { summary, disbursements } = dashboard
  const waiting = disbursements.filter(record => record.status === 'for_review')
  const outstanding = disbursements.filter(record => record.status === 'awaiting_receipt')
  const waitingPagination = usePagination(waiting)

  return (
    <div>
      <PageHeader
        title="Where the money stands today"
        sub="Every peso released is tied to a person and a seven-day clock. Nothing closes until a receipt is in, reviewed, and filed under its project."
      />

      {/* Stat cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
        {[
          { label: 'Cash on hand', value: money(summary.cash_on_hand), sub: `${money(summary.total_received)} recorded, ${money(summary.total_released)} released`, color: c.text },
          { label: 'Released but not yet liquidated', value: money(summary.outstanding), sub: `${disbursements.filter(record => record.status !== 'approved').length} open transaction(s)`, color: c.amber },
          { label: 'Past the deadline', value: money(summary.overdue), sub: `${summary.overdue_count} receipt(s) overdue · ${summary.blocked_people} person(s) on hold`, color: c.overdue },
        ].map((s, i) => (
          <div key={i} style={{ background: c.white, padding: '20px 24px' }}>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: s.color, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: c.muted }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Liquidation clock */}
      <Panel>
        <PanelHeader title="Liquidation clock" right="Seven days from release, counted from the date the cash left the ledger" />
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Held by', 'Amount', 'Released', 'Time left'].map(h => (
                <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
              ))}
            </div>
            {outstanding.length === 0 ? <EmptyState>No receipts are currently outstanding.</EmptyState> : outstanding.slice(0, 5).map(record => {
              const remaining = daysUntil(record.due_on)
              const overdue = remaining < 0
              return (
                <div key={record.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr', padding: '16px 20px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: c.text }}>{record.purpose}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{record.voucher_number} · {record.project}</div>
                  </div>
                  <span style={{ color: c.text }}>{record.accountable}</span>
                  <span style={{ fontWeight: 500 }}>{money(record.amount)}</span>
                  <span style={{ color: c.muted }}>{formatDate(record.released_on)}</span>
                  <DeadlineBar label={overdue ? `${Math.abs(remaining)} day(s) overdue` : `${remaining} day(s) left`} pct={Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue} />
                </div>
              )
            })}
          </div>
        </div>
      </Panel>

      {/* Waiting on auditor */}
      <Panel>
        <PanelHeader title="Waiting on the auditor" right={`${waiting.length} transaction(s) with receipts submitted`} />
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Receipt', 'Released', 'Receipted', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
              ))}
            </div>
            {waiting.length === 0 ? <EmptyState>No receipts are waiting for review.</EmptyState> : waitingPagination.records.map((r, i) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '14px 20px', alignItems: 'start', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{r.purpose}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{r.voucher_number} · {r.accountable}</div>
                </div>
                <div>
                  <div>{r.receipt_vendor}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{r.receipt_reference}</div>
                </div>
                <span>{money(r.amount)}</span>
                <span style={{ color: cents(r.receipt_amount) !== cents(r.amount) ? c.overdue : c.text, fontWeight: 500 }}>{money(r.receipt_amount)}</span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <StatusDot status="For review" />
                  <span style={{ color: c.review, fontSize: 13 }}>For review</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <Pagination pagination={waitingPagination} />
      </Panel>

    </div>
  )
}

// ─── Funds Received ───────────────────────────────────────────────────────────

function FundsPage({ dashboard, onSubmit, busy, actor, canManage }) {
  const { funds } = dashboard
  const [proofFund, setProofFund] = useState(null)
  const fundsPagination = usePagination(funds)
  const categories = [
    'Department Allocation',
    'Membership Dues',
    'Sponsorships',
    'Donations',
    'Fundraising Activities',
    'Grants',
    'Others',
  ]

  return (
    <div>
      <PageHeader title="Funds received" sub="The opening side of the ledger. Only what is recorded here can be released." />

      {canManage && <Panel>
        <PanelHeader title="Record money coming in" />
        <form onSubmit={event => submitForm(event, onSubmit, 'funds', actor)} style={{ padding: 20 }}>
          <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ApiField label="Source Name" name="source_name" placeholder="Member, organization, or funding office" />
            <div>
              <label htmlFor="income_category" style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>Income Category</label>
              <select id="income_category" name="income_category" required defaultValue=""
                style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}>
                <option value="" disabled>Select a category</option>
                {categories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>
          <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <ApiField label="Amount" name="amount" placeholder="0.00" type="number" min="0.01" step="0.01" />
            <ApiField label="Date received" name="received_on" type="date" defaultValue={today()} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <ApiField label="Note" name="note" placeholder="Deposit reference or account" required={false} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <ProofUpload />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="submit" disabled={busy} style={{ padding: '9px 18px', borderRadius: 4, border: 'none', cursor: busy ? 'wait' : 'pointer', background: c.primary, color: c.primaryText }}>
              {busy ? 'Saving…' : 'Record the fund'}
            </button>
            <span style={{ fontSize: 12, color: c.muted }}>This adds to cash on hand and is written to the audit trail.</span>
          </div>
        </form>
      </Panel>}

      <Panel>
        <PanelHeader title="Receipts Ledger" right={`${funds.length} record(s) · ${money(dashboard.summary.total_received)} total`} />
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 820 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr 1.5fr 1fr 1fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Category', 'Source Name', 'Note', 'Date', 'Amount', 'Proof'].map(h => (
                <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
              ))}
            </div>
            {funds.length === 0 ? <EmptyState /> : fundsPagination.records.map((r, i) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr 1.5fr 1fr 1fr 1fr', padding: '14px 20px', alignItems: 'center', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                <span style={{ color: c.muted }}>{r.income_category}</span>
                <span style={{ fontWeight: 500 }}>{r.source_name}</span>
                <span style={{ color: c.link }}>{r.note || '—'}</span>
                <span style={{ color: c.muted }}>{formatDate(r.received_on)}</span>
                <span style={{ fontWeight: 500 }}>{money(r.amount)}</span>
                <div>
                  <button type="button" onClick={() => setProofFund(r)} style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 9px', background: c.surface, color: c.link, cursor: 'pointer', whiteSpace: 'nowrap' }}>View Proof</button>
                  <div style={{ marginTop: 4, color: c.muted, fontSize: 10 }}>{Number(r.has_proof) === 1 ? (r.proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <Pagination pagination={fundsPagination} />
      </Panel>
      <ProofModal key={proofFund?.id ?? 'closed'} transaction={proofFund} onClose={() => setProofFund(null)} />
    </div>
  )
}

// ─── Disbursements ────────────────────────────────────────────────────────────

function DisbursementsPage({ dashboard }) {
  const { disbursements } = dashboard
  const [proofTransaction, setProofTransaction] = useState(null)
  const disbursementPagination = usePagination(disbursements)
  return (
    <div>
      <PageHeader title="Disbursements" sub="Every release, who is accountable for it, and where it sits in the chain." />
      <Panel>
        <PanelHeader title="All transactions" right={`${disbursements.length} record(s)`} />
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.5fr 1.5fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Accountable', 'Amount', 'Receipt', 'Deadline', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
              ))}
            </div>
            {disbursements.length === 0 ? <EmptyState /> : disbursementPagination.records.map((r, i) => {
              const remaining = daysUntil(r.due_on)
              const overdue = isOverdue(r)
              const label = r.status === 'approved'
                ? `Approved ${formatDate(r.receipt_submitted_on)}`
                : r.status === 'for_review' || r.status === 'flagged'
                  ? `Receipt in on ${formatDate(r.receipt_submitted_on)}`
                  : overdue ? `${Math.abs(remaining)} day(s) overdue` : `${remaining} day(s) left`
              const status = statusLabel(r)
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.5fr 1.5fr', padding: '14px 20px', alignItems: 'start', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.purpose}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{r.voucher_number} · {r.project}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>Released {formatDate(r.released_on)}</div>
                  </div>
                  <span>{r.accountable}</span>
                  <span style={{ fontWeight: 500 }}>{money(r.amount)}</span>
                  <div>
                    {r.receipt_vendor
                      ? <>
                          <div>{r.receipt_vendor}</div>
                          <div style={{ fontSize: 11, color: c.link }}>{r.receipt_reference || 'Receipt submitted'} · {money(r.receipt_amount)}</div>
                          <button type="button" onClick={() => setProofTransaction(r)} style={{ marginTop: 6, border: `1px solid ${c.border}`, borderRadius: 4, padding: '5px 8px', background: c.surface, color: c.link, cursor: 'pointer' }}>View Proof</button>
                          <div style={{ marginTop: 3, color: c.muted, fontSize: 10 }}>{Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                        </>
                      : <span style={{ color: c.muted }}>Not submitted</span>}
                  </div>
                  <DeadlineBar label={label} pct={r.status === 'approved' || r.status === 'for_review' || r.status === 'flagged' ? 100 : Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <StatusDot status={status} />
                      <span style={{
                        color: status === 'Flagged' ? c.flagged : status === 'Receipt overdue' ? c.overdue : status === 'Approved' ? c.greenBar : c.review,
                        fontSize: 13,
                      }}>{status}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <Pagination pagination={disbursementPagination} />
      </Panel>
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)} />
    </div>
  )
}

// ─── Release Funds ────────────────────────────────────────────────────────────

function ProjectsManager({ projects, onSubmit, busy, actor, search, setSearch, onSelect, onOpenArchive }) {
  const activeProjects = projects.filter(project => project.status === 'active')
  const archivedProjects = projects.filter(project => project.status === 'archived')
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const visibleProjects = activeProjects.filter(project => project.project_name.toLocaleLowerCase().includes(normalizedSearch))
  const projectPagination = usePagination(visibleProjects, 10, normalizedSearch)

  return (
    <Panel>
      <PanelHeader title="Project management" right={`${activeProjects.length} active project(s)`} />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <label htmlFor="project-search" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Search projects</label>
          <input id="project-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value)
            projectPagination.setPage(1)
          }} placeholder="Search project name…"
            style={{ flex: '1 1 240px', minWidth: 180, maxWidth: 420, padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }} />
          <button type="button" onClick={onOpenArchive} aria-label={`View archived projects (${archivedProjects.length})`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text, cursor: 'pointer' }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h18v5H3zM5 9v11h14V9M10 13h4" />
            </svg>
            Archive <span style={{ color: c.muted }}>({archivedProjects.length})</span>
          </button>
        </div>

        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: 'pointer', color: c.link, fontWeight: 500 }}>Create a project</summary>
          <form onSubmit={event => submitForm(event, onSubmit, 'project', actor)} style={{ padding: '16px 0 4px' }}>
            <input type="hidden" name="operation" value="create" />
            <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <ApiField label="Project Name" name="project_name" id="new-project-name" placeholder="Research Congress" />
              <ApiField label="Project Start Date" name="start_date" id="new-project-start" type="date" />
              <ApiField label="Project End Date" name="end_date" id="new-project-end" type="date" />
            </div>
            <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText }}>
              {busy ? 'Saving…' : 'Save project'}
            </button>
          </form>
        </details>

        {visibleProjects.length === 0
          ? <EmptyState>{activeProjects.length === 0 ? 'No active projects yet. Create or restore a project before releasing funds.' : 'No active projects match your search.'}</EmptyState>
          : projectPagination.records.map(project => {
              const linkedRecords = Number(project.linked_transactions)
              return (
                <div key={project.id} style={{ padding: '14px 0', borderTop: `1px solid ${c.borderLight}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{project.project_name}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: c.muted }}>
                        {project.start_date && project.end_date ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}` : 'Dates not recorded'}
                        {' · '}{linkedRecords} linked financial record(s)
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'end' }}>
                      <button type="button" onClick={() => onSelect(project.id)}
                        style={{ padding: '6px 10px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: 'pointer' }}>
                        Select project
                      </button>
                      <button type="button" onClick={() => onSubmit('project', { operation: 'archive', project_id: project.id, actor })} disabled={busy}
                        style={{ padding: '6px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>
                        Archive project
                      </button>
                      <button type="button" disabled={busy || linkedRecords > 0}
                        onClick={() => {
                          if (window.confirm(`Delete project "${project.project_name}"?`)) {
                            onSubmit('project', { operation: 'delete', project_id: project.id, actor })
                          }
                        }}
                        title={linkedRecords > 0 ? 'Projects with financial records cannot be deleted; archive instead.' : 'Delete project'}
                        style={{ padding: '6px 10px', border: `1px solid ${c.overdue}`, borderRadius: 4, background: 'transparent', color: c.overdue, cursor: busy || linkedRecords > 0 ? 'not-allowed' : 'pointer', opacity: linkedRecords > 0 ? 0.6 : 1 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {linkedRecords > 0 && <div style={{ marginTop: 6, color: c.muted, fontSize: 11 }}>This project has financial records; archive it rather than deleting it.</div>}
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: c.link, fontSize: 12 }}>Edit project details</summary>
                    <form onSubmit={event => submitForm(event, onSubmit, 'project', actor)} style={{ padding: '12px 0 4px' }}>
                      <input type="hidden" name="operation" value="update" />
                      <input type="hidden" name="project_id" value={project.id} />
                      <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <ApiField label="Project Name" name="project_name" id={`project-${project.id}-name`} defaultValue={project.project_name} />
                        <ApiField label="Project Start Date" name="start_date" id={`project-${project.id}-start`} type="date" defaultValue={project.start_date || ''} />
                        <ApiField label="Project End Date" name="end_date" id={`project-${project.id}-end`} type="date" defaultValue={project.end_date || ''} />
                      </div>
                      <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText }}>
                        {busy ? 'Saving…' : 'Save changes'}
                      </button>
                    </form>
                  </details>
                </div>
              )
            })}
        <Pagination pagination={projectPagination} />
      </div>
    </Panel>
  )
}

function ArchivedProjectsModal({ projects, onSubmit, busy, actor, onClose }) {
  const archivedProjects = projects.filter(project => project.status === 'archived')
  const projectPagination = usePagination(archivedProjects)

  async function restoreProject(project) {
    const restored = await onSubmit('project', { operation: 'activate', project_id: project.id, actor })
    if (restored) onClose()
  }

  return (
    <Modal title={`Archived projects (${archivedProjects.length})`} onClose={onClose} width={680}>
      {archivedProjects.length === 0
        ? <EmptyState>There are no archived projects.</EmptyState>
        : <div>
            {projectPagination.records.map((project, index) => (
              <div key={project.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: index > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                <div>
                  <div style={{ fontWeight: 500, color: c.text }}>{project.project_name}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: c.muted }}>
                    {project.start_date && project.end_date ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}` : 'Dates not recorded'}
                    {' · '}{Number(project.linked_transactions)} linked financial record(s)
                  </div>
                </div>
                <button type="button" onClick={() => restoreProject(project)} disabled={busy}
                  style={{ flexShrink: 0, padding: '7px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>
                  {busy ? 'Restoring…' : 'Restore'}
                </button>
              </div>
            ))}
            <Pagination pagination={projectPagination} />
          </div>}
    </Modal>
  )
}

function NewVoucherModal({ project, people, summary, onSubmit, busy, actor, onClose }) {
  async function handleSubmit(event) {
    const completed = await submitForm(event, onSubmit, 'release', actor)
    if (completed) onClose()
  }

  return (
    <Modal title="New disbursement voucher" onClose={onClose} width={680}>
      <p style={{ margin: '-4px 0 18px', color: c.muted, fontSize: 13 }}>Project: <strong style={{ color: c.text }}>{project.project_name}</strong></p>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="project_id" value={project.id} />
        <div style={{ marginBottom: 16 }}>
          <ApiField label="What the money is for" name="purpose" placeholder="Venue deposit, general assembly" />
        </div>
        <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label htmlFor="voucher-person-id" style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>Accountable person</label>
            <select id="voucher-person-id" name="person_id" required defaultValue="" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}>
              <option value="" disabled>Select a person</option>
              {people.map(person => <option key={person.id} value={person.id} disabled={Number(person.blocked)}>{person.name} — {person.email} ({person.position}){Number(person.blocked) ? ' (on hold)' : ''}</option>)}
            </select>
            <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>People with an overdue or flagged transaction are locked out until they settle it.</p>
          </div>
          <ApiField label="Amount to release" name="amount" placeholder="0.00" type="number" min="0.01" step="0.01" hint={`Cash on hand: ${money(summary.cash_on_hand)}`} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <ApiField label="Date released" name="released_on" type="date" defaultValue={today()} hint="Receipts are due seven days after release." />
        </div>
        <div style={{ display: 'flex', justifyContent: 'end', gap: 10 }}>
          <button type="button" onClick={onClose} disabled={busy} style={{ padding: '8px 14px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.white, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>Cancel</button>
          <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Saving…' : 'Release the funds'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ReleasePage({ dashboard, onSubmit, busy, actor }) {
  const { people, projects, summary } = dashboard
  const { disbursements } = dashboard
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [search, setSearch] = useState('')
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [voucherOpen, setVoucherOpen] = useState(false)
  const selectedProject = projects.find(project => Number(project.id) === Number(selectedProjectId) && project.status === 'active')
  const projectDisbursements = selectedProject
    ? disbursements.filter(record => Number(record.project_id) === Number(selectedProject.id))
    : []
  const voucherPagination = usePagination(projectDisbursements, 10, selectedProjectId)

  if (selectedProject) {
    return (
      <div>
        <button type="button" onClick={() => setSelectedProjectId(null)} style={{ marginBottom: 20, padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.link, cursor: 'pointer' }}>
          ← Back to Project Management
        </button>
        <PageHeader title={selectedProject.project_name} sub={`${selectedProject.start_date && selectedProject.end_date ? `${formatDate(selectedProject.start_date)} – ${formatDate(selectedProject.end_date)}` : 'Project dates not recorded'} · Active project`} />
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: c.text }}>Project disbursements</div>
              <div style={{ marginTop: 4, fontSize: 12, color: c.muted }}>{projectDisbursements.length} voucher(s) linked to this project</div>
            </div>
            <button type="button" onClick={() => setVoucherOpen(true)} disabled={busy}
              style={{ padding: '9px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
              New Disbursement Voucher
            </button>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Voucher history" right={`${projectDisbursements.length} record(s)`} />
          {projectDisbursements.length === 0
            ? <EmptyState>No disbursement vouchers have been recorded for this project.</EmptyState>
            : <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 760 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.4fr 1fr 1fr 1.3fr', gap: 12, padding: '9px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
                    {['Voucher', 'Purpose', 'Accountable person', 'Released', 'Amount', 'Status'].map(label => (
                      <span key={label} style={{ fontSize: 11, color: c.muted }}>{label}</span>
                    ))}
                  </div>
                  {voucherPagination.records.map((record, index) => (
                    <div key={record.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.4fr 1fr 1fr 1.3fr', gap: 12, alignItems: 'center', padding: '13px 20px', borderTop: index > 0 ? `1px solid ${c.borderLight}` : 'none', fontSize: 12 }}>
                      <span style={{ color: c.link, fontWeight: 500 }}>{record.voucher_number}</span>
                      <span>{record.purpose}</span>
                      <span>{record.accountable}</span>
                      <span>{formatDate(record.released_on)}</span>
                      <span style={{ fontWeight: 500 }}>{money(record.amount)}</span>
                      <span style={{ whiteSpace: 'nowrap' }}><StatusDot status={statusLabel(record)} />{statusLabel(record)}</span>
                    </div>
                  ))}
                </div>
              </div>}
          <Pagination pagination={voucherPagination} />
        </Panel>
        {voucherOpen && <NewVoucherModal project={selectedProject} people={people} summary={summary} onSubmit={onSubmit} busy={busy} actor={actor} onClose={() => setVoucherOpen(false)} />}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Release funds" sub="Choose a project to view its vouchers or create a new disbursement." />
      <ProjectsManager projects={projects} onSubmit={onSubmit} busy={busy} actor={actor} search={search} setSearch={setSearch}
        onSelect={setSelectedProjectId} onOpenArchive={() => setArchiveOpen(true)} />
      {archiveOpen && <ArchivedProjectsModal projects={projects} onSubmit={onSubmit} busy={busy} actor={actor} onClose={() => setArchiveOpen(false)} />}
    </div>
  )
}

// ─── Liquidation ──────────────────────────────────────────────────────────────

function LiquidationPage({ dashboard, onSubmit, busy, actor, canSubmitReceipt }) {
  const { disbursements } = dashboard
  const owed = disbursements.filter(record => record.status === 'awaiting_receipt')
  const waiting = disbursements.filter(record => record.status === 'for_review')
  const [proofTransaction, setProofTransaction] = useState(null)
  const [receiptTransaction, setReceiptTransaction] = useState(null)
  const owedPagination = usePagination(owed)
  const waitingPagination = usePagination(waiting)
  return (
    <div>
      <PageHeader title="Liquidation" sub="Record the receipt details against the voucher. A transaction is not closed until the auditor reviews it." />

      <Panel>
        <PanelHeader title="Receipts still owed" right={`${owed.length} transaction(s)`} />
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Accountable', 'Amount', 'Deadline', 'Action'].map(h => (
                <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
              ))}
            </div>
            {owed.length === 0 ? <EmptyState>No receipts are currently owed.</EmptyState> : owedPagination.records.map((r, i) => {
              const remaining = daysUntil(r.due_on)
              const overdue = remaining < 0
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr', padding: '14px 20px', alignItems: 'center', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.purpose}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{r.voucher_number} · {r.project}</div>
                  </div>
                  <span>{r.accountable}</span>
                  <span style={{ fontWeight: 500 }}>{money(r.amount)}</span>
                  <DeadlineBar label={overdue ? `${Math.abs(remaining)} day(s) overdue` : `${remaining} day(s) left`} pct={Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue} />
                  {canSubmitReceipt
                    ? <button type="button" onClick={() => setReceiptTransaction(r)} disabled={busy}
                        style={{ padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.link, cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                        Submit Receipt
                      </button>
                    : <span style={{ color: c.muted, fontSize: 12 }}>View only</span>}
                </div>
              )
            })}
          </div>
        </div>
        <Pagination pagination={owedPagination} />
      </Panel>

      {receiptTransaction && (
        <Modal title={`Submit receipt · ${receiptTransaction.voucher_number}`} onClose={() => setReceiptTransaction(null)} width={560}>
          <div style={{ marginBottom: 16, padding: 12, background: c.surface, borderRadius: 4, color: c.muted, fontSize: 12 }}>
            {receiptTransaction.purpose} · {receiptTransaction.project} · {money(receiptTransaction.amount)}
          </div>
          <form onSubmit={async event => {
            const completed = await submitForm(event, onSubmit, 'receipt', actor)
            if (completed) setReceiptTransaction(null)
          }}>
            <input type="hidden" name="disbursement_id" value={receiptTransaction.id} />
            <ApiField label="Vendor or description" name="vendor" id="receipt-modal-vendor" placeholder="Store or recipient" />
            <div style={{ height: 10 }} />
            <ApiField label="Receipt total" name="amount" id="receipt-modal-amount" type="number" min="0.01" step="0.01" />
            <div style={{ height: 10 }} />
            <ApiField label="Receipt date" name="submitted_on" id="receipt-modal-date" type="date" defaultValue={today()} />
            <div style={{ height: 10 }} />
            <ApiField label="Reference number" name="reference" id="receipt-modal-reference" required={false} />
            <div style={{ height: 10 }} />
            <ApiField label="Note" name="note" id="receipt-modal-note" required={false} />
            <div style={{ height: 10 }} />
            <ProofUpload id="receipt-modal-proof" label="Receipt proof image (optional)" accept="image/jpeg,image/png" formats="JPG, JPEG, or PNG" />
            <div style={{ display: 'flex', justifyContent: 'end', gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setReceiptTransaction(null)} disabled={busy}
                style={{ padding: '8px 14px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.white, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      <Panel>
        <PanelHeader title="Submitted, waiting on a decision" right={`${waiting.length} item(s)`} />
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Receipt', 'Difference', 'Proof', 'Status'].map(h => (
                <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
              ))}
            </div>
            {waiting.length === 0 ? <EmptyState>No submitted receipts are waiting for review.</EmptyState> : waitingPagination.records.map((r, i) => {
              const differenceCents = cents(r.receipt_amount) - cents(r.amount)
              return (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '14px 20px', alignItems: 'start', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.purpose}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{r.voucher_number}</div>
                  </div>
                  <div>
                    <div>{r.receipt_vendor}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>Filed {formatDate(r.receipt_submitted_on)} · {r.receipt_reference}</div>
                  </div>
                  <span style={{ color: differenceCents ? c.overdue : c.text, fontWeight: 500 }}>{differenceCents === 0 ? 'Exact' : money(differenceCents / 100)}</span>
                  <div>
                    <button type="button" onClick={() => setProofTransaction(r)} style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 9px', background: c.surface, color: c.link, cursor: 'pointer', whiteSpace: 'nowrap' }}>View Proof</button>
                    <div style={{ marginTop: 4, color: c.muted, fontSize: 10 }}>{Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <StatusDot status="For review" />
                      <span style={{ color: c.review, fontSize: 13 }}>For review</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <Pagination pagination={waitingPagination} />
      </Panel>
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)} />
    </div>
  )
}

// ─── Review Queue ─────────────────────────────────────────────────────────────

function ReviewPage({ dashboard, onSubmit, busy, actor }) {
  const pending = dashboard.disbursements.filter(record => record.status === 'for_review')
  const flagged = dashboard.disbursements.filter(record => record.status === 'flagged')
  const [proofTransaction, setProofTransaction] = useState(null)
  const [resolutionTransaction, setResolutionTransaction] = useState(null)
  const pendingPagination = usePagination(pending)
  const flaggedPagination = usePagination(flagged)
  const tableStyle = { width: '100%', minWidth: 1120, borderCollapse: 'collapse', textAlign: 'left' }
  const headerStyle = { padding: '10px 12px', borderBottom: `1px solid ${c.borderLight}`, color: c.muted, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }
  const cellStyle = { padding: '12px', borderTop: `1px solid ${c.borderLight}`, verticalAlign: 'top', fontSize: 12 }

  function ReceiptProofButton({ record }) {
    return (
      <div>
        <button type="button" onClick={() => setProofTransaction(record)}
          style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 9px', background: c.surface, color: c.link, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          View Receipt
        </button>
        <div style={{ marginTop: 4, color: c.muted, fontSize: 10 }}>
          {Number(record.has_receipt_proof) === 1 ? (record.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="Review queue" sub="Transactions with receipts submitted and waiting on an auditor's decision." />
      <Panel>
        <PanelHeader title="Pending decisions" right={`${pending.length} item(s)`} />
        {pending.length === 0
          ? <EmptyState>No receipts are waiting for a decision.</EmptyState>
          : <>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>{['Voucher', 'Accountable person', 'Receipt details', 'Released', 'Receipted', 'Difference', 'Proof', 'Actions'].map(label => <th key={label} scope="col" style={headerStyle}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {pendingPagination.records.map(record => {
                    const differenceCents = cents(record.receipt_amount) - cents(record.amount)
                    return (
                      <tr key={record.id}>
                        <td style={cellStyle}>
                          <strong>{record.voucher_number}</strong>
                          <div style={{ marginTop: 3, color: c.muted }}>{record.project}</div>
                          <div style={{ marginTop: 3 }}>{record.purpose}</div>
                        </td>
                        <td style={cellStyle}>{record.accountable}</td>
                        <td style={cellStyle}>
                          <strong>{record.receipt_vendor}</strong>
                          {record.receipt_reference && <div style={{ marginTop: 3, color: c.muted }}>Ref: {record.receipt_reference}</div>}
                          <div style={{ marginTop: 3, color: c.muted }}>Submitted {formatDate(record.receipt_submitted_on)}</div>
                          {record.receipt_note && <div style={{ marginTop: 5 }}>{record.receipt_note}</div>}
                        </td>
                        <td style={cellStyle}>{money(record.amount)}</td>
                        <td style={cellStyle}>{money(record.receipt_amount)}</td>
                        <td style={{ ...cellStyle, color: differenceCents ? c.overdue : c.greenBar, fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {differenceCents === 0 ? 'Exact' : money(differenceCents / 100)}
                        </td>
                        <td style={cellStyle}><ReceiptProofButton record={record} /></td>
                        <td style={cellStyle}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 260 }}>
                            <button type="button" disabled={busy || differenceCents !== 0} onClick={() => onSubmit('review', { disbursement_id: record.id, decision: 'approve', actor })}
                              style={{ padding: '7px 10px', background: c.primary, color: c.primaryText, border: 'none', borderRadius: 4, fontSize: 12, cursor: busy || differenceCents !== 0 ? 'not-allowed' : 'pointer', opacity: differenceCents !== 0 ? 0.6 : 1 }}>
                              Approve
                            </button>
                            <button type="button" disabled={busy} onClick={() => onSubmit('review', { disbursement_id: record.id, decision: 'flag', actor })}
                              style={{ padding: '7px 10px', background: 'transparent', color: c.overdue, border: `1px solid ${c.overdue}`, borderRadius: 4, fontSize: 12, cursor: busy ? 'wait' : 'pointer' }}>
                              Flag
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pendingPagination} />
          </>}
      </Panel>
      <Panel>
        <PanelHeader title="Flagged transactions" right={`${flagged.length} item(s) on hold`} />
        {flagged.length === 0
          ? <EmptyState>No flagged transactions need resolution.</EmptyState>
          : <>
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>{['Voucher', 'Accountable person', 'Receipt details', 'Released', 'Receipted', 'Proof', 'Resolution'].map(label => <th key={label} scope="col" style={headerStyle}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {flaggedPagination.records.map(record => (
                    <tr key={record.id}>
                      <td style={cellStyle}>
                        <strong>{record.voucher_number}</strong>
                        <div style={{ marginTop: 3, color: c.muted }}>{record.project}</div>
                        <div style={{ marginTop: 3 }}>{record.purpose}</div>
                      </td>
                      <td style={cellStyle}>{record.accountable}</td>
                      <td style={cellStyle}>
                        <strong>{record.receipt_vendor}</strong>
                        {record.receipt_reference && <div style={{ marginTop: 3, color: c.muted }}>Ref: {record.receipt_reference}</div>}
                        <div style={{ marginTop: 3, color: c.muted }}>Submitted {formatDate(record.receipt_submitted_on)}</div>
                        <div style={{ marginTop: 5 }}>{record.receipt_note}</div>
                      </td>
                      <td style={cellStyle}>{money(record.amount)}</td>
                      <td style={cellStyle}>{money(record.receipt_amount)}</td>
                      <td style={cellStyle}><ReceiptProofButton record={record} /></td>
                      <td style={cellStyle}>
                        <button type="button" disabled={busy} onClick={() => setResolutionTransaction(record)}
                          style={{ padding: '8px 10px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, whiteSpace: 'nowrap', cursor: busy ? 'wait' : 'pointer' }}>
                            Resolve
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={flaggedPagination} />
          </>}
      </Panel>
      {resolutionTransaction && (
        <Modal title={`Resolve discrepancy · ${resolutionTransaction.voucher_number}`} onClose={() => setResolutionTransaction(null)} width={560}>
          <div style={{ marginBottom: 14, padding: 12, background: c.surface, borderRadius: 4, color: c.muted, fontSize: 12 }}>
            {resolutionTransaction.purpose} · {resolutionTransaction.project} · {resolutionTransaction.receipt_vendor}
          </div>
          <form onSubmit={async event => {
            const completed = await submitForm(event, onSubmit, 'review', actor)
            if (completed) setResolutionTransaction(null)
          }}>
            <input type="hidden" name="disbursement_id" value={resolutionTransaction.id} />
            <input type="hidden" name="decision" value="resolve" />
            <label htmlFor="resolution-note" style={{ display: 'block', marginBottom: 6, color: c.muted, fontSize: 12 }}>How was this discrepancy settled?</label>
            <textarea id="resolution-note" name="resolution_note" rows={4} maxLength={500} required
              placeholder="Refund reference or explanation reviewed"
              style={{ width: '100%', resize: 'vertical', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text, font: 'inherit' }} />
            <div style={{ display: 'flex', justifyContent: 'end', gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setResolutionTransaction(null)} disabled={busy}
                style={{ padding: '8px 14px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.white, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={busy}
                style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Saving…' : 'Record resolution'}
              </button>
            </div>
          </form>
        </Modal>
      )}
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)} />
    </div>
  )
}

// ─── Archive ──────────────────────────────────────────────────────────────────

function ProjectArchiveFolder({ name, records }) {
  const recordPagination = usePagination(records)
  const [recordsOpen, setRecordsOpen] = useState(false)
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: 20 }}>
      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 12, color: c.link, marginBottom: 16 }}>{records.length} approved transaction(s)</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 16 }}>{money(records.reduce((total, record) => total + cents(record.amount), 0) / 100)}</div>
      <button type="button" onClick={() => setRecordsOpen(true)}
        style={{ padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.link, cursor: 'pointer' }}>
        View financial records
      </button>
      <div style={{ display: 'inline-block', marginTop: 10, border: '1.5px solid #2a7a3a', color: '#2a7a3a', padding: '4px 12px', borderRadius: 3, fontSize: 11, letterSpacing: '0.05em', fontWeight: 500 }}>
        Approved
      </div>
      {recordsOpen && (
        <Modal title={`${name} · Financial records`} onClose={() => setRecordsOpen(false)} width={760}>
          <div style={{ marginBottom: 12, color: c.muted, fontSize: 12 }}>
            {records.length} approved transaction(s) · Total {money(records.reduce((total, record) => total + cents(record.amount), 0) / 100)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 650 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.4fr 1fr 1fr', gap: 12, padding: '9px 0', borderBottom: `1px solid ${c.borderLight}` }}>
                {['Voucher', 'Purpose', 'Accountable person', 'Released', 'Amount'].map(label => (
                  <span key={label} style={{ fontSize: 11, color: c.muted }}>{label}</span>
                ))}
              </div>
              {recordPagination.records.map(record => (
                <div key={record.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.4fr 1fr 1fr', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: `1px solid ${c.borderLight}`, fontSize: 12 }}>
                  <span style={{ color: c.link, fontWeight: 500 }}>{record.voucher_number}</span>
                  <span>{record.purpose}</span>
                  <span>{record.accountable}</span>
                  <span>{formatDate(record.released_on)}</span>
                  <span style={{ fontWeight: 500 }}>{money(record.amount)}</span>
                </div>
              ))}
            </div>
          </div>
          <Pagination pagination={recordPagination} />
        </Modal>
      )}
    </div>
  )
}

function ArchivePage({ dashboard }) {
  const closed = dashboard.disbursements.filter(record => record.status === 'approved')
  const projects = closed.reduce((groups, record) => {
    groups[record.project] = [...(groups[record.project] || []), record]
    return groups
  }, {})
  const projectEntries = Object.entries(projects)
  const projectPagination = usePagination(projectEntries)
  return (
    <div>
      <PageHeader title="Archive" sub="Closed records, kept by event or project so a year-end audit reads in one pass." />
      <Panel>
        <PanelHeader title="Project folders" right={`${closed.length} closed record(s)`} />
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {projectEntries.length === 0 ? <EmptyState>No approved records have been archived.</EmptyState> : projectPagination.records.map(([name, records]) => (
            <ProjectArchiveFolder key={name} name={name} records={records} />
          ))}
        </div>
        <Pagination pagination={projectPagination} />
      </Panel>
    </div>
  )
}

// ─── Personnel ────────────────────────────────────────────────────────────────

function PersonnelPage({ dashboard }) {
  const personnel = dashboard.personnel || []
  const voucherMap = new Map()
  for (const voucher of dashboard.disbursements || []) {
    const accountId = Number(voucher.recipient_account_id)
    if (!accountId) continue
    if (!voucherMap.has(accountId)) voucherMap.set(accountId, [])
    voucherMap.get(accountId).push(voucher)
  }
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [proofTransaction, setProofTransaction] = useState(null)
  const personnelPagination = usePagination(personnel)
  const selectedVouchers = selectedPerson ? voucherMap.get(Number(selectedPerson.id)) || [] : []
  const receiptPagination = usePagination(selectedVouchers, 10, selectedPerson?.id)

  return (
    <div>
      <PageHeader title="Personnel" sub="Registered personnel and their voucher clearance." />
      <Panel>
        <PanelHeader title="Registered personnel" right={`${personnel.length} account(s)`} />
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.borderLight}`, color: c.muted, fontSize: 12 }}>
          A voucher is cleared once its receipt is approved by an Auditor.
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                {['Name', 'Assigned Role', 'Voucher clearance', 'Receipts'].map(label => (
                  <th key={label} scope="col" style={{ padding: '10px 14px', borderBottom: `1px solid ${c.borderLight}`, color: c.muted, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {personnel.length === 0
                ? <tr><td colSpan={4} style={{ padding: 20, color: c.muted, textAlign: 'center' }}>No registered users.</td></tr>
                : personnelPagination.records.map(person => {
                    const vouchers = voucherMap.get(Number(person.id)) || []
                    const clearedCount = vouchers.filter(voucher => voucher.status === 'approved').length
                    const allCleared = vouchers.length > 0 && clearedCount === vouchers.length
                    const clearanceColor = vouchers.length === 0 ? c.muted : allCleared ? c.greenBar : c.amber
                    return (
                      <tr key={person.id}>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, fontWeight: 500, whiteSpace: 'nowrap' }}>{person.first_name} {person.last_name}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}` }}>{person.role}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, minWidth: 180 }}>
                          <span style={{ color: clearanceColor, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {vouchers.length === 0 ? 'No vouchers' : `${clearedCount} of ${vouchers.length} cleared`}
                          </span>
                        </td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}` }}>
                          <button type="button" onClick={() => setSelectedPerson(person)}
                            style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 9px', background: c.surface, color: c.link, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            View receipts
                          </button>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
        <Pagination pagination={personnelPagination} />
      </Panel>
      {selectedPerson && (
        <Modal title={`${selectedPerson.first_name} ${selectedPerson.last_name} · Receipt history`} onClose={() => setSelectedPerson(null)} width={900}>
          {selectedVouchers.length === 0
            ? <EmptyState>No vouchers or receipts are linked to this person.</EmptyState>
            : <div>
                {receiptPagination.records.map(voucher => {
                  const cleared = voucher.status === 'approved'
                  const label = cleared ? 'Cleared' : statusLabel(voucher)
                  const statusColor = cleared ? c.greenBar : voucher.status === 'flagged' || label === 'Receipt overdue' ? c.overdue : c.amber
                  return (
                    <div key={voucher.id} style={{ padding: '12px 0', borderTop: `1px solid ${c.borderLight}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <strong>{voucher.voucher_number} · {voucher.project}</strong>
                        <span style={{ color: statusColor, whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                      <div style={{ marginTop: 3, color: c.muted, fontSize: 12 }}>
                        {voucher.purpose} · Released {formatDate(voucher.released_on)} · {money(voucher.amount)}
                      </div>
                      {voucher.receipt_vendor
                        ? <div style={{ marginTop: 8, fontSize: 12 }}>
                            <div>{voucher.receipt_vendor}{voucher.receipt_reference && ` · ${voucher.receipt_reference}`}</div>
                            <div style={{ color: c.muted }}>
                              Submitted {formatDate(voucher.receipt_submitted_on)} · {money(voucher.receipt_amount)}
                            </div>
                            {voucher.receipt_note && <div style={{ marginTop: 3, color: c.muted }}>{voucher.receipt_note}</div>}
                            <button type="button" onClick={() => setProofTransaction(voucher)}
                              style={{ marginTop: 6, border: `1px solid ${c.border}`, borderRadius: 4, padding: '5px 8px', background: c.surface, color: c.link, cursor: 'pointer' }}>
                              View Receipt Proof
                            </button>
                            <span style={{ marginLeft: 8, color: c.muted, fontSize: 11 }}>
                              {Number(voucher.has_receipt_proof) === 1 ? (voucher.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}
                            </span>
                          </div>
                        : <div style={{ marginTop: 6, color: c.muted, fontSize: 12 }}>Receipt not submitted.</div>}
                    </div>
                  )
                })}
                <Pagination pagination={receiptPagination} />
              </div>}
        </Modal>
      )}
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)} zIndex={1200} />
    </div>
  )
}

// ─── Audit Trail ──────────────────────────────────────────────────────────────

function AuditPage({ dashboard }) {
  const { audit } = dashboard
  const [search, setSearch] = useState('')
  const query = search.trim().toLocaleLowerCase()
  const filteredAudit = audit.filter(entry => (
    `${entry.actor} ${entry.action} ${entry.detail} ${entry.created_at}`.toLocaleLowerCase().includes(query)
  ))
  const auditPagination = usePagination(filteredAudit, 10, query)
  return (
    <div>
      <PageHeader title="Activity & Audit Log" sub="Append-only records of financial decisions and account administration activity." />
      <Panel>
        <PanelHeader title="Activity" right={`${filteredAudit.length} of ${audit.length} entries`} />
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.borderLight}` }}>
          <label htmlFor="audit-search" style={{ display: 'block', marginBottom: 6, color: c.muted, fontSize: 12 }}>Search activity</label>
          <input id="audit-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value)
            auditPagination.setPage(1)
          }}
            placeholder="Search by user, activity, details, or date"
            style={{ width: '100%', maxWidth: 420, padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }} />
        </div>
        {filteredAudit.length === 0
          ? <EmptyState>{audit.length === 0 ? 'No activity has been recorded.' : 'No activity matches your search.'}</EmptyState>
          : auditPagination.records.map(e => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '14px 20px', borderTop: `1px solid ${c.borderLight}`, gap: 16 }}>
            <span style={{ fontSize: 12, color: c.muted, paddingTop: 1 }}>{new Date(`${e.created_at}Z`).toLocaleString('en-PH')}</span>
            <div>
              <span style={{ fontWeight: 500 }}>{e.actor}</span>
              <span style={{ color: e.action.includes('Flagged') ? c.overdue : c.link }}> · {e.action}</span>
              <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{e.detail}</div>
            </div>
          </div>
        ))}
        <Pagination pagination={auditPagination} />
      </Panel>
    </div>
  )
}

function AccountManagementPage({ accounts, onSubmit, busy, currentUser }) {
  const [search, setSearch] = useState('')
  const statusLabels = {
    pending: 'Pending Approval',
    approved: 'Approved',
    disapproved: 'Disapproved',
  }
  const statusColors = {
    pending: c.amber,
    approved: c.greenBar,
    disapproved: c.overdue,
  }
  const query = search.trim().toLowerCase()
  const filteredAccounts = accounts.filter(account => (
    `${account.first_name} ${account.last_name} ${account.email} ${account.role} ${statusLabels[account.status] || account.status}`
      .toLowerCase()
      .includes(query)
  ))
  const accountPagination = usePagination(filteredAccounts, 10, query)

  return (
    <div>
      <PageHeader title="Account Management" sub="Review registrations, assign one of the approved system roles, and manage account status." />
      <Panel>
        <PanelHeader title="Registered accounts" right={`${filteredAccounts.length} of ${accounts.length} account(s)`} />
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.borderLight}` }}>
          <label htmlFor="account-search" style={{ display: 'block', marginBottom: 6, color: c.muted, fontSize: 12 }}>Search accounts</label>
          <input id="account-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value)
            accountPagination.setPage(1)
          }}
            placeholder="Search by name, email, role, or status"
            style={{ width: '100%', maxWidth: 420, padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                {['Name', 'Email Address', 'Assigned Role', 'Account Status', 'Registration Date', 'Actions'].map(label => (
                  <th key={label} scope="col" style={{ padding: '10px 14px', borderBottom: `1px solid ${c.borderLight}`, color: c.muted, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0
                ? <tr><td colSpan={6} style={{ padding: 20, color: c.muted, textAlign: 'center' }}>{accounts.length === 0 ? 'No registered accounts.' : 'No accounts match your search.'}</td></tr>
                : accountPagination.records.map(account => {
                    const isCurrentUser = Number(account.id) === Number(currentUser.id)
                    return (
                      <tr key={account.id}>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, fontWeight: 500, whiteSpace: 'nowrap' }}>{account.first_name} {account.last_name}{isCurrentUser ? ' (you)' : ''}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, color: c.muted }}>{account.email}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}` }}>{account.role}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}` }}>
                          <span style={{ display: 'inline-block', padding: '4px 9px', border: `1px solid ${statusColors[account.status] || c.border}`, borderRadius: 20, color: statusColors[account.status] || c.muted, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {statusLabels[account.status] || account.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, color: c.muted, whiteSpace: 'nowrap' }}>
                          {new Date(`${String(account.created_at).replace(' ', 'T')}Z`).toLocaleString('en-PH')}
                        </td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, minWidth: 250 }}>
                          {isCurrentUser
                            ? <span style={{ color: c.muted, fontSize: 12 }}>Your own account cannot be changed here.</span>
                            : <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {account.status !== 'approved' && (
                                  <button type="button" disabled={busy} onClick={() => onSubmit('account', { operation: 'approve', account_id: account.id })}
                                    style={{ padding: '7px 11px', border: 'none', borderRadius: 4, background: c.greenBar, color: c.white, cursor: busy ? 'wait' : 'pointer' }}>
                                    Approve
                                  </button>
                                )}
                                {account.status !== 'disapproved' && (
                                  <button type="button" disabled={busy} onClick={() => onSubmit('account', { operation: 'disapprove', account_id: account.id })}
                                    style={{ padding: '7px 11px', border: `1px solid ${c.overdue}`, borderRadius: 4, background: c.white, color: c.overdue, cursor: busy ? 'wait' : 'pointer' }}>
                                    Disapprove
                                  </button>
                                )}
                                <details style={{ flexBasis: '100%' }}>
                                  <summary style={{ cursor: 'pointer', color: c.link, fontSize: 12 }}>Edit account details</summary>
                                  <form onSubmit={event => submitForm(event, onSubmit, 'account', currentUser.first_name + ' ' + currentUser.last_name)} style={{ paddingTop: 12 }}>
                                    <input type="hidden" name="operation" value="update" />
                                    <input type="hidden" name="account_id" value={account.id} />
                                    <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                      <ApiField label="First name" name="first_name" id={`account-${account.id}-first`} defaultValue={account.first_name} />
                                      <ApiField label="Last name" name="last_name" id={`account-${account.id}-last`} defaultValue={account.last_name} />
                                      <ApiField label="Email address" name="email" id={`account-${account.id}-email`} type="email" defaultValue={account.email} />
                                      <div>
                                        <label htmlFor={`account-${account.id}-role`} style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>Assigned role</label>
                                        <select id={`account-${account.id}-role`} name="role" required defaultValue={account.role} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}>
                                          {['User', 'Auditor', 'Treasurer', 'Admin'].map(role => <option key={role} value={role}>{role}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label htmlFor={`account-${account.id}-status`} style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>Account status</label>
                                        <select id={`account-${account.id}-status`} name="status" required defaultValue={account.status} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}>
                                          <option value="pending">Pending Approval</option>
                                          <option value="approved">Approved</option>
                                          <option value="disapproved">Disapproved</option>
                                        </select>
                                      </div>
                                    </div>
                                    <button type="submit" disabled={busy} style={{ padding: '8px 13px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
                                      {busy ? 'Saving…' : 'Save account changes'}
                                    </button>
                                  </form>
                                </details>
                              </div>}
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>
        <Pagination pagination={accountPagination} />
      </Panel>
    </div>
  )
}

// ─── Sidebar Navigation ───────────────────────────────────────────────────────

// This controls visible navigation only; the PHP API enforces authorization for every write.
const ROLE_PAGES = {
  User: ['overview', 'funds', 'disbursements', 'liquidation', 'archive'],
  Auditor: ['overview', 'funds', 'disbursements', 'liquidation', 'review', 'archive', 'audit'],
  Treasurer: ['overview', 'funds', 'disbursements', 'release', 'liquidation', 'archive', 'personnel'],
  Admin: ['overview', 'funds', 'disbursements', 'release', 'liquidation', 'review', 'archive', 'personnel', 'audit', 'accounts'],
}

const NAV_SECTIONS = [
  { label: 'Ledger', items: [{ id: 'overview', label: 'Overview' }, { id: 'funds', label: 'Funds received' }, { id: 'disbursements', label: 'Disbursements' }] },
  { label: 'Operations', items: [{ id: 'release', label: 'Release funds' }, { id: 'liquidation', label: 'Liquidation' }] },
  { label: 'Accountability', items: [{ id: 'review', label: 'Review queue' }, { id: 'archive', label: 'Financial reports' }, { id: 'personnel', label: 'Personnel' }, { id: 'audit', label: 'Activity & Audit Log' }] },
  { label: 'Admin', items: [{ id: 'accounts', label: 'Account Management' }] },
]

function Sidebar({ page, summary, role, open, onNavigate }) {
  const allowedPages = ROLE_PAGES[role] || []
  const navSection = (label, items) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: c.faint, padding: '0 16px', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      {items.map(item => {
        const active = page === item.id
        return (
          <button key={item.id} onClick={() => onNavigate(item.id)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              width: '100%', padding: '7px 16px', textAlign: 'left', border: 'none', cursor: 'pointer',
              background: active ? c.primary : 'transparent',
              color: active ? c.primaryText : item.faint ? c.faint : c.chromeText,
              fontSize: 13, borderRadius: 0,
            }}>
            {item.label}
            {item.id === 'liquidation' && summary?.outstanding_count > 0 && (
              <span style={{ background: c.badge, color: c.onDark, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                {summary.outstanding_count}
              </span>
            )}
            {item.id === 'review' && summary?.review_count > 0 && (
              <span style={{ background: c.badge, color: c.onDark, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                {summary.review_count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )

  return (
    <aside id="main-navigation" className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      {NAV_SECTIONS.map(section => {
        const items = section.items.filter(item => allowedPages.includes(item.id))
        return items.length ? <div key={section.label}>{navSection(section.label, items)}</div> : null
      })}
    </aside>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [csrfToken, setCsrfToken] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const initialAuthRequest = useRef(null)

  useEffect(() => {
    let active = true
    if (!initialAuthRequest.current) initialAuthRequest.current = loadAuthState()
    async function initialize() {
      try {
        const session = await initialAuthRequest.current
        if (!active) return
        setCsrfToken(session.csrf_token)
        setUser(session.user)
        if (session.user) {
          try {
            setDashboard(await loadDashboard())
          } catch (loadError) {
            if (loadError.status === 401) {
              setUser(null)
              setAuthError('Your session has ended. Please sign in again.')
              const anonymousSession = await loadAuthState()
              setCsrfToken(anonymousSession.csrf_token)
            } else {
              setError(loadError.message)
            }
          }
        }
      } catch (loadError) {
        if (active) setAuthError(loadError.message)
      }
    }
    initialize()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!sidebarOpen) return undefined
    const closeOnEscape = event => {
      if (event.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [sidebarOpen])

  async function handleLogin(values) {
    setAuthBusy(true)
    setAuthError('')
    setAuthSuccess('')
    try {
      const result = await postAuthAction('login', values, csrfToken)
      setCsrfToken(result.csrf_token)
      setUser(result.user)
      setPage('overview')
      setError('')
      setSuccess('')
      try {
        setDashboard(await loadDashboard())
      } catch (loadError) {
        setDashboard(null)
        if (loadError.status === 401) {
          setUser(null)
          await retryAuthentication()
          setAuthError('Your session has ended. Please sign in again.')
        } else {
          setError(loadError.message)
        }
      }
    } catch (loginError) {
      if (loginError.status === 401) {
        setUser(null)
        setDashboard(null)
      }
      setAuthError(loginError.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleRegister(values) {
    setAuthBusy(true)
    setAuthError('')
    setAuthSuccess('')
    try {
      await postAuthAction('register', values, csrfToken)
      setAuthSuccess('Registration submitted. Your account is pending Admin approval before you can sign in.')
      return true
    } catch (registrationError) {
      setAuthError(registrationError.message)
      return false
    } finally {
      setAuthBusy(false)
    }
  }

  async function retryAuthentication() {
    setAuthError('')
    try {
      const session = await loadAuthState()
      setCsrfToken(session.csrf_token)
      setUser(session.user)
      if (session.user) {
        try {
          setDashboard(await loadDashboard())
          setError('')
        } catch (loadError) {
          if (loadError.status === 401) {
            setUser(null)
            setAuthError(loadError.message)
          } else {
            setError(loadError.message)
          }
        }
      }
    } catch (loadError) {
      setAuthError(loadError.message)
    }
  }

  async function handleLogout() {
    setBusy(true)
    setError('')
    try {
      await postAuthAction('logout', {}, csrfToken)
      setUser(null)
      setDashboard(null)
      setPage('overview')
      setSuccess('')
      setAuthError('')
      try {
        const session = await loadAuthState()
        setCsrfToken(session.csrf_token)
      } catch (sessionError) {
        setCsrfToken('')
        setAuthError(`You have been logged out. ${sessionError.message}`)
      }
    } catch (logoutError) {
      if (logoutError.status === 401) {
        setUser(null)
        setDashboard(null)
        await retryAuthentication()
      } else {
        setError(logoutError.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const role = user?.role
  const allowedPages = ROLE_PAGES[role] || ROLE_PAGES.User
  const currentPage = allowedPages.includes(page) ? page : 'overview'

  function navigate(nextPage) {
    if (allowedPages.includes(nextPage)) {
      setPage(nextPage)
      setSidebarOpen(false)
      setError('')
      setSuccess('')
    }
  }

  async function handleSessionExpired(message) {
    setUser(null)
    setDashboard(null)
    setPage('overview')
    setAuthError(message)
    try {
      const session = await loadAuthState()
      setCsrfToken(session.csrf_token)
      setAuthError(message)
    } catch (sessionError) {
      setCsrfToken('')
      setAuthError(`${message} ${sessionError.message}`)
    }
  }

  async function handleSubmit(action, values) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const result = await postAction(action, values, csrfToken)
      setSuccess(result.voucher_number ? `Funds released as ${result.voucher_number}.` : 'Your change has been saved.')
      try {
        setDashboard(await loadDashboard())
      } catch (refreshError) {
        if (refreshError.status === 401) handleSessionExpired(refreshError.message)
        else setError(`Saved successfully, but the latest ledger could not be loaded: ${refreshError.message}`)
      }
      return true
    } catch (submitError) {
      if (submitError.status === 401) handleSessionExpired(submitError.message)
      else setError(submitError.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleReview(action, values) {
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      await postAction(action, values, csrfToken)
      setSuccess(values.decision === 'approve' ? 'The transaction was approved.' : values.decision === 'resolve' ? 'The flagged transaction was resolved.' : 'The discrepancy was flagged.')
      try {
        setDashboard(await loadDashboard())
      } catch (refreshError) {
        if (refreshError.status === 401) handleSessionExpired(refreshError.message)
        else setError(`Saved successfully, but the latest ledger could not be loaded: ${refreshError.message}`)
      }
      return true
    } catch (reviewError) {
      if (reviewError.status === 401) handleSessionExpired(reviewError.message)
      else setError(reviewError.message)
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!user) {
    return <AuthPage csrfToken={csrfToken} busy={authBusy} error={authError} success={authSuccess} onLogin={handleLogin} onRegister={handleRegister} onRetry={retryAuthentication} />
  }

  const pageContent = !dashboard
    ? <div style={{ color: c.muted }}>{error ? 'Ledger data is unavailable.' : 'Loading ledger…'}</div>
    : {
        overview: <OverviewPage dashboard={dashboard} />,
        funds: <FundsPage dashboard={dashboard} onSubmit={handleSubmit} busy={busy} actor={`${user.first_name} ${user.last_name}`} canManage={['Treasurer', 'Admin'].includes(role)} />,
        disbursements: <DisbursementsPage dashboard={dashboard} />,
        release: <ReleasePage dashboard={dashboard} onSubmit={handleSubmit} busy={busy} actor={`${user.first_name} ${user.last_name}`} />,
        liquidation: <LiquidationPage dashboard={dashboard} onSubmit={handleSubmit} busy={busy} actor={`${user.first_name} ${user.last_name}`} canSubmitReceipt={['Treasurer', 'Admin'].includes(role)} />,
        review: <ReviewPage dashboard={dashboard} onSubmit={handleReview} busy={busy} actor={`${user.first_name} ${user.last_name}`} />,
        archive: <ArchivePage dashboard={dashboard} />,
        personnel: <PersonnelPage dashboard={dashboard} />,
        audit: <AuditPage dashboard={dashboard} />,
        accounts: <AccountManagementPage accounts={dashboard.accounts} onSubmit={handleSubmit} busy={busy} currentUser={user} />,
      }[currentPage]

  return (
    <div className="app-shell" style={{ minHeight: '100vh', background: c.bg }}>
      <header className="app-header" style={{ color: c.chromeText, borderBottom: `1px solid ${c.border}` }}>
        <div className="header-left">
          <button type="button" className="menu-btn" aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={sidebarOpen} aria-controls="main-navigation" onClick={() => setSidebarOpen(isOpen => !isOpen)}>
            <span aria-hidden="true">{sidebarOpen ? '×' : '☰'}</span>
          </button>
          <div style={{ border: `1.5px solid ${c.chromeText}`, padding: '3px 7px', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' }}>DTL</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Digital Treasury Ledger</div>
            <div className="brand-sub" style={{ color: c.faint }}>Disbursement tracking &amp; accountability</div>
          </div>
        </div>
        <div className="header-right">
          <div style={{ textAlign: 'right' }}>
            <div className="user-name">{user.first_name} {user.last_name}</div>
            <div className="signed-label" style={{ color: c.faint }}>{user.role} · {user.email}</div>
          </div>
          <button type="button" onClick={handleLogout} disabled={busy}
            style={{ padding: '6px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.primary, color: c.primaryText, fontSize: 12, cursor: busy ? 'wait' : 'pointer' }}>
            {busy ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      </header>

      <div className="app-body">
        <button type="button" className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`} aria-label="Close navigation menu"
          tabIndex={sidebarOpen ? 0 : -1} onClick={() => setSidebarOpen(false)} />
        <Sidebar page={currentPage} onNavigate={navigate} summary={dashboard?.summary} role={role} open={sidebarOpen} />
        <main className="main">
          {error && <div role="alert" style={{ marginBottom: 16, padding: '12px 16px', background: '#fdf2f2', border: '1px solid #e8c4c4', borderRadius: 4, color: c.overdue }}>
            {error}
            {!dashboard && <button type="button" onClick={async () => {
              setError('')
              try {
                setDashboard(await loadDashboard())
              } catch (loadError) {
                if (loadError.status === 401) handleSessionExpired(loadError.message)
                else setError(loadError.message)
              }
            }} style={{ marginLeft: 12, border: 'none', background: 'transparent', color: c.link, cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>}
          </div>}
          {success && <div role="status" style={{ marginBottom: 16, padding: '12px 16px', background: '#eff8f0', border: '1px solid #b7d8bd', borderRadius: 4, color: c.greenBar }}>{success}</div>}
          {pageContent}
        </main>
      </div>
    </div>
  )
}