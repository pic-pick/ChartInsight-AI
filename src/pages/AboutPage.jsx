import React from "react";

const AboutPage = () => {
    return (
        <div>
            <h1 className="text-xl font-semibold text-slate-50">
                About ChartInsight AI
            </h1>
            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                ChartInsight AI는 주식 차트 데이터와 간단한 머신러닝 분석을
                결합하여, 종목의 리스크/추세/전략 관점에서 인사이트를 제공하는
                졸업 프로젝트용 웹 대시보드입니다.
            </p>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-300">
                <li>React + Tailwind CSS 기반의 프론트엔드</li>
                <li>FastAPI 기반 백엔드 및 REST API</li>
                <li>lightweight-charts를 이용한 캔들 차트 시각화</li>
                <li>전략·리스크 분석 결과를 카드 형태로 제공</li>
            </ul>
        </div>
    );
};

export default AboutPage;