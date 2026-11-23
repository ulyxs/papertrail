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
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentSemester = currentMonth >= 8
        ? 'First Semester'
        : (currentMonth <= 5 ? 'Second Semester' : 'Summer');
    const [projectSearch, setProjectSearch] = useState('');
    const [semester, setSemester] = useState(currentSemester);
    const [month, setMonth] = useState(String(currentMonth));
    const months = [
        ['', 'All months'], ['1', 'January'], ['2', 'February'], ['3', 'March'], ['4', 'April'], ['5', 'May'],
        ['6', 'June'], ['7', 'July'], ['8', 'August'], ['9', 'September'], ['10', 'October'],
        ['11', 'November'], ['12', 'December'],
    ];
    const normalizedSearch = projectSearch.trim().toLocaleLowerCase();
    const filteredDisbursements = dashboard.disbursements.filter(record => {
        const recordProject = (record.project || '').toLocaleLowerCase();
        const recordSemester = record.semester || (Number(record.released_on?.slice(5, 7)) >= 8
            ? 'First Semester'
            : (Number(record.released_on?.slice(5, 7)) <= 5 ? 'Second Semester' : 'Summer'));
        const recordMonth = String(record.month || Number(record.released_on?.slice(5, 7)));
        return recordProject.includes(normalizedSearch)
            && (!semester || semester === 'All' || recordSemester === semester)
            && (!month || recordMonth === month);
    });
    const approved = filteredDisbursements.filter(record => record.status === 'approved');
    const pending = filteredDisbursements.filter(record => record.status !== 'approved');
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
    const projectPagination = usePagination(
        projectEntries,
        10,
        `${projectSearch}|${semester}|${month}`,
    );
    return (<div>
      <PageHeader title="Financial Reports"/>
      <Panel>
        <div className="page-archive-filters">
          <div>
            <label htmlFor="report-project-search" className="page-field-label">Project</label>
            <input id="report-project-search" type="search" value={projectSearch} onChange={event => setProjectSearch(event.target.value)} placeholder="Search projects…" className="page-search-input"/>
          </div>
          <div>
            <label htmlFor="report-semester" className="page-field-label">Semester</label>
            <select id="report-semester" value={semester} onChange={event => setSemester(event.target.value)} className="page-select">
              <option value="All">All semesters</option>
              <option value="First Semester">First Semester (August-December)</option>
              <option value="Second Semester">Second Semester (January-May)</option>
              <option value="Summer">Summer (June-July)</option>
            </select>
          </div>
          <div>
            <label htmlFor="report-month" className="page-field-label">Month</label>
            <select id="report-month" value={month} onChange={event => setMonth(event.target.value)} className="page-select">
              {months.map(([value, label]) => <option key={value || 'all'} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <PanelHeader title="Project folders" right={`${approved.length} approved transaction(s) · ${pending.length} pending transaction(s)`}/>
        <div className="page-archive-project-grid">
          {projectEntries.length === 0 ? <EmptyState>No project transactions have been recorded.</EmptyState> : projectPagination.records.map(([name, records, pendingRecords]) => (<ProjectArchiveFolder key={name} name={name} records={records} pendingRecords={pendingRecords}/>))}
        </div>
        <Pagination pagination={projectPagination}/>
      </Panel>
    </div>);
}
// ─── Personnel ────────────────────────────────────────────────────────────────
