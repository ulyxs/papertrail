export function TableSortHeader({ controls, field, children }) {
    const active = controls.values.sortField === field;
    const indicator = active ? (controls.values.sortDirection === 'asc' ? '↑' : '↓') : '↕';
    return (<button type="button" className="page-audit-sort-button" onClick={() => controls.sortBy(field)} aria-label={`Sort by ${children}${active ? ` ${controls.values.sortDirection === 'asc' ? 'ascending' : 'descending'}` : ''}`}>
      {children}<span aria-hidden="true">{indicator}</span>
    </button>);
}

export default function TableControls({ id, controls, dateLabel = 'Date', statusOptions = [], categoryOptions = [] }) {
    const { values, setters, clear } = controls;
    return (<div className="page-search-panel page-table-controls">
      <div className="page-table-search">
        <label htmlFor={`${id}-search`} className="page-search-label">Search</label>
        <input id={`${id}-search`} type="search" value={values.search} onChange={event => setters.setSearch(event.target.value)} placeholder="Search names, IDs, references…" className="page-search-input"/>
      </div>
      <div className="page-audit-filter">
        <label htmlFor={`${id}-from`} className="page-search-label">{dateLabel} from</label>
        <input id={`${id}-from`} type="date" value={values.fromDate} onChange={event => setters.setFromDate(event.target.value)} className="page-search-input"/>
      </div>
      <div className="page-audit-filter">
        <label htmlFor={`${id}-to`} className="page-search-label">{dateLabel} to</label>
        <input id={`${id}-to`} type="date" value={values.toDate} onChange={event => setters.setToDate(event.target.value)} className="page-search-input"/>
      </div>
      <div className="page-audit-filter">
        <label htmlFor={`${id}-min-amount`} className="page-search-label">Min amount</label>
        <input id={`${id}-min-amount`} type="number" min="0" step="0.01" value={values.minAmount} onChange={event => setters.setMinAmount(event.target.value)} placeholder="Any" className="page-search-input"/>
      </div>
      <div className="page-audit-filter">
        <label htmlFor={`${id}-max-amount`} className="page-search-label">Max amount</label>
        <input id={`${id}-max-amount`} type="number" min="0" step="0.01" value={values.maxAmount} onChange={event => setters.setMaxAmount(event.target.value)} placeholder="Any" className="page-search-input"/>
      </div>
      {statusOptions.length > 0 && <div className="page-audit-filter">
        <label htmlFor={`${id}-status`} className="page-search-label">Status</label>
        <select id={`${id}-status`} value={values.status} onChange={event => setters.setStatus(event.target.value)} className="page-select">
          <option value="">All statuses</option>
          {statusOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>}
      {categoryOptions.length > 0 && <div className="page-audit-filter">
        <label htmlFor={`${id}-category`} className="page-search-label">Category</label>
        <select id={`${id}-category`} value={values.category} onChange={event => setters.setCategory(event.target.value)} className="page-select">
          <option value="">All categories</option>
          {categoryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>}
      <button type="button" className="page-neutral-button page-audit-clear" onClick={clear}>Clear filters</button>
    </div>);
}
