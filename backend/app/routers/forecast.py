# app/routers/forecast.py
from fastapi import APIRouter, HTTPException
from ..services.forecast_service import get_forecast_band

# ✅ 여기 prefix를 "/forecast" 로 변경
router = APIRouter(prefix="/forecast", tags=["forecast"])

@router.get("/{symbol}")
def forecast_band(symbol: str, horizon: int = 20):
    try:
        data = get_forecast_band(symbol, horizon=horizon)
        return data  # front에서 그대로 [{time, mean, lower, upper}, ...] 사용
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))