import { generateObject } from 'ai';
import { z } from 'zod';
import { helperModel } from '../ollama.js';

/**
 * gemma4:9b tabanlı "belirsizlik" PII agent'ı.
 *
 * Presidio skoru threshold altında kalan parçalar için LLM'e "bu parça gerçekten
 * kişisel veri mi?" sorusu yöneltilir. Düşük gecikme için kısa istemle çalışır.
 */

const AgentSchema = z.object({
  isPii: z.boolean(),
  kind: z.enum(['PERSON', 'LOCATION', 'ORGANIZATION', 'OTHER', 'NONE']),
  reason: z.string().max(120),
});

export type PiiAgentVerdict = z.infer<typeof AgentSchema>;

const SYSTEM = `Sen bir Türkçe kişisel veri (PII) sınıflandırıcısın.
Verilen metin parçasının bir kişiyi, kurumu veya konumu işaret eden kişisel veri olup olmadığına karar ver.
Jenerik terimler (ör. "avukat", "Türkiye", "mahkeme") PII değildir; özel isimler ve spesifik adresler PII'dir.
Cevabını zorunlu şemada JSON olarak ver.`;

export async function classifyUncertain(span: string, context: string): Promise<PiiAgentVerdict> {
  const { object } = await generateObject({
    model: helperModel(),
    schema: AgentSchema,
    system: SYSTEM,
    prompt: `Bağlam:\n"${context.slice(0, 400)}"\n\nSpan: "${span}"\n\nBu span PII mi?`,
    temperature: 0,
  });
  return object;
}
