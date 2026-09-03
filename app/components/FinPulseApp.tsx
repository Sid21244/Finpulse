'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowRight, Banknote, Bell, BookOpen, Bot,
  BriefcaseBusiness, Building2, Check, ChevronDown, CircleDollarSign, CreditCard,
  Edit3, FileChartColumn, Fingerprint, Goal, Landmark, LayoutDashboard, Lightbulb, Menu,
  Moon, MoreHorizontal, Plus, Search, Settings, ShieldCheck, Sparkles, Sun,
  Target, TrendingUp, Trash2, UserRound, WalletCards, X,
} from 'lucide-react';
import { cashFlow, spending, transactions as seedTxns } from '../data/mockData';
import {
  getTransactions, addTransaction, updateTransaction, deleteTransaction,
  getBudgets, addBudget, updateBudget, deleteBudget,
  getGoals, addGoal, contributeToGoal, deleteGoal,
  getProfile, saveProfile,
  type TransactionItem, type BudgetItem, type GoalItem, type ProfileData,
} from '../data/store';
import { TransactionModal } from './TransactionModal';
import { BudgetModal } from './BudgetModal';
import { ContributeModal } from './ContributeModal';
import { ConnectAccountModal } from './ConnectAccountModal';
import { BudgetsPage } from './BudgetsPage';
import { FinancialCopilot, type LedgerDraft } from './FinancialCopilot';
import { PwaInstallButton } from './PwaInstallButton';
import { getSupabaseBrowserClient, supabaseConfigured } from '@/app/lib/supabase/client';

type Theme = 'light' | 'dark';
type PageId = 'overview' | 'ledger' | 'accounts' | 'budgets' | 'insights' | 'health' | 'goals' | 'fraud' | 'tax' | 'settings' | 'manage';
type ModalType = 'transaction' | 'budget' | 'contribute' | 'connect' | 'goal' | null;

const mainNav = [
  { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
  { id: 'ledger' as const, label: 'Transactions', icon: BookOpen },
  { id: 'accounts' as const, label: 'Accounts', icon: Landmark },
  { id: 'budgets' as const, label: 'Budgets', icon: Banknote },
  { id: 'insights' as const, label: 'Insights', icon: Sparkles },
  { id: 'health' as const, label: 'Health', icon: ShieldCheck },
  { id: 'goals' as const, label: 'Goals', icon: Goal },
  { id: 'fraud' as const, label: 'Fraud', icon: Fingerprint },
  { id: 'tax' as const, label: 'Tax insights', icon: FileChartColumn },
];

const pageCopy: Record<PageId, [string, string]> = {
  overview: ['Overview', 'Your finances, clearly summarized.'], ledger: ['Transactions', 'Review and search every transaction.'],
  accounts: ['Accounts', 'All your connected accounts in one place.'], budgets: ['Budgets', 'Track spending against your monthly limits.'],
  insights: ['Insights', 'Practical patterns detected across your money.'],
  health: ['Financial health', 'Understand the signals behind your score.'], goals: ['Goals', 'Track progress and create a goal that matters.'],
  fraud: ['Fraud center', 'Review unusual activity and secure your accounts.'], tax: ['Tax insights', 'Stay ahead of estimated tax and deductions.'],
  settings: ['Settings', 'Control your FinPulse experience.'], manage: ['Manage account', 'Update your profile and account preferences.'],
};

const accounts = [
  { name: 'HDFC Salary Account', type: 'Checking', digits: '4821', balance: 872540, icon: Building2, color: 'blue' },
  { name: 'ICICI Coral', type: 'Credit card', digits: '1904', balance: -28400, icon: CreditCard, color: 'violet' },
  { name: 'Groww Investments', type: 'Investment', digits: '7392', balance: 412800, icon: TrendingUp, color: 'green' },
  { name: 'Apple Cash', type: 'Wallet', digits: '1111', balance: 15000, icon: WalletCards, color: 'slate' },
];

function inr(value: number) { return `${value < 0 ? '−' : ''}₹${Math.abs(value).toLocaleString('en-IN')}`; }
function CardTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) { return <div className="card-title"><h2>{children}</h2>{action}</div>; }
function Metric({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof Landmark; tone: string }) { return <article className="metric"><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div><i className={tone}><Icon size={21}/></i></article>; }

function CashFlow() {
  return <div className="line-chart" aria-label="Income and expense trend over six months"><div className="y-labels"><span>₹70k</span><span>₹35k</span><span>₹0</span></div><div className="chart-lines income-line"/><div className="chart-lines expense-line"/><div className="chart-months">{cashFlow.map(item => <span key={item.month}>{item.month}</span>)}</div></div>;
}

function Donut() {
  return <div className="spend-wrap"><div className="spend-donut"><div><strong>₹41,250</strong><span>Total</span></div></div><div className="spend-list">{spending.map(item => <div key={item.label}><i style={{background:item.color}}/><span>{item.label}</span><b>{inr(item.value)}</b><small>{item.percent}%</small></div>)}</div></div>;
}

function MiniLedger({ items, limit }: { items: TransactionItem[]; limit?: number }) {
  const shown = limit ? items.slice(0, limit) : items;
  return <div className="ledger-list">{shown.map(item => <div className="ledger-row" key={item.id}><span className={`merchant ${item.color}`}>{item.icon}</span><div><strong>{item.merchant}</strong><small>{item.category}</small></div><span className="date">{item.date}</span><span className="posted"><i/> {item.status}</span><b className={item.amount > 0 ? 'gain' : ''}>{inr(item.amount)}</b></div>)}</div>;
}

function Overview({ go }: { go: (page: PageId) => void }) {
  return <><section className="metrics"><Metric label="Total balance" value="₹12,71,940" note="↑ 3.2% vs last month" icon={Landmark} tone="blue"/><Metric label="Monthly spend" value="₹41,250" note="↓ 8.7% vs last month" icon={CreditCard} tone="violet"/><Metric label="Income" value="₹65,000" note="↑ 5.4% vs last month" icon={ArrowDown} tone="green"/><Metric label="Emergency runway" value="5.2 months" note="On track" icon={ShieldCheck} tone="amber"/></section><section className="overview-grid"><div className="overview-main"><div className="charts"><article className="card cash"><CardTitle action={<button className="select-button">Last 6 months <ChevronDown size={14}/></button>}>Cash flow</CardTitle><div className="legend"><span><i className="blue-dot"/>Income</span><span><i className="red-dot"/>Expenses</span><span><i className="dash-dot"/>Net</span></div><CashFlow/></article><article className="card spending"><CardTitle action={<button className="select-button">This month <ChevronDown size={14}/></button>}>Spending by category</CardTitle><Donut/><button className="link-button" onClick={()=>go('insights')}>View full breakdown <ArrowRight size={15}/></button></article></div><div className="lower-grid"><article className="card account-preview"><CardTitle action={<button className="link-button" onClick={()=>go('accounts')}>Edit</button>}>Accounts</CardTitle>{accounts.map(({name,type,digits,balance,icon:Icon,color})=><div className="account-line" key={name}><i className={color}><Icon size={17}/></i><div><strong>{name}</strong><small>•••• {digits}</small></div><div><b>{inr(balance)}</b><small>{type}</small></div></div>)}<button className="link-button bottom-link" onClick={()=>go('accounts')}>View all accounts <ArrowRight size={15}/></button></article><article className="card recent"><CardTitle action={<button className="link-button" onClick={()=>go('ledger')}>View all</button>}>Recent transactions</CardTitle>    <MiniLedger items={seedTxns} limit={5}/><button className="link-button bottom-link" onClick={()=>go('ledger')}>View all transactions <ArrowRight size={15}/></button></article></div></div><aside className="ai-rail"><CardTitle><span className="spark-title"><Sparkles size={19}/> FinPulse AI Insights</span></CardTitle><article className="insight good"><TrendingUp size={21}/><h3>Great job staying on track!</h3><p>You’ve spent 8.7% less this month compared with August.</p><button onClick={()=>go('insights')}>View spending</button></article><article className="insight warn"><AlertTriangle size={21}/><h3>Dining is higher than usual</h3><p>You’ve spent ₹2,110 more on dining compared with your 3-month average.</p><button onClick={()=>go('insights')}>See dining trends</button></article><article className="insight tip"><Target size={21}/><h3>Boost your emergency fund</h3><p>Add ₹2,500 more this month to reach your runway goal faster.</p><button onClick={()=>go('goals')}>Adjust plan</button></article><div className="financial-tip"><Lightbulb size={20}/><div><h3>Financial tip</h3><p>Automate savings right after payday to make it effortless and consistent.</p></div></div></aside></section></>;
}

function LedgerPage({ txns, externalQuery, onAdd, onEdit, onDelete }: { txns: TransactionItem[]; externalQuery?: string; onAdd: () => void; onEdit: (tx: TransactionItem) => void; onDelete: (id: number) => void }) {
  const [query, setQuery] = useState('');
  // Merge external (topbar) search with local search, prioritize external
  const combinedQuery = externalQuery && externalQuery.trim() ? externalQuery : query;
  const filtered = useMemo(() => txns.filter(item => `${item.merchant} ${item.category}`.toLowerCase().includes(combinedQuery.toLowerCase())), [combinedQuery, txns]);
  return <section className="card page-card"><div className="page-toolbar"><div className="search-field"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search merchant or category"/></div><button className="primary" onClick={onAdd}><Plus size={16}/> Add transaction</button></div><div className="table-head"><span>Merchant</span><span>Date</span><span>Status</span><span>Amount</span><span>Actions</span></div><div className="ledger-list">{filtered.map(item => <div className="ledger-row" key={item.id}><span className={`merchant ${item.color}`}>{item.icon}</span><div><strong>{item.merchant}</strong><small>{item.category}</small></div><span className="date">{item.date}</span><span className="posted"><i/> {item.status}</span><b className={item.amount > 0 ? 'gain' : ''}>{inr(item.amount)}</b><div style={{ display: 'flex', gap: 2 }}><button className="bare" onClick={() => onEdit(item)} aria-label={`Edit ${item.merchant}`}><Edit3 size={14}/></button><button className="bare" onClick={() => { if (window.confirm(`Delete ${item.merchant}?`)) onDelete(item.id); }} aria-label={`Delete ${item.merchant}`}><Trash2 size={14} color="var(--red)"/></button></div></div>)}</div></section>;
}

function AccountsPage({ onConnect }: { onConnect: () => void }) {
  return <><section className="account-total"><div><span>Total across all accounts</span><strong>₹12,71,940</strong><small>Last synced just now</small></div><button className="primary" onClick={onConnect}><Plus size={16}/> Connect account</button></section><section className="accounts-grid">{accounts.map(({name,type,digits,balance,icon:Icon,color})=><article className="card account-card" key={name}><div className="account-card-top"><i className={color}><Icon size={21}/></i><button className="bare"><MoreHorizontal/></button></div><span>{type}</span><h3>{name}</h3><small>•••• {digits}</small><strong>{inr(balance)}</strong><p><i/> Connected and synced</p></article>)}</section></>;
}

function InsightsPage({ go }: { go:(page:PageId)=>void }) {
  return <><section className="insight-hero"><span><Bot size={20}/> Personalized this morning</span><h2>Your money is moving in the right direction.</h2><p>Your savings rate improved to 36.5%, but dining and overlapping subscriptions are costing you an avoidable ₹3,457 each month.</p></section><section className="insight-grid"><article className="card large-insight"><div className="insight-icon good"><ArrowDown/></div><span>SPENDING PATTERN</span><h3>Food delivery spend dropped 18%</h3><p>That saves roughly ₹1,480 per month if the pattern continues.</p><button className="link-button" onClick={()=>go('ledger')}>See transactions <ArrowRight size={15}/></button></article><article className="card large-insight"><div className="insight-icon warn"><AlertTriangle/></div><span>SUBSCRIPTIONS</span><h3>Three plans overlap</h3><p>Review Netflix, Prime and Hotstar before their next renewals.</p><button className="link-button">Review subscriptions <ArrowRight size={15}/></button></article><article className="card large-insight"><div className="insight-icon blue"><Target/></div><span>GOAL OPPORTUNITY</span><h3>Your Japan goal can arrive early</h3><p>Move the ₹1,480 monthly saving into that goal to finish 3 months sooner.</p><button className="link-button" onClick={()=>go('goals')}>Update goal <ArrowRight size={15}/></button></article></section></>;
}

function HealthPage() {
  return <section className="health-grid"><article className="card score"><span>FINANCIAL HEALTH SCORE</span><div className="score-ring"><strong>78</strong><small>/ 100</small></div><h3>Strong</h3><p>Your cash reserve is healthy. High-interest credit is the largest drag on your score.</p></article><article className="card health-factors"><CardTitle>Score factors</CardTitle>{[['Cash flow','Excellent',92],['Savings rate','Strong',81],['Debt load','Needs work',58],['Emergency fund','Good',74]].map(([name,label,width])=><div className="factor" key={String(name)}><div><span>{name}</span><b>{label}</b></div><i><em style={{width:`${width}%`}}/></i></div>)}</article></section>;
}

function GoalsPage({ items, onAddGoal, onContribute, onDeleteGoal }: { items: GoalItem[]; onAddGoal: () => void; onContribute: (index: number) => void; onDeleteGoal: (index: number) => void }) {
  const saved = items.reduce((sum, item) => sum + item.saved, 0);
  const targets = items.reduce((sum, item) => sum + item.target, 0);
  return <><section className="goal-summary"><div><span>Total saved toward goals</span><strong>{inr(saved)}</strong><p>{inr(targets - saved)} remaining across {items.length} goals</p></div><button className="primary light" onClick={onAddGoal}><Plus size={17}/> Add goal</button></section><section className="goals-grid">{items.map((goal, index) => { const percent = Math.min(100, Math.round(goal.saved / goal.target * 100)); return <article className="card goal-card" key={`${goal.title}-${index}`}><div className={`goal-symbol ${goal.color}`}><Target size={21}/></div><button className="bare" onClick={() => { if (window.confirm(`Delete the ${goal.title} goal?`)) onDeleteGoal(index); }}><Trash2 size={15} color="var(--red)"/></button><h3>{goal.title}</h3><p>Target: {goal.date}</p><div className="goal-money"><strong>{inr(goal.saved)}</strong><span>of {inr(goal.target)}</span></div><div className="progress"><i style={{width: `${percent}%`}}/></div><div className="goal-foot"><b>{percent}% complete</b><span>{inr(goal.target - goal.saved)} to go</span></div><button className="contribute" onClick={() => onContribute(index)}><Plus size={15}/> Add contribution</button></article>})}<button className="new-goal" onClick={onAddGoal}><span><Plus size={24}/></span><strong>Create a new goal</strong><small>Turn your next plan into a target</small></button></section></>;
}

function FraudPage({ notify }: { notify:(message:string)=>void }) {
  return <><section className="fraud-banner"><div className="safe-shield"><ShieldCheck/></div><div><span>PROTECTION STATUS</span><h2>Your accounts are actively monitored</h2><p>We checked 43 transactions across 4 accounts today.</p></div><b>All systems active</b></section><section className="card alert-card"><div className="alert-head"><span className="danger-icon"><AlertTriangle/></span><div><span>REQUIRES REVIEW</span><h3>Unusual payment at DIGITAL HUB</h3><p>₹7,990 · Today, 3:42 AM · ICICI Coral ••1904 · Bengaluru</p></div></div><div className="fraud-buttons"><button onClick={()=>notify('Card locked. Our fraud team has been notified.')}>This wasn’t me</button><button onClick={()=>notify('Transaction marked as recognized')}><Check size={15}/> It was me</button></div></section></>;
}

function TaxPage() {
  return <><section className="tax-metrics"><Metric label="Estimated annual tax" value="₹1,18,400" note="Based on current income" icon={CircleDollarSign} tone="blue"/><Metric label="Deductions tracked" value="₹1,42,000" note="80C limit: ₹1,50,000" icon={FileChartColumn} tone="green"/><Metric label="Potential savings" value="₹2,496" note="₹8,000 deduction gap" icon={Banknote} tone="amber"/></section><section className="card tax-card"><CardTitle>Tax opportunities</CardTitle><div className="tax-row"><i><BriefcaseBusiness/></i><div><h3>Complete your 80C allocation</h3><p>Investing the remaining ₹8,000 before March could reduce estimated tax.</p></div><b>High impact</b></div><div className="tax-row"><i><Landmark/></i><div><h3>Home-loan interest</h3><p>₹1,64,200 in eligible interest has been identified for review.</p></div><b>Tracked</b></div><small className="disclaimer">Estimates only. Verify eligibility with a qualified tax professional before filing.</small></section></>;
}

function SettingsPage({ theme, chooseTheme, notify }: { theme: Theme; chooseTheme: (theme: Theme) => void; notify: (msg: string) => void }) {
  return <section className="card settings-card"><CardTitle>Appearance</CardTitle><p>Choose how FinPulse looks on this device.</p><div className="appearance-options"><button className={theme === 'light' ? 'active' : ''} onClick={() => chooseTheme('light')}><span className="theme-preview light-preview"><i/><i/><i/></span><b><Sun size={17}/> Light theme</b><small>Bright and clean</small>{theme === 'light' && <Check />}</button><button className={theme === 'dark' ? 'active' : ''} onClick={() => chooseTheme('dark')}><span className="theme-preview dark-preview"><i/><i/><i/></span><b><Moon size={17}/> Dark theme</b><small>Easy on the eyes</small>{theme === 'dark' && <Check />}</button></div><div className="settings-divider"/><CardTitle>Notifications</CardTitle>{['Unusual transaction alerts', 'Weekly financial summary', 'Goal progress reminders'].map((item, index) => <label className="toggle-row" key={item}><span><b>{item}</b><small>{index === 0 ? 'Immediate fraud and anomaly notifications' : 'Helpful account updates from FinPulse'}</small></span><input type="checkbox" defaultChecked={index < 2} onChange={() => notify(`${item} preference updated`)} /><i/></label>)}<div className="settings-divider"/><CardTitle>Data management</CardTitle><div style={{ display: 'grid', gap: 10, marginTop: 16 }}><button className="primary" style={{ justifySelf: 'start' }} onClick={() => { localStorage.clear(); notify('All local data cleared. Refresh to see defaults.'); }}>Reset demo data</button></div></section>;
}

function ManagePage({ profile, saveProfile, notify }: { profile: ProfileData; saveProfile: (p: ProfileData) => void; notify: (msg: string) => void }) {
  const [form, setForm] = useState({ ...profile });
  const initials = form.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return <section className="card profile-settings"><div className="profile-hero"><span className="big-avatar" style={{ fontSize: 20 }}>{initials}</span><div><h2>{form.fullName}</h2><p>{form.email}</p></div><button onClick={() => notify('Profile photo picker is not available in this demo')}>Change photo</button></div><form onSubmit={(e) => { e.preventDefault(); saveProfile({ ...form, avatar: initials }); notify('Profile saved'); }}><label>Full name<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label><label>Email address<input value={form.email} type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label><label>Primary currency<select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="INR">Indian Rupee (INR)</option><option value="USD">US Dollar (USD)</option></select></label><button className="primary" type="submit">Save changes</button></form></section>;
}

function GoalModal({ close, save }: { close:()=>void; save:(goal:GoalItem)=>void }) {
  const [title,setTitle]=useState(''); const [target,setTarget]=useState(''); const [saved,setSaved]=useState('0'); const [date,setDate]=useState('December 2027'); const [error,setError]=useState('');
  const submit=(event:FormEvent)=>{event.preventDefault();const targetValue=Number(target),savedValue=Number(saved);if(!title.trim()||!Number.isFinite(targetValue)||targetValue<=0||savedValue<0){setError('Enter a goal name and valid amounts.');return;}if(savedValue>targetValue){setError('Starting amount cannot exceed the target.');return;}save({title:title.trim(),target:targetValue,saved:savedValue,date:date.trim()||'No deadline',color:'blue'});};
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal goal-creation-modal" onSubmit={submit} onMouseDown={e=>e.stopPropagation()}><button type="button" className="close-modal" onClick={close}><X/></button><div className="modal-symbol"><Target/></div><span>NEW SAVINGS GOAL</span><h2>What are you saving for?</h2><p>Give the goal a clear target and deadline.</p><label>Goal name<input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Home deposit"/></label><div className="form-pair"><label>Target amount<input inputMode="numeric" value={target} onChange={e=>setTarget(e.target.value.replace(/\D/g,''))} placeholder="500000"/></label><label>Already saved<input inputMode="numeric" value={saved} onChange={e=>setSaved(e.target.value.replace(/\D/g,''))}/></label></div><label>Target date<input value={date} onChange={e=>setDate(e.target.value)} placeholder="December 2027"/></label>{error&&<div className="form-error">{error}</div>}<button className="primary modal-submit" type="submit">Create goal</button></form></div>;
}

export default function FinPulseApp() {
  // Core state
  const [page, setPage] = useState<PageId>('overview');
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem('finpulse-theme') === 'light' ? 'light' : 'dark';
    }
    return 'dark';
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [globalQuery, setGlobalQuery] = useState('');

  // Data state
  const [txns, setTxns] = useState<TransactionItem[]>(() => getTransactions());
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(() => getBudgets());
  const [goalItems, setGoalItems] = useState<GoalItem[]>(() => getGoals());
  const [profile, setProfile] = useState<ProfileData>(() => getProfile());

  // Modal state
  const [modal, setModal] = useState<ModalType>(null);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);
  const [editingBudget, setEditingBudget] = useState<BudgetItem | null>(null);
  const [contributeIndex, setContributeIndex] = useState<number | null>(null);

  // Sync theme to DOM
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  // Hydrate the visible dashboard identity from the authenticated Supabase profile.
  // Local storage remains a fast UI cache, but Supabase is the source of truth.
  useEffect(() => {
    if (!supabaseConfigured) return;
    let active = true;
    const supabase = getSupabaseBrowserClient();

    void (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !active) return;
      const { data: remoteProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (!active) return;

      setProfile((current) => {
        const fullName = remoteProfile?.full_name
          || (typeof userData.user.user_metadata?.full_name === 'string' ? userData.user.user_metadata.full_name : '')
          || current.fullName;
        const next = { ...current, fullName, email: userData.user.email || current.email };
        saveProfile(next);
        return next;
      });
    })();

    return () => { active = false; };
  }, []);

  // Cmd/Ctrl+K keyboard shortcut to focus global search
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const input = document.querySelector<HTMLInputElement>('.global-search input');
        input?.focus();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Update notification count from actual data: budget overruns + new transactions
  const notificationCount = useMemo(() => {
    const overBudgetCount = budgetItems.filter((b) => b.spent > b.limit).length;
    const recentCount = txns.slice(0, 3).length;
    return Math.min(9, overBudgetCount + (recentCount > 0 ? 1 : 0));
  }, [budgetItems, txns]);

  const chooseTheme = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    window.localStorage.setItem('finpulse-theme', next);
  };

  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2600);
  };

  const go = (next: PageId) => {
    setPage(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Transaction handlers ---
  const handleAddTransaction = () => { setEditingTx(null); setModal('transaction'); };
  const handleEditTransaction = (tx: TransactionItem) => { setEditingTx(tx); setModal('transaction'); };
  const handleSaveTransaction = (data: Omit<TransactionItem, 'id'>) => {
    if (editingTx) {
      updateTransaction(editingTx.id, data);
      setTxns(getTransactions());
      notify('Transaction updated');
    } else {
      addTransaction(data);
      setTxns(getTransactions());
      notify('Transaction added');
    }
    setModal(null);
    setEditingTx(null);
  };
  const handleDeleteTransaction = (id: number) => {
    deleteTransaction(id);
    setTxns(getTransactions());
    notify('Transaction deleted');
  };
  const handleAssistantEntrySaved = (entry: LedgerDraft) => {
    addTransaction({
      merchant: entry.merchant,
      category: entry.category,
      date: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(entry.occurredAt)),
      amount: entry.kind === 'income' ? entry.amount : -entry.amount,
      icon: entry.kind === 'income' ? '₹' : entry.merchant.slice(0, 1).toUpperCase(),
      color: entry.kind === 'income' ? 'blue' : 'orange',
      status: 'Posted',
    });
    setTxns(getTransactions());
  };

  // --- Budget handlers ---
  const handleAddBudget = () => { setEditingBudget(null); setModal('budget'); };
  const handleEditBudget = (item: BudgetItem) => { setEditingBudget(item); setModal('budget'); };
  const handleSaveBudget = (data: Omit<BudgetItem, 'id' | 'spent'>) => {
    if (editingBudget) {
      updateBudget(editingBudget.id, data);
    } else {
      addBudget(data);
    }
    setBudgetItems(getBudgets());
    setModal(null);
    setEditingBudget(null);
    notify(editingBudget ? 'Budget updated' : 'Budget created');
  };
  const handleDeleteBudget = (id: number) => {
    deleteBudget(id);
    setBudgetItems(getBudgets());
    notify('Budget deleted');
  };

  // --- Goal handlers ---
  const handleSaveGoal = (goal: GoalItem) => {
    const updated = addGoal(goal);
    setGoalItems(updated);
    setModal(null);
    go('goals');
    notify(`${goal.title} goal created`);
  };
  const handleContributeGoal = (index: number) => { setContributeIndex(index); setModal('contribute'); };
  const handleSaveContribution = (amount: number) => {
    if (contributeIndex === null) return;
    const updated = contributeToGoal(contributeIndex, amount);
    setGoalItems(updated);
    setModal(null);
    setContributeIndex(null);
    notify(`₹${amount.toLocaleString('en-IN')} contribution added`);
  };
  const handleDeleteGoal = (index: number) => {
    const updated = deleteGoal(index);
    setGoalItems(updated);
    notify('Goal deleted');
  };

  // --- Profile handlers ---
  const handleSaveProfile = (p: ProfileData) => {
    saveProfile(p);
    setProfile(p);
    if (!supabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    void (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        notify('Profile saved locally, but the secure account session is unavailable');
        return;
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: p.fullName.trim() })
        .eq('id', userData.user.id);
      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: p.fullName.trim() } });
      if (profileError || metadataError) {
        notify(`Profile saved locally, but Supabase sync failed: ${(profileError || metadataError)?.message}`);
      }
    })();
  };

  // --- Content routing ---
  const content = page === 'overview' ? <Overview go={go} /> :
    page === 'ledger' ? <LedgerPage txns={txns} externalQuery={globalQuery} onAdd={handleAddTransaction} onEdit={handleEditTransaction} onDelete={handleDeleteTransaction} /> :
    page === 'accounts' ? <AccountsPage onConnect={() => setModal('connect')} /> :
    page === 'budgets' ? <BudgetsPage budgets={budgetItems} add={handleAddBudget} edit={handleEditBudget} remove={handleDeleteBudget} /> :
    page === 'insights' ? <InsightsPage go={go} /> :
    page === 'health' ? <HealthPage /> :
    page === 'goals' ? <GoalsPage items={goalItems} onAddGoal={() => setModal('goal')} onContribute={handleContributeGoal} onDeleteGoal={handleDeleteGoal} /> :
    page === 'fraud' ? <FraudPage notify={notify} /> :
    page === 'tax' ? <TaxPage /> :
    page === 'settings' ? <SettingsPage theme={theme} chooseTheme={chooseTheme} notify={notify} /> :
    <ManagePage profile={profile} saveProfile={handleSaveProfile} notify={notify} />;

  const profileInitials = profile.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'AS';

  return (
    <main className="app-shell">
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="brand"><span className="pulse-logo"><i/><b/></span><strong>FinPulse</strong><button className="sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X/></button></div>
        <nav className="main-nav">{mainNav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => go(id)} className={page === id ? 'active' : ''}><Icon/><span>{label}</span></button>)}</nav>
        <div className="side-bottom">
          <button className={page === 'settings' ? 'active' : ''} onClick={() => go('settings')}><Settings/><span>Settings</span></button>
          <button className={page === 'manage' ? 'active' : ''} onClick={() => go('manage')}><UserRound/><span>Manage account</span></button>
          <button className="mini-theme" onClick={() => chooseTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon/> : <Sun/>}<span>{theme === 'light' ? 'Dark theme' : 'Light theme'}</span></button>
        </div>
      </aside>
      {menuOpen && <button className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}
      <section className="workspace">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu/></button>
          <div className="global-search"><Search/><input value={globalQuery} onChange={(e) => setGlobalQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && globalQuery.trim()) { go('ledger'); } }} placeholder="Search transactions, merchants, accounts..."/><kbd>⌘ K</kbd></div>
          <div className="top-actions">
            <PwaInstallButton notify={notify} />
            <button className="theme-icon" onClick={() => chooseTheme(theme === 'light' ? 'dark' : 'light')} aria-label={`Use ${theme === 'light' ? 'dark' : 'light'} theme`}>{theme === 'light' ? <Moon/> : <Sun/>}</button>
            <button className="notification" onClick={() => window.dispatchEvent(new Event('finpulse:open-copilot'))} aria-label="Open financial notifications"><Bell/>{notificationCount > 0 && <i>{notificationCount}</i>}</button>
            <span className="top-avatar" style={{ fontSize: 12 }}>{profileInitials}</span>
            <button className="profile-button" onClick={() => go('manage')}>{profile.fullName || 'Alex Sharma'} <ChevronDown/></button>
          </div>
        </header>
        <div className="content">
          <div className="mobile-title"><h1>{pageCopy[page][0]}</h1><p>{pageCopy[page][1]}</p></div>
          {content}
        </div>
      </section>

      {/* Modals */}
      {modal === 'transaction' && <TransactionModal close={() => { setModal(null); setEditingTx(null); }} save={handleSaveTransaction} editItem={editingTx} />}
      {modal === 'budget' && <BudgetModal close={() => { setModal(null); setEditingBudget(null); }} save={handleSaveBudget} editItem={editingBudget} />}
      {modal === 'contribute' && contributeIndex !== null && goalItems[contributeIndex] && (
        <ContributeModal close={() => { setModal(null); setContributeIndex(null); }} save={handleSaveContribution} goal={goalItems[contributeIndex]} />
      )}
      {modal === 'connect' && <ConnectAccountModal close={() => setModal(null)} notify={notify} />}
      {modal === 'goal' && <GoalModal close={() => setModal(null)} save={handleSaveGoal} />}

      {toast && <div className="toast"><Check/>{toast}</div>}
      <FinancialCopilot notify={notify} onEntrySaved={handleAssistantEntrySaved} />
    </main>
  );
}
