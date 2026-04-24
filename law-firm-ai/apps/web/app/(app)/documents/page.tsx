import { prisma } from '@law-firm-ai/db';
import { UploadForm } from './upload-form';

export default async function DocumentsPage() {
  const docs = await prisma.document.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { uploader: true, client: true, case: true, _count: { select: { chunks: true } } },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Belge kütüphanesi</h1>
      <UploadForm />

      <table className="w-full rounded-lg border text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-2">Başlık</th>
            <th className="px-4 py-2">Müvekkil / Dava</th>
            <th className="px-4 py-2">Boyut</th>
            <th className="px-4 py-2">Chunks</th>
            <th className="px-4 py-2">Durum</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id} className="border-t">
              <td className="px-4 py-2">{d.title}</td>
              <td className="px-4 py-2">
                {d.client?.fullName ?? '—'}
                {d.case ? ` / ${d.case.fileNumber}` : ''}
              </td>
              <td className="px-4 py-2">{Math.round(d.size / 1024)} KB</td>
              <td className="px-4 py-2">{d._count.chunks}</td>
              <td className="px-4 py-2">{d.indexedAt ? '✓ indexlendi' : '… işleniyor'}</td>
            </tr>
          ))}
          {docs.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                Henüz belge yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
