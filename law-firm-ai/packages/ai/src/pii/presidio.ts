import { aiConfig } from '../config.js';
import type { PiiMatch, PiiKind } from './regex.js';

/**
 * Microsoft Presidio analyzer için HTTP client.
 *
 * `services/pii-service/` altındaki Python servis şunları expose eder:
 *   POST /analyze  { text, language: 'tr' }  → [{ entity_type, start, end, score, text }]
 *
 * Türk PII türleri Presidio sözcüğünde:
 *   - TR_TCKN (özel recognizer), PERSON, LOCATION, ORGANIZATION, DATE_TIME, NRP
 *   - PHONE_NUMBER, EMAIL_ADDRESS, IBAN_CODE, CREDIT_CARD, IP_ADDRESS
 */

export interface PresidioFinding {
  entity_type: string;
  start: number;
  end: number;
  score: number;
  text: string;
}

const PRESIDIO_TO_PII: Record<string, PiiKind | 'PERSON' | 'LOCATION' | 'ORGANIZATION'> = {
  TR_TCKN: 'TCKN',
  PHONE_NUMBER: 'PHONE',
  EMAIL_ADDRESS: 'EMAIL',
  IBAN_CODE: 'IBAN',
  CREDIT_CARD: 'CREDIT_CARD',
  PERSON: 'PERSON',
  LOCATION: 'LOCATION',
  ORGANIZATION: 'ORGANIZATION',
};

export interface ExtendedMatch extends Omit<PiiMatch, 'kind'> {
  kind: PiiKind | 'PERSON' | 'LOCATION' | 'ORGANIZATION';
  uncertain: boolean;
}

export async function analyzeWithPresidio(text: string): Promise<ExtendedMatch[]> {
  const res = await fetch(`${aiConfig.PII_SERVICE_URL}/analyze`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text, language: 'tr' }),
  });
  if (!res.ok) {
    throw new Error(`Presidio analyze failed: ${res.status}`);
  }
  const findings = (await res.json()) as PresidioFinding[];
  return findings
    .map<ExtendedMatch | null>((f) => {
      const mapped = PRESIDIO_TO_PII[f.entity_type];
      if (!mapped) return null;
      return {
        kind: mapped,
        start: f.start,
        end: f.end,
        value: f.text,
        confidence: f.score,
        uncertain: f.score < aiConfig.PII_PRESIDIO_THRESHOLD,
      };
    })
    .filter((v): v is ExtendedMatch => v !== null);
}
