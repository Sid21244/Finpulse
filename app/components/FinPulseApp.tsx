'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDownLeft, ArrowRight, ArrowUpRight, BarChart3, Bell,
  Check, ChevronDown, Download, Flag, Gauge, Headphones, Landmark, LoaderCircle,
  LayoutDashboard, Menu, Mic, MoreHorizontal, Plus, ReceiptText, Search, Send,
  Moon, Settings, ShieldAlert, Sparkles, Sun, Target, TrendingUp, Upload, Volume2, WalletCards, X, Zap,
} from 'lucide-react';
import { cashFlow, debts, goals, spending, transactions } from '../data/mockData';

type PageId = 'dashboard' | 'transactions' | 'analytics' | 'assistant' | 'goals' | 'credit';
type Theme = 'light' | 'dark';
type LedgerTransaction = {
  id: number;
  merchant: string;
  category: string;
  date: string;
  amount: number;
  icon: string;
  color: string;
  status: string;
};
type ExpenseDraft = { merchant: string; category: string; amount: number; transcript: string };
type AssistantMessage = { from: 'ai' | 'user'; text: string; source?: 'openai' | 'demo' };

interface SpeechResultEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}

interface BrowserSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

const navItems = [
  { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions' as const, label: 'Transactions & alerts', icon: ReceiptText },
  { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  { id: 'assistant' as const, label: 'AI Assistant', icon: Sparkles },
  { id: 'goals' as const, label: 'Savings goals', icon: Target },
  { id: 'credit' as const, label: 'Debt & credit', icon: Gauge },
];

const pageMeta: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Good morning, Alex', subtitle: 'Here’s your complete financial overview.' },
  transactions: { title: 'Transactions & alerts', subtitle: 'Every movement, monitored in one place.' },
  analytics: { title: 'Analytics', subtitle: 'Understand where your money goes and why.' },
  assistant: { title: 'Fin — your AI copilot', subtitle: 'Ask anything about your financial life.' },
  goals: { title: 'Savings goals', subtitle: 'Small, consistent moves toward what matters.' },
  credit: { title: 'Debt & credit health', subtitle: 'A clear path to becoming debt-free.' },
};

function money(value: number) {
  return `${value < 0 ? '−' : '+'}₹${Math.abs(value).toLocaleString('en-IN')}`;
}

function speechRecognition() {
  const Constructor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Constructor) return null;
  const recognition = new Constructor();
  recognition.lang = 'en-IN';
  recognition.interimResults = false;
  recognition.continuous = false;
  return recognition;
}

function parseExpensePhrase(phrase: string): ExpenseDraft {
  const normalized = phrase.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const amountMatch = normalized.match(/(?:₹|rs\.?|rupees?)\s*([\d.]+)/i) || normalized.match(/([\d.]+)/);
  const merchantMatch = normalized.match(/\b(?:at|from|to)\s+([a-z][a-z\s&'-]*?)(?:\s+(?:today|yesterday|on|for)\b|$)/i);
  const amount = amountMatch ? Number(amountMatch[1]) : 0;
  const lower = normalized.toLowerCase();
  const category = /grocery|groceries|supermarket|blinkit/.test(lower) ? 'Groceries'
    : /uber|ola|cab|taxi|transport|fuel|petrol/.test(lower) ? 'Transport'
      : /food|dinner|lunch|breakfast|restaurant|swiggy|zomato|cafe/.test(lower) ? 'Food & dining'
        : /shop|amazon|clothes|shopping/.test(lower) ? 'Shopping'
          : /movie|netflix|music|entertainment/.test(lower) ? 'Entertainment'
            : 'Other';
  const merchant = merchantMatch?.[1]
    ? merchantMatch[1].trim().replace(/\b\w/g, (letter) => letter.toUpperCase())
    : category === 'Other' ? 'Voice expense' : category;

  return { merchant, category, amount, transcript: phrase };
}

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="section-header"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>;
}

function MetricCard({ icon: Icon, label, value, note, tone = 'blue' }: { icon: typeof WalletCards; label: string; value: string; note: string; tone?: string }) {
  return <article className="metric-card"><span className={`metric-icon ${tone}`}><Icon size={17} /></span><span className="metric-label">{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function CashFlowChart({ compact = false }: { compact?: boolean }) {
  return <div className={`cash-chart ${compact ? 'compact' : ''}`}>
    <div className="chart-grid"><span>₹70k</span><span>₹35k</span><span>₹0</span></div>
    <div className="bars-area">{cashFlow.map(item => <div className="month-bars" key={item.month}><div className="bar-pair"><i className="income-bar" style={{ height: `${item.income / .72}%` }} /><i className="expense-bar" style={{ height: `${item.expense / .72}%` }} /></div><span>{item.month}</span></div>)}</div>
  </div>;
}

function TransactionList({ ledger, limit }: { ledger: LedgerTransaction[]; limit?: number }) {
  const list = limit ? ledger.slice(0, limit) : ledger;
  return <div className="transaction-list">{list.map(transaction => <div className="transaction-row" key={transaction.id}>
    <span className={`merchant-icon ${transaction.color}`}>{transaction.icon}</span>
    <div className="transaction-name"><strong>{transaction.merchant}</strong><span>{transaction.category}</span></div>
    <span className="transaction-date">{transaction.date}</span>
    <span className={`status-pill ${transaction.status.toLowerCase().replace('-', '')}`}>{transaction.status}</span>
    <strong className={transaction.amount > 0 ? 'amount positive-text' : 'amount'}>{money(transaction.amount)}</strong>
    <button className="icon-button small" aria-label={`More options for ${transaction.merchant}`}><MoreHorizontal size={17}/></button>
  </div>)}</div>;
}

function Dashboard({ navigate, ledger }: { navigate: (page: PageId) => void; ledger: LedgerTransaction[] }) {
  const addedExpenses = ledger.filter((item) => item.id > transactions.length).reduce((sum, item) => sum + (item.amount < 0 ? Math.abs(item.amount) : 0), 0);
  const monthlyExpenses = 41_250 + addedExpenses;
  return <>
    <section className="hero-card">
      <div className="hero-copy"><span className="hero-label">Total net worth</span><strong>₹8,42,500</strong><span className="positive-badge"><ArrowUpRight size={14}/> 6.8% this month</span></div>
      <div className="wealth-chart" aria-label="Net worth has increased over six months"><div className="wealth-glow"/><div className="wealth-points"><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="wealth-labels"><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span><span>Sep</span></div></div>
      <div className="balance-row"><span>Assets <b>₹10,80,000</b></span><span>Liabilities <b>₹2,37,500</b></span><span>Investments <b>₹4,12,800</b></span></div>
    </section>
    <section className="metrics-grid">
      <MetricCard icon={ArrowDownLeft} label="Monthly income" value="₹65,000" note="↑ 4.2% vs last month" tone="mint" />
      <MetricCard icon={ArrowUpRight} label="Monthly expenses" value={`₹${monthlyExpenses.toLocaleString('en-IN')}`} note={`${Math.round(monthlyExpenses / 650)}% of monthly income`} tone="blue" />
      <MetricCard icon={Gauge} label="Debt-to-income" value="47.5%" note="High — reduce costly debt" tone="violet" />
      <MetricCard icon={ShieldAlert} label="Emergency runway" value="5.2 mo" note="Healthy buffer" tone="amber" />
    </section>
    <section className="dashboard-grid">
      <article className="panel cash-panel"><SectionHeader title="Cash flow" subtitle="Last 6 months" action={<button className="text-button" onClick={() => navigate('analytics')}>View analytics <ArrowRight size={14}/></button>} /><div className="chart-legend"><span><i className="legend-income"/> Income</span><span><i className="legend-expense"/> Expenses</span></div><CashFlowChart compact /></article>
      <article className="panel insight-panel"><div className="ai-chip"><Sparkles size={14}/> FINPULSE AI</div><h3>You can save ₹4,200 more this month.</h3><p>Your food delivery spend is 28% higher than your 3-month average. A weekly cap of ₹1,400 keeps your Japan goal on track.</p><button className="insight-button" onClick={() => navigate('assistant')}>See the plan <ArrowRight size={15}/></button></article>
      <article className="panel spending-panel"><SectionHeader title="Spending by category" subtitle="September 2026" /><div className="spending-wrap"><div className="donut"><div><strong>₹41.2k</strong><span>Total spent</span></div></div><div className="category-list">{spending.map(item => <div className="category-row" key={item.label}><i style={{background:item.color}}/><span>{item.label}</span><b>{item.percent}%</b></div>)}</div></div></article>
      <article className="panel activity-panel"><SectionHeader title="Recent activity" action={<button className="text-button" onClick={() => navigate('transactions')}>View all <ArrowRight size={14}/></button>} /><TransactionList ledger={ledger} limit={4}/></article>
    </section>
  </>;
}

function TransactionsPage({ ledger }: { ledger: LedgerTransaction[] }) {
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => ledger.filter(t => (filter === 'All' || (filter === 'Income' ? t.amount > 0 : t.amount < 0)) && t.merchant.toLowerCase().includes(query.toLowerCase())), [filter, query, ledger]);
  const moneyOut = 41_250 + ledger.filter((item) => item.id > transactions.length && item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0);
  return <>
    <section className="summary-strip"><MetricCard icon={WalletCards} label="Money in" value="₹65,000" note="1 credit this month" tone="mint" /><MetricCard icon={ReceiptText} label="Money out" value={`₹${moneyOut.toLocaleString('en-IN')}`} note={`${37 + Math.max(0, ledger.length - transactions.length)} debits this month`} tone="blue" /><MetricCard icon={Flag} label="Flagged" value="1" note="Needs your attention" tone="coral" /></section>
    <section className="fraud-alert"><span className="fraud-icon"><AlertTriangle size={21}/></span><div><div className="alert-kicker">POTENTIAL FRAUD DETECTED</div><h3>Unusual card payment of ₹7,990 at “DIGITAL HUB”</h3><p>Today, 3:42 AM · ICICI Credit Card ••4821 · Bengaluru</p></div><div className="fraud-actions"><button className="outline-danger">This wasn’t me</button><button className="safe-button"><Check size={15}/> It was me</button></div></section>
    <section className="panel transactions-panel"><div className="transaction-toolbar"><div className="search-box"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search transactions" aria-label="Search transactions"/></div><div className="filter-chips">{['All','Expenses','Income'].map(item => <button onClick={() => setFilter(item)} className={filter===item?'active':''} key={item}>{item}</button>)}</div><button className="outline-button"><Download size={16}/> Export</button></div><div className="table-labels"><span>Merchant</span><span>Date</span><span>Status</span><span>Amount</span></div><div className="transaction-list">{filtered.map(transaction => <div className="transaction-row" key={transaction.id}><span className={`merchant-icon ${transaction.color}`}>{transaction.icon}</span><div className="transaction-name"><strong>{transaction.merchant}</strong><span>{transaction.category}</span></div><span className="transaction-date">{transaction.date}</span><span className={`status-pill ${transaction.status.toLowerCase().replace('-','')}`}>{transaction.status}</span><strong className={transaction.amount > 0 ? 'amount positive-text' : 'amount'}>{money(transaction.amount)}</strong><button className="icon-button small"><MoreHorizontal size={17}/></button></div>)}</div></section>
  </>;
}

function AnalyticsPage() {
  return <>
    <section className="analytics-summary"><div><span>Net cash flow</span><strong>+₹23,750</strong><small><TrendingUp size={13}/> 12.4% better than August</small></div><div><span>Average daily spend</span><strong>₹1,375</strong><small>₹210 below your limit</small></div><div><span>Savings rate</span><strong>36.5%</strong><small>Top 20% for your income</small></div></section>
    <section className="analytics-grid">
      <article className="panel wide-chart"><SectionHeader title="Income vs expenses" subtitle="Monthly cash flow over the last 6 months" action={<button className="range-button">6 months <ChevronDown size={14}/></button>}/><div className="chart-legend"><span><i className="legend-income"/> Income</span><span><i className="legend-expense"/> Expenses</span></div><CashFlowChart/></article>
      <article className="panel category-panel"><SectionHeader title="Expense breakdown" subtitle="September 2026"/><div className="large-donut"><div><strong>₹41,250</strong><span>Across 37 payments</span></div></div><div className="category-list detailed">{spending.map(item => <div className="category-row" key={item.label}><i style={{background:item.color}}/><span>{item.label}<small>₹{item.value.toLocaleString('en-IN')}</small></span><b>{item.percent}%</b></div>)}</div></article>
      <article className="panel habits-panel"><SectionHeader title="Spending signals" subtitle="Patterns worth knowing"/><div className="signal-list"><div><span className="signal-icon up"><ArrowUpRight size={17}/></span><div><strong>Dining is trending up</strong><p>+28% over your 3-month average</p></div><b>₹2,110</b></div><div><span className="signal-icon down"><ArrowDownLeft size={17}/></span><div><strong>Transport improved</strong><p>12 fewer cab trips than August</p></div><b>−₹980</b></div><div><span className="signal-icon pulse"><Zap size={17}/></span><div><strong>Subscriptions overlap</strong><p>3 streaming plans renewed this week</p></div><b>₹1,347</b></div></div></article>
    </section>
  </>;
}

function AssistantPage({ ledger }: { ledger: LedgerTransaction[] }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([{ from: 'ai', text: 'Good morning, Alex. I can explain your spending, debt, emergency runway, and suspicious activity using the simulated ledger. What do you want to understand?', source: 'demo' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState<'openai' | 'demo'>('demo');
  const [voiceError, setVoiceError] = useState('');

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
  };

  const ask = async (text: string, speakReply = false) => {
    const question = text.trim();
    if (!question || loading) return;
    setMessages((current) => [...current, { from: 'user', text: question }]);
    setInput('');
    setVoiceError('');
    setLoading(true);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, ledger }),
      });
      const payload = await response.json() as { answer?: string; source?: 'openai' | 'demo'; error?: string };
      if (!response.ok || !payload.answer) throw new Error(payload.error || 'Fin could not answer that question.');
      const source = payload.source === 'openai' ? 'openai' : 'demo';
      setMode(source);
      setMessages((current) => [...current, { from: 'ai', text: payload.answer as string, source }]);
      if (speakReply) speak(payload.answer);
    } catch (error) {
      setMessages((current) => [...current, { from: 'ai', text: error instanceof Error ? error.message : 'Fin could not answer right now.', source: 'demo' }]);
    } finally {
      setLoading(false);
    }
  };

  const askByVoice = () => {
    const recognition = speechRecognition();
    if (!recognition) {
      setVoiceError('Voice recognition is not supported in this browser. Type your question instead.');
      return;
    }
    setVoiceError('');
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || '';
      setInput(transcript);
      void ask(transcript, true);
    };
    recognition.onerror = () => setVoiceError('I could not hear that clearly. Try again or type the question.');
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  return <section className="assistant-layout"><article className="assistant-chat panel"><div className="assistant-intro"><div className="ai-orb"><Sparkles size={25}/></div><div><span>FINPULSE AI</span><strong>Evidence-backed answers from your ledger</strong></div><span className={`online-dot ${mode}`}>● {mode === 'openai' ? 'OpenAI' : 'Demo fallback'}</span></div><div className="messages" aria-live="polite">{messages.map((message,index)=><div className={`message ${message.from}`} key={`${message.from}-${index}`}>{message.from==='ai'&&<span className="tiny-orb"><Sparkles size={14}/></span>}<div><p>{message.text}</p>{message.from==='ai'&&<button className="speak-answer" onClick={()=>speak(message.text)} aria-label="Read this answer aloud"><Volume2 size={13}/> Listen</button>}</div></div>)}{loading&&<div className="message ai loading-message"><span className="tiny-orb"><Sparkles size={14}/></span><p><LoaderCircle size={15}/> Analysing your ledger…</p></div>}</div><div className="quick-prompts">{['Where did most of my money go?','Can I afford a ₹50k trip?','How risky is my debt?','Show suspicious transactions'].map(question=><button onClick={()=>void ask(question)} disabled={loading} key={question}>{question}</button>)}</div><form className="chat-input" onSubmit={(event:FormEvent)=>{event.preventDefault();void ask(input)}}><input value={input} onChange={event=>setInput(event.target.value)} placeholder={listening?'Listening…':'Ask about spending, goals, debt, or fraud'} aria-label="Ask FinPulse AI"/><button type="button" className={`assistant-voice-button ${listening?'listening':''}`} onClick={askByVoice} aria-label="Ask with your voice"><Mic size={18}/></button><button type="submit" aria-label="Send message" disabled={loading||!input.trim()}><Send size={18}/></button></form>{voiceError&&<small className="voice-error">{voiceError}</small>}<small className="ai-disclaimer">Simulated financial data. Educational estimates only, not professional financial, credit, fraud, investment, or tax advice.</small></article><aside className="assistant-side"><article className="panel pulse-card"><div className="ai-chip"><Zap size={14}/> DAILY PULSE</div><h3>You’re ₹1,380 under budget this week.</h3><p>Dining is the only category above pace. Ask Fin to explain the transactions behind it.</p><div className="pulse-meter"><i/></div><div className="pulse-labels"><span>₹8,920 spent</span><span>₹10,300 limit</span></div></article><article className="panel context-card"><SectionHeader title="Evidence Fin can use"/><div><span><Landmark size={16}/> ₹65,000 monthly income</span><span><ReceiptText size={16}/> {ledger.length} recent ledger entries</span><span><Target size={16}/> 3 active savings goals</span><span><ShieldAlert size={16}/> 1 anomaly signal</span></div></article></aside></section>;
}

function GoalsPage() {
  return <><section className="goal-hero"><div><span className="hero-label">Total saved toward goals</span><strong>₹3,62,000</strong><p>₹3,45,000 remaining across 3 goals</p></div><div className="goal-hero-stat"><span>This month</span><strong>₹18,500</strong><small>₹2,500 ahead of plan</small></div></section><section className="goals-grid">{goals.map((goal,index)=>{const percent=Math.round(goal.saved/goal.target*100); return <article className="panel goal-card" key={goal.title}><div className={`goal-icon ${goal.color}`}>{index===0?<ShieldAlert size={20}/>:index===1?<Target size={20}/>:<WalletCards size={20}/>}</div><button className="icon-button"><MoreHorizontal size={18}/></button><h3>{goal.title}</h3><p>Target: {goal.date}</p><div className="goal-numbers"><strong>₹{goal.saved.toLocaleString('en-IN')}</strong><span>of ₹{goal.target.toLocaleString('en-IN')}</span></div><div className="progress-track"><i style={{width:`${percent}%`}}/></div><div className="goal-foot"><b>{percent}% complete</b><span>₹{(goal.target-goal.saved).toLocaleString('en-IN')} to go</span></div><button className="contribute-button"><Plus size={15}/> Add contribution</button></article>})}<button className="new-goal-card"><span><Plus size={24}/></span><strong>Create a new goal</strong><small>Turn your next plan into a target</small></button></section><section className="panel plan-panel"><div className="plan-icon"><Sparkles size={20}/></div><div><span className="alert-kicker">SMART SAVINGS PLAN</span><h3>Raise your monthly auto-save by ₹2,500</h3><p>You’ll reach your emergency fund 2 months early without affecting your regular bills.</p></div><button className="primary-button">Review plan</button></section></>;
}

function CreditPage() {
  const creditFactors = [
    ['Payment history', 'Excellent', '97%'],
    ['Credit utilisation', 'Good', '78%'],
    ['Credit age', 'Good', '69%'],
    ['Credit mix', 'Fair', '54%'],
  ];

  return <>
    <section className="credit-top">
      <article className="panel score-card">
        <div><span>Financial-health indicator</span><strong>78/100</strong><b>Strong</b><small>Internal estimate · simulated data</small></div>
        <div className="score-gauge"><i/><span>78</span></div>
      </article>
      <article className="panel debt-summary">
        <SectionHeader title="Debt snapshot"/>
        <div className="debt-big"><div><span>Total outstanding</span><strong>₹22,45,900</strong></div><span className="down-badge"><ArrowDownLeft size={14}/> ₹43,220 this month</span></div>
        <div className="debt-stats"><span>Monthly EMIs <b>₹30,850</b></span><span>Weighted rate <b>9.1%</b></span><span>Debt-to-income <b>47.5%</b></span></div>
      </article>
    </section>
    <section className="credit-grid">
      <article className="panel">
        <SectionHeader title="Credit score factors" subtitle="What’s moving your score"/>
        <div className="factor-list">{creditFactors.map(([label,status,width]) => <div className="factor" key={label}><div><span>{label}</span><b className={status.toLowerCase()}>{status}</b></div><div><i style={{width}}/></div></div>)}</div>
      </article>
      <article className="panel debts-list">
        <SectionHeader title="Your debts" subtitle="Ordered by recommended payoff priority" action={<button className="range-button">Avalanche <ChevronDown size={14}/></button>}/>
        {debts.map((debt,index) => {
          const paid = Math.round((1 - debt.balance / debt.original) * 100);
          return <div className="debt-row" key={debt.name}><span className="debt-rank">{index+1}</span><div className="debt-name"><strong>{debt.name}</strong><span>{debt.rate} interest · {debt.emi ? `₹${debt.emi.toLocaleString('en-IN')} EMI` : 'Revolving'}</span><div className="mini-progress"><i style={{width:`${paid}%`,background:debt.color}}/></div></div><div><strong>₹{debt.balance.toLocaleString('en-IN')}</strong><span>{paid}% repaid</span></div><button className="icon-button"><ArrowRight size={17}/></button></div>;
        })}
      </article>
    </section>
  </>;
}

function VoiceModal({ close, save }: { close:()=>void; save:(expense:ExpenseDraft)=>void }) {
  const [listening,setListening]=useState(false);
  const [transcript,setTranscript]=useState('');
  const [amount,setAmount]=useState('');
  const [merchant,setMerchant]=useState('');
  const [category,setCategory]=useState('Other');
  const [error,setError]=useState('');

  const applyPhrase=(phrase:string)=>{
    const parsed=parseExpensePhrase(phrase);
    setTranscript(parsed.transcript);
    if(parsed.amount>0)setAmount(String(parsed.amount));
    setMerchant(parsed.merchant);
    setCategory(parsed.category);
  };
  const listen=()=>{
    const recognition=speechRecognition();
    if(!recognition){setError('Voice recognition is unavailable here. Use the review fields below.');return;}
    setError('');
    setListening(true);
    recognition.onresult=(event)=>applyPhrase(event.results[0]?.[0]?.transcript||'');
    recognition.onerror=()=>setError('I could not understand that. Try once more or enter it manually.');
    recognition.onend=()=>setListening(false);
    recognition.start();
  };
  const submit=(event:FormEvent)=>{
    event.preventDefault();
    const numericAmount=Number(amount);
    if(!Number.isFinite(numericAmount)||numericAmount<=0){setError('Enter a valid expense amount.');return;}
    if(!merchant.trim()){setError('Add a merchant or description.');return;}
    save({merchant:merchant.trim(),category,amount:numericAmount,transcript});
  };

  return <div className="modal-backdrop" onMouseDown={close}><form className="voice-modal" onSubmit={submit} onMouseDown={event=>event.stopPropagation()}><button type="button" className="modal-close" onClick={close} aria-label="Close voice expense"><X size={20}/></button><div className={`voice-orb ${listening?'listening':''}`}><Mic size={28}/><i/><i/></div><span className="alert-kicker">VOICE EXPENSE</span><h2>{listening?'Listening…':transcript?'Review the parsed expense':'Add an expense by voice'}</h2><p>{listening?'Say “Add ₹850 spent on dinner at Social today”':transcript?`“${transcript}”`:'Speak naturally. FinPulse will extract the amount, merchant, and category for your review.'}</p><button type="button" className={`listen-button ${listening?'stop':''}`} onClick={listen} disabled={listening}>{listening?'Listening…':transcript?'Record again':'Start listening'}</button><div className="voice-divider"><span>review before saving</span></div><div className="manual-fields expense-review"><label>Amount<input inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value.replace(/[^\d.]/g,''))} placeholder="850"/></label><label>Merchant<input value={merchant} onChange={event=>setMerchant(event.target.value)} placeholder="Social"/></label><label>Category<select value={category} onChange={event=>setCategory(event.target.value)}><option>Food & dining</option><option>Groceries</option><option>Transport</option><option>Shopping</option><option>Entertainment</option><option>Other</option></select></label><label>Source<input value="Voice" readOnly/></label></div>{error&&<div className="voice-error modal-error">{error}</div>}<button className="save-expense" type="submit">Save to unified ledger</button><small className="voice-privacy">Your microphone is used only while listening. Always review the parsed amount before saving.</small></form></div>;
}

export default function FinPulseApp() {
  const [page,setPage]=useState<PageId>('dashboard');
  const [theme,setTheme]=useState<Theme>('light');
  const [ledger,setLedger]=useState<LedgerTransaction[]>(transactions);
  const [voiceOpen,setVoiceOpen]=useState(false);
  const [menuOpen,setMenuOpen]=useState(false);
  const [toast,setToast]=useState('');
  useEffect(()=>{
    const saved=window.localStorage.getItem('finpulse-theme');
    const preferred:Theme=saved==='light'||saved==='dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
    document.documentElement.dataset.theme=preferred;
    document.documentElement.style.colorScheme=preferred;
    setTheme(preferred);
  },[]);
  const chooseTheme=(next:Theme)=>{
    setTheme(next);
    document.documentElement.dataset.theme=next;
    document.documentElement.style.colorScheme=next;
    window.localStorage.setItem('finpulse-theme',next);
  };
  const notify=(text:string)=>{setToast(text);setTimeout(()=>setToast(''),2400)};
  const go=(id:PageId)=>{setPage(id);setMenuOpen(false);window.scrollTo({top:0,behavior:'smooth'})};
  const saveVoiceExpense=(expense:ExpenseDraft)=>{
    const transaction:LedgerTransaction={id:Date.now(),merchant:expense.merchant,category:expense.category,date:'Today, just now',amount:-Math.abs(expense.amount),icon:expense.merchant.charAt(0).toUpperCase()||'V',color:'blue',status:'Completed'};
    setLedger(current=>[transaction,...current]);
    setVoiceOpen(false);
    go('transactions');
    notify(`₹${expense.amount.toLocaleString('en-IN')} expense added to the ledger`);
  };
  return <main className="app-shell"><aside className={`sidebar ${menuOpen?'open':''}`}><div className="brand"><span className="brand-mark">F</span><span>FinPulse</span><button className="sidebar-close" onClick={()=>setMenuOpen(false)}><X size={20}/></button></div><nav className="main-nav">{navItems.map(({id,label,icon:Icon})=><button onClick={()=>go(id)} className={page===id?'nav-item active':'nav-item'} key={id}><Icon size={18}/><span>{label}</span>{page===id&&<i/>}</button>)}</nav><div className="nav-bottom"><button className="nav-item"><Settings size={18}/><span>Settings</span></button><button className="nav-item"><Headphones size={18}/><span>Help & support</span></button><div className="profile-card"><span className="avatar">AS</span><div><strong>Alex Sharma</strong><small>alex@example.com</small></div><MoreHorizontal size={16}/></div></div></aside>{menuOpen&&<button className="sidebar-scrim" aria-label="Close menu" onClick={()=>setMenuOpen(false)}/>}<section className="workspace"><header className="topbar"><button className="mobile-menu" onClick={()=>setMenuOpen(true)}><Menu size={21}/></button><div className="page-heading"><span className="eyebrow">Tuesday, September 2</span><h1>{pageMeta[page].title}</h1><p>{pageMeta[page].subtitle}</p></div><div className="header-actions"><div className="theme-switcher" role="group" aria-label="Choose appearance"><button className={theme==='light'?'active':''} onClick={()=>chooseTheme('light')} aria-pressed={theme==='light'} title="Use white theme"><Sun size={15}/><span>White</span></button><button className={theme==='dark'?'active':''} onClick={()=>chooseTheme('dark')} aria-pressed={theme==='dark'} title="Use dark theme"><Moon size={15}/><span>Dark</span></button></div><button className="voice-button" onClick={()=>setVoiceOpen(true)}><Mic size={16}/> <span>Voice expense</span></button><button className="ghost-button" onClick={()=>notify('Statement import is ready for your file')}><Upload size={16}/><span>Import</span></button><button className="primary-button" onClick={()=>notify('Account connection flow opened')}><Plus size={16}/><span>Add account</span></button><button className="icon-button notification" aria-label="Notifications" onClick={()=>go('transactions')}><Bell size={18}/><i/></button><span className="avatar top-avatar">AS</span></div></header><div className="content">{page==='dashboard'?<Dashboard navigate={go} ledger={ledger}/>:page==='transactions'?<TransactionsPage ledger={ledger}/>:page==='analytics'?<AnalyticsPage/>:page==='assistant'?<AssistantPage ledger={ledger}/>:page==='goals'?<GoalsPage/>:<CreditPage/>}</div><nav className="mobile-nav">{navItems.map(({id,label,icon:Icon})=><button onClick={()=>go(id)} className={page===id?'active':''} key={id}><Icon size={19}/><span>{label.replace(' & alerts','').replace('Savings ','')}</span></button>)}</nav><button className="floating-mic" onClick={()=>setVoiceOpen(true)} aria-label="Add voice expense"><Mic size={20}/></button></section>{voiceOpen&&<VoiceModal close={()=>setVoiceOpen(false)} save={saveVoiceExpense}/>} {toast&&<div className="toast"><Check size={17}/>{toast}</div>}</main>;
}
