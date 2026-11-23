import { PageHeader, Panel, PanelHeader, StatusDot, DeadlineBar, EmptyState } from '../components/ui';
import { money, cents, formatDate, daysUntil } from '../utils/formatters';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
export default function OverviewPage({ dashboard }) {
    const { summary, disbursements } = dashboard;
    const waiting = disbursements.filter(record => record.status === 'for_review');
    const outstanding = disbursements.filter(record => record.status === 'awaiting_receipt');
    const waitingPagination = usePagination(waiting);
    return (<div>
      <PageHeader title="Overview" sub="Every peso released is tied to a person and a seven-day clock. Nothing closes until a receipt is in, reviewed, and filed under its project."/>

      {/* Stat cards */}
      <div className="stat-grid">
        {[
            { label: 'Cash on hand', value: money(summary.cash_on_hand), sub: `${money(summary.total_received)} recorded, ${money(summary.total_released)} released`, color: 'regular' },
            { label: 'Released but not yet liquidated', value: money(summary.outstanding), sub: `${disbursements.filter(record => record.status !== 'approved').length} open transaction(s)`, color: 'amber' },
            { label: 'Past the deadline', value: money(summary.overdue), sub: `${summary.overdue_count} receipt(s) overdue · ${summary.blocked_people} person(s) on hold`, color: 'overdue' },
        ].map((s, i) => (<div key={i} className="page-stat-card">
            <div className="page-stat-label">{s.label}</div>
            <div className={`page-stat-value page-stat-value--${s.color}`}>{s.value}</div>
            <div className="page-stat-sub">{s.sub}</div>
          </div>))}
      </div>

      {/* Liquidation clock */}
      <Panel>
        <PanelHeader title="Liquidation Clock" right="Seven days from release, counted from the date the cash left the ledger"/>
        <div className="ledger-table-scroll">
          <div className="page-overview-table page-overview-table--outstanding">
            <div className="page-overview-header">
              {['Voucher', 'Held by', 'Amount', 'Released', 'Time left'].map(h => (<span key={h}>{h}</span>))}
            </div>
            {outstanding.length === 0 ? <EmptyState>No receipts are currently outstanding.</EmptyState> : outstanding.slice(0, 5).map(record => {
            const remaining = daysUntil(record.due_on);
            const overdue = remaining < 0;
            return (<div key={record.id} className="page-overview-row page-overview-row--outstanding">
                  <div>
                    <div className="page-overview-purpose">{record.purpose}</div>
                    <div className="page-overview-meta">{record.voucher_number} · {record.project}</div>
                  </div>
                  <span>{record.accountable}</span>
                  <span className="page-overview-amount">{money(record.amount)}</span>
                  <span className="page-muted">{formatDate(record.released_on)}</span>
                  <DeadlineBar label={overdue ? `${Math.abs(remaining)} day(s) overdue` : `${remaining} day(s) left`} pct={Math.min(100, Math.max(0, (7 - remaining) / 7 * 100))} overdue={overdue}/>
                </div>);
        })}
          </div>
        </div>
      </Panel>

      {/* Waiting on auditor */}
      <Panel>
        <PanelHeader title="Waiting on the Auditor" right={`${waiting.length} transaction(s) with receipts submitted`}/>
        <div className="ledger-table-scroll">
          <div className="page-overview-table page-overview-table--waiting">
            <div className="page-overview-header">
              {['Voucher', 'Receipt', 'Released', 'Receipted', 'Status'].map(h => (<span key={h}>{h}</span>))}
            </div>
            {waiting.length === 0 ? <EmptyState>No receipts are waiting for review.</EmptyState> : waitingPagination.records.map((r, i) => (<div key={r.id} className={`page-overview-row page-overview-row--waiting${i > 0 ? ' has-divider' : ''}`}>
                <div>
                  <div className="page-overview-purpose">{r.purpose}</div>
                  <div className="page-overview-meta">{r.voucher_number} · {r.accountable}</div>
                </div>
                <div>
                  <div>{r.receipt_vendor}</div>
                  <div className="page-overview-meta">{r.receipt_reference}</div>
                </div>
                <span>{money(r.amount)}</span>
                <span className={`page-overview-amount${cents(r.receipt_amount) !== cents(r.amount) ? ' overdue' : ''}`}>{money(r.receipt_amount)}</span>
                <span className="page-status-inline">
                  <StatusDot status="For review"/>
                  <span className="page-review-status">For review</span>
                </span>
              </div>))}
          </div>
        </div>
        <Pagination pagination={waitingPagination}/>
      </Panel>

    </div>);
}
// ─── Funds Received ───────────────────────────────────────────────────────────
