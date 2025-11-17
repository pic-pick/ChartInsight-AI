// src/pages/DashboardPage.jsx
import React, { useState } from "react";
import PriceChart from "../components/charts/PriceChart";
import PortfolioTable from "../components/portfolio/PortfolioTable";
import AiAnalysisPanel from "../components/analysis/AiAnalysisPanel";
import SearchBar from "../components/SearchBar"; // 🔹 추가

// 테스트용 더미 캔들 데이터
const MOCK_CANDLES = [
    { time: "2025-01-01", open: 70000, high: 71000, low: 69500, close: 70500 },
    { time: "2025-01-02", open: 70500, high: 70800, low: 69900, close: 70000 },
    { time: "2025-01-03", open: 70000, high: 71200, low: 69800, close: 71000 },
    { time: "2025-01-04", open: 71000, high: 71500, low: 70500, close: 70700 },
    { time: "2025-01-05", open: 70700, high: 71300, low: 70300, close: 71200 },
];

// 테스트용 포트폴리오 데이터
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
    const [symbol, setSymbol] = useState("005930");       // 선택된 종목 코드
    const [candles, setCandles] = useState(MOCK_CANDLES); // 차트 데이터

    // chart / ai toggle
    const [viewMode, setViewMode] = useState("chart");

    // "분석하기" 버튼 클릭
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!symbol.trim()) return;

        // TODO: 여기서 symbol 기준으로
        //  - 캔들 데이터 로딩
        //  - AI 분석 API 호출 등 연결
        setCandles(MOCK_CANDLES);
    };

    return (
        <div className="text-slate-100">
            {/* 상단: 뷰 선택 / 종목 검색 */}
            <div className="mb-3 flex items-center justify-between">
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

                {/* 종목 검색 + 분석하기 버튼 */}
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                    {/* 🔹 Finnhub 기반 자동완성 SearchBar 사용 */}
                    <SearchBar
                        value={symbol}
                        onSelect={(sym, item) => {
                            // sym: "005930" 같은 티커
                            // item.name: "삼성전자" (백엔드에서 변환해 준 이름)
                            setSymbol(sym);
                            // 여기서 심볼 변경 시 데이터 로딩 트리거해도 됨
                            // loadCandles(sym);
                            // loadAiAnalysis(sym);
                        }}
                        placeholder="종목명 또는 코드 검색"
                    />

                    <button
                        type="submit"
                        className="rounded-md bg-sky-500 px-4 py-2 text-xs font-medium text-white hover:bg-sky-600"
                    >
                        분석하기
                    </button>
                </form>
            </div>

            {/* 차트 또는 AI 패널 */}
            <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 shadow-md">
                <div className="mb-2 text-xs font-medium text-slate-300">
                    {viewMode === "chart"
                        ? "Price & Moving Averages"
                        : "AI Analysis Dashboard"}
                </div>

                <div className="h-[360px]">
                    {viewMode === "chart" ? (
                        <div className="h-full rounded-xl bg-slate-950/80 overflow-hidden">
                            <PriceChart candles={candles} />
                        </div>
                    ) : (
                        <AiAnalysisPanel symbol={symbol} />
                    )}
                </div>
            </section>

            {/* 포트폴리오 */}
            <PortfolioTable items={MOCK_PORTFOLIO} />
        </div>
    );
};

export default DashboardPage;