import { useState } from 'react'

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
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 20px', borderBottom: `1px solid ${c.border}`,
    }}>
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontWeight: 400, color: c.text }}>{title}</span>
      {right && <span style={{ fontSize: 12, color: c.muted }}>{right}</span>}
    </div>
  )
}

function TableHead({ cols }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
      {cols.map(col => (
        <span key={col} style={{ fontSize: 12, color: c.muted, fontWeight: 400 }}>{col}</span>
      ))}
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

function Input({ label, placeholder, type = 'text', hint }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>{label}</label>
      <input type={type} placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`,
          borderRadius: 4, background: c.surface, color: c.text, outline: 'none',
        }} />
      {hint && <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>{hint}</p>}
    </div>
  )
}

function Btn({ children, primary, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '9px 18px', borderRadius: 4, border: 'none', cursor: 'pointer',
      background: primary ? c.primary : 'transparent',
      color: primary ? c.primaryText : c.muted,
      fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
    }}>
      {children}
    </button>
  )
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewPage() {
  return (
    <div>
      <PageHeader
        title="Where the money stands today"
        sub="Every peso released is tied to a person and a seven-day clock. Nothing closes until a receipt is in, reviewed, and filed under its project."
      />

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
        {[
          { label: 'Cash on hand', value: '₱349,450.00', sub: '₱505,000.00 recorded, ₱155,550.00 released', color: c.text },
          { label: 'Released but not yet liquidated', value: '₱117,450.00', sub: '5 open transaction(s)', color: c.amber },
          { label: 'Past the deadline', value: '₱18,400.00', sub: '1 receipt(s) overdue · 1 person(s) on hold', color: c.overdue },
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
          {['Voucher', 'Held by', 'Amount', 'Released', 'Time left'].map(h => (
            <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr', padding: '16px 20px', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 500, color: c.text }}>Printing of modules</div>
            <div style={{ fontSize: 11, color: c.muted }}>DV-2026-027 · Community Outreach</div>
          </div>
          <span style={{ color: c.text }}>Rafael Ocampo</span>
          <span style={{ fontWeight: 500 }}>₱18,400.00</span>
          <span style={{ color: c.muted }}>Sep 6, 2026</span>
          <DeadlineBar label="4 day(s) overdue" pct={100} overdue />
        </div>
      </Panel>

      {/* Waiting on auditor */}
      <Panel>
        <PanelHeader title="Waiting on the auditor" right="2 transaction(s) with receipts submitted" />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
          {['Voucher', 'Receipt', 'Released', 'Receipted', 'Status'].map(h => (
            <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
          ))}
        </div>
        {[
          { voucher: 'Speaker honoraria, 3 sessions', dv: 'DV-2026-023 · Dana Quiambao', receipt: 'Acknowledgement receipts, 3 pcs', rcptFile: 'AR-batch-03.pdf', released: '₱45,000.00', receipted: '₱45,000.00', status: 'For review' },
          { voucher: 'Catering, congress day 1', dv: 'DV-2026-024 · Ken Abellera', receipt: 'Lola Ising Kitchen', rcptFile: 'OR-55902.pdf', released: '₱36,800.00', receipted: '₱41,200.00', status: 'Flagged', diff: true },
        ].map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '14px 20px', alignItems: 'start', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
            <div>
              <div style={{ fontWeight: 500 }}>{r.voucher}</div>
              <div style={{ fontSize: 11, color: c.muted }}>{r.dv}</div>
            </div>
            <div>
              <div>{r.receipt}</div>
              <div style={{ fontSize: 11, color: c.muted }}>{r.rcptFile}</div>
            </div>
            <span>{r.released}</span>
            <span style={{ color: r.diff ? c.overdue : c.text, fontWeight: r.diff ? 500 : 400 }}>{r.receipted}</span>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <StatusDot status={r.status} />
              <span style={{ color: r.status === 'Flagged' ? c.flagged : c.review, fontSize: 13 }}>{r.status}</span>
            </span>
          </div>
        ))}
      </Panel>

      <div style={{ textAlign: 'center', marginTop: 32 }}>
        <div style={{ display: 'inline-block', background: c.primary, color: c.primaryText, padding: '10px 24px', borderRadius: 4, fontSize: 13, fontWeight: 500 }}>
          Viewing as Treasurer
        </div>
      </div>
    </div>
  )
}
