// src/pages/StockDetailPage.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import {
    fetchStockSummary,
    fetchStockCandles,
    fetchStockDecisionInsight,
    fetchForecastBand,          // ✅ 예측 밴드 API
} from "../api/stockApi";

import StockSummaryCard from "../components/cards/StockSummaryCard";
import PriceChart from "../components/charts/PriceChart";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

const StockDetailPage = () => {
    const { symbol } = useParams();

    const [summary, setSummary] = useState(null);
    const [candles, setCandles] = useState([]);          // ✅ 차트용 캔들 데이터
    const [decision, setDecision] = useState(null);      // AI 전략/리스크 분석 결과
    const [forecastBand, setForecastBand] = useState([]); // ✅ 예측 밴드 데이터

    const [period, setPeriod] = useState("6mo");         // 차트 기간 (3mo / 6mo / 1y 등)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!symbol) return;

        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);

                // 1) 기본 데이터들 병렬 호출
                const [summaryRes, candlesRes, decisionRes] = await Promise.all([
                    fetchStockSummary(symbol),
                    fetchStockCandles(symbol, period),
                    fetchStockDecisionInsight(symbol),
                ]);

                setSummary(summaryRes);
                setCandles(candlesRes || []);
                setDecision(decisionRes || null);

                // 2) 예측 밴드 (실패해도 치명적이지 않게 try/catch 분리)
                try {
                    const forecastRes = await fetchForecastBand(symbol);
                    // 예상 포맷: [{ time: "2025-07-14", lower, upper, mean }, ...]
                    setForecastBand(forecastRes || []);
                } catch (e) {
                    console.error("forecast band load error:", e);
                    setForecastBand([]); // 밴드 없으면 그냥 안 그리도록
                }
            } catch (e) {
                console.error(e);
                setError(e.message || "종목 데이터를 불러오는 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [symbol, period]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <ErrorMessage message={error} />
            </div>
        );
    }

    if (!summary || !candles.length) {
        return (
            <div className="p-4">
                <ErrorMessage message="종목 데이터를 불러올 수 없습니다." />
            </div>
        );
    }

    return (
        <div className="p-4">
            <h1 className="text-xl font-semibold text-slate-50">
                {symbol} 상세 분석
            </h1>
            <p className="mt-1 mb-4 text-sm text-slate-400">
                리스크, 추세, 전략 관점에서 종목을 분석합니다.
            </p>

            {/* 기간 선택 버튼 */}
            <div className="mb-4 flex gap-2 text-xs">
                {["3mo", "6mo", "1y"].map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`rounded-full border px-3 py-1 ${
                            period === p
                                ? "border-sky-500 bg-sky-500/10 text-sky-300"
                                : "border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-500"
                        }`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            {/* 상단: 요약 카드 */}
            <div className="mb-4">
                <StockSummaryCard symbol={symbol} summary={summary} />
            </div>

            {/* 차트 + 예측 밴드 */}
            <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                <div className="mb-2 text-xs font-semibold text-slate-400">
                    차트 & 예측 밴드
                </div>
                <PriceChart
                    candles={candles}          // ✅ 방법 A: 이름 맞춰서 전달
                    chartType="candlestick"
                    isKorean={true}
                    forecastBand={forecastBand} // ✅ 예측 밴드 전달
                />
            </div>

            {/* AI Decision / Risk / Strategy 섹션 (기존 코드 유지) */}
            {decision && (
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm">
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-400">
                            Risk View
                        </div>
                        <div className="text-slate-200">
                            {decision.risk?.comment || "리스크 분석 정보 없음"}
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm">
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-400">
                            Trend View
                        </div>
                        <div className="text-slate-200">
                            {decision.trend?.comment || "추세 분석 정보 없음"}
                        </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm">
                        <div className="mb-1 text-xs font-semibold uppercase text-slate-400">
                            Strategy View
                        </div>
                        <div className="text-slate-200">
                            {decision.strategy?.comment || "전략 분석 정보 없음"}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockDetailPage;