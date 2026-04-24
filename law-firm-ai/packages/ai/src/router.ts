import { generateObject } from 'ai';
import { z } from 'zod';
import { helperModel, mainModel } from './ollama.js';

/**
 * İstek sınıflandırma — `gemma4:9b` gelen mesajı inceler ve hangi kapasitenin
 * çağrılacağına karar verir:
 *  - simple:  kısa cevap, doğrudan helper modelden
 *  - rag:     belge/davada RAG ile büyük modele
 *  - draft:   dilekçe/sözleşme üretimi, büyük model + template
 *  - search:  mevzuat/emsal karar arama
 *  - pii:     PII maskeleme agent'ı
 */
export const RouteSchema = z.object({
  intent: z.enum(['simple', 'rag', 'draft', 'search', 'pii']),
  needsCaseContext: z.boolean(),
  reasoning: z.string().max(200),
});

export type Route = z.infer<typeof RouteSchema>;

const ROUTER_SYSTEM = `Sen bir hukuk bürosu AI asistanının yönlendiricisisin.
Gelen kullanıcı mesajını aşağıdaki niyetlerden birine sınıflandır:
- simple: Selam/kısa bilgi/format sorusu. Kısa cevap yeter.
- rag: Müvekkil belgeleri, dava dosyası üzerinden soru.
- draft: Dilekçe, sözleşme, ihtarname, KVKK aydınlatma metni üretimi.
- search: Mevzuat, Yargıtay/Danıştay kararı, emsal arama.
- pii: Metinde kişisel veri maskeleme.
"needsCaseContext" alanı: cevap için belirli bir dava/müvekkil bağlamı şart mı?`;

export async function classify(userMessage: string): Promise<Route> {
  const { object } = await generateObject({
    model: helperModel(),
    schema: RouteSchema,
    system: ROUTER_SYSTEM,
    prompt: userMessage,
    temperature: 0,
  });
  return object;
}

/** intent'e göre kullanılacak ana modeli seç. */
export function modelForRoute(route: Route) {
  switch (route.intent) {
    case 'simple':
      return helperModel();
    case 'pii':
      return helperModel();
    case 'rag':
    case 'draft':
    case 'search':
    default:
      return mainModel();
  }
}
