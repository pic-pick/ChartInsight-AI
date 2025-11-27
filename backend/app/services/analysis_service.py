# app/services/analysis_service.py
"""Indicator-based strategy/risk analysis service.

This module fetches recent OHLCV data via yfinance and derives a compact set of
technical metrics (trend, momentum, volatility, drawdown) plus lightweight
rule-based commentary so the frontend AI 대시보드 can surface meaningful,
data-driven guidance instead of static dummy text.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import yfinance as yf

from .forecast_service import get_forecast_band

logger = logging.getLogger(__name__)


@dataclass
class BandSummary:
    horizon_label: str
    upper: float
    lower: float
    center: float


@dataclass
class IndicatorSnapshot:
    close: float
    change_rate: float
    sma20: float
    sma60: float
    momentum20_pct: float
    hv20_pct: float
    atr14: float
    mdd_pct: float
    boll_upper: float
    boll_lower: float


def _compute_true_range(df: pd.DataFrame) -> pd.Series:
    prev_close = df["Close"].shift(1)
    high_low = df["High"] - df["Low"]
    high_close = (df["High"] - prev_close).abs()
    low_close = (df["Low"] - prev_close).abs()
    return pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)


def _calculate_indicators(df: pd.DataFrame) -> IndicatorSnapshot:
    close = df["Close"].dropna()
    if close.empty:
        raise ValueError("Close series is empty")

    last_close = float(close.iloc[-1])
    prev_close = float(close.iloc[-2]) if len(close) > 1 else last_close
    change_rate = (last_close / prev_close - 1) * 100 if prev_close else 0.0

    sma20 = float(close.rolling(window=20).mean().iloc[-1])
    sma60 = float(close.rolling(window=60).mean().iloc[-1])

    momentum20_pct = float((last_close / close.iloc[-21] - 1) * 100) if len(close) > 21 else 0.0

    returns = close.pct_change().dropna()
    hv20_pct = float(returns.tail(20).std() * np.sqrt(252) * 100) if len(returns) >= 20 else 0.0

    tr = _compute_true_range(df)
    atr14 = float(tr.rolling(window=14).mean().iloc[-1]) if len(tr) >= 14 else 0.0

    rolling_max = close.cummax()
    drawdowns = close / rolling_max - 1
    mdd_pct = float(drawdowns.min() * 100)

    window20 = close.rolling(window=20)
    std20 = window20.std().iloc[-1]
    ma20 = window20.mean().iloc[-1]
    boll_upper = float(ma20 + 2 * std20)
    boll_lower = float(ma20 - 2 * std20)

    return IndicatorSnapshot(
        close=last_close,
        change_rate=change_rate,
        sma20=sma20,
        sma60=sma60,
        momentum20_pct=momentum20_pct,
        hv20_pct=hv20_pct,
        atr14=atr14,
        mdd_pct=mdd_pct,
        boll_upper=boll_upper,
        boll_lower=boll_lower,
    )


def _score_volatility(hv20_pct: float) -> int:
    # Scale 0~100: 0% vol -> 5, 40% vol -> ~100
    score = min(100, max(0, int(hv20_pct * 2.5)))
    return score


def _score_confidence(trend_score: int, momentum_score: int, volatility_score: int) -> int:
    base = 55
    bonus = (trend_score - 50) * 0.25 + (momentum_score - 50) * 0.2
    penalty = max(0, volatility_score - 60) * 0.3
    return int(max(0, min(100, base + bonus - penalty)))


def _band_from_forecast(symbol: str, horizon_days: int = 63) -> Optional[BandSummary]:
    try:
        band_points = get_forecast_band(symbol, horizon=horizon_days)
        if not band_points:
            return None

        upper = max(p["upper"] for p in band_points)
        lower = min(p["lower"] for p in band_points)
        center = band_points[-1]["mean"]
        return BandSummary(horizon_label="3개월 ARIMA", upper=upper, lower=lower, center=center)
    except Exception:
        logger.exception("Failed to fetch forecast band for analysis: %s", symbol)
        return None


def _build_narrative(ind: IndicatorSnapshot, band: Optional[BandSummary]) -> Dict[str, str]:
    trend_bias = "상승" if ind.sma20 > ind.sma60 else "중립" if abs(ind.sma20 - ind.sma60) / ind.sma60 < 0.01 else "하락"
    risk_label = "높음" if ind.hv20_pct > 45 or ind.mdd_pct < -25 else "중간" if ind.hv20_pct > 25 else "낮음"

    summary_parts = [
        f"20일선 vs 60일선: {ind.sma20:,.0f} / {ind.sma60:,.0f} → 추세 {trend_bias}",
        f"20일 모멘텀 {ind.momentum20_pct:+.1f}% · 변동성(HV20) {ind.hv20_pct:.1f}%",  # noqa: E501
        f"최대 낙폭 {ind.mdd_pct:.1f}% · ATR14 {ind.atr14:,.0f}",
    ]

    if band:
        summary_parts.append(
            f"예측 밴드({band.horizon_label}) {band.lower:,.0f} ~ {band.upper:,.0f}"
        )

    quick_notes = [
        f"변동성 {risk_label} / HV20 {ind.hv20_pct:.1f}%",
        f"모멘텀 {ind.momentum20_pct:+.1f}% · MDD {ind.mdd_pct:.1f}%",
        "볼린저 상단·하단 터치 여부를 모니터링하세요.",
    ]

    actions = [
        "분할 접근으로 리스크 분산 (1/3씩 매수·매도)",
        "거래량이 20일 평균 대비 20% 이상 확대되면 추세 확인",
        "밴드 하단 및 60일선 이탈 시 손절/비중 축소 고려",
    ]

    summary = " · ".join(summary_parts)
    return {
        "summary": summary,
        "risk_label": risk_label,
        "quick_notes": quick_notes,
        "actions": actions,
    }


def build_decision_insight(symbol: str, period: str = "1y") -> Dict:
    """Create a compact AI 분석 payload with indicators + forecast band."""

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        if hist.empty:
            raise ValueError(f"No historical data for symbol={symbol}")

        ind = _calculate_indicators(hist)

        trend_score = 70 if ind.sma20 > ind.sma60 else 45
        momentum_score = min(100, max(0, 50 + ind.momentum20_pct))
        volatility_score = _score_volatility(ind.hv20_pct)
        confidence = _score_confidence(trend_score, momentum_score, volatility_score)

        band = _band_from_forecast(symbol)
        narrative = _build_narrative(ind, band)

        return {
            "symbol": symbol,
            "last_price": ind.close,
            "change_rate": ind.change_rate,
            "volatility_score": volatility_score,
            "confidence": confidence,
            "risk_label": narrative["risk_label"],
            "band": band.__dict__ if band else None,
            "summary": narrative["summary"],
            "quick_notes": narrative["quick_notes"],
            "actions": narrative["actions"],
            "indicators": {
                "sma20": ind.sma20,
                "sma60": ind.sma60,
                "momentum20_pct": ind.momentum20_pct,
                "hv20_pct": ind.hv20_pct,
                "atr14": ind.atr14,
                "mdd_pct": ind.mdd_pct,
                "boll_upper": ind.boll_upper,
                "boll_lower": ind.boll_lower,
            },
        }
    except Exception:
        logger.exception("Failed to build decision insight for %s", symbol)
        raise

