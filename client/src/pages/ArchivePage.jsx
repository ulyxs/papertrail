import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, Modal, EmptyState } from '../components/ui';
import { money, cents, formatDate } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';

function ProjectArchiveFolder({ name, records, pendingRecords }) {
    const allRecords = [...records, ...pendingRecords];
    const recordPagination = usePagination(allRecords);
    const [recordsOpen, setRecordsOpen] = useState(false);
    const approvedTotal = records.reduce((total, record) => total + cents(record.amount), 0);
    return (<div className="page-archive-folder">
      <div className="page-archive-folder-name">{name}</div>
      <div className="page-archive-folder-count">{records.length} approved transaction(s)</div>
      {pendingRecords.length > 0 && <div className="page-archive-pending-count">{pendingRecords.length} pending transaction(s)</div>}
      <div className="page-archive-folder-total">
        <span className="page-archive-folder-total-label">Approved total</span>
        {money(approvedTotal / 100)}
      </div>
      <div className="page-archive-folder-actions">
        <button type="button" onClick={() => setRecordsOpen(true)} className="page-archive-records-button">
          View financial records
        </button>
        <div className={`page-archive-approved-badge${pendingRecords.length > 0 ? ' has-pending' : ''}`}>
          {pendingRecords.length > 0 ? 'In progress' : 'Approved'}
        </div>
      </div>
      {recordsOpen && (<Modal title={`${name} · Financial records`} onClose={() => setRecordsOpen(false)} width={760}>
          <div className="page-archive-records-summary">
            {records.length} approved · {pendingRecords.length} pending · Approved total {money(approvedTotal / 100)}
          </div>
          <div className="page-archive-records-scroll">
            <div className="page-archive-records-table">
              <div className="page-archive-records-header">
                {['Voucher', 'Purpose', 'Accountable person', 'Released', 'Amount', 'Status'].map(label => (<span key={label}>{label}</span>))}
              </div>
              {recordPagination.records.map(record => (<div key={record.id} className="page-archive-record-row">
                  <span className="page-archive-record-voucher">{record.voucher_number}</span>
                  <span>{record.purpose}</span>
                  <span>{record.accountable}</span>
                  <span>{formatDate(record.released_on)}</span>
                  <span className="page-archive-record-amount">{money(record.amount)}</span>
                  <span className={`page-archive-record-status${record.status !== 'approved' ? ' pending' : ''}`}>
                    {{
                        awaiting_receipt: 'Awaiting receipt',
                        for_review: 'Pending review',
                        flagged: 'Flagged',
                        approved: 'Approved',
                    }[record.status] || record.status}
                  </span>
                </div>))}
            </div>
          </div>
          <Pagination pagination={recordPagination}/>
        </Modal>)}
    </div>);
}
export default function ArchivePage({ dashboard }) {
    const approved = dashboard.disbursements.filter(record => record.status === 'approved');
    const pending = dashboard.disbursements.filter(record => record.status !== 'approved');
    const approvedProjects = approved.reduce((groups, record) => {
        groups[record.project] = [...(groups[record.project] || []), record];
        return groups;
    }, {});
    const pendingProjects = pending.reduce((groups, record) => {
        groups[record.project] = [...(groups[record.project] || []), record];
        return groups;
    }, {});
    const projectNames = [...new Set([...Object.keys(approvedProjects), ...Object.keys(pendingProjects)])];
    const projectEntries = projectNames.map(name => [
        name,
        approvedProjects[name] || [],
        pendingProjects[name] || [],
    ]);
    const projectPagination = usePagination(projectEntries);
    return (<div>
      <PageHeader title="Financial reports" sub="Project transaction summaries, including records that are still awaiting completion or approval."/>
      <Panel>
        <PanelHeader title="Project folders" right={`${approved.length} approved transaction(s) · ${pending.length} pending transaction(s)`}/>
        <div className="page-archive-project-grid">
          {projectEntries.length === 0 ? <EmptyState>No project transactions have been recorded.</EmptyState> : projectPagination.records.map(([name, records, pendingRecords]) => (<ProjectArchiveFolder key={name} name={name} records={records} pendingRecords={pendingRecords}/>))}
        </div>
        <Pagination pagination={projectPagination}/>
      </Panel>
    </div>);
}
// ─── Personnel ────────────────────────────────────────────────────────────────
