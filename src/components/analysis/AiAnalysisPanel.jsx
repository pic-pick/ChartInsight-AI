// src/components/analysis/AiAnalysisPanel.jsx
import React, { useMemo } from "react";

const DUMMY_ANALYSIS = {
    "005930": {
        name: "삼성전자",
        market: "KS",
        currentPrice: 103_500,
        changeRate: -0.8,
        volatility: 38,
        confidence: 72,
        summary:
            "단기 조정 구간이지만 중기 추세는 우상향을 유지하고 있습니다. 수급이 완만하게 회복되는 동안 박스권(9.8만~10.8만) 내 매물 소화가 진행 중입니다.",
        quickNotes: [
            "최근 4주 평균 거래량 대비 12% 감소로 변동성 완화",
            "외국인 순매수 전환이 확인되면 박스권 상단 돌파 가능성 상승",
            "반도체 업황 턴어라운드 기대감으로 중기 모멘텀 유지",
        ],
        actions: [
            "9.8만~10.1만 구간 분할 매수", 
            "11만 부근 저항 확인 시 일부 차익 실현", 
            "박스권 이탈 여부(9.5만 미만) 모니터링",
        ],
        band: {
            horizon: "3개월",
            upper: 114_800,
            base: 103_500,
            lower: 94_200,
        },
    },
    fallback: {
        name: "AI 시뮬레이션",
        market: "KS",
        currentPrice: 52_300,
        changeRate: 0.0,
        volatility: 45,
        confidence: 65,
        summary:
            "샘플 데이터입니다. 선택한 종목의 실제 데이터가 준비되면 실시간 분석 요약을 표시합니다.",
        quickNotes: [
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
            horizon: "3개월",
            upper: 58_100,
            base: 52_300,
            lower: 46_900,
        },
    },
};

const MetricItem = ({ label, value, accent }) => (
    <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className={accent ?? "text-sm font-semibold text-slate-100"}>{value}</span>
    </div>
);

const AiAnalysisPanel = ({ symbol }) => {
    const data = useMemo(() => DUMMY_ANALYSIS[symbol] ?? DUMMY_ANALYSIS.fallback, [symbol]);

    const priceFormatted = `${data.currentPrice.toLocaleString("ko-KR")}원`;
    const upperFormatted = data.band.upper.toLocaleString("ko-KR");
    const lowerFormatted = data.band.lower.toLocaleString("ko-KR");

    return (
        <div className="flex h-full flex-col gap-4 text-slate-100">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300">AI 분석 브리핑</span>
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200">
                            더미 데이터
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-semibold text-slate-50">{data.name}</span>
                        <span className="text-xs text-sky-300">{symbol}</span>
                        <span className="text-[11px] text-slate-500 uppercase">{data.market}</span>
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
                    value={`${data.changeRate > 0 ? "+" : ""}${data.changeRate.toFixed(1)}%`}
                    accent={data.changeRate >= 0 ? "text-sm font-semibold text-emerald-300" : "text-sm font-semibold text-sky-300"}
                />
                <MetricItem label="변동성 점수" value={`${data.volatility} / 100`} />
                <MetricItem label="신뢰 점수" value={`${data.confidence} / 100`} accent="text-sm font-semibold text-amber-200" />
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="col-span-2 space-y-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/30">
                        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-200">
                            리스크 / 밴드 브리핑
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-200">
                            {data.summary}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">상단 밴드 ({data.band.horizon})</div>
                                <div className="text-sm font-semibold text-emerald-200">{upperFormatted}원</div>
                            </div>
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">중심선</div>
                                <div className="text-sm font-semibold text-slate-100">{priceFormatted}</div>
                            </div>
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">하단 밴드</div>
                                <div className="text-sm font-semibold text-sky-200">{lowerFormatted}원</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/30">
                        <div className="mb-2 text-[12px] font-semibold text-slate-200">핵심 인사이트</div>
                        <ul className="space-y-2 text-sm text-slate-200">
                            {data.quickNotes.map((note, idx) => (
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
                            {data.actions.map((action, idx) => (
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
                                하단 밴드( {lowerFormatted}원 ) 이탈 시 손절 검토
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