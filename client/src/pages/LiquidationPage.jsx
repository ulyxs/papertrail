import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, StatusDot, DeadlineBar, ApiField, ProofUpload, Modal, ProofModal, EmptyState } from '../components/ui';
import { c } from '../config/theme';
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
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Accountable', 'Amount', 'Deadline', 'Action'].map(h => (<span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>))}
            </div>
            {owed.length === 0 ? <EmptyState>No receipts are currently owed.</EmptyState> : owedPagination.records.map((r, i) => {
            const remaining = daysUntil(r.due_on);
            const overdue = remaining < 0;
            return (<div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr', padding: '14px 20px', alignItems: 'center', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.purpose}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{r.voucher_number} · {r.project}</div>
                  </div>
                  <span>{r.accountable}</span>
                  <span style={{ fontWeight: 500 }}>{money(r.amount)}</span>
                  <DeadlineBar label={overdue ? `${Math.abs(remaining)} day(s) overdue` : `${remaining} day(s) left`} pct={Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue}/>
                  {canSubmitReceipt
                    ? <button type="button" onClick={() => setReceiptTransaction(r)} disabled={busy} style={{ padding: '7px 10px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.link, cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                        Submit Receipt
                      </button>
                    : <span style={{ color: c.muted, fontSize: 12 }}>View only</span>}
                </div>);
        })}
          </div>
        </div>
        <Pagination pagination={owedPagination}/>
      </Panel>

      {receiptTransaction && (<Modal title={`Submit receipt · ${receiptTransaction.voucher_number}`} onClose={() => setReceiptTransaction(null)} width={560}>
          <div style={{ marginBottom: 16, padding: 12, background: c.surface, borderRadius: 4, color: c.muted, fontSize: 12 }}>
            {receiptTransaction.purpose} · {receiptTransaction.project} · {money(receiptTransaction.amount)}
          </div>
          <form onSubmit={async (event) => {
                const completed = await submitForm(event, onSubmit, 'receipt', actor);
                if (completed)
                    setReceiptTransaction(null);
            }}>
            <input type="hidden" name="disbursement_id" value={receiptTransaction.id}/>
            <ApiField label="Vendor or description" name="vendor" id="receipt-modal-vendor" placeholder="Store or recipient"/>
            <div style={{ height: 10 }}/>
            <ApiField label="Receipt total" name="amount" id="receipt-modal-amount" type="number" min="0.01" step="0.01"/>
            <div style={{ height: 10 }}/>
            <ApiField label="Receipt date" name="submitted_on" id="receipt-modal-date" type="date" defaultValue={today()}/>
            <div style={{ height: 10 }}/>
            <ApiField label="Reference number" name="reference" id="receipt-modal-reference" required={false}/>
            <div style={{ height: 10 }}/>
            <ApiField label="Note" name="note" id="receipt-modal-note" required={false}/>
            <div style={{ height: 10 }}/>
            <ProofUpload id="receipt-modal-proof" label="Receipt proof image (optional)" accept="image/jpeg,image/png" formats="JPG, JPEG, or PNG"/>
            <div style={{ display: 'flex', justifyContent: 'end', gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setReceiptTransaction(null)} disabled={busy} style={{ padding: '8px 14px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.white, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </form>
        </Modal>)}
      <Panel>
        <PanelHeader title="Submitted, waiting on a decision" right={`${waiting.length} item(s)`}/>
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Receipt', 'Difference', 'Proof', 'Status'].map(h => (<span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>))}
            </div>
            {waiting.length === 0 ? <EmptyState>No submitted receipts are waiting for review.</EmptyState> : waitingPagination.records.map((r, i) => {
            const differenceCents = cents(r.receipt_amount) - cents(r.amount);
            return (<div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '14px 20px', alignItems: 'start', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.purpose}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{r.voucher_number}</div>
                  </div>
                  <div>
                    <div>{r.receipt_vendor}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>Filed {formatDate(r.receipt_submitted_on)} · {r.receipt_reference}</div>
                  </div>
                  <span style={{ color: differenceCents ? c.overdue : c.text, fontWeight: 500 }}>{differenceCents === 0 ? 'Exact' : money(differenceCents / 100)}</span>
                  <div>
                    <button type="button" onClick={() => setProofTransaction(r)} style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 9px', background: c.surface, color: c.link, cursor: 'pointer', whiteSpace: 'nowrap' }}>View Proof</button>
                    <div style={{ marginTop: 4, color: c.muted, fontSize: 10 }}>{Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <StatusDot status="For review"/>
                      <span style={{ color: c.review, fontSize: 13 }}>For review</span>
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
