import json
import os
import urllib.error
import urllib.request

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/symbols", tags=["Symbols"])

FINNHUB_KEY = os.getenv("FINNHUB_API_KEY")

EXCHANGES = [
    ("US", "US"),
    ("KOSPI", "KS"),
    ("KOSDAQ", "KQ"),
]

def _fetch_json(url: str) -> list[dict]:
    request = urllib.request.Request(url, headers={"User-Agent": "chartinsight-ai/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=30) as resp:  # type: ignore[arg-type]
            if resp.status != 200:
                raise HTTPException(500, "Finnhub 호출 실패")
            content = resp.read().decode("utf-8")
            return json.loads(content)
    except urllib.error.HTTPError as exc:  # pragma: no cover - 외부 의존
        detail = f"Finnhub 호출 실패 ({exc.code})"
        raise HTTPException(status_code=500, detail=detail) from exc
    except urllib.error.URLError as exc:  # pragma: no cover - 외부 의존
        raise HTTPException(status_code=500, detail="Finnhub 네트워크 오류") from exc


@router.get("/")
def get_all_symbols():
    """국내 + 미국 모든 티커 리스트 반환"""
    if not FINNHUB_KEY:
        raise HTTPException(500, "FINNHUB_API_KEY 환경 변수가 필요합니다")

    all_symbols = []

    for label, code in EXCHANGES:
        url = f"https://finnhub.io/api/v1/stock/symbol?exchange={code}&token={FINNHUB_KEY}"
        data = _fetch_json(url)

        # 필요한 필드만 리턴하도록 축소
        for item in data:
            if item.get("type") == "Common Stock":
                all_symbols.append({
                    "symbol": item["symbol"],
                    "description": item["description"],
                    "exchange": label
                })

    return all_symbols