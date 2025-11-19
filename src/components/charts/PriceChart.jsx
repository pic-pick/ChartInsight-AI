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
 *   - lower: 예측 하단
 *   - upper: 예측 상단
 *   - mean : 중앙값(회귀직선)
 */
const PriceChart = ({
                        candles = [],
                        chartType = "candlestick",
                        isKorean = false,
                        forecastBand = [],
                    }) => {
    // 실제 차트를 붙일 DOM 요소
    const containerRef = useRef(null);
    // lightweight-charts 에서 만든 chart 인스턴스를 기억해 두는 ref
    const chartRef = useRef(null);

    useEffect(() => {
        // DOM이 아직 없거나, 데이터가 하나도 없으면 차트 만들지 않음
        if (!containerRef.current || !candles.length) return;

        // 이미 만들어진 차트가 있으면 먼저 제거 (메모리/이벤트 정리)
        if (chartRef.current) {
            chartRef.current.remove();
            chartRef.current = null;
        }

        // 가격 포맷: 원(정수 + 콤마) / 달러(소수 + 콤마)
        const priceFormat = isKorean
            ? {
                type: "custom",
                minMove: 1, // 1원 단위
                formatter: (price) =>
                    Math.round(price).toLocaleString("ko-KR"), // 예: 96,500
            }
            : {
                type: "custom",
                minMove: 0.01, // 0.01 단위
                formatter: (price) => {
                    if (price == null || isNaN(price)) return "";
                    // 소수점 둘째 자리까지 + 천 단위 콤마
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
                background: { color: "#020617" }, // 아주 짙은 남색(다크모드)
                textColor: "#cbd5f5",             // 축/라벨 글자색
            },
            grid: {
                vertLines: { color: "#0f172a" },  // 세로 그리드
                horzLines: { color: "#0f172a" },  // 가로 그리드
            },
            localization: {
                locale: "ko-KR",
                // 크로스헤어/툴팁/축에서 쓰는 날짜 포맷
                dateFormat: "yyyy-MM-dd",
            },
            timeScale: {
                borderColor: "#2764c6",   // 아래 타임축 경계선 색
                timeVisible: false,       // 시/분/초 숨기고 날짜만
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: "#1e293b",
                scaleMargins: { top: 0.1, bottom: 0.1 }, // 위/아래 여백
            },
            // 마우스 스크롤/드래그로 차트 이동 허용
            handleScroll: {
                mouseWheel: true,
                pressedMouseMove: true,
                horzTouchDrag: true,
                vertTouchDrag: true,
            },
            handleScale: {
                axisPressedMouseMove: {
                    time: true,   // 아래 시간축을 드래그해서 확대/축소 허용
                    price: false, // 오른쪽 가격축은 드래그 확대/축소 금지
                },
                mouseWheel: true, // 휠로 전체 스케일 조정은 허용
                pinch: true,
            },
            crosshair: {
                // 마우스 위치 그대로 따라다니도록 (자석 모드 X)
                mode: CrosshairMode.Normal,
                // 세로선(시간) 라벨 → 아래에 날짜 박스가 뜸
                vertLine: {
                    labelVisible: true,
                    style: LineStyle.Dashed,
                    width: 1,
                },
                // 가로선(가격) 라벨 → 오른쪽 가격 박스
                horzLine: {
                    labelVisible: true,
                },
            },
        });

        // chartRef에 저장해서 나중에 clean-up 때 사용
        chartRef.current = chart;

        // lightweight-charts에서 요구하는 포맷으로 변환
        const seriesData = candles.map((c) => ({
            time: c.time, // "YYYY-MM-DD"
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
        }));

        let priceSeries;

        // ============================
        // ① 가격 시리즈 (캔들/라인)
        // ============================
        if (chartType === "line") {
            // 라인(면적) 차트
            priceSeries = chart.addAreaSeries({
                lineWidth: 2,
                topColor: "rgba(248, 113, 113, 0.4)",      // 위쪽 영역 색
                bottomColor: "rgba(15, 23, 42, 0.9)",      // 아래쪽 영역 색
                lineColor: "#f87171",                       // 라인 색 (빨강)
                priceLineVisible: false,
                lastValueVisible: false,
                priceFormat, // 라인 차트에도 가격 포맷 적용
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
                upColor: "#ef4444",       // 양봉 빨강
                downColor: "#3b82f6",     // 음봉 파랑
                borderUpColor: "#ef4444",
                borderDownColor: "#3b82f6",
                wickUpColor: "#ef4444",
                wickDownColor: "#3b82f6",
                priceLineVisible: false,  // 기본 마지막값 라인 숨김
                lastValueVisible: false,  // 기본 마지막값 라벨 숨김
                priceFormat,              // 캔들 차트에도 가격 포맷 적용
            });

            priceSeries.setData(seriesData);
        }

        // 혹시 위에서 옵션이 덮여쓰일 수 있으니 안전하게 한 번 더 적용
        priceSeries.applyOptions({
            priceLineVisible: false,
            lastValueVisible: false,
        });

        // ============================
        // ② 예측 밴드 시리즈 (있을 때만)
        // ============================
        if (forecastBand && forecastBand.length > 0) {
            // 상단/하단은 점선, 중앙선은 실선으로 표시
            const upperSeries = chart.addLineSeries({
                color: "rgba(56, 189, 248, 0.9)",  // 밝은 파랑
                lineWidth: 1,
                lineStyle: LineStyle.Dotted,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            const lowerSeries = chart.addLineSeries({
                color: "rgba(56, 189, 248, 0.9)",
                lineWidth: 1,
                lineStyle: LineStyle.Dotted,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            const meanSeries = chart.addLineSeries({
                color: "rgba(56, 189, 248, 0.5)",  // 약간 연한 실선
                lineWidth: 2,
                lineStyle: LineStyle.Solid,
                lastValueVisible: false,
                priceLineVisible: false,
            });

            upperSeries.setData(
                forecastBand.map((p) => ({ time: p.time, value: p.upper }))
            );
            lowerSeries.setData(
                forecastBand.map((p) => ({ time: p.time, value: p.lower }))
            );
            meanSeries.setData(
                forecastBand.map((p) => ({ time: p.time, value: p.mean }))
            );
        }

        // ============================
        // ③ 마지막 종가 기준 "현재가" 점선
        // ============================
        const last = candles[candles.length - 1];
        if (last && typeof last.close === "number") {
            const priceValue = isKorean
                ? Math.round(last.close)        // 원: 정수
                : Number(last.close.toFixed(2)); // 달러: 소수 2자리

            priceSeries.createPriceLine({
                price: priceValue,
                color: "#ef4444",               // 빨간 점선
                lineWidth: 1,
                lineStyle: LineStyle.Dashed,
                axisLabelVisible: true,         // 오른쪽에 "현재가" 라벨
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

        // useEffect clean-up
        return () => {
            window.removeEventListener("resize", handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
        };
        // forecastBand가 바뀌어도 차트를 다시 그리도록 dependency에 포함
    }, [candles, chartType, isKorean, forecastBand]);

    // 데이터가 전혀 없을 때 보여줄 플레이스홀더
    if (!candles.length) {
        return (
            <div className="flex h-80 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-sm text-slate-400">
                차트 데이터를 불러오는 중이거나, 데이터가 없습니다.
            </div>
        );
    }

    // 실제 차트가 렌더링될 컨테이너
    return (
        <div className="h-full w-full">
            <div ref={containerRef} className="w-full h-full" />
        </div>
    );
};

export default PriceChart;