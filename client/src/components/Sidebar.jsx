import { NAV_SECTIONS, ROLE_PAGES } from '../config/navigation';
export default function Sidebar({ page, summary, role, open, onNavigate, }) {
    const allowedPages = ROLE_PAGES[role];
    const navSection = (label, items) => (<div className="component-nav-section">
      <div className="component-nav-section-label">{label}</div>
      {items.map(item => {
            const active = page === item.id;
            return (<button key={item.id} className={`component-nav-link${active ? ' is-active' : ''}${item.faint ? ' is-faint' : ''}`} onClick={() => onNavigate(item.id)}>
            {item.label}
            {item.id === 'liquidation' && summary && summary.outstanding_count > 0 && (<span className="component-nav-badge">
                {summary.outstanding_count}
              </span>)}
            {item.id === 'review' && summary && summary.review_count > 0 && (<span className="component-nav-badge">
                {summary.review_count}
              </span>)}
          </button>);
        })}
    </div>);
    return (<aside id="main-navigation" className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
      {NAV_SECTIONS.map(section => {
            const items = section.items.filter(item => allowedPages.includes(item.id));
            return items.length ? <div key={section.label}>{navSection(section.label, items)}</div> : null;
        })}
    </aside>);
}
// ─── Root ─────────────────────────────────────────────────────────────────────
