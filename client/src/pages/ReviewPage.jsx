import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, Modal, ProofModal, EmptyState } from '../components/ui';
import { c } from '../config/theme';
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
    const tableStyle = { width: '100%', minWidth: 1120, borderCollapse: 'collapse', textAlign: 'left' };
    const headerStyle = { padding: '10px 12px', borderBottom: `1px solid ${c.borderLight}`, color: c.muted, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' };
    const cellStyle = { padding: '12px', borderTop: `1px solid ${c.borderLight}`, verticalAlign: 'top', fontSize: 12 };
    function ReceiptProofButton({ record }) {
        return (<div>
        <button type="button" onClick={() => setProofTransaction(record)} style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 9px', background: c.surface, color: c.link, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          View Receipt
        </button>
        <div style={{ marginTop: 4, color: c.muted, fontSize: 10 }}>
          {Number(record.has_receipt_proof) === 1 ? (record.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}
        </div>
      </div>);
    }
    return (<div>
      <PageHeader title="Review queue" sub="Transactions with receipts submitted and waiting on an auditor's decision."/>
      <Panel>
        <PanelHeader title="Pending decisions" right={`${pending.length} item(s)`}/>
        {pending.length === 0
            ? <EmptyState>No receipts are waiting for a decision.</EmptyState>
            : <>
            <TableContainer>
              <table style={tableStyle}>
                <thead>
                  <tr>{['Voucher', 'Accountable person', 'Receipt details', 'Released', 'Receipted', 'Difference', 'Proof', 'Actions'].map(label => <th key={label} scope="col" style={headerStyle}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {pendingPagination.records.map(record => {
                    const differenceCents = cents(record.receipt_amount) - cents(record.amount);
                    return (<tr key={record.id}>
                        <td style={cellStyle}>
                          <strong>{record.voucher_number}</strong>
                          <div style={{ marginTop: 3, color: c.muted }}>{record.project}</div>
                          <div style={{ marginTop: 3 }}>{record.purpose}</div>
                        </td>
                        <td style={cellStyle}>{record.accountable}</td>
                        <td style={cellStyle}>
                          <strong>{record.receipt_vendor}</strong>
                          {record.receipt_reference && <div style={{ marginTop: 3, color: c.muted }}>Ref: {record.receipt_reference}</div>}
                          <div style={{ marginTop: 3, color: c.muted }}>Submitted {formatDate(record.receipt_submitted_on)}</div>
                          {record.receipt_note && <div style={{ marginTop: 5 }}>{record.receipt_note}</div>}
                        </td>
                        <td style={cellStyle}>{money(record.amount)}</td>
                        <td style={cellStyle}>{money(record.receipt_amount)}</td>
                        <td style={{ ...cellStyle, color: differenceCents ? c.overdue : c.greenBar, fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {differenceCents === 0 ? 'Exact' : money(differenceCents / 100)}
                        </td>
                        <td style={cellStyle}><ReceiptProofButton record={record}/></td>
                        <td style={cellStyle}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 260 }}>
                            <button type="button" disabled={busy || differenceCents !== 0} onClick={() => onSubmit('review', { disbursement_id: record.id, decision: 'approve', actor })} style={{ padding: '7px 10px', background: c.primary, color: c.primaryText, border: 'none', borderRadius: 4, fontSize: 12, cursor: busy || differenceCents !== 0 ? 'not-allowed' : 'pointer', opacity: differenceCents !== 0 ? 0.6 : 1 }}>
                              Approve
                            </button>
                            <button type="button" disabled={busy} onClick={() => onSubmit('review', { disbursement_id: record.id, decision: 'flag', actor })} style={{ padding: '7px 10px', background: 'transparent', color: c.overdue, border: `1px solid ${c.overdue}`, borderRadius: 4, fontSize: 12, cursor: busy ? 'wait' : 'pointer' }}>
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
              <table style={tableStyle}>
                <thead>
                  <tr>{['Voucher', 'Accountable person', 'Receipt details', 'Released', 'Receipted', 'Proof', 'Resolution'].map(label => <th key={label} scope="col" style={headerStyle}>{label}</th>)}</tr>
                </thead>
                <tbody>
                  {flaggedPagination.records.map(record => (<tr key={record.id}>
                      <td style={cellStyle}>
                        <strong>{record.voucher_number}</strong>
                        <div style={{ marginTop: 3, color: c.muted }}>{record.project}</div>
                        <div style={{ marginTop: 3 }}>{record.purpose}</div>
                      </td>
                      <td style={cellStyle}>{record.accountable}</td>
                      <td style={cellStyle}>
                        <strong>{record.receipt_vendor}</strong>
                        {record.receipt_reference && <div style={{ marginTop: 3, color: c.muted }}>Ref: {record.receipt_reference}</div>}
                        <div style={{ marginTop: 3, color: c.muted }}>Submitted {formatDate(record.receipt_submitted_on)}</div>
                        <div style={{ marginTop: 5 }}>{record.receipt_note}</div>
                      </td>
                      <td style={cellStyle}>{money(record.amount)}</td>
                      <td style={cellStyle}>{money(record.receipt_amount)}</td>
                      <td style={cellStyle}><ReceiptProofButton record={record}/></td>
                      <td style={cellStyle}>
                        <button type="button" disabled={busy} onClick={() => setResolutionTransaction(record)} style={{ padding: '8px 10px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, whiteSpace: 'nowrap', cursor: busy ? 'wait' : 'pointer' }}>
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
          <div style={{ marginBottom: 14, padding: 12, background: c.surface, borderRadius: 4, color: c.muted, fontSize: 12 }}>
            {resolutionTransaction.purpose} · {resolutionTransaction.project} · {resolutionTransaction.receipt_vendor}
          </div>
          <form onSubmit={async (event) => {
                const completed = await submitForm(event, onSubmit, 'review', actor);
                if (completed)
                    setResolutionTransaction(null);
            }}>
            <input type="hidden" name="disbursement_id" value={resolutionTransaction.id}/>
            <input type="hidden" name="decision" value="resolve"/>
            <label htmlFor="resolution-note" style={{ display: 'block', marginBottom: 6, color: c.muted, fontSize: 12 }}>How was this discrepancy settled?</label>
            <textarea id="resolution-note" name="resolution_note" rows={4} maxLength={500} required placeholder="Refund reference or explanation reviewed" style={{ width: '100%', resize: 'vertical', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text, font: 'inherit' }}/>
            <div style={{ display: 'flex', justifyContent: 'end', gap: 10, marginTop: 16 }}>
              <button type="button" onClick={() => setResolutionTransaction(null)} disabled={busy} style={{ padding: '8px 14px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.white, color: c.text, cursor: busy ? 'wait' : 'pointer' }}>
                Cancel
              </button>
              <button type="submit" disabled={busy} style={{ padding: '8px 14px', border: 'none', borderRadius: 4, background: c.primary, color: c.primaryText, cursor: busy ? 'wait' : 'pointer' }}>
                {busy ? 'Saving…' : 'Record resolution'}
              </button>
            </div>
          </form>
        </Modal>)}
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)}/>
    </div>);
}
// ─── Archive ──────────────────────────────────────────────────────────────────
