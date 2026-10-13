# 브이웹 메인페이지 신규 섹션 시안

브이웹.com 메인에 추가할 신규 섹션 5종의 시안과 GSAP 모션 데모입니다.

- **시안 (모션 데모)**: `index.html`
- **기획서**: `plan.html` — 레퍼런스 영상 분석, 톤앤매너, 섹션별 카피·구성·모션, 검증 결과

| # | 섹션 | 내용 |
|---|---|---|
| 01 | V EDIT. | 직접 고치는 홈페이지 — 수정모드 5단계 데모 + 관리자 팝업 디자인 (PC 핀) |
| 02 | V SEARCH. | AI가 읽는 홈페이지 — SEO · AEO · GEO, JSON-LD · 사이트맵 |
| 03 | V FAST & SAFE. | 속도 · 성능 · 보안 · 봇 차단 |
| 04 | V INSIGHT. | 방문분석 (홈페이지 분석 대시보드) |
| 05 | V ALL IN ONE. | AI 상담 + 문의 자동 배정 + 아웃트로 |

## 구성

```
index.html            시안 (데모용 상단바 · 커버 · 하단 안내 포함)
plan.html             기획서
css/style.css         PC (1920 기준 vw)
css/mobile_style.css  모바일 (≤599px, 390 기준 vw)
css/plan.css          기획서 스타일
js/main_sections.js   GSAP 3.13 (ScrollTrigger · ScrollToPlugin) + jQuery
images/ref_*.jpg      레퍼런스 영상 캡처 (기획서용)
```

## 실제 메인에 붙일 때

- 섹션 클래스는 `vs01` ~ `vs05` 접두어라 기존 `con2` ~ `con9`와 겹치지 않습니다.
- `.dh`(상단바) · `.cv`(커버) · `.df`(하단 안내)는 데모용이라 옮기지 않습니다.
- 메인의 GSAP(3.11.4)과 ScrollTrigger(3.6.0) 버전이 서로 달라서, 3.13.0으로 통일하고 ScrollToPlugin을 추가하기를 권장합니다.
- 화면 속 브랜드(모노브루)와 수치는 설명용 예시입니다.
