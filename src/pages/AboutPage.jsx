import React from "react";

const AboutPage = () => {
    return (
        <div className="space-y-6 text-slate-200">
            <div>
                <h1 className="text-xl font-semibold text-slate-50">
                    About ChartInsight AI
                </h1>
                <p className="mt-2 text-sm leading-relaxed">
                    ChartInsight AI는 종목 검색, 시계열 예측, 리스크/전략
                    점수화, 맞춤 알림을 하나로 묶은 웹 대시보드입니다. 실시간
                    차트와 AI 분석 브리핑을 통해 우량주부터 테마주까지 직관적으로
                    파악할 수 있도록 설계되었습니다.
                </p>
                <div className="mt-4 grid gap-3 rounded-lg border border-slate-800/80 bg-slate-900/60 p-4 shadow-lg shadow-black/30">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-100">
                            주요 기능·지표·AI 모델
                        </h2>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-300">
                            <li>
                                <span className="font-semibold text-emerald-200">예측</span>
                                : ARIMA/SARIMA, Prophet(추세·계절성), 선형회귀를
                                활용한 1~6개월 밴드 예측 및 정확도(MAPE·RMSE)
                                모니터링
                            </li>
                            <li>
                                <span className="font-semibold text-sky-200">지표</span>
                                : 캔들 OHLCV, SMA20/60, Bollinger Bands, MACD, RSI,
                                거래량, HV20·ATR, 최대 낙폭(MDD)
                            </li>
                            <li>
                                <span className="font-semibold text-indigo-200">심리/리스크</span>
                                : 투자심리도(10일 상승일수), VKOSPI 등 변동성 지표,
                                리스크 배지(L/M/H), 변동성·신뢰도 점수화
                            </li>
                            <li>
                                <span className="font-semibold text-amber-200">NLP 브리핑</span>
                                : 지표 기반 규칙·템플릿으로 모멘텀, 밴드 괴리,
                                거래량·심리 상황을 자연어 코멘트/알림으로 제공
                            </li>
                            <li>
                                <span className="font-semibold text-pink-200">서버</span>
                                : FastAPI + yfinance 데이터 수집, 모델 서빙 및 REST
                                API, 프런트는 React + Tailwind + lightweight-charts로
                                구현
                            </li>
                        </ul>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-md border border-slate-800/60 bg-slate-950/50 p-3">
                            <h3 className="text-sm font-semibold text-slate-100">
                                자주 쓰는 용어
                            </h3>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-300">
                                <li>
                                    <span className="font-semibold">시가/고가/저가/종가</span>
                                    : 하루 첫·최고·최저·마감 가격으로 캔들 몸통과
                                    심지를 구성합니다.
                                </li>
                                <li>
                                    <span className="font-semibold">거래량</span>
                                    : 수급 강도를 나타내며, 가격 돌파/이탈 시
                                    동반 증가하면 신뢰도가 높아집니다.
                                </li>
                                <li>
                                    <span className="font-semibold">변동성</span>
                                    : 일정 기간 가격의 평균 변동 폭(HV, ATR)으로
                                    리스크 배지 계산에 활용됩니다.
                                </li>
                                <li>
                                    <span className="font-semibold">밴드 폭/괴리</span>
                                    : 예측 밴드 상·하단과 현재가의 거리를 의미하며,
                                    밴드가 넓을수록 불확실성이 큽니다.
                                </li>
                            </ul>
                        </div>
                        <div className="rounded-md border border-slate-800/60 bg-slate-950/50 p-3">
                            <h3 className="text-sm font-semibold text-slate-100">
                                지표 해석 기준
                            </h3>
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-300">
                                <li>
                                    <span className="font-semibold">SMA20/60</span>
                                    : 단기선이 장기선 위이면 상승 추세(모멘텀
                                    가점), 하회 시 보수적 접근.
                                </li>
                                <li>
                                    <span className="font-semibold">Bollinger Bands</span>
                                    : 상단 근접은 과열·이익실현 구간, 하단 이탈은
                                    과매도/반등 모니터링 포인트로 활용.
                                </li>
                                <li>
                                    <span className="font-semibold">MACD/Signal</span>
                                    : MACD가 시그널을 상향 돌파하면 상승 모멘텀
                                    강화, 하향 돌파 시 모멘텀 둔화로 해석.
                                </li>
                                <li>
                                    <span className="font-semibold">RSI</span>
                                    : 70 이상 과매수, 30 이하 과매도로 간주하며,
                                    다이버전스 발생 시 방향성 전환을 주의.
                                </li>
                                <li>
                                    <span className="font-semibold">거래량</span>
                                    : 20일 평균 대비 20% 이상 증가가 추세 지속/돌파
                                    신호의 신뢰도를 높입니다.
                                </li>
                                <li>
                                    <span className="font-semibold">투자심리도·VKOSPI</span>
                                    : 상승일 비중이 높고 VKOSPI가 하락하면 위험
                                    선호, 반대면 변동성 확대 국면으로 해석합니다.
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;