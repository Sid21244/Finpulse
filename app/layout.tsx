import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'FinPulse — Financial clarity, powered by AI',
  description: 'A responsive personal finance intelligence dashboard.',
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
