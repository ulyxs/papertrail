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
          <div className="signed-label component-signed-label">
            <span>{account.role}</span>
            <span aria-hidden="true"> · </span>
            <span>{account.email}</span>
          </div>
        </div>
        <button type="button" className="component-logout-button" onClick={onLogout} disabled={busy} aria-label="Log out" title="Log out">
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none">
            <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 8l4 4-4 4M8 12h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </header>);
}
