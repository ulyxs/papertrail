import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, EmptyState } from '../components/ui';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
export default function AuditPage({ dashboard }) {
    const { audit } = dashboard;
    const [search, setSearch] = useState('');
    const query = search.trim().toLocaleLowerCase();
    const filteredAudit = audit.filter(entry => (`${entry.actor} ${entry.action} ${entry.detail} ${entry.created_at}`.toLocaleLowerCase().includes(query)));
    const auditPagination = usePagination(filteredAudit, 10, query);
    return (<div>
      <PageHeader title="Activity & Audit Log" sub="Append-only records of financial decisions and account administration activity."/>
      <Panel>
        <PanelHeader title="Activity" right={`${filteredAudit.length} of ${audit.length} entries`}/>
        <div className="page-search-panel">
          <label htmlFor="audit-search" className="page-search-label">Search activity</label>
          <input id="audit-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value);
            auditPagination.setPage(1);
        }} placeholder="Search by user, activity, details, or date" className="page-search-input"/>
        </div>
        {filteredAudit.length === 0
            ? <EmptyState>{audit.length === 0 ? 'No activity has been recorded.' : 'No activity matches your search.'}</EmptyState>
            : auditPagination.records.map(e => (<div key={e.id} className="page-audit-row">
            <span className="page-audit-date">{new Date(`${e.created_at}Z`).toLocaleString('en-PH')}</span>
            <div>
              <span className="page-audit-actor">{e.actor}</span>
              <span className={e.action.includes('Flagged') ? 'page-text-overdue' : 'page-muted'}> · {e.action}</span>
              <div className="page-audit-detail">{e.detail}</div>
            </div>
          </div>))}
        <Pagination pagination={auditPagination}/>
      </Panel>
    </div>);
}
