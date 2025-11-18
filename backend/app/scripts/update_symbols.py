# backend/app/scripts/update_symbols.py

from pathlib import Path

import pandas as pd
import FinanceDataReader as fdr

# app/ 디렉터리 기준 경로
BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend/app
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(exist_ok=True)


def _pick_col(df: pd.DataFrame, candidates: list[str], label: str) -> str:
    """
    DataFrame에서 candidates 중 존재하는 첫 컬럼명을 골라줌.
    (FinanceDataReader 버전에 따라 Code/Symbol, Name/name 등 컬럼명이 다를 수 있어서)
    """
    for c in candidates:
        if c in df.columns:
            return c
    raise KeyError(f"[update_symbols] {label} 컬럼을 찾을 수 없음. columns={df.columns.tolist()}")


def update_kr_symbols():
    """
    한국 KRX 전체 상장 종목 (코스피 + 코스닥)
    """
    df = fdr.StockListing("KRX")
    print("[KRX columns]", df.columns.tolist())

    code_col = _pick_col(df, ["Symbol", "symbol", "Code", "code"], "symbol")
    name_col = _pick_col(df, ["Name", "name"], "name")
    market_col = _pick_col(df, ["Market", "market"], "market")

    df_norm = (
        df[[code_col, name_col, market_col]]
        .rename(
            columns={
                code_col: "symbol",
                name_col: "name",
                market_col: "market",
            }
        )
        .copy()
    )

    df_norm["symbol"] = df_norm["symbol"].astype(str).str.strip()
    df_norm["name"] = df_norm["name"].astype(str).str.strip()

    out_path = DATA_DIR / "stocks_kr.csv"
    df_norm.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"[update_symbols] KRX 종목 {len(df_norm)}개 저장 → {out_path}")


def update_us_symbols():
    """
    미국 상장 종목 (NASDAQ + NYSE + AMEX)
    """
    markets = ["NASDAQ", "NYSE", "AMEX"]
    frames: list[pd.DataFrame] = []

    for market in markets:
        try:
            df = fdr.StockListing(market)
            print(f"[US {market} columns]", df.columns.tolist())

            code_col = _pick_col(df, ["Symbol", "symbol", "Code", "code"], "symbol")
            name_col = _pick_col(df, ["Name", "name"], "name")

            df_norm = (
                df[[code_col, name_col]]
                .rename(
                    columns={
                        code_col: "symbol",
                        name_col: "name",
                    }
                )
                .copy()
            )
            df_norm["symbol"] = df_norm["symbol"].astype(str).str.strip()
            df_norm["name"] = df_norm["name"].astype(str).str.strip()
            df_norm["market"] = market

            frames.append(df_norm)
            print(f"[update_symbols] {market} 종목 {len(df_norm)}개 로딩")
        except Exception as e:
            print(f"[update_symbols] {market} 로딩 실패:", e)

    if not frames:
        df_us = pd.DataFrame(columns=["symbol", "name", "market"])
        print("[update_symbols] 미국 종목 로딩 실패, 빈 CSV 생성")
    else:
        df_us = pd.concat(frames, ignore_index=True)

    out_path = DATA_DIR / "stocks_us.csv"
    df_us.to_csv(out_path, index=False, encoding="utf-8-sig")
    print(f"[update_symbols] 미국 종목 {len(df_us)}개 저장 → {out_path}")


if __name__ == "__main__":
    update_kr_symbols()
    update_us_symbols()