import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://localhost:8000/api", // FastAPI 백엔드 주소
    timeout: 10000,
});

// 반드시 필요!!
export default apiClient;