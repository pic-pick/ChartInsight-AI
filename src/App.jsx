import React from "react";
import AppLayout from "./components/layout/AppLayout";
import AppRouter from "./router/AppRouter";
import apiClient from "./api/client";
import { UserPortfolioProvider } from "./context/UserPortfolioContext";

const App = () => {
  return (
      <UserPortfolioProvider>
        <AppLayout>
          <AppRouter />
        </AppLayout>
      </UserPortfolioProvider>
  );
};

export default App;

export async function fetchSymbols() {
    const res = await apiClient.get("/symbols");
    return res.data;
}