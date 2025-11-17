import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/symbols", tags=["Symbols"])

FINNHUB_KEY = "cvfud71r01qtu9s6p18gcvfud71r01qtu9s6p190"

EXCHANGES = [
    ("US", "US"),
    ("KOSPI", "KS"),
    ("KOSDAQ", "KQ"),
]

@router.get("/")
async def get_all_symbols():
    """국내 + 미국 모든 티커 리스트 반환"""
    all_symbols = []

    async with httpx.AsyncClient() as client:
        for label, code in EXCHANGES:
            url = f"https://finnhub.io/api/v1/stock/symbol?exchange={code}&token={FINNHUB_KEY}"

            resp = await client.get(url)
            if resp.status_code != 200:
                raise HTTPException(500, f"{label} 심볼 로드 실패")

            data = resp.json()

            # 필요한 필드만 리턴하도록 축소
            for item in data:
                if item.get("type") == "Common Stock":
                    all_symbols.append({
                        "symbol": item["symbol"],
                        "description": item["description"],
                        "exchange": label
                    })

    return all_symbols