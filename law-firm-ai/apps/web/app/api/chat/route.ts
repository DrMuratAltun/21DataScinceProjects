import { streamText, convertToCoreMessages } from 'ai';
import { classify, modelForRoute, retrieve, pii } from '@law-firm-ai/ai';
import { auth } from '@/lib/auth';
import { withAudit } from '@/lib/audit-context';
import { prisma } from '@law-firm-ai/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatBody {
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  scope?: { clientId?: string; caseId?: string };
  maskPii?: boolean;
  searchPrecedents?: boolean;
}

const SYSTEM_PROMPT = `Sen bir Türk hukuk bürosunda çalışan kıdemli bir yapay zekâ asistanısın.
- Görevin: dilekçe/sözleşme/ihtarname taslakları hazırlamak, dava ve belgeler üzerinde soru-cevap, mevzuat ve emsal karar araştırması yapmak, KVKK uyumlu çıktılar üretmek.
- Kaynağını bilmiyorsan uydurma; "bilgim yok" veya "belgede bulamadım" de.
- Kararları ve alıntıları mümkünse kaynak referansı (belge adı / Yargıtay Daire + esas no) ile ver.
- Yanıtların hukuki tavsiye niteliğinde değildir uyarısını tartışmalı konularda ekle.`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response('unauthorized', { status: 401 });

  const body = (await req.json()) as ChatBody;
  const lastUser = body.messages.filter((m) => m.role === 'user').at(-1);
  if (!lastUser) return new Response('no user message', { status: 400 });

  // 1) Router: intent sınıflandırma
  const route = await classify(lastUser.content);

  // 2) RAG retrieval (intent == rag | draft | search)
  let citations: Awaited<ReturnType<typeof retrieve>> = [];
  if (route.intent === 'rag' || route.intent === 'draft' || route.intent === 'search') {
    citations = await retrieve({
      query: lastUser.content,
      clientIds: body.scope?.clientId ? [body.scope.clientId] : undefined,
      caseIds: body.scope?.caseId ? [body.scope.caseId] : undefined,
      includePrecedents: body.searchPrecedents ?? route.intent === 'search',
      topK: 8,
    });
  }

  const contextBlock = citations.length
    ? citations
        .map((c, i) => `[${i + 1}] (${c.source}, skor ${c.score.toFixed(3)}): ${c.content.slice(0, 1200)}`)
        .join('\n---\n')
    : '';

  const model = modelForRoute(route);

  await withAudit(
    () =>
      prisma.auditLog.create({
        data: {
          userId: (session.user as { id: string }).id,
          action: 'AI_QUERY',
          entity: 'ChatMessage',
          diff: { intent: route.intent, scope: body.scope, tokens: lastUser.content.length },
        },
      }),
    { reason: 'AI query' },
  );

  const result = await streamText({
    model,
    system: SYSTEM_PROMPT + (contextBlock ? `\n\nKAYNAKLAR:\n${contextBlock}` : ''),
    messages: convertToCoreMessages(body.messages as never),
    temperature: 0.2,
    onFinish: async ({ text }) => {
      if (body.maskPii) {
        // Not: stream tamamlandıktan sonra post-process ile log'a mask alternatif kaydedilebilir.
        await pii.maskPii(text, { allowFallback: true, skipAgent: true }).catch(() => null);
      }
    },
  });

  const response = result.toDataStreamResponse();
  response.headers.set('x-citations', JSON.stringify(citations));
  return response;
}
