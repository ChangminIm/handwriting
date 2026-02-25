# CLAUDE.md
# Created: 2026-02-25 00:00

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

손글씨 숫자 인식기의 **웹 버전**. Python 백엔드(Flask 또는 FastAPI)가 PyTorch 모델을 REST API로 서빙하고, 브라우저의 HTML5 Canvas에서 직접 그림을 그려 예측 결과를 받는 구조.

## 권장 기술 스택

| 역할 | 기술 |
|---|---|
| 백엔드 API | FastAPI (또는 Flask) |
| ML 모델 | PyTorch (`DigitCNN`) — 부모 디렉터리의 `digit_cnn.pth` 공유 사용 |
| 프론트엔드 | 순수 HTML + CSS + JavaScript (Canvas API) |
| 이미지 전송 | Canvas → base64 PNG → POST `/predict` |

## 디렉터리 구조 (예정)

```
web_version/
├── app.py              # FastAPI/Flask 서버, /predict 엔드포인트
├── model.py            # DigitCNN 클래스 + 전처리 로직 (digit_recognizer.py에서 이식)
├── static/
│   ├── index.html      # 메인 UI
│   ├── style.css
│   └── app.js          # Canvas 그리기 + fetch API 호출
└── requirements.txt
```

## 실행 방법 (예정)

```bash
# 의존성 설치
pip install fastapi uvicorn pillow numpy scipy torch torchvision python-multipart

# 개발 서버 실행
uvicorn app:app --reload --port 8000
# 브라우저에서 http://localhost:8000 접속
```

## 핵심 설계 원칙

- **모델 공유**: `../digit_cnn.pth`를 직접 참조하거나 복사하여 사용. 재학습 불필요.
- **전처리 일치**: 부모 디렉터리 `digit_recognizer.py`의 `preprocess()` 함수 로직을 그대로 이식 (bounding-box crop → 20px 스케일 → 28×28 임베드 → center-of-mass shift).
- **API 계약**: `POST /predict` — body: `{ "image": "<base64 PNG>" }` → response: `{ "digit": int, "confidence": float, "probabilities": [float × 10] }`
- **프론트 Canvas 크기**: 280×280px 유지 (데스크톱 버전과 동일), 브러시 반경 13px.

## 부모 디렉터리와의 관계

```
hand_writing/
├── digit_recognizer.py   # 원본 (모델 아키텍처 + 전처리 참고용)
├── digit_cnn.pth         # 학습된 가중치 (웹/데스크톱 공유)
├── web_version/          # ← 현재 디렉터리
└── desktop_version/
```
