import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, ApiField, Modal } from '../components/ui';
import { submitForm } from '../services/forms';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import TableContainer from '../components/TableContainer';
export default function AccountManagementPage({ accounts, onSubmit, busy, currentUser, }) {
    const [search, setSearch] = useState('');
    const [editingAccount, setEditingAccount] = useState(null);
    const statusLabels = {
        pending: 'Pending Approval',
        approved: 'Approved',
        disapproved: 'Disapproved',
    };
    const query = search.trim().toLowerCase();
    const filteredAccounts = accounts.filter(account => (`${account.first_name} ${account.last_name} ${account.email} ${account.role} ${statusLabels[account.status] || account.status}`
        .toLowerCase()
        .includes(query)));
    const accountPagination = usePagination(filteredAccounts, 10, query);
    return (<div>
      <PageHeader title="Account Management" sub="Review registrations, assign one of the approved system roles, and manage account status."/>
      <Panel>
        <PanelHeader title="Registered accounts" right={`${filteredAccounts.length} of ${accounts.length} account(s)`}/>
        <div className="page-search-panel">
          <label htmlFor="account-search" className="page-search-label">Search accounts</label>
          <input id="account-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value);
            accountPagination.setPage(1);
        }} placeholder="Search by name, email, role, or status" className="page-search-input"/>
        </div>
        <TableContainer>
          <table className="page-table page-account-table">
            <thead>
              <tr>
                {['Name', 'Email Address', 'Assigned Role', 'Account Status', 'Registration Date', 'Actions'].map(label => (<th key={label} scope="col">{label}</th>))}
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0
            ? <tr><td colSpan={6} className="page-empty-cell">{accounts.length === 0 ? 'No registered accounts.' : 'No accounts match your search.'}</td></tr>
            : accountPagination.records.map(account => {
                const isCurrentUser = Number(account.id) === Number(currentUser.id);
                return (<tr key={account.id}>
                        <td className="page-cell-name">{account.first_name} {account.last_name}{isCurrentUser ? ' (you)' : ''}</td>
                        <td className="page-cell-muted">{account.email}</td>
                        <td>{account.role}</td>
                        <td>
                          <span className={`page-account-status page-account-status--${['pending', 'approved', 'disapproved'].includes(account.status) ? account.status : 'other'}`}>
                            {statusLabels[account.status] || account.status}
                          </span>
                        </td>
                        <td className="page-cell-muted page-cell-nowrap">
                          {new Date(`${String(account.created_at).replace(' ', 'T')}Z`).toLocaleString('en-PH')}
                        </td>
                        <td className="page-cell-actions">
                          {isCurrentUser
                        ? <span className="page-muted page-small">Your own account cannot be changed here.</span>
                        : <div className="page-account-actions">
                                {account.status !== 'approved' && (<button type="button" disabled={busy} onClick={() => onSubmit('account', { operation: 'approve', account_id: account.id })} className="page-green-button">
                                    Approve
                                  </button>)}
                                {account.status !== 'disapproved' && (<button type="button" disabled={busy} onClick={() => onSubmit('account', { operation: 'disapprove', account_id: account.id })} className="page-danger-button">
                                    Disapprove
                                  </button>)}
                                <button type="button" disabled={busy} onClick={() => setEditingAccount(account)} className="page-neutral-button">
                                  Edit account details
                                </button>
                              </div>}
                        </td>
                      </tr>);
            })}
            </tbody>
          </table>
        </TableContainer>
        <Pagination pagination={accountPagination}/>
      </Panel>
      {editingAccount && (
        <Modal title="Edit account details" onClose={() => setEditingAccount(null)} width={560}>
          <form onSubmit={async event => {
            const completed = await submitForm(event, onSubmit, 'account', currentUser.first_name + ' ' + currentUser.last_name);
            if (completed)
              setEditingAccount(null);
          }}>
            <input type="hidden" name="operation" value="update"/>
            <input type="hidden" name="account_id" value={editingAccount.id}/>
            <div className="responsive-form-grid page-form-grid page-form-grid--two page-form-grid--account">
              <ApiField label="First name" name="first_name" id={`account-${editingAccount.id}-first`} defaultValue={editingAccount.first_name}/>
              <ApiField label="Last name" name="last_name" id={`account-${editingAccount.id}-last`} defaultValue={editingAccount.last_name}/>
              <ApiField label="Email address" name="email" id={`account-${editingAccount.id}-email`} type="email" defaultValue={editingAccount.email}/>
              <div>
                <label htmlFor={`account-${editingAccount.id}-role`} className="page-field-label">Assigned role</label>
                <select id={`account-${editingAccount.id}-role`} name="role" required defaultValue={editingAccount.role} className="page-select">
                  {['User', 'Auditor', 'Treasurer', 'Admin'].map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`account-${editingAccount.id}-status`} className="page-field-label">Account status</label>
                <select id={`account-${editingAccount.id}-status`} name="status" required defaultValue={editingAccount.status} className="page-select">
                  <option value="pending">Pending Approval</option>
                  <option value="approved">Approved</option>
                  <option value="disapproved">Disapproved</option>
                </select>
              </div>
            </div>
            <div className="page-modal-actions">
              <button type="button" onClick={() => setEditingAccount(null)} disabled={busy} className="page-neutral-button page-modal-button">Cancel</button>
              <button type="submit" disabled={busy} className="page-primary-button page-modal-button">
                {busy ? 'Saving…' : 'Save account changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>);
}
// ─── Sidebar Navigation ───────────────────────────────────────────────────────
// This controls visible navigation only; the PHP API enforces authorization for every write.
