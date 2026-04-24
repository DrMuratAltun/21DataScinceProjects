import { notFound } from 'next/navigation';
import { prisma } from '@law-firm-ai/db';
import Link from 'next/link';

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = await prisma.case.findUnique({
    where: { id },
    include: {
      client: true,
      assignee: true,
      hearings: { orderBy: { scheduledAt: 'asc' } },
      documents: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { uploader: true },
      },
    },
  });
  if (!item) notFound();

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Dosya {item.fileNumber}</p>
          <h1 className="text-2xl font-semibold">{item.subject}</h1>
          <p className="text-sm text-slate-500">
            {item.court} · Esas: {item.esasNo ?? '—'} · Karşı taraf: {item.counterparty}
          </p>
          <p className="mt-1 text-sm">
            Müvekkil:{' '}
            <Link href={`/clients/${item.clientId}`} className="text-blue-700 hover:underline">
              {item.client.fullName}
            </Link>
          </p>
        </div>
        <Link
          href={`/assistant?caseId=${item.id}`}
          className="rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white"
        >
          AI asistan (bu davada)
        </Link>
      </header>

      <section>
        <h2 className="mb-2 text-lg font-medium">Duruşmalar</h2>
        <ul className="divide-y rounded-md border">
          {item.hearings.map((h) => (
            <li key={h.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{new Date(h.scheduledAt).toLocaleString('tr-TR')}</span>
              <span className="text-slate-500">{h.location}</span>
              <span className="text-slate-700">{h.outcome ?? '—'}</span>
            </li>
          ))}
          {item.hearings.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Henüz duruşma yok.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Belgeler</h2>
        <ul className="divide-y rounded-md border">
          {item.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>{d.title}</span>
              <span className="text-xs text-slate-500">
                {d.uploader.fullName} · {new Date(d.createdAt).toLocaleDateString('tr-TR')}
                {d.indexedAt ? ' · indexlendi' : ' · indexleniyor'}
              </span>
            </li>
          ))}
          {item.documents.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Henüz belge yok.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
