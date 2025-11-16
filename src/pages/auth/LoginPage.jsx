import React, { useState } from "react";

const LoginPage = () => {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();

        // TODO: 백엔드 연동 예정
        console.log("Login attempt:", { userId, password });
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg backdrop-blur">

                <div className="mb-6 text-center">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500 text-lg font-bold">
                        CI
                    </div>
                    <h1 className="text-xl font-semibold text-slate-100">
                        ChartInsight AI
                    </h1>
                    <p className="mt-1 text-sm text-slate-400">
                        로그인 후 서비스를 이용할 수 있습니다.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm text-slate-300">아이디</label>
                        <input
                            type="text"
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                            placeholder="아이디를 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm text-slate-300">비밀번호</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-500"
                            placeholder="비밀번호를 입력하세요"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-md bg-sky-500 py-2 text-sm font-medium text-white hover:bg-sky-600"
                    >
                        로그인
                    </button>
                </form>

                <div className="mt-4 text-center text-xs text-slate-400">
                    계정이 없나요?{" "}
                    <button className="text-sky-400 hover:underline">회원가입</button>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;