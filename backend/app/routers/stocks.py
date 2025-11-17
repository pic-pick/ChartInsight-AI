# app/routers/stocks.py

from fastapi import APIRouter, Query
from pydantic import BaseModel
import pandas as pd

router = APIRouter(prefix="/stocks", tags=["stocks"])

# CSV 로드
KR = pd.read_csv("app/data/stocks_kr.csv")
US = pd.read_csv("app/data/stocks_us.csv")

# 심볼 → 이름 데이터 합치기
ALL = pd.concat([KR, US], ignore_index=True)


class StockItem(BaseModel):
    symbol: str
    name: str


@router.get("/search", response_model=list[StockItem])
async def search_stocks(q: str = Query(..., min_length=1)):
    q = q.strip()

    # 종목명 또는 코드 일부 일치
    df = ALL[
        ALL["name"].str.contains(q, case=False, na=False)
        | ALL["symbol"].astype(str).str.contains(q, case=False, na=False)
    ]

    # 20개만 리턴 (자동완성용)
    df = df.head(20)

    return [
        StockItem(symbol=row["symbol"], name=row["name"])
        for _, row in df.iterrows()
    ]