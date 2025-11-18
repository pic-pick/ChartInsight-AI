# app/scripts/update_symbols_finnhub.py
import FinanceDataReader as fdr
from pathlib import Path
from typing import List, Dict

import pandas as pd

from app.services.finnhub_client import get_symbols, FinnhubError

BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend/app
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


def build_us_symbols() -> pd.DataFrame:
    """
    미국 상장 심볼.
    Finnhub에서 지원하는 exchange 코드 예: US, NYSE, NASDAQ, AMEX 등.
    여기서는 단순히 'US' 기준으로 가져오도록 함.
    """
    print("[symbols] US 심볼 가져오는 중...")
    data: List[Dict] = get_symbols("US")
    df = pd.DataFrame(data)

    # Finnhub 기본 필드: symbol, description, displaySymbol, type, currency ...
    if "symbol" not in df.columns or "description" not in df.columns:
        raise RuntimeError(f"[symbols] US 응답 형식이 예상과 다릅니다: {df.columns.tolist()}")

    df = df[["symbol", "description"]].rename(
        columns={"description": "name"}
    ).copy()
    df["symbol"] = df["symbol"].astype(str).str.strip()
    df["name"] = df["name"].astype(str).str.strip()
    df["market"] = "US"
    print(f"[symbols] US 심볼 {len(df)}개")
    return df


def build_kr_symbols() -> pd.DataFrame:
    """
    한국 상장 심볼.

    1순위: Finnhub (KS, KQ)
    → 401 등으로 실패하면
    2순위: FinanceDataReader KRX 전체 상장 종목으로 fallback
    """
    frames: List[pd.DataFrame] = []
    for ex, label in [("KS", "KS"), ("KQ", "KQ")]:
        try:
            print(f"[symbols] KR 심볼({ex}) 가져오는 중...")
            data: List[Dict] = get_symbols(ex)
            df = pd.DataFrame(data)
            if "symbol" not in df.columns or "description" not in df.columns:
                print(f"[symbols] {ex} 응답 형식 이상: {df.columns.tolist()}")
                continue

            df = df[["symbol", "description"]].rename(
                columns={"description": "name"}
            ).copy()
            df["symbol"] = df["symbol"].astype(str).str.strip()
            df["name"] = df["name"].astype(str).str.strip()
            df["market"] = label
            print(f"[symbols] {ex} 심볼 {len(df)}개")
            frames.append(df)
        except FinnhubError as e:
            print(f"[symbols] {ex} 로딩 실패(Finnhub): {e}")

    # Finnhub에서 하나도 못 가져온 경우 → FDR로 fallback
    if not frames:
        print("[symbols] Finnhub 한국 심볼 로딩 실패, FinanceDataReader(KRX)로 대체합니다...")
        df = fdr.StockListing("KRX")
        print("[symbols] FDR KRX columns:", df.columns.tolist())

        # 여기서 컬럼명 정확히 맞춰줌: Code, Name, Market
        if "Code" not in df.columns or "Name" not in df.columns:
            raise RuntimeError(f"[symbols] FDR KRX 컬럼 예상과 다름: {df.columns.tolist()}")

        df_norm = (
            df[["Code", "Name", "Market"]]
            .rename(columns={"Code": "symbol", "Name": "name", "Market": "market"})
            .copy()
        )

        df_norm["symbol"] = df_norm["symbol"].astype(str).str.strip()
        df_norm["name"] = df_norm["name"].astype(str).str.strip()

        print(f"[symbols] FDR KRX 심볼 {len(df_norm)}개")
        return df_norm

    # Finnhub KS/KQ를 일부라도 가져온 경우
    return pd.concat(frames, ignore_index=True)

def main():
    try:
        df_us = build_us_symbols()
        df_kr = build_kr_symbols()

        # CSV 저장
        us_path = DATA_DIR / "stocks_us.csv"
        kr_path = DATA_DIR / "stocks_kr.csv"

        df_us.to_csv(us_path, index=False, encoding="utf-8-sig")
        df_kr.to_csv(kr_path, index=False, encoding="utf-8-sig")

        print(f"[symbols] 미국 종목 CSV 저장: {us_path} ({len(df_us)}개)")
        print(f"[symbols] 한국 종목 CSV 저장: {kr_path} ({len(df_kr)}개)")
    except Exception as e:
        print("[symbols] 전체 업데이트 실패:", e)


if __name__ == "__main__":
    main()