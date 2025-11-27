// src/components/analysis/AiAnalysisPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchStockDecisionInsight } from "../../api/stockApi";

const FALLBACK_ANALYSIS = {
    name: "AI 시뮬레이션",
    market: "KRX",
    last_price: 52_300,
    change_rate: 0,
    volatility_score: 45,
    confidence: 65,
    risk_label: "중간",
    summary: "샘플 데이터입니다. 실시간 분석 결과가 준비되면 자동으로 대체됩니다.",
    quick_notes: [
        "더미 데이터로 시각적 레이아웃만 확인할 수 있습니다.",
        "실제 연동 시 수급, 변동성, 밴드 정보를 채워 넣어주세요.",
        "리스크 신호는 최근 3개월 구간을 기준으로 계산됩니다.",
    ],
    actions: [
        "이탈·돌파 시 알림을 걸어두세요.",
        "거래량 급증 여부를 체크하세요.",
        "리스크 점수가 60을 넘으면 비중 축소를 고려하세요.",
    ],
    band: {
        horizon_label: "3개월 ARIMA",
        upper: 58_100,
        center: 52_300,
        lower: 46_900,
    },
    indicators: {},
};

const MetricItem = ({ label, value, accent }) => (
    <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className={accent ?? "text-sm font-semibold text-slate-100"}>{value}</span>
    </div>
);

const formatNumber = (value, isKorean) => {
    if (value == null || Number.isNaN(value)) return "-";
    return isKorean
        ? `${Number(value).toLocaleString("ko-KR")}원`
        : `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPct = (value) => {
    if (value == null || Number.isNaN(value)) return "-";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const useProviderSymbol = (symbol, market) => {
    return useMemo(() => {
        const upper = (market || "").toUpperCase();
        if (["KS", "KOSPI", "KRX"].includes(upper)) return `${symbol}.KS`;
        if (["KQ", "KOSDAQ"].includes(upper)) return `${symbol}.KQ`;
        return symbol;
    }, [symbol, market]);
};

const AiAnalysisPanel = ({ symbol, market }) => {
    const providerSymbol = useProviderSymbol(symbol, market);
    const [analysis, setAnalysis] = useState(FALLBACK_ANALYSIS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isKoreanMarket = useMemo(
        () => ["KRX", "KS", "KQ", "KOSPI", "KOSDAQ"].includes((market || "").toUpperCase()),
        [market]
    );

    useEffect(() => {
        if (!providerSymbol) return;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await fetchStockDecisionInsight(providerSymbol);
                setAnalysis({ name: symbol, market, ...FALLBACK_ANALYSIS, ...res });
            } catch (err) {
                console.error("AI 분석 패널 로딩 오류", err);
                setError("AI 분석 정보를 불러오지 못했습니다.");
                setAnalysis({ name: symbol, market, ...FALLBACK_ANALYSIS });
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [providerSymbol, symbol, market]);

    const priceFormatted = formatNumber(analysis.last_price, isKoreanMarket);
    const upperFormatted = analysis.band?.upper ? formatNumber(analysis.band.upper, isKoreanMarket) : "-";
    const lowerFormatted = analysis.band?.lower ? formatNumber(analysis.band.lower, isKoreanMarket) : "-";

    return (
        <div className="flex h-full flex-col gap-4 text-slate-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300">AI 분석 브리핑</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                            {loading ? "데이터 로딩" : error ? "더미" : "실시간"}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-slate-50">{analysis.name || symbol}</span>
                        <span className="text-xs text-sky-300">{symbol}</span>
                        <span className="text-[11px] text-slate-500 uppercase">{market}</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-100">{priceFormatted}</div>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <button className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1 transition hover:border-slate-600 hover:text-white">
                        차트 보기
                    </button>
                    <button className="rounded-full border border-sky-500/60 bg-sky-500/10 px-3 py-1 font-semibold text-sky-200">
                        AI 분석 대시보드
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <MetricItem label="현재가" value={priceFormatted} />
                <MetricItem
                    label="일간 변동률"
                    value={formatPct(analysis.change_rate)}
                    accent={analysis.change_rate >= 0 ? "text-sm font-semibold text-emerald-300" : "text-sm font-semibold text-sky-300"}
                />
                <MetricItem label="변동성 점수" value={`${analysis.volatility_score} / 100`} />
                <MetricItem label="신뢰 점수" value={`${analysis.confidence} / 100`} accent="text-sm font-semibold text-amber-200" />
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="col-span-2 space-y-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/30">
                        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-200">
                            리스크 / 밴드 브리핑
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-200">
                            {analysis.summary}
                            {error && <div className="mt-1 text-[11px] text-amber-300">{error}</div>}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">상단 밴드 ({analysis.band?.horizon_label || "3개월"})</div>
                                <div className="text-sm font-semibold text-emerald-200">{upperFormatted}</div>
                            </div>
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">중심선</div>
                                <div className="text-sm font-semibold text-slate-100">{priceFormatted}</div>
                            </div>
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">하단 밴드</div>
                                <div className="text-sm font-semibold text-sky-200">{lowerFormatted}</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/30">
                        <div className="mb-2 text-[12px] font-semibold text-slate-200">핵심 인사이트</div>
                        <ul className="space-y-2 text-sm text-slate-200">
                            {(analysis.quick_notes || []).map((note, idx) => (
                                <li
                                    key={idx}
                                    className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-[13px] text-slate-100"
                                >
                                    {note}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/30">
                        <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-slate-200">
                            <span>매매 액션 가이드</span>
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">리스크 관리</span>
                        </div>
                        <ol className="space-y-2 text-sm text-slate-100">
                            {(analysis.actions || []).map((action, idx) => (
                                <li
                                    key={idx}
                                    className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-[13px]"
                                >
                                    {idx + 1}. {action}
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/30">
                        <div className="mb-2 text-[12px] font-semibold text-slate-200">알림 / 모니터링 포인트</div>
                        <ul className="space-y-1 text-[12px] text-slate-300">
                            <li className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                거래량이 20% 이상 증가하면 돌파 가능성 알림
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-amber-300" />
                                하단 밴드( {lowerFormatted} ) 이탈 시 손절 검토
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-sky-300" />
                                주봉 기준 10EMA 재진입 여부 체크
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AiAnalysisPanel;