import Handlebars from 'handlebars';
import {
  IHTARNAME,
  DILEKCE_CEVAP,
  SOZLESME_HUKUKI_DANISMANLIK,
  KVKK_AYDINLATMA,
  KVKK_ACIK_RIZA,
  KVKK_SAKLAMA_IMHA,
} from './sources.js';

export type TemplateKey =
  | 'ihtarname'
  | 'dilekce_cevap'
  | 'sozlesme_hukuki_danismanlik'
  | 'kvkk_aydinlatma'
  | 'kvkk_acik_riza'
  | 'kvkk_saklama_imha';

const SOURCES: Record<TemplateKey, string> = {
  ihtarname: IHTARNAME,
  dilekce_cevap: DILEKCE_CEVAP,
  sozlesme_hukuki_danismanlik: SOZLESME_HUKUKI_DANISMANLIK,
  kvkk_aydinlatma: KVKK_AYDINLATMA,
  kvkk_acik_riza: KVKK_ACIK_RIZA,
  kvkk_saklama_imha: KVKK_SAKLAMA_IMHA,
};

// TR tarih helper
Handlebars.registerHelper('trDate', (d: Date | string) => {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
});

Handlebars.registerHelper('upper', (s: string) => (s ?? '').toLocaleUpperCase('tr-TR'));

const compiled = new Map<TemplateKey, Handlebars.TemplateDelegate>();

export function renderTemplate(key: TemplateKey, data: Record<string, unknown>): string {
  let tpl = compiled.get(key);
  if (!tpl) {
    tpl = Handlebars.compile(SOURCES[key]);
    compiled.set(key, tpl);
  }
  return tpl(data);
}

export function listTemplates(): Array<{ key: TemplateKey; label: string }> {
  return [
    { key: 'ihtarname', label: 'İhtarname' },
    { key: 'dilekce_cevap', label: 'Cevap Dilekçesi' },
    { key: 'sozlesme_hukuki_danismanlik', label: 'Hukuki Danışmanlık Sözleşmesi' },
    { key: 'kvkk_aydinlatma', label: 'KVKK Aydınlatma Metni' },
    { key: 'kvkk_acik_riza', label: 'KVKK Açık Rıza Metni' },
    { key: 'kvkk_saklama_imha', label: 'KVKK Saklama ve İmha Politikası' },
  ];
}
