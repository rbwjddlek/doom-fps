# DOOM FPS 프로젝트

레트로 둠풍 FPS 게임 (웹 기반, 레이캐스팅).

## 프로젝트 구조
- `index.html` — HTML + 스타일
- `game.js` — 게임 전체 로직 (단일 파일, 모듈 없음)
- `.github/workflows/deploy.yml` — GitHub Pages 자동 배포

## 기술 스택
- 순수 HTML/JS (Canvas 2D)
- 레이캐스팅 (DDA 알고리즘)
- 라이브러리/프레임워크 없음

## 배포
- GitHub Pages: https://rbwjddlek.github.io/doom-fps/
- master 브랜치 push 시 자동 배포

## 로컬 실행
```
cd doom-fps
npx serve .
```

## 코드 규칙
- game.js 단일 파일 유지 (너무 커지면 분리 논의)
- var 사용 (file:// 호환성)
- 구조: 설정 → 맵 → 플레이어 → 입력 → 유틸 → 업데이트 → 렌더링 → 게임루프
