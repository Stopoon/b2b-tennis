---
name: db-schema
description: "B2B Tennis 복식 리그의 Supabase PostgreSQL 스키마를 설계하고 마이그레이션 SQL을 생성하는 스킬. 테이블 설계, DB 구조 변경, Supabase 스키마 작업, RLS 정책 설정 시 반드시 이 스킬을 사용할 것."
---

# DB Schema — Supabase 스키마 설계

B2B Tennis 복식 리그 사이트의 Supabase PostgreSQL 스키마 설계 가이드.

## 핵심 테이블 구조

### 필수 테이블 목록

```sql
-- 1. profiles (Supabase Auth 연동 선수 프로필)
-- 2. seasons (리그 시즌 관리)
-- 3. games (경기 기록 헤더)
-- 4. game_teams (경기의 팀 구성 - 복식 2인 1팀)
-- 5. game_sets (세트별 점수)
-- 6. player_stats (집계 통계 캐시 - 선택적)
```

### 테이블 설계 원칙

**profiles 테이블:**
- Supabase `auth.users`와 1:1 연결 (`id UUID REFERENCES auth.users`)
- 닉네임, 실명(선택), 핸드폰 마지막 4자리(선수 식별용) 포함
- 가입 승인 필드로 비허가 인원 차단 가능

**seasons 테이블:**
- `start_date`, `end_date` 기간 정의
- `is_active` boolean으로 현재 시즌 식별
- 시즌 이름(예: "2026 상반기")

**games 테이블:**
- `season_id` FK (시즌 연결 필수)
- `played_at` TIMESTAMPTZ (경기 일시)
- `status`: 'scheduled' | 'completed' | 'cancelled'
- `recorded_by` UUID (기록자, profiles FK)

**game_teams 테이블 (복식 핵심):**
- `game_id` FK
- `side`: 'home' | 'away'
- `player1_id`, `player2_id` UUID FK (복식 2인)
- `sets_won` INT (획득 세트 수)
- `games_won` INT (총 획득 게임 수)

**game_sets 테이블:**
- `game_id` FK, `set_number` INT (1,2,3...)
- `home_games`, `away_games` INT (각 세트의 게임 점수)
- 타이브레이크: `home_tiebreak`, `away_tiebreak` INT NULLABLE

## RLS 정책 설계

```sql
-- 원칙: 읽기는 모두 허용, 쓰기는 인증+권한 체크
-- games INSERT: 인증된 사용자 + 승인된 멤버만
-- profiles UPDATE: 본인 레코드만
-- seasons: 관리자만 INSERT/UPDATE
```

## 인덱스 전략

순위 계산 쿼리가 빈번하므로 복합 인덱스 필수:
```sql
CREATE INDEX idx_game_teams_player ON game_teams(player1_id, player2_id);
CREATE INDEX idx_games_season ON games(season_id, status, played_at DESC);
```

## 마이그레이션 파일 컨벤션

```
supabase/migrations/
  20260526_001_initial_schema.sql
  20260526_002_rls_policies.sql
  20260526_003_indexes.sql
```

## 스키마 변경 시 체크리스트
- [ ] 기존 마이그레이션 파일 읽기 (`supabase/migrations/` 확인)
- [ ] 변경 사항이 기존 RLS 정책에 영향 주는지 확인
- [ ] TypeScript 타입 파일(`types/database.ts`) 동기화 필요 여부
- [ ] 순위 계산 쿼리에 영향 주는지 확인

## references/ 참조
- 세부 SQL 예시와 타이브레이크 처리: `references/schema-examples.md`
