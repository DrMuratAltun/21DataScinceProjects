import { headers } from 'next/headers';
import { auth } from './auth';
import { withAuditContext, type AuditContext } from '@law-firm-ai/db';

/**
 * Server Action / Route Handler içinde `withAudit(async () => {...})` ile sarılır.
 * AsyncLocalStorage üzerinden Prisma audit extension'a user/ip/ua bilgisini geçirir.
 */
export async function withAudit<T>(fn: () => Promise<T>, extra?: Partial<AuditContext>): Promise<T> {
  const [session, hdrs] = await Promise.all([auth(), headers()]);
  return withAuditContext(
    {
      userId: (session?.user as { id?: string } | undefined)?.id,
      ip: hdrs.get('x-forwarded-for') ?? hdrs.get('x-real-ip') ?? undefined,
      userAgent: hdrs.get('user-agent') ?? undefined,
      ...extra,
    },
    fn,
  );
}
