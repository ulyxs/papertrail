export default function Navbar({ account, sidebarOpen, busy, onToggleSidebar, onLogout, }) {
    return (<header className="app-header">
      <div className="header-left">
        <button type="button" className="menu-btn" aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={sidebarOpen} aria-controls="main-navigation" onClick={onToggleSidebar}>
          <span aria-hidden="true">{sidebarOpen ? '×' : '☰'}</span>
        </button>
        <div className="component-brand-mark">DTL</div>
        <div>
          <div className="component-brand-title">Digital Treasury Ledger</div>
          <div className="brand-sub">Disbursement tracking &amp; accountability</div>
        </div>
      </div>
      <div className="header-right">
        <div className="component-account-summary">
          <div className="user-name">{account.first_name} {account.last_name}</div>
          <div className="signed-label component-signed-label">{account.role} · {account.email}</div>
        </div>
        <button type="button" className="component-logout-button" onClick={onLogout} disabled={busy}>
          {busy ? 'Logging out…' : 'Logout'}
        </button>
      </div>
    </header>);
}
