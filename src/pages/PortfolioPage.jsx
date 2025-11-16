import React from "react";

const PortfolioPage = () => {
    // 나중에 실제 API 연결 / 상태 관리 추가
    return (
        <div>
            <h1 className="text-xl font-semibold text-slate-50">
                Portfolio (준비 중)
            </h1>
            <p className="mt-1 mb-4 text-sm text-slate-400">
                나중에 보유 종목, 평단, 평가손익을 보여주는 페이지로 확장할 수 있습니다.
            </p>
            <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
                포트폴리오 API 및 UI가 준비되면 이 영역에 표/카드를 배치하세요.
            </div>
        </div>
    );
};

export default PortfolioPage;