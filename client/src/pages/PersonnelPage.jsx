import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, Modal, ProofModal, EmptyState } from '../components/ui';
import { c } from '../config/theme';
import { money, formatDate, statusLabel } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import TableContainer from '../components/TableContainer';
export default function PersonnelPage({ dashboard }) {
    const personnel = dashboard.personnel || [];
    const voucherMap = new Map();
    for (const voucher of dashboard.disbursements || []) {
        const accountId = Number(voucher.recipient_account_id);
        if (!accountId)
            continue;
        const vouchers = voucherMap.get(accountId) ?? [];
        vouchers.push(voucher);
        voucherMap.set(accountId, vouchers);
    }
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [proofTransaction, setProofTransaction] = useState(null);
    const personnelPagination = usePagination(personnel);
    const selectedVouchers = selectedPerson ? voucherMap.get(Number(selectedPerson.id)) || [] : [];
    const receiptPagination = usePagination(selectedVouchers, 10, selectedPerson?.id);
    return (<div>
      <PageHeader title="Personnel" sub="Registered personnel and their voucher clearance."/>
      <Panel>
        <PanelHeader title="Registered personnel" right={`${personnel.length} account(s)`}/>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${c.borderLight}`, color: c.muted, fontSize: 12 }}>
          A voucher is cleared once its receipt is approved by an Auditor.
        </div>
        <TableContainer>
          <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                {['Name', 'Assigned Role', 'Voucher clearance', 'Receipts'].map(label => (<th key={label} scope="col" style={{ padding: '10px 14px', borderBottom: `1px solid ${c.borderLight}`, color: c.muted, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</th>))}
              </tr>
            </thead>
            <tbody>
              {personnel.length === 0
            ? <tr><td colSpan={4} style={{ padding: 20, color: c.muted, textAlign: 'center' }}>No registered users.</td></tr>
            : personnelPagination.records.map(person => {
                const vouchers = voucherMap.get(Number(person.id)) || [];
                const clearedCount = vouchers.filter(voucher => voucher.status === 'approved').length;
                const allCleared = vouchers.length > 0 && clearedCount === vouchers.length;
                const clearanceColor = vouchers.length === 0 ? c.muted : allCleared ? c.greenBar : c.amber;
                return (<tr key={person.id}>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, fontWeight: 500, whiteSpace: 'nowrap' }}>{person.first_name} {person.last_name}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}` }}>{person.role}</td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}`, minWidth: 180 }}>
                          <span style={{ color: clearanceColor, fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {vouchers.length === 0 ? 'No vouchers' : `${clearedCount} of ${vouchers.length} cleared`}
                          </span>
                        </td>
                        <td style={{ padding: '14px', borderTop: `1px solid ${c.borderLight}` }}>
                          <button type="button" onClick={() => setSelectedPerson(person)} style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 9px', background: c.surface, color: c.link, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                            View receipts
                          </button>
                        </td>
                      </tr>);
            })}
            </tbody>
          </table>
        </TableContainer>
        <Pagination pagination={personnelPagination}/>
      </Panel>
      {selectedPerson && (<Modal title={`${selectedPerson.first_name} ${selectedPerson.last_name} · Receipt history`} onClose={() => setSelectedPerson(null)} width={900}>
          {selectedVouchers.length === 0
                ? <EmptyState>No vouchers or receipts are linked to this person.</EmptyState>
                : <div>
                {receiptPagination.records.map(voucher => {
                        const cleared = voucher.status === 'approved';
                        const label = cleared ? 'Cleared' : statusLabel(voucher);
                        const statusColor = cleared ? c.greenBar : voucher.status === 'flagged' || label === 'Receipt overdue' ? c.overdue : c.amber;
                        return (<div key={voucher.id} style={{ padding: '12px 0', borderTop: `1px solid ${c.borderLight}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <strong>{voucher.voucher_number} · {voucher.project}</strong>
                        <span style={{ color: statusColor, whiteSpace: 'nowrap' }}>{label}</span>
                      </div>
                      <div style={{ marginTop: 3, color: c.muted, fontSize: 12 }}>
                        {voucher.purpose} · Released {formatDate(voucher.released_on)} · {money(voucher.amount)}
                      </div>
                      {voucher.receipt_vendor
                                ? <div style={{ marginTop: 8, fontSize: 12 }}>
                            <div>{voucher.receipt_vendor}{voucher.receipt_reference && ` · ${voucher.receipt_reference}`}</div>
                            <div style={{ color: c.muted }}>
                              Submitted {formatDate(voucher.receipt_submitted_on)} · {money(voucher.receipt_amount)}
                            </div>
                            {voucher.receipt_note && <div style={{ marginTop: 3, color: c.muted }}>{voucher.receipt_note}</div>}
                            <button type="button" onClick={() => setProofTransaction(voucher)} style={{ marginTop: 6, border: `1px solid ${c.border}`, borderRadius: 4, padding: '5px 8px', background: c.surface, color: c.link, cursor: 'pointer' }}>
                              View Receipt Proof
                            </button>
                            <span style={{ marginLeft: 8, color: c.muted, fontSize: 11 }}>
                              {Number(voucher.has_receipt_proof) === 1 ? (voucher.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}
                            </span>
                          </div>
                                : <div style={{ marginTop: 6, color: c.muted, fontSize: 12 }}>Receipt not submitted.</div>}
                    </div>);
                    })}
                <Pagination pagination={receiptPagination}/>
              </div>}
        </Modal>)}
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)} zIndex={1200}/>
    </div>);
}
// ─── Audit Trail ──────────────────────────────────────────────────────────────
