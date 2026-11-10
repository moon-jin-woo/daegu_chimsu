# DALFLOOD LAB — 대구 달서구 침수 시나리오 실험실

OpenStreetMap 기반 8개 관측 지점의 기온·강우 시나리오 분석 웹 애플리케이션입니다.

> **중요:** 실제 고도 데이터를 사용하는 단순화 지표유출 실험용 모델이며, 하수도·하천·건물·저수지·공식 침수 검증을 반영하지 못합니다. 재난판단에 사용하지 마세요.

정적 웹사이트: `index.html` + Leaflet + Terrarium DEM + Web Worker

개발 실행: `python3 -m http.server 8000`, 그다음 `http://localhost:8000` 방문.

단위시험: `node --test tests/*.test.js`

배포: GitHub 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions**를 선택한 뒤 `main` 푸시 시 자동 배포를 확인하세요.

관측 지점: 대건고등학교, 월성편한세상, 학산 정상, 대원고등학교(화원읍), 월광수변공원, 계명대학교 성서캠퍼스, 와룡산, 장동초등학교. 초기 좌표는 **잠정값**이며 OSM 검색 또는 마커 드래그로 보정해야 합니다.

구현 코드에 상세한 과학적 가정과 데이터 출처가 포함되어 있습니다.
