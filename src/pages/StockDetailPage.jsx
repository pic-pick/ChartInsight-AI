import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
    fetchStockSummary,
    fetchStockCandles,
    fetchStockDecisionInsight,
} from "../api/stockApi";
import StockSummaryCard from "../components/cards/StockSummaryCard";
import PriceChart from "../components/charts/PriceChart";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorMessage from "../components/common/ErrorMessage";

const StockDetailPage = () => {
    const { symbol } = useParams();
    const [summary, setSummary] = useState(null);
    const [candles, setCandles] = useState([]);
    const [decision, setDecision] = useState(null);
    const [period, setPeriod] = useState("6mo");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            setError("");
            const [summaryData, candleData, decisionData] = await Promise.all([
                fetchStockSummary(symbol),
                fetchStockCandles(symbol, period),
                fetchStockDecisionInsight(symbol),
            ]);
            setSummary(summaryData);
            setCandles(candleData);
            setDecision(decisionData);
        } catch (err) {
            console.error(err);
            setError("상세 데이터를 불러오는 중 오류가 발생했습니다.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [symbol, period]);

    return (
        <div>
            <h1 className="text-xl font-semibold text-slate-50">
                {symbol} 상세 분석
            </h1>
            <p className="mt-1 mb-4 text-sm text-slate-400">
                리스크, 추세, 가격대, 전략 관점에서 종목을 분석합니다.
            </p>

            <div className="mb-4 flex gap-2 text-xs">
                {["3mo", "6mo", "1y"].map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`rounded-full border px-3 py-1 ${
                            period === p
                                ? "border-sky-500 bg-sky-500/20 text-sky-200"
                                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                        }`}
                    >
                        {p.toUpperCase()}
                    </button>
                ))}
            </div>

            {loading && <LoadingSpinner />}
            {error && <ErrorMessage message={error} />}

            {!loading && !error && (
                <>
                    <StockSummaryCard summary={summary} />
                    <div className="mb-4">
                        <PriceChart candles={candles} />
                    </div>

                    {decision && (
                        <div className="grid gap-3 md:grid-cols-2">
                            {/* 아래는 백엔드 decision-insight 구조에 맞춰 조정하면 됨 */}
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
                                    Price Zone
                                </div>
                                <div className="text-slate-200">
                                    {decision.priceZone?.comment || "가격대 분석 정보 없음"}
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
                </>
            )}
        </div>
    );
};

export default StockDetailPage;