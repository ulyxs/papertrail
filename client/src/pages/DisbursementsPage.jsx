import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, StatusDot, DeadlineBar, ProofModal, EmptyState } from '../components/ui';
import { money, formatDate, daysUntil, isOverdue, statusLabel } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
export default function DisbursementsPage({ dashboard }) {
    const { disbursements } = dashboard;
    const [proofTransaction, setProofTransaction] = useState(null);
    const disbursementPagination = usePagination(disbursements);
    return (<div>
      <PageHeader title="Disbursements"/>
      <Panel>
        <PanelHeader title="All Transactions" right={`${disbursements.length} record(s)`}/>
        <div className="ledger-table-scroll">
          <div className="page-disbursement-table">
            <div className="page-disbursement-header">
              {['Voucher', 'Accountable', 'Amount', 'Receipt', 'Deadline', 'Status'].map(h => (<span key={h}>{h}</span>))}
            </div>
            {disbursements.length === 0 ? <EmptyState /> : disbursementPagination.records.map((r, i) => {
            const remaining = daysUntil(r.due_on);
            const overdue = isOverdue(r);
            const label = r.status === 'approved'
                ? `Approved ${formatDate(r.receipt_submitted_on)}`
                : r.status === 'for_review' || r.status === 'flagged'
                    ? `Receipt in on ${formatDate(r.receipt_submitted_on)}`
                    : overdue ? `${Math.abs(remaining)} day(s) overdue` : `${remaining} day(s) left`;
            const status = statusLabel(r);
            const statusColor = status === 'Flagged' ? 'flagged' : status === 'Receipt overdue' ? 'overdue' : status === 'Approved' ? 'approved' : 'review';
            return (<div key={r.id} className={`page-disbursement-row${i > 0 ? ' has-divider' : ''}`}>
                  <div>
                    <div className="page-disbursement-purpose">{r.purpose}</div>
                    <div className="page-disbursement-meta">{r.voucher_number} · {r.project}</div>
                    <div className="page-disbursement-meta">Released {formatDate(r.released_on)}</div>
                  </div>
                  <span>{r.accountable}</span>
                  <span className="page-disbursement-amount">{money(r.amount)}</span>
                  <div>
                    {r.receipt_vendor
                    ? <>
                          <div>{r.receipt_vendor}</div>
                          <div className="page-disbursement-receipt">{r.receipt_reference || 'Receipt submitted'} · {money(r.receipt_amount)}</div>
                          <button type="button" onClick={() => setProofTransaction(r)} className="page-proof-button page-button--compact page-disbursement-proof-button">View Proof</button>
                          <div className="page-proof-note page-proof-filename" title={Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : undefined}>{Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                        </>
                    : <span className="page-muted">Not submitted</span>}
                  </div>
                  <DeadlineBar label={label} pct={r.status === 'approved' || r.status === 'for_review' || r.status === 'flagged' ? 100 : Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue}/>
                  <div>
                    <div className="page-status-inline">
                      <StatusDot status={status}/>
                      <span className={`page-disbursement-status page-disbursement-status--${statusColor}`}>{status}</span>
                    </div>
                  </div>
                </div>);
        })}
          </div>
        </div>
        <Pagination pagination={disbursementPagination}/>
      </Panel>
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)}/>
    </div>);
}
// ─── Release Funds ────────────────────────────────────────────────────────────
