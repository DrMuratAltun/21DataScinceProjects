import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Hukuk Bürosu AI</h1>
      <p className="max-w-prose text-slate-600">
        Büro yönetimi ve yerel yapay zekâ asistanınız. Müvekkil/dava yönetimi, belge RAG,
        dilekçe taslağı üretimi, KVKK uyumlu PII maskeleme ve emsal karar araması tek
        sistemde.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-blue-700 px-6 py-3 font-medium text-white hover:bg-blue-800"
      >
        Giriş yap
      </Link>
    </main>
  );
}
