import { NextResponse } from 'next/server';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '@law-firm-ai/db';
import { auth } from '@/lib/auth';
import { withAudit } from '@/lib/audit-context';

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? './storage';
const connection = new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});
const pdfQueue = new Queue('pdf_queue', { connection });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const fd = await req.formData();
  const file = fd.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });

  const title = String(fd.get('title') || file.name);
  const tagsRaw = String(fd.get('tags') || '');
  const tags = tagsRaw.split(',').map((t) => t.trim()).filter(Boolean);
  const clientId = (fd.get('clientId') as string) || undefined;
  const caseId = (fd.get('caseId') as string) || undefined;

  const buffer = Buffer.from(await file.arrayBuffer());
  const checksum = crypto.createHash('sha256').update(buffer).digest('hex');
  const relDir = path.join('documents', new Date().toISOString().slice(0, 7));
  const fileName = `${checksum.slice(0, 16)}_${file.name}`;
  const absDir = path.join(STORAGE_ROOT, relDir);
  await fs.mkdir(absDir, { recursive: true });
  const storagePath = path.join(relDir, fileName);
  await fs.writeFile(path.join(STORAGE_ROOT, storagePath), buffer);

  const doc = await withAudit(() =>
    prisma.document.create({
      data: {
        title,
        storagePath,
        mimeType: file.type || 'application/octet-stream',
        size: buffer.byteLength,
        checksum,
        tags,
        uploaderId: (session.user as { id: string }).id,
        clientId,
        caseId,
      },
    }),
  );

  await pdfQueue.add('indexDocument', { documentId: doc.id });

  return NextResponse.json({ ok: true, id: doc.id });
}
