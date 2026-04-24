import { prisma, type InvoiceStatus } from '@law-firm-ai/db';
import { revalidatePath } from 'next/cache';
import { withAudit } from '@/lib/audit-context';

const STATUS: Record<InvoiceStatus, string> = {
  DRAFT: 'Taslak',
  SENT: 'Gönderildi',
  PARTIAL: 'Kısmi ödeme',
  PAID: 'Ödendi',
  OVERDUE: 'Gecikmiş',
  CANCELLED: 'İptal',
};

async function createInvoice(formData: FormData) {
  'use server';
  const clientId = String(formData.get('clientId') ?? '');
  const caseId = (formData.get('caseId') as string) || null;
  const description = String(formData.get('description') ?? '');
  const unitPrice = Number(formData.get('unitPrice') ?? 0);
  const quantity = Number(formData.get('quantity') ?? 1);
  const vatRate = Number(formData.get('vatRate') ?? 20);
  const dueDate = new Date(String(formData.get('dueDate') ?? Date.now()));
  if (!clientId || !description || !unitPrice) return;

  const lineAmount = quantity * unitPrice;
  const vatAmount = (lineAmount * vatRate) / 100;
  const total = lineAmount + vatAmount;
  const number = `F-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

  await withAudit(() =>
    prisma.invoice.create({
      data: {
        number,
        clientId,
        caseId,
        dueDate,
        subtotal: lineAmount,
        vatRate,
        vatAmount,
        total,
        lines: {
          create: [{ description, quantity, unitPrice, amount: lineAmount }],
        },
      },
    }),
  );
  revalidatePath('/finance');
}

export default async function FinancePage() {
  const [invoices, clients] = await Promise.all([
    prisma.invoice.findMany({
      include: { client: true, payments: true },
      orderBy: { issuedAt: 'desc' },
      take: 100,
    }),
    prisma.client.findMany({ orderBy: { fullName: 'asc' } }),
  ]);

  const totalOutstanding = invoices
    .filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED')
    .reduce((acc, i) => acc + Number(i.total), 0);

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Finans</h1>
        <div className="rounded-md border bg-slate-50 px-4 py-2 text-sm">
          Açık bakiye:{' '}
          <strong>{totalOutstanding.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</strong>
        </div>
      </header>

      <form action={createInvoice} className="grid gap-3 rounded-lg border p-5 md:grid-cols-3">
        <h2 className="md:col-span-3 text-sm font-medium text-slate-700">Yeni fatura</h2>
        <select name="clientId" required className="rounded-md border px-3 py-2">
          <option value="">— Müvekkil —</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.fullName}
            </option>
          ))}
        </select>
        <input name="description" required placeholder="Açıklama" className="rounded-md border px-3 py-2 md:col-span-2" />
        <input name="quantity" type="number" min={1} defaultValue={1} className="rounded-md border px-3 py-2" />
        <input name="unitPrice" type="number" step="0.01" required placeholder="Birim fiyat (₺)" className="rounded-md border px-3 py-2" />
        <input name="vatRate" type="number" step="0.01" defaultValue={20} className="rounded-md border px-3 py-2" />
        <input name="dueDate" type="date" required className="rounded-md border px-3 py-2" />
        <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white md:col-span-2">
          Kaydet
        </button>
      </form>

      <table className="w-full rounded-lg border text-sm">
        <thead className="bg-slate-50 text-left text-slate-600">
          <tr>
            <th className="px-4 py-2">No</th>
            <th className="px-4 py-2">Müvekkil</th>
            <th className="px-4 py-2">Tarih</th>
            <th className="px-4 py-2">Vade</th>
            <th className="px-4 py-2 text-right">Toplam</th>
            <th className="px-4 py-2">Durum</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} className="border-t">
              <td className="px-4 py-2">{inv.number}</td>
              <td className="px-4 py-2">{inv.client.fullName}</td>
              <td className="px-4 py-2">{new Date(inv.issuedAt).toLocaleDateString('tr-TR')}</td>
              <td className="px-4 py-2">{new Date(inv.dueDate).toLocaleDateString('tr-TR')}</td>
              <td className="px-4 py-2 text-right">
                {Number(inv.total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
              </td>
              <td className="px-4 py-2">{STATUS[inv.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
