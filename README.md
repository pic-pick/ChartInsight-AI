# 📊 ChartInsight AI  
### AI 기반 전략 분석·차트 시각화 의사결정 보조 시스템

---

## 🚀 프로젝트 소개

**ChartInsight AI**는 주식 시장 데이터를 기반으로  
기술적 지표 분석과 간단한 머신러닝 기반 예측을 활용하여  
종목의 추세·리스크·전략 시그널을 자동 분석하는  
**의사결정 보조 웹 시스템**입니다.

본 프로젝트는 딥러닝을 사용하지 않지만,  
다음과 같은 **AI 요소**가 실제로 포함되어 있습니다:

---

## 🧠 AI가 사용되는 부분

### ✔ 1. 시계열 기반 예측 밴드 생성
- ARIMA, Linear Regression 등 간단한 예측 모델 적용  
- 미래 가격을 직접 맞추기보다는  
  **예측 가격 범위(Confidence Band)**를 제공  
- 차트 위에 예측 구간을 밴드 형태로 표시

---

### ✔ 2. 자동 분석 코멘트 생성 (Rule-based NLP)
지표 계산 결과를 조합해
사용자에게 자연스러운 문장을 자동으로 생성합니다.

예시:
- “단기 변동성이 중기 대비 상승하여 리스크가 증가하는 구간입니다.”
- “SMA20이 SMA60을 상향 돌파했습니다. 추세 전환 가능성이 있습니다.”

---

### ✔ 3. 전략 상태 평가 모델
기술적 지표(변동성, 모멘텀, 이동평균 기울기 등)를 기반으로  
종목의 상태를 **점수화하거나, Buy/Hold/Sell로 분류**합니다.

- 모멘텀 점수 (0–100)
- 리스크 레벨 (Low / Medium / High)
- 전략 신호 자동 판단

이는 규칙 기반 로직 + 간단한 ML 모델을 활용합니다.

### ✔ 2-1. LLM 기반 브리핑 (옵션)
규칙 기반 해설 대신 **OpenAI Chat Completions API**를 호출해
MACD·RSI·볼린저·변동성·밴드 정보를 입력으로 한
맞춤 브리핑/행동 가이드/모니터링 포인트를 JSON으로 생성할 수 있습니다.

환경 변수 예시:
- `OPENAI_API_KEY` : 필수 (미설정 시 자동으로 룰 기반 해설로 폴백)
- `OPENAI_MODEL` : 선택, 기본 `gpt-4o-mini`
- `OPENAI_BASE_URL`, `OPENAI_TEMPERATURE` : 선택

실행 전에는 루트 경로에 `.env` 파일을 만들어 OpenAI 키를 넣어주세요. 예시:

```
cp .env.example .env
echo "OPENAI_API_KEY=발급받은_키" >> .env
```

보안상 환경변수에 직접 노출하기 어렵다면, 루트에 `llm_file`을 두거나
`LLM_FILE=/path/to/secret`로 경로를 지정해 키 값을 적어둘 수도 있습니다
(파일에 `OPENAI_API_KEY=...` 혹은 키 한 줄만 있어도 자동으로 로드됩니다).

LLM 브리핑 동작 여부는 아래 헬스체크 스크립트로 바로 확인할 수 있습니다.

- 외부망이 막힌 환경(기본 모드):
  ```
  python backend/app/scripts/llm_healthcheck.py
  ```
- 실제 OpenAI 응답 확인(키 필요):
  ```
  OPENAI_API_KEY=... python backend/app/scripts/llm_healthcheck.py --live
  ```

---

## ✨ 주요 기능

### 📈 차트 시각화
- OHLCV 캔들 차트  
- SMA20, SMA60  
- Lightweight-charts 기반  
- **AI 예측 밴드 표시**

---

### 🔥 전략 분석
- 이동평균 교차 전략  
- 볼린저밴드 역추세 전략  
- 모멘텀 기반 전략  
- **전략별 자동 점수화·신호 제공**

---

### 🛡 리스크 분석
- 단기/중기 변동성 비교  
- 최근 고점 대비 최대 낙폭(MDD)  
- AI 자동 분석 코멘트 생성  

---

### 💼 포트폴리오
- 보유 종목 등록·삭제  
- 수량/평단 입력  
- 평가금액·수익률 계산  
- 종목별 AI 전략 분석 결과 제공  

---

## 🏗 기술 스택

### Frontend
- React (JSX)  
- Lightweight-charts  
- Axios  

### Backend
- FastAPI
- Python
- Pandas / Numpy
- yfinance 또는 pykrx
- Statsmodels(ARIMA) / scikit-learn
- Finnhub(심볼 메타데이터 조회, `FINNHUB_API_KEY` 필요)

### Database
- SQLite 또는 PostgreSQL

---

## 🧪 테스트 및 실행 점검

### 프런트엔드 단위 테스트 실행
- CRA 기본 Jest 환경을 사용합니다.
- CI 모드로 한 번만 돌리려면 아래 명령을 사용하세요:

```
CI=true npm test -- --watch=false
```

### 백엔드 FastAPI 서버 확인
- 가상환경을 활성화한 뒤 의존성을 설치하고 로컬 서버를 띄울 수 있습니다.

```
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```

- 종목 메타데이터(`/api/symbols`)를 사용하려면 Finnhub API 키를 환경 변수로 설정하세요.
  ```
  export FINNHUB_API_KEY=your_finnhub_token
  ```

테스트 실행 시 OpenAI 키(.env)가 설정되어 있으면 LLM 브리핑 호출까지 함께 검증됩니다.
