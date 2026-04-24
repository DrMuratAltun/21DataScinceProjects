import { createOpenAI } from '@ai-sdk/openai';
import { aiConfig } from './config.js';

/**
 * Ollama, OpenAI uyumlu `/v1` endpoint'i expose eder.
 * `@ai-sdk/openai` provider'ı baseURL override ederek doğrudan kullanabilir.
 *
 * `num_ctx`, `num_gpu`, `keep_alive` gibi Ollama-özel parametreler Modelfile veya
 * `OLLAMA_*` env'leri üzerinden yönetilir; burada yalnızca model seçimi yapılır.
 */
export const ollama = createOpenAI({
  baseURL: aiConfig.OLLAMA_API_BASE,
  apiKey: 'ollama', // OpenAI SDK zorunlu tutuyor; Ollama yok sayar
  compatibility: 'compatible',
});

export const mainModel = () => ollama(aiConfig.LLM_MAIN_MODEL);
export const mainFallback = () => ollama(aiConfig.LLM_MAIN_FALLBACK);
export const helperModel = () => ollama(aiConfig.LLM_HELPER_MODEL);

/**
 * Embedding — Ollama native /api/embed endpoint'i kullanılır (OpenAI uyumluluğu
 * embedding için vendor bazında stabil değil).
 */
export async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch(`${aiConfig.OLLAMA_URL}/api/embed`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: aiConfig.EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) {
    throw new Error(`Ollama embed failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { embeddings: number[][] };
  return data.embeddings;
}

export async function embedOne(text: string): Promise<number[]> {
  const [vec] = await embed([text]);
  if (!vec) throw new Error('Embedding returned empty');
  return vec;
}

export async function listModels(): Promise<string[]> {
  const res = await fetch(`${aiConfig.OLLAMA_URL}/api/tags`);
  const data = (await res.json()) as { models: Array<{ name: string }> };
  return data.models.map((m) => m.name);
}
