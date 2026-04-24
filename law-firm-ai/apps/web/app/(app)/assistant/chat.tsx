'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import type { FormEvent } from 'react';

interface Scope {
  caseId?: string;
  clientId?: string;
}

interface Citation {
  chunkId: string;
  documentId?: string;
  precedentId?: string;
  content: string;
  score: number;
  source: 'document' | 'precedent';
}

export function AssistantChat({
  cases,
  clients,
  initialScope,
}: {
  cases: Array<{ id: string; fileNumber: string; subject: string }>;
  clients: Array<{ id: string; fullName: string }>;
  initialScope?: Scope;
}) {
  const [scope, setScope] = useState<Scope>(initialScope ?? {});
  const [maskPii, setMaskPii] = useState(false);
  const [searchPrecedents, setSearchPrecedents] = useState(true);
  const [lastCitations, setLastCitations] = useState<Citation[]>([]);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: { scope, maskPii, searchPrecedents },
    onResponse: async (response) => {
      const cit = response.headers.get('x-citations');
      if (cit) setLastCitations(JSON.parse(cit));
    },
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col rounded-lg border">
        <div className="flex flex-wrap items-center gap-2 border-b bg-slate-50 p-3 text-sm">
          <select
            value={scope.caseId ?? ''}
            onChange={(e) => setScope({ ...scope, caseId: e.target.value || undefined })}
            className="rounded border px-2 py-1"
          >
            <option value="">— Kapsam: dava (opsiyonel) —</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fileNumber} — {c.subject.slice(0, 40)}
              </option>
            ))}
          </select>
          <select
            value={scope.clientId ?? ''}
            onChange={(e) => setScope({ ...scope, clientId: e.target.value || undefined })}
            className="rounded border px-2 py-1"
          >
            <option value="">— Kapsam: müvekkil (opsiyonel) —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={maskPii}
              onChange={(e) => setMaskPii(e.target.checked)}
            />
            PII maskele
          </label>
          <label className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={searchPrecedents}
              onChange={(e) => setSearchPrecedents(e.target.checked)}
            />
            Emsal karar dahil et
          </label>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">
              Örn: "Bu davada karşı tarafın temel iddiası nedir?" / "İhtarname taslağı çıkar" /
              "Müvekkil bilgilerini maskeleyerek özet ver" / "Emsal karar ara: işçi alacağı fazla
              mesai".
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`whitespace-pre-wrap rounded-md px-4 py-3 text-sm ${
                m.role === 'user' ? 'bg-blue-50' : 'bg-slate-50'
              }`}
            >
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                {m.role === 'user' ? 'Siz' : 'Asistan'}
              </div>
              {m.content}
            </div>
          ))}
        </div>

        <OnSubmit
          handleSubmit={handleSubmit}
          input={input}
          onInput={handleInputChange}
          isLoading={isLoading}
        />
      </div>

      <aside className="rounded-lg border p-4 text-sm">
        <h3 className="mb-2 font-medium">Kaynaklar</h3>
        {lastCitations.length === 0 && (
          <p className="text-slate-500">Bu cevapta henüz kaynak gösterilmedi.</p>
        )}
        <ul className="space-y-3">
          {lastCitations.map((c, i) => (
            <li key={i} className="rounded border p-2 text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium">
                  {c.source === 'document' ? 'Belge' : 'Emsal karar'}
                </span>
                <span className="text-slate-500">skor: {c.score.toFixed(3)}</span>
              </div>
              <p className="line-clamp-3 text-slate-700">{c.content.slice(0, 240)}…</p>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function OnSubmit({
  handleSubmit,
  input,
  onInput,
  isLoading,
}: {
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  input: string;
  onInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isLoading: boolean;
}) {
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 border-t p-3">
      <input
        value={input}
        onChange={onInput}
        placeholder="Sorunuzu yazın…"
        className="flex-1 rounded-md border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={isLoading || !input.trim()}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        Gönder
      </button>
    </form>
  );
}
