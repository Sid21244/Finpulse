'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/app/lib/supabase/client';
import { safeRelativePath } from '@/app/lib/supabase/redirect';
import styles from './Auth.module.css';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const next = safeRelativePath(params.get('next'));

    async function finish() {
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error('The authentication callback did not contain a valid session.');
      }
      router.replace(next);
    }

    void finish().catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to complete sign-in.'));
  }, [router]);

  return <main className={styles.screen}><section className={styles.panel}>{error ? <><p className={styles.error}>{error}</p><button className={styles.primary} onClick={() => router.replace('/login')}>Return to sign in</button></> : <div className={styles.loading}><span className={styles.spinner} />Completing secure sign-in…</div>}</section></main>;
}
