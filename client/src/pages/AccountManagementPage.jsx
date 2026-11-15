import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, ApiField } from '../components/ui';
import { c } from '../config/theme';
import { submitForm } from '../services/forms';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import TableContainer from '../components/TableContainer';
export default function AccountManagementPage({ accounts, onSubmit, busy, currentUser, }) {
    const [search, setSearch] = useState('');
    const statusLabels = {
        pending: 'Pending Approval',
        approved: 'Approved',
        disapproved: 'Disapproved',
    };
    const statusColors = {
        pending: c.amber,
        approved: c.greenBar,
        disapproved: c.overdue,
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
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${c.borderLight}` }}>
          <label htmlFor="account-search" style={{ display: 'block', marginBottom: 6, color: c.muted, fontSize: 12 }}>Search accounts</label>
          <input id="account-search" type="search" value={search} onChange={event => {
            setSearch(event.target.value);
            accountPagination.setPage(1);
        }} placeholder="Search by name, email, role, or status" style={{ width: '100%', maxWidth: 420, padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}/>
        </div>
        <TableContainer>
          <table style={{ width: '100%', minWidth: 920, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                {['Name', 'Email Address', 'Assigned Role', 'Account Status', 'Registration Date', 'Actions'].map(label => (<th key={label} scope="col" style={{ padding: '10px 14px', borderBottom: `1px solid ${c.borderLight}`, color: c.muted, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</th>))}
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0
            ? <tr><td colSpan={6} style={{ padding: 20, color: c.muted, textAlign: 'center' }}>{accounts.length === 0 ? 'No registered accounts.' : 'No accounts match your search.'}</td></tr>
            : accountPagination.records.map(account => {
                const isCurrentUser = Number(account.id) === Number(currentUser.id);
                return (<tr key={account.id}>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, fontWeight: 500, whiteSpace: 'nowrap' }}>{account.first_name} {account.last_name}{isCurrentUser ? ' (you)' : ''}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, color: c.muted }}>{account.email}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}` }}>{account.role}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}` }}>
                          <span style={{ display: 'inline-block', padding: '4px 9px', border: `1px solid ${statusColors[account.status] || c.border}`, borderRadius: 20, color: statusColors[account.status] || c.muted, fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {statusLabels[account.status] || account.status}
                          </span>
                        </td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, color: c.muted, whiteSpace: 'nowrap' }}>
                          {new Date(`${String(account.created_at).replace(' ', 'T')}Z`).toLocaleString('en-PH')}
                        </td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, minWidth: 250 }}>
                          {isCurrentUser
                        ? <span style={{ color: c.muted, fontSize: 12 }}>Your own account cannot be changed here.</span>
                        : <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {account.status !== 'approved' && (<button type="button" disabled={busy} onClick={() => onSubmit('account', { operation: 'approve', account_id: account.id })} style={{ padding: '7px 11px', border: 'none', borderRadius: 4, background: c.greenBar, color: c.white, cursor: busy ? 'wait' : 'pointer' }}>
                                    Approve
                                  </button>)}
                                {account.status !== 'disapproved' && (<button type="button" disabled={busy} onClick={() => onSubmit('account', { operation: 'disapprove', account_id: account.id })} style={{ padding: '7px 11px', border: `1px solid ${c.overdue}`, borderRadius: 4, background: c.white, color: c.overdue, cursor: busy ? 'wait' : 'pointer' }}>
                                    Disapprove
                                  </button>)}
                                <details style={{ flexBasis: '100%' }}>
                                  <summary style={{ cursor: 'pointer', color: c.link, fontSize: 12 }}>Edit account details</summary>
                                  <form onSubmit={event => submitForm(event, onSubmit, 'account', currentUser.first_name + ' ' + currentUser.last_name)} style={{ paddingTop: 12 }}>
                                    <input type="hidden" name="operation" value="update"/>
                                    <input type="hidden" name="account_id" value={account.id}/>
                                    <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                                      <ApiField label="First name" name="first_name" id={`account-${account.id}-first`} defaultValue={account.first_name}/>
                                      <ApiField label="Last name" name="last_name" id={`account-${account.id}-last`} defaultValue={account.last_name}/>
                                      <ApiField label="Email address" name="email" id={`account-${account.id}-email`} type="email" defaultValue={account.email}/>
                                      <div>
                                        <label htmlFor={`account-${account.id}-role`} style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>Assigned role</label>
                                        <select id={`account-${account.id}-role`} name="role" required defaultValue={account.role} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}>
                                          {['User', 'Auditor', 'Treasurer', 'Admin'].map(role => <option key={role} value={role}>{role}</option>)}
                                        </select>
                                      </div>
                                      <div>
                                        <label htmlFor={`account-${account.id}-status`} style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>Account status</label>
                                        <select id={`account-${account.id}-status`} name="status" required defaultValue={account.status} style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}>
                                          <option value="pending">Pending Approval</option>
                                          <option value="approved">Approved</option>
                                          <option value="disapproved">Disapproved</option>
                                        </select>
                                      </div>
                                    </div>
                                    <button type="submit" disabled={busy} style={{ padding: '8px 13px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
                                      {busy ? 'Saving…' : 'Save account changes'}
                                    </button>
                                  </form>
                                </details>
                              </div>}
                        </td>
                      </tr>);
            })}
            </tbody>
          </table>
        </TableContainer>
        <Pagination pagination={accountPagination}/>
      </Panel>
    </div>);
}
// ─── Sidebar Navigation ───────────────────────────────────────────────────────
// This controls visible navigation only; the PHP API enforces authorization for every write.
