import { FormEvent, useState } from 'react';
import { X, Target } from 'lucide-react';
import type { GoalItem } from '../data/store';

type Props = {
  close: () => void;
  save: (amount: number) => void;
  goal: GoalItem;
};

const QUICK_AMOUNTS = [1000, 2500, 5000, 10000];

export function ContributeModal({ close, save, goal }: Props) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const remaining = goal.target - goal.saved;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) { setError('Enter a valid amount.'); return; }
    if (num > remaining) { setError(`Cannot exceed remaining amount of ₹${remaining.toLocaleString('en-IN')}.`); return; }
    save(num);
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form className="modal contribute-modal" onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="close-modal" onClick={close}><X /></button>
        <div className="modal-symbol"><Target /></div>
        <span>CONTRIBUTE TO GOAL</span>
        <h2>Add to {goal.title}</h2>
        <p>Remaining: ₹{remaining.toLocaleString('en-IN')} · {Math.round(goal.saved / goal.target * 100)}% complete</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 13 }}>
          {QUICK_AMOUNTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              style={{
                height: 36,
                borderRadius: 8,
                border: `1px solid ${amount === String(q) ? 'var(--blue)' : 'var(--line)'}`,
                background: amount === String(q) ? 'var(--blue-soft)' : 'var(--card)',
                fontSize: 10,
                fontWeight: 700,
                color: amount === String(q) ? 'var(--blue)' : 'var(--text)',
                cursor: 'pointer',
              }}
            >
              ₹{q.toLocaleString('en-IN')}
            </button>
          ))}
        </div>

        <label style={{ marginTop: 13 }}>
          Custom amount (₹)
          <input inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="Enter amount" />
        </label>

        {error && <div className="form-error">{error}</div>}
        <button className="primary modal-submit" type="submit">Add contribution</button>
      </form>
    </div>
  );
}
