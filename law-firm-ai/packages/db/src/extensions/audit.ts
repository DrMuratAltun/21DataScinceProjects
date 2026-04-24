import { Prisma } from '@prisma/client';

/**
 * Audit log extension.
 *
 * create / update / soft-delete (deletedAt güncellemesi) her çağrıda AuditLog
 * yazar. Kullanıcı bağlamı (userId, ip, userAgent) `withAuditContext()` helper'ı
 * ile AsyncLocalStorage üzerinden alınır (Next.js middleware'inde set edilir).
 */

import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContext {
  userId?: string;
  ip?: string;
  userAgent?: string;
  reason?: string;
}

const auditStorage = new AsyncLocalStorage<AuditContext>();

export function withAuditContext<T>(ctx: AuditContext, fn: () => Promise<T>): Promise<T> {
  return auditStorage.run(ctx, fn);
}

export function getAuditContext(): AuditContext {
  return auditStorage.getStore() ?? {};
}

const AUDITABLE = new Set([
  'User',
  'Client',
  'Case',
  'Hearing',
  'Document',
  'Invoice',
  'Payment',
  'ChatSession',
]);

export const auditExtension = Prisma.defineExtension({
  name: 'audit-log',
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);
        if (AUDITABLE.has(model)) {
          await writeAudit(this, {
            action: 'CREATE',
            entity: model,
            entityId: (result as { id?: string })?.id,
            diff: { after: result },
          });
        }
        return result;
      },
      async update({ model, args, query }) {
        const result = await query(args);
        if (!AUDITABLE.has(model)) return result;
        const isSoftDelete = (args.data as Record<string, unknown> | undefined)?.deletedAt != null;
        await writeAudit(this, {
          action: isSoftDelete ? 'SOFT_DELETE' : 'UPDATE',
          entity: model,
          entityId: (result as { id?: string })?.id,
          diff: { changes: args.data },
        });
        return result;
      },
      async updateMany({ model, args, query }) {
        const result = await query(args);
        if (!AUDITABLE.has(model)) return result;
        const isSoftDelete = (args.data as Record<string, unknown> | undefined)?.deletedAt != null;
        await writeAudit(this, {
          action: isSoftDelete ? 'SOFT_DELETE' : 'UPDATE',
          entity: model,
          diff: { where: args.where, changes: args.data, count: (result as { count: number }).count },
        });
        return result;
      },
    },
  },
});

async function writeAudit(
  client: any,
  payload: {
    action: 'CREATE' | 'UPDATE' | 'SOFT_DELETE' | 'DELETE';
    entity: string;
    entityId?: string;
    diff?: unknown;
  },
): Promise<void> {
  const ctx = getAuditContext();
  try {
    await client.auditLog.create({
      data: {
        userId: ctx.userId ?? null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId ?? null,
        diff: payload.diff ?? null,
        ip: ctx.ip ?? null,
        userAgent: ctx.userAgent ?? null,
        reason: ctx.reason ?? null,
      },
    });
  } catch {
    // Audit yazımı ana işlemi bozmasın; hata monitoring'e düşsün.
  }
}
