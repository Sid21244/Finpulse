'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  Activity, BrainCircuit, Eye, EyeOff, LockKeyhole, Mail,
  Moon, ShieldCheck, Sun, TrendingUp, WalletCards,
} from 'lucide-react';
import { getSupabaseBrowserClient, supabaseConfigured } from '@/app/lib/supabase/client';
import { authCallbackUrl } from '@/app/lib/supabase/redirect';
import styles from './Auth.module.css';

type Theme = 'dark' | 'light';

export default function LoginScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [theme, setTheme] = useState<Theme>(() => typeof window !== 'undefined' && window.localStorage.getItem('finpulse-theme') === 'light' ? 'light' : 'dark');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) return;
    void getSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard');
    });
  }, [router]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  function chooseTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem('finpulse-theme', nextTheme);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabaseConfigured) return;
    setBusy(true); setError(''); setMessage('');
    const supabase = getSupabaseBrowserClient();
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
        router.replace('/dashboard');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: authCallbackUrl('/onboarding') },
        });
        if (signUpError) throw signUpError;
        if (data.session) router.replace('/onboarding');
        else setMessage('Check your email and confirm your FinPulse account.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed.');
    } finally { setBusy(false); }
  }

  return (
    <main className={styles.loginScreen}>
      <button className={styles.themeToggle} type="button" onClick={() => chooseTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} theme`}>
        {theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}<span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      <div className={styles.authGlow}/><div className={styles.authGrid}/>
      <aside className={`${styles.floatCard} ${styles.spendCard}`} aria-hidden="true">
        <span>Spending overview</span><div className={styles.miniDonut}/><strong>₹41,250</strong><small>↓ 8.7% this month</small>
      </aside>
      <aside className={`${styles.floatCard} ${styles.flowCard}`} aria-hidden="true">
        <span>Cash flow</span><strong>₹23,750</strong><small>Net this month</small><div className={styles.miniLine}/>
      </aside>
      <aside className={`${styles.floatCard} ${styles.insightCard}`} aria-hidden="true">
        <TrendingUp size={20}/><div><strong>Smart insight</strong><p>You spent 18% less on dining this month.</p></div>
      </aside>
      <aside className={`${styles.floatCard} ${styles.worthCard}`} aria-hidden="true">
        <span>Liquid savings</span><strong>₹1,68,000</strong><small>Protected by your account</small><div className={styles.miniLine}/>
      </aside>

      <section className={styles.authStage}>
        <div className={styles.heroBrand}><Activity size={32}/><strong>Fin<span>Pulse</span></strong></div>
        <h1>Take Control of Your Money</h1>
        <p>Track spending, uncover insights, and make smarter financial decisions with private analytics.</p>

        <section className={styles.loginPanel}>
          <div className={styles.loginHeading}>
            <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
            <p>{mode === 'signin' ? 'Sign in to continue to your FinPulse dashboard.' : 'Start building a clearer financial picture.'}</p>
          </div>
          {!supabaseConfigured ? <p className={styles.error}>Supabase setup is required before authentication can work.</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {message ? <p className={styles.success}>{message}</p> : null}

          <form className={styles.form} onSubmit={submit}>
            {mode === 'signup' ? <label className={styles.label}>Full name<div className={styles.inputWrap}><Activity size={16}/><input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} required autoComplete="name" placeholder="Your full name"/></div></label> : null}
            <label className={styles.label}>Email<div className={styles.inputWrap}><Mail size={16}/><input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com"/></div></label>
            <label className={styles.label}>Password<div className={styles.inputWrap}><LockKeyhole size={16}/><input className={styles.input} type={showPassword ? 'text' : 'password'} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="Enter your password"/><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div></label>
            {mode === 'signin' ? <button className={styles.forgot} type="button" onClick={() => router.push('/reset-password')}>Forgot password?</button> : null}
            <button className={styles.primary} disabled={!supabaseConfigured || busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}</button>
          </form>
          <button className={styles.accountSwitch} type="button" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage(''); }}>
            {mode === 'signin' ? 'Create Account' : 'Already have an account? Sign in'}
          </button>
        </section>

        <footer className={styles.trustRow}>
          <div><ShieldCheck/><span><strong>Bank-level security</strong><small>Encrypted and protected</small></span></div>
          <div><BrainCircuit/><span><strong>Private insights</strong><small>Your numbers stay controlled</small></span></div>
          <div><WalletCards/><span><strong>Your data, your control</strong><small>No silent transactions</small></span></div>
        </footer>
      </section>
    </main>
  );
}
