# QA 검증 보고서

> 작성일: 2026-05-26
> 대상: B2B Tennis 복식 리그 사이트 (Phase 1~3)

---

## 검증 결과 요약
- 통과: 22개
- 수정됨: 3개 (직접 수정한 버그)
- 미구현: 0개

---

## 수정한 버그 목록

| 파일 | 문제 | 수정 내용 | 심각도 |
|------|------|----------|--------|
| `src/app/players/page.tsx` (3곳), `src/app/games/page.tsx` (1곳), `src/app/games/new/page.tsx` (1곳) | API 에러 응답 파싱 불일치: API는 `{ error: "문자열" }` 형태로 반환하나, 프론트에서 `json.error?.message`로 접근하여 항상 undefined가 됨. 사용자에게 서버 에러 메시지가 절대 표시되지 않음 | `json.error?.message`를 `json.error`로 변경 (5곳) | **높음** |
| `src/app/page.tsx` | 서버 컴포넌트에서 자체 API를 `fetch()`로 호출하면서 쿠키를 전달하지 않아 항상 401 Unauthorized 발생. 대시보드의 최근 경기/이번 달 순위가 항상 빈 상태로 표시됨 | `fetch()` 기반 API 호출을 Supabase 클라이언트 직접 조회로 전면 교체. 서버 컴포넌트에서 이미 생성한 Supabase 인스턴스를 재활용하여 DB 직접 조회 | **치명적** |
| `src/types/database.ts`, `src/app/games/page.tsx` | `GameWithDetails` 타입의 `home_team`/`away_team`이 non-nullable로 정의되어 있으나, API가 `null`을 반환할 수 있음. 런타임 시 `Cannot read properties of null` 에러 가능 | `GameWithDetails` 인터페이스의 `home_team`/`away_team`을 nullable로 변경. games/page.tsx에서 옵셔널 체이닝(`?.`) 및 nullish coalescing(`??`) 적용 | **높음** |

---

## 통과 항목

### 1. 경계면 교차 검증

- [x] **1-1. players API <-> 프론트 타입 정합성**: API(`GET /api/players`)는 `{ data: Player[] }` 형태로 반환. 프론트(`players/page.tsx`)에서 `json.data`를 `Player[]`로 사용. 필드명 일치: `id`, `name`, `nickname`, `is_active`, `created_at`, `updated_at` 모두 일치
- [x] **1-2. games API <-> 프론트 사용 정합성**: API(`GET /api/games`)는 `game_teams` 배열을 `home_team`/`away_team` 객체로 변환하여 반환. 각 팀에 `player1`, `player2` 포함. 프론트에서 `game.home_team.player1.name` 등으로 접근 (수정 후 옵셔널 체이닝 적용)
- [x] **1-3. rankings API <-> 프론트 사용 정합성**: API는 `RankingEntry` 인터페이스와 동일한 구조 반환. 프론트에서 `entry.rank`, `entry.player_name`, `entry.player_nickname`, `entry.games_played`, `entry.wins`, `entry.draws`, `entry.losses`, `entry.total_points`, `entry.set_diff`, `entry.game_diff` 모두 정확히 사용
- [x] **1-4. games POST 요청 구조**: 프론트(`games/new/page.tsx`)가 전송하는 body: `played_at`, `home_player1_id`, `home_player2_id`, `away_player1_id`, `away_player2_id`, `sets` - API에서 받는 필드와 정확히 일치

### 2. 테니스 도메인 로직 검증

- [x] **2-1. 순위 계산 로직**: `rankings/route.ts`에서 `POINTS.WIN(3)`, `POINTS.DRAW(1)`, `POINTS.LOSS(0)` 적용. 정렬 순서: `total_points DESC` -> `set_diff DESC` -> `game_diff DESC` 올바름. 무승부(세트 동수) 처리 있음 (`homeTeam.sets_won === awayTeam.sets_won` -> draws++)
- [x] **2-2. sets_won 계산**: `games/route.ts` POST 핸들러에서 각 세트 순회하며 `home_games > away_games`면 `homeSetsWon++`, 반대면 `awaySetsWon++`. `games_won` 계산도 `homeGamesWon += set.home_games` / `awayGamesWon += set.away_games`로 올바름
- [x] **2-3. 중복 선수 검증**: API에서 `new Set(playerIds).size !== 4` 체크하여 4명 중복 확인. 프론트에서 `isPlayerDisabled()` 함수로 이미 선택된 선수 `<option disabled>` 처리 구현

### 3. 인증/보안 검증

- [x] **3-1. middleware.ts**: 보호 경로 `/players`, `/games`, `/rankings`가 `protectedPaths` 배열에 설정. `pathname.startsWith()` 기반 매칭으로 하위 경로(`/games/new` 등)도 보호. 미인증 시 `/auth/login`으로 리다이렉트 처리 있음
- [x] **3-2. API 인증**: 모든 API Route(`players/route.ts`, `players/[id]/route.ts`, `games/route.ts`, `games/[id]/route.ts`, `rankings/route.ts`)에서 `supabase.auth.getUser()` 체크 후 미인증 시 `{ error: 'Unauthorized' }, { status: 401 }` 반환
- [x] **3-3. 경기 삭제 권한**: `games/[id]/route.ts`에서 `game.recorded_by !== user.id` 체크하여 본인 기록만 삭제 가능. 403 Forbidden 반환

### 4. DB 스키마 검증

- [x] **4-1. players 테이블**: `players` 테이블이 `auth.users`와 독립적으로 존재. `gen_random_uuid()` PK 사용
- [x] **4-2. game_teams FK 참조**: `player1_id UUID NOT NULL REFERENCES public.players(id)`, `player2_id UUID NOT NULL REFERENCES public.players(id)` - players 테이블 참조 올바름
- [x] **4-3. ON DELETE CASCADE**: `game_teams.game_id`와 `game_sets.game_id` 모두 `ON DELETE CASCADE` 설정 있음. `profiles.id`도 `auth.users(id) ON DELETE CASCADE` 설정
- [x] **4-4. RLS 정책**: 5개 테이블 모두 `ENABLE ROW LEVEL SECURITY` 적용. 각 테이블별 SELECT/INSERT/UPDATE/DELETE 정책 존재. `authenticated` 역할 기반 접근 제어
- [x] **4-5. CHECK 제약조건**: `game_teams.player1_id != player2_id`, `game_sets.set_number BETWEEN 1 AND 3`, `games.status IN ('completed', 'cancelled')` 등 올바르게 설정
- [x] **4-6. 인덱스**: `idx_games_played_at`, `idx_games_status_played_at`, `idx_game_teams_player1`, `idx_game_teams_player2`, `idx_game_sets_game_id`, `idx_players_is_active`, `idx_players_name` 등 필요한 인덱스 모두 존재

### 5. 프로젝트 설정 검증

- [x] **5-1. package.json**: `next` 14.2.5, `@supabase/supabase-js` ^2.44.4, `@supabase/ssr` ^0.5.0 포함. `date-fns`, `zod`도 포함. TypeScript, Tailwind CSS 관련 devDependencies 완비
- [x] **5-2. .env.example**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 문서화됨
- [x] **5-3. next.config.js**: 기본 설정 (`const nextConfig = {}; module.exports = nextConfig`) - 현재 단계에서 특별한 설정 불필요하므로 적절
- [x] **5-4. tailwind.config.ts**: `content: ['./src/**/*.{js,ts,jsx,tsx,mdx}']` 포함. src 하위 모든 파일 대상. 테니스 테마 색상 커스텀 설정 포함

### 6. UI/UX 검증

- [x] **6-1. BottomNav**: 4개 탭 (홈 `/`, 경기 `/games`, 순위 `/rankings`, 선수 `/players`) 구현. `usePathname()` 기반 active 상태 감지. 홈은 `pathname === '/'` 정확 매칭, 나머지는 `pathname.startsWith(href)`로 하위 경로 포함
- [x] **6-2. 날짜 필터 (rankings/page.tsx)**: 이번 달/지난 달/올해/작년/직접 입력 5개 프리셋 버튼 존재. `preset === 'custom'`일 때 from/to date input 표시. 날짜 범위 텍스트 표시 (`formatDateRange`)
- [x] **6-3. 경기 기록 폼 (games/new/page.tsx)**: 세트 추가 버튼 (최대 3개까지), 세트 삭제 버튼 (최소 1개까지) 있음. 선수 중복 선택 방지 (`isPlayerDisabled`) 로직 있음

---

## 추가 권고사항

1. **`NEXT_PUBLIC_SITE_URL` 환경 변수 미문서화**: `page.tsx`(대시보드)에서 `process.env.NEXT_PUBLIC_SITE_URL`을 참조하고 있었으나 `.env.example`에 포함되어 있지 않았음. 수정 후 해당 변수 의존성이 제거되었으므로 현재는 문제 없음.

2. **세트 점수 프론트엔드 유효성 검증 부족**: `games/new/page.tsx`에서 세트 점수를 0~7 사이 정수로만 제한하지만, 실제 테니스 점수 유효성(6-x, 7-5, 7-6)은 검증하지 않음. 서버 측에서 검증하고 있으므로 기능상 문제는 없으나, 사용자 경험을 위해 프론트에서도 미리 검증하면 좋음.

3. **타이브레이크 점수 입력 UI 부재**: API는 `home_tiebreak`/`away_tiebreak` 필드를 지원하지만, `games/new/page.tsx`에서 타이브레이크 점수 입력 UI가 없음. 7-6 세트에서 타이브레이크 상세 기록이 불가능함.

4. **선수 삭제 시 비활성 표시**: `players/page.tsx`에서 soft delete된 선수는 `비활성` 뱃지를 표시하지만, 기본 조회가 `active_only=true`이므로 비활성 선수가 목록에 나타나지 않음. 비활성 선수 조회 토글 UI 추가를 권장.

5. **경기 삭제 권한 표시 부족**: `games/page.tsx`에서 모든 경기에 삭제 버튼이 표시되지만, 실제로는 본인이 기록한 경기만 삭제 가능. 다른 사용자의 경기 삭제 시도 시 403 에러가 발생함. 기록자가 아닌 경기의 삭제 버튼을 숨기거나 비활성화하면 UX 개선 가능.

6. **동점 순위 처리**: 현재 `rankings/route.ts`에서 모든 타이브레이커(포인트, 세트득실차, 게임득실차)가 동일할 경우 동일 순위가 아닌 배열 인덱스 기반 순위가 부여됨 (`rank: idx + 1`). 동점자 처리 로직 추가를 권장.
