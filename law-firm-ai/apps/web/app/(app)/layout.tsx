import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth, signOut } from '@/lib/auth';
import {
  Users,
  Briefcase,
  FileText,
  Wallet,
  UserCog,
  Sparkles,
  BookOpen,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const NAV = [
  { href: '/clients', label: 'Müvekkiller', icon: Users },
  { href: '/cases', label: 'Davalar', icon: Briefcase },
  { href: '/documents', label: 'Belgeler', icon: FileText },
  { href: '/assistant', label: 'AI Asistan', icon: Sparkles },
  { href: '/precedents', label: 'Emsal Karar', icon: BookOpen },
  { href: '/finance', label: 'Finans', icon: Wallet },
  { href: '/staff', label: 'Personel', icon: UserCog },
  { href: '/audit', label: 'Audit Log', icon: ShieldCheck },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  async function logoutAction() {
    'use server';
    await signOut({ redirectTo: '/login' });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r bg-slate-50">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold">Hukuk Bürosu AI</h2>
          <p className="mt-1 text-xs text-slate-500">{session.user.name}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {(session.user as { role?: string }).role}
          </p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
            >
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
        <form action={logoutAction} className="border-t p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-200"
          >
            <LogOut size={16} /> Çıkış
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-auto bg-white">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
