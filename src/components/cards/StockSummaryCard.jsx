import React from "react";

const StockSummaryCard = ({ summary }) => {
    if (!summary) return null;

    const {
        symbol,
        name,
        currentPrice,
        changeRate,
        volatility,
        riskScore,
        comment,
    } = summary;

    const isUp = changeRate >= 0;

    return (
        <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-baseline justify-between">
                <div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                        {symbol}
                    </div>
                    <div className="text-lg font-semibold">{name}</div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold">
                        {currentPrice?.toLocaleString()}원
                    </div>
                    <div
                        className={`text-sm ${
                            isUp ? "text-emerald-400" : "text-red-400"
                        }`}
                    >
                        {isUp ? "▲" : "▼"} {changeRate}%
                    </div>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-300">
                <div>
                    <div className="text-slate-500">Volatility</div>
                    <div className="mt-1 text-sm">{volatility}</div>
                </div>
                <div>
                    <div className="text-slate-500">Risk Score</div>
                    <div className="mt-1 text-sm">{riskScore} / 100</div>
                </div>
                <div>
                    <div className="text-slate-500">Insight</div>
                    <div className="mt-1 text-[11px] leading-snug text-slate-300">
                        {comment}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StockSummaryCard;