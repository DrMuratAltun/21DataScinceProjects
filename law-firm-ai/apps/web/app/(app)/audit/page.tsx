import { prisma } from '@law-firm-ai/db';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AuditPage() {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    redirect('/clients');
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { at: 'desc' },
    take: 200,
    include: { user: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit Log</h1>
      <p className="text-sm text-slate-600">
        KVKK append-only kayıt. Silinmez, değiştirilmez; yalnızca görüntülenir.
      </p>
      <table className="w-full rounded-lg border text-xs">
        <thead className="bg-slate-50 text-left">
          <tr>
            <th className="px-3 py-2">Zaman</th>
            <th className="px-3 py-2">Kullanıcı</th>
            <th className="px-3 py-2">İşlem</th>
            <th className="px-3 py-2">Varlık</th>
            <th className="px-3 py-2">IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t">
              <td className="px-3 py-1.5">{new Date(log.at).toLocaleString('tr-TR')}</td>
              <td className="px-3 py-1.5">{log.user?.fullName ?? '—'}</td>
              <td className="px-3 py-1.5 font-mono">{log.action}</td>
              <td className="px-3 py-1.5">
                {log.entity}
                {log.entityId ? ` (${log.entityId.slice(0, 8)}…)` : ''}
              </td>
              <td className="px-3 py-1.5 text-slate-500">{log.ip ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
