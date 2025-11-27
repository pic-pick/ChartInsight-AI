import React from "react";
import PortfolioTable from "../components/portfolio/PortfolioTable";
import { useUserPortfolio } from "../context/UserPortfolioContext";

const PortfolioPage = () => {
    const { user, holdings, totals } = useUserPortfolio();

    const summaryCards = [
        {
            label: "총 투자금",
            value: `${totals.totalInvested.toLocaleString()}원`,
            accent: "bg-slate-800 text-slate-100",
        },
        {
            label: "평가금액",
            value: `${totals.totalValue.toLocaleString()}원`,
            accent: "bg-slate-800 text-emerald-200",
        },
        {
            label: "평가손익",
            value: `${totals.totalPnL >= 0 ? "+" : ""}${totals.totalPnL.toLocaleString()}원`,
            accent:
                totals.totalPnL >= 0
                    ? "bg-emerald-900/40 text-emerald-200"
                    : "bg-sky-900/40 text-sky-200",
            helper: `${totals.totalReturnRate >= 0 ? "+" : ""}${totals.totalReturnRate.toFixed(
                2
            )}%`,
        },
        {
            label: "보유 종목",
            value: `${totals.positions}개`,
            accent: "bg-slate-800 text-slate-200",
        },
    ];

    return (
        <div className="space-y-6">
            <header className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-lg shadow-black/20 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">나의 포트폴리오</p>
                        <h1 className="text-2xl font-bold text-slate-50">{user.name}님의 보유 종목</h1>
                        <p className="text-sm text-slate-400">
                            회원 전용 포트폴리오에서 투자 비중과 손익을 자세히 확인하세요.
                        </p>
                    </div>

                    <div className="flex flex-col items-start gap-1 text-left md:items-end md:text-right">
                        <span className="text-xs uppercase tracking-wide text-slate-500">총 평가</span>
                        <span className="text-xl font-bold text-slate-50">
                            {totals.totalValue.toLocaleString()}원
                        </span>
                        <span
                            className={`text-sm font-semibold ${
                                totals.totalPnL >= 0 ? "text-rose-300" : "text-sky-300"
                            }`}
                        >
                            {totals.totalPnL >= 0 ? "+" : ""}
                            {totals.totalPnL.toLocaleString()}원 (
                            {totals.totalReturnRate >= 0 ? "+" : ""}
                            {totals.totalReturnRate.toFixed(2)}%)
                        </span>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {summaryCards.map((card) => (
                            <div
                                key={card.label}
                                className={`flex flex-col justify-between rounded-xl border border-slate-800 px-4 py-3 ${card.accent}`}
                            >
                                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                    {card.label}
                                </p>
                                <div className="mt-1 flex items-end gap-2">
                                    <span className="text-lg font-semibold leading-tight">
                                        {card.value}
                                    </span>
                                    {card.helper && (
                                        <span className="text-xs text-slate-300 leading-none">{card.helper}</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </header>

            <PortfolioTable
                items={holdings}
                detailed
                title="포트폴리오 상세 (평가금액/손익/비중)"
            />
        </div>
    );
};

export default PortfolioPage;