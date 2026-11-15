import { PageHeader, Panel, PanelHeader, StatusDot, DeadlineBar, EmptyState } from '../components/ui';
import { c } from '../config/theme';
import { money, cents, formatDate, daysUntil } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
export default function OverviewPage({ dashboard }) {
    const { summary, disbursements } = dashboard;
    const waiting = disbursements.filter(record => record.status === 'for_review');
    const outstanding = disbursements.filter(record => record.status === 'awaiting_receipt');
    const waitingPagination = usePagination(waiting);
    return (<div>
      <PageHeader title="Where the money stands today" sub="Every peso released is tied to a person and a seven-day clock. Nothing closes until a receipt is in, reviewed, and filed under its project."/>

      {/* Stat cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 20 }}>
        {[
            { label: 'Cash on hand', value: money(summary.cash_on_hand), sub: `${money(summary.total_received)} recorded, ${money(summary.total_released)} released`, color: c.text },
            { label: 'Released but not yet liquidated', value: money(summary.outstanding), sub: `${disbursements.filter(record => record.status !== 'approved').length} open transaction(s)`, color: c.amber },
            { label: 'Past the deadline', value: money(summary.overdue), sub: `${summary.overdue_count} receipt(s) overdue · ${summary.blocked_people} person(s) on hold`, color: c.overdue },
        ].map((s, i) => (<div key={i} style={{ background: c.white, padding: '20px 24px' }}>
            <div style={{ fontSize: 12, color: c.muted, marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400, color: s.color, marginBottom: 6 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: c.muted }}>{s.sub}</div>
          </div>))}
      </div>

      {/* Liquidation clock */}
      <Panel>
        <PanelHeader title="Liquidation clock" right="Seven days from release, counted from the date the cash left the ledger"/>
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Held by', 'Amount', 'Released', 'Time left'].map(h => (<span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>))}
            </div>
            {outstanding.length === 0 ? <EmptyState>No receipts are currently outstanding.</EmptyState> : outstanding.slice(0, 5).map(record => {
            const remaining = daysUntil(record.due_on);
            const overdue = remaining < 0;
            return (<div key={record.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1.5fr', padding: '16px 20px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: c.text }}>{record.purpose}</div>
                    <div style={{ fontSize: 11, color: c.muted }}>{record.voucher_number} · {record.project}</div>
                  </div>
                  <span style={{ color: c.text }}>{record.accountable}</span>
                  <span style={{ fontWeight: 500 }}>{money(record.amount)}</span>
                  <span style={{ color: c.muted }}>{formatDate(record.released_on)}</span>
                  <DeadlineBar label={overdue ? `${Math.abs(remaining)} day(s) overdue` : `${remaining} day(s) left`} pct={Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue}/>
                </div>);
        })}
          </div>
        </div>
      </Panel>

      {/* Waiting on auditor */}
      <Panel>
        <PanelHeader title="Waiting on the auditor" right={`${waiting.length} transaction(s) with receipts submitted`}/>
        <div className="ledger-table-scroll">
          <div style={{ minWidth: 700 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '8px 20px', borderBottom: `1px solid ${c.borderLight}` }}>
              {['Voucher', 'Receipt', 'Released', 'Receipted', 'Status'].map(h => (<span key={h} style={{ fontSize: 12, color: c.muted }}>{h}</span>))}
            </div>
            {waiting.length === 0 ? <EmptyState>No receipts are waiting for review.</EmptyState> : waitingPagination.records.map((r, i) => (<div key={r.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '14px 20px', alignItems: 'start', borderTop: i > 0 ? `1px solid ${c.borderLight}` : 'none' }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{r.purpose}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{r.voucher_number} · {r.accountable}</div>
                </div>
                <div>
                  <div>{r.receipt_vendor}</div>
                  <div style={{ fontSize: 11, color: c.muted }}>{r.receipt_reference}</div>
                </div>
                <span>{money(r.amount)}</span>
                <span style={{ color: cents(r.receipt_amount) !== cents(r.amount) ? c.overdue : c.text, fontWeight: 500 }}>{money(r.receipt_amount)}</span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <StatusDot status="For review"/>
                  <span style={{ color: c.review, fontSize: 13 }}>For review</span>
                </span>
              </div>))}
          </div>
        </div>
        <Pagination pagination={waitingPagination}/>
      </Panel>

    </div>);
}
// ─── Funds Received ───────────────────────────────────────────────────────────
