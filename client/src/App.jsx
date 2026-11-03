// import { useState } from 'react'
// import heroImg from './assets/hero.png'
// import reactLogo from './assets/react.svg'
// import viteLogo from './assets/vite.svg'
import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <section id="center">
//         <div className="hero">
//           <img src={heroImg} className="base" width="170" height="179" alt="" />
//           <img src={reactLogo} className="framework" alt="React logo" />
//           <img src={viteLogo} className="vite" alt="Vite logo" />
//         </div>
//         <div>
//           <h1>Get started</h1>
//           <p>
//             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
//           </p>
//         </div>
//         <button
//           type="button"
//           className="counter"
//           onClick={() => setCount((count) => count + 1)}
//         >
//           Count is {count}
//         </button>
//       </section>

//       <div className="ticks"></div>

//       <section id="next-steps">
//         <div id="docs">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#documentation-icon"></use>
//           </svg>
//           <h2>Documentation</h2>
//           <p>Your questions, answered</p>
//           <ul>
//             <li>
//               <a href="https://vite.dev/" target="_blank">
//                 <img className="logo" src={viteLogo} alt="" />
//                 Explore Vite
//               </a>
//             </li>
//             <li>
//               <a href="https://react.dev/" target="_blank">
//                 <img className="button-icon" src={reactLogo} alt="" />
//                 Learn more
//               </a>
//             </li>
//           </ul>
//         </div>
//         <div id="social">
//           <svg className="icon" role="presentation" aria-hidden="true">
//             <use href="/icons.svg#social-icon"></use>
//           </svg>
//           <h2>Connect with us</h2>
//           <p>Join the Vite community</p>
//           <ul>
//             <li>
//               <a href="https://github.com/vitejs/vite" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#github-icon"></use>
//                 </svg>
//                 GitHub
//               </a>
//             </li>
//             <li>
//               <a href="https://chat.vite.dev/" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#discord-icon"></use>
//                 </svg>
//                 Discord
//               </a>
//             </li>
//             <li>
//               <a href="https://x.com/vite_js" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#x-icon"></use>
//                 </svg>
//                 X.com
//               </a>
//             </li>
//             <li>
//               <a href="https://bsky.app/profile/vite.dev" target="_blank">
//                 <svg
//                   className="button-icon"
//                   role="presentation"
//                   aria-hidden="true"
//                 >
//                   <use href="/icons.svg#bluesky-icon"></use>
//                 </svg>
//                 Bluesky
//               </a>
//             </li>
//           </ul>
//         </div>
//       </section>

//       <div className="ticks"></div>
//       <section id="spacer"></section>
//     </>
//   )
// }

import { useState, useEffect } from 'react'

// ─── Design tokens ────────────────────────────────────────────────────────────

const c = {
  bg: 'var(--color-bg)',
  surface: 'var(--color-surface)',
  white: 'var(--color-white)',
  border: 'var(--color-border)',
  borderLight: 'var(--color-border-light)',
  text: 'var(--color-text)',
  muted: 'var(--color-text-muted)',
  faint: 'var(--color-text-faint)',
  link: 'var(--color-link)',
  badge: 'var(--color-badge)',
  overdue: 'var(--color-overdue)',
  flagged: 'var(--color-flagged)',
  review: 'var(--color-review)',
  amber: 'var(--color-amber)',
  greenBar: 'var(--color-green-bar)',
  redBar: 'var(--color-red-bar)',
  onDark: 'var(--color-on-dark)',
  chrome: 'var(--color-chrome)',
  chromeText: 'var(--color-chrome-text)',
  primary: 'var(--color-primary)',
  primaryText: 'var(--color-primary-text)',
}

// ─── General UI ────────────────────────────────────────────────────────────────

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
      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 6,
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

// ─── Overview / Landing Page ────────────────────────────────────────────────────────────────

function OverviewPage() {
  return (
    <div>
      <PageHeader
        title="Where the money stands today"
        sub="Every peso released is tied to a person and a seven-day clock. Nothing closes until a receipt is in, reviewed, and filed under its project."
      />

      {/* Stat cards */}
      <div className="stat-grid">
        {[
          { label: 'Cash on hand', value: '₱00.00', sub: '₱00.00 recorded, ₱00.00 released', color: c.text },
          { label: 'Released but not yet liquidated', value: '₱00.00', sub: '0 open transaction(s)', color: c.amber },
          { label: 'Past the deadline', value: '₱00.00', sub: '0 receipt(s) overdue · 0 person(s) on hold', color: c.overdue },
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
        <div className="table-scroll">
          <div className="row-clock" style={{ padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
            {['Voucher', 'Held by', 'Amount', 'Released', 'Time left'].map(h => (
              <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
            ))}
          </div>
          <div className="row-clock" style={{ padding: '16px 20px', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 500, color: c.text }}>Printing of modules</div>
              <div style={{ fontSize: 11, color: c.muted }}>DV-2026-027 · Community Outreach</div>
            </div>
            <span style={{ color: c.text }}>Rafael Ocampo</span>
            <span style={{ fontWeight: 500 }}>₱00.00</span>
            <span style={{ color: c.muted }}>Sep 6, 2026</span>
            <DeadlineBar label="4 day(s) overdue" pct={100} overdue />
          </div>
        </div>
      </Panel>

      {/* Waiting on auditor */}
      <Panel>
        <PanelHeader title="Waiting on the auditor" right="2 transaction(s) with receipts submitted" />
        <div className="table-scroll">
          <div className="row-audit" style={{ padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
            {['Voucher', 'Receipt', 'Released', 'Receipted', 'Status'].map(h => (
              <span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>
            ))}
          </div>
          {[
            { voucher: 'Speaker honoraria, 3 sessions', dv: 'DV-2026-023 · Dana Quiambao', receipt: 'Acknowledgement receipts, 3 pcs', rcptFile: 'AR-batch-03.pdf', released: '₱00.00', receipted: '₱00.00', status: 'For review' },
            { voucher: 'Catering, congress day 1', dv: 'DV-2026-024 · Ken Abellera', receipt: 'Lola Ising Kitchen', rcptFile: 'OR-55902.pdf', released: '₱00.00', receipted: '₱00.00', status: 'Flagged', diff: true },
          ].map((r, i) => (
            <div key={i} className="row-audit" style={{ padding: '14px 20px', alignItems: 'start', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
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
        </div>
      </Panel>
    </div>
  )
}

// ─── Side Navbar ──────────────────────────────────────────────────────────────────

const NAV = [
  { section: 'LEDGER', items: [
    { id: 'overview', label: 'Overview' },
    { id: 'funds', label: 'Funds received' },
    { id: 'disbursements', label: 'Disbursements' },
  ]},
  { section: 'ACTIONS', items: [
    { id: 'release', label: 'Release funds' },
    { id: 'liquidation', label: 'Liquidation', badge: 1 },
  ]},
  { section: 'ACCOUNTABILITY', items: [
    { id: 'review', label: 'Review queue', badge: 2 },
    { id: 'archive', label: 'Archive' },
    { id: 'personnel', label: 'Personnel' },
    { id: 'audit', label: 'Audit trail' },
  ]},
]

function Sidebar({ page, onNavigate, open }) {
  return (
    <nav className={`sidebar${open ? ' open' : ''}`}>
      {NAV.map(group => (
        <div key={group.section} style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, letterSpacing: 1, color: c.faint, padding: '0 20px 8px' }}>{group.section}</div>
          {group.items.map(item => {
            const active = page === item.id
            return (
              <div key={item.id} onClick={() => onNavigate(item.id)}
                style={{
                  padding: '10px 20px', cursor: 'pointer', fontSize: 14,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: active ? c.surface : 'transparent',
                  color: active ? c.text : c.chromeText,
                }}>
                <span>{item.label}</span>
                {item.badge && (
                  <span style={{ background: c.badge, color: c.onDark, borderRadius: 10, padding: '1px 8px', fontSize: 12 }}>{item.badge}</span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

// ─── Placeholder pages (ilisan ra ni tagsa2) ────────────────────────────

function ComingSoon({ title }) {
  return <PageHeader title={title} sub="heheheh" />
}

function FundsPage() { return <ComingSoon title="Funds received" /> }
function DisbursementsPage() { return <ComingSoon title="Disbursements" /> }
function ReleasePage() { return <ComingSoon title="Release funds" /> }
function LiquidationPage() { return <ComingSoon title="Liquidation" /> }
function ReviewPage() { return <ComingSoon title="Review queue" /> }
function ArchivePage() { return <ComingSoon title="Archive" /> }
function PersonnelPage() { return <ComingSoon title="Personnel" /> }
function AuditPage() { return <ComingSoon title="Audit trail" /> }

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState('overview')
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('theme')
      if (saved) return saved
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Has 4 roles --- idefine pa; for now kani lang sa (role-based access ni)
  const role = 'Treasurer'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  const pages = {
    overview: <OverviewPage />,
    funds: <FundsPage />,
    disbursements: <DisbursementsPage />,
    release: <ReleasePage />,
    liquidation: <LiquidationPage />,
    review: <ReviewPage />,
    archive: <ArchivePage />,
    personnel: <PersonnelPage />,
    audit: <AuditPage />,
  }

  const goTo = id => { setPage(id); setMenuOpen(false) }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-left">
          <button className="menu-btn" onClick={() => setMenuOpen(o => !o)} aria-label="Toggle menu">☰</button>
          <div style={{ border: `1.5px solid ${c.chromeText}`, padding: '3px 7px', fontSize: 13, fontWeight: 600, letterSpacing: '0.02em' }}>DTL</div>
          <div style={{ minWidth: 0 }}>
            <div className="brand-title">Digital Treasury Ledger</div>
            <div className="brand-sub">Disbursement tracking &amp; accountability</div>
          </div>
        </div>

        <div className="header-right">
          <span className="signed-label" style={{ fontSize: 12, color: c.faint }}>Signed in as</span>
          <span style={{ padding: '5px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.primary, color: c.primaryText, fontSize: 13, fontWeight: 500 }}>
            {role}
          </span>
          <button
            onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
            aria-label="Toggle dark mode"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ width: 32, height: 32, border: `1px solid ${c.border}`, borderRadius: 4, background: c.primary, color: c.primaryText, cursor: 'pointer', fontSize: 14 }}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      <div className="app-body">
        <Sidebar page={page} onNavigate={goTo} open={menuOpen} />
        <div className={`sidebar-backdrop${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(false)} />
        <main className="main">
          {pages[page]}
        </main>
      </div>
    </div>
  )
}