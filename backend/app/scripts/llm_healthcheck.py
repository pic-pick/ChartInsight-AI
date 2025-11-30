"""LLM 브리핑이 정상 동작하는지 확인하기 위한 헬스체크 스크립트.

기본값은 외부 네트워크가 막힌 환경에서도 검증할 수 있도록 로컬
Mock OpenAI 서버를 띄워서 LLM 파이프라인이 JSON 브리핑을 반환하는지
확인한다. 실제 OpenAI 응답을 보고 싶다면 `--live` 플래그와 함께
`OPENAI_API_KEY`를 설정한 상태로 실행한다.
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Dict, Tuple


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class _MockOpenAIHandler(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802 - http handler naming
        if self.path.endswith("/chat/completions"):
            body = {
                "id": "mock-chatcmpl-1",
                "model": "mock-gpt",
                "choices": [
                    {
                        "message": {
                            "role": "assistant",
                            "content": json.dumps(
                                {
                                    "summary": "모의 서버 요약: 단기 상승세와 완만한 밴드",
                                    "quick_notes": ["20일선 지지", "RSI 60", "거래량 보통"],
                                    "actions": ["분할 매수", "손절 5%", "밴드 상단 분할 매도"],
                                    "alerts": ["외국인 수급 변화 체크", "밴드 하단 이탈 모니터"],
                                },
                                ensure_ascii=False,
                            ),
                        }
                    }
                ],
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(body).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format: str, *args):  # noqa: A003 - from BaseHTTPRequestHandler
        return  # 서버 로그 숨김


def _start_mock_server() -> Tuple[HTTPServer, int]:
    port = _find_free_port()
    server = HTTPServer(("127.0.0.1", port), _MockOpenAIHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, port


def _sample_payload() -> Dict:
    return {
        "symbol": "005930.KS",
        "trend": {"score": 0.6},
        "momentum": {"score": 0.4},
        "volatility": {"score": 0.3},
        "volume": {"score": 0.5},
        "sentiment": {"score": 0.5},
        "confidence_reason": "지표 일관성 양호",
        "sentiment_note": "외국인 순매수 전환",
    }


def _ensure_module_path():
    backend_root = Path(__file__).resolve().parents[2]
    sys.path.append(str(backend_root))


def run_healthcheck(use_live: bool = False) -> Dict | None:
    """LLM 브리핑 호출 결과를 반환한다."""

    if use_live and not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY가 설정되어야 --live 모드를 사용할 수 있습니다.")

    server = None
    if not use_live:
        server, port = _start_mock_server()
        os.environ.setdefault("OPENAI_API_KEY", "mock-key")
        os.environ["OPENAI_BASE_URL"] = f"http://127.0.0.1:{port}/v1"

    _ensure_module_path()
    from app.services.llm_service import llm_브리핑_생성  # noqa: WPS433 - runtime import to use env

    band = {"horizon_label": "1M", "upper": 75000.0, "lower": 67000.0, "center": 71000.0}
    rule_narrative = {
        "summary": "단기 상승 추세가 유지되며 변동성은 완화되는 중",
        "quick_notes": ["20일선 위에서 지지", "RSI 60대 안정", "밴드 폭 축소"],
        "actions": ["분할 매수 고려", "손절선 6%", "대량거래 동반 시 추세 확인"],
    }
    rule_alerts = ["밴드 하단 이탈 시 손절", "외국인 매도 전환 모니터"]
    signal_texts = {
        "trend_sentence": "상승 추세",
        "momentum_sentence": "중립 모멘텀",
        "volatility_sentence": "변동성 낮음",
        "volume_sentence": "거래량 평균",
        "band_phrase": "상단 7.5만",
    }

    try:
        return llm_브리핑_생성(
            _sample_payload(), band, rule_narrative, rule_alerts, signal_texts
        )
    finally:
        if server:
            server.shutdown()


def main():
    parser = argparse.ArgumentParser(description="LLM 브리핑 헬스체크")
    parser.add_argument(
        "--live",
        action="store_true",
        help="실제 OpenAI API로 호출합니다 (OPENAI_API_KEY 필요)",
    )
    args = parser.parse_args()

    result = run_healthcheck(use_live=args.live)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
