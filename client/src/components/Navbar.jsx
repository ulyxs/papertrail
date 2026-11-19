export default function Navbar({ account, sidebarOpen, busy, onToggleSidebar, onLogout, }) {
    return (<header className="app-header">
      <div className="header-left">
        <button type="button" className="menu-btn" aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={sidebarOpen} aria-controls="main-navigation" onClick={onToggleSidebar}>
          <span aria-hidden="true">{sidebarOpen ? '×' : '☰'}</span>
        </button>
        <img className="component-brand-mark" src="/papertrail-logo.png" alt="" />
        <div>
          <div className="component-brand-title">Papertrail</div>
          <div className="brand-sub">Ledger Tracking &amp; Management</div>
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
