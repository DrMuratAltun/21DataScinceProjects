'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UploadForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      setMessage('Yüklendi. İndeksleme arka planda devam ediyor.');
      (e.currentTarget as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setMessage(`Hata: ${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border p-5 md:grid-cols-2">
      <h2 className="md:col-span-2 text-sm font-medium text-slate-700">Belge yükle</h2>
      <input name="title" placeholder="Başlık (opsiyonel)" className="rounded-md border px-3 py-2" />
      <input name="tags" placeholder="Etiketler (virgülle)" className="rounded-md border px-3 py-2" />
      <input name="clientId" placeholder="Müvekkil ID (opsiyonel)" className="rounded-md border px-3 py-2" />
      <input name="caseId" placeholder="Dava ID (opsiyonel)" className="rounded-md border px-3 py-2" />
      <input name="file" type="file" required accept=".pdf,.docx,.txt" className="md:col-span-2" />
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white md:col-span-2 disabled:opacity-60"
      >
        {busy ? 'Yükleniyor…' : 'Yükle & indeksle'}
      </button>
      {message && <p className="text-sm text-slate-600 md:col-span-2">{message}</p>}
    </form>
  );
}
