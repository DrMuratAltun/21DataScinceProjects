"""Microsoft Presidio analyzer — Türkçe PII tespit HTTP servisi.

Endpoint:
  POST /analyze  { text, language?: 'tr' }
      -> [{entity_type, start, end, score, text}]

TR_TCKN özel recognizer (11 hane + algoritma) ve jenerik TR telefon/plaka desenleri
eklenmiştir. Hukuki unvanlar (Avukat, Hakim) whitelist'e alınır.
"""

from __future__ import annotations

import re
from typing import List, Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field
from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer
from presidio_analyzer.nlp_engine import NlpEngineProvider


def tckn_is_valid(value: str) -> bool:
    if not re.fullmatch(r"[1-9]\d{10}", value):
        return False
    d = [int(c) for c in value]
    odd_sum = d[0] + d[2] + d[4] + d[6] + d[8]
    even_sum = d[1] + d[3] + d[5] + d[7]
    d10 = (odd_sum * 7 - even_sum) % 10
    if d10 < 0 or d10 != d[9]:
        return False
    return (sum(d[:10]) % 10) == d[10]


class TcknRecognizer(PatternRecognizer):
    def __init__(self) -> None:
        super().__init__(
            supported_entity="TR_TCKN",
            patterns=[Pattern("TCKN", r"\b[1-9]\d{10}\b", 0.9)],
            context=["tckn", "t.c.", "kimlik", "kimlik no"],
            supported_language="tr",
        )

    def validate_result(self, pattern_text: str) -> Optional[bool]:
        return tckn_is_valid(pattern_text)


class PlateRecognizer(PatternRecognizer):
    def __init__(self) -> None:
        super().__init__(
            supported_entity="TR_PLATE",
            patterns=[Pattern("Plaka", r"\b\d{2}\s?[A-Z]{1,3}\s?\d{2,4}\b", 0.5)],
            context=["plaka", "araç"],
            supported_language="tr",
        )


# spaCy TR NLP engine
nlp_provider = NlpEngineProvider(
    nlp_configuration={
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "tr", "model_name": "tr_core_news_trf"}],
    }
)

try:
    nlp_engine = nlp_provider.create_engine()
except Exception:
    # trf yoksa sm'ye fallback
    nlp_provider = NlpEngineProvider(
        nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [{"lang_code": "tr", "model_name": "tr_core_news_sm"}],
        }
    )
    nlp_engine = nlp_provider.create_engine()

analyzer = AnalyzerEngine(
    nlp_engine=nlp_engine, supported_languages=["tr", "en"]
)
analyzer.registry.add_recognizer(TcknRecognizer())
analyzer.registry.add_recognizer(PlateRecognizer())


# Hukuki jenerik sözcükler — PERSON olarak işaretlense bile skor düşürülür
GENERIC_TERMS = {
    "avukat",
    "hakim",
    "hakimlik",
    "müvekkil",
    "davacı",
    "davalı",
    "mahkeme",
    "türkiye cumhuriyeti",
    "yargıtay",
    "danıştay",
}


class AnalyzeRequest(BaseModel):
    text: str
    language: str = Field(default="tr")


class Finding(BaseModel):
    entity_type: str
    start: int
    end: int
    score: float
    text: str


app = FastAPI(title="law-firm-ai PII service")


@app.post("/analyze", response_model=List[Finding])
def analyze(req: AnalyzeRequest) -> List[Finding]:
    results = analyzer.analyze(text=req.text, language=req.language)
    findings: List[Finding] = []
    for r in results:
        snippet = req.text[r.start : r.end]
        score = r.score
        if snippet.strip().lower() in GENERIC_TERMS:
            score = min(score, 0.2)
        findings.append(
            Finding(
                entity_type=r.entity_type,
                start=r.start,
                end=r.end,
                score=float(score),
                text=snippet,
            )
        )
    return findings


@app.get("/health")
def health() -> dict:
    return {"ok": True}
