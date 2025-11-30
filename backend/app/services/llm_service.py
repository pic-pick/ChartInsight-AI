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
from pathlib import Path
from typing import Dict, Optional

import requests

logger = logging.getLogger(__name__)


def _load_env_file() -> None:
    """Load environment variables from a local .env file if present.

    Checks both the repository root (`../../..`) and backend folder so the
    LLM 분석 서비스 picks up keys defined in the documented root `.env`.
    Values already present in ``os.environ`` are left untouched.
    """

    base_path = Path(__file__).resolve()
    candidates = [
        base_path.parents[3] / ".env",  # project root
        base_path.parents[2] / ".env",  # backend/.env (fallback)
    ]

    for env_path in candidates:
        if not env_path.exists():
            continue

        for line in env_path.read_text(encoding="utf-8").splitlines():
            if not line or line.lstrip().startswith("#"):
                continue

            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip()
            if key and value and key not in os.environ:
                os.environ[key] = value


_load_env_file()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.35"))


def _프롬프트_작성(
    indicators: Dict,
    band: Optional[Dict],
    rule_narrative: Optional[Dict],
    rule_alerts: Optional[list[str]],
) -> str:
    band_text = "없음" if not band else (
        f"{band.get('horizon_label','밴드')} | 상단 {band.get('upper'):.1f} · 하단 {band.get('lower'):.1f} · 중심 {band.get('center'):.1f}"
    )

    rule_summary = (rule_narrative or {}).get("summary") or ""
    rule_notes = (rule_narrative or {}).get("quick_notes") or []
    rule_actions = (rule_narrative or {}).get("actions") or []
    rule_alert_texts = rule_alerts or []

    return f"""
당신은 한국어를 사용하는 퀀트 리서치 애널리스트입니다.
입력으로 제공된 주식 지표와 예측 밴드를 바탕으로, 화면에 바로 노출될 자연스러운
JSON 브리핑을 작성하세요. 기존 규칙 기반 문장들을 더 읽기 쉽게 다듬되, 지표 수치와
리스크 맥락을 그대로 반영해야 합니다.

요구사항:
- summary: 추세/모멘텀/변동성/거래량/밴드를 한 문장으로 연결 (UI 상단 브리핑에 표시)
- quick_notes: 핵심 인사이트 3~4개. 짧은 문장, 불릿으로 바로 노출
- actions: 매매 액션 가이드 3개. 번호 목록 형태로 바로 표시됨
- alerts: 모니터링 포인트 3~5개. 경고 문장 형태
- tone: 한국어, 전문적이되 간결하게, 숫자는 단위 없이 표현
- 반환 형식: 아래 JSON 스키마를 준수하고, 문자열 외 불필요한 설명은 넣지 않음

지표 데이터(JSON):
{json.dumps(indicators, ensure_ascii=False)}

예측 밴드 요약:
{band_text}

기존 규칙 기반 요약(참고용, 더 자연스럽게 재작성):
summary: {rule_summary}
quick_notes: {rule_notes}
actions: {rule_actions}
alerts: {rule_alert_texts}

JSON 스키마 예시:
{{
  "summary": "리스크·밴드 브리핑 한 문장",
  "quick_notes": ["핵심 인사이트 1", "2", "3"],
  "actions": ["액션 가이드 1", "2", "3"],
  "alerts": ["알림 1", "알림 2", "알림 3"]
}}
"""


def llm_브리핑_생성(
    indicators: Dict,
    band: Optional[Dict],
    rule_narrative: Optional[Dict] = None,
    rule_alerts: Optional[list[str]] = None,
) -> Optional[Dict]:
    if not OPENAI_API_KEY:
        logger.info("OPENAI_API_KEY 미설정: LLM 브리핑을 건너뜁니다.")
        return None

    prompt = _프롬프트_작성(indicators, band, rule_narrative, rule_alerts)
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
