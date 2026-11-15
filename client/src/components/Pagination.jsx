import { c } from '../config/theme';
export default function Pagination({ pagination }) {
    const { page, pageCount, total, pageSize, setPage } = pagination;
    if (total === 0)
        return null;
    const firstPage = Math.max(1, page - 2);
    const lastPage = Math.min(pageCount, page + 2);
    const pages = [];
    for (let number = firstPage; number <= lastPage; number += 1)
        pages.push(number);
    const buttonStyle = {
        minWidth: 32,
        height: 32,
        padding: '0 8px',
        border: `1px solid ${c.border}`,
        borderRadius: 4,
        background: c.white,
        color: c.text,
        cursor: 'pointer',
    };
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return (<nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 18px', borderTop: `1px solid ${c.borderLight}` }}>
      <span style={{ color: c.muted, fontSize: 12 }}>Showing {start}–{end} of {total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button type="button" onClick={() => setPage(page - 1)} disabled={page === 1} style={{ ...buttonStyle, opacity: page === 1 ? 0.5 : 1, cursor: page === 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
        {firstPage > 1 && <>
          <button type="button" onClick={() => setPage(1)} style={buttonStyle} aria-label="Page 1">1</button>
          {firstPage > 2 && <span style={{ padding: '0 3px', color: c.muted }}>…</span>}
        </>}
        {pages.map(number => (<button key={number} type="button" onClick={() => setPage(number)} aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined} style={{ ...buttonStyle, background: page === number ? c.primary : c.white, color: page === number ? c.primaryText : c.text, fontWeight: page === number ? 600 : 400 }}>
            {number}
          </button>))}
        {lastPage < pageCount && <>
          {lastPage < pageCount - 1 && <span style={{ padding: '0 3px', color: c.muted }}>…</span>}
          <button type="button" onClick={() => setPage(pageCount)} style={buttonStyle} aria-label={`Page ${pageCount}`}>{pageCount}</button>
        </>}
        <button type="button" onClick={() => setPage(page + 1)} disabled={page === pageCount} style={{ ...buttonStyle, opacity: page === pageCount ? 0.5 : 1, cursor: page === pageCount ? 'not-allowed' : 'pointer' }}>Next</button>
      </div>
    </nav>);
}
// ─── Overview ────────────────────────────────────────────────────────────────
