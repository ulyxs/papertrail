import { c } from '../config/theme';
export default function Navbar({ account, sidebarOpen, busy, onToggleSidebar, onLogout, }) {
    return (<header className="app-header" style={{ color: c.chromeText, borderBottom: `1px solid ${c.border}` }}>
      <div className="header-left">
        <button type="button" className="menu-btn" aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={sidebarOpen} aria-controls="main-navigation" onClick={onToggleSidebar}>
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
          <div className="user-name">{account.first_name} {account.last_name}</div>
          <div className="signed-label" style={{ color: c.faint }}>{account.role} · {account.email}</div>
        </div>
        <button type="button" onClick={onLogout} disabled={busy} style={{ padding: '6px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.primary, color: c.primaryText, fontSize: 12, cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </header>);
}
