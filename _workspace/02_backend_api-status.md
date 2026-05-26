# B2B Tennis 백엔드 API 구현 상태

> 작성일: 2026-05-26
> 상태: Phase 2 (Backend) 완료

---

## 구현 완료 파일 목록

### 설정 파일
| 파일 | 설명 |
|------|------|
| `package.json` | 프로젝트 의존성 (Next.js 14, Supabase SSR, Zod 등) |
| `tsconfig.json` | TypeScript 설정 (`@/*` 경로 별칭 포함) |
| `next.config.js` | Next.js 설정 |
| `tailwind.config.ts` | Tailwind CSS + tennis 테마 색상 |
| `postcss.config.js` | PostCSS 설정 |
| `.env.example` | 환경 변수 템플릿 |

### 인증 / 미들웨어
| 파일 | 설명 |
|------|------|
| `middleware.ts` | Supabase SSR 미들웨어. `/players`, `/games`, `/rankings` 보호 |
| `src/app/auth/callback/route.ts` | Supabase OAuth 콜백 처리 |

### 데이터베이스
| 파일 | 설명 |
|------|------|
| `supabase/migrations/20260526_001_initial.sql` | 통합 마이그레이션 (profiles, players, games, game_teams, game_sets, RLS, 트리거) |

### 타입 / 라이브러리
| 파일 | 설명 |
|------|------|
| `src/types/database.ts` | Database 타입 + 도메인 인터페이스 + API 요청/응답 타입 |
| `src/lib/supabase/client.ts` | 브라우저용 Supabase 클라이언트 (`Database` 타입 제네릭) |
| `src/lib/supabase/server.ts` | 서버용 Supabase 클라이언트 (`Database` 타입 제네릭) |

### API Routes
| 파일 | 메서드 | 설명 |
|------|--------|------|
| `src/app/api/players/route.ts` | GET, POST | 선수 목록 조회, 선수 등록 |
| `src/app/api/players/[id]/route.ts` | GET, PUT, DELETE | 선수 상세, 수정, 삭제 |
| `src/app/api/games/route.ts` | GET, POST | 경기 목록 조회, 경기 기록 |
| `src/app/api/games/[id]/route.ts` | DELETE | 경기 삭제 |
| `src/app/api/rankings/route.ts` | GET | 순위 조회 |

---

## API 엔드포인트 상세

### 1. GET /api/players

선수 목록 조회.

**Query Parameters:**
- `active_only` (boolean, default: `true`) - `false`이면 비활성 선수 포함

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "홍길동",
      "nickname": "길동이",
      "is_active": true,
      "created_at": "2026-01-15T09:00:00+00:00",
      "updated_at": "2026-01-15T09:00:00+00:00"
    }
  ]
}
```

**Errors:** `401 Unauthorized`

---

### 2. POST /api/players

선수 등록.

**Request Body:**
```json
{
  "name": "홍길동",
  "nickname": "길동이"
}
```

**Validation:**
- `name`: 필수, 1~50자
- `nickname`: 선택, 30자 이내

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "홍길동",
    "nickname": "길동이",
    "is_active": true,
    "created_at": "2026-05-26T09:00:00+00:00",
    "updated_at": "2026-05-26T09:00:00+00:00"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 Unauthorized`

---

### 3. GET /api/players/[id]

선수 상세 조회.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "홍길동",
    "nickname": "길동이",
    "is_active": true,
    "created_at": "2026-01-15T09:00:00+00:00",
    "updated_at": "2026-01-15T09:00:00+00:00"
  }
}
```

**Errors:** `401 Unauthorized`, `404 Not Found`

---

### 4. PUT /api/players/[id]

선수 정보 수정.

**Request Body:**
```json
{
  "name": "홍길동(수정)",
  "nickname": "수정닉네임"
}
```

**Validation:**
- 최소 1개 필드 필수
- `name`: 1~50자
- `nickname`: 30자 이내

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "홍길동(수정)",
    "nickname": "수정닉네임",
    "is_active": true,
    "created_at": "2026-01-15T09:00:00+00:00",
    "updated_at": "2026-05-26T10:00:00+00:00"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 Unauthorized`, `404 Not Found`

---

### 5. DELETE /api/players/[id]

선수 삭제. 경기 기록이 있으면 soft delete (is_active=false), 없으면 hard delete.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "deleted": true,
    "soft_delete": true
  }
}
```

**Errors:** `401 Unauthorized`, `404 Not Found`

---

### 6. GET /api/games

경기 목록 조회 (날짜 역순, 페이지네이션).

**Query Parameters:**
- `from` (YYYY-MM-DD, 선택) - 시작 날짜
- `to` (YYYY-MM-DD, 선택) - 종료 날짜
- `page` (number, default: 1) - 페이지 번호
- `limit` (number, default: 20, max: 100) - 페이지당 항목 수

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "played_at": "2026-05-25T14:00:00+00:00",
      "recorded_by": "uuid",
      "status": "completed",
      "home_team": {
        "id": "uuid",
        "side": "home",
        "player1": { "id": "uuid", "name": "홍길동", "nickname": "길동이" },
        "player2": { "id": "uuid", "name": "김철수", "nickname": null },
        "sets_won": 2,
        "games_won": 13
      },
      "away_team": {
        "id": "uuid",
        "side": "away",
        "player1": { "id": "uuid", "name": "이영희", "nickname": "영희" },
        "player2": { "id": "uuid", "name": "박민수", "nickname": null },
        "sets_won": 1,
        "games_won": 11
      },
      "sets": [
        { "set_number": 1, "home_games": 6, "away_games": 4, "home_tiebreak": null, "away_tiebreak": null },
        { "set_number": 2, "home_games": 4, "away_games": 6, "home_tiebreak": null, "away_tiebreak": null },
        { "set_number": 3, "home_games": 7, "away_games": 6, "home_tiebreak": 7, "away_tiebreak": 3 }
      ],
      "created_at": "2026-05-25T16:00:00+00:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "total_pages": 3
  }
}
```

**Errors:** `400 VALIDATION_ERROR` (잘못된 날짜), `401 Unauthorized`

---

### 7. POST /api/games

경기 결과 기록.

**Request Body:**
```json
{
  "played_at": "2026-05-25T14:00:00Z",
  "home_player1_id": "uuid",
  "home_player2_id": "uuid",
  "away_player1_id": "uuid",
  "away_player2_id": "uuid",
  "sets": [
    { "home_games": 6, "away_games": 4 },
    { "home_games": 7, "away_games": 5 }
  ]
}
```

**Validation:**
- 4명의 선수 ID가 모두 다르고, 존재하고, is_active=true
- 세트 1~3개, 각 세트 점수 유효성 (6-x, 7-5, 7-6+tiebreak)
- 7-6 아닌 세트에 타이브레이크 불가

**서버 자동 계산:**
- `sets_won`: 각 팀의 세트 승리 횟수
- `games_won`: 각 팀의 총 게임 수
- `recorded_by`: 인증된 사용자 ID

**Response (201):**
```json
{
  "data": {
    "id": "uuid",
    "played_at": "2026-05-25T14:00:00+00:00",
    "recorded_by": "uuid",
    "status": "completed",
    "home_team": { "id": "uuid", "side": "home", "player1": {...}, "player2": {...}, "sets_won": 2, "games_won": 13 },
    "away_team": { "id": "uuid", "side": "away", "player1": {...}, "player2": {...}, "sets_won": 0, "games_won": 9 },
    "sets": [...],
    "created_at": "2026-05-26T09:00:00+00:00"
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 Unauthorized`, `404 선수 없음`, `409 비활성 선수`

---

### 8. DELETE /api/games/[id]

경기 삭제 (hard delete, CASCADE).

**권한:** 해당 경기를 기록한 사용자(recorded_by)만 삭제 가능.

**Response (200):**
```json
{
  "data": {
    "id": "uuid",
    "deleted": true
  }
}
```

**Errors:** `401 Unauthorized`, `403 Forbidden`, `404 Not Found`

---

### 9. GET /api/rankings

기간 내 순위 조회.

**Query Parameters (필수):**
- `from` (YYYY-MM-DD) - 시작 날짜
- `to` (YYYY-MM-DD) - 종료 날짜

**순위 계산 로직:**
1. 기간 내 `status=completed` 경기만 대상
2. 각 선수별 통계 집계 (경기수, 승/무/패, 세트/게임 득실)
3. 포인트: 승(3) + 무(1) + 패(0)
4. 정렬: 포인트 DESC -> 세트득실차 DESC -> 게임득실차 DESC

**Response (200):**
```json
{
  "data": [
    {
      "rank": 1,
      "player_id": "uuid",
      "player_name": "홍길동",
      "player_nickname": "길동이",
      "games_played": 12,
      "wins": 8,
      "draws": 1,
      "losses": 3,
      "total_points": 25,
      "sets_for": 18,
      "sets_against": 9,
      "set_diff": 9,
      "games_for": 102,
      "games_against": 78,
      "game_diff": 24
    }
  ]
}
```

**Errors:** `400 VALIDATION_ERROR` (from/to 누락, 잘못된 형식, from > to), `401 Unauthorized`

---

## 설계 결정 사항

### players 테이블 (auth.users 독립)
- architect 설계에서는 `profiles`(auth.users 1:1)를 사용했으나, "20명 선수를 이름으로 관리"하는 요구사항에 맞게 `players` 독립 테이블로 변경
- `profiles`는 로그인 사용자 관리용으로 유지
- `game_teams`의 `player1_id`, `player2_id`는 `players.id`를 참조

### 에러 응답 형식
- 모든 에러: `{ error: string }` (단순 메시지)
- HTTP 상태 코드로 에러 유형 구분 (401, 403, 404, 400, 409, 500)

### 인증
- 모든 API에 Supabase Auth 인증 필수
- `middleware.ts`에서 페이지 보호 (비인증시 `/auth/login`으로 리다이렉트)
- API Routes에서 `supabase.auth.getUser()` 확인

### 경기 기록 트랜잭션
- Supabase JS 클라이언트에서는 실제 DB 트랜잭션이 불가하므로, 실패 시 수동 롤백 (games 삭제 -> CASCADE 처리)
