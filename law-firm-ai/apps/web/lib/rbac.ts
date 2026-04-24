import type { UserRole } from '@law-firm-ai/db';

/**
 * Basit rol bazlı yetki matrisi. Satır bazı yetki (row-level), controller içinde
 * ek kontrolle yapılır (ör. sekreter sadece atandığı davayı görür).
 */
export const RBAC = {
  clients: {
    list: ['ADMIN', 'LAWYER', 'PARALEGAL', 'SECRETARY'],
    create: ['ADMIN', 'LAWYER', 'SECRETARY'],
    edit: ['ADMIN', 'LAWYER', 'SECRETARY'],
    delete: ['ADMIN', 'LAWYER'], // soft-delete
  },
  cases: {
    list: ['ADMIN', 'LAWYER', 'PARALEGAL', 'SECRETARY'],
    create: ['ADMIN', 'LAWYER'],
    edit: ['ADMIN', 'LAWYER', 'PARALEGAL'],
    delete: ['ADMIN', 'LAWYER'],
  },
  documents: {
    list: ['ADMIN', 'LAWYER', 'PARALEGAL', 'SECRETARY'],
    upload: ['ADMIN', 'LAWYER', 'PARALEGAL', 'SECRETARY'],
    delete: ['ADMIN', 'LAWYER'],
  },
  finance: {
    list: ['ADMIN', 'LAWYER', 'SECRETARY'],
    edit: ['ADMIN', 'LAWYER', 'SECRETARY'],
  },
  staff: {
    list: ['ADMIN'],
    manage: ['ADMIN'],
  },
  audit: {
    view: ['ADMIN'],
  },
  assistant: {
    use: ['ADMIN', 'LAWYER', 'PARALEGAL'],
  },
  precedents: {
    search: ['ADMIN', 'LAWYER', 'PARALEGAL'],
  },
} as const;

export type Permission = keyof typeof RBAC;
export type Action<P extends Permission> = keyof (typeof RBAC)[P];

export function can<P extends Permission>(
  role: UserRole | string | undefined,
  perm: P,
  action: Action<P>,
): boolean {
  if (!role) return false;
  const allowed = RBAC[perm][action] as readonly string[];
  return allowed.includes(role);
}
