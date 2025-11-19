# 이 스크립트는 ARIMA 기반 예측 밴드의 성능(coverage, RMSE, MAPE)을
# 과거 데이터에 대해 백테스트 방식으로 평가하기 위한 유틸리티입니다.
# scripts/eval_forecast_band.py
import yfinance as yf
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from datetime import timedelta

# 특정 종목(symbol)에 대해
#  - 최근 test_days 만큼을 테스트 구간으로 잡고
#  - 매일 1-step ahead 예측을 반복 수행한 뒤
#  - 예측 밴드 안에 실제 가격이 들어왔는지(coverage)와 오차(RMSE, MAPE)를 계산합니다.
def evaluate_forecast_band(
        symbol: str,
        period: str = "1y",
        test_days: int = 60,
        conf: float = 0.9,
        arima_order=(1, 1, 1),
):
    """
    과거 데이터에서 마지막 test_days 구간을 테스트로 잡고
    1-step ahead 예측 성능을 평가.
    """
    # yfinance의 Ticker 객체 생성 (심볼 기준으로 과거 시세 조회를 위함)
    ticker = yf.Ticker(symbol)
    # period 기간 동안의 과거 시세 데이터(OHLCV)를 조회
    hist = ticker.history(period=period)

    if hist.empty:
        raise ValueError("No historical data")

    # 종가(Close) 시계열만 사용하고, 결측치는 제거
    close = hist["Close"].dropna()
    close = close.sort_index()

    # 최소 학습 구간을 확보하기 위해
    # 전체 길이가 (테스트일수 + 여분 30일)보다 짧으면 평가 불가로 처리
    if len(close) <= test_days + 30:
        raise ValueError("Data too short for evaluation")

    # 테스트에 사용할 날짜 인덱스(마지막 test_days 일)
    test_index = close.index[-test_days:]

    # 각 테스트 날짜별 평가 결과를 담을 리스트
    records = []

    for test_date in test_index:
        # 현재 test_date 까지의 과거 종가만을 학습 데이터로 사용
        # (test_date 이후 미래 정보는 사용하지 않도록 슬라이싱)
        train_data = close.loc[:test_date]

        # ARIMA 모형을 안정적으로 적합시키기 위해
        # (p+d+q + 여분 5)보다 데이터가 적으면 이 날짜는 스킵
        if len(train_data) < sum(arima_order) + 5:
            continue

        # 주어진 (p, d, q) 차수로 ARIMA 모형 정의 후 학습
        model = ARIMA(train_data, order=arima_order)
        res = model.fit()

        # t 시점까지 학습한 모델로 t+1 (다음 날) 한 스텝 앞 예측 수행
        forecast_res = res.get_forecast(steps=1)
        # 예측된 평균값(포인트 예측)
        mean = forecast_res.predicted_mean.iloc[0]
        # 신뢰구간(conf 수준)에 해당하는 하한/상한 추정치
        conf_int = forecast_res.conf_int(alpha=1 - conf).iloc[0]
        lower = conf_int[0]
        upper = conf_int[1]

        # 현재 test_date가 전체 시계열에서 몇 번째 위치인지 찾고
        idx_pos = close.index.get_loc(test_date)
        if idx_pos + 1 >= len(close):
            # 더 이상 다음 날이 없으면 종료
            continue

        # 바로 다음 인덱스(다음 거래일 날짜)를 예측 대상 날짜로 사용
        next_date = close.index[idx_pos + 1]
        # 실제 다음 날 종가 (예측과 비교할 정답 값)
        actual = close.loc[next_date]

        # 실제 값이 예측 밴드 [lower, upper] 안에 들어왔는지 여부
        inside_band = (lower <= actual <= upper)
        # 절대 오차 (실제 - 예측 평균)
        abs_error = abs(actual - mean)
        # 제곱 오차 (RMSE 계산용)
        sq_error = (actual - mean) ** 2
        # 절대 백분율 오차(%) (MAPE 계산용)
        ape = abs(actual - mean) / actual * 100  # absolute percentage error

        # 나중에 DataFrame으로 만들 수 있도록 한 날짜의 결과를 딕셔너리로 저장
        records.append(
            {
                "train_end": test_date,
                "forecast_date": next_date,
                "actual": float(actual),
                "mean": float(mean),
                "lower": float(lower),
                "upper": float(upper),
                "inside_band": inside_band,
                "abs_error": float(abs_error),
                "sq_error": float(sq_error),
                "ape": float(ape),
            }
        )

    # 이제까지 쌓은 records 리스트를 하나의 DataFrame으로 변환
    df = pd.DataFrame(records)
    if df.empty:
        raise ValueError("No evaluation records generated")

    # 평가 지표 계산
    # coverage : 예측 밴드 안에 실제 값이 들어온 비율(%)
    # rmse     : 평균 제곱근 오차 (값이 작을수록 좋음)
    # mape     : 평균 절대 백분율 오차 (비율 기준 오차)
    coverage = df["inside_band"].mean() * 100      # 밴드 안에 들어온 비율 (%)
    rmse = (df["sq_error"].mean()) ** 0.5
    mape = df["ape"].mean()

    print(f"Symbol: {symbol}")
    print(f"Test days: {test_days}, conf: {conf}")
    print(f"Coverage: {coverage:.2f}%")  # 90% 근처면 괜찮다고 설명 가능
    print(f"RMSE: {rmse:.4f}")
    print(f"MAPE: {mape:.2f}%")

    return df

# 이 아래 코드는 스크립트를 직접 실행했을 때만 동작하는 예시 실행 부분입니다.
# (다른 모듈에서 import 해서 evaluate_forecast_band를 사용할 때는 실행되지 않습니다.)
if __name__ == "__main__":
    # 테스트할 심볼 지정
    symbol = "TSLL"   # 삼성전자는 "005930.KS"

    # 평가 실행
    df = evaluate_forecast_band(
        symbol=symbol,
        period="2y",
        test_days=60,
        conf=0.9,
        arima_order=(1, 1, 1),
    )

    print("\n--- Raw Results (head) ---")
    print(df.head())