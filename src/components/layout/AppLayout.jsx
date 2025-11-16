import React from "react";
import Header from "./Header";

const AppLayout = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
            <Header />
            <main className="flex-1">
                <div className="container max-w-6xl py-6">{children}</div>
            </main>
            <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-500">
                ChartInsight AI · Graduation Project
            </footer>
        </div>
    );
};

export default AppLayout;