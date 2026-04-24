import { Worker } from 'bullmq';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { prisma } from '@law-firm-ai/db';
import { templates } from '@law-firm-ai/ai';
import { connection } from '../queues.js';

const STORAGE_ROOT = process.env.STORAGE_ROOT ?? './storage';
const FIRM = {
  name: process.env.LAW_FIRM_NAME ?? 'Demo Hukuk Bürosu',
  address: process.env.LAW_FIRM_ADDRESS ?? 'İstanbul, Türkiye',
  taxId: process.env.LAW_FIRM_TAX_ID ?? '—',
  email: 'iletisim@hukukburosu.example',
  dpoName: 'Veri Sorumlusu',
  dpoEmail: 'kvkk@hukukburosu.example',
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', lineHeight: 1.5 },
  title: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  body: { marginBottom: 6 },
});

function TextDocument({ body, title }: { body: string; title: string }) {
  return React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(View, null, React.createElement(Text, { style: styles.title }, title)),
      ...body.split('\n').map((line, i) =>
        React.createElement(Text, { key: i, style: styles.body }, line || ' '),
      ),
    ),
  );
}

interface ReportJobPayload {
  kind: 'templateToPdf' | 'invoicePdf';
  // template
  templateKey?: Parameters<typeof templates.renderTemplate>[0];
  data?: Record<string, unknown>;
  title?: string;
  // invoice
  invoiceId?: string;
  outputName: string;
}

new Worker(
  'report_queue',
  async (job) => {
    const payload = job.data as ReportJobPayload;
    let title = payload.title ?? 'Belge';
    let body = '';

    if (payload.kind === 'templateToPdf' && payload.templateKey) {
      body = templates.renderTemplate(payload.templateKey, {
        firm: FIRM,
        ...payload.data,
      });
      title = payload.title ?? String(payload.templateKey);
    } else if (payload.kind === 'invoicePdf' && payload.invoiceId) {
      const inv = await prisma.invoice.findUnique({
        where: { id: payload.invoiceId },
        include: { client: true, lines: true },
      });
      if (!inv) return;
      title = `Fatura ${inv.number}`;
      body =
        `${FIRM.name}\n${FIRM.address}\nVKN: ${FIRM.taxId}\n\n` +
        `Müvekkil: ${inv.client.fullName}\n` +
        `Tarih: ${new Date(inv.issuedAt).toLocaleDateString('tr-TR')}\n` +
        `Vade: ${new Date(inv.dueDate).toLocaleDateString('tr-TR')}\n\n` +
        inv.lines.map((l) => `- ${l.description}  ${Number(l.amount).toFixed(2)} ₺`).join('\n') +
        `\n\nAra toplam: ${Number(inv.subtotal).toFixed(2)} ₺` +
        `\nKDV (%${Number(inv.vatRate)}): ${Number(inv.vatAmount).toFixed(2)} ₺` +
        `\nGENEL TOPLAM: ${Number(inv.total).toFixed(2)} ₺`;
    } else {
      throw new Error('Unknown report kind');
    }

    const outDir = path.join(STORAGE_ROOT, 'reports', new Date().toISOString().slice(0, 10));
    await fs.mkdir(outDir, { recursive: true });
    const outPath = path.join(outDir, `${payload.outputName}.pdf`);
    const stream = await pdf(TextDocument({ body, title })).toBuffer();
    await fs.writeFile(outPath, stream);

    if (payload.kind === 'invoicePdf' && payload.invoiceId) {
      await prisma.invoice.update({
        where: { id: payload.invoiceId },
        data: { pdfPath: path.relative(STORAGE_ROOT, outPath) },
      });
    }
    console.log(`[report] wrote ${outPath}`);
  },
  { connection, concurrency: 2 },
)
  .on('completed', (job) => console.log(`[report] done ${job.id}`))
  .on('failed', (job, err) => console.error(`[report] failed ${job?.id}:`, err));
