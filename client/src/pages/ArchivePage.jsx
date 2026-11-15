import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, Modal, EmptyState } from '../components/ui';
import { c } from '../config/theme';
import { money, cents, formatDate } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
function ProjectArchiveFolder({ name, records }) {
    const recordPagination = usePagination(records);
    const [recordsOpen, setRecordsOpen] = useState(false);
    return (<div style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: 20 }}>
      <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 12, color: c.link, marginBottom: 16 }}>{records.length} approved transaction(s)</div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, marginBottom: 16 }}>{money(records.reduce((total, record) => total + cents(record.amount), 0) / 100)}</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, marginTop: 16 }}>
        <button type="button" onClick={() => setRecordsOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.link, cursor: 'pointer' }}>
          View financial records
        </button>
        <div style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid #2a7a3a', color: '#2a7a3a', padding: '4px 12px', borderRadius: 3, fontSize: 11, letterSpacing: '0.05em', fontWeight: 500 }}>
          Approved
        </div>
      </div>
      {recordsOpen && (<Modal title={`${name} · Financial records`} onClose={() => setRecordsOpen(false)} width={760}>
          <div style={{ marginBottom: 12, color: c.muted, fontSize: 12 }}>
            {records.length} approved transaction(s) · Total {money(records.reduce((total, record) => total + cents(record.amount), 0) / 100)}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 650 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.4fr 1fr 1fr', gap: 12, padding: '9px 0', borderBottom: `1px solid ${c.borderLight}` }}>
                {['Voucher', 'Purpose', 'Accountable person', 'Released', 'Amount'].map(label => (<span key={label} style={{ fontSize: 11, color: c.muted }}>{label}</span>))}
              </div>
              {recordPagination.records.map(record => (<div key={record.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.4fr 1fr 1fr', gap: 12, alignItems: 'center', padding: '12px 0', borderTop: `1px solid ${c.borderLight}`, fontSize: 12 }}>
                  <span style={{ color: c.link, fontWeight: 500 }}>{record.voucher_number}</span>
                  <span>{record.purpose}</span>
                  <span>{record.accountable}</span>
                  <span>{formatDate(record.released_on)}</span>
                  <span style={{ fontWeight: 500 }}>{money(record.amount)}</span>
                </div>))}
            </div>
          </div>
          <Pagination pagination={recordPagination}/>
        </Modal>)}
    </div>);
}
export default function ArchivePage({ dashboard }) {
    const closed = dashboard.disbursements.filter(record => record.status === 'approved');
    const projects = closed.reduce((groups, record) => {
        groups[record.project] = [...(groups[record.project] || []), record];
        return groups;
    }, {});
    const projectEntries = Object.entries(projects);
    const projectPagination = usePagination(projectEntries);
    return (<div>
      <PageHeader title="Archive" sub="Closed records, kept by event or project so a year-end audit reads in one pass."/>
      <Panel>
        <PanelHeader title="Project folders" right={`${closed.length} closed record(s)`}/>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {projectEntries.length === 0 ? <EmptyState>No approved records have been archived.</EmptyState> : projectPagination.records.map(([name, records]) => (<ProjectArchiveFolder key={name} name={name} records={records}/>))}
        </div>
        <Pagination pagination={projectPagination}/>
      </Panel>
    </div>);
}
// ─── Personnel ────────────────────────────────────────────────────────────────
