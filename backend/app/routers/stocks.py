# app/routers/stocks.py
from datetime import datetime, timedelta
from pathlib import Path
from typing import List

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/stocks", tags=["stocks"])

# === CSV 로딩 (국장 + 미장 심볼, 검색용) ===
BASE_DIR = Path(__file__).resolve().parent.parent  # app/
DATA_DIR = BASE_DIR / "data"

KR_PATH = DATA_DIR / "stocks_kr.csv"
US_PATH = DATA_DIR / "stocks_us.csv"

try:
    KR = pd.read_csv(KR_PATH, dtype={"symbol": str})
    US = pd.read_csv(US_PATH, dtype={"symbol": str})
    ALL = pd.concat([KR, US], ignore_index=True)
    print(
        f"[stocks] 심볼 CSV 로딩 완료: KR={len(KR)}, US={len(US)}, ALL={len(ALL)}"
    )
except Exception as e:
    print("[stocks] 심볼 CSV 로딩 오류:", e)
    ALL = pd.DataFrame(columns=["symbol", "name", "market"])


# =======================
#   검색 응답 모델
# =======================
class StockItem(BaseModel):
    symbol: str  # 예: 005930, AAPL
    name: str    # 예: 삼성전자, APPLE INC
    market: str  # 예: KRX, US, KS, KQ ...


@router.get("/search", response_model=List[StockItem])
async def search_stocks(q: str = Query(..., min_length=1)):
    """
    종목명(name) / 티커(symbol) 부분 일치 검색
    """
    try:
        q = q.strip()
        if not q:
            return []

        if ALL.empty:
            print("[stocks] ALL 데이터프레임이 비어 있음")
            return []

        df = ALL[
            ALL["name"].astype(str).str.contains(q, case=False, na=False)
            | ALL["symbol"].astype(str).str.contains(q, case=False, na=False)
            ].head(20)

        items: List[StockItem] = []
        for _, row in df.iterrows():
            sym = str(row.get("symbol", "")).strip()
            nm = str(row.get("name", "")).strip()
            mk = str(row.get("market", "")).strip() or "UNKNOWN"

            items.append(StockItem(symbol=sym, name=nm, market=mk))

        return items

    except Exception as e:
        print("[stocks] search_stocks 오류:", e)
        raise HTTPException(status_code=500, detail="검색 중 오류가 발생했습니다.")


# =======================
#   캔들 응답 모델
# =======================
class Candle(BaseModel):
    time: str   # ISO 날짜 문자열 (YYYY-MM-DD)
    open: float
    high: float
    low: float
    close: float
    volume: float | None = None


# =======================
#   yfinance 헬퍼 함수
# =======================
def _get_period_range(period: str) -> tuple[datetime, datetime]:
    now = datetime.utcnow()

    if period == "1mo":
        start = now - timedelta(days=30)
    elif period == "3mo":
        start = now - timedelta(days=90)
    elif period == "1y":
        start = now - timedelta(days=365)
    else:  # 기본값 6개월
        start = now - timedelta(days=180)

    return start, now


def _fetch_candles_yfinance(symbol: str, start: datetime, end: datetime, interval: str, tf: str) -> List[Candle]:
    """
    yfinance에서 캔들 가져오기 + tf에 따라 필요한 경우(년봉) 집계
    """
    try:
        print(f"[stocks] yfinance history: {symbol}, {start.date()}~{end.date()}, interval={interval}, tf={tf}")
        ticker = yf.Ticker(symbol)
        df = ticker.history(
            start=start.date(),
            end=end.date(),
            interval=interval,
        )
    except Exception as e:
        print("[stocks] yfinance history 오류:", e)
        raise HTTPException(status_code=502, detail="시세 조회에 실패했습니다.")

    if df.empty:
        print("[stocks] yfinance 결과가 비어 있음:", symbol)
        raise HTTPException(status_code=404, detail="해당 종목의 시세 데이터를 찾을 수 없습니다.")

    tf = tf.upper()

    # ✅ 년봉: 월봉 데이터를 연단위로 집계
    if tf == "Y":
        # index가 DatetimeIndex라고 가정
        df = df.resample("Y").agg(
            {
                "Open": "first",
                "High": "max",
                "Low": "min",
                "Close": "last",
                "Volume": "sum",
            }
        )

    candles: List[Candle] = []
    for idx, row in df.iterrows():
        try:
            dt = idx.date().isoformat()
            candles.append(
                Candle(
                    time=dt,
                    open=float(row["Open"]),
                    high=float(row["High"]),
                    low=float(row["Low"]),
                    close=float(row["Close"]),
                    volume=float(row.get("Volume") or 0.0),
                )
            )
        except Exception as e:
            print("[stocks] yfinance 캔들 변환 오류:", e)
            continue

    if not candles:
        raise HTTPException(status_code=404, detail="캔들 데이터가 비어 있습니다.")

    return candles
# 타임프레임별 기간 + interval
def _get_range_and_interval(tf: str) -> tuple[datetime, datetime, str]:
    """
    프론트에서 오는 tf(D/W/M/Y)에 따라 기간 + yfinance interval 결정
    """
    now = datetime.utcnow()
    tf = (tf or "D").upper()

    if tf == "W":      # 주봉: 3년치
        start = now - timedelta(days=365 * 3)
        interval = "1wk"
    elif tf == "M":    # 월봉: 10년치
        start = now - timedelta(days=365 * 10)
        interval = "1mo"
    elif tf == "Y":    # 년봉: 30년치 (월봉 받아서 연단위로 묶을거라 1mo 사용)
        start = now - timedelta(days=365 * 30)
        interval = "1mo"
    else:              # 기본: 일봉 6개월
        start = now - timedelta(days=180)
        interval = "1d"

    return start, now, interval
# =======================
#   캔들 API 엔드포인트
# =======================
@router.get("/{symbol}/ohlcv", response_model=List[Candle])
async def get_ohlcv(
        symbol: str,
        tf: str = Query("D", description="D=일봉, W=주봉, M=월봉, Y=년봉"),
):
    """
    타임프레임별 캔들 데이터
    프론트에서 들어오는 symbol은 이미 .KS / .KQ / US 심볼 등으로 변환되어 있다고 가정
    """
    tf = (tf or "D").upper()
    start, end, interval = _get_range_and_interval(tf)
    return _fetch_candles_yfinance(symbol, start, end, interval, tf)