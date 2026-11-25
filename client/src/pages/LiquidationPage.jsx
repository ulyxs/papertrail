import { useState } from 'react';
import { PageHeader, Panel, StatusDot, DeadlineBar, ApiField, ProofUpload, Modal, ProofModal, EmptyState } from '../components/ui';
import { submitForm } from '../services/forms';
import { money, cents, today, formatDate, daysUntil } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import TableControls, { TableSortHeader } from '../components/TableControls';
import { useTableControls } from '../hooks/useTableControls';
export default function LiquidationPage({ dashboard, onSubmit, busy, actor, canSubmitReceipt, }) {
    const { disbursements } = dashboard;
    const owed = disbursements.filter(record => record.status === 'awaiting_receipt');
    const waiting = disbursements.filter(record => record.status === 'for_review');
    const [proofTransaction, setProofTransaction] = useState(null);
    const [receiptTransaction, setReceiptTransaction] = useState(null);
    const [attachProofTransaction, setAttachProofTransaction] = useState(null);
    const [activeTab, setActiveTab] = useState('owed');
    const owedControls = useTableControls(owed, {
        searchFields: ['id', 'voucher_number', 'purpose', 'accountable', 'project', 'amount'],
        dateField: 'due_on',
        defaultSort: 'due_on',
        defaultDirection: 'desc',
    });
    const waitingControls = useTableControls(waiting, {
        searchFields: ['id', 'voucher_number', 'purpose', 'accountable', 'project', 'receipt_vendor', 'receipt_reference', 'receipt_note', 'amount', 'receipt_amount'],
        dateField: 'receipt_submitted_on',
        defaultSort: 'receipt_submitted_on',
        defaultDirection: 'desc',
    });
    const owedPagination = usePagination(owedControls.records, 10, owedControls.resetKey);
    const waitingPagination = usePagination(waitingControls.records, 10, waitingControls.resetKey);
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
    return (<div>
      <PageHeader title="Liquidation"/>

      <Panel>
        <div className="page-funds-tabs" role="tablist" aria-label="Liquidation records">
          <button id="liquidation-tab-owed" type="button" role="tab" className={`page-funds-tab${activeTab === 'owed' ? ' is-active' : ''}`} aria-selected={activeTab === 'owed'} aria-controls="liquidation-panel-owed" tabIndex={activeTab === 'owed' ? 0 : -1} onClick={() => setActiveTab('owed')} onKeyDown={handleTabKeyDown}>
            Receipts Owed
            <span className="page-funds-tab-count">{owed.length}</span>
          </button>
          <button id="liquidation-tab-waiting" type="button" role="tab" className={`page-funds-tab${activeTab === 'waiting' ? ' is-active' : ''}`} aria-selected={activeTab === 'waiting'} aria-controls="liquidation-panel-waiting" tabIndex={activeTab === 'waiting' ? 0 : -1} onClick={() => setActiveTab('waiting')} onKeyDown={handleTabKeyDown}>
            Submitted
            <span className="page-funds-tab-count">{waiting.length}</span>
          </button>
        </div>
        <div id="liquidation-panel-owed" role="tabpanel" aria-labelledby="liquidation-tab-owed" hidden={activeTab !== 'owed'}>
        <TableControls id="receipts-owed" controls={owedControls} dateLabel="Deadline"/>
        <div className="ledger-table-scroll">
          <div className="page-liquidation-table page-liquidation-table--owed">
            <div className="page-liquidation-header">
              {[
                { label: 'Voucher', field: 'voucher_number' },
                { label: 'Accountable', field: 'accountable' },
                { label: 'Amount', field: 'amount' },
                { label: 'Deadline', field: 'due_on' },
                { label: 'Action' },
              ].map(({ label, field }) => (<span key={label}>{field ? <TableSortHeader controls={owedControls} field={field}>{label}</TableSortHeader> : label}</span>))}
            </div>
            {owedControls.records.length === 0 ? <EmptyState>{owed.length === 0 ? 'No receipts are currently owed.' : 'No records match your filters.'}</EmptyState> : owedPagination.records.map((r, i) => {
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
                        Submit Receipt
                      </button>
                    : <span className="page-muted page-small">View only</span>}
                </div>);
        })}
          </div>
        </div>
        <Pagination pagination={owedPagination}/>
        </div>

        <div id="liquidation-panel-waiting" role="tabpanel" aria-labelledby="liquidation-tab-waiting" hidden={activeTab !== 'waiting'}>
        <TableControls id="submitted-receipts" controls={waitingControls} dateLabel="Submitted"/>
        <div className="ledger-table-scroll">
          <div className="page-liquidation-table page-liquidation-table--waiting">
            <div className="page-liquidation-header">
              {[
                { label: 'Voucher', field: 'voucher_number' },
                { label: 'Receipt', field: 'receipt_submitted_on' },
                { label: 'Difference', field: 'receipt_amount' },
                { label: 'Proof' },
                { label: 'Status' },
              ].map(({ label, field }) => (<span key={label}>{field ? <TableSortHeader controls={waitingControls} field={field}>{label}</TableSortHeader> : label}</span>))}
            </div>
            {waitingControls.records.length === 0 ? <EmptyState>{waiting.length === 0 ? 'No submitted receipts are waiting for review.' : 'No records match your filters.'}</EmptyState> : waitingPagination.records.map((r, i) => {
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
                    <div className="page-proof-actions">
                      <button type="button" onClick={() => setProofTransaction(r)} className="page-proof-button page-cell-nowrap">View Proof</button>
                      {canSubmitReceipt && Number(r.has_receipt_proof) !== 1 && <button type="button" onClick={() => setAttachProofTransaction(r)} disabled={busy} className="page-neutral-button page-proof-attach-button page-cell-nowrap">Attach Proof</button>}
                    </div>
                    <div className="page-proof-note page-proof-filename" title={Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : undefined}>{Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
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
        </div>
      </Panel>
      {receiptTransaction && (<Modal title={`Submit Receipt · ${receiptTransaction.voucher_number}`} onClose={() => setReceiptTransaction(null)} width={560}>
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
      {attachProofTransaction && <Modal title={`Attach Receipt Proof · ${attachProofTransaction.voucher_number}`} onClose={() => setAttachProofTransaction(null)} width={560}>
        <div className="page-liquidation-summary">
          {attachProofTransaction.purpose} · {attachProofTransaction.receipt_vendor} · {money(attachProofTransaction.receipt_amount)}
        </div>
        <form onSubmit={async event => {
          const completed = await submitForm(event, onSubmit, 'receipt-proof', actor);
          if (completed)
            setAttachProofTransaction(null);
        }}>
          <input type="hidden" name="disbursement_id" value={attachProofTransaction.id}/>
          <ProofUpload id="attach-receipt-proof" label="Receipt proof image" accept="image/jpeg,image/png" formats="JPG, JPEG, or PNG" required/>
          <div className="page-modal-actions">
            <button type="button" onClick={() => setAttachProofTransaction(null)} disabled={busy} className="page-neutral-button page-modal-button">Cancel</button>
            <button type="submit" disabled={busy} className="page-primary-button page-modal-button">{busy ? 'Attaching…' : 'Attach Proof'}</button>
          </div>
        </form>
      </Modal>}
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)}/>
    </div>);
}
// ─── Review Queue ─────────────────────────────────────────────────────────────
