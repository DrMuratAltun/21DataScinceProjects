import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { prisma, type CaseStatus } from '@law-firm-ai/db';
import { withAudit } from '@/lib/audit-context';

const STATUS_LABEL: Record<CaseStatus, string> = {
  OPEN: 'Açık',
  HEARING_PENDING: 'Duruşma bekliyor',
  DECISION: 'Karar',
  CLOSED: 'Kapalı',
  ARCHIVED: 'Arşiv',
};

async function createCase(formData: FormData) {
  'use server';
  const fileNumber = String(formData.get('fileNumber') ?? '');
  const court = String(formData.get('court') ?? '');
  const subject = String(formData.get('subject') ?? '');
  const counterparty = String(formData.get('counterparty') ?? '');
  const clientId = String(formData.get('clientId') ?? '');
  if (!fileNumber || !court || !subject || !clientId) return;
  await withAudit(() =>
    prisma.case.create({
      data: { fileNumber, court, subject, counterparty, clientId },
    }),
  );
  revalidatePath('/cases');
}

export default async function CasesPage() {
  const [cases, clients] = await Promise.all([
    prisma.case.findMany({
      include: { client: true, assignee: true },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    }),
    prisma.client.findMany({ orderBy: { fullName: 'asc' }, take: 500 }),
  ]);

  const grouped: Record<CaseStatus, typeof cases> = {
    OPEN: [],
    HEARING_PENDING: [],
    DECISION: [],
    CLOSED: [],
    ARCHIVED: [],
  };
  for (const c of cases) grouped[c.status].push(c);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Davalar</h1>

      <form action={createCase} className="grid gap-3 rounded-lg border p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-medium text-slate-700">Yeni dava</h2>
        <input name="fileNumber" required placeholder="Dosya no (iç)" className="rounded-md border px-3 py-2" />
        <input name="court" required placeholder="Mahkeme" className="rounded-md border px-3 py-2" />
        <input name="subject" required placeholder="Konu" className="rounded-md border px-3 py-2 md:col-span-2" />
        <input name="counterparty" required placeholder="Karşı taraf" className="rounded-md border px-3 py-2" />
        <select name="clientId" required className="rounded-md border px-3 py-2">
          <option value="">— Müvekkil seç —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white md:col-span-2">
          Kaydet
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(grouped) as CaseStatus[])
          .filter((s) => s !== 'ARCHIVED')
          .map((status) => (
            <div key={status} className="rounded-lg border bg-slate-50 p-3">
              <h3 className="mb-2 text-sm font-medium text-slate-700">
                {STATUS_LABEL[status]} ({grouped[status].length})
              </h3>
              <div className="space-y-2">
                {grouped[status].map((c) => (
                  <Link
                    key={c.id}
                    href={`/cases/${c.id}`}
                    className="block rounded-md bg-white p-3 text-sm shadow-sm hover:shadow"
                  >
                    <div className="font-medium">{c.fileNumber}</div>
                    <div className="text-xs text-slate-500">{c.court}</div>
                    <div className="mt-1 truncate">{c.subject}</div>
                    <div className="mt-1 text-xs text-slate-500">Müvekkil: {c.client.fullName}</div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
