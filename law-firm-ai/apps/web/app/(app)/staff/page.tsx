import { prisma, type UserRole } from '@law-firm-ai/db';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { withAudit } from '@/lib/audit-context';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Yönetici',
  LAWYER: 'Avukat',
  PARALEGAL: 'Stajyer',
  SECRETARY: 'Sekreter',
  CLIENT: 'Müvekkil portal',
};

async function createStaff(formData: FormData) {
  'use server';
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    throw new Error('Yetki yok');
  }
  const email = String(formData.get('email') ?? '').toLowerCase();
  const fullName = String(formData.get('fullName') ?? '');
  const role = String(formData.get('role') ?? 'LAWYER') as UserRole;
  const password = String(formData.get('password') ?? '');
  if (!email || !fullName || password.length < 8) return;
  const hash = await bcrypt.hash(password, 12);
  await withAudit(() =>
    prisma.user.create({
      data: { email, fullName, role, passwordHash: hash },
    }),
  );
  revalidatePath('/staff');
}

export default async function StaffPage() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    redirect('/clients');
  }
  const users = await prisma.user.findMany({
    orderBy: { fullName: 'asc' },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Personel & Yetki</h1>

      <form action={createStaff} className="grid gap-3 rounded-lg border p-5 md:grid-cols-2">
        <h2 className="md:col-span-2 text-sm font-medium text-slate-700">Yeni kullanıcı</h2>
        <input name="fullName" required placeholder="Ad Soyad" className="rounded-md border px-3 py-2" />
        <input name="email" type="email" required placeholder="E-posta" className="rounded-md border px-3 py-2" />
        <select name="role" required className="rounded-md border px-3 py-2">
          {Object.entries(ROLE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Şifre (min 8 karakter)"
          className="rounded-md border px-3 py-2"
        />
        <button type="submit" className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white md:col-span-2">
          Oluştur
        </button>
      </form>

      <table className="w-full rounded-lg border text-sm">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-4 py-2">Ad</th>
            <th className="px-4 py-2">E-posta</th>
            <th className="px-4 py-2">Rol</th>
            <th className="px-4 py-2">Durum</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="px-4 py-2">{u.fullName}</td>
              <td className="px-4 py-2">{u.email}</td>
              <td className="px-4 py-2">{ROLE_LABEL[u.role]}</td>
              <td className="px-4 py-2">{u.active ? 'Aktif' : 'Pasif'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
