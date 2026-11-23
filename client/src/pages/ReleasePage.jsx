import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, StatusDot, ApiField, Modal, EmptyState } from '../components/ui';
import { submitForm } from '../services/forms';
import { money, today, formatDate, statusLabel } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
function ProjectsManager({ projects, onSubmit, busy, actor, search, setSearch, onSelect, onOpenArchive, }) {
    const [editingProject, setEditingProject] = useState(null);
    const activeProjects = projects.filter(project => project.status === 'active');
    const archivedProjects = projects.filter(project => project.status === 'archived');
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const visibleProjects = activeProjects.filter(project => project.project_name.toLocaleLowerCase().includes(normalizedSearch));
    const projectPagination = usePagination(visibleProjects, 10, normalizedSearch);
    return (<Panel>
      <PanelHeader title="Project Management" right={`${activeProjects.length} active project(s)`}/>
      <div className="page-project-manager-body">
        <div className="page-project-search-row">
          <label htmlFor="project-search" className="page-sr-only">Search projects</label>
          <input id="project-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value);
            projectPagination.setPage(1);
        }} placeholder="Search project name…" className="page-search-input page-project-search-input"/>
          <button type="button" onClick={onOpenArchive} aria-label={`View archived projects (${archivedProjects.length})`} className="page-project-archive-button">
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h18v5H3zM5 9v11h14V9M10 13h4"/>
            </svg>
            Archive <span className="page-muted">({archivedProjects.length})</span>
          </button>
        </div>

        <details className="page-project-create">
          <summary>Create a project</summary>
          <form onSubmit={event => submitForm(event, onSubmit, 'project', actor)} className="page-project-form">
            <input type="hidden" name="operation" value="create"/>
            <div className="responsive-form-grid page-form-grid page-form-grid--three page-project-form-grid">
              <ApiField label="Project Name" name="project_name" id="new-project-name" placeholder="Research Congress"/>
              <ApiField label="Project Start Date" name="start_date" id="new-project-start" type="date"/>
              <ApiField label="Project End Date" name="end_date" id="new-project-end" type="date"/>
            </div>
            <button type="submit" disabled={busy} className="page-primary-button">
              {busy ? 'Saving…' : 'Save project'}
            </button>
          </form>
        </details>

        {visibleProjects.length === 0
            ? <EmptyState>{activeProjects.length === 0 ? 'No active projects yet. Create or restore a project before releasing funds.' : 'No active projects match your search.'}</EmptyState>
            : projectPagination.records.map(project => {
                const linkedRecords = Number(project.linked_transactions);
                return (<div key={project.id} className="page-project-row">
                  <div className="page-project-row-content">
                    <div>
                      <div className="page-medium">{project.project_name}</div>
                      <div className="page-project-meta">
                        {project.start_date && project.end_date ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}` : 'Dates not recorded'}
                        {' · '}{linkedRecords} linked financial record(s)
                      </div>
                    </div>
                    <div className="page-project-actions">
                      <button type="button" onClick={() => onSelect(project.id)} className="page-primary-button page-button--compact">
                        Select project
                      </button>
                      <button type="button" onClick={() => onSubmit('project', { operation: 'archive', project_id: project.id, actor })} disabled={busy} className="page-neutral-button page-button--compact page-project-action">
                        Archive project
                      </button>
                      <button type="button" onClick={() => setEditingProject(project)} disabled={busy} className="page-neutral-button page-button--compact">
                        Edit project details
                      </button>
                      <button type="button" disabled={busy || linkedRecords > 0} onClick={() => {
                        if (window.confirm(`Delete project "${project.project_name}"?`)) {
                            onSubmit('project', { operation: 'delete', project_id: project.id, actor });
                        }
                    }} title={linkedRecords > 0 ? 'Projects with financial records cannot be deleted; archive instead.' : 'Delete project'} className={`page-project-delete${linkedRecords > 0 ? ' has-linked-records' : ''}`}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {linkedRecords > 0 && <div className="page-project-warning">This project has financial records; archive it rather than deleting it.</div>}
                </div>);
            })}
        <Pagination pagination={projectPagination}/>
      </div>
      {editingProject && (
        <Modal title="Edit project details" onClose={() => setEditingProject(null)} width={680}>
          <form onSubmit={async event => {
            const completed = await submitForm(event, onSubmit, 'project', actor);
            if (completed)
              setEditingProject(null);
          }}>
            <input type="hidden" name="operation" value="update"/>
            <input type="hidden" name="project_id" value={editingProject.id}/>
            <div className="responsive-form-grid page-form-grid page-form-grid--three page-project-form-grid">
              <ApiField label="Project Name" name="project_name" id={`project-${editingProject.id}-name`} defaultValue={editingProject.project_name}/>
              <ApiField label="Project Start Date" name="start_date" id={`project-${editingProject.id}-start`} type="date" defaultValue={editingProject.start_date || ''}/>
              <ApiField label="Project End Date" name="end_date" id={`project-${editingProject.id}-end`} type="date" defaultValue={editingProject.end_date || ''}/>
            </div>
            <div className="page-modal-actions">
              <button type="button" onClick={() => setEditingProject(null)} disabled={busy} className="page-neutral-button page-modal-button">Cancel</button>
              <button type="submit" disabled={busy} className="page-primary-button page-modal-button">
                {busy ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Panel>);
}
function ArchivedProjectsModal({ projects, onSubmit, busy, actor, onClose, }) {
    const archivedProjects = projects.filter(project => project.status === 'archived');
    const projectPagination = usePagination(archivedProjects);
    async function restoreProject(project) {
        const restored = await onSubmit('project', { operation: 'activate', project_id: project.id, actor });
        if (restored)
            onClose();
    }
    return (<Modal title={`Archived projects (${archivedProjects.length})`} onClose={onClose} width={680}>
      {archivedProjects.length === 0
            ? <EmptyState>There are no archived projects.</EmptyState>
            : <div>
            {projectPagination.records.map((project, index) => (<div key={project.id} className={`page-archived-project${index > 0 ? ' has-divider' : ''}`}>
                <div>
                  <div className="page-medium">{project.project_name}</div>
                  <div className="page-project-meta">
                    {project.start_date && project.end_date ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}` : 'Dates not recorded'}
                    {' · '}{Number(project.linked_transactions)} linked financial record(s)
                  </div>
                </div>
                <button type="button" onClick={() => restoreProject(project)} disabled={busy} className="page-neutral-button page-restore-project">
                  {busy ? 'Restoring…' : 'Restore'}
                </button>
              </div>))}
            <Pagination pagination={projectPagination}/>
          </div>}
    </Modal>);
}
function NewVoucherModal({ project, people, summary, onSubmit, busy, actor, onClose, }) {
    const initialDate = today();
    const initialMonth = Number(initialDate.slice(5, 7));
    const initialSemester = initialMonth >= 8
        ? 'First Semester'
        : (initialMonth <= 5 ? 'Second Semester' : 'Summer');
    const [semester, setSemester] = useState(initialSemester);
    const [month, setMonth] = useState(String(initialMonth));
    const months = [
        [1, 'January'], [2, 'February'], [3, 'March'], [4, 'April'], [5, 'May'],
        [6, 'June'], [7, 'July'], [8, 'August'], [9, 'September'], [10, 'October'],
        [11, 'November'], [12, 'December'],
    ];
    async function handleSubmit(event) {
        const completed = await submitForm(event, onSubmit, 'release', actor);
        if (completed)
            onClose();
    }
    return (<Modal title="New disbursement voucher" onClose={onClose} width={680}>
      <p className="page-voucher-project">Project: <strong>{project.project_name}</strong></p>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="project_id" value={project.id}/>
        <div className="page-form-section--short">
          <ApiField label="What the money is for" name="purpose" placeholder="Venue deposit, general assembly"/>
        </div>
        <div className="responsive-form-grid page-form-grid page-form-grid--two page-voucher-form-grid">
          <div>
            <label htmlFor="voucher-person-id" className="page-field-label">Accountable person</label>
            <select id="voucher-person-id" name="person_id" required defaultValue="" className="page-select">
              <option value="" disabled>Select a person</option>
              {people.map(person => <option key={person.id} value={person.id} disabled={Boolean(Number(person.blocked))}>{person.name} — {person.email} ({person.position}){Number(person.blocked) ? ' (on hold)' : ''}</option>)}
            </select>
            <p className="page-voucher-hint">People with an overdue or flagged transaction are locked out until they settle it.</p>
          </div>
          <ApiField label="Amount to release" name="amount" placeholder="0.00" type="number" min="0.01" step="0.01" hint={`Cash on hand: ${money(summary.cash_on_hand)}`}/>
        </div>
        <div className="page-form-section">
          <div className="responsive-form-grid page-form-grid page-form-grid--three">
            <div>
              <label htmlFor="voucher-released-on" className="page-field-label">Date released</label>
              <input id="voucher-released-on" name="released_on" type="date" required defaultValue={initialDate} onChange={event => {
                const dateMonth = Number(event.target.value.slice(5, 7));
                if (dateMonth >= 1 && dateMonth <= 12) {
                  setMonth(String(dateMonth));
                  setSemester(dateMonth >= 8 ? 'First Semester' : (dateMonth <= 5 ? 'Second Semester' : 'Summer'));
                }
              }} className="page-search-input"/>
              <p className="component-field-hint">Receipts are due seven days after release.</p>
            </div>
            <div>
              <label htmlFor="voucher-semester" className="page-field-label">Semester</label>
              <select id="voucher-semester" name="semester" required value={semester} onChange={event => setSemester(event.target.value)} className="page-select">
                <option value="First Semester">First Semester: August–December</option>
                <option value="Second Semester">Second Semester: January–May</option>
                <option value="Summer">Summer: June–July</option>
              </select>
            </div>
            <div>
              <label htmlFor="voucher-month" className="page-field-label">Month</label>
              <select id="voucher-month" name="month" required value={month} onChange={event => setMonth(event.target.value)} className="page-select">
                {months.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="page-modal-actions">
          <button type="button" onClick={onClose} disabled={busy} className="page-neutral-button page-modal-button">Cancel</button>
          <button type="submit" disabled={busy} className="page-primary-button page-modal-button">
            {busy ? 'Saving…' : 'Release the funds'}
          </button>
        </div>
      </form>
    </Modal>);
}
export default function ReleasePage({ dashboard, onSubmit, busy, actor, }) {
    const { people, projects, summary } = dashboard;
    const { disbursements } = dashboard;
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [search, setSearch] = useState('');
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [voucherOpen, setVoucherOpen] = useState(false);
    const selectedProject = projects.find(project => Number(project.id) === Number(selectedProjectId) && project.status === 'active');
    const projectDisbursements = selectedProject
        ? disbursements.filter(record => Number(record.project_id) === Number(selectedProject.id))
        : [];
    const voucherPagination = usePagination(projectDisbursements, 10, selectedProjectId);
    if (selectedProject) {
        return (<div>
        <button type="button" onClick={() => setSelectedProjectId(null)} className="page-neutral-button page-back-button">
          ← Back to Project Management
        </button>
        <PageHeader title={selectedProject.project_name} sub={`${selectedProject.start_date && selectedProject.end_date ? `${formatDate(selectedProject.start_date)} – ${formatDate(selectedProject.end_date)}` : 'Project dates not recorded'} · Active project`}/>
        <Panel>
          <div className="page-project-vouchers-header">
            <div>
              <div className="page-project-vouchers-title">Project Disbursements</div>
              <div className="page-project-meta">{projectDisbursements.length} voucher(s) linked to this project</div>
            </div>
            <button type="button" onClick={() => setVoucherOpen(true)} disabled={busy} className="page-primary-button">
              New Disbursement Voucher
            </button>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Voucher History" right={`${projectDisbursements.length} record(s)`}/>
          {projectDisbursements.length === 0
                ? <EmptyState>No disbursement vouchers have been recorded for this project.</EmptyState>
                : <div className="page-release-table-scroll">
                <div className="page-release-table">
                  <div className="page-release-header">
                    {['Voucher', 'Purpose', 'Accountable person', 'Released', 'Amount', 'Status'].map(label => (<span key={label}>{label}</span>))}
                  </div>
                  {voucherPagination.records.map((record, index) => (<div key={record.id} className={`page-release-row${index > 0 ? ' has-divider' : ''}`}>
                      <span className="page-release-voucher">{record.voucher_number}</span>
                      <span>{record.purpose}</span>
                      <span>{record.accountable}</span>
                      <span>{formatDate(record.released_on)}</span>
                      <span className="page-medium">{money(record.amount)}</span>
                      <span className="page-cell-nowrap"><StatusDot status={statusLabel(record)}/>{statusLabel(record)}</span>
                    </div>))}
                </div>
              </div>}
          <Pagination pagination={voucherPagination}/>
        </Panel>
        {voucherOpen && <NewVoucherModal project={selectedProject} people={people} summary={summary} onSubmit={onSubmit} busy={busy} actor={actor} onClose={() => setVoucherOpen(false)}/>}
      </div>);
    }
    return (<div>
      <PageHeader title="Release Funds"/>
      <ProjectsManager projects={projects} onSubmit={onSubmit} busy={busy} actor={actor} search={search} setSearch={setSearch} onSelect={setSelectedProjectId} onOpenArchive={() => setArchiveOpen(true)}/>
      {archiveOpen && <ArchivedProjectsModal projects={projects} onSubmit={onSubmit} busy={busy} actor={actor} onClose={() => setArchiveOpen(false)}/>}
    </div>);
}
// ─── Liquidation ──────────────────────────────────────────────────────────────
