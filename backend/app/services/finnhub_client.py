# app/services/finnhub_client.py
import os
from typing import Any, Dict, Optional

import requests

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
BASE_URL = "https://finnhub.io/api/v1"


class FinnhubError(Exception):
    pass


def _ensure_api_key():
    if not FINNHUB_API_KEY:
        raise FinnhubError(
            "FINNHUB_API_KEY 환경변수가 설정되어 있지 않습니다. "
            "`export FINNHUB_API_KEY=...` 로 환경변수를 설정해주세요."
        )


def _get(path: str, params: Optional[Dict[str, Any]] = None) -> Any:
    _ensure_api_key()
    params = params or {}
    params["token"] = FINNHUB_API_KEY

    url = f"{BASE_URL}{path}"
    resp = requests.get(url, params=params, timeout=10)
    try:
        resp.raise_for_status()
    except requests.HTTPError as e:
        raise FinnhubError(
            f"Finnhub 요청 실패: {url} - {e} - 응답: {resp.text}"
        ) from e

    return resp.json()


def get_candles(symbol: str, resolution: str, from_ts: int, to_ts: int) -> Dict[str, Any]:
    """
    Finnhub 캔들 API
    resolution: '1', '5', '15', '30', '60', 'D', 'W', 'M'
    """
    return _get(
        "/stock/candle",
        {"symbol": symbol, "resolution": resolution, "from": from_ts, "to": to_ts},
    )