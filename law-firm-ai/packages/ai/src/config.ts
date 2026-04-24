import { z } from 'zod';

const schema = z.object({
  OLLAMA_API_BASE: z.string().url().default('http://localhost:11434/v1'),
  OLLAMA_URL: z.string().url().default('http://localhost:11434'),
  LLM_MAIN_MODEL: z.string().default('qwen3.6:32b-instruct-q4_K_M'),
  LLM_MAIN_FALLBACK: z.string().default('qwen3.6:14b'),
  LLM_HELPER_MODEL: z.string().default('gemma4:9b'),
  EMBEDDING_MODEL: z.string().default('multilingual-e5-large'),
  EMBEDDING_DIM: z.coerce.number().int().positive().default(1024),
  RERANK_MODEL: z.string().default('ms-marco-MiniLM-L-6-v2'),
  LLM_NUM_CTX: z.coerce.number().int().positive().default(32768),
  PII_SERVICE_URL: z.string().url().default('http://localhost:5001'),
  PII_PRESIDIO_THRESHOLD: z.coerce.number().min(0).max(1).default(0.6),
});

export type AIConfig = z.infer<typeof schema>;

export function loadAIConfig(env: NodeJS.ProcessEnv = process.env): AIConfig {
  return schema.parse(env);
}

export const aiConfig = loadAIConfig();
