import { signIn } from '@/lib/auth';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  async function loginAction(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    const next = String(formData.get('next') ?? '/clients');
    await signIn('credentials', { email, password, redirectTo: next });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <form action={loginAction} className="w-full max-w-sm space-y-4 rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold">Giriş</h1>
        <p className="text-sm text-slate-500">Hukuk Bürosu AI — personel girişi</p>
        <LoginFields searchParams={searchParams} />
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800"
        >
          Giriş yap
        </button>
      </form>
    </main>
  );
}

async function LoginFields({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  return (
    <>
      <input type="hidden" name="next" value={sp.next ?? '/clients'} />
      <label className="block text-sm">
        E-posta
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Şifre
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border px-3 py-2"
        />
      </label>
      {sp.error && <p className="text-sm text-red-600">Giriş başarısız. Bilgileri kontrol edin.</p>}
    </>
  );
}
