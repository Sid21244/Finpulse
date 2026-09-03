import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import type { BudgetItem } from '../data/store';

const CATEGORIES = [
  'Housing', 'Food & dining', 'Shopping', 'Transport', 'Entertainment',
  'Groceries', 'Utilities', 'Healthcare', 'Education', 'EMI', 'Other',
];

type Props = {
  close: () => void;
  save: (budget: Omit<BudgetItem, 'id' | 'spent'>) => void;
  editItem?: BudgetItem | null;
};

export function BudgetModal({ close, save, editItem }: Props) {
  const [category, setCategory] = useState(editItem?.category ?? '');
  const [limit, setLimit] = useState(editItem ? String(editItem.limit) : '');
  const [month, setMonth] = useState(editItem?.month ?? 'Sep 2026');
  const [error, setError] = useState('');

  const isEdit = !!editItem;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numLimit = Number(limit);
    if (!category.trim()) { setError('Select a category.'); return; }
    if (!Number.isFinite(numLimit) || numLimit <= 0) { setError('Enter a valid budget limit greater than zero.'); return; }

    save({
      category: category.trim(),
      limit: numLimit,
      month: month || 'Sep 2026',
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form className="modal budget-modal" onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="close-modal" onClick={close}><X /></button>
        <div className="modal-symbol">₹</div>
        <span>{isEdit ? 'EDIT BUDGET' : 'NEW BUDGET'}</span>
        <h2>{isEdit ? 'Update budget limit' : 'Set a spending limit'}</h2>
        <p>{isEdit ? 'Change the monthly limit for this category.' : 'Choose a category and set a monthly spending limit.'}</p>

        <label>
          Category
          <select value={category} onChange={(e) => { setCategory(e.target.value); setError(''); }}>
            <option value="">Select a category</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <div className="form-pair">
          <label>
            Monthly limit (₹)
            <input inputMode="numeric" value={limit} onChange={(e) => { setLimit(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="5000" />
          </label>
          <label>
            Month
            <input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="Sep 2026" />
          </label>
        </div>

        {error && <div className="form-error">{error}</div>}
        <button className="primary modal-submit" type="submit">{isEdit ? 'Save changes' : 'Create budget'}</button>
      </form>
    </div>
  );
}
