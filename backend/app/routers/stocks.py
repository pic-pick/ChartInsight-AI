# app/routers/stocks.py
"""
stocks.py

- 역할
  1) 국내/미국 종목 리스트 CSV를 로딩해서 검색 API 제공
  2) yfinance 를 이용해 선택 종목의 OHLCV(시가/고가/저가/종가/거래량) 데이터를 반환
  3) 프론트에서 요청하는 타임프레임(D/W/M/Y)에 맞게
     일봉/주봉/월봉/년봉 데이터를 만들어 주는 엔드포인트 제공

라우팅 구조
  - GET /api/stocks/search       : 종목 검색
  - GET /api/stocks/{symbol}/ohlcv?tf=D|W|M|Y : 캔들 데이터
"""

import logging
from pathlib import Path
from typing import List

import pandas as pd
import yfinance as yf
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from ..services.analysis_service import build_decision_insight

# =====================================================================
# 1. 라우터 기본 설정
# =====================================================================

# prefix="/stocks" → /api/stocks/... 로 쓰게 됨 (main.py에서 prefix="/api" 추가)
router = APIRouter(prefix="/stocks", tags=["stocks"])


# =====================================================================
# 2. CSV 로딩: 국내/미국 종목 메타데이터 (검색용)
# =====================================================================

# app/ 디렉토리 기준 경로 설정
BASE_DIR = Path(__file__).resolve().parent.parent  # app/
DATA_DIR = BASE_DIR / "data"

KR_PATH = DATA_DIR / "stocks_kr.csv"
US_PATH = DATA_DIR / "stocks_us.csv"

try:
    # dtype={"symbol": str} : symbol 컬럼을 무조건 문자열로 읽음
    KR = pd.read_csv(KR_PATH, dtype={"symbol": str})
    US = pd.read_csv(US_PATH, dtype={"symbol": str})

    # 두 시장 통합
    ALL = pd.concat([KR, US], ignore_index=True)
    print(
        f"[stocks] 심볼 CSV 로딩 완료: KR={len(KR)}, US={len(US)}, ALL={len(ALL)}"
    )
except Exception as e:
    # CSV 로딩 실패 시, 검색 기능이 죽지 않도록 빈 DataFrame 만들어 둠
    print("[stocks] 심볼 CSV 로딩 오류:", e)
    ALL = pd.DataFrame(columns=["symbol", "name", "market"])


# =====================================================================
# 3. 검색 응답 모델 & 엔드포인트
# =====================================================================

class StockItem(BaseModel):
    """
    종목 검색 결과에 사용되는 모델

    - symbol:  티커 (예: "005930", "AAPL")
    - name:    종목명 (예: "삼성전자", "APPLE INC")
    - market:  시장 정보 (예: "KRX", "US", "KS", "KQ" 등)
               → 프론트에서 국내/미국 여부, .KS/.KQ 붙이는 용도로 사용
    """
    symbol: str
    name: str
    market: str


class DecisionInsight(BaseModel):
    symbol: str
    last_price: float
    change_rate: float
    volatility_score: int
    confidence: int
    risk_label: str
    band: dict | None = None
    summary: str
    quick_notes: list[str]
    actions: list[str]
    indicators: dict


@router.get("/search", response_model=List[StockItem])
async def search_stocks(q: str = Query(..., min_length=1)):
    """
    종목 검색 API

    - q: 종목명/티커 부분 문자열
    - 동작:
        1) name, symbol 컬럼에서 q 가 포함된 행을 찾고
        2) 최대 20개까지만 잘라서 반환
    """
    try:
        q = q.strip()
        if not q:
            # 공백만 들어온 경우
            return []

        if ALL.empty:
            print("[stocks] ALL 데이터프레임이 비어 있음")
            return []

        # name 또는 symbol 에 q가 "포함"되는 행만 필터링
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


# =====================================================================
# 4. 캔들(Candle) 응답 모델
# =====================================================================

class Candle(BaseModel):
    """
    차트 캔들(봉) 하나를 표현하는 모델

    - time  : 'YYYY-MM-DD' 형태의 날짜 문자열
    - open  : 시가
    - high  : 고가
    - low   : 저가
    - close : 종가
    - volume: 거래량 (없을 수도 있으니 Optional)
    """
    time: str   # ISO 날짜 문자열 (YYYY-MM-DD)
    open: float
    high: float
    low: float
    close: float
    volume: float | None = None


# =====================================================================
# 5. yfinance 헬퍼 함수: interval & 데이터 조회
# =====================================================================

def _get_interval(tf: str) -> str:
    """
    프론트에서 오는 tf(D/W/M/Y)에 따라 yfinance interval 결정

    - D: 1일봉  → interval="1d"
    - W: 1주봉  → interval="1wk"
    - M: 1개월봉 → interval="1mo"
    - Y: 1년봉  → 일단 월봉(1mo)을 가져온 뒤, 서버 쪽에서 연 단위로 집계

    NOTE:
      - tf 파라미터는 쿼리스트링으로 들어오므로, "d", "w" 등 소문자일 수도 있음
      - 기본값은 "D"(일봉)
    """
    tf = (tf or "D").upper()

    if tf == "W":
        return "1wk"
    elif tf == "M":
        return "1mo"
    elif tf == "Y":
        # 년봉은 월봉 데이터를 가져와서 뒤에서 연단위로 resample
        return "1mo"
    else:
        # 기본: 일봉
        return "1d"


def _fetch_candles_yfinance(symbol: str, interval: str, tf: str) -> List[Candle]:
    """
    yfinance를 사용해 캔들 데이터 조회 후 Candle 리스트로 변환하는 함수

    설계 포인트:
      - period="max" 로 가능한 과거 전체 시계열을 한 번에 가져온다.
      - tf가 "Y" 인 경우에는 월봉 데이터를 연단위로 다시 집계한다.
      - 그 외에는 yfinance가 내려주는 데이터를 그대로 Candle 모델에 매핑한다.

    Args:
        symbol  : yfinance용 심볼 (예: "005930.KS", "AAPL")
        interval: "1d", "1wk", "1mo" 등
        tf      : "D", "W", "M", "Y"

    Returns:
        List[Candle]: 프론트 차트에서 바로 사용할 수 있는 데이터
    """
    try:
        print(
            f"[stocks] yfinance history: symbol={symbol}, period=max, interval={interval}, tf={tf}"
        )
        ticker = yf.Ticker(symbol)
        df = ticker.history(
            period="max",   # 🔥 가능한 모든 과거 데이터
            interval=interval,
        )
    except Exception as e:
        print("[stocks] yfinance history 오류:", e)
        raise HTTPException(status_code=502, detail="시세 조회에 실패했습니다.")

    if df.empty:
        print("[stocks] yfinance 결과가 비어 있음:", symbol)
        raise HTTPException(
            status_code=404,
            detail="해당 종목의 시세 데이터를 찾을 수 없습니다.",
        )

    tf = (tf or "D").upper()

    # ✅ 년봉: 월봉 데이터를 연단위로 집계
    if tf == "Y":
        # DatetimeIndex 기반 연말 기준으로 그룹핑
        #  ex) 2023년 데이터 → 2023-12-31 한 행으로 합쳐짐
        df = df.resample("Y").agg(
            {
                "Open": "first",   # 해당 연도의 첫 시가
                "High": "max",     # 해당 연도 최고가
                "Low": "min",      # 해당 연도 최저가
                "Close": "last",   # 해당 연도 마지막 종가
                "Volume": "sum",   # 연간 거래량 합계
            }
        )

    candles: List[Candle] = []
    for idx, row in df.iterrows():
        try:
            # DatetimeIndex → date() → ISO 문자열
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
            # 개별 행 변환에서 문제가 생기더라도 전체 API가 죽지 않도록 continue
            print("[stocks] yfinance 캔들 변환 오류:", e)
            continue

    if not candles:
        # 모든 행이 실패한 경우
        raise HTTPException(status_code=404, detail="캔들 데이터가 비어 있습니다.")

    return candles


# =====================================================================
# 6. 캔들 API 엔드포인트
# =====================================================================

@router.get("/{symbol}/ohlcv", response_model=List[Candle])
async def get_ohlcv(
        symbol: str,
        tf: str = Query(
            "D",
            description="차트 타임프레임: D=일봉, W=주봉, M=월봉, Y=년봉",
        ),
):
    """
    선택 종목(symbol)의 OHLCV 시계열 데이터를 반환하는 API

    - symbol:
        yfinance 기준의 심볼을 받아온다고 가정.
        예)
          - 한국:  "005930.KS", "035420.KQ"
          - 미국:  "AAPL", "TSLA"
        → 프론트에서 검색 결과 + market 으로 조합해서 전달.

    - tf:
        "D" | "W" | "M" | "Y"
        프론트에서 버튼(일/주/월/년) 선택값에 연결

    동작:
        1) tf 에 맞는 yfinance interval 계산 (_get_interval)
        2) _fetch_candles_yfinance 로 실제 데이터 조회
        3) Candle 리스트를 그대로 반환 (FastAPI가 JSON으로 변환)
    """
    interval = _get_interval(tf)
    return _fetch_candles_yfinance(symbol, interval, tf)


# =====================================================================
# 7. 의사결정 인사이트 (지표 + 예측 밴드 기반)
# =====================================================================


@router.get("/{symbol}/decision-insight", response_model=DecisionInsight)
async def get_decision_insight(
    symbol: str,
    period: str = Query("1y", description="지표 계산을 위한 yfinance 조회 기간"),
):
    """지표·예측밴드를 결합한 간단한 전략/리스크 인사이트."""

    try:
        insight = build_decision_insight(symbol, period=period)
        return insight
    except Exception as e:
        logger = logging.getLogger(__name__)
        logger.exception("decision-insight failed for %s", symbol)
        raise HTTPException(status_code=500, detail=str(e))