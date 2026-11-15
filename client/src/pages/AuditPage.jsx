import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, EmptyState } from '../components/ui';
import { c } from '../config/theme';
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
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.borderLight}` }}>
          <label htmlFor="audit-search" style={{ display: 'block', marginBottom: 6, color: c.muted, fontSize: 12 }}>Search activity</label>
          <input id="audit-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value);
            auditPagination.setPage(1);
        }} placeholder="Search by user, activity, details, or date" style={{ width: '100%', maxWidth: 420, padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}/>
        </div>
        {filteredAudit.length === 0
            ? <EmptyState>{audit.length === 0 ? 'No activity has been recorded.' : 'No activity matches your search.'}</EmptyState>
            : auditPagination.records.map(e => (<div key={e.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', padding: '14px 20px', borderTop: `1px solid ${c.borderLight}`, gap: 16 }}>
            <span style={{ fontSize: 12, color: c.muted, paddingTop: 1 }}>{new Date(`${e.created_at}Z`).toLocaleString('en-PH')}</span>
            <div>
              <span style={{ fontWeight: 500 }}>{e.actor}</span>
              <span style={{ color: e.action.includes('Flagged') ? c.overdue : c.link }}> · {e.action}</span>
              <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }}>{e.detail}</div>
            </div>
          </div>))}
        <Pagination pagination={auditPagination}/>
      </Panel>
    </div>);
}
