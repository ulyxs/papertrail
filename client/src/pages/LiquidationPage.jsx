import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, StatusDot, DeadlineBar, ApiField, ProofUpload, Modal, ProofModal, EmptyState } from '../components/ui';
import { submitForm } from '../services/forms';
import { money, cents, today, formatDate, daysUntil } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
export default function LiquidationPage({ dashboard, onSubmit, busy, actor, canSubmitReceipt, }) {
    const { disbursements } = dashboard;
    const owed = disbursements.filter(record => record.status === 'awaiting_receipt');
    const waiting = disbursements.filter(record => record.status === 'for_review');
    const [proofTransaction, setProofTransaction] = useState(null);
    const [receiptTransaction, setReceiptTransaction] = useState(null);
    const owedPagination = usePagination(owed);
    const waitingPagination = usePagination(waiting);
    return (<div>
      <PageHeader title="Liquidation" sub="Record the receipt details against the voucher. A transaction is not closed until the auditor reviews it."/>

      <Panel>
        <PanelHeader title="Receipts still owed" right={`${owed.length} transaction(s)`}/>
        <div className="ledger-table-scroll">
          <div className="page-liquidation-table page-liquidation-table--owed">
            <div className="page-liquidation-header">
              {['Voucher', 'Accountable', 'Amount', 'Deadline', 'Action'].map(h => (<span key={h}>{h}</span>))}
            </div>
            {owed.length === 0 ? <EmptyState>No receipts are currently owed.</EmptyState> : owedPagination.records.map((r, i) => {
            const remaining = daysUntil(r.due_on);
            const overdue = remaining < 0;
            return (<div key={r.id} className={`page-liquidation-row page-liquidation-row--owed${i > 0 ? ' has-divider' : ''}`}>
                  <div>
                    <div className="page-medium">{r.purpose}</div>
                    <div className="page-overview-meta">{r.voucher_number} · {r.project}</div>
                  </div>
                  <span>{r.accountable}</span>
                  <span className="page-medium">{money(r.amount)}</span>
                  <DeadlineBar label={overdue ? `${Math.abs(remaining)} day(s) overdue` : `${remaining} day(s) left`} pct={Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue}/>
                  {canSubmitReceipt
                    ? <button type="button" onClick={() => setReceiptTransaction(r)} disabled={busy} className="page-neutral-button page-cell-nowrap">
                        Submit heheh
                      </button>
                    : <span className="page-muted page-small">View only</span>}
                </div>);
        })}
          </div>
        </div>
        <Pagination pagination={owedPagination}/>
      </Panel>

      {receiptTransaction && (<Modal title={`Submit receipt · ${receiptTransaction.voucher_number}`} onClose={() => setReceiptTransaction(null)} width={560}>
          <div className="page-liquidation-summary">
            {receiptTransaction.purpose} · {receiptTransaction.project} · {money(receiptTransaction.amount)}
          </div>
          <form onSubmit={async (event) => {
                const completed = await submitForm(event, onSubmit, 'receipt', actor);
                if (completed)
                    setReceiptTransaction(null);
            }}>
            <input type="hidden" name="disbursement_id" value={receiptTransaction.id}/>
            <ApiField label="Vendor or description" name="vendor" id="receipt-modal-vendor" placeholder="Store or recipient"/>
            <div className="page-form-spacer"/>
            <ApiField label="Receipt total" name="amount" id="receipt-modal-amount" type="number" min="0.01" step="0.01"/>
            <div className="page-form-spacer"/>
            <ApiField label="Receipt date" name="submitted_on" id="receipt-modal-date" type="date" defaultValue={today()}/>
            <div className="page-form-spacer"/>
            <ApiField label="Reference number" name="reference" id="receipt-modal-reference" required={false}/>
            <div className="page-form-spacer"/>
            <ApiField label="Note" name="note" id="receipt-modal-note" required={false}/>
            <div className="page-form-spacer"/>
            <ProofUpload id="receipt-modal-proof" label="Receipt proof image (optional)" accept="image/jpeg,image/png" formats="JPG, JPEG, or PNG"/>
            <div className="page-modal-actions page-modal-actions--receipt">
              <button type="button" onClick={() => setReceiptTransaction(null)} disabled={busy} className="page-neutral-button page-modal-button">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="page-primary-button page-modal-button">
                {busy ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </Modal>)}
      <Panel>
        <PanelHeader title="Submitted, waiting on a decision" right={`${waiting.length} item(s)`}/>
        <div className="ledger-table-scroll">
          <div className="page-liquidation-table page-liquidation-table--waiting">
            <div className="page-liquidation-header">
              {['Voucher', 'Receipt', 'Difference', 'Proof', 'Status'].map(h => (<span key={h}>{h}</span>))}
            </div>
            {waiting.length === 0 ? <EmptyState>No submitted receipts are waiting for review.</EmptyState> : waitingPagination.records.map((r, i) => {
            const differenceCents = cents(r.receipt_amount) - cents(r.amount);
            return (<div key={r.id} className={`page-liquidation-row page-liquidation-row--waiting${i > 0 ? ' has-divider' : ''}`}>
                  <div>
                    <div className="page-medium">{r.purpose}</div>
                    <div className="page-overview-meta">{r.voucher_number}</div>
                  </div>
                  <div>
                    <div>{r.receipt_vendor}</div>
                    <div className="page-overview-meta">Filed {formatDate(r.receipt_submitted_on)} · {r.receipt_reference}</div>
                  </div>
                  <span className={`page-liquidation-difference${differenceCents ? ' overdue' : ''}`}>{differenceCents === 0 ? 'Exact' : money(differenceCents / 100)}</span>
                  <div>
                    <button type="button" onClick={() => setProofTransaction(r)} className="page-proof-button page-cell-nowrap">View Proof</button>
                    <div className="page-proof-note">{Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                  </div>
                  <div>
                    <div className="page-status-inline">
                      <StatusDot status="For review"/>
                      <span className="page-review-status">For review</span>
                    </div>
                  </div>
                </div>);
        })}
          </div>
        </div>
        <Pagination pagination={waitingPagination}/>
      </Panel>
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)}/>
    </div>);
}
// ─── Review Queue ─────────────────────────────────────────────────────────────
