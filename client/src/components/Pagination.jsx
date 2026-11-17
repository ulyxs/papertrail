export default function Pagination({ pagination }) {
    const { page, pageCount, total, pageSize, setPage } = pagination;
    if (total === 0)
        return null;
    const firstPage = Math.max(1, page - 2);
    const lastPage = Math.min(pageCount, page + 2);
    const pages = [];
    for (let number = firstPage; number <= lastPage; number += 1)
        pages.push(number);
    const start = (page - 1) * pageSize + 1;
    const end = Math.min(page * pageSize, total);
    return (<nav className="component-pagination" aria-label="Pagination">
      <span className="component-pagination-summary">Showing {start}–{end} of {total}</span>
      <div className="component-pagination-controls">
        <button type="button" className="component-pagination-button" onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
        {firstPage > 1 && <>
          <button type="button" className="component-pagination-button" onClick={() => setPage(1)} aria-label="Page 1">1</button>
          {firstPage > 2 && <span className="component-pagination-ellipsis">…</span>}
        </>}
        {pages.map(number => (<button key={number} type="button" className="component-pagination-button" onClick={() => setPage(number)} aria-label={`Page ${number}`} aria-current={page === number ? 'page' : undefined}>
            {number}
          </button>))}
        {lastPage < pageCount && <>
          {lastPage < pageCount - 1 && <span className="component-pagination-ellipsis">…</span>}
          <button type="button" className="component-pagination-button" onClick={() => setPage(pageCount)} aria-label={`Page ${pageCount}`}>{pageCount}</button>
        </>}
        <button type="button" className="component-pagination-button" onClick={() => setPage(page + 1)} disabled={page === pageCount}>Next</button>
      </div>
    </nav>);
}
// ─── Overview ────────────────────────────────────────────────────────────────
