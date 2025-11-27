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
    """Map realized volatility(HV20) to 0~100 with softer scaling.

    Typical HV20가 15~35% 사이에 분포하는 점을 감안해, 완만한 곡선으로 점수를
    부여한다. 극단적 변동성(>60%)만 90~100 구간으로 올라가도록 제한한다.
    """

    if hv20_pct is None or np.isnan(hv20_pct):
        return 0

    knots = [5, 15, 30, 45, 60, 90]
    scores = [10, 30, 55, 70, 88, 100]
    interpolated = np.interp(hv20_pct, knots, scores)
    return int(max(0, min(100, round(interpolated))))


def _score_confidence(
    trend_score: int, momentum_score: int, volatility_score: int, band_range_pct: float
) -> int:
    """Blend trend/momentum strength with band 폭과 변동성 기반의 신뢰 점수."""

    base = 60
    bonus = (trend_score - 50) * 0.35 + (momentum_score - 50) * 0.25
    volatility_penalty = max(0, volatility_score - 55) * 0.45
    band_penalty = min(18, max(0, band_range_pct * 120)) if band_range_pct else 0
    score = base + bonus - volatility_penalty - band_penalty
    return int(max(0, min(100, round(score))))


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
    ma_gap_pct = (ind.sma20 / ind.sma60 - 1) * 100 if ind.sma60 else 0
    trend_bias = "완만한 상승" if ma_gap_pct > 1 else "중립" if -1 <= ma_gap_pct <= 1 else "하락"
    risk_label = "높음" if ind.hv20_pct > 45 or ind.mdd_pct < -25 else "중간" if ind.hv20_pct > 25 else "낮음"

    band_phrase = (
        f"밴드 폭 {((band.upper - band.lower) / band.center * 100):.1f}%" if band else "밴드 정보 없음"
    )
    summary = (
        f"20일선 대비 60일선 {ma_gap_pct:+.1f}%로 추세는 {trend_bias}, "
        f"최근 모멘텀 {ind.momentum20_pct:+.1f}%와 연율화 변동성 {ind.hv20_pct:.1f}% (리스크 {risk_label}). "
        + (f"{band.horizon_label} {band.lower:,.0f}~{band.upper:,.0f} ({band_phrase})." if band else "예측 밴드 대기 중.")
    )

    quick_notes = [
        f"모멘텀 {ind.momentum20_pct:+.1f}% · HV20 {ind.hv20_pct:.1f}% → {risk_label} 변동성 구간",
        f"최대 낙폭 {ind.mdd_pct:.1f}% · ATR14 {ind.atr14:,.0f} (최근 저점 대비 회복력 확인 필요)",
        "볼린저 상·하단 근처에서는 분할 대응으로 리스크 조절",
    ]

    actions = [
        "1) 상승 추세 유지 시 눌림 구간에서 분할 매수, 60일선 훼손 시 비중 축소",
        "2) 거래량이 20일 평균 대비 크게 붙을 때 돌파/가속 여부 확인",
        "3) 밴드 하단 근처에서는 손절·헤지 조건을 미리 설정",
    ]

    return {
        "summary": summary,
        "risk_label": risk_label,
        "quick_notes": quick_notes,
        "actions": actions,
    }


def _build_alerts(ind: IndicatorSnapshot, band: Optional[BandSummary]) -> List[str]:
    alerts: List[str] = []

    if band:
        mid = band.center
        upper_gap = (band.upper / ind.close - 1) * 100 if ind.close else 0
        lower_gap = (ind.close / band.lower - 1) * 100 if band.lower else 0
        if upper_gap < 6:
            alerts.append(f"가격이 상단 밴드까지 {upper_gap:.1f}% 남았습니다. 돌파 시 추세 가속을 점검하세요.")
        if lower_gap < 6:
            alerts.append(f"하단 밴드 이탈 시 {lower_gap:.1f}% 내외 손실 구간입니다. 손절·헤지 조건을 미리 명시하세요.")
        band_span_pct = (band.upper - band.lower) / mid * 100 if mid else 0
        alerts.append(f"예측 밴드 폭 {band_span_pct:.1f}% → 변동성 대비 포지션 사이징을 보수적으로 잡으세요.")

    if ind.momentum20_pct > 5:
        alerts.append("20일 모멘텀 +5% 이상으로 단기 상승 탄력이 있습니다. 수익 실현 구간을 단계별로 설정하세요.")
    elif ind.momentum20_pct < -5:
        alerts.append("단기 모멘텀이 음(-)전환되어 저점 재확인 가능성. 반등 시 손절·축소 기준을 점검하세요.")

    if ind.hv20_pct > 45:
        alerts.append("극단적 변동성 구간입니다. 손익비 1:2 이상 확보 후 진입을 권고합니다.")

    return alerts[:5]


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

        band = _band_from_forecast(symbol)
        band_range_pct = (
            (band.upper - band.lower) / band.center if band and band.center else 0.0
        )
        confidence = _score_confidence(
            trend_score, momentum_score, volatility_score, band_range_pct
        )

        volatility_label = "낮음" if volatility_score < 35 else "중간" if volatility_score < 70 else "높음"
        confidence_label = "높음" if confidence >= 70 else "보통" if confidence >= 45 else "낮음"
        confidence_reason = (
            f"추세 점수 {trend_score}, 모멘텀 점수 {momentum_score}, 변동성 점수 {volatility_score}. "
            f"예측 밴드 폭 {band_range_pct*100:.1f}%을 반영해 신뢰도를 계산했습니다."
        )

        narrative = _build_narrative(ind, band)
        alerts = _build_alerts(ind, band)

        return {
            "symbol": symbol,
            "last_price": ind.close,
            "change_rate": ind.change_rate,
            "volatility_score": volatility_score,
            "volatility_label": volatility_label,
            "confidence": confidence,
            "confidence_label": confidence_label,
            "confidence_reason": confidence_reason,
            "risk_label": narrative["risk_label"],
            "band": band.__dict__ if band else None,
            "summary": narrative["summary"],
            "quick_notes": narrative["quick_notes"],
            "actions": narrative["actions"],
            "alerts": alerts,
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

