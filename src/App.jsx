import React from "react";
import AppLayout from "./components/layout/AppLayout";
import AppRouter from "./router/AppRouter";
import apiClient from "./api/client";

const App = () => {
  return (
      <AppLayout>
        <AppRouter />
      </AppLayout>
  );
};

export default App;

export async function fetchSymbols() {
    const res = await apiClient.get("/symbols");
    return res.data;
}