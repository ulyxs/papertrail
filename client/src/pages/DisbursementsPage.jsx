import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, StatusDot, DeadlineBar, ProofModal, EmptyState } from '../components/ui';
import { c } from '../config/theme';
import { money, formatDate, daysUntil, isOverdue, statusLabel } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
export default function DisbursementsPage({ dashboard }) {
    const { disbursements } = dashboard;
    const [proofTransaction, setProofTransaction] = useState(null);
    const disbursementPagination = usePagination(disbursements);
    return (<div>
      <PageHeader title="Disbursements" sub="Every release, who is accountable for it, and where it sits in the chain."/>
      <Panel>
        <PanelHeader title="All transactions" right={`${disbursements.length} record(s)`}/>
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 900 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.5fr 1.5fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Accountable', 'Amount', 'Receipt', 'Deadline', 'Status'].map(h => (<span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>))}
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
            return (<div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.5fr 1.5fr', padding: '14px 20px', alignItems: 'start', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{r.purpose}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{r.voucher_number} · {r.project}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>Released {formatDate(r.released_on)}</div>
                  </div>
                  <span>{r.accountable}</span>
                  <span style={{ fontWeight: 500 }}>{money(r.amount)}</span>
                  <div>
                    {r.receipt_vendor
                    ? <>
                          <div>{r.receipt_vendor}</div>
                          <div style={{ fontSize: 11, color: c.link }}>{r.receipt_reference || 'Receipt submitted'} · {money(r.receipt_amount)}</div>
                          <button type="button" onClick={() => setProofTransaction(r)} style={{ marginTop: 6, border: `1px solid ${c.border}`, borderRadius: 4, padding: '5px 8px', background: c.surface, color: c.link, cursor: 'pointer' }}>View Proof</button>
                          <div style={{ marginTop: 3, color: c.muted, fontSize: 10 }}>{Number(r.has_receipt_proof) === 1 ? (r.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                        </>
                    : <span style={{ color: c.muted }}>Not submitted</span>}
                  </div>
                  <DeadlineBar label={label} pct={r.status === 'approved' || r.status === 'for_review' || r.status === 'flagged' ? 100 : Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue}/>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <StatusDot status={status}/>
                      <span style={{
                    color: status === 'Flagged' ? c.flagged : status === 'Receipt overdue' ? c.overdue : status === 'Approved' ? c.greenBar : c.review,
                    fontSize: 13,
                }}>{status}</span>
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
