import apiClient from "./client";

// 타입 참고용 주석: 실제로는 JS에서 자유롭게 사용
// summary: { symbol, name, currentPrice, changeRate, volatility, riskScore, comment }

export const fetchStockSummary = async (symbol) => {
    const res = await apiClient.get(`/stocks/${symbol}/summary`);
    return res.data;
};

export const fetchStockCandles = async (symbol, period = "6mo") => {
    const res = await apiClient.get(`/stocks/${symbol}/ohlcv`, {
        params: { period },
    });
    return res.data; // [{time, open, high, low, close, volume}]
};

export const fetchStockDecisionInsight = async (symbol) => {
    const res = await apiClient.get(`/stocks/${symbol}/decision-insight`);
    return res.data;
};