import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, StatusDot, ApiField, Modal, EmptyState } from '../components/ui';
import { c } from '../config/theme';
import { submitForm } from '../services/forms';
import { money, today, formatDate, statusLabel } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
function ProjectsManager({ projects, onSubmit, busy, actor, search, setSearch, onSelect, onOpenArchive, }) {
    const activeProjects = projects.filter(project => project.status === 'active');
    const archivedProjects = projects.filter(project => project.status === 'archived');
    const normalizedSearch = search.trim().toLocaleLowerCase();
    const visibleProjects = activeProjects.filter(project => project.project_name.toLocaleLowerCase().includes(normalizedSearch));
    const projectPagination = usePagination(visibleProjects, 10, normalizedSearch);
    return (<Panel>
      <PanelHeader title="Project management" right={`${activeProjects.length} active project(s)`}/>
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <label htmlFor="project-search" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}>Search projects</label>
          <input id="project-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value);
            projectPagination.setPage(1);
        }} placeholder="Search project name…" style={{ flex: '1 1 240px', minWidth: 180, maxWidth: 420, padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}/>
          <button type="button" onClick={onOpenArchive} aria-label={`View archived projects (${archivedProjects.length})`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text, cursor: 'pointer' }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 4h18v5H3zM5 9v11h14V9M10 13h4"/>
            </svg>
            Archive <span style={{ color: c.muted }}>({archivedProjects.length})</span>
          </button>
        </div>

        <details style={{ marginBottom: 16 }}>
          <summary style={{ cursor: 'pointer', color: c.link, fontWeight: 500 }}>Create a project</summary>
          <form onSubmit={event => submitForm(event, onSubmit, 'project', actor)} style={{ padding: '16px 0 4px' }}>
            <input type="hidden" name="operation" value="create"/>
            <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <ApiField label="Project Name" name="project_name" id="new-project-name" placeholder="Research Congress"/>
              <ApiField label="Project Start Date" name="start_date" id="new-project-start" type="date"/>
              <ApiField label="Project End Date" name="end_date" id="new-project-end" type="date"/>
            </div>
            <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText }}>
              {busy ? 'Saving…' : 'Save project'}
            </button>
          </form>
        </details>

        {visibleProjects.length === 0
            ? <EmptyState>{activeProjects.length === 0 ? 'No active projects yet. Create or restore a project before releasing funds.' : 'No active projects match your search.'}</EmptyState>
            : projectPagination.records.map(project => {
                const linkedRecords = Number(project.linked_transactions);
                return (<div key={project.id} style={{ padding: '14px 0', borderTop: `1px solid ${c.borderLight}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{project.project_name}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: c.muted }}>
                        {project.start_date && project.end_date ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}` : 'Dates not recorded'}
                        {' · '}{linkedRecords} linked financial record(s)
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'end' }}>
                      <button type="button" onClick={() => onSelect(project.id)} style={{ padding: '6px 10px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: 'pointer' }}>
                        Select project
                      </button>
                      <button type="button" onClick={() => onSubmit('project', { operation: 'archive', project_id: project.id, actor })} disabled={busy} style={{ padding: '6px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>
                        Archive project
                      </button>
                      <button type="button" disabled={busy || linkedRecords > 0} onClick={() => {
                        if (window.confirm(`Delete project "${project.project_name}"?`)) {
                            onSubmit('project', { operation: 'delete', project_id: project.id, actor });
                        }
                    }} title={linkedRecords > 0 ? 'Projects with financial records cannot be deleted; archive instead.' : 'Delete project'} style={{ padding: '6px 10px', border: `1px solid ${c.overdue}`, borderRadius: 4, background: 'transparent', color: c.overdue, cursor: busy || linkedRecords > 0 ? 'not-allowed' : 'pointer', opacity: linkedRecords > 0 ? 0.6 : 1 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {linkedRecords > 0 && <div style={{ marginTop: 6, color: c.muted, fontSize: 11 }}>This project has financial records; archive it rather than deleting it.</div>}
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ cursor: 'pointer', color: c.link, fontSize: 12 }}>Edit project details</summary>
                    <form onSubmit={event => submitForm(event, onSubmit, 'project', actor)} style={{ padding: '12px 0 4px' }}>
                      <input type="hidden" name="operation" value="update"/>
                      <input type="hidden" name="project_id" value={project.id}/>
                      <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <ApiField label="Project Name" name="project_name" id={`project-${project.id}-name`} defaultValue={project.project_name}/>
                        <ApiField label="Project Start Date" name="start_date" id={`project-${project.id}-start`} type="date" defaultValue={project.start_date || ''}/>
                        <ApiField label="Project End Date" name="end_date" id={`project-${project.id}-end`} type="date" defaultValue={project.end_date || ''}/>
                      </div>
                      <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText }}>
                        {busy ? 'Saving…' : 'Save changes'}
                      </button>
                    </form>
                  </details>
                </div>);
            })}
        <Pagination pagination={projectPagination}/>
      </div>
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
            {projectPagination.records.map((project, index) => (<div key={project.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderTop: index > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                <div>
                  <div style={{ fontWeight: 500, color: c.text }}>{project.project_name}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: c.muted }}>
                    {project.start_date && project.end_date ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}` : 'Dates not recorded'}
                    {' · '}{Number(project.linked_transactions)} linked financial record(s)
                  </div>
                </div>
                <button type="button" onClick={() => restoreProject(project)} disabled={busy} style={{ flexShrink: 0, padding: '7px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>
                  {busy ? 'Restoring…' : 'Restore'}
                </button>
              </div>))}
            <Pagination pagination={projectPagination}/>
          </div>}
    </Modal>);
}
function NewVoucherModal({ project, people, summary, onSubmit, busy, actor, onClose, }) {
    async function handleSubmit(event) {
        const completed = await submitForm(event, onSubmit, 'release', actor);
        if (completed)
            onClose();
    }
    return (<Modal title="New disbursement voucher" onClose={onClose} width={680}>
      <p style={{ margin: '-4px 0 18px', color: c.muted, fontSize: 13 }}>Project: <strong style={{ color: c.text }}>{project.project_name}</strong></p>
      <form onSubmit={handleSubmit}>
        <input type="hidden" name="project_id" value={project.id}/>
        <div style={{ marginBottom: 16 }}>
          <ApiField label="What the money is for" name="purpose" placeholder="Venue deposit, general assembly"/>
        </div>
        <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <label htmlFor="voucher-person-id" style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>Accountable person</label>
            <select id="voucher-person-id" name="person_id" required defaultValue="" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}>
              <option value="" disabled>Select a person</option>
              {people.map(person => <option key={person.id} value={person.id} disabled={Boolean(Number(person.blocked))}>{person.name} — {person.email} ({person.position}){Number(person.blocked) ? ' (on hold)' : ''}</option>)}
            </select>
            <p style={{ fontSize: 11, color: c.muted, marginTop: 4 }}>People with an overdue or flagged transaction are locked out until they settle it.</p>
          </div>
          <ApiField label="Amount to release" name="amount" placeholder="0.00" type="number" min="0.01" step="0.01" hint={`Cash on hand: ${money(summary.cash_on_hand)}`}/>
        </div>
        <div style={{ marginBottom: 20 }}>
          <ApiField label="Date released" name="released_on" type="date" defaultValue={today()} hint="Receipts are due seven days after release."/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'end', gap: 10 }}>
          <button type="button" onClick={onClose} disabled={busy} style={{ padding: '8px 14px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.white, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>Cancel</button>
          <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
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
        <button type="button" onClick={() => setSelectedProjectId(null)} style={{ marginBottom: 20, padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.link, cursor: 'pointer' }}>
          ← Back to Project Management
        </button>
        <PageHeader title={selectedProject.project_name} sub={`${selectedProject.start_date && selectedProject.end_date ? `${formatDate(selectedProject.start_date)} – ${formatDate(selectedProject.end_date)}` : 'Project dates not recorded'} · Active project`}/>
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, color: c.text }}>Project disbursements</div>
              <div style={{ marginTop: 4, fontSize: 12, color: c.muted }}>{projectDisbursements.length} voucher(s) linked to this project</div>
            </div>
            <button type="button" onClick={() => setVoucherOpen(true)} disabled={busy} style={{ padding: '9px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
              New Disbursement Voucher
            </button>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Voucher history" right={`${projectDisbursements.length} record(s)`}/>
          {projectDisbursements.length === 0
                ? <EmptyState>No disbursement vouchers have been recorded for this project.</EmptyState>
                : <div style={{ overflowX: 'auto' }}>
                <div style={{ minWidth: 760 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.4fr 1fr 1fr 1.3fr', gap: 12, padding: '9px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
                    {['Voucher', 'Purpose', 'Accountable person', 'Released', 'Amount', 'Status'].map(label => (<span key={label} style={{ fontSize: 11, color: c.muted }}>{label}</span>))}
                  </div>
                  {voucherPagination.records.map((record, index) => (<div key={record.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 1.4fr 1fr 1fr 1.3fr', gap: 12, alignItems: 'center', padding: '13px 20px', borderTop: index > 0 ? `1px solid ${c.borderLight}` : 'none', fontSize: 12 }}>
                      <span style={{ color: c.link, fontWeight: 500 }}>{record.voucher_number}</span>
                      <span>{record.purpose}</span>
                      <span>{record.accountable}</span>
                      <span>{formatDate(record.released_on)}</span>
                      <span style={{ fontWeight: 500 }}>{money(record.amount)}</span>
                      <span style={{ whiteSpace: 'nowrap' }}><StatusDot status={statusLabel(record)}/>{statusLabel(record)}</span>
                    </div>))}
                </div>
              </div>}
          <Pagination pagination={voucherPagination}/>
        </Panel>
        {voucherOpen && <NewVoucherModal project={selectedProject} people={people} summary={summary} onSubmit={onSubmit} busy={busy} actor={actor} onClose={() => setVoucherOpen(false)}/>}
      </div>);
    }
    return (<div>
      <PageHeader title="Release funds" sub="Choose a project to view its vouchers or create a new disbursement."/>
      <ProjectsManager projects={projects} onSubmit={onSubmit} busy={busy} actor={actor} search={search} setSearch={setSearch} onSelect={setSelectedProjectId} onOpenArchive={() => setArchiveOpen(true)}/>
      {archiveOpen && <ArchivedProjectsModal projects={projects} onSubmit={onSubmit} busy={busy} actor={actor} onClose={() => setArchiveOpen(false)}/>}
    </div>);
}
// ─── Liquidation ──────────────────────────────────────────────────────────────
