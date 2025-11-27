// src/pages/DashboardPage.jsx
import React, { useState, useMemo, useEffect } from "react";
import PriceChart from "../components/charts/PriceChart";
import PortfolioTable from "../components/portfolio/PortfolioTable";
import AiAnalysisPanel from "../components/analysis/AiAnalysisPanel";
import SearchBar from "../components/SearchBar";
import {
    fetchForecastBand,
    fetchForecastAccuracy,
    fetchStockCandles,
} from "../api/stockApi";

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
        totalInvested: 461500,
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
        totalInvested: 138044,
        changeRate: -5.15,
        volatilityScore: 83,
        riskLevel: "높음",
    },
    {
        symbol: "000000",
        displayName: "지니어스 그룹",
        currentPrice: 1268,
        avgPrice: 1268,
        shares: 4,
        totalInvested: 55100,
        changeRate: 2.84,
        volatilityScore: 35,
        riskLevel: "낮음",
    },
];

const DashboardPage = () => {
    const [symbol, setSymbol] = useState("005930");
    const [symbolName, setSymbolName] = useState("삼성전자");
    const [market, setMarket] = useState("KRX");

    const [candles, setCandles] = useState([]);
    const [forecastBand, setForecastBand] = useState([]); // ✅ 예측 밴드
    const [forecastMonths, setForecastMonths] = useState(3); // 1~6개월 사이 선택
    const [accuracy, setAccuracy] = useState(null);
    const [viewMode, setViewMode] = useState("chart"); // "chart" | "ai"

    // 기간: 일 / 주 / 월 / 년
    const [timeframe, setTimeframe] = useState("D"); // "D" | "W" | "M" | "Y"
    const [chartType, setChartType] = useState("candlestick"); // "candlestick" | "line"

    const [isLoadingCandles, setIsLoadingCandles] = useState(false);
    const [candlesError, setCandlesError] = useState(null);
    const [isLoadingForecast, setIsLoadingForecast] = useState(false);
    const [forecastError, setForecastError] = useState(null);
    const [isLoadingAccuracy, setIsLoadingAccuracy] = useState(false);
    const [accuracyError, setAccuracyError] = useState(null);

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

    // 외부 서비스용 심볼 포맷 변환
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

        return sym;
    };

    const monthsToBusinessDays = (months) => Math.max(1, Math.round(months * 21));

    // ✅ symbol / market / timeframe 이 바뀔 때마다 자동으 캔들 로딩
    useEffect(() => {
        if (!symbol) return;

        const loadCandles = async () => {
            try {
                setIsLoadingCandles(true);
                setCandlesError(null);

                const providerSymbol = getProviderSymbol(symbol, market);
                const data = await fetchStockCandles(providerSymbol, timeframe);
                setCandles(data || []);
            } catch (err) {
                console.error("캔들 데이터 로딩 오류:", err);
                setCandlesError("차트 데이터를 불러오는 중 문제가 발생했습니다.");
                setCandles([]);
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

    const FORECAST_RANGE_OPTIONS = [
        { value: 1, label: "1개월" },
        { value: 3, label: "3개월" },
        { value: 6, label: "6개월" },
    ];

    useEffect(() => {
        if (!symbol) return;

        const loadForecast = async () => {
            try {
                setIsLoadingForecast(true);
                setForecastError(null);

                const providerSymbol = getProviderSymbol(symbol, market);
                const horizonDays = monthsToBusinessDays(forecastMonths);
                const data = await fetchForecastBand(providerSymbol, horizonDays);
                setForecastBand(data || []);
            } catch (err) {
                console.error("예측 밴드 로딩 오류:", err);
                setForecastError("예측 밴드를 불러오는 중 문제가 발생했습니다.");
                setForecastBand([]);
            } finally {
                setIsLoadingForecast(false);
            }
        };

        loadForecast();
    }, [symbol, market, forecastMonths]);

    useEffect(() => {
        if (!symbol) return;

        const loadAccuracy = async () => {
            try {
                setIsLoadingAccuracy(true);
                setAccuracyError(null);

                const providerSymbol = getProviderSymbol(symbol, market);
                const holdoutDays = monthsToBusinessDays(forecastMonths);
                const metrics = await fetchForecastAccuracy(providerSymbol, holdoutDays);
                setAccuracy(metrics);
            } catch (err) {
                console.error("정확도 검증 오류:", err);
                setAccuracy(null);
                setAccuracyError("최근 홀드아웃 예측 정확도를 계산하지 못했습니다.");
            } finally {
                setIsLoadingAccuracy(false);
            }
        };

        loadAccuracy();
    }, [symbol, market, forecastMonths]);

    return (
        <div className="text-slate-100">
            {/* 🔹 종목 정보 헤더 (앱 헤더와 탭 사이) */}
            <div className="mb-3 flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-slate-50">
                        {symbolName || symbol}
                    </span>
                    <span className="text-xs text-sky-400">{symbol}</span>
                    {market && (
                        <span className="text-[11px] text-slate-500 uppercase">
                            {market}
                        </span>
                    )}
                </div>
                <div className="text-xl font-bold text-slate-100">
                    {formattedLastPrice !== "-" ? formattedLastPrice : "가격 정보 없음"}
                </div>
            </div>

            {/* 🔹 상단: 뷰 선택 / 종목 검색 (오른쪽 세로 정렬) */}
            <div className="mb-3 flex flex-col items-end gap-2">
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

                <div className="flex w-full justify-end">
                    <div className="w-full sm:w-80">
                        <SearchBar
                            value={symbol}
                            onSelect={(sym, item) => {
                                console.log("SearchBar에서 선택된 종목:", sym, item);
                                setSymbol(sym);
                                setMarket(item.market);
                                setSymbolName(item.name || sym);
                                // 선택과 동시에 useEffect가 자동으로 차트 리로드
                            }}
                            placeholder="종목명 또는 코드 검색"
                        />
                    </div>
                </div>
            </div>

            {/* 🔹 차트 / AI 패널 */}
            <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 shadow-md">
                {/* 카드 상단 바: 선택된 종목 + 기간 / 차트 타입 버튼 */}
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
                    <div className="text-[11px] text-slate-500">
                        선택된 종목:{" "}
                        <span className="text-sky-400 font-medium">{symbol}</span>
                    </div>

                    {viewMode === "chart" && (
                        <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
                            {/* 기간 버튼: 일 / 주 / 월 / 년 */}
                            <div className="flex items-center gap-1">
                                {TIMEFRAME_OPTIONS.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => setTimeframe(p.value)} // ✅ 클릭 즉시 useEffect로 차트 갱신
                                        className={`px-2 py-1 text-[11px] rounded-full border transition ${
                                            timeframe === p.value
                                                ? "bg-sky-500/90 border-sky-400 text-white"
                                                : "border-slate-700 text-slate-300 hover:border-slate-500"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {/* 예측 범위 (최대 6개월) */}
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="text-slate-500">예측 범위</span>
                                {FORECAST_RANGE_OPTIONS.map((range) => (
                                    <button
                                        key={range.value}
                                        type="button"
                                        onClick={() => setForecastMonths(range.value)}
                                        className={`px-2 py-1 rounded-full border transition ${
                                            forecastMonths === range.value
                                                ? "bg-emerald-600/80 border-emerald-400 text-white"
                                                : "border-slate-700 text-slate-300 hover:border-slate-500"
                                        }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                                <span className="text-[10px] text-slate-500">
                                    {isLoadingForecast
                                        ? "예측 업데이트 중..."
                                        : `미래 ${forecastMonths}개월 밴드`}
                                </span>
                                {forecastError && (
                                    <span className="text-[10px] text-red-400">
                                        {forecastError}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                    {isLoadingAccuracy ? (
                                        <span>정확도 검증 중...</span>
                                    ) : accuracyError ? (
                                        <span className="text-red-400">{accuracyError}</span>
                                    ) : accuracy ? (
                                        <>
                                            <span className="text-slate-400">MAPE</span>
                                            <span className="font-semibold text-emerald-300">
                                                {accuracy.mape?.toFixed(2)}%
                                            </span>
                                            <span className="text-slate-500">· RMSE</span>
                                            <span className="font-semibold text-emerald-300">
                                                {accuracy.rmse?.toFixed(2)}
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            {/* 캔들 / 라인 타입 */}
                            <div className="flex items-center gap-1">
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

                <div className={viewMode === "chart" ? "h-[360px]" : ""}>
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
                                    forecastBand={forecastBand}
                                />
                            )}
                        </div>
                    ) : (
                        <AiAnalysisPanel symbol={symbol} market={market} />
                    )}
                </div>
            </section>

            {/* 🔹 포트폴리오 테이블 */}
            <PortfolioTable items={MOCK_PORTFOLIO} />
        </div>
    );
};

export default DashboardPage;
