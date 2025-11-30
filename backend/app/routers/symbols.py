import csv
import json
import os
from pathlib import Path
import urllib.error
import urllib.request
from typing import Iterable

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/symbols", tags=["Symbols"])

EXCHANGES: Iterable[tuple[str, str]] = (
    ("US", "US"),
    ("KOSPI", "KS"),
    ("KOSDAQ", "KQ"),
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CSV_SOURCES: Iterable[tuple[str, str]] = (
    ("stocks_kr.csv", "KOSPI/KOSDAQ"),
    ("stocks_us.csv", "US"),
)


def _fallback_csv_symbols() -> list[dict]:
    """Return cached CSV symbols when Finnhub is unavailable."""

    symbols: list[dict] = []
    for filename, label in CSV_SOURCES:
        path = DATA_DIR / filename
        if not path.exists():
            continue

        with path.open(newline="", encoding="utf-8-sig") as fp:
            reader = csv.DictReader(fp)
            for row in reader:
                symbol = (row.get("symbol") or "").strip()
                name = (row.get("name") or "").strip()
                if not symbol or not name:
                    continue

                symbols.append({
                    "symbol": symbol,
                    "description": name,
                    "exchange": label,
                })

    if not symbols:
        raise HTTPException(
            status_code=500,
            detail="심볼 CSV를 찾을 수 없습니다 (data/stocks_*.csv 확인)",
        )

    return symbols

def _fetch_json(url: str) -> list[dict]:
    request = urllib.request.Request(url, headers={"User-Agent": "chartinsight-ai/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:  # type: ignore[arg-type]
            if resp.status != 200:
                raise HTTPException(500, "Finnhub 호출 실패")
            content = resp.read().decode("utf-8")
            try:
                payload = json.loads(content)
            except json.JSONDecodeError as exc:  # pragma: no cover - 외부 의존
                raise HTTPException(status_code=502, detail="Finnhub 응답 파싱 실패") from exc

            if not isinstance(payload, list):  # pragma: no cover - 외부 의존
                raise HTTPException(status_code=502, detail="Finnhub 응답 형식이 올바르지 않습니다")

            return payload
    except urllib.error.HTTPError as exc:  # pragma: no cover - 외부 의존
        detail = f"Finnhub 호출 실패 ({exc.code})"
        raise HTTPException(status_code=500, detail=detail) from exc
    except urllib.error.URLError as exc:  # pragma: no cover - 외부 의존
        raise HTTPException(status_code=500, detail="Finnhub 네트워크 오류") from exc


@router.get("/")
def get_all_symbols():
    """국내 + 미국 모든 티커 리스트 반환"""
    finnhub_key = os.getenv("FINNHUB_API_KEY")

    if not finnhub_key:
        # 키가 없는 로컬 개발 환경에서는 CSV 캐시로 대응
        return _fallback_csv_symbols()

    all_symbols = []

    for label, code in EXCHANGES:
        url = f"https://finnhub.io/api/v1/stock/symbol?exchange={code}&token={finnhub_key}"
        data = _fetch_json(url)

        # 필요한 필드만 리턴하도록 축소
        for item in data:
            if item.get("type") == "Common Stock":
                all_symbols.append({
                    "symbol": item["symbol"],
                    "description": item["description"],
                    "exchange": label,
                })

    return all_symbols
