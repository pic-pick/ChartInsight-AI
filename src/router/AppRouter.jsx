import React from "react";
import { Routes, Route } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import StockDetailPage from "../pages/StockDetailPage";
import PortfolioPage from "../pages/PortfolioPage";
import AboutPage from "../pages/AboutPage";
import LoginPage from "../pages/auth/LoginPage";


const AppRouter = () => {
    return (
        <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/stock/:symbol" element={<StockDetailPage />} />
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
        </Routes>
    );
};

export default AppRouter;