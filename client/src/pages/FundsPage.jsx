import { useState } from 'react';
import { PageHeader, Panel, PanelHeader, ApiField, ProofUpload, ProofModal, EmptyState } from '../components/ui';
import { c } from '../config/theme';
import { submitForm } from '../services/forms';
import { money, today, formatDate } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
export default function FundsPage({ dashboard, onSubmit, busy, actor, canManage, }) {
    const { funds } = dashboard;
    const [proofFund, setProofFund] = useState(null);
    const fundsPagination = usePagination(funds);
    const categories = [
        'Department Allocation',
        'Membership Dues',
        'Sponsorships',
        'Donations',
        'Fundraising Activities',
        'Grants',
        'Others',
    ];
    return (<div>
      <PageHeader title="Funds received" sub="The opening side of the ledger. Only what is recorded here can be released."/>

      {canManage && <Panel>
        <PanelHeader title="Record money coming in"/>
        <form onSubmit={event => submitForm(event, onSubmit, 'funds', actor)} style={{ padding: 20 }}>
          <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <ApiField label="Source Name" name="source_name" placeholder="Member, organization, or funding office"/>
            <div>
              <label htmlFor="income_category" style={{ display: 'block', fontSize: 12, color: c.muted, marginBottom: 6 }}>Income Category</label>
              <select id="income_category" name="income_category" required defaultValue="" style={{ width: '100%', padding: '9px 12px', border: `1px solid ${c.border}`, borderRadius: 4, background: c.surface, color: c.text }}>
                <option value="" disabled>Select a category</option>
                {categories.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>
          <div className="responsive-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <ApiField label="Amount" name="amount" placeholder="0.00" type="number" min="0.01" step="0.01"/>
            <ApiField label="Date received" name="received_on" type="date" defaultValue={today()}/>
          </div>
          <div style={{ marginBottom: 20 }}>
            <ApiField label="Note" name="note" placeholder="Deposit reference or account" required={false}/>
          </div>
          <div style={{ marginBottom: 20 }}>
            <ProofUpload />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="submit" disabled={busy} style={{ padding: '9px 18px', borderRadius: 4, border: 'none', cursor: busy ? 'wait' : 'pointer', background: c.primary, color: c.primaryText }}>
              {busy ? 'Saving…' : 'Record the fund'}
            </button>
            <span style={{ fontSize: 12, color: c.muted }}>This adds to cash on hand and is written to the audit trail.</span>
          </div>
        </form>
      </Panel>}

      <Panel>
        <PanelHeader title="Receipts Ledger" right={`${funds.length} record(s) · ${money(dashboard.summary.total_received)} total`}/>
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 820 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr 1.5fr 1fr 1fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Category', 'Source Name', 'Note', 'Date', 'Amount', 'Proof'].map(h => (<span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>))}
            </div>
            {funds.length === 0 ? <EmptyState /> : fundsPagination.records.map((r, i) => (<div key={r.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.5fr 1.5fr 1fr 1fr 1fr', padding: '14px 20px', alignItems: 'center', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                <span style={{ color: c.muted }}>{r.income_category}</span>
                <span style={{ fontWeight: 500 }}>{r.source_name}</span>
                <span style={{ color: c.link }}>{r.note || '—'}</span>
                <span style={{ color: c.muted }}>{formatDate(r.received_on)}</span>
                <span style={{ fontWeight: 500 }}>{money(r.amount)}</span>
                <div>
                  <button type="button" onClick={() => setProofFund(r)} style={{ border: `1px solid ${c.border}`, borderRadius: 4, padding: '6px 9px', background: c.surface, color: c.link, cursor: 'pointer', whiteSpace: 'nowrap' }}>View Proof</button>
                  <div style={{ marginTop: 4, color: c.muted, fontSize: 10 }}>{Number(r.has_proof) === 1 ? (r.proof_name || 'Image uploaded') : 'No proof uploaded'}</div>
                </div>
              </div>))}
          </div>
        </div>
        <Pagination pagination={fundsPagination}/>
      </Panel>
      <ProofModal key={proofFund?.id ?? 'closed'} transaction={proofFund} onClose={() => setProofFund(null)}/>
    </div>);
}
// ─── Disbursements ────────────────────────────────────────────────────────────
