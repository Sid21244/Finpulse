import { FormEvent, useState } from 'react';
import { X } from 'lucide-react';
import type { TransactionItem } from '../data/store';

const CATEGORIES = [
  'Food & dining', 'Shopping', 'Transport', 'Income', 'Loan payment',
  'Entertainment', 'Groceries', 'Utilities', 'Healthcare', 'Education', 'Other',
];

const CATEGORY_ICONS: Record<string, string> = {
  'Food & dining': 'S', 'Shopping': 'a', 'Transport': 'U', 'Income': 'A',
  'Loan payment': 'H', 'Entertainment': 'N', 'Groceries': 'B', 'Utilities': 'E',
  'Healthcare': 'M', 'Education': 'E', 'Other': 'O',
};

const CATEGORY_COLORS: Record<string, string> = {
  'Food & dining': 'orange', 'Shopping': 'navy', 'Transport': 'black', 'Income': 'blue',
  'Loan payment': 'red', 'Entertainment': 'red', 'Groceries': 'yellow', 'Utilities': 'orange',
  'Healthcare': 'blue', 'Education': 'blue', 'Other': 'orange',
};

type Props = {
  close: () => void;
  save: (tx: Omit<TransactionItem, 'id'>) => void;
  editItem?: TransactionItem | null;
};

export function TransactionModal({ close, save, editItem }: Props) {
  const [merchant, setMerchant] = useState(editItem?.merchant ?? '');
  const [category, setCategory] = useState(editItem?.category ?? 'Food & dining');
  const [amount, setAmount] = useState(editItem ? String(Math.abs(editItem.amount)) : '');
  const [date, setDate] = useState(editItem?.date ?? 'Today');
  const [status, setStatus] = useState(editItem?.status ?? 'Completed');
  const [type, setType] = useState<'expense' | 'income'>(editItem && editItem.amount > 0 ? 'income' : 'expense');
  const [error, setError] = useState('');

  const isEdit = !!editItem;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!merchant.trim()) { setError('Merchant name is required.'); return; }
    if (!Number.isFinite(numAmount) || numAmount <= 0) { setError('Enter a valid amount greater than zero.'); return; }

    save({
      merchant: merchant.trim(),
      category,
      date: date || 'Today',
      amount: type === 'income' ? numAmount : -numAmount,
      icon: CATEGORY_ICONS[category] ?? 'O',
      color: CATEGORY_COLORS[category] ?? 'orange',
      status,
    });
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form className="modal transaction-modal" onSubmit={handleSubmit} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="close-modal" onClick={close}><X /></button>
        <div className="modal-symbol">₹</div>
        <span>{isEdit ? 'EDIT TRANSACTION' : 'NEW TRANSACTION'}</span>
        <h2>{isEdit ? 'Update transaction details' : 'Record a transaction'}</h2>
        <p>{isEdit ? 'Modify the details below and save your changes.' : 'Enter the details of your income or expense.'}</p>

        <label>
          Merchant / description
          <input autoFocus value={merchant} onChange={(e) => { setMerchant(e.target.value); setError(''); }} placeholder="e.g. Swiggy, Amazon" />
        </label>

        <div className="form-pair">
          <label>
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value as 'expense' | 'income')}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </label>
        </div>

        <div className="form-pair">
          <label>
            Amount (₹)
            <input inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '')); setError(''); }} placeholder="0" />
          </label>
          <label>
            Date
            <input value={date} onChange={(e) => setDate(e.target.value)} placeholder="Today" />
          </label>
        </div>

        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>Completed</option>
            <option>Pending</option>
            <option>Auto-paid</option>
            <option>Recurring</option>
          </select>
        </label>

        {error && <div className="form-error">{error}</div>}
        <button className="primary modal-submit" type="submit">{isEdit ? 'Save changes' : 'Add transaction'}</button>
      </form>
    </div>
  );
}
