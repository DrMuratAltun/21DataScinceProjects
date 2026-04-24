import { prisma } from '@law-firm-ai/db';

export default async function PrecedentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const hits = q
    ? await prisma.$queryRawUnsafe<Array<{
        id: string;
        court: string;
        esasNo: string;
        kararNo: string;
        decidedAt: Date;
        summary: string | null;
        rank: number;
      }>>(`
      SELECT id, court, "esasNo", "kararNo", "decidedAt", summary,
             ts_rank(tsv, plainto_tsquery('turkish_unaccent', $1)) AS rank
      FROM "PrecedentCase"
      WHERE tsv @@ plainto_tsquery('turkish_unaccent', $1)
      ORDER BY rank DESC
      LIMIT 50
    `, q)
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Emsal Karar Arama</h1>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Anahtar kelime (örn. 'işçi alacağı fazla mesai')"
          className="w-full max-w-xl rounded-md border px-3 py-2"
        />
        <button className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white">Ara</button>
      </form>

      {q && <p className="text-sm text-slate-500">{hits.length} sonuç</p>}

      <ul className="space-y-3">
        {hits.map((h) => (
          <li key={h.id} className="rounded-lg border p-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>
                {h.court} · Esas: {h.esasNo} · Karar: {h.kararNo}
              </span>
              <span>{new Date(h.decidedAt).toLocaleDateString('tr-TR')}</span>
            </div>
            <p className="mt-2 text-sm">{h.summary ?? '—'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
