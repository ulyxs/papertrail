import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, Modal, ProofModal, EmptyState } from '../components/ui';
import { submitForm } from '../services/forms';
import { money, cents, formatDate } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import TableContainer from '../components/TableContainer';
export default function ReviewPage({ dashboard, onSubmit, busy, actor, }) {
    const pending = dashboard.disbursements.filter(record => record.status === 'for_review');
    const flagged = dashboard.disbursements.filter(record => record.status === 'flagged');
    const [proofTransaction, setProofTransaction] = useState(null);
    const [resolutionTransaction, setResolutionTransaction] = useState(null);
    const pendingPagination = usePagination(pending);
    const flaggedPagination = usePagination(flagged);
    function ReceiptProofButton({ record }) {
        return (<div>
        <button type="button" onClick={() => setProofTransaction(record)} className="page-proof-button page-cell-nowrap">
          View Receipt
        </button>
        <div className="page-proof-note">
          {Number(record.has_receipt_proof) === 1 ? (record.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}
        </div>
      </div>);
    }
    return (<div>
      <PageHeader title="Review Queue"/>
      <Panel>
        <PanelHeader title="Pending decisions" right={`${pending.length} item(s)`}/>
        {pending.length === 0
            ? <EmptyState>No receipts are waiting for a decision.</EmptyState>
            : <>
            <TableContainer>
              <table className="page-table page-review-table">
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
                  <tr>{['Voucher', 'Accountable person', 'Receipt details', 'Released', 'Receipted', 'Difference', 'Proof', 'Actions'].map(label => <th key={label} scope="col">{label}</th>)}</tr>
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
                        <td>{money(record.amount)}</td>
                        <td>{money(record.receipt_amount)}</td>
                        <td className={`page-review-difference${differenceCents ? ' overdue' : ''}`}>
                          {differenceCents === 0 ? 'Exact' : money(differenceCents / 100)}
                        </td>
                        <td><ReceiptProofButton record={record}/></td>
                        <td>
                          <div className="page-review-actions">
                            <button type="button" disabled={busy || differenceCents !== 0} onClick={() => onSubmit('review', { disbursement_id: record.id, decision: 'approve', actor })} className={`page-review-approve${differenceCents !== 0 ? ' has-difference' : ''}`}>
                              Approve
                            </button>
                            <button type="button" disabled={busy} onClick={() => onSubmit('review', { disbursement_id: record.id, decision: 'flag', actor })} className="page-review-flag">
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
      </Panel>
      <Panel>
        <PanelHeader title="Flagged transactions" right={`${flagged.length} item(s) on hold`}/>
        {flagged.length === 0
            ? <EmptyState>No flagged transactions need resolution.</EmptyState>
            : <>
            <TableContainer>
              <table className="page-table page-review-table">
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
                  <tr>{['Voucher', 'Accountable person', 'Receipt details', 'Released', 'Receipted', 'Proof', 'Resolution'].map(label => <th key={label} scope="col">{label}</th>)}</tr>
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
                      <td>{money(record.amount)}</td>
                      <td>{money(record.receipt_amount)}</td>
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
      </Panel>
      {resolutionTransaction && (<Modal title={`Resolve discrepancy · ${resolutionTransaction.voucher_number}`} onClose={() => setResolutionTransaction(null)} width={560}>
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
