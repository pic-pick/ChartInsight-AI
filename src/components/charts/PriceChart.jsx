// src/components/charts/PriceChart.jsx
import React, { useEffect, useRef } from "react";
import { createChart, LineStyle, CrosshairMode } from "lightweight-charts";

/**
 * candles: [{ time: '2025-01-01', open, high, low, close, volume? }]
 * chartType: "candlestick" | "line"
 */
const PriceChart = ({ candles = [], chartType = "candlestick" }) => {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !candles.length) return;

        // 기존 차트 제거
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 340,
            layout: {
                background: { color: "#020617" },
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
                scaleMargins: { top: 0.1, bottom: 0.1 },
            },
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: {
                    time: true,
                    price: false,
                },
                mouseWheel: true,
                pinch: true,
            },

            // 🔥 여기 수정됨
            crosshair: {
                mode: 0,
                vertLine: {
                    labelVisible: false, // 마우스가 종가 라벨에 달라붙지 않음
                },
                horzLine: {
                    labelVisible: false,
                },
            },
        });
        chartRef.current = chart;

        const seriesData = candles.map((c) => ({
            time: c.time,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        let series;

        if (chartType === "line") {
            // 🔴 라인(에어리어) 차트 – 빨간색
            series = chart.addAreaSeries({
                lineWidth: 2,
                topColor: "rgba(248, 113, 113, 0.4)",   // red-400
                bottomColor: "rgba(15, 23, 42, 0.9)",   // slate-900
                lineColor: "#f87171",                   // red-400
                priceLineVisible: false,
                lastValueVisible: false,
            });

            series.setData(
                seriesData.map((d) => ({
                    time: d.time,
                    value: d.close,
                }))
            );
        } else {
            // 🔴 양봉=빨강, 음봉=파랑
            series = chart.addCandlestickSeries({
                upColor: "#ef4444",        // red-500
                downColor: "#3b82f6",      // blue-500
                borderUpColor: "#ef4444",
                borderDownColor: "#3b82f6",
                wickUpColor: "#ef4444",
                wickDownColor: "#3b82f6",
                priceLineVisible: false,
                lastValueVisible: false,
            });

            series.setData(seriesData);
        }

        // 기본 last value 라인/라벨 끄기
        series.applyOptions({
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // 🔴 현재가: 빨간 점선 + "현재가" 라벨
        const last = candles[candles.length - 1];
        if (last && typeof last.close === "number") {
            series.createPriceLine({
                price: last.close,
                color: "#ef4444",
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: "현재가",
            });
        }

        const handleResize = () => {
            if (containerRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: containerRef.current.clientWidth,
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
    }, [candles, chartType]);

    if (!candles.length) {
        return (
            <div className="flex h-80 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-sm text-slate-400">
                차트 데이터를 불러오는 중이거나, 데이터가 없습니다.
            </div>
        );
    }

    return (
        <div className="h-full w-full">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
};

export default PriceChart;