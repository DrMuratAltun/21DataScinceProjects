import { PrismaClient } from '@prisma/client';
import { softDeleteExtension, auditExtension } from './extensions/index.js';

export * from '@prisma/client';
export {
  withAuditContext,
  getAuditContext,
  softDeleteExtension,
  auditExtension,
} from './extensions/index.js';

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof buildClient>;
};

function buildClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
    .$extends(softDeleteExtension)
    .$extends(auditExtension);
}

export const prisma = globalForPrisma.prisma ?? buildClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type Prisma$Client = typeof prisma;
