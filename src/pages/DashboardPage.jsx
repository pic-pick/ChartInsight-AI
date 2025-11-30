// src/pages/DashboardPage.jsx
import React, { useState, useMemo, useEffect } from "react";
import PriceChart from "../components/charts/PriceChart";
import PortfolioTable from "../components/portfolio/PortfolioTable";
import Ai분석패널 from "../components/analysis/AiAnalysisPanel";
import SearchBar from "../components/SearchBar";
import {
    fetchForecastBand,
    fetchForecastAccuracy,
    fetchStockCandles,
} from "../api/stockApi";
import { useUserPortfolio } from "../context/UserPortfolioContext";

const DashboardPage = () => {
    const { holdings } = useUserPortfolio();
    const [종목코드, 종목코드설정] = useState("005930");
    const [종목이름, 종목이름설정] = useState("삼성전자");
    const [시장구분, 시장구분설정] = useState("KRX");

    const [캔들목록, 캔들설정] = useState([]);
    const [예측밴드, 예측밴드설정] = useState([]); // ✅ 예측 밴드
    const [예측개월수, 예측개월수설정] = useState(3); // 1~6개월 사이 선택
    const [정확도, 정확도설정] = useState(null);
    const [보기모드, 보기모드설정] = useState("chart"); // "chart" | "ai"

    // 기간: 일 / 주 / 월 / 년
    const [차트주기, 차트주기설정] = useState("D"); // "D" | "W" | "M" | "Y"
    const [차트유형, 차트유형설정] = useState("candlestick"); // "candlestick" | "line"

    const [캔들로딩중, 캔들로딩설정] = useState(false);
    const [캔들오류, 캔들오류설정] = useState(null);
    const [예측로딩중, 예측로딩설정] = useState(false);
    const [예측오류, 예측오류설정] = useState(null);
    const [정확도로딩중, 정확도로딩설정] = useState(false);
    const [정확도오류, 정확도오류설정] = useState(null);

    // 마지막 캔들 기준 현재가
    const 현재가 = useMemo(
        () => (캔들목록.length ? 캔들목록[캔들목록.length - 1].close : null),
        [캔들목록]
    );

    const 국내시장여부 = useMemo(
        () =>
            ["KRX", "KS", "KQ", "KOSPI", "KOSDAQ"].includes(
                (시장구분 || "").toUpperCase()
            ),
        [시장구분]
    );

    const 현재가표시 = useMemo(() => {
        if (현재가 == null) return "-";
        if (국내시장여부) {
            return `${Number(현재가).toLocaleString("ko-KR")}원`;
        }
        return `$${Number(현재가).toFixed(2)}`;
    }, [현재가, 국내시장여부]);

    // 외부 서비스용 심볼 포맷 변환
    const 외부심볼변환 = (sym, mkt) => {
        if (!sym) return "";

        const upper = (mkt || "").toUpperCase();

        if (upper === "US") return sym; // 미국
        if (["KS", "KOSPI", "KRX"].includes(upper)) return `${sym}.KS`; // 한국 KOSPI / KRX
        if (["KQ", "KOSDAQ"].includes(upper)) return `${sym}.KQ`; // 한국 KOSDAQ

        return sym;
    };

    const 개월수를영업일로 = (months) => Math.max(1, Math.round(months * 21));

    // ✅ 종목/시장/차트주기 변경 시 자동 캔들 로딩
    useEffect(() => {
        if (!종목코드) return;

        const 캔들불러오기 = async () => {
            const providerSymbol = 외부심볼변환(종목코드, 시장구분);
            const cacheKey = `candles:${providerSymbol}:${차트주기}`;

            try {
                // 즉시 보여줄 캐시
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    캔들설정(JSON.parse(cached));
                }

                캔들로딩설정(true);
                캔들오류설정(null);

                const data = await fetchStockCandles(providerSymbol, 차트주기);
                캔들설정(data || []);
                localStorage.setItem(cacheKey, JSON.stringify(data || []));
            } catch (err) {
                console.error("캔들 데이터 로딩 오류:", err);
                캔들오류설정("차트 데이터를 불러오는 중 문제가 발생했습니다.");
                if (!캔들목록.length) {
                    캔들설정([]);
                }
            } finally {
                캔들로딩설정(false);
            }
        };

        캔들불러오기();
    }, [종목코드, 시장구분, 차트주기]);

    const 차트기간옵션 = [
        { value: "D", label: "일" },
        { value: "W", label: "주" },
        { value: "M", label: "월" },
        { value: "Y", label: "년" },
    ];

    const 예측범위옵션 = [
        { value: 1, label: "1개월" },
        { value: 3, label: "3개월" },
        { value: 6, label: "6개월" },
    ];

    useEffect(() => {
        if (!종목코드) return;

        const 예측불러오기 = async () => {
            const providerSymbol = 외부심볼변환(종목코드, 시장구분);
            const horizonDays = 개월수를영업일로(예측개월수);
            const cacheKey = `forecast:${providerSymbol}:${horizonDays}`;

            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    예측밴드설정(JSON.parse(cached));
                }

                예측로딩설정(true);
                예측오류설정(null);

                const data = await fetchForecastBand(providerSymbol, horizonDays);
                예측밴드설정(data || []);
                localStorage.setItem(cacheKey, JSON.stringify(data || []));
            } catch (err) {
                console.error("예측 밴드 로딩 오류:", err);
                예측오류설정("예측 밴드를 불러오는 중 문제가 발생했습니다.");
                if (!예측밴드.length) {
                    예측밴드설정([]);
                }
            } finally {
                예측로딩설정(false);
            }
        };

        예측불러오기();
    }, [종목코드, 시장구분, 예측개월수]);

    useEffect(() => {
        if (!종목코드) return;

        const 정확도불러오기 = async () => {
            const providerSymbol = 외부심볼변환(종목코드, 시장구분);
            const holdoutDays = 개월수를영업일로(예측개월수);
            const cacheKey = `accuracy:${providerSymbol}:${holdoutDays}`;

            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    정확도설정(JSON.parse(cached));
                }

                정확도로딩설정(true);
                정확도오류설정(null);

                const metrics = await fetchForecastAccuracy(providerSymbol, holdoutDays);
                정확도설정(metrics);
                localStorage.setItem(cacheKey, JSON.stringify(metrics || {}));
            } catch (err) {
                console.error("정확도 검증 오류:", err);
                정확도오류설정("최근 홀드아웃 예측 정확도를 계산하지 못했습니다.");
                if (!정확도) {
                    정확도설정(null);
                }
            } finally {
                정확도로딩설정(false);
            }
        };

        정확도불러오기();
    }, [종목코드, 시장구분, 예측개월수]);

    const 등락률 = useMemo(() => {
        if (!캔들목록 || 캔들목록.length < 2) return null;
        const prevClose = 캔들목록[캔들목록.length - 2]?.close;
        if (!prevClose) return null;
        return ((현재가 - prevClose) / prevClose) * 100;
    }, [캔들목록, 현재가]);

    const 등락배지클래스 = 등락률 != null && 등락률 >= 0
        ? "bg-rose-500/15 text-rose-200"
        : "bg-sky-500/15 text-sky-200";

    return (
        <div className="text-slate-100">
            {/* 🔹 종목 헤더 + 우측 컨트롤 세로 정렬 */}
            <section className="mb-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-3 shadow-lg shadow-black/20 sm:p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-50">{종목이름 || 종목코드}</h1>
                            <span className="rounded-full bg-slate-900 px-2 py-1 text-[11px] font-semibold text-sky-300">
                                {종목코드}
                            </span>
                            {시장구분 && (
                                <span className="rounded-full bg-slate-800 px-2 py-1 text-[11px] font-semibold text-slate-200 uppercase">
                                    {시장구분}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-3xl font-extrabold text-slate-50">
                                {현재가표시 !== "-" ? 현재가표시 : "가격 정보 없음"}
                            </span>
                            {등락률 != null && (
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${등락배지클래스}`}>
                                    {`${등락률 >= 0 ? "+" : ""}${등락률.toFixed(2)}%`}
                                </span>
                            )}
                            {예측개월수 && (
                                <span className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-slate-300">
                                    미래 {예측개월수}개월 밴드 추적
                                </span>
                            )}
                        </div>
                        <div className="text-[12px] text-slate-400">
                            최근 종가 기준으로 예측 밴드와 AI 분석을 제공합니다.
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 md:w-80 md:items-end">
                        <div className="inline-flex w-full justify-end rounded-full border border-slate-800 bg-slate-900/80 p-1 md:w-auto">
                            <button
                                type="button"
                                onClick={() => 보기모드설정("chart")}
                                className={`px-3 py-1.5 text-xs rounded-full transition ${
                                    보기모드 === "chart"
                                        ? "bg-sky-500 text-white"
                                        : "text-slate-300 hover:text-slate-100"
                                }`}
                            >
                                차트 보기
                            </button>
                            <button
                                type="button"
                                onClick={() => 보기모드설정("ai")}
                                className={`px-3 py-1.5 text-xs rounded-full transition ${
                                    보기모드 === "ai"
                                        ? "bg-sky-500 text-white"
                                        : "text-slate-300 hover:text-slate-100"
                                }`}
                            >
                                AI 분석 대시보드
                            </button>
                        </div>

                        <div className="w-full">
                            <SearchBar
                                value={종목코드}
                                onSelect={(sym, item) => {
                                    console.log("SearchBar에서 선택된 종목:", sym, item);
                                    종목코드설정(sym);
                                    시장구분설정(item.market);
                                    종목이름설정(item.name || sym);
                                    // 선택과 동시에 useEffect가 자동으로 차트 리로드
                                }}
                                placeholder="종목명 또는 코드 검색"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* 🔹 차트 / AI 패널 */}
            <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 px-5 py-4 shadow-md">
                {/* 카드 상단 바: 선택된 종목 + 기간 / 차트 타입 버튼 */}
                <div className="mb-2 flex flex-col gap-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span>선택된 종목</span>
                        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-sky-300">
                            {종목코드}
                        </span>
                    </div>

                    {보기모드 === "chart" && (
                        <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
                            {/* 기간 버튼: 일 / 주 / 월 / 년 */}
                            <div className="flex items-center gap-1">
                                {차트기간옵션.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => 차트주기설정(p.value)} // ✅ 클릭 즉시 useEffect로 차트 갱신
                                        className={`px-2 py-1 text-[11px] rounded-full border transition ${
                                            차트주기 === p.value
                                                ? "bg-sky-500/90 border-sky-400 text-white"
                                                : "border-slate-700 text-slate-300 hover:border-slate-500"
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>

                            {/* 예측 범위 (최대 6개월) */}
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                <span className="text-slate-500">예측 범위</span>
                                {예측범위옵션.map((range) => (
                                    <button
                                        key={range.value}
                                        type="button"
                                        onClick={() => 예측개월수설정(range.value)}
                                        className={`px-2 py-1 rounded-full border transition ${
                                            예측개월수 === range.value
                                                ? "bg-emerald-600/80 border-emerald-400 text-white"
                                                : "border-slate-700 text-slate-300 hover:border-slate-500"
                                        }`}
                                    >
                                        {range.label}
                                    </button>
                                ))}
                                <span className="text-[10px] text-slate-500">
                                    {예측로딩중
                                        ? "예측 업데이트 중..."
                                        : `미래 ${예측개월수}개월 밴드`}
                                </span>
                                {예측오류 && (
                                    <span className="text-[10px] text-red-400">
                                        {예측오류}
                                    </span>
                                )}
                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                    {정확도로딩중 ? (
                                        <span>정확도 검증 중...</span>
                                    ) : 정확도오류 ? (
                                        <span className="text-red-400">{정확도오류}</span>
                                    ) : 정확도 ? (
                                        <>
                                            <span className="text-slate-400">MAPE</span>
                                            <span className="font-semibold text-emerald-300">
                                                {정확도.mape?.toFixed(2)}%
                                            </span>
                                            <span className="text-slate-500">· RMSE</span>
                                            <span className="font-semibold text-emerald-300">
                                                {정확도.rmse?.toFixed(2)}
                                            </span>
                                        </>
                                    ) : null}
                                </div>
                            </div>

                            {/* 캔들 / 라인 타입 */}
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => 차트유형설정("candlestick")}
                                    className={`px-2 py-1 text-[11px] rounded-full border transition ${
                                        차트유형 === "candlestick"
                                            ? "bg-slate-800 border-sky-400 text-sky-300"
                                            : "border-slate-700 text-slate-300 hover:border-slate-500"
                                    }`}
                                >
                                    캔들
                                </button>
                                <button
                                    type="button"
                                    onClick={() => 차트유형설정("line")}
                                    className={`px-2 py-1 text-[11px] rounded-full border transition ${
                                        차트유형 === "line"
                                            ? "bg-slate-800 border-sky-400 text-sky-300"
                                            : "border-slate-700 text-slate-300 hover:border-slate-500"
                                    }`}
                                >
                                    라인
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className={보기모드 === "chart" ? "h-[300px] sm:h-[360px]" : ""}>
                    {보기모드 === "chart" ? (
                        <div className="h-full rounded-xl bg-slate-950/80 overflow-hidden">
                            {캔들로딩중 ? (
                                <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                    차트 데이터를 불러오는 중입니다...
                                </div>
                            ) : 캔들오류 ? (
                                <div className="flex h-full items-center justify-center text-xs text-red-400">
                                    {캔들오류}
                                </div>
                            ) : 캔들목록.length === 0 ? (
                                <div className="flex h-full items-center justify-center text-xs text-slate-500">
                                    아직 차트 데이터가 없습니다. 상단에서 종목을 검색해 주세요.
                                </div>
                            ) : (
                                <PriceChart
                                    candles={캔들목록}
                                    chartType={차트유형}
                                    isKorean={국내시장여부}
                                    forecastBand={예측밴드}
                                />
                            )}
                        </div>
                    ) : (
                        <Ai분석패널 symbol={종목코드} market={시장구분} />
                    )}
                </div>
            </section>

            {/* 🔹 포트폴리오 테이블 */}
            <PortfolioTable items={holdings} />
        </div>
    );
};

export default DashboardPage;
