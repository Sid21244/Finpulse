import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'FinPulse — Financial clarity, powered by AI',
  description: 'A responsive personal finance intelligence dashboard.',
  manifest: '/manifest.json',
  applicationName: 'FinPulse',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'FinPulse' },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  openGraph: {
    title: 'FinPulse — Financial clarity, powered by AI',
    description: 'A responsive personal finance intelligence dashboard.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'FinPulse financial dashboard' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FinPulse — Financial clarity, powered by AI',
    description: 'A responsive personal finance intelligence dashboard.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020b1d',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
