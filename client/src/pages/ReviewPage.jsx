import { useState } from 'react';
import { PageHeader, Panel, Modal, ProofModal, EmptyState } from '../components/ui';
import { submitForm } from '../services/forms';
import { money, cents, formatDate } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import TableContainer from '../components/TableContainer';
import TableControls, { TableSortHeader } from '../components/TableControls';
import { useTableControls } from '../hooks/useTableControls';
export default function ReviewPage({ dashboard, onSubmit, busy, actor, }) {
    const pending = dashboard.disbursements.filter(record => record.status === 'for_review');
    const flagged = dashboard.disbursements.filter(record => record.status === 'flagged');
    const [proofTransaction, setProofTransaction] = useState(null);
    const [resolutionTransaction, setResolutionTransaction] = useState(null);
    const [activeTab, setActiveTab] = useState('pending');
    const pendingControls = useTableControls(pending, {
        searchFields: ['id', 'voucher_number', 'purpose', 'project', 'accountable', 'receipt_vendor', 'receipt_reference', 'receipt_note', 'amount', 'receipt_amount'],
        dateField: 'receipt_submitted_on',
        defaultSort: 'receipt_submitted_on',
        defaultDirection: 'desc',
    });
    const flaggedControls = useTableControls(flagged, {
        searchFields: ['id', 'voucher_number', 'purpose', 'project', 'accountable', 'receipt_vendor', 'receipt_reference', 'receipt_note', 'amount', 'receipt_amount'],
        dateField: 'receipt_submitted_on',
        defaultSort: 'receipt_submitted_on',
        defaultDirection: 'desc',
    });
    const pendingPagination = usePagination(pendingControls.records, 10, pendingControls.resetKey);
    const flaggedPagination = usePagination(flaggedControls.records, 10, flaggedControls.resetKey);
    function handleTabKeyDown(event) {
        const tabs = Array.from(event.currentTarget.parentElement.querySelectorAll('[role="tab"]'));
        const currentIndex = tabs.indexOf(event.currentTarget);
        const nextIndex = event.key === 'Home' ? 0
            : event.key === 'End' ? tabs.length - 1
                : event.key === 'ArrowRight' ? (currentIndex + 1) % tabs.length
                    : event.key === 'ArrowLeft' ? (currentIndex - 1 + tabs.length) % tabs.length
                        : currentIndex;
        if (nextIndex !== currentIndex) {
            event.preventDefault();
            tabs[nextIndex].focus();
            tabs[nextIndex].click();
        }
    }
    function ReceiptProofButton({ record }) {
        return (<div>
        <button type="button" onClick={() => setProofTransaction(record)} className="page-proof-button page-cell-nowrap">
          View Receipt
        </button>
        <div className="page-proof-note page-proof-filename" title={Number(record.has_receipt_proof) === 1 ? (record.receipt_proof_name || 'Image uploaded') : undefined}>
          {Number(record.has_receipt_proof) === 1 ? (record.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}
        </div>
      </div>);
    }
    return (<div>
      <PageHeader title="Review Queue"/>
      <Panel>
        <div className="page-funds-tabs" role="tablist" aria-label="Review queue">
          <button id="review-tab-pending" type="button" role="tab" className={`page-funds-tab${activeTab === 'pending' ? ' is-active' : ''}`} aria-selected={activeTab === 'pending'} aria-controls="review-panel-pending" tabIndex={activeTab === 'pending' ? 0 : -1} onClick={() => setActiveTab('pending')} onKeyDown={handleTabKeyDown}>
            Pending Decisions
            <span className="page-funds-tab-count">{pending.length}</span>
          </button>
          <button id="review-tab-flagged" type="button" role="tab" className={`page-funds-tab${activeTab === 'flagged' ? ' is-active' : ''}`} aria-selected={activeTab === 'flagged'} aria-controls="review-panel-flagged" tabIndex={activeTab === 'flagged' ? 0 : -1} onClick={() => setActiveTab('flagged')} onKeyDown={handleTabKeyDown}>
            Flagged Transactions
            <span className="page-funds-tab-count">{flagged.length}</span>
          </button>
        </div>
        <div id="review-panel-pending" role="tabpanel" aria-labelledby="review-tab-pending" hidden={activeTab !== 'pending'}>
        <TableControls id="pending-decisions" controls={pendingControls} dateLabel="Submitted"/>
        {pendingControls.records.length === 0
            ? <EmptyState>{pending.length === 0 ? 'No receipts are waiting for a decision.' : 'No records match your filters.'}</EmptyState>
            : <>
            <TableContainer>
              <table className="page-table page-review-table page-review-table--responsive page-review-table--pending">
                <colgroup>
                  <col className="page-review-col-voucher"/>
                  <col className="page-review-col-accountable"/>
                  <col className="page-review-col-details"/>
                  <col className="page-review-col-amount"/>
                  <col className="page-review-col-amount"/>
                  <col className="page-review-col-difference"/>
                  <col className="page-review-col-proof"/>
                  <col className="page-review-col-actions"/>
                </colgroup>
                <thead>
                  <tr>{[
                    { label: 'Voucher', field: 'voucher_number' },
                    { label: 'Accountable', field: 'accountable' },
                    { label: 'Receipt details', field: 'receipt_submitted_on' },
                    { label: 'Released', field: 'amount' },
                    { label: 'Receipted', field: 'receipt_amount' },
                    { label: 'Difference' },
                    { label: 'Proof' },
                    { label: 'Actions' },
                  ].map(({ label, field }) => <th key={label} scope="col" className={['Released', 'Receipted', 'Difference'].includes(label) ? 'page-review-money-column' : undefined} aria-sort={field && pendingControls.values.sortField === field ? (pendingControls.values.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}>{field ? <TableSortHeader controls={pendingControls} field={field}>{label}</TableSortHeader> : label}</th>)}</tr>
                </thead>
                <tbody>
                  {pendingPagination.records.map(record => {
                    const differenceCents = cents(record.receipt_amount) - cents(record.amount);
                    return (<tr key={record.id}>
                        <td>
                          <strong>{record.voucher_number}</strong>
                          <div className="page-review-project">{record.project}</div>
                          <div className="page-review-purpose">{record.purpose}</div>
                        </td>
                        <td>{record.accountable}</td>
                        <td>
                          <strong>{record.receipt_vendor}</strong>
                          {record.receipt_reference && <div className="page-review-project">Ref: {record.receipt_reference}</div>}
                          <div className="page-review-project">Submitted {formatDate(record.receipt_submitted_on)}</div>
                          {record.receipt_note && <div className="page-review-note">{record.receipt_note}</div>}
                        </td>
                        <td className="page-review-money-column">{money(record.amount)}</td>
                        <td className="page-review-money-column">{money(record.receipt_amount)}</td>
                        <td className={`page-review-money-column page-review-difference${differenceCents ? ' overdue' : ''}`}>
                          {differenceCents === 0 ? 'Exact' : money(differenceCents / 100)}
                        </td>
                        <td><ReceiptProofButton record={record}/></td>
                        <td>
                          <div className="page-review-actions">
                            <button type="button" disabled={busy || differenceCents !== 0} onClick={() => onSubmit('review', { disbursement_id: record.id, decision: 'approve', actor })} className={`page-primary-button page-review-approve${differenceCents !== 0 ? ' has-difference' : ''}`}>
                              Approve
                            </button>
                            <button type="button" disabled={busy} onClick={() => onSubmit('review', { disbursement_id: record.id, decision: 'flag', actor })} className="page-danger-button page-review-flag">
                              Flag
                            </button>
                          </div>
                        </td>
                      </tr>);
                })}
                </tbody>
              </table>
            </TableContainer>
            <Pagination pagination={pendingPagination}/>
          </>}
        </div>
        <div id="review-panel-flagged" role="tabpanel" aria-labelledby="review-tab-flagged" hidden={activeTab !== 'flagged'}>
        <TableControls id="flagged-transactions" controls={flaggedControls} dateLabel="Submitted"/>
        {flaggedControls.records.length === 0
            ? <EmptyState>{flagged.length === 0 ? 'No flagged transactions need resolution.' : 'No records match your filters.'}</EmptyState>
            : <>
            <TableContainer>
              <table className="page-table page-review-table page-review-table--responsive page-review-table--flagged">
                <colgroup>
                  <col className="page-review-col-voucher"/>
                  <col className="page-review-col-accountable"/>
                  <col className="page-review-col-details"/>
                  <col className="page-review-col-amount"/>
                  <col className="page-review-col-amount"/>
                  <col className="page-review-col-proof"/>
                  <col className="page-review-col-resolution"/>
                </colgroup>
                <thead>
                  <tr>{[
                    { label: 'Voucher', field: 'voucher_number' },
                    { label: 'Accountable', field: 'accountable' },
                    { label: 'Receipt details', field: 'receipt_submitted_on' },
                    { label: 'Released', field: 'amount' },
                    { label: 'Receipted', field: 'receipt_amount' },
                    { label: 'Proof' },
                    { label: 'Resolution' },
                  ].map(({ label, field }) => <th key={label} scope="col" className={['Released', 'Receipted'].includes(label) ? 'page-review-money-column' : undefined} aria-sort={field && flaggedControls.values.sortField === field ? (flaggedControls.values.sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}>{field ? <TableSortHeader controls={flaggedControls} field={field}>{label}</TableSortHeader> : label}</th>)}</tr>
                </thead>
                <tbody>
                  {flaggedPagination.records.map(record => (<tr key={record.id}>
                      <td>
                        <strong>{record.voucher_number}</strong>
                        <div className="page-review-project">{record.project}</div>
                        <div className="page-review-purpose">{record.purpose}</div>
                      </td>
                      <td>{record.accountable}</td>
                      <td>
                        <strong>{record.receipt_vendor}</strong>
                        {record.receipt_reference && <div className="page-review-project">Ref: {record.receipt_reference}</div>}
                        <div className="page-review-project">Submitted {formatDate(record.receipt_submitted_on)}</div>
                        <div className="page-review-note">{record.receipt_note}</div>
                      </td>
                      <td className="page-review-money-column">{money(record.amount)}</td>
                      <td className="page-review-money-column">{money(record.receipt_amount)}</td>
                      <td><ReceiptProofButton record={record}/></td>
                      <td>
                        <button type="button" disabled={busy} onClick={() => setResolutionTransaction(record)} className="page-primary-button page-cell-nowrap">
                            Resolve
                          </button>
                      </td>
                    </tr>))}
                </tbody>
              </table>
            </TableContainer>
            <Pagination pagination={flaggedPagination}/>
          </>}
        </div>
      </Panel>
      {resolutionTransaction && (<Modal title={`Resolve Discrepancy · ${resolutionTransaction.voucher_number}`} onClose={() => setResolutionTransaction(null)} width={560}>
          <div className="page-review-summary">
            {resolutionTransaction.purpose} · {resolutionTransaction.project} · {resolutionTransaction.receipt_vendor}
          </div>
          <form onSubmit={async (event) => {
                const completed = await submitForm(event, onSubmit, 'review', actor);
                if (completed)
                    setResolutionTransaction(null);
            }}>
            <input type="hidden" name="disbursement_id" value={resolutionTransaction.id}/>
            <input type="hidden" name="decision" value="resolve"/>
            <label htmlFor="resolution-note" className="page-field-label page-review-resolution-label">How was this discrepancy settled?</label>
            <textarea id="resolution-note" name="resolution_note" rows={4} maxLength={500} required placeholder="Refund reference or explanation reviewed" className="page-textarea"/>
            <div className="page-modal-actions">
              <button type="button" onClick={() => setResolutionTransaction(null)} disabled={busy} className="page-neutral-button page-modal-button">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="page-primary-button page-modal-button">
                {busy ? 'Saving…' : 'Record resolution'}
              </button>
            </div>
          </form>
        </Modal>)}
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)}/>
    </div>);
}
// ─── Archive ──────────────────────────────────────────────────────────────────
