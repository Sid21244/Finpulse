import { AlertTriangle, Edit3, Plus, Trash2 } from 'lucide-react';
import type { BudgetItem } from '../data/store';

type Props = {
  budgets: BudgetItem[];
  add: () => void;
  edit: (item: BudgetItem) => void;
  remove: (id: number) => void;
};

export function BudgetsPage({ budgets, add, edit, remove }: Props) {
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const overallPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;
  const overBudget = budgets.filter((b) => b.spent > b.limit);
  const nearLimit = budgets.filter((b) => b.spent > b.limit * 0.8 && b.spent <= b.limit);

  return (
    <>
      {/* Summary banner */}
      <section className="account-total" style={{ background: 'linear-gradient(120deg, #172947, #244d7f)' }}>
        <div>
          <span>Total budget this month</span>
          <strong>{inr(totalLimit)}</strong>
          <p>{inr(totalSpent)} spent · {inr(Math.max(0, totalLimit - totalSpent))} remaining · {overallPct}% used</p>
        </div>
        <button className="primary light" onClick={add}><Plus size={17} /> Add budget</button>
      </section>

      {/* Alert banners */}
      {overBudget.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', marginTop: 16,
          borderRadius: 12, background: '#ffe9ea', border: '1px solid #f1adb0', fontSize: 11,
        }}>
          <AlertTriangle size={17} color="var(--red)" />
          <span style={{ color: 'var(--red)', fontWeight: 700 }}>Over budget:</span>
          <span style={{ color: 'var(--muted)' }}>
            {overBudget.map((b) => b.category).join(', ')} {overBudget.length === 1 ? 'has' : 'have'} exceeded the monthly limit.
          </span>
        </div>
      )}

      {nearLimit.length > 0 && overBudget.length === 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', marginTop: 16,
          borderRadius: 12, background: '#fff8ec', border: '1px solid #f3e4c9', fontSize: 11,
        }}>
          <AlertTriangle size={17} color="var(--amber)" />
          <span style={{ color: 'var(--amber)', fontWeight: 700 }}>Near limit:</span>
          <span style={{ color: 'var(--muted)' }}>
            {nearLimit.map((b) => b.category).join(', ')} {nearLimit.length === 1 ? 'is' : 'are'} above 80% of the limit.
          </span>
        </div>
      )}

      {/* Budget list */}
      <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
        {budgets.map((budget) => {
          const pct = budget.limit > 0 ? Math.round((budget.spent / budget.limit) * 100) : 0;
          const isOver = budget.spent > budget.limit;
          const isNear = pct >= 80 && !isOver;
          const barColor = isOver ? 'var(--red)' : isNear ? 'var(--amber)' : 'var(--blue)';

          return (
            <article
              key={budget.id}
              className="card"
              style={{ padding: '18px 20px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 800,
                    padding: '4px 10px', borderRadius: 6,
                    background: isOver ? '#ffe9ea' : isNear ? '#fff8ec' : '#eaf1ff',
                    color: isOver ? 'var(--red)' : isNear ? 'var(--amber)' : 'var(--blue)',
                  }}>
                    {pct}%
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{budget.category}</span>
                  {isOver && (
                    <span style={{
                      fontSize: 8, padding: '2px 6px', borderRadius: 4,
                      background: '#ffe9ea', color: 'var(--red)', fontWeight: 800,
                    }}>
                      OVER
                    </span>
                  )}
                  {isNear && !isOver && (
                    <span style={{
                      fontSize: 8, padding: '2px 6px', borderRadius: 4,
                      background: '#fff8ec', color: 'var(--amber)', fontWeight: 800,
                    }}>
                      NEAR LIMIT
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="bare" onClick={() => edit(budget)} aria-label={`Edit ${budget.category}`}>
                    <Edit3 size={15} />
                  </button>
                  <button
                    className="bare"
                    onClick={() => { if (window.confirm(`Delete the ${budget.category} budget?`)) remove(budget.id); }}
                    aria-label={`Delete ${budget.category}`}
                  >
                    <Trash2 size={15} color="var(--red)" />
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--muted)', marginBottom: 6 }}>
                  <span>Spent: {inr(budget.spent)}</span>
                  <span>Limit: {inr(budget.limit)}</span>
                </div>
                <div style={{ height: 6, background: 'var(--soft)', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 10, background: barColor,
                    width: `${Math.min(100, pct)}%`,
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              </div>
            </article>
          );
        })}

        {budgets.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '48px 20px',
            border: '1px dashed var(--line)', borderRadius: 14,
            background: 'var(--soft)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No budgets yet</p>
            <p style={{ fontSize: 9, color: 'var(--muted)', marginBottom: 14 }}>Create a budget to start tracking your spending limits.</p>
            <button className="primary" onClick={add}><Plus size={16} /> Create budget</button>
          </div>
        )}
      </div>
    </>
  );
}

function inr(value: number) { return `₹${Math.abs(value).toLocaleString('en-IN')}`; }
