# Recent Additions Overview

This project recently gained richer AI-driven decision insights and dashboard UI updates:

- **Indicator expansion:** The analysis service now computes MACD, RSI(14), Bollinger bands, volatility (HV20/ATR), drawdown, volume ratios, 투자심리도, and VKOSPI-based sentiment to power tailored narratives and alerts.
- **Narrative and scoring:** Confidence/volatility scores blend trend, momentum, volatility, and forecast band width, while risk labels, quick notes, and alert lists translate the indicators into natural-language guidance.
- **API surface:** A `/stocks/{symbol}/decision-insight` endpoint exposes the calculated scores, oscillators, sentiment details, and ARIMA band summaries for frontend consumption.
- **Frontend AI panel:** The AI 분석 패널 now fetches live insights, showing MACD/RSI/volume/sentiment cards, refreshed risk & band briefings, and symbol-aware monitoring points instead of static dummy text.

Use this document as a quick reference to understand what the latest AI insight enhancements include.
