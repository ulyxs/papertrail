import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, Modal, ProofModal, EmptyState } from '../components/ui';
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
        <div className="page-personnel-note">
          A voucher is cleared once its receipt is approved by an Auditor.
        </div>
        <TableContainer>
          <table className="page-table page-personnel-table">
            <thead>
              <tr>
                {['Name', 'Assigned Role', 'Voucher clearance', 'Receipts'].map(label => (<th key={label} scope="col">{label}</th>))}
              </tr>
            </thead>
            <tbody>
              {personnel.length === 0
            ? <tr><td colSpan={4} className="page-empty-cell">No registered users.</td></tr>
            : personnelPagination.records.map(person => {
                const vouchers = voucherMap.get(Number(person.id)) || [];
                const clearedCount = vouchers.filter(voucher => voucher.status === 'approved').length;
                const allCleared = vouchers.length > 0 && clearedCount === vouchers.length;
                const clearanceColor = vouchers.length === 0 ? 'muted' : allCleared ? 'green' : 'amber';
                return (<tr key={person.id}>
                        <td className="page-cell-name">{person.first_name} {person.last_name}</td>
                        <td>{person.role}</td>
                        <td className="page-cell-status">
                          <span className={`page-personnel-clearance page-color-${clearanceColor}`}>
                            {vouchers.length === 0 ? 'No vouchers' : `${clearedCount} of ${vouchers.length} cleared`}
                          </span>
                        </td>
                        <td>
                          <button type="button" onClick={() => setSelectedPerson(person)} className="page-proof-button">
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
                        const statusColor = cleared ? 'green' : voucher.status === 'flagged' || label === 'Receipt overdue' ? 'overdue' : 'amber';
                        return (<div key={voucher.id} className="page-personnel-voucher">
                      <div className="page-personnel-voucher-header">
                        <strong>{voucher.voucher_number} · {voucher.project}</strong>
                        <span className={`page-personnel-status page-color-${statusColor}`}>{label}</span>
                      </div>
                      <div className="page-personnel-voucher-meta">
                        {voucher.purpose} · Released {formatDate(voucher.released_on)} · {money(voucher.amount)}
                      </div>
                      {voucher.receipt_vendor
                                ? <div className="page-personnel-receipt">
                            <div>{voucher.receipt_vendor}{voucher.receipt_reference && ` · ${voucher.receipt_reference}`}</div>
                            <div className="page-muted">
                              Submitted {formatDate(voucher.receipt_submitted_on)} · {money(voucher.receipt_amount)}
                            </div>
                            {voucher.receipt_note && <div className="page-personnel-receipt-note">{voucher.receipt_note}</div>}
                            <button type="button" onClick={() => setProofTransaction(voucher)} className="page-proof-button page-button--compact page-personnel-proof-button">
                              View Receipt Proof
                            </button>
                            <span className="page-personnel-proof-note">
                              {Number(voucher.has_receipt_proof) === 1 ? (voucher.receipt_proof_name || 'Image uploaded') : 'No proof uploaded'}
                            </span>
                          </div>
                                : <div className="page-personnel-no-receipt">Receipt not submitted.</div>}
                    </div>);
                    })}
                <Pagination pagination={receiptPagination}/>
              </div>}
        </Modal>)}
      <ProofModal key={proofTransaction?.id ?? 'closed'} transaction={proofTransaction} kind="receipt" onClose={() => setProofTransaction(null)} zIndex={1200}/>
    </div>);
}
// ─── Audit Trail ──────────────────────────────────────────────────────────────
