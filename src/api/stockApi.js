// src/api/stockApi.js
import apiClient from "./client";

// 종목 요약 정보 (현재가, 변동률, 리스크 등)
export const fetchStockSummary = async (symbol) => {
    if (!symbol) throw new Error("symbol is required");
    const res = await apiClient.get(`/stocks/${symbol}/summary`);
    return res.data;
};

// 캔들 데이터 (차트용)

// 타임프레임: "D"(일봉) | "W"(주봉) | "M"(월봉) | "Y"(년봉)
export async function fetchStockCandles(symbol, timeframe = "D") {
    const res = await apiClient.get(
        `/stocks/${encodeURIComponent(symbol)}/ohlcv`,
        {
            params: { tf: timeframe },
        }
    );
    return res.data;
}

// 의사결정용 수치형 인사이트 (스코어, 지표들)
export const fetchStockDecisionInsight = async (symbol) => {
    if (!symbol) throw new Error("symbol is required");
    const res = await apiClient.get(`/stocks/${symbol}/decision-insight`);
    return res.data;
};

// LLM 기반 자연어 AI 분석
export const fetchAiAnalysis = async (symbol) => {
    if (!symbol) throw new Error("symbol is required");
    const res = await apiClient.get(`/stocks/${symbol}/ai-analysis`);
    return res.data;
};

// 종목 검색 (자동완성)
export const searchStocks = async (q) => {
    if (!q || !q.trim()) return [];
    const res = await apiClient.get("/stocks/search", {
        params: { q },
    });
    return res.data; // [{ symbol, name, market }]
};


export async function fetchForecastBand(symbol, horizonDays = 63) {
    // symbol 은 이미 005930.KS / AAPL 같은 yfinance 심볼이라고 가정
    const res = await apiClient.get(`/forecast/${symbol}`, {
        params: { horizon: horizonDays },
    });
    return res.data; // [{time, lower, upper, mean}, ...]
}

export async function fetchForecastAccuracy(symbol, holdoutDays = 63) {
    const res = await apiClient.get(`/forecast/${symbol}/accuracy`, {
        params: { holdout_days: holdoutDays },
    });
    return res.data; // {mae, rmse, mape, ...}
}
