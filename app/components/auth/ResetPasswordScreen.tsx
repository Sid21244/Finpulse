'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { getSupabaseBrowserClient, supabaseConfigured } from '@/app/lib/supabase/client';
import { authCallbackUrl } from '@/app/lib/supabase/redirect';
import styles from './Auth.module.css';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [canUpdate, setCanUpdate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    void supabase.auth.getSession().then(({ data }) => setCanUpdate(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setCanUpdate(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const supabase = getSupabaseBrowserClient();
      if (canUpdate) {
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setMessage('Password updated. Redirecting to FinPulse…');
        window.setTimeout(() => router.replace('/dashboard'), 700);
      } else {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authCallbackUrl('/reset-password') });
        if (resetError) throw resetError;
        setMessage('Check your email for the secure password-reset link.');
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Password reset failed.'); }
    finally { setBusy(false); }
  }

  return <main className={styles.screen}><section className={styles.panel}>
    <div className={styles.brand}><span className={styles.mark}><KeyRound size={18} /></span>FinPulse</div>
    <p className={styles.eyebrow}>Account recovery</p><h1>{canUpdate ? 'Choose a new password' : 'Reset your password'}</h1>
    <p className={styles.sub}>{canUpdate ? 'Use at least eight characters.' : 'We will send a secure recovery link to your email.'}</p>
    {error ? <p className={styles.error}>{error}</p> : null}{message ? <p className={styles.success}>{message}</p> : null}
    <form className={styles.form} onSubmit={submit}>
      {canUpdate ? <label className={styles.label}>New password<input className={styles.input} type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label> : <label className={styles.label}>Email<input className={styles.input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>}
      <button className={styles.primary} disabled={busy || !supabaseConfigured}>{busy ? 'Please wait…' : canUpdate ? 'Save new password' : 'Send recovery link'}</button>
    </form>
    <div className={styles.actions}><button className={styles.linkButton} type="button" onClick={() => router.push('/login')}>Back to sign in</button></div>
  </section></main>;
}
