# app/routers/forecast.py
from fastapi import APIRouter, HTTPException, Query
from ..services.forecast_service import get_forecast_band, evaluate_forecast_accuracy

# prefix="/forecast" → /api/forecast/... 로 쓰게 됨 (main.py에서 prefix="/api" 추가)
router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/{symbol}")
def forecast_band(
    symbol: str,
    horizon: int = Query(
        63,
        ge=1,
        le=126,
        description="예측할 영업일 수 (최대 약 6개월, 기본 3개월)",
    ),
):
    try:
        data = get_forecast_band(symbol, horizon=horizon)
        return data  # front에서 그대로 [{time, mean, lower, upper}, ...] 사용
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{symbol}/accuracy")
def forecast_accuracy(
    symbol: str,
    holdout_days: int = Query(
        63,
        ge=1,
        le=126,
        description="정확도 검증용 홀드아웃 구간(영업일 기준, 최대 6개월)",
    ),
):
    try:
        return evaluate_forecast_accuracy(symbol, holdout_days=holdout_days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
