# app/services/analysis_service.py
"""Indicator-based strategy/risk analysis service.

This module fetches recent OHLCV data via yfinance and derives a compact set of
technical metrics (trend, momentum, volatility, drawdown) plus lightweight
rule-based commentary so the frontend AI 대시보드 can surface meaningful,
data-driven guidance instead of static dummy text.
"""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import yfinance as yf

from .forecast_service import get_forecast_band
from .llm_service import llm_브리핑_생성

logger = logging.getLogger(__name__)


@dataclass
class 밴드요약:
    horizon_label: str
    upper: float
    lower: float
    center: float


@dataclass
class 지표스냅샷:
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
    macd_line: float
    macd_signal: float
    macd_hist: float
    rsi14: float
    volume_last: float
    volume_avg20: float
    volume_ratio_pct: float
    psy10_pct: float
    vkospi_level: Optional[float] = None
    vkospi_change_pct: Optional[float] = None


def _진폭_계산(df: pd.DataFrame) -> pd.Series:
    prev_close = df["Close"].shift(1)
    high_low = df["High"] - df["Low"]
    high_close = (df["High"] - prev_close).abs()
    low_close = (df["Low"] - prev_close).abs()
    return pd.concat([high_low, high_close, low_close], axis=1).max(axis=1)


def _기술지표_계산(df: pd.DataFrame) -> 지표스냅샷:
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

    tr = _진폭_계산(df)
    atr14 = float(tr.rolling(window=14).mean().iloc[-1]) if len(tr) >= 14 else 0.0

    rolling_max = close.cummax()
    drawdowns = close / rolling_max - 1
    mdd_pct = float(drawdowns.min() * 100)

    window20 = close.rolling(window=20)
    std20 = window20.std().iloc[-1]
    ma20 = window20.mean().iloc[-1]
    boll_upper = float(ma20 + 2 * std20)
    boll_lower = float(ma20 - 2 * std20)

    # MACD (12,26,9)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = float(ema12.iloc[-1] - ema26.iloc[-1])
    macd_signal_series = (ema12 - ema26).ewm(span=9, adjust=False).mean()
    macd_signal = float(macd_signal_series.iloc[-1])
    macd_hist = float(macd_line - macd_signal)

    # RSI(14)
    delta = close.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    rs = avg_gain / avg_loss
    rsi14 = float(100 - (100 / (1 + rs.iloc[-1]))) if len(rs.dropna()) else 50.0

    volume_series = df["Volume"].fillna(0)
    volume_last = float(volume_series.iloc[-1]) if not volume_series.empty else 0.0
    volume_avg20 = float(volume_series.rolling(window=20).mean().iloc[-1]) if len(volume_series) >= 20 else 0.0
    volume_ratio_pct = (
        float((volume_last / volume_avg20 - 1) * 100) if volume_avg20 else 0.0
    )

    # 투자심리도: 최근 10일 상승일 비율
    up_ratio = close.diff().gt(0).tail(10).mean() * 100 if len(close) >= 10 else 50.0

    vkospi_level, vkospi_change_pct = _vkospi_조회()

    return 지표스냅샷(
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
        macd_line=macd_line,
        macd_signal=macd_signal,
        macd_hist=macd_hist,
        rsi14=rsi14,
        volume_last=volume_last,
        volume_avg20=volume_avg20,
        volume_ratio_pct=volume_ratio_pct,
        psy10_pct=float(up_ratio),
        vkospi_level=vkospi_level,
        vkospi_change_pct=vkospi_change_pct,
    )


def _vkospi_조회() -> tuple[Optional[float], Optional[float]]:
    """Pull the latest VKOSPI level and daily change as a market sentiment proxy."""

    try:
        vkospi = yf.Ticker("^VKOSPI")
        hist = vkospi.history(period="5d")
        if hist.empty:
            return None, None

        last_close = hist["Close"].iloc[-1]
        prev_close = hist["Close"].iloc[-2] if len(hist) > 1 else last_close
        change_pct = (last_close / prev_close - 1) * 100 if prev_close else 0.0
        return float(last_close), float(change_pct)
    except Exception:
        logger.exception("Failed to fetch VKOSPI")
        return None, None


def _변동성점수_계산(hv20_pct: float) -> int:
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


def _신뢰도점수_계산(
    trend_score: int,
    momentum_score: int,
    volatility_score: int,
    band_range_pct: float,
    liquidity_bonus: float = 0.0,
) -> int:
    """Blend trend/momentum strength with band 폭과 변동성 기반의 신뢰 점수."""

    base = 62
    bonus = (trend_score - 50) * 0.32 + (momentum_score - 50) * 0.25 + liquidity_bonus
    volatility_penalty = max(0, volatility_score - 60) * 0.35
    band_penalty = min(15, max(0, band_range_pct * 100)) if band_range_pct else 0
    score = base + bonus - volatility_penalty - band_penalty
    return int(max(0, min(100, round(score))))


def _유동성보너스_계산(avg_volume: float) -> float:
    """Estimate a small bonus for 안정적인 대형주/거래대금 기반 유동성."""

    if avg_volume is None or np.isnan(avg_volume) or avg_volume <= 0:
        return 0.0

    # 로그 스케일 보정: 1M 이하 0, 10M 이상 약 +6~8점 부여
    scaled = max(0.0, np.log10(avg_volume) - 6) * 2.2
    return min(8.0, scaled)


def _예측밴드_요약(symbol: str, horizon_days: int = 63) -> Optional[밴드요약]:
    try:
        band_points = get_forecast_band(symbol, horizon=horizon_days)
        if not band_points:
            return None

        upper = max(p["upper"] for p in band_points)
        lower = min(p["lower"] for p in band_points)
        center = band_points[-1]["mean"]
        return 밴드요약(horizon_label="3개월 ARIMA", upper=upper, lower=lower, center=center)
    except Exception:
        logger.exception("Failed to fetch forecast band for analysis: %s", symbol)
        return None


def _내러티브_작성(ind: 지표스냅샷, band: Optional[밴드요약]) -> Dict[str, str]:
    """Generate richer Korean NLP-style commentary from multi-factor signals."""

    ma_gap_pct = (ind.sma20 / ind.sma60 - 1) * 100 if ind.sma60 else 0
    trend_bias = "우상향" if ma_gap_pct > 1 else "중립" if -1 <= ma_gap_pct <= 1 else "하락 반전"
    macd_state = "상승 전환" if ind.macd_hist > 0 and ind.macd_line > ind.macd_signal else "하락 전환"
    rsi_state = "과매수" if ind.rsi14 >= 70 else "중립" if ind.rsi14 > 35 else "과매도"
    vol_state = "거래량 급증" if ind.volume_ratio_pct > 40 else "유입" if ind.volume_ratio_pct > 10 else "평균" if ind.volume_ratio_pct > -15 else "유출"
    risk_label = "높음" if ind.hv20_pct > 45 or ind.mdd_pct < -25 else "중간" if ind.hv20_pct > 25 else "낮음"

    band_span_pct = ((band.upper - band.lower) / band.center * 100) if band and band.center else None
    band_phrase = (
        f"{band.horizon_label} 밴드 폭 {band_span_pct:.1f}% ({band.lower:,.0f}~{band.upper:,.0f})"
        if band and band_span_pct is not None
        else "예측 밴드 정보 없음"
    )

    trend_sentence = f"20일선 대비 60일선 {ma_gap_pct:+.1f}% → 추세 {trend_bias}"
    momentum_sentence = f"최근 20일 모멘텀 {ind.momentum20_pct:+.1f}%·MACD {macd_state}·RSI {ind.rsi14:.0f}({rsi_state})"
    volatility_sentence = f"연율화 변동성 {ind.hv20_pct:.1f}% (리스크 {risk_label}) · 최대낙폭 {ind.mdd_pct:.1f}%"
    volume_sentence = f"거래량 {vol_state}({ind.volume_ratio_pct:+.0f}% vs 20일 평균), 투자심리도 {ind.psy10_pct:.0f}%"

    summary_parts = [trend_sentence, momentum_sentence, volatility_sentence, volume_sentence, band_phrase]
    summary = " | ".join(summary_parts)

    quick_notes = [
        f"볼린저 상단 {ind.boll_upper:,.0f} / 하단 {ind.boll_lower:,.0f} 인근 반응을 확인하세요.",
        f"HV20 {ind.hv20_pct:.1f}%·ATR14 {ind.atr14:,.0f} 수준에서 손익비를 재점검",
        f"거래량 흐름: {vol_state}, 심리 {ind.psy10_pct:.0f}% → {'관심 매수' if ind.psy10_pct > 60 else '관망'}",
        f"RSI {ind.rsi14:.0f}·MACD {macd_state} 조합으로 모멘텀 체크",
    ]

    상승_actions = [
        "1) 추세 우상향 시 눌림 구간을 분할매수하고 상단 밴드 접근 시 익절 구간을 나눕니다.",
        "2) 거래량 급증 구간에서 돌파/가속 여부를 확인해 추가 비중 조절을 검토합니다.",
        "3) 밴드 하단 근접 시 손절·헤지 조건을 사전에 명시하세요.",
    ]
    하락_actions = [
        "1) 주요 이동평균 이탈 시 반등 구간에서 비중 축소를 우선 고려합니다.",
        "2) RSI 과매도 해소 전까지 추격 매수를 자제하고 단계적 진입을 설계하세요.",
        "3) 밴드 하단·최근 저점 부근에서는 손절선을 짧게 설정합니다.",
    ]
    actions = 상승_actions if trend_bias == "우상향" else 하락_actions

    return {
        "summary": summary,
        "risk_label": risk_label,
        "quick_notes": quick_notes,
        "actions": actions,
    }


def _알림_리스트(ind: 지표스냅샷, band: Optional[밴드요약]) -> List[str]:
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

    if ind.macd_hist > 0 and ind.macd_line > ind.macd_signal:
        alerts.append("MACD 상향 전환으로 추세 우위. 단기 과열 여부를 RSI와 함께 확인하세요.")
    elif ind.macd_hist < 0 and ind.macd_line < ind.macd_signal:
        alerts.append("MACD 하향 전환으로 조정 가능성. 반등 신호(시그널 상향)를 기다리세요.")

    if ind.rsi14 >= 70:
        alerts.append("RSI 70 이상으로 과매수 구간입니다. 분할 매도/헤지 전략을 고려하세요.")
    elif ind.rsi14 <= 30:
        alerts.append("RSI 30 이하로 과매도 신호. 반등 시 분할 매수 타이밍을 탐색하세요.")

    if ind.volume_ratio_pct > 40:
        alerts.append("거래량이 20일 평균 대비 크게 증가했습니다. 추세 가속 또는 뉴스 트리거를 확인하세요.")

    if ind.vkospi_level and ind.vkospi_change_pct and ind.vkospi_change_pct > 5:
        alerts.append(f"VKOSPI {ind.vkospi_level:.1f} (▲{ind.vkospi_change_pct:.1f}%) 변동성 경보 — 포지션 축소·헤지를 검토하세요.")

    return alerts[:5]


def 결정인사이트_생성(symbol: str, period: str = "1y") -> Dict:
    """Create a compact AI 분석 payload with indicators + forecast band."""

    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        if hist.empty:
            raise ValueError(f"No historical data for symbol={symbol}")

        ind = _기술지표_계산(hist)

        trend_score = 70 if ind.sma20 > ind.sma60 else 45
        momentum_score = min(100, max(0, 50 + ind.momentum20_pct))
        volatility_score = _변동성점수_계산(ind.hv20_pct)
        liquidity_bonus = _유동성보너스_계산(ind.volume_avg20)

        band = _예측밴드_요약(symbol)
        band_range_pct = (
            (band.upper - band.lower) / band.center if band and band.center else 0.0
        )
        confidence = _신뢰도점수_계산(
            trend_score, momentum_score, volatility_score, band_range_pct, liquidity_bonus
        )

        volatility_label = "낮음" if volatility_score < 35 else "중간" if volatility_score < 70 else "높음"
        confidence_label = "높음" if confidence >= 70 else "보통" if confidence >= 45 else "낮음"
        confidence_reason = " | ".join(
            [
                f"추세 {trend_score} · 모멘텀 {momentum_score}",
                f"변동성 {volatility_score} · 밴드 폭 {band_range_pct*100:.1f}%",
                f"유동성 보너스 +{liquidity_bonus:.1f} (20일 평균 거래량)",
                f"MACD {'상향' if ind.macd_hist > 0 else '하향'} · RSI {ind.rsi14:.0f}",
            ]
        )

        fear_greed = "탐욕" if ind.psy10_pct >= 70 and ind.hv20_pct < 40 else "공포" if ind.psy10_pct <= 35 else "중립"
        sentiment_note = (
            f"투자심리도 {ind.psy10_pct:.0f}% → {fear_greed} 구간. "
            + (f"VKOSPI {ind.vkospi_level:.1f} (변동성 {ind.vkospi_change_pct:+.1f}%)" if ind.vkospi_level else "VKOSPI 데이터 없음")
        )

        rule_narrative = _내러티브_작성(ind, band)
        rule_alerts = _알림_리스트(ind, band)

        llm_payload = {
            **asdict(ind),
            "trend_score": trend_score,
            "momentum_score": momentum_score,
            "volatility_score": volatility_score,
            "volatility_label": volatility_label,
            "band_range_pct": band_range_pct,
            "confidence": confidence,
            "confidence_label": confidence_label,
            "fear_greed": fear_greed,
        }

        llm_brief = llm_브리핑_생성(
            llm_payload,
            band.__dict__ if band else None,
            rule_narrative,
            rule_alerts,
        )

        narrative_source = "rule"
        narrative = rule_narrative
        alerts = rule_alerts
        llm_model = None
        llm_latency = None

        if llm_brief:
            narrative_source = "openai"
            narrative = {
                "summary": llm_brief.get("summary") or rule_narrative["summary"],
                "risk_label": rule_narrative["risk_label"],
                "quick_notes": llm_brief.get("quick_notes") or rule_narrative["quick_notes"],
                "actions": llm_brief.get("actions") or rule_narrative["actions"],
            }
            alerts = llm_brief.get("alerts") or rule_alerts
            llm_model = llm_brief.get("model")
            llm_latency = llm_brief.get("latency_ms")

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
            "narrative_source": narrative_source,
            "llm_model": llm_model,
            "llm_latency_ms": llm_latency,
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
                "macd_line": ind.macd_line,
                "macd_signal": ind.macd_signal,
                "macd_hist": ind.macd_hist,
                "rsi14": ind.rsi14,
                "volume_last": ind.volume_last,
                "volume_avg20": ind.volume_avg20,
                "volume_ratio_pct": ind.volume_ratio_pct,
                "psy10_pct": ind.psy10_pct,
                "vkospi_level": ind.vkospi_level,
                "vkospi_change_pct": ind.vkospi_change_pct,
            },
            "oscillators": {
                "macd": {
                    "line": ind.macd_line,
                    "signal": ind.macd_signal,
                    "hist": ind.macd_hist,
                    "state": "상향" if ind.macd_hist > 0 else "하향",
                },
                "rsi14": {
                    "value": ind.rsi14,
                    "zone": "과매수" if ind.rsi14 >= 70 else "중립" if ind.rsi14 > 35 else "과매도",
                },
                "volume_ratio_pct": ind.volume_ratio_pct,
            },
            "sentiment": {
                "investor_psychology_pct": ind.psy10_pct,
                "fear_greed": fear_greed,
                "note": sentiment_note,
                "vkospi": {"level": ind.vkospi_level, "change_pct": ind.vkospi_change_pct},
            },
        }
    except Exception:
        logger.exception("Failed to build decision insight for %s", symbol)
        raise

