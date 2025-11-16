// src/components/charts/PriceChart.jsx
import React, { useEffect, useRef } from "react";
import { createChart, LineStyle } from "lightweight-charts";

/**
 * props:
 *  - candles: [{ time: '2025-01-01', open, high, low, close }]
 *  - sma20, sma60: [{ time, value }]
 *  - forecastBand: { upper: number, lower: number, endTime?: string }
 *
 *  특징:
 *   - 양봉 = 빨강 / 음봉 = 파랑
 *   - 예측 밴드 = 기간 전체 기준 상단/하단 점선
 *   - 마우스 크로스헤어 / 가격 따라다니는 효과 제거
 */
const PriceChart = ({
                        candles = [],
                        sma20 = [],
                        sma60 = [],
                        forecastBand = null,
                    }) => {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;
        if (!candles.length) return;

        // 이전 차트 제거 (React StrictMode 대비)
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight || 340,
            layout: {
                background: { color: "#020617" }, // bg-slate-950
                textColor: "#cbd5f5",
            },
            grid: {
                vertLines: { color: "#0f172a" },
                horzLines: { color: "#0f172a" },
            },
            timeScale: {
                borderColor: "#1e293b",
            },
            rightPriceScale: {
                borderColor: "#1e293b",
            },
            // ✅ 마우스 이끌리는 크로스헤어 비활성화
            crosshair: {
                vertLine: {
                    visible: false,
                },
                horzLine: {
                    visible: false,
                },
            },
        });

        chartRef.current = chart;

        // ✅ 양봉 = 빨강, 음봉 = 파랑
        const candleSeries = chart.addCandlestickSeries({
            upColor: "#ef4444", // red-500
            downColor: "#3b82f6", // blue-500
            borderUpColor: "#ef4444",
            borderDownColor: "#3b82f6",
            wickUpColor: "#ef4444",
            wickDownColor: "#3b82f6",
            priceLineVisible: false, // 현재가 수평선도 제거(원하면 true로 변경)
        });

        candleSeries.setData(
            candles.map((c) => ({
                time: c.time,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
            }))
        );

        // 이동평균선들
        if (sma20.length) {
            const sma20Series = chart.addLineSeries({
                color: "#38bdf8", // sky-300
                lineWidth: 2,
            });
            sma20Series.setData(sma20);
        }

        if (sma60.length) {
            const sma60Series = chart.addLineSeries({
                color: "#facc15", // yellow-400
                lineWidth: 2,
            });
            sma60Series.setData(sma60);
        }

        // ✅ 기간 기준 예측 밴드 (상단/하단 한 번에)
        if (forecastBand && forecastBand.upper && forecastBand.lower) {
            const lastCandle = candles[candles.length - 1];

            // 예측 끝 시점이 따로 넘어오면 그걸 쓰고, 아니면 마지막 날짜 기준으로 적당히 한 칸 뒤로
            const forecastEndTime =
                forecastBand.endTime || lastCandle.time;

            // 상단/하단은 "현재 종가 → 예측 끝 시점" 이렇게 두 점으로 연결
            const upperData = [
                { time: lastCandle.time, value: lastCandle.close },
                { time: forecastEndTime, value: forecastBand.upper },
            ];

            const lowerData = [
                { time: lastCandle.time, value: lastCandle.close },
                { time: forecastEndTime, value: forecastBand.lower },
            ];

            const upperSeries = chart.addLineSeries({
                color: "#22c55e", // 연한 초록
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
            });

            const lowerSeries = chart.addLineSeries({
                color: "#fb923c", // 연한 주황
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                lastValueVisible: false,
                priceLineVisible: false,
                crosshairMarkerVisible: false,
            });

            upperSeries.setData(upperData);
            lowerSeries.setData(lowerData);
        }

        const handleResize = () => {
            if (containerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
    }, [candles, sma20, sma60, forecastBand]);

    if (!candles.length) {
        return <div ref={containerRef} className="w-full h-full" />;
    }

    return <div ref={containerRef} className="w-full h-full" />;
};

export default PriceChart;