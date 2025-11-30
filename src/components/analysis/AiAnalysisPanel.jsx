// src/components/analysis/AiAnalysisPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchStockDecisionInsight } from "../../api/stockApi";

const 기본분석값 = {
    name: "AI 시뮬레이션",
    market: "KRX",
    last_price: 52_300,
    change_rate: 0,
    volatility_score: 45,
    volatility_label: "중간",
    confidence: 65,
    confidence_label: "보통",
    confidence_reason: "추세·모멘텀·밴드 폭을 조합해 신뢰도를 계산합니다.",
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
    alerts: [
        "가격이 상단 밴드 근처라면 돌파/실패 시나리오를 함께 점검하세요.",
        "하단 밴드 접근 시 손절·분할매수 기준을 미리 세팅해두세요.",
    ],
    band: {
        horizon_label: "3개월 ARIMA",
        upper: 58_100,
        center: 52_300,
        lower: 46_900,
    },
    indicators: {},
    oscillators: {
        macd: { line: 0, signal: 0, hist: 0, state: "중립" },
        rsi14: { value: 50, zone: "중립" },
        volume_ratio_pct: 0,
    },
    sentiment: {
        investor_psychology_pct: 50,
        fear_greed: "중립",
        note: "투자심리도 50% → 중립 구간",
        vkospi: { level: null, change_pct: null },
    },
};

const 지표상자 = ({ label, value, accent }) => (
    <div className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2">
        <span className="text-[10px] text-slate-400">{label}</span>
        <span className={accent ?? "text-sm font-semibold text-slate-100"}>{value}</span>
    </div>
);

const 숫자포맷 = (value, isKorean) => {
    if (value == null || Number.isNaN(value)) return "-";
    return isKorean
        ? `${Number(value).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}원`
        : `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const 퍼센트포맷 = (value) => {
    if (value == null || Number.isNaN(value)) return "-";
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
};

const 시장심볼선택 = (symbol, market) => {
    return useMemo(() => {
        const upper = (market || "").toUpperCase();
        if (["KS", "KOSPI", "KRX"].includes(upper)) return `${symbol}.KS`;
        if (["KQ", "KOSDAQ"].includes(upper)) return `${symbol}.KQ`;
        return symbol;
    }, [symbol, market]);
};

const Ai분석패널 = ({ symbol, market }) => {
    const 제공용심볼 = 시장심볼선택(symbol, market);
    const [분석데이터, 분석데이터설정] = useState(기본분석값);
    const [불러오는중, 불러오는중설정] = useState(false);
    const [오류메시지, 오류메시지설정] = useState(null);

    const 국내시장 = useMemo(
        () => ["KRX", "KS", "KQ", "KOSPI", "KOSDAQ"].includes((market || "").toUpperCase()),
        [market]
    );

    useEffect(() => {
        if (!제공용심볼) return;

        const load = async () => {
            const cacheKey = `decision:${제공용심볼}`;
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    분석데이터설정(JSON.parse(cached));
                }

                불러오는중설정(true);
                오류메시지설정(null);
                const res = await fetchStockDecisionInsight(제공용심볼);
                const next = { name: symbol, market, ...기본분석값, ...res };
                분석데이터설정(next);
                localStorage.setItem(cacheKey, JSON.stringify(next));
            } catch (err) {
                console.error("AI 분석 패널 로딩 오류", err);
                오류메시지설정("AI 분석 정보를 불러오지 못했습니다.");
                분석데이터설정({ name: symbol, market, ...기본분석값 });
            } finally {
                불러오는중설정(false);
            }
        };

        load();
    }, [제공용심볼, symbol, market]);

    const 가격표시값 = 숫자포맷(분석데이터.last_price, 국내시장);
    const 상단밴드표시 = 분석데이터.band?.upper ? 숫자포맷(분석데이터.band.upper, 국내시장) : "-";
    const 하단밴드표시 = 분석데이터.band?.lower ? 숫자포맷(분석데이터.band.lower, 국내시장) : "-";
    const 거래량비율 = 분석데이터.oscillators?.volume_ratio_pct ?? 분석데이터.indicators?.volume_ratio_pct;
    const macd상태 = 분석데이터.oscillators?.macd?.state || (분석데이터.indicators?.macd_hist > 0 ? "상향" : "하향");
    const rsi값 = 분석데이터.oscillators?.rsi14?.value ?? 분석데이터.indicators?.rsi14;
    const rsi구간 = 분석데이터.oscillators?.rsi14?.zone;
    const 심리도 = 분석데이터.sentiment?.investor_psychology_pct ?? 분석데이터.indicators?.psy10_pct;

    return (
        <div className="flex h-full flex-col gap-4 text-slate-100">
            <div className="flex items-center gap-2 self-start rounded-full bg-slate-900 px-3 py-1 text-[12px] font-semibold text-slate-100">
                <span>AI 분석 브리핑</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                    실시간
                </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                <지표상자 label="현재가" value={가격표시값} />
                <지표상자
                    label="일간 변동률"
                    value={퍼센트포맷(분석데이터.change_rate)}
                    accent="text-sm font-semibold text-rose-300"
                />
                <지표상자
                    label="변동성"
                    value={`${분석데이터.volatility_score} / 100 (${분석데이터.volatility_label || "-"})`}
                />
                <지표상자
                    label="신뢰도"
                    value={`${분석데이터.confidence} / 100 (${분석데이터.confidence_label || "-"})`}
                    accent="text-sm font-semibold text-amber-200"
                />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                <지표상자
                    label="MACD"
                    value={`${macd상태 || "-"} (${(분석데이터.indicators?.macd_hist ?? 0).toFixed(3)})`}
                />
                <지표상자
                    label="RSI(14)"
                    value={`${rsi값 ? rsi값.toFixed(0) : "-"} ${rsi구간 ? `(${rsi구간})` : ""}`.trim()}
                    accent={"text-sm font-semibold " + (rsi값 >= 70 ? "text-amber-300" : rsi값 <= 30 ? "text-sky-300" : "text-emerald-200")}
                />
                <지표상자
                    label="거래량 vs 20일"
                    value={`${거래량비율 ? 거래량비율.toFixed(0) : 0}%`}
                    accent={"text-sm font-semibold " + (거래량비율 > 30 ? "text-emerald-200" : 거래량비율 < -20 ? "text-slate-300" : "text-slate-100")}
                />
                <지표상자
                    label="투자심리도"
                    value={`${심리도 ? 심리도.toFixed(0) : "-"}% (${분석데이터.sentiment?.fear_greed || "중립"})`}
                    accent="text-sm font-semibold text-slate-100"
                />
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="col-span-2 space-y-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-lg shadow-black/30 sm:p-4">
                        <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-slate-200">
                            리스크 / 밴드 브리핑
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-3 text-sm text-slate-200">
                            <div className="mb-2 flex items-center gap-2 text-[12px] text-slate-300">
                                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">리스크 {분석데이터.risk_label}</span>
                                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-100">신뢰 {분석데이터.confidence_label || "-"}</span>
                            </div>
                            {분석데이터.summary}
                            {분석데이터.confidence_reason && (
                                <div className="mt-2 text-[11px] text-slate-400">{분석데이터.confidence_reason}</div>
                            )}
                            {분석데이터.sentiment?.note && (
                                <div className="mt-2 text-[11px] text-emerald-200/80">{분석데이터.sentiment.note}</div>
                            )}
                            {오류메시지 && <div className="mt-1 text-[11px] text-amber-300">{오류메시지}</div>}
                        </div>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">상단 밴드 ({분석데이터.band?.horizon_label || "3개월"})</div>
                                <div className="text-sm font-semibold text-rose-200">{상단밴드표시}</div>
                            </div>
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">중심선</div>
                                <div className="text-sm font-semibold text-slate-100">{가격표시값}</div>
                            </div>
                            <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-[11px] text-slate-300">
                                <div className="text-slate-400">하단 밴드</div>
                                <div className="text-sm font-semibold text-sky-200">{하단밴드표시}</div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-lg shadow-black/30 sm:p-4">
                        <div className="mb-2 text-[12px] font-semibold text-slate-200">핵심 인사이트</div>
                        <ul className="space-y-2 text-sm text-slate-200">
                            {(분석데이터.quick_notes || []).map((note, idx) => (
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
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-lg shadow-black/30 sm:p-4">
                        <div className="mb-2 flex items-center justify-between text-[12px] font-semibold text-slate-200">
                            <span>매매 액션 가이드</span>
                            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">리스크 관리</span>
                        </div>
                        <ol className="space-y-2 text-sm text-slate-100">
                            {(분석데이터.actions || []).map((action, idx) => (
                                <li
                                    key={idx}
                                    className="rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-2 text-[13px]"
                                >
                                    {idx + 1}. {action}
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-lg shadow-black/30 sm:p-4">
                        <div className="mb-2 text-[12px] font-semibold text-slate-200">알림 / 모니터링 포인트</div>
                        <ul className="space-y-2 text-[12px] text-slate-300">
                            {(분석데이터.alerts || []).map((alert, idx) => (
                                <li key={idx} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                                    <span className="mt-[6px] h-2 w-2 rounded-full bg-emerald-300" />
                                    <span className="text-[13px] text-slate-100">{alert}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Ai분석패널;