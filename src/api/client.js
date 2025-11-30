import axios from "axios";

// 기본값: 현재 호스트의 /api 엔드포인트를 사용
// 필요하면 .env 의 REACT_APP_API_BASE_URL 로 재정의 가능
const defaultBaseURL = typeof window !== "undefined"
    ? `${window.location.origin}/api`
    : "http://localhost:8000/api";

const apiClient = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || defaultBaseURL,
    timeout: 8000,
});

export default apiClient;