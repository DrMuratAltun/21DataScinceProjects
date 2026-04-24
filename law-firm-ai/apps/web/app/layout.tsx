import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hukuk Bürosu AI',
  description: 'Büro yönetimi + yerel yapay zekâ asistanı',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-white text-slate-900 antialiased">{children}</body>
    </html>
  );
}
