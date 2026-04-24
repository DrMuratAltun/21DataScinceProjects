import { prisma } from '@law-firm-ai/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      cases: { orderBy: { updatedAt: 'desc' } },
      documents: { orderBy: { createdAt: 'desc' }, take: 50 },
      invoices: { orderBy: { issuedAt: 'desc' }, take: 50 },
    },
  });
  if (!client) notFound();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">Müvekkil</p>
        <h1 className="text-2xl font-semibold">{client.fullName}</h1>
        <p className="text-sm text-slate-500">
          {client.tckn ? `TCKN: ${client.tckn} · ` : ''}
          {client.phone ?? ''}
          {client.email ? ` · ${client.email}` : ''}
        </p>
        <p className="text-sm text-slate-500">
          KVKK: {client.kvkkConsent ? `onay alındı (${new Date(client.kvkkConsentAt ?? Date.now()).toLocaleDateString('tr-TR')})` : 'onay yok'}
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-medium">Davalar ({client.cases.length})</h2>
        <ul className="divide-y rounded-md border">
          {client.cases.map((c) => (
            <li key={c.id} className="px-4 py-2 text-sm">
              <Link href={`/cases/${c.id}`} className="text-blue-700 hover:underline">
                {c.fileNumber}
              </Link>{' '}
              · {c.court} · {c.subject}
            </li>
          ))}
          {client.cases.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Henüz dava yok.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Faturalar ({client.invoices.length})</h2>
        <ul className="divide-y rounded-md border">
          {client.invoices.map((i) => (
            <li key={i.id} className="flex justify-between px-4 py-2 text-sm">
              <span>{i.number}</span>
              <span>{new Date(i.issuedAt).toLocaleDateString('tr-TR')}</span>
              <span>{Number(i.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
              <span>{i.status}</span>
            </li>
          ))}
          {client.invoices.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Henüz fatura yok.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
