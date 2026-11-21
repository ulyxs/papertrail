import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, ApiField, ProofUpload, ProofModal, EmptyState } from '../components/ui';
import { submitForm } from '../services/forms';
import { money, today, formatDate } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
export default function FundsPage({ dashboard, onSubmit, busy, actor, canManage, }) {
    const { funds } = dashboard;
    const [proofFund, setProofFund] = useState(null);
    const fundsPagination = usePagination(funds);
    const categories = [
        'Department Allocation',
        'Membership Dues',
        'Sponsorships',
        'Donations',
        'Fundraising Activities',
        'Grants',
        'Others',
    ];
    return (<div>
      <PageHeader title="Funds received" sub="The opening side of the ledger. Only what is recorded here can be released."/>

      {canManage && <Panel>
        <PanelHeader title="Record money coming in"/>
        <form onSubmit={event => submitForm(event, onSubmit, 'funds', actor)} className="page-funds-form">
          <div className="responsive-form-grid page-form-grid page-form-grid--two page-form-grid--income">
            <ApiField label="Source Name" name="source_name" placeholder="Member, organization, or funding office"/>
            <div>
              <label htmlFor="income_category" className="page-field-label">Income Category</label>
              <select id="income_category" name="income_category" required defaultValue="" className="page-select">
                <option value="" disabled>Select a category</option>
                {categories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>
          <div className="responsive-form-grid page-form-grid page-form-grid--two page-form-grid--income-final">
            <ApiField label="Amount" name="amount" placeholder="0.00" type="number" min="0.01" step="0.01"/>
            <ApiField label="Date received" name="received_on" type="date" defaultValue={today()}/>
          </div>
          <div className="page-form-section">
            <ApiField label="Note" name="note" placeholder="Deposit reference or account" required={false}/>
          </div>
          <div className="page-form-section">
            <ProofUpload />
          </div>
          <div className="page-form-actions">
            <button type="submit" disabled={busy} className="page-primary-button page-button--wide">
              {busy ? 'Saving…' : 'Record the fund'}
            </button>
            <span className="page-form-note">This adds to cash on hand and is written to the audit trail.</span>
          </div>
        </form>
      </Panel>}

      <Panel>
        <PanelHeader title="Receipts Ledger" right={`${funds.length} record(s) · ${money(dashboard.summary.total_received)} total`}/>
        <div className="ledger-table-scroll">
          <div className="page-funds-table">
            <div className="page-funds-header">
              {['Category', 'Source Name', 'Note', 'Date', 'Amount', 'Proof'].map(h => (<span key={h}>{h}</span>))}
            </div>
            {funds.length === 0 ? <EmptyState /> : fundsPagination.records.map((r, i) => (<div key={r.id} className={`page-funds-row${i > 0 ? ' has-divider' : ''}`}>
                <span className="page-muted">{r.income_category}</span>
                <span className="page-medium">{r.source_name}</span>
                <span className="page-muted">{r.note || '—'}</span>
                <span className="page-muted">{formatDate(r.received_on)}</span>
                <span className="page-medium">{money(r.amount)}</span>
                <div>
                  <button type="button" onClick={() => setProofFund(r)} className="page-proof-button page-cell-nowrap">View Proof</button>
                  <div className="page-proof-note">{Number(r.has_proof) === 1 ? (r.proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                </div>
              </div>))}
          </div>
        </div>
        <Pagination pagination={fundsPagination}/>
      </Panel>
      <ProofModal key={proofFund?.id ?? 'closed'} transaction={proofFund} onClose={() => setProofFund(null)}/>
    </div>);
}
