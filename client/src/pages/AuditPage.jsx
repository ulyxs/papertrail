import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, EmptyState } from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import TableContainer from '../components/TableContainer';

function getActivityType(action) {
    const normalizedAction = String(action).trim().toLocaleLowerCase();
    if (/\b(?:login|log in|logged in|sign(?:ed)? in|sign(?:ed)? out)\b/.test(normalizedAction))
        return 'login';
    if (/^(?:created|registered|recorded|released|submitted|provisioned)\b/.test(normalizedAction))
        return 'create';
    if (/^(?:updated|changed|approved|disabled|enabled|flagged|marked|reviewed|rejected|disapproved)\b/.test(normalizedAction))
        return 'update';
    if (/^(?:deleted|removed)\b/.test(normalizedAction))
        return 'delete';
    return 'other';
}

function getAuditDate(entry) {
    return String(entry.created_at || '').slice(0, 10);
}

function getAuditTimestamp(value) {
    const timestamp = String(value || '');
    const parsed = Date.parse(timestamp.includes('T') ? timestamp : `${timestamp.replace(' ', 'T')}Z`);
    return Number.isNaN(parsed) ? 0 : parsed;
}

export default function AuditPage({ dashboard }) {
    const { audit } = dashboard;
    const [activityType, setActivityType] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [user, setUser] = useState('');
    const [sortField, setSortField] = useState('created_at');
    const [sortDirection, setSortDirection] = useState('desc');
    const [dateOrder, setDateOrder] = useState('desc');
    const filterKey = JSON.stringify([activityType, fromDate, toDate, user]);
    const users = [...new Set(audit.map(entry => entry.actor))].sort((a, b) => a.localeCompare(b));
    const filteredAudit = audit
        .filter(entry => {
        const entryDate = getAuditDate(entry);
        return (!activityType || getActivityType(entry.action) === activityType)
            && (!fromDate || entryDate >= fromDate)
            && (!toDate || entryDate <= toDate)
            && (!user || entry.actor === user);
    })
        .sort((a, b) => {
        const comparison = sortField === 'created_at'
            ? getAuditTimestamp(a.created_at) - getAuditTimestamp(b.created_at)
            : String(a[sortField] || '').localeCompare(String(b[sortField] || ''), undefined, { sensitivity: 'base' });
        return sortDirection === 'asc' ? comparison : -comparison;
    });
    const auditPagination = usePagination(filteredAudit, 10, filterKey);
    const updateFilter = (setter, value) => {
        setter(value);
        auditPagination.setPage(1);
    };
    const sortBy = field => {
        const nextDirection = sortField === field
            ? (sortDirection === 'asc' ? 'desc' : 'asc')
            : (field === 'created_at' ? 'desc' : 'asc');
        setSortField(field);
        setSortDirection(nextDirection);
        if (field === 'created_at')
            setDateOrder(nextDirection);
    };
    const clearFilters = () => {
        setActivityType('');
        setFromDate('');
        setToDate('');
        setUser('');
        setSortField('created_at');
        setSortDirection('desc');
        setDateOrder('desc');
        auditPagination.setPage(1);
    };
    const columns = [
        { key: 'actor', label: 'User' },
        { key: 'action', label: 'Activity' },
        { key: 'detail', label: 'Details' },
        { key: 'created_at', label: 'Date' },
    ];
    const sortIndicator = field => sortField === field
        ? (sortDirection === 'asc' ? '↑' : '↓')
        : '↕';
    return (<div>
      <PageHeader title="Activity & Audit Log"/>
      <Panel>
        <PanelHeader title="Activity" right={`${filteredAudit.length} of ${audit.length} entries`}/>
        <div className="page-search-panel page-audit-controls">
          <div className="page-audit-filter">
            <label htmlFor="audit-type" className="page-search-label">Activity type</label>
            <select id="audit-type" value={activityType} onChange={event => updateFilter(setActivityType, event.target.value)} className="page-select">
              <option value="">All activity types</option>
              <option value="login">Login</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="page-audit-filter">
            <label htmlFor="audit-user" className="page-search-label">User</label>
            <select id="audit-user" value={user} onChange={event => updateFilter(setUser, event.target.value)} className="page-select">
              <option value="">All users</option>
              {users.map(actor => <option key={actor} value={actor}>{actor}</option>)}
            </select>
          </div>
          <div className="page-audit-date-filter">
            <div className="page-audit-filter">
              <label htmlFor="audit-from-date" className="page-search-label">From</label>
              <input id="audit-from-date" type="date" value={fromDate} onChange={event => updateFilter(setFromDate, event.target.value)} className="page-search-input"/>
            </div>
            <div className="page-audit-filter">
              <label htmlFor="audit-to-date" className="page-search-label">To</label>
              <input id="audit-to-date" type="date" value={toDate} onChange={event => updateFilter(setToDate, event.target.value)} className="page-search-input"/>
            </div>
          </div>
          <div className="page-audit-sort">
            <label htmlFor="audit-date-order" className="page-search-label">Date order</label>
            <select id="audit-date-order" value={dateOrder} onChange={event => {
            setSortField('created_at');
            setSortDirection(event.target.value);
            setDateOrder(event.target.value);
        }} className="page-select">
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
          <button type="button" className="page-neutral-button page-audit-clear" onClick={clearFilters}>Clear filters</button>
        </div>
        {filteredAudit.length === 0
            ? <EmptyState>{audit.length === 0 ? 'No activity has been recorded.' : 'No activity matches your filters.'}</EmptyState>
            : <TableContainer>
              <table className="page-table page-audit-table">
                <thead>
                  <tr>
                    {columns.map(column => (<th key={column.key} scope="col" aria-sort={sortField === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" className="page-audit-sort-button" onClick={() => sortBy(column.key)}>
                        {column.label}<span aria-hidden="true">{sortIndicator(column.key)}</span>
                      </button>
                    </th>))}
                  </tr>
                </thead>
                <tbody>
                  {auditPagination.records.map(entry => (<tr key={entry.id}>
                    <td className="page-cell-name">{entry.actor}</td>
                    <td>{entry.action}</td>
                    <td className="page-cell-muted">{entry.detail}</td>
                    <td className="page-cell-muted page-cell-nowrap">{new Date(`${String(entry.created_at).replace(' ', 'T')}Z`).toLocaleString('en-PH')}</td>
                  </tr>))}
                </tbody>
              </table>
            </TableContainer>}
        <Pagination pagination={auditPagination}/>
      </Panel>
    </div>);
}
