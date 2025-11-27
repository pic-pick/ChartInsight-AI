// src/components/charts/PriceChart.jsx
import React, { useEffect, useRef } from "react";
import {
    createChart,
    LineStyle,
    CrosshairMode,
} from "lightweight-charts";

/**
 * props 설명
 * ----------
 * candles:     [{ time: '2025-01-01', open, high, low, close, volume? }]
 * chartType:   "candlestick" | "line"   // 캔들/라인 전환용
 * isKorean:    true  -> 원 표시 (정수 + 콤마)
 *              false -> 달러 표시 (소수점 2자리 + 콤마)
 * forecastBand: 예측 밴드 데이터
 *   [{ time: '2025-01-01', lower, upper, mean }]
 *   - lower: 예측 하단 (Min)
 *   - upper: 예측 상단 (Max)
 *   - mean : 중앙값(Avg)
 */
const PriceChart = ({
                        candles = [],
                        chartType = "candlestick",
                        isKorean = false,
                        forecastBand = [],
                    }) => {
    const containerRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current || !candles.length) return;

        // 이미 만들어진 차트가 있으면 제거
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        // 가격 포맷: 원 / 달러
        const priceFormat = isKorean
            ? {
                type: "custom",
                minMove: 1,
                formatter: (price) =>
                    Math.round(price).toLocaleString("ko-KR"),
            }
            : {
                type: "custom",
                minMove: 0.01,
                formatter: (price) => {
                    if (price == null || isNaN(price)) return "";
                    return Number(price)
                        .toFixed(2)
                        .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                },
            };

        // 차트 생성
        const chart = createChart(containerRef.current, {
            width: containerRef.current.clientWidth,
            height: 340,
            layout: {
                background: { color: "#020617" }, // 진한 네이비
                textColor: "#cbd5f5",
            },
            grid: {
                vertLines: { color: "#0f172a" },
                horzLines: { color: "#0f172a" },
            },
            localization: {
                locale: "ko-KR",
                dateFormat: "yyyy-MM-dd",
            },
            timeScale: {
                borderColor: "#2764c6",
                timeVisible: false,
                secondsVisible: false,
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
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: {
                    labelVisible: true,
                    style: LineStyle.Dashed,
                    width: 1,
                },
                horzLine: {
                    labelVisible: true,
                },
            },
        });

        chartRef.current = chart;

        // 캔들 데이터 포맷 변환
        const seriesData = candles.map((c) => ({
            time: c.time, // ⚠ time은 "YYYY-MM-DD" 형식이어야 함
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        let priceSeries;

        // ==============
        // ① 가격 시리즈
        // ==============
        if (chartType === "line") {
            // 라인(Area) 차트
            priceSeries = chart.addAreaSeries({
                lineWidth: 2,
                topColor: "rgba(248, 113, 113, 0.4)",
                bottomColor: "rgba(15, 23, 42, 0.9)",
                lineColor: "#f87171",
                priceLineVisible: false,
                lastValueVisible: false,
                priceFormat,
            });

            priceSeries.setData(
                seriesData.map((d) => ({
                    time: d.time,
                    value: d.close,
                }))
            );
        } else {
            // 캔들 차트
            priceSeries = chart.addCandlestickSeries({
                upColor: "#ef4444", // 양봉 빨강
                downColor: "#3b82f6", // 음봉 파랑
                borderUpColor: "#ef4444",
                borderDownColor: "#3b82f6",
                wickUpColor: "#ef4444",
                wickDownColor: "#3b82f6",
                priceLineVisible: false,
                lastValueVisible: false,
                priceFormat,
            });

            priceSeries.setData(seriesData);
        }

        priceSeries.applyOptions({
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // ============================
        // ② 예측 팬(Fan) 영역 + 평균선
        // ============================
        if (forecastBand && forecastBand.length > 0) {
            const lastCandle = candles[candles.length - 1];

            if (lastCandle && typeof lastCandle.close === "number") {
                const lastTime = lastCandle.time;
                const lastClose = lastCandle.close;

                // (1) 위쪽 Max 영역: 현재가 → upper
                const upperArea = chart.addAreaSeries({
                    topColor: "rgba(34, 197, 94, 0.25)",   // 초록 영역
                    bottomColor: "rgba(34, 197, 94, 0.0)",
                    lineColor: "rgba(34, 197, 94, 0.9)",
                    lineWidth: 1,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                const upperAreaData = [
                    { time: lastTime, value: lastClose },
                    ...forecastBand.map((p) => ({
                        time: p.time,
                        value: p.upper,
                    })),
                ];
                upperArea.setData(upperAreaData);

                // (2) 아래 Min 영역: 현재가 → lower
                const lowerArea = chart.addAreaSeries({
                    topColor: "rgba(248, 113, 113, 0.0)",
                    bottomColor: "rgba(248, 113, 113, 0.25)", // 붉은 영역
                    lineColor: "rgba(248, 113, 113, 0.9)",
                    lineWidth: 1,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                const lowerAreaData = [
                    { time: lastTime, value: lastClose },
                    ...forecastBand.map((p) => ({
                        time: p.time,
                        value: p.lower,
                    })),
                ];
                lowerArea.setData(lowerAreaData);

                // (3) 평균선: 현재가 → mean
                const meanSeries = chart.addLineSeries({
                    color: "rgba(59, 130, 246, 0.9)", // 파란 평균선
                    lineWidth: 2,
                    lineStyle: LineStyle.Solid,
                    priceLineVisible: false,
                    lastValueVisible: false,
                });

                const meanData = [
                    { time: lastTime, value: lastClose },
                    ...forecastBand.map((p) => ({
                        time: p.time,
                        value: p.mean,
                    })),
                ];
                meanSeries.setData(meanData);

                // (4) 마지막 예측 지점에 Max / Avg / Min 라벨
                const lastForecast = forecastBand[forecastBand.length - 1];

                const formatPrice = (value) =>
                    isKorean
                        ? Math.round(value).toLocaleString("ko-KR")
                        : Number(value)
                            .toFixed(2)
                            .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                upperArea.createPriceLine({
                    price: lastForecast.upper,
                    color: "rgba(34, 197, 94, 1)",
                    lineWidth: 1,
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: true,
                    title: `Max ${formatPrice(lastForecast.upper)}`,
                });

                meanSeries.createPriceLine({
                    price: lastForecast.mean,
                    color: "rgba(59, 130, 246, 1)",
                    lineWidth: 1,
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: true,
                    title: `Avg ${formatPrice(lastForecast.mean)}`,
                });

                lowerArea.createPriceLine({
                    price: lastForecast.lower,
                    color: "rgba(248, 113, 113, 1)",
                    lineWidth: 1,
                    lineStyle: LineStyle.Solid,
                    axisLabelVisible: true,
                    title: `Min ${formatPrice(lastForecast.lower)}`,
                });
            }
        }

        // ============================
        // ③ 마지막 종가 기준 "현재가" 점선
        // ============================
        const last = candles[candles.length - 1];
        if (last && typeof last.close === "number") {
            const priceValue = isKorean
                ? Math.round(last.close)
                : Number(last.close.toFixed(2));

            priceSeries.createPriceLine({
                price: priceValue,
                color: "#ef4444",
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,
                title: "현재가",
            });
        }

        // ============================
        // ④ 리사이즈 대응
        // ============================
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
    }, [candles, chartType, isKorean, forecastBand]);

    // 데이터 없을 때 플레이스홀더
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