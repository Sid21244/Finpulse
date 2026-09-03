'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Target } from 'lucide-react';
import { getSupabaseBrowserClient, supabaseConfigured } from '@/app/lib/supabase/client';
import styles from './Auth.module.css';

const goals = ['Save more money', 'Reduce debt', 'Build emergency fund', 'Track spending', 'Improve financial health'];

export default function OnboardingScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [income, setIncome] = useState('');
  const [savings, setSavings] = useState('');
  const [rent, setRent] = useState('');
  const [emi, setEmi] = useState('0');
  const [goal, setGoal] = useState(goals[0]);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(supabaseConfigured);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.replace('/login'); return; }
      setName(typeof data.user.user_metadata?.full_name === 'string' ? data.user.user_metadata.full_name : '');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) {
        setError(profileError.code === 'PGRST205'
          ? 'Supabase setup is incomplete. Apply the FinPulse migrations, then reload this page.'
          : `Unable to load your profile: ${profileError.message}`);
        setChecking(false);
        return;
      }
      if (profile?.onboarding_completed) router.replace('/dashboard');
      else setChecking(false);
    });
  }, [router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const supabase = getSupabaseBrowserClient();
      const values = [income, savings, rent, emi].map(Number);
      if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Enter valid non-negative financial amounts.');
      const { error: rpcError } = await supabase.rpc('complete_onboarding', {
        p_full_name: name.trim(), p_monthly_income: values[0], p_current_savings: values[1],
        p_monthly_rent: values[2], p_existing_loans_emi: values[3], p_financial_goal: goal,
      });
      if (rpcError) {
        if (rpcError.code === 'PGRST202' || rpcError.code === 'PGRST205') {
          throw new Error('Supabase setup is incomplete. Apply all FinPulse migrations before saving your profile.');
        }
        throw rpcError;
      }
      const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
      if (metadataError) throw metadataError;

      // Demo data is optional. A seed failure must not undo a saved profile.
      await supabase.rpc('seed_demo_data');

      router.replace('/dashboard');
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save your profile.'); }
    finally { setBusy(false); }
  }

  if (checking) return <main className={styles.screen}><div className={styles.loading}><span className={styles.spinner} />Loading your profile…</div></main>;

  return (
    <main className={styles.screen}><section className={styles.panel}>
      <div className={styles.brand}><span className={styles.mark}><Target size={18} /></span>FinPulse</div>
      <p className={styles.eyebrow}>One-minute setup</p><h1>Build your financial baseline</h1>
      <p className={styles.sub}>These values power your savings, debt, and emergency-fund calculations.</p>
      {error ? <p className={styles.error}>{error}</p> : null}
      <form className={styles.form} onSubmit={submit}>
        <label className={styles.label}>Full name<input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} required /></label>
        <div className={styles.row}>
          <label className={styles.label}>Monthly income (₹)<input className={styles.input} type="number" min="0" value={income} onChange={(event) => setIncome(event.target.value)} required /></label>
          <label className={styles.label}>Current savings (₹)<input className={styles.input} type="number" min="0" value={savings} onChange={(event) => setSavings(event.target.value)} required /></label>
        </div>
        <div className={styles.row}>
          <label className={styles.label}>Monthly rent (₹)<input className={styles.input} type="number" min="0" value={rent} onChange={(event) => setRent(event.target.value)} required /></label>
          <label className={styles.label}>Monthly loan/EMI (₹)<input className={styles.input} type="number" min="0" value={emi} onChange={(event) => setEmi(event.target.value)} required /></label>
        </div>
        <label className={styles.label}>Primary financial goal</label>
        <div className={styles.goalGrid}>{goals.map((item) => <button key={item} className={`${styles.goal} ${goal === item ? styles.goalActive : ''}`} type="button" onClick={() => setGoal(item)}>{item}</button>)}</div>
        <button className={styles.primary} disabled={busy || !supabaseConfigured}>{busy ? 'Saving securely…' : 'Complete setup'}</button>
      </form>
    </section></main>
  );
}
