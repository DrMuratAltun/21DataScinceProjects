import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import { prisma } from '@law-firm-ai/db';
import { withAudit } from '@/lib/audit-context';
import { isValidTckn } from '@law-firm-ai/ai/pii';
import { z } from 'zod';

const ClientSchema = z.object({
  fullName: z.string().min(2),
  tckn: z
    .string()
    .optional()
    .refine((v) => !v || isValidTckn(v), 'Geçersiz TCKN'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  kvkkConsent: z.coerce.boolean().default(false),
});

async function createClient(formData: FormData) {
  'use server';
  const parsed = ClientSchema.safeParse({
    fullName: formData.get('fullName'),
    tckn: (formData.get('tckn') as string) || undefined,
    phone: (formData.get('phone') as string) || undefined,
    email: (formData.get('email') as string) || undefined,
    address: (formData.get('address') as string) || undefined,
    kvkkConsent: formData.get('kvkkConsent') === 'on',
  });
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join(', '));
  await withAudit(() =>
    prisma.client.create({
      data: {
        fullName: parsed.data.fullName,
        tckn: parsed.data.tckn,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        address: parsed.data.address,
        kvkkConsent: parsed.data.kvkkConsent,
        kvkkConsentAt: parsed.data.kvkkConsent ? new Date() : null,
      },
    }),
  );
  revalidatePath('/clients');
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { tckn: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { _count: { select: { cases: true, documents: true } } },
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Müvekkiller</h1>
      </header>

      <form action={createClient} className="grid gap-3 rounded-lg border p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-medium text-slate-700">Yeni müvekkil</h2>
        <input name="fullName" required placeholder="Ad Soyad / Unvan" className="rounded-md border px-3 py-2" />
        <input name="tckn" placeholder="T.C. Kimlik No (11 hane)" className="rounded-md border px-3 py-2" maxLength={11} />
        <input name="phone" placeholder="Telefon" className="rounded-md border px-3 py-2" />
        <input name="email" type="email" placeholder="E-posta" className="rounded-md border px-3 py-2" />
        <input name="address" placeholder="Adres" className="rounded-md border px-3 py-2 md:col-span-2" />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="kvkkConsent" /> KVKK aydınlatma ve açık rıza alındı
        </label>
        <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white md:col-span-2">
          Kaydet
        </button>
      </form>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Müvekkil ara (ad, TCKN, e-posta)"
          className="w-full max-w-md rounded-md border px-3 py-2"
        />
        <button className="rounded-md border px-3 py-2" type="submit">
          Ara
        </button>
      </form>

      <table className="w-full overflow-hidden rounded-lg border text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-2">Ad</th>
            <th className="px-4 py-2">TCKN</th>
            <th className="px-4 py-2">İletişim</th>
            <th className="px-4 py-2">Dava</th>
            <th className="px-4 py-2">KVKK</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id} className="border-t hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/clients/${c.id}`} className="text-blue-700 hover:underline">
                  {c.fullName}
                </Link>
              </td>
              <td className="px-4 py-2">{c.tckn ?? '—'}</td>
              <td className="px-4 py-2">
                {c.phone ?? '—'}
                {c.email ? ` · ${c.email}` : ''}
              </td>
              <td className="px-4 py-2">{c._count.cases}</td>
              <td className="px-4 py-2">{c.kvkkConsent ? '✓' : '—'}</td>
            </tr>
          ))}
          {clients.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                Henüz müvekkil yok.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
