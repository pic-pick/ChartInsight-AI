# app/services/forecast_service.py
import logging
from typing import List, Dict, Tuple

import yfinance as yf
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from datetime import timedelta

logger = logging.getLogger(__name__)


def get_forecast_band(
    symbol: str,
    horizon: int = 20,
    conf: float = 0.9,
    period: str = "2y",
    arima_order: Tuple[int, int, int] = (1, 1, 1),
) -> List[Dict[str, float]]:
    """Generate a simple ARIMA-based forecast band for the given symbol.

    Parameters
    ----------
    symbol : str
        예: 'AAPL', '005930.KS' 같은 종목 심볼
    horizon : int, optional
        몇 영업일 앞으로 예측할지 (기본값 20)
    conf : float, optional
        0~1 사이 신뢰 수준 (예: 0.9 = 90% 구간)
    period : str, optional
        yfinance 에서 허용하는 과거 조회 기간 (예: "1y", "2y")
    arima_order : tuple, optional
        ARIMA 모형의 (p, d, q) 차수

    Returns
    -------
    List[Dict]
        [{"time": "YYYY-MM-DD", "mean": float, "lower": float, "upper": float}, ...]
    """

    if horizon <= 0:
        raise ValueError("horizon must be a positive integer")

    if not (0 < conf < 1):
        raise ValueError("conf must be between 0 and 1")

    try:
        ticker = yf.Ticker(symbol)
        # 과거 데이터 조회
        hist = ticker.history(period=period)

        if hist.empty:
            raise ValueError(f"No historical data found for symbol={symbol!r}")

        close = hist["Close"].dropna()

        # 데이터가 너무 적으면 ARIMA 적합이 불안정하므로 예외 처리
        if len(close) < sum(arima_order) + 5:
            raise ValueError(
                "Not enough data to fit ARIMA model for symbol={} (got {} points)".format(
                    symbol, len(close)
                )
            )

        # ARIMA 간단 예시 (모형 차수는 파라미터로 받되 기본값 고정)
        model = ARIMA(close, order=arima_order)
        res = model.fit()

        forecast_res = res.get_forecast(steps=horizon)
        mean = forecast_res.predicted_mean
        conf_int = forecast_res.conf_int(alpha=1 - conf)

        # conf_int 는 DataFrame이며 [lower, upper] 두 컬럼을 가진다고 가정
        lower = conf_int.iloc[:, 0]
        upper = conf_int.iloc[:, 1]

        last_date = close.index[-1]
        future_index = pd.date_range(
            last_date + timedelta(days=1),
            periods=horizon,
            freq="B",  # 영업일 기준
        )

        out: List[Dict[str, float]] = []
        for t, m, lo, up in zip(future_index, mean, lower, upper):
            out.append(
                {
                    "time": t.strftime("%Y-%m-%d"),
                    "mean": float(m),
                    "lower": float(lo),
                    "upper": float(up),
                }
            )

        return out

    except Exception:
        # 로그만 찍고, FastAPI 레이어에서 HTTPException 으로 감싸도록 다시 raise
        logger.exception("Failed to generate forecast band for %s", symbol)
        raise