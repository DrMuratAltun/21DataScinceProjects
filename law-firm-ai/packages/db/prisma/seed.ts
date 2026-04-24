import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@demo.local';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      fullName: 'Demo Admin',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash('admin1234', 12),
    },
  });

  const lawyer = await prisma.user.upsert({
    where: { email: 'avukat@demo.local' },
    update: {},
    create: {
      email: 'avukat@demo.local',
      fullName: 'Av. Ayşe Yılmaz',
      role: 'LAWYER',
      passwordHash: await bcrypt.hash('avukat1234', 12),
    },
  });

  await prisma.user.upsert({
    where: { email: 'sekreter@demo.local' },
    update: {},
    create: {
      email: 'sekreter@demo.local',
      fullName: 'Ali Demir',
      role: 'SECRETARY',
      passwordHash: await bcrypt.hash('sekreter1234', 12),
    },
  });

  const clients = await Promise.all([
    prisma.client.upsert({
      where: { tckn: '10000000146' },
      update: {},
      create: {
        fullName: 'Mehmet Öztürk',
        tckn: '10000000146',
        phone: '0532 111 22 33',
        email: 'mehmet.ozturk@example.com',
        address: 'Kadıköy, İstanbul',
        kvkkConsent: true,
        kvkkConsentAt: new Date(),
      },
    }),
    prisma.client.upsert({
      where: { tckn: '29492458606' },
      update: {},
      create: {
        fullName: 'Selin Kaya',
        tckn: '29492458606',
        phone: '0534 555 44 33',
        email: 'selin.kaya@example.com',
        address: 'Çankaya, Ankara',
        kvkkConsent: true,
        kvkkConsentAt: new Date(),
      },
    }),
    prisma.client.upsert({
      where: { taxId: '1234567890' },
      update: {},
      create: {
        fullName: 'ACME Ltd. Şti.',
        taxId: '1234567890',
        phone: '0212 555 00 00',
        email: 'info@acme.example',
        address: 'Beyoğlu, İstanbul',
        kvkkConsent: true,
        kvkkConsentAt: new Date(),
      },
    }),
  ]);

  const case1 = await prisma.case.upsert({
    where: { fileNumber: 'B-2025-001' },
    update: {},
    create: {
      fileNumber: 'B-2025-001',
      court: 'İstanbul 3. İş Mahkemesi',
      esasNo: '2025/123',
      counterparty: 'XYZ Sanayi A.Ş.',
      subject: 'Kıdem ve ihbar tazminatı ile fazla mesai alacağı',
      status: 'OPEN',
      clientId: clients[0]!.id,
      assigneeId: lawyer.id,
    },
  });

  await prisma.case.upsert({
    where: { fileNumber: 'B-2025-002' },
    update: {},
    create: {
      fileNumber: 'B-2025-002',
      court: 'Ankara 7. Aile Mahkemesi',
      counterparty: 'Davalı eş',
      subject: 'Anlaşmalı boşanma',
      status: 'HEARING_PENDING',
      clientId: clients[1]!.id,
      assigneeId: lawyer.id,
    },
  });

  await prisma.hearing.create({
    data: {
      caseId: case1.id,
      scheduledAt: new Date(Date.now() + 14 * 24 * 3600 * 1000),
      location: 'İstanbul 3. İş Mahkemesi, Salon 4',
      notes: 'Tanık dinleme',
    },
  });

  await prisma.invoice.create({
    data: {
      number: 'F-2025-000001',
      clientId: clients[0]!.id,
      caseId: case1.id,
      dueDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
      subtotal: 5000,
      vatRate: 20,
      vatAmount: 1000,
      total: 6000,
      lines: {
        create: [
          { description: 'Vekalet ücreti - ön çalışma', quantity: 1, unitPrice: 5000, amount: 5000 },
        ],
      },
    },
  });

  console.log('Seed done.');
  console.log(`Admin: ${admin.email} / admin1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
