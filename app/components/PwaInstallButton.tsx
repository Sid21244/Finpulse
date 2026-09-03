'use client';

import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallButton({ notify }: { notify: (message: string) => void }) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const register = () => void navigator.serviceWorker.register('/sw.js');
      window.addEventListener('load', register, { once: true });
      if (document.readyState === 'complete') register();
    }
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  async function install() {
    if (installed || window.matchMedia('(display-mode: standalone)').matches) {
      notify('FinPulse is already installed on this device');
      return;
    }
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') notify('FinPulse was added to your device');
      setPrompt(null);
      return;
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      notify('On iPhone: tap Share, then Add to Home Screen');
      return;
    }
    notify('Open your browser menu and choose Install app or Add to Home screen');
  }

  return <button className="install-button" type="button" onClick={() => void install()} aria-label="Install FinPulse on this device" title="Install FinPulse">
    {installed ? <Smartphone/> : <Download/>}
  </button>;
}
