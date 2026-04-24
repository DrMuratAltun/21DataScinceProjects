import { Prisma } from '@prisma/client';

/**
 * Soft-delete extension.
 *
 * KVKK "append-only" gereği — ana varlıklarda hard-delete (`delete`, `deleteMany`)
 * çağrıları otomatik olarak `update({ deletedAt: now })` şeklinde yeniden yazılır.
 * Aynı zamanda varsayılan sorgularda `deletedAt: null` filtresi eklenir; silinmişler
 * ancak `{ withDeleted: true }` argümanı ile görünür.
 *
 * Hard delete gerekiyorsa (ör. GDPR "sil" talebi) `client.$unsafeHardDelete.<model>()`
 * isimli yardımcıyı kullan ve `AuditLog.action=DELETE` manuel yaz.
 */
const SOFT_DELETE_MODELS = new Set([
  'User',
  'Client',
  'Case',
  'Hearing',
  'Document',
  'Invoice',
  'Payment',
  'ChatSession',
]);

export const softDeleteExtension = Prisma.defineExtension({
  name: 'soft-delete',
  query: {
    $allModels: {
      async delete({ model, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        // Çağrıyı update'e çevir
        return (this as any)[model.charAt(0).toLowerCase() + model.slice(1)].update({
          where: args.where,
          data: { deletedAt: new Date() },
        });
      },
      async deleteMany({ model, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        return (this as any)[model.charAt(0).toLowerCase() + model.slice(1)].updateMany({
          where: args.where,
          data: { deletedAt: new Date() },
        });
      },
      async findMany({ model, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        if ((args as any)?.withDeleted) {
          const { withDeleted: _wd, ...rest } = args as any;
          return query(rest);
        }
        return query({
          ...args,
          where: { deletedAt: null, ...(args.where ?? {}) },
        } as any);
      },
      async findFirst({ model, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        if ((args as any)?.withDeleted) {
          const { withDeleted: _wd, ...rest } = args as any;
          return query(rest);
        }
        return query({
          ...args,
          where: { deletedAt: null, ...(args?.where ?? {}) },
        } as any);
      },
      async findUnique({ model, args, query }) {
        if (!SOFT_DELETE_MODELS.has(model)) return query(args);
        const result = await query(args);
        if (result && (result as { deletedAt?: Date | null }).deletedAt) return null;
        return result;
      },
    },
  },
});
