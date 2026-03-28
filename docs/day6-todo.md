# Day 6 TODO - 남은 백로그 작업

> 작성일: 2026-02-18 | 상태: 대기중

## 백로그 HIGH (우선순위순)

### 1. 즐겨찾기 UI
- [ ] 백엔드 API 이미 존재 (확인 필요: 엔드포인트, 요청/응답 구조)
- [ ] 프론트엔드 UI 구현
  - [ ] SpotCard / SpotDetailModal에 즐겨찾기 하트 버튼 추가
  - [ ] 마이페이지에 즐겨찾기 목록 표시
  - [ ] 즐겨찾기 상태 API 연동 (추가/삭제/조회)

### 2. 지도 검색/필터 기능
- [ ] 스팟 이름/지역 검색 (검색바 UI)
- [ ] 레벨별 필터 (BEGINNER/INTERMEDIATE/ADVANCED/EXPERT)
- [ ] 점수별 필터 (surfRating 범위)
- [ ] 필터 적용 시 지도 마커 + 목록 동시 반영

### 3. 보드별 계산 분리
- [ ] surf-rating.util.ts에 board factor 반영
  - [ ] 롱보드: 작은 파도에서 점수 상향 (파고 0.3~1.0m 구간)
  - [ ] 숏보드: 큰 파도에서 점수 상향 (파고 1.5m+ 구간)
- [ ] 대시보드 API에서 boardType 파라미터 활용하여 계산 분기
- [ ] 프론트엔드 결과 반영 확인

## 참고
- 프로젝트 메모: `~/.claude/projects/D--workspace/memory/MEMORY.md`
- 최근 커밋: `8655881` (Phase 2 완료), `6ec63fc` (tsconfig + docs)
