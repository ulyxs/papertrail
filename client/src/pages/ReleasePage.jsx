import { useRef, useState } from 'react';
import { PageHeader, Panel, PanelHeader, StatusDot, ApiField, Modal, EmptyState } from '../components/ui';
import { submitForm } from '../services/forms';
import { money, today, formatDate, statusLabel } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
const projectMonths = [
    [1, 'January'], [2, 'February'], [3, 'March'], [4, 'April'], [5, 'May'],
    [6, 'June'], [7, 'July'], [8, 'August'], [9, 'September'], [10, 'October'],
    [11, 'November'], [12, 'December'],
];
const projectSemesters = ['First Semester', 'Second Semester', 'Summer'];
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
            <div className="responsive-form-grid page-form-grid page-form-grid--two page-project-form-grid">
              <div>
                <label htmlFor="new-project-semester" className="page-field-label">Semester</label>
                <select id="new-project-semester" name="semester" required defaultValue="" className="page-select">
                  <option value="" disabled>Select a semester</option>
                  {projectSemesters.map(semester => <option key={semester} value={semester}>{semester}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="new-project-month" className="page-field-label">Month</label>
                <select id="new-project-month" name="month" required defaultValue="" className="page-select">
                  <option value="" disabled>Select a month</option>
                  {projectMonths.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
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
                        {' · '}{project.semester && project.month ? `${project.semester} · ${projectMonths.find(([value]) => Number(value) === Number(project.month))?.[1]}` : 'Period not assigned'}
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
            <div className="responsive-form-grid page-form-grid page-form-grid--two page-project-form-grid">
              <div>
                <label htmlFor={`project-${editingProject.id}-semester`} className="page-field-label">Semester</label>
                <select id={`project-${editingProject.id}-semester`} name="semester" required defaultValue={editingProject.semester || ''} className="page-select">
                  <option value="" disabled>Select a semester</option>
                  {projectSemesters.map(semester => <option key={semester} value={semester}>{semester}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`project-${editingProject.id}-month`} className="page-field-label">Month</label>
                <select id={`project-${editingProject.id}-month`} name="month" required defaultValue={editingProject.month || ''} className="page-select">
                  <option value="" disabled>Select a month</option>
                  {projectMonths.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
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
    const [personQuery, setPersonQuery] = useState('');
    const [personId, setPersonId] = useState('');
    const [personListOpen, setPersonListOpen] = useState(false);
    const [activePersonIndex, setActivePersonIndex] = useState(-1);
    const personInputRef = useRef(null);
    const matchingPeople = people.filter(person => person.name.toLocaleLowerCase().includes(personQuery.trim().toLocaleLowerCase()));
    function selectPerson(person) {
        if (Number(person.blocked))
            return;
        setPersonId(String(person.id));
        setPersonQuery(person.name);
        setPersonListOpen(false);
        personInputRef.current?.setCustomValidity('');
    }
    function handlePersonKeyDown(event) {
        if (event.key === 'ArrowDown' && matchingPeople.length > 0) {
            event.preventDefault();
            setPersonListOpen(true);
            setActivePersonIndex(index => Math.min(index + 1, matchingPeople.length - 1));
        }
        else if (event.key === 'ArrowUp' && matchingPeople.length > 0) {
            event.preventDefault();
            setPersonListOpen(true);
            setActivePersonIndex(index => Math.max(index - 1, 0));
        }
        else if (event.key === 'Enter' && personListOpen && matchingPeople[activePersonIndex]) {
            event.preventDefault();
            selectPerson(matchingPeople[activePersonIndex]);
        }
        else if (event.key === 'Escape') {
            setPersonListOpen(false);
        }
    }
    async function handleSubmit(event) {
        if (!personId) {
            event.preventDefault();
            personInputRef.current?.setCustomValidity('Choose a registered person from the suggestions.');
            personInputRef.current?.reportValidity();
            return;
        }
        const completed = await submitForm(event, onSubmit, 'release', actor);
        if (completed)
            onClose();
    }
    return (<Modal title="New disbursement voucher" onClose={onClose} width={680}>
      <p className="page-voucher-project">Project: <strong>{project.project_name}</strong> · {project.semester && project.month ? `${project.semester} · ${projectMonths.find(([value]) => Number(value) === Number(project.month))?.[1]}` : 'Period follows release date'}</p>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="project_id" value={project.id}/>
        <div className="page-form-section--short">
          <ApiField label="What the money is for" name="purpose" placeholder="Venue deposit, general assembly"/>
        </div>
        <div className="responsive-form-grid page-form-grid page-form-grid--two page-voucher-form-grid">
          <div>
            <label htmlFor="voucher-person-id" className="page-field-label">Accountable person</label>
            <div className="page-person-autocomplete">
              <input
                ref={personInputRef}
                id="voucher-person-id"
                type="text"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={personListOpen}
                aria-controls="voucher-person-options"
                aria-activedescendant={personListOpen && matchingPeople[activePersonIndex] ? `voucher-person-option-${matchingPeople[activePersonIndex].id}` : undefined}
                autoComplete="off"
                required
                value={personQuery}
                onFocus={() => setPersonListOpen(true)}
                onBlur={() => setPersonListOpen(false)}
                onKeyDown={handlePersonKeyDown}
                onChange={event => {
                    setPersonQuery(event.target.value);
                    setPersonId('');
                    setActivePersonIndex(-1);
                    setPersonListOpen(true);
                    event.target.setCustomValidity('');
                }}
                placeholder="Search registered users"
                className="page-search-input page-person-autocomplete-input"
              />
              <input type="hidden" name="person_id" value={personId}/>
              {personListOpen && (
                <div id="voucher-person-options" role="listbox" className="page-person-autocomplete-options">
                  {matchingPeople.length > 0
                    ? matchingPeople.map((person, index) => {
                        const onHold = Boolean(Number(person.blocked));
                        return (
                          <button
                            key={person.id}
                            id={`voucher-person-option-${person.id}`}
                            type="button"
                            role="option"
                            aria-selected={String(person.id) === personId}
                            disabled={onHold}
                            onMouseDown={event => event.preventDefault()}
                            onMouseEnter={() => setActivePersonIndex(index)}
                            onClick={() => selectPerson(person)}
                            className="page-person-autocomplete-option"
                          >
                            <span>{person.name}</span>
                            {onHold && <span className="page-person-on-hold">On Hold</span>}
                          </button>
                        );
                    })
                    : <div className="page-person-autocomplete-empty">No registered users match.</div>}
                </div>
              )}
            </div>
            <p className="page-voucher-hint">People with an overdue or flagged transaction are locked out until they settle it.</p>
          </div>
          <ApiField label="Amount to release" name="amount" placeholder="0.00" type="number" min="0.01" step="0.01" hint={`Cash on hand: ${money(summary.cash_on_hand)}`}/>
        </div>
        <div className="page-form-section">
          <label htmlFor="voucher-released-on" className="page-field-label">Date released</label>
          <input id="voucher-released-on" name="released_on" type="date" required defaultValue={initialDate} className="page-search-input"/>
          <p className="component-field-hint">Receipts are due seven days after release.</p>
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
