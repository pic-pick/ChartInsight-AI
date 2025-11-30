# NLP 기반 AI 인사이트 고도화 제안

## 현행 구조 요약
- `backend/app/services/analysis_service.py`: 기술적 지표 계산 + 규칙 기반 한국어 템플릿 문구 생성.
- `/api/stocks/{symbol}/decision-insight`: 규칙 기반 내러티브와 알림을 반환해 프런트 `AiAnalysisPanel`에서 표시.

## 고도화 목표
규칙 기반 텍스트 조립을 **생성형/분류형 NLP 모델**로 대체하거나 보완해, 종목별 맥락과 지표 변화를 더 자연스럽게 설명하는 것을 목표로 합니다.

## 단계별 접근
1. **프롬프트/템플릿 기반 LLM 생성**
   - 모델: OpenAI GPT, Claude, Llama 등 한국어 지원 LLM API.
   - 입력: 심볼/시장 메타, 가격·지표 스냅샷(SMA20/60, 모멘텀, HV20/ATR, MDD, Bollinger, MACD, RSI, 거래량 비율, 투자심리도, VKOSPI), 예측 밴드 요약, 정확도(MAPE/RMSE).
   - 출력: 
     - 핵심 브리핑(추세/모멘텀/리스크/밴드/정확도 요약)
     - 행동 제안(Buy/Hold/Sell 근거 2~3줄)
     - 모니터링 포인트(향후 주시 이벤트 2~3개)
   - 구현 포인트: 
     - 프롬프트에 **지표별 의미·해석 기준**을 안내해 일관된 톤 유지.
     - 응답 길이·형식을 JSON schema(예: pydantic)로 강제하거나 `function_call`/`tool_call` 스타일로 파싱.

2. **지표 상태 분류 + 텍스트 생성 하이브리드**
   - 분류기: LightGBM/로지스틱으로 `trend_state`(상승/중립/하락), `vol_state`(저/중/고) 등 라벨 예측 후, 소규모 템플릿이나 LLM 프롬프트에 라벨만 넘겨 더 짧은 프롬프트로 생성 비용을 절감.
   - 라벨 학습 데이터: 과거 지표 스냅샷 + 사람 레이블 혹은 규칙 기반 초기 라벨로 준지도 학습.

3. **파인튜닝/지시형 미세조정(선택)**
   - 도메인 코멘트가 많은 경우, Llama-3, Zephyr 등 한국어 가능한 모델을 LoRA/QLoRA로 파인튜닝해 사내 호스팅.
   - 데이터: (입력 지표 → 요약·행동 제안) 페어를 수집해 지도 학습. 민감 데이터는 비식별 처리 후 사내용.

4. **알림/모니터링 지능화**
   - 규칙: 변동성 급등, 밴드 이탈, 거래량 스파이크, VKOSPI 급등 같은 이벤트 감지기를 유지하되,
   - NLP: 이벤트 묘사 + 향후 시나리오를 LLM이 생성하도록 위임해 종목 특화 코멘트 제공.

5. **품질·비용·지연 관리**
   - 캐싱: 동일 심볼/지표 스냅샷에 대한 응답을 Redis에 캐시.
   - 레이트 리밋: 백엔드 라우터에서 사용자/토큰 단위 제한.
   - 토큰 절약: 숫자·지표를 요약 JSON으로 LLM에 전달하고, 지표 설명은 시스템 프롬프트에만 고정.

6. **안전성·규제 대응**
   - 면책: 응답 앞/뒤로 투자 자문이 아님을 명시.
   - 금칙어/금융 규제 필터: 특정 표현(확정 수익 등) 금지 리스트를 후처리.

## 아키텍처 스케치
- 서비스 계층: `analysis_service.py`에 LLM 클라이언트 래퍼 추가 (`llm_client.generate_insight(snapshot)` 등).
- 설정: `.env`에 LLM API 키, 모델명, 타임아웃, 캐시 TTL.
- 백엔드 라우터: `/decision-insight`에서 규칙/LLM 혼합 모드 선택 가능하도록 `mode` 쿼리(예: `mode=hybrid|llm|rule`).
- 프런트: AiAnalysisPanel에서 `mode` 토글(예: "스탠다드"/"LLM 베타")을 제공하고, LLM 응답 구조를 표시.

## 점진적 마이그레이션 체크리스트
- [ ] 규칙 기반 결과를 유지한 채 LLM 생성 결과를 병렬로 반환하는 실험 플래그 추가
- [ ] JSON 스키마 강제(prompt + pydantic 검증)로 응답 구조 안정화
- [ ] 캐시/레이트리밋 도입, 에러 시 규칙 기반 결과로 폴백
- [ ] 소규모 사용자 그룹 A/B 테스트로 응답 품질·지연 측정
- [ ] 운영 가드레일(금칙어 필터·면책문구) 적용 후 전체 롤아웃

## 관련 파일 경로
- 백엔드 서비스: `backend/app/services/analysis_service.py`
- API 라우터: `backend/app/routers/stocks.py` (`/api/stocks/{symbol}/decision-insight`)
- 프런트 소비: `src/components/analysis/AiAnalysisPanel.jsx`, `src/api/stockApi.js`
