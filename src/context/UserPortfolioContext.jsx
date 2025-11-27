import React, { createContext, useContext, useMemo } from "react";

const DEFAULT_USER = {
    id: "demo-user",
    name: "데모 회원",
    tier: "Standard",
    email: "demo@example.com",
};

const DEFAULT_HOLDINGS = [
    {
        symbol: "005930",
        displayName: "삼성전자",
        market: "KRX",
        currentPrice: 72500,
        avgPrice: 68000,
        shares: 45,
        changeRate: 1.85,
        volatilityScore: 32,
        riskLevel: "낮음",
    },
    {
        symbol: "000660",
        displayName: "SK하이닉스",
        market: "KRX",
        currentPrice: 171500,
        avgPrice: 158000,
        shares: 12,
        changeRate: -0.72,
        volatilityScore: 45,
        riskLevel: "보통",
    },
    {
        symbol: "TSLA",
        displayName: "Tesla",
        market: "US",
        currentPrice: 245.2,
        avgPrice: 230.4,
        shares: 6,
        changeRate: 2.1,
        volatilityScore: 68,
        riskLevel: "보통",
    },
    {
        symbol: "AAPL",
        displayName: "Apple",
        market: "US",
        currentPrice: 212.4,
        avgPrice: 198.3,
        shares: 8,
        changeRate: 0.9,
        volatilityScore: 41,
        riskLevel: "낮음",
    },
];

const UserPortfolioContext = createContext({
    user: DEFAULT_USER,
    holdings: DEFAULT_HOLDINGS,
    totals: {},
});

export const UserPortfolioProvider = ({ children }) => {
    const enrichedHoldings = useMemo(() => {
        const rawTotals = DEFAULT_HOLDINGS.reduce(
            (acc, h) => {
                const invested = h.avgPrice * h.shares;
                const marketValue = h.currentPrice * h.shares;
                acc.totalInvested += invested;
                acc.totalValue += marketValue;
                return acc;
            },
            { totalInvested: 0, totalValue: 0 }
        );

        return DEFAULT_HOLDINGS.map((h) => {
            const invested = h.avgPrice * h.shares;
            const marketValue = h.currentPrice * h.shares;
            const pnl = marketValue - invested;
            const returnRate = invested ? (pnl / invested) * 100 : 0;
            const weight = rawTotals.totalValue
                ? (marketValue / rawTotals.totalValue) * 100
                : 0;

            return {
                ...h,
                invested,
                marketValue,
                pnl,
                returnRate,
                weight,
            };
        });
    }, []);

    const totals = useMemo(() => {
        const totalInvested = enrichedHoldings.reduce(
            (sum, h) => sum + h.invested,
            0
        );
        const totalValue = enrichedHoldings.reduce(
            (sum, h) => sum + h.marketValue,
            0
        );
        const totalPnL = totalValue - totalInvested;
        const totalReturnRate = totalInvested
            ? (totalPnL / totalInvested) * 100
            : 0;

        return {
            totalInvested,
            totalValue,
            totalPnL,
            totalReturnRate,
            positions: enrichedHoldings.length,
        };
    }, [enrichedHoldings]);

    return (
        <UserPortfolioContext.Provider
            value={{ user: DEFAULT_USER, holdings: enrichedHoldings, totals }}
        >
            {children}
        </UserPortfolioContext.Provider>
    );
};

export const useUserPortfolio = () => useContext(UserPortfolioContext);

export default UserPortfolioContext;
