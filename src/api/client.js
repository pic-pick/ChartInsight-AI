import axios from "axios";

const apiClient = axios.create({
    baseURL: "http://192.168.0.53:8000/api", // 👈 여기 IP를 지금 쓰는 거랑 맞추기
    timeout: 5000,
});

export default apiClient;