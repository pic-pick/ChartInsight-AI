// src/components/analysis/AiAnalysisPanel.jsx
import React, { useEffect, useState } from "react";
import {
    fetchStockSummary,
    fetchStockDecisionInsight,
    fetchAiAnalysis,
} from "../../api/stockApi";

const AiAnalysisPanel = ({ symbol }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [summary, setSummary] = useState(null);
    const [decision, setDecision] = useState(null);
    const [aiText, setAiText] = useState(null);

    useEffect(() => {
        if (!symbol) return;

        const load = async () => {
            try {
                setLoading(true);
                setError(null);

                const [summaryRes, decisionRes, aiRes] = await Promise.all([
                    fetchStockSummary(symbol),
                    fetchStockDecisionInsight(symbol),
                    fetchAiAnalysis(symbol),
                ]);

                setSummary(summaryRes);
                setDecision(decisionRes);
                setAiText(aiRes);
            } catch (err) {
                console.error("AI 분석 패널 로딩 오류:", err);
                setError("AI 분석 정보를 불러오는 중 문제가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [symbol]);

    if (!symbol) {
        return (
            <div className="flex h-full items-center justify-center text-xs text-slate-500">
                종목을 선택하면 AI 분석 결과가 표시됩니다.
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
                AI 분석 중입니다...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-xs text-red-400">
                {error}
            </div>
        );
    }

    return (
        <div className="grid h-full grid-cols-3 gap-4 text-xs">
            {/* 왼쪽: 요약 카드 */}
            <div className="col-span-1 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="mb-2 text-[11px] font-semibold text-slate-200">
                    종목 요약
                </div>
                {summary ? (
                    <div className="space-y-1.5 text-[11px] text-slate-300">
                        <div className="flex justify-between">
                            <span className="text-slate-400">종목명</span>
                            <span>{summary.name ?? symbol}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">현재가</span>
                            <span>{summary.currentPrice?.toLocaleString()} 원</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">일간 수익률</span>
                            <span
                                className={
                                    summary.changeRate > 0
                                        ? "text-red-400"
                                        : summary.changeRate < 0
                                            ? "text-sky-400"
                                            : "text-slate-300"
                                }
                            >
                {summary.changeRate?.toFixed(2)}%
              </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">변동성</span>
                            <span>{summary.volatilityScore ?? "-"} / 100</span>
                        </div>
                        <div className="mt-2 rounded-md bg-slate-900/80 p-2 text-[10px] text-slate-400">
                            {summary.comment ?? "AI가 변동성과 추세를 종합해 리스크 코멘트를 제공합니다."}
                        </div>
                    </div>
                ) : (
                    <div className="text-[11px] text-slate-500">
                        요약 정보가 없습니다.
                    </div>
                )}
            </div>

            {/* 가운데: 의사결정 지표 */}
            <div className="col-span-1 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="mb-2 text-[11px] font-semibold text-slate-200">
                    의사결정 보조 지표
                </div>
                {decision ? (
                    <div className="space-y-1.5 text-[11px] text-slate-300">
                        <div className="flex justify-between">
                            <span className="text-slate-400">트렌드 점수</span>
                            <span>{decision.trendScore ?? "-"} / 100</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">위험도 점수</span>
                            <span>{decision.riskScore ?? "-"} / 100</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">가격 구간</span>
                            <span>{decision.priceZoneLabel ?? "-"}</span>
                        </div>
                        <div className="mt-2 space-y-1">
                            <div className="text-[11px] text-slate-400">핵심 시그널</div>
                            <ul className="space-y-0.5">
                                {(decision.signals ?? []).map((sig, idx) => (
                                    <li
                                        key={idx}
                                        className="rounded-md bg-slate-900/80 px-2 py-1 text-[10px] text-slate-200"
                                    >
                                        {sig}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="text-[11px] text-slate-500">
                        의사결정 지표가 없습니다.
                    </div>
                )}
            </div>

            {/* 오른쪽: AI 자연어 리포트 */}
            <div className="col-span-1 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="mb-2 text-[11px] font-semibold text-slate-200">
                    AI 리포트
                </div>
                {aiText ? (
                    <div className="space-y-1.5 text-[11px] leading-relaxed text-slate-200">
                        <p>{aiText.summary ?? aiText}</p>
                        {aiText.strategy && (
                            <div className="mt-2 rounded-md bg-slate-900/80 p-2 text-[10px] text-slate-300">
                                {aiText.strategy}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-[11px] text-slate-500">
                        이 종목에 대한 AI 리포트가 아직 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiAnalysisPanel;