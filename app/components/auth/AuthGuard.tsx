'use client';

import type { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getSupabaseBrowserClient, supabaseConfigured } from '@/app/lib/supabase/client';
import styles from './Auth.module.css';

export default function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseConfigured);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabaseConfigured) return;

    const supabase = getSupabaseBrowserClient();
    let active = true;

    async function check(nextSession: Session | null) {
      if (!active) return;
      if (!nextSession) {
        setSession(null);
        setReady(true);
        router.replace('/login');
        return;
      }

      setSession(nextSession);
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', nextSession.user.id)
        .maybeSingle();

      if (!active) return;
      if (profileError) {
        setError(`Unable to load your FinPulse profile: ${profileError.message}`);
        setReady(true);
        return;
      }
      if (!data || !data.onboarding_completed) {
        router.replace('/onboarding');
        return;
      }
      setError('');
      setReady(true);
    }

    void supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void check(nextSession);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (!supabaseConfigured) {
    return (
      <main className={styles.screen}>
        <section className={styles.panel}>
          <div className={styles.brand}><span className={styles.mark}><ShieldCheck size={18} /></span>FinPulse</div>
          <p className={styles.eyebrow}>Setup required</p>
          <h1>Connect Supabase to continue</h1>
          <p className={styles.sub}>Add the project URL and publishable key to <code>.env.local</code>. The dashboard is intentionally locked until real authentication is configured.</p>
        </section>
      </main>
    );
  }

  if (!ready || !session) {
    return <main className={styles.screen}><div className={styles.loading}><span className={styles.spinner} />Checking your secure session…</div></main>;
  }

  if (error) {
    return <main className={styles.screen}><section className={styles.panel}><p className={styles.error}>{error}</p><p className={styles.sub}>Apply the Supabase migrations, then refresh this page.</p></section></main>;
  }

  async function signOut() {
    await getSupabaseBrowserClient().auth.signOut();
    router.replace('/login');
  }

  return (
    <div className={styles.authenticated}>
      <div className={styles.sessionBar}>
        <span>Signed in as</span><strong>{session.user.email ?? 'FinPulse user'}</strong>
        <button type="button" onClick={() => void signOut()}>Sign out</button>
      </div>
      {children}
    </div>
  );
}
