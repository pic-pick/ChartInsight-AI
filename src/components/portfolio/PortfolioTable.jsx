import React from "react";

const PortfolioTable = ({ items = [], detailed = false, title = "나의 보유 종목 분석" }) => {
    const totalColumns = detailed ? 10 : 7;

    return (
        <section className="mt-8">
            <h2 className="mb-3 text-base font-semibold text-slate-100">
                {title}
            </h2>

            <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow">
                <table className="min-w-full text-sm text-slate-200">
                    <thead>
                    <tr className="bg-slate-800 text-xs font-semibold uppercase tracking-wide text-slate-300">
                        <th className="px-4 py-3 text-left w-48">종목</th>
                        <th className="px-4 py-3 text-right w-24">현재가</th>
                        <th className="px-4 py-3 text-right w-24">평단가</th>
                        <th className="px-4 py-3 text-right w-20">수량</th>
                        <th className="px-4 py-3 text-right w-32">총 투자금</th>
                        <th className="px-4 py-3 text-right w-24">등락률</th>
                        {detailed && (
                            <>
                                <th className="px-4 py-3 text-right w-32">평가금액</th>
                                <th className="px-4 py-3 text-right w-32">평가손익</th>
                                <th className="px-4 py-3 text-right w-24">비중</th>
                            </>
                        )}
                        <th className="px-4 py-3 text-center w-40">변동성 / 위험도</th>
                    </tr>
                    </thead>

                    <tbody>
                    {items.length === 0 ? (
                        <tr>
                            <td
                                colSpan={totalColumns}
                                className="px-4 py-6 text-center text-slate-500"
                            >
                                보유 중인 종목이 없습니다.
                            </td>
                        </tr>
                    ) : (
                        items.map((item, idx) => {
                            const isUp = item.changeRate >= 0;

                            const invested = item.totalInvested ?? item.invested ?? item.avgPrice * item.shares;
                            const marketValue = item.marketValue ?? item.currentPrice * item.shares;
                            const pnl = item.pnl ?? marketValue - invested;
                            const pnlRate = item.returnRate ?? (invested ? (pnl / invested) * 100 : 0);
                            const weight = item.weight;

                            // 위험도 색 (낮음/보통/높음)
                            const riskColor =
                                item.riskLevel === "높음"
                                    ? "text-red-400"
                                    : item.riskLevel === "보통"
                                        ? "text-amber-300"
                                        : "text-emerald-300";

                            return (
                                <tr
                                    key={idx}
                                    className={
                                        idx % 2 === 0 ? "bg-slate-900" : "bg-slate-800"
                                    }
                                >
                                    {/* 종목 */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white">
                                                {item.displayName?.[0] || "종"}
                                            </div>

                                            <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-100">
                            {item.displayName}
                          </span>
                                                <span className="text-[11px] text-slate-400">
                            {item.symbol}
                          </span>
                                            </div>
                                        </div>
                                    </td>

                                    {/* 현재가 */}
                                    <td className="px-4 py-3 text-right text-slate-100">
                                        {item.currentPrice.toLocaleString()}원
                                    </td>

                                    {/* 평단가 */}
                                    <td className="px-4 py-3 text-right text-slate-100">
                                        {item.avgPrice.toLocaleString()}원
                                    </td>

                                    {/* 수량 */}
                                    <td className="px-4 py-3 text-right text-slate-100">
                                        {item.shares}주
                                    </td>

                                    {/* 총 투자금 */}
                                    <td className="px-4 py-3 text-right text-slate-100">
                                        {invested.toLocaleString()}원
                                    </td>

                                    {/* 등락률 */}
                                    <td
                                        className={`px-4 py-3 text-right font-semibold ${
                                            isUp ? "text-red-400" : "text-sky-400"
                                        }`}
                                    >
                                        {isUp ? "+" : ""}
                                        {item.changeRate.toFixed(2)}%
                                    </td>

                                    {detailed && (
                                        <>
                                            {/* 평가금액 */}
                                            <td className="px-4 py-3 text-right text-slate-100">
                                                {marketValue.toLocaleString(undefined, {
                                                    maximumFractionDigits: 0,
                                                })}
                                                원
                                            </td>

                                            {/* 평가손익 */}
                                            <td
                                                className={`px-4 py-3 text-right font-semibold ${
                                                    pnl >= 0 ? "text-red-300" : "text-sky-300"
                                                }`}
                                            >
                                                {pnl >= 0 ? "+" : ""}
                                                {pnl.toLocaleString(undefined, {
                                                    maximumFractionDigits: 0,
                                                })}
                                                원
                                                <div className="text-[11px] text-slate-400">
                                                    {pnlRate >= 0 ? "+" : ""}
                                                    {pnlRate.toFixed(2)}%
                                                </div>
                                            </td>

                                            {/* 비중 */}
                                            <td className="px-4 py-3 text-right text-slate-100">
                                                {weight != null ? `${weight.toFixed(1)}%` : "-"}
                                            </td>
                                        </>
                                    )}

                                    {/* 변동성 / 위험도 */}
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            {/* 변동성 바 */}
                                            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-700">
                                                <div
                                                    className="bg-sky-500"
                                                    style={{
                                                        width: `${Math.min(
                                                            Math.max(item.volatilityScore, 0),
                                                            100
                                                        )}%`,
                                                    }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[11px] text-slate-400">
                                                <span>변동성 지수 {item.volatilityScore}</span>
                                                <span className={riskColor}>
                            위험도 {item.riskLevel}
                          </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default PortfolioTable;