import { c } from '../config/theme';
import { NAV_SECTIONS, ROLE_PAGES } from '../config/navigation';
export default function Sidebar({ page, summary, role, open, onNavigate, }) {
    const allowedPages = ROLE_PAGES[role];
    const navSection = (label, items) => (<div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, color: c.faint, padding: '0 16px', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      {items.map(item => {
            const active = page === item.id;
            return (<button key={item.id} onClick={() => onNavigate(item.id)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '7px 16px', textAlign: 'left', border: 'none', cursor: 'pointer',
                    background: active ? c.primary : 'transparent',
                    color: active ? c.primaryText : item.faint ? c.faint : c.chromeText,
                    fontSize: 13, borderRadius: 0,
                }}>
            {item.label}
            {item.id === 'liquidation' && summary && summary.outstanding_count > 0 && (<span style={{ background: c.badge, color: c.onDark, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
                {summary.outstanding_count}
              </span>)}
            {item.id === 'review' && summary && summary.review_count > 0 && (<span style={{ background: c.badge, color: c.onDark, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>
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
