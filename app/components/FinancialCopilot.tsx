'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Check, Mic, MicOff, Send, Sparkles, X } from 'lucide-react';
import { getSupabaseBrowserClient } from '../lib/supabase/client';
import styles from './FinancialCopilot.module.css';

export type LedgerDraft = { kind: 'expense' | 'income'; amount: number; merchant: string; category: string; occurredAt: string; transcript: string };
type Summary = { income: number; spent: number; saved: number; savingsRate: number; liquidSavings: number };
type Notice = { id: string; level: 'warning' | 'critical' | 'success'; title: string; message: string };
type ApiResult = { answer?: string; error?: string; summary?: Summary; notices?: Notice[]; expenseDraft?: LedgerDraft; entryDraft?: LedgerDraft; savedEntry?: LedgerDraft };
type Message = { role: 'assistant' | 'user'; text: string };

interface SpeechResultEvent {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function inr(value: number) {
  return `${value < 0 ? '−' : ''}₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function FinancialCopilot({ notify, onEntrySaved }: { notify: (message: string) => void; onEntrySaved?: (entry: LedgerDraft) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [question, setQuestion] = useState('');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [draft, setDraft] = useState<LedgerDraft | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: 'Ask what you spent or saved, or type “Spent 350 on lunch” to add an expense.' },
  ]);

  const callAssistant = useCallback(async (payload: object) => {
    const client = getSupabaseBrowserClient();
    const { data } = await client.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new Error('Your login session has expired. Sign in again.');
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as ApiResult;
    if (!response.ok) throw new Error(result.error || 'FinPulse AI is unavailable.');
    if (result.summary) setSummary(result.summary);
    if (result.notices) setNotices(result.notices);
    return result;
  }, []);

  useEffect(() => {
    const openAssistant = () => setOpen(true);
    window.addEventListener('finpulse:open-copilot', openAssistant);
    return () => window.removeEventListener('finpulse:open-copilot', openAssistant);
  }, []);

  useEffect(() => {
    if (!open || loaded || loading) return;
    setLoading(true);
    callAssistant({ action: 'summary' })
      .then((result) => {
        if (result.answer) setMessages([{ role: 'assistant', text: result.answer }]);
        setLoaded(true);
      })
      .catch((error: unknown) => setMessages([{ role: 'assistant', text: error instanceof Error ? error.message : 'Could not load your financial summary.' }]))
      .finally(() => setLoading(false));
  }, [callAssistant, loaded, loading, open]);

  const sendQuestion = useCallback(async (textValue: string) => {
    const text = textValue.trim();
    if (!text || loading) return;
    setQuestion(''); setDraft(null);
    setMessages((current) => [...current, { role: 'user', text }]);
    setLoading(true);
    try {
      const result = await callAssistant({ action: 'ask', question: text });
      setMessages((current) => [...current, { role: 'assistant', text: result.answer || 'I could not answer that.' }]);
      setDraft(result.entryDraft || result.expenseDraft || null);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: error instanceof Error ? error.message : 'Request failed.' }]);
    } finally { setLoading(false); }
  }, [callAssistant, loading]);

  const ask = (event: FormEvent) => {
    event.preventDefault();
    void sendQuestion(question);
  };

  const toggleVoice = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const speechWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      notify('Voice recognition is not supported in this browser. Use Chrome or Android.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ').trim();
      if (transcript) {
        setQuestion(transcript);
        void sendQuestion(transcript);
      }
    };
    recognition.onerror = (event) => {
      setListening(false);
      notify(event.error === 'not-allowed' ? 'Microphone permission was denied' : 'I could not understand the voice entry');
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const confirmExpense = async () => {
    if (!draft || loading) return;
    setLoading(true);
    try {
      const result = await callAssistant({ action: 'confirm_entry', entry: draft });
      setMessages((current) => [...current, { role: 'assistant', text: result.answer || 'Expense saved.' }]);
      if (result.savedEntry) onEntrySaved?.(result.savedEntry);
      setDraft(null); notify('Transaction saved securely to Supabase');
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', text: error instanceof Error ? error.message : 'Expense could not be saved.' }]);
    } finally { setLoading(false); }
  };

  return <>
    <button className={styles.launcher} onClick={() => setOpen(true)} aria-label="Open FinPulse AI">
      <Sparkles size={20}/><span>Ask Fin</span>{notices.length > 0 && <i>{notices.length}</i>}
    </button>
    {open && <div className={styles.backdrop} onMouseDown={() => setOpen(false)}>
      <aside className={styles.panel} onMouseDown={(event) => event.stopPropagation()} aria-label="FinPulse financial assistant">
        <header><div><span><Bot size={18}/> PRIVATE ASSISTANT</span><h2>FinPulse AI</h2></div><button onClick={() => setOpen(false)} aria-label="Close assistant"><X/></button></header>
        {summary && <section className={styles.metrics}>
          <div><span>Income</span><strong>{inr(summary.income)}</strong></div>
          <div><span>Spent</span><strong>{inr(summary.spent)}</strong></div>
          <div><span>Saved</span><strong className={summary.saved < 0 ? styles.negative : ''}>{inr(summary.saved)}</strong></div>
        </section>}
        {notices.length > 0 && <section className={styles.notices}>
          <h3>Notifications</h3>
          {notices.slice(0, 3).map((notice) => <article key={notice.id} className={styles[notice.level]}>
            {notice.level === 'success' ? <Check size={17}/> : <AlertTriangle size={17}/>}
            <div><strong>{notice.title}</strong><p>{notice.message}</p></div>
          </article>)}
        </section>}
        <section className={styles.chat}>
          {messages.map((message, index) => <p key={`${message.role}-${index}`} className={styles[message.role]}>{message.text}</p>)}
          {loading && <p className={styles.assistant}>Checking your private ledger…</p>}
          {draft && <div className={styles.draft}>
            <span>{draft.kind === 'income' ? 'INCOME READY' : 'EXPENSE READY'}</span><strong>{inr(draft.amount)} · {draft.merchant}</strong><small>{draft.category}</small>
            <div><button onClick={() => setDraft(null)}>Cancel</button><button onClick={confirmExpense}><Check size={15}/> Confirm and save</button></div>
          </div>}
        </section>
        <form className={styles.form} onSubmit={ask}>
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask, add expense, debit or credit…" maxLength={500}/>
          <button className={listening ? styles.listening : styles.mic} type="button" onClick={toggleVoice} aria-label={listening ? 'Stop listening' : 'Add transaction by voice'} title={listening ? 'Listening…' : 'Speak a transaction'}>{listening ? <MicOff size={18}/> : <Mic size={18}/>}</button>
          <button type="submit" disabled={loading || !question.trim()} aria-label="Send"><Send size={18}/></button>
        </form>
        <small className={styles.privacy}>Try “Debit 350 for lunch” or “Credit 65,000 salary.” Confirm before anything is saved.</small>
      </aside>
    </div>}
  </>;
}
