---
name: tennis-orchestrator
description: "B2B Tennis 복식 리그 사이트 전체 개발을 조율하는 오케스트레이터. '사이트 만들어줘', '개발 시작', '테니스 사이트 구현', '기능 추가', '페이지 만들어줘' 등 개발 요청 시 반드시 이 스킬을 사용할 것. 후속 작업: 수정, 보완, 다시 만들어줘, 이전 결과 개선, 특정 기능만 다시, 업데이트, 버그 수정 요청 시에도 반드시 사용."
---

# Tennis Site Orchestrator

B2B Tennis 복식 리그 사이트(Next.js + Supabase) 개발을 에이전트 팀이 협업하여 구축하는 통합 오케스트레이터.

## 실행 모드: 하이브리드

| Phase | 모드 | 이유 |
|-------|------|------|
| Phase 1 (설계) | 서브 에이전트 | architect 단독 순차 설계, 팀 통신 불필요 |
| Phase 2 (구현) | 에이전트 팀 | frontend/backend 병렬 협업, API 구조 실시간 소통 필요 |
| Phase 3 (QA) | 서브 에이전트 | qa 단독 독립 검증 |

## 에이전트 구성

| 에이전트 | 타입 | 역할 | 스킬 |
|---------|------|------|------|
| architect | 커스텀 | DB 스키마, API 구조 설계 | db-schema |
| frontend-dev | 커스텀 | Next.js UI 구현 | ui-builder |
| backend-dev | 커스텀 | API Routes + Supabase | api-builder, league-engine |
| qa | 커스텀 (general-purpose) | 통합 검증 | - |

## 워크플로우

### Phase 0: 컨텍스트 확인

`_workspace/` 디렉토리 존재 여부 확인:
- **미존재** → 초기 실행. Phase 1 진행
- **존재 + 부분 수정 요청** ("순위표만 다시", "게임 입력 폼 수정 등") → 해당 에이전트만 재호출. 기존 파일 수정
- **존재 + 새 기능 추가** → `_workspace/`를 `_workspace_{YYYYMMDD_HHMMSS}/`로 보관 후 Phase 1 진행

### Phase 1: 설계
**실행 모드: 서브 에이전트**

사용자 요청을 분석하여 요구사항 정리:
1. `_workspace/00_input/requirements.md` 생성 (사용자 요청 + 기술 스택 명시)
2. architect 에이전트 호출:
   ```
   Agent(
     subagent_type: "architect",
     model: "opus",
     prompt: "요구사항 파일을 읽고 DB 스키마, TypeScript 타입, API 구조를 설계하라.
              db-schema 스킬과 league-engine 스킬을 참조하라.
              입력: _workspace/00_input/requirements.md
              출력: _workspace/01_architect_*.* (schema.sql, types.ts, api-structure.md, decisions.md)"
   )
   ```
3. architect 완료 후 설계 파일 검토 → Phase 2 진행

### Phase 2: 구현
**실행 모드: 에이전트 팀**

1. 팀 생성:
   ```
   TeamCreate(
     team_name: "tennis-dev-team",
     members: [
       {
         name: "frontend-dev",
         agent_type: "frontend-dev",
         model: "opus",
         prompt: "ui-builder 스킬을 참조하여 Next.js UI를 구현하라.
                  _workspace/01_architect_types.ts와 _workspace/01_architect_api-structure.md를 먼저 읽어라.
                  backend-dev와 API 구조를 실시간으로 소통하며 협업하라.
                  완료 시 _workspace/02_frontend_components.md에 구현 목록을 기록하라."
       },
       {
         name: "backend-dev",
         agent_type: "backend-dev",
         model: "opus",
         prompt: "api-builder 스킬과 league-engine 스킬을 참조하여 API와 Supabase 로직을 구현하라.
                  _workspace/01_architect_schema.sql과 _workspace/01_architect_api-structure.md를 먼저 읽어라.
                  frontend-dev에게 API 완성 시마다 SendMessage로 엔드포인트와 응답 구조를 알려라.
                  완료 시 _workspace/02_backend_api-status.md에 API 목록을 기록하라."
       }
     ]
   )
   ```

2. 작업 등록:
   ```
   TaskCreate(tasks: [
     { title: "Supabase 마이그레이션 적용", assignee: "backend-dev",
       description: "_workspace/01_architect_schema.sql을 supabase/migrations/에 파일로 저장" },
     { title: "Supabase 클라이언트 설정", assignee: "backend-dev",
       description: "lib/supabase/client.ts, server.ts 구현 + .env.example 작성" },
     { title: "게임 API 구현", assignee: "backend-dev",
       description: "app/api/games/route.ts (GET/POST) 구현" },
     { title: "순위 API 구현", assignee: "backend-dev",
       description: "app/api/rankings/route.ts 구현 (league-engine 스킬 참조)" },
     { title: "루트 레이아웃 + 네비게이션", assignee: "frontend-dev",
       description: "app/layout.tsx, 하단 탭 네비게이션 컴포넌트" },
     { title: "메인 대시보드", assignee: "frontend-dev",
       description: "app/page.tsx - 최신 경기, 순위 top5" },
     { title: "리그 순위표 페이지", assignee: "frontend-dev",
       description: "app/league/page.tsx + RankingTable 컴포넌트" },
     { title: "경기 기록 폼", assignee: "frontend-dev",
       description: "app/games/new/page.tsx - 복식 팀 구성 + 세트 점수 입력" },
     { title: "선수 목록 + 개인 통계", assignee: "frontend-dev",
       description: "app/players/page.tsx" },
     { title: "인증 처리", assignee: "backend-dev",
       description: "Supabase Auth 미들웨어 + 로그인 페이지" }
   ])
   ```

3. 팀원 자체 조율 모니터링:
   - frontend-dev ↔ backend-dev가 SendMessage로 API 구조 협의
   - 리더는 TaskGet으로 진행률 확인
   - 막힌 팀원 있으면 SendMessage로 지원

4. 구현 완료 후 팀 정리:
   ```
   TeamDelete("tennis-dev-team")
   ```

### Phase 3: QA 검증
**실행 모드: 서브 에이전트**

```
Agent(
  subagent_type: "qa",
  model: "opus",
  prompt: "B2B Tennis 사이트의 통합 검증을 수행하라.
           _workspace/02_frontend_components.md와 _workspace/02_backend_api-status.md를 읽어라.
           API-프론트 타입 정합성, 순위 계산 로직, RLS 정책, 테니스 도메인 edge case를 검증하라.
           결과를 _workspace/03_qa_report.md에 기록하라."
)
```

### Phase 4: 완료 보고

1. `_workspace/03_qa_report.md` 읽기
2. Critical 버그 목록 사용자에게 보고
3. 전체 구현 내용 요약 보고:
   - 생성된 파일 목록
   - Supabase 설정 방법 안내
   - 개발 서버 실행 방법 (`npm run dev`)
   - 다음 단계 제안 (Supabase 프로젝트 생성, 배포 등)

## 데이터 흐름

```
사용자 요청
    ↓
[오케스트레이터] → _workspace/00_input/requirements.md
    ↓
[architect 서브] → _workspace/01_architect_*.* (schema, types, api-structure)
    ↓
[TeamCreate: frontend-dev + backend-dev]
    ├── backend-dev: supabase/migrations/, lib/, app/api/ 구현
    │       ↕ SendMessage (API 완성 알림)
    └── frontend-dev: src/app/, src/components/ 구현
    ↓ TeamDelete
[qa 서브] → _workspace/03_qa_report.md
    ↓
[오케스트레이터] → 사용자에게 최종 보고
```

## 에러 핸들링

| 상황 | 전략 |
|------|------|
| architect 설계 실패 | 기본 스키마로 fallback (단순 구조) 후 계속 진행 |
| backend-dev 구현 실패 | frontend-dev에게 알리고 목 데이터로 UI 먼저 완성, 보고서에 명시 |
| frontend-dev 구현 실패 | backend-dev 결과만으로 API 동작 확인, 보고서에 명시 |
| QA critical 버그 발견 | 보고서에 수정 방법 포함하여 사용자에게 전달 (자동 수정 없음) |
| 팀원 간 API 불일치 | SendMessage로 즉시 소통, 합의 후 수정 |

## 테스트 시나리오

### 정상 흐름
1. 사용자: "테니스 복식 리그 사이트 만들어줘"
2. Phase 0: _workspace 없음 → 초기 실행
3. Phase 1: architect가 스키마/타입/API 설계 완료
4. Phase 2: frontend+backend 팀이 병렬 구현 (API 소통 포함)
5. Phase 3: QA가 타입 정합성, 순위 계산 검증
6. Phase 4: 구현 파일 목록 + Supabase 설정 안내 보고

### 후속 작업 흐름
1. 사용자: "순위표 UI를 모바일에서 더 잘 보이게 수정해줘"
2. Phase 0: _workspace 존재 + 부분 수정 → frontend-dev만 재호출
3. `_workspace/02_frontend_components.md` 읽어 현재 구현 파악
4. frontend-dev가 RankingTable 컴포넌트만 수정
5. QA 간이 검증 후 보고

### 에러 흐름
1. Phase 2에서 backend-dev가 Supabase 마이그레이션 실패
2. 에러 내용 파악 후 단순 구조로 fallback (뷰 제거)
3. frontend-dev에게 API 지연 알림 → 목 데이터로 UI 진행
4. 마이그레이션 성공 후 목 데이터를 실제 API로 교체
