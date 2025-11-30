"""OpenAI 기반 LLM 브리핑 생성 유틸리티.

환경 변수
---------
- OPENAI_API_KEY    : 필수. 없으면 LLM 호출을 건너뛴다.
- OPENAI_MODEL      : 선택. 기본값 'gpt-4o-mini'.
- OPENAI_BASE_URL   : 선택. 기본값 'https://api.openai.com/v1'.
- OPENAI_TEMPERATURE: 선택. 기본값 0.35.

기능
-----
지표 스냅샷과 예측 밴드 요약을 받아 Chat Completions API로 한국어 투자
브리핑(JSON)을 생성한다. 호출 실패 시 None을 반환해 룰 기반 브리핑으로
폴백하도록 설계했다.
"""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Dict, Optional

import requests

logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.35"))


def _프롬프트_작성(indicators: Dict, band: Optional[Dict]) -> str:
    band_text = "없음" if not band else (
        f"{band.get('horizon_label','밴드')} | 상단 {band.get('upper'):.1f} · 하단 {band.get('lower'):.1f} · 중심 {band.get('center'):.1f}"
    )
    return f"""
당신은 한국어를 사용하는 퀀트 리서치 애널리스트입니다.
입력으로 제공된 주식 지표와 예측 밴드를 바탕으로, 투자자가 바로 이해할 수 있는
간결한 JSON 형식의 브리핑을 생성하세요.

요구사항:
- summary: 추세/모멘텀/변동성/거래량/밴드 정보를 한 문장으로 연결
- quick_notes: 3~4개의 핵심 메모 (지표 해석, 밴드·리스크 요약)
- actions: 3개의 행동 가이드(매수/매도/관망, 손익비/비중/트리거 포함)
- alerts: 3~5개의 모니터링 포인트(가격·거래량·밴드·심리·변동성 기반)
- tone: 한국어, 전문적이되 간결하게, 숫자는 단위 없이 표현

지표 데이터(JSON):
{json.dumps(indicators, ensure_ascii=False)}

예측 밴드 요약:
{band_text}

JSON 스키마 예시:
{{
  "summary": "...",
  "quick_notes": ["...", "..."],
  "actions": ["...", "...", "..."],
  "alerts": ["...", "...", "..."]
}}
"""


def llm_브리핑_생성(indicators: Dict, band: Optional[Dict]) -> Optional[Dict]:
    if not OPENAI_API_KEY:
        logger.info("OPENAI_API_KEY 미설정: LLM 브리핑을 건너뜁니다.")
        return None

    prompt = _프롬프트_작성(indicators, band)
    url = f"{OPENAI_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }
    body = {
        "model": OPENAI_MODEL,
        "temperature": OPENAI_TEMPERATURE,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": "당신은 한국어로 투자 브리핑을 작성하는 금융 애널리스트입니다."},
            {"role": "user", "content": prompt},
        ],
    }

    start = time.perf_counter()
    try:
        resp = requests.post(url, headers=headers, json=body, timeout=25)
        resp.raise_for_status()
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        latency_ms = (time.perf_counter() - start) * 1000
        return {
            "summary": parsed.get("summary"),
            "quick_notes": parsed.get("quick_notes"),
            "actions": parsed.get("actions"),
            "alerts": parsed.get("alerts"),
            "model": data.get("model", OPENAI_MODEL),
            "latency_ms": latency_ms,
        }
    except Exception:
        logger.exception("OpenAI 브리핑 생성 실패")
        return None
