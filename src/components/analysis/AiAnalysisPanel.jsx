// src/components/analysis/AiAnalysisPanel.jsx
import React from "react";

/**
 * props:
 *  - symbol: 현재 선택된 종목 코드 (문자열)
 *
 * TODO: 나중에 백엔드 decision-insight 결과로 mock 대신 교체
 */
const AiAnalysisPanel = ({ symbol = "종목" }) => {
    const mock = {
        summary:
            "이 종목은 단기 변동성이 큰 편이지만, 최근 추세 전환 신호가 포착된 상태로 보수적인 분할 매수 전략이 적합한 구간입니다.",
        confidence: "보통", // 낮음 / 보통 / 높음
        risk: {
            score: 83,
            level: "높음",
            comment: "단기 변동성이 크고 최근 조정폭이 큰 구간입니다.",
        },
        trend: {
            score: 68,
            level: "상승 전환 가능",
            comment: "단기 이동평균이 중기 이동평균을 상향 돌파하는 초기 구간입니다.",
        },
        priceZone: {
            level: "중립~약간 저평가",
            comment: "최근 3개월 박스권 하단부에 위치해 매수 관점에서 유리한 구간일 수 있습니다.",
        },
        strategy: {
            comment:
                "1) 분할 매수로 평균단가를 낮추고, 2) 단기 급등 시 일부 차익 실현, 3) 최근 저점 이탈 시 손절을 고려하는 보수적 전략을 권장합니다.",
        },
        signals: [
            "단기 이동평균 상향 돌파",
            "중기 박스권 하단 근처",
            "거래량 평균 대비 증가",
        ],
    };

    const confidenceColor =
        mock.confidence === "높음"
            ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/40"
            : mock.confidence === "보통"
                ? "text-amber-200 bg-amber-500/10 border-amber-500/40"
                : "text-slate-300 bg-slate-500/10 border-slate-500/40";

    return (
        <div className="h-full overflow-hidden rounded-xl bg-slate-950/80 p-4 text-sm text-slate-100">
            {/* 상단 헤더: AI 배지 + 요약 */}
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="mb-1 flex items-center gap-2">
            <span className="rounded-md bg-sky-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-200 border border-sky-500/40">
              AI Insight
            </span>
                        <span className="rounded-md border px-2 py-0.5 text-[10px] text-slate-300 border-slate-600/80">
              Symbol: <span className="font-semibold">{symbol}</span>
            </span>
                    </div>
                    <p className="max-w-2xl text-xs leading-relaxed text-slate-200">
                        {mock.summary}
                    </p>
                </div>

                <div className="mt-1 flex items-center gap-2 md:mt-0">
                    <span className="text-[11px] text-slate-400">AI 신뢰도</span>
                    <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] ${confidenceColor}`}
                    >
            {mock.confidence}
          </span>
                </div>
            </div>

            {/* 중단: 위험/추세 카드 */}
            <div className="mb-3 grid gap-3 md:grid-cols-2">
                {/* Risk */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">위험도 분석</span>
                        <span className="text-amber-300">
              {mock.risk.level} · {mock.risk.score}점
            </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                            className="h-full bg-red-500"
                            style={{ width: `${mock.risk.score}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        {mock.risk.comment}
                    </p>
                </div>

                {/* Trend */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">추세 분석</span>
                        <span className="text-sky-300">
              {mock.trend.level} · {mock.trend.score}점
            </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                            className="h-full bg-sky-500"
                            style={{ width: `${mock.trend.score}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                        {mock.trend.comment}
                    </p>
                </div>
            </div>

            {/* 하단: 가격대 / 전략 + AI가 본 핵심 신호 */}
            <div className="grid gap-3 md:grid-cols-[2fr,3fr]">
                <div className="space-y-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                        <div className="mb-1 text-xs font-semibold text-slate-200">
                            가격대 분석
                        </div>
                        <p className="text-xs text-emerald-300 mb-1">
                            {mock.priceZone.level}
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {mock.priceZone.comment}
                        </p>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                        <div className="mb-1 text-xs font-semibold text-slate-200">
                            AI가 포착한 핵심 신호
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {mock.signals.map((s) => (
                                <span
                                    key={s}
                                    className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200 border border-slate-700"
                                >
                  {s}
                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                    <div className="mb-1 text-xs font-semibold text-slate-200">
                        전략 관점 요약 (AI 제안)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                        {mock.strategy.comment}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AiAnalysisPanel;