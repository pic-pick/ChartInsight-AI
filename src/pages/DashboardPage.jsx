// src/pages/DashboardPage.jsx
import React, { useState, useMemo, useEffect } from "react";
import PriceChart from "../components/charts/PriceChart";
import PortfolioTable from "../components/portfolio/PortfolioTable";
import AiAnalysisPanel from "../components/analysis/AiAnalysisPanel";
import SearchBar from "../components/SearchBar";
import { fetchStockCandles, fetchForecastBand } from "../api/stockApi";

// 테스트용 포트폴리오 데이터 (그대로 사용)
const MOCK_PORTFOLIO = [
    {
        symbol: "TSLL",
        displayName: "TSLL",
        currentPrice: 24364,
        avgPrice: 24364,
        shares: 2,
        totalInvested: 56061,
        changeRate: 1.22,
        volatilityScore: 72,
        riskLevel: "보통",
    },
    {
        symbol: "005380",
        displayName: "현대차",
        currentPrice: 273000,
        avgPrice: 273000,
        shares: 4,
        totalInvested: 1092000,
        changeRate: -1.97,
        volatilityScore: 65,
        riskLevel: "보통",
    },
    {
        symbol: "005930",
        displayName: "삼성전자",
        currentPrice: 97500,
        avgPrice: 97500,
        shares: 2,
        totalInvested: 195000,
        changeRate: -5.15,
        volatilityScore: 63,
        riskLevel: "위험도 보통",
    },
    {
        symbol: "000000",
        displayName: "지니어스 그룹",
        currentPrice: 1268,
        avgPrice: 1268,
        shares: 4,
        totalInvested: 5072,
        changeRate: 2.84,
        volatilityScore: 35,
        riskLevel: "낮음",
    },
];

const DashboardPage = () => {
    // 기본 선택 종목
    const [symbol, setSymbol] = useState("005930");
    const [symbolName, setSymbolName] = useState("삼성전자");
    const [market, setMarket] = useState("KRX");

    const [candles, setCandles] = useState([]);
    const [forecastBand, setForecastBand] = useState([]); // 예측 밴드
    const [viewMode, setViewMode] = useState("chart"); // "chart" | "ai"

    // 기간: 일 / 주 / 월 / 년
    const [timeframe, setTimeframe] = useState("D"); // "D" | "W" | "M" | "Y"
    const [chartType, setChartType] = useState("candlestick"); // "candlestick" | "line"

    const [isLoadingCandles, setIsLoadingCandles] = useState(false);
    const [candlesError, setCandlesError] = useState(null);

    // 마지막 캔들 기준 현재가
    const lastPrice = useMemo(
        () => (candles.length ? candles[candles.length - 1].close : null),
        [candles]
    );

    const isKoreanMarket = useMemo(
        () =>
            ["KRX", "KS", "KQ", "KOSPI", "KOSDAQ"].includes(
                (market || "").toUpperCase()
            ),
        [market]
    );

    const formattedLastPrice = useMemo(() => {
        if (lastPrice == null) return "-";

        if (isKoreanMarket) {
            return `${Number(lastPrice).toLocaleString("ko-KR")}원`;
        }
        return `$${Number(lastPrice).toFixed(2)}`;
    }, [lastPrice, isKoreanMarket]);

    // 외부 서비스(yfinance 등)용 심볼 포맷 변환
    const getProviderSymbol = (sym, mkt) => {
        if (!sym) return "";

        const upper = (mkt || "").toUpperCase();

        // 미국
        if (upper === "US") return sym;

        // 한국 KOSPI / KRX
        if (["KS", "KOSPI", "KRX"].includes(upper)) {
            return `${sym}.KS`;
        }
        // 한국 KOSDAQ
        if (["KQ", "KOSDAQ"].includes(upper)) {
            return `${sym}.KQ`;
        }

        // 나머지는 심볼 그대로
        return sym;
    };

    // 🔍 SearchBar에서 종목 선택 시 호출
    // SearchBar는 onSelect(symbol, item) 형태로 호출함
    const handleSearchSelect = (selectedSymbol, item) => {
        if (!selectedSymbol) return;

        setSymbol(selectedSymbol); // "005930" 같은 코드
        setSymbolName(item?.name || selectedSymbol);
        setMarket(item?.market || "KRX");

        // 종목 바뀔 때 기존 차트/예측 초기화
        setCandles([]);
        setForecastBand([]);
    };

    // symbol / market / timeframe 이 바뀔 때마다 캔들 + 예측 밴드 로딩
    useEffect(() => {
        if (!symbol) return;

        const loadCandles = async () => {
            try {
                setIsLoadingCandles(true);
                setCandlesError(null);

                const providerSymbol = getProviderSymbol(symbol, market);

                // 1) 기본 캔들 데이터 로딩
                const data = await fetchStockCandles(providerSymbol, timeframe);
                setCandles(data || []);

                // 2) 예측 밴드 데이터 로딩
                try {
                    const forecast = await fetchForecastBand(providerSymbol);
                    setForecastBand(forecast || []);
                } catch (forecastErr) {
                    console.error("예측 밴드 로딩 오류:", forecastErr);
                    setForecastBand([]);
                }
            } catch (err) {
                console.error("캔들 데이터 로딩 오류:", err);
                setCandlesError("차트 데이터를 불러오는 중 문제가 발생했습니다.");
                setCandles([]);
                setForecastBand([]);
            } finally {
                setIsLoadingCandles(false);
            }
        };

        loadCandles();
    }, [symbol, market, timeframe]);

    const TIMEFRAME_OPTIONS = [
        { value: "D", label: "일" },
        { value: "W", label: "주" },
        { value: "M", label: "월" },
        { value: "Y", label: "년" },
    ];

    return (
        <div className="space-y-6">
            {/* 🔹 상단 헤더: 현재 종목 / 가격 */}
            <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-base font-semibold text-slate-100">
                        {symbolName}{" "}
                        <span className="text-xs text-slate-400">
                            {symbol} {market && `(${market})`}
                        </span>
                    </h1>
                    <div className="mt-1 text-2xl font-bold text-slate-50">
                        {formattedLastPrice}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <SearchBar
                        value={symbol}                 // ✅ SearchBar가 기대하는 prop
                        onSelect={handleSearchSelect}  // (symbol, item) 받는 핸들러
                        placeholder="종목 코드 또는 종목명을 검색해 주세요"
                    />
                </div>
            </header>

            {/* 🔹 메인 섹션: 차트 / AI 패널 */}
            <section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                {/* 상단: 뷰 선택 / 기간 / 차트타입 */}
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* 차트 <-> AI 토글 */}
                    <div className="inline-flex items-center rounded-full bg-slate-900/80 p-1 border border-slate-800">
                        <button
                            type="button"
                            onClick={() => setViewMode("chart")}
                            className={`px-3 py-1.5 text-xs rounded-full transition ${
                                viewMode === "chart"
                                    ? "bg-sky-500 text-white"
                                    : "text-slate-300 hover:text-slate-100"
                            }`}
                        >
                            차트 보기
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("ai")}
                            className={`px-3 py-1.5 text-xs rounded-full transition ${
                                viewMode === "ai"
                                    ? "bg-sky-500 text-white"
                                    : "text-slate-300 hover:text-slate-100"
                            }`}
                        >
                            AI 분석 대시보드
                        </button>
                    </div>

                    {/* 기간 / 차트 타입 */}
                    {viewMode === "chart" && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <div className="inline-flex rounded-full bg-slate-900/80 p-1 border border-slate-800">
                                {TIMEFRAME_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setTimeframe(opt.value)}
                                        className={`px-2 py-1 rounded-full ${
                                            timeframe === opt.value
                                                ? "bg-sky-500 text-white"
                                                : "text-slate-300 hover:text-slate-100"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div className="inline-flex rounded-full bg-slate-900/80 p-1 border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setChartType("candlestick")}
                                    className={`px-2 py-1 text-[11px] rounded-full border transition ${
                                        chartType === "candlestick"
                                            ? "bg-slate-800 border-sky-400 text-sky-300"
                                            : "border-slate-700 text-slate-300 hover:border-slate-500"
                                    }`}
                                >
                                    캔들
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setChartType("line")}
                                    className={`px-2 py-1 text-[11px] rounded-full border transition ${
                                        chartType === "line"
                                            ? "bg-slate-800 border-sky-400 text-sky-300"
                                            : "border-slate-700 text-slate-300 hover:border-slate-500"
                                    }`}
                                >
                                    라인
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-[360px]">
                    {viewMode === "chart" ? (
                        <div className="h-full rounded-xl bg-slate-950/80 overflow-hidden">
                            {isLoadingCandles ? (
                                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                    차트 데이터를 불러오는 중입니다...
                                </div>
                            ) : candlesError ? (
                                <div className="flex h-full items-center justify-center text-xs text-red-400">
                                    {candlesError}
                                </div>
                            ) : candles.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                                    아직 차트 데이터가 없습니다. 상단에서 종목을 검색해 주세요.
                                </div>
                            ) : (
                                <PriceChart
                                    candles={candles}
                                    chartType={chartType}
                                    isKorean={isKoreanMarket}
                                    forecastBand={forecastBand} // 예측 밴드 전달
                                />
                            )}
                        </div>
                    ) : (
                        <AiAnalysisPanel symbol={symbol} />
                    )}
                </div>
            </section>

            {/* 🔹 포트폴리오 테이블 */}
            <PortfolioTable items={MOCK_PORTFOLIO} />
        </div>
    );
};

export default DashboardPage;