# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import stocks

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.0.53:3000",  # 👈 지금 접속하는 주소
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # 개발 중에는 ["*"]로 풀어도 됨
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stocks.router, prefix="/api")