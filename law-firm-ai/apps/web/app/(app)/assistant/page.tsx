import { prisma } from '@law-firm-ai/db';
import { AssistantChat } from './chat';

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ caseId?: string; clientId?: string }>;
}) {
  const sp = await searchParams;
  const [cases, clients] = await Promise.all([
    prisma.case.findMany({
      select: { id: true, fileNumber: true, subject: true },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    }),
    prisma.client.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: 'asc' },
      take: 500,
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">AI Asistan</h1>
      <AssistantChat
        cases={cases}
        clients={clients}
        initialScope={{ caseId: sp.caseId, clientId: sp.clientId }}
      />
    </div>
  );
}
