# B2B Tennis 복식 리그 - API 엔드포인트 명세

> Next.js 14 App Router의 Route Handlers (`app/api/...`) 기반.
> 모든 엔드포인트는 Supabase Auth 인증 필수 (Bearer Token).

---

## 공통 사항

### 인증
- 모든 요청에 `Authorization: Bearer <supabase_access_token>` 헤더 필요.
- 미인증 시 `401 Unauthorized` 반환.

### 응답 형식
```json
// 성공
{
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 45, "total_pages": 3 }
}

// 에러
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "설명 메시지",
    "details": { "field": "에러 상세" }
  }
}
```

### 공통 에러 코드
| HTTP | code | 설명 |
|------|------|------|
| 401 | `UNAUTHORIZED` | 인증 토큰 없음 또는 만료 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스 없음 |
| 400 | `VALIDATION_ERROR` | 요청 데이터 유효성 실패 |
| 409 | `CONFLICT` | 중복 또는 충돌 |
| 500 | `INTERNAL_ERROR` | 서버 내부 오류 |

---

## 1. 선수 관리

### GET /api/players

선수 목록 조회.

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `active_only` | boolean | N | `true` | `true`이면 `is_active=true`만 반환 |

**응답 (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "홍길동",
      "nickname": "길동이",
      "is_active": true,
      "created_at": "2026-01-15T09:00:00Z",
      "updated_at": "2026-01-15T09:00:00Z"
    }
  ]
}
```

**에러:**
- `401`: 미인증

---

### POST /api/players

선수 등록. Supabase Auth에 사용자를 초대(invite)하고, 트리거로 profiles 자동 생성 후 name/nickname을 업데이트하는 방식 또는 직접 profiles에 INSERT하는 방식.

> 실제 구현에서는 관리 편의상 profiles 테이블에 직접 INSERT 하되, auth.users와 분리된 "선수 등록" 개념으로 처리할 수도 있음. 설계 결정 문서 참고.

**Request Body:**
```json
{
  "name": "홍길동",
  "nickname": "길동이"  // 선택
}
```

**유효성 검증:**
- `name`: 필수, 1~50자
- `nickname`: 선택, 0~30자

**응답 (201):**
```json
{
  "data": {
    "id": "uuid",
    "name": "홍길동",
    "nickname": "길동이",
    "is_active": true,
    "created_at": "2026-05-26T09:00:00Z",
    "updated_at": "2026-05-26T09:00:00Z"
  }
}
```

**에러:**
- `400 VALIDATION_ERROR`: name 누락 또는 길이 초과
- `401`: 미인증

---

### GET /api/players/[id]

특정 선수 상세 조회.

**Path Parameters:**
- `id` (UUID): 선수 ID

**응답 (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "홍길동",
    "nickname": "길동이",
    "is_active": true,
    "created_at": "2026-01-15T09:00:00Z",
    "updated_at": "2026-01-15T09:00:00Z"
  }
}
```

**에러:**
- `404 NOT_FOUND`: 해당 ID의 선수 없음

---

### PUT /api/players/[id]

선수 정보 수정.

**Path Parameters:**
- `id` (UUID): 선수 ID

**Request Body:**
```json
{
  "name": "홍길동(수정)",
  "nickname": "수정된닉네임"
}
```

**유효성 검증:**
- 최소 하나 이상의 필드 필요
- `name`: 1~50자
- `nickname`: 0~30자

**응답 (200):**
```json
{
  "data": {
    "id": "uuid",
    "name": "홍길동(수정)",
    "nickname": "수정된닉네임",
    "is_active": true,
    "created_at": "2026-01-15T09:00:00Z",
    "updated_at": "2026-05-26T10:00:00Z"
  }
}
```

**에러:**
- `400 VALIDATION_ERROR`: 빈 body 또는 유효하지 않은 값
- `404 NOT_FOUND`: 해당 ID의 선수 없음

---

### DELETE /api/players/[id]

선수 삭제. 경기 기록이 있으면 soft delete (`is_active = false`), 없으면 hard delete.

**Path Parameters:**
- `id` (UUID): 선수 ID

**응답 (200):**
```json
{
  "data": {
    "id": "uuid",
    "deleted": true,
    "soft_delete": true  // true=비활성화, false=완전삭제
  }
}
```

**에러:**
- `404 NOT_FOUND`: 해당 ID의 선수 없음

---

## 2. 경기 관리

### GET /api/games

경기 목록 조회 (날짜 역순).

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `from` | string (YYYY-MM-DD) | N | - | 시작 날짜 (이상) |
| `to` | string (YYYY-MM-DD) | N | - | 종료 날짜 (이하) |
| `page` | number | N | `1` | 페이지 번호 |
| `limit` | number | N | `20` | 페이지당 항목 수 (최대 100) |

**응답 (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "played_at": "2026-05-25T14:00:00Z",
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
      "created_at": "2026-05-25T16:00:00Z"
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

**에러:**
- `400 VALIDATION_ERROR`: 잘못된 날짜 형식

---

### POST /api/games

경기 결과 기록 (트랜잭션으로 games + game_teams + game_sets 일괄 생성).

**Request Body:**
```json
{
  "played_at": "2026-05-25T14:00:00Z",
  "home_player1_id": "uuid",
  "home_player2_id": "uuid",
  "away_player1_id": "uuid",
  "away_player2_id": "uuid",
  "sets": [
    { "set_number": 1, "home_games": 6, "away_games": 4 },
    { "set_number": 2, "home_games": 4, "away_games": 6 },
    { "set_number": 3, "home_games": 7, "away_games": 6, "home_tiebreak": 7, "away_tiebreak": 3 }
  ]
}
```

**유효성 검증:**
- 4명의 선수 ID가 모두 유효한 UUID이고, 모두 존재하고 `is_active = true`
- 4명이 모두 서로 다른 선수 (같은 선수가 양팀 등록 불가)
- `home_player1_id != home_player2_id` (같은 팀 내 중복 불가)
- `sets`: 1~3개, set_number는 1부터 연속
- 각 세트: `home_games`, `away_games`는 0 이상 정수
- 세트 점수 유효성: (6-x, x<=4) 또는 (7-5) 또는 (7-6 + 타이브레이크 필수)
- 타이브레이크: 7-6일 때만 허용, 그 외엔 null

**서버 측 자동 계산:**
- 각 팀의 `sets_won`: 세트 승리 횟수 집계
- 각 팀의 `games_won`: 전 세트 게임 수 합산
- `recorded_by`: 인증된 사용자의 ID 자동 설정

**응답 (201):**
```json
{
  "data": {
    "id": "uuid",
    "played_at": "2026-05-25T14:00:00Z",
    "status": "completed",
    "home_team": { ... },
    "away_team": { ... },
    "sets": [ ... ]
  }
}
```

**에러:**
- `400 VALIDATION_ERROR`: 선수 중복, 세트 점수 오류 등
- `404 NOT_FOUND`: 존재하지 않는 선수 ID
- `409 CONFLICT`: 비활성(soft-deleted) 선수 포함

---

### DELETE /api/games/[id]

경기 삭제 (hard delete - CASCADE로 game_teams, game_sets도 함께 삭제).

**Path Parameters:**
- `id` (UUID): 경기 ID

**권한 검증:**
- 해당 경기를 기록한 사용자(`recorded_by`)만 삭제 가능
- RLS 정책에서도 enforced

**응답 (200):**
```json
{
  "data": {
    "id": "uuid",
    "deleted": true
  }
}
```

**에러:**
- `403 FORBIDDEN`: 본인이 기록한 경기가 아님
- `404 NOT_FOUND`: 해당 ID의 경기 없음

---

## 3. 순위 조회

### GET /api/rankings

기간 내 모든 선수의 순위를 계산하여 반환.

**Query Parameters:**
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|------|--------|------|
| `from` | string (YYYY-MM-DD) | Y | - | 시작 날짜 (이상) |
| `to` | string (YYYY-MM-DD) | Y | - | 종료 날짜 (이하) |

**순위 계산 로직:**
1. 기간 내 `status = 'completed'`인 경기만 대상
2. 각 선수별 경기 참여 수, 승/무/패 집계
3. 포인트: 승(3) + 무(1) + 패(0)
4. 정렬 기준: 포인트 DESC -> 세트득실차 DESC -> 게임득실차 DESC

**승/무/패 판정 (팀 단위, 개인에게 동일 적용):**
- 승리: 내 팀 `sets_won` > 상대 팀 `sets_won`
- 무승부: 내 팀 `sets_won` = 상대 팀 `sets_won`
- 패배: 내 팀 `sets_won` < 상대 팀 `sets_won`

**응답 (200):**
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
    },
    {
      "rank": 2,
      "player_id": "uuid",
      "player_name": "김철수",
      "player_nickname": null,
      "games_played": 10,
      "wins": 7,
      "draws": 0,
      "losses": 3,
      "total_points": 21,
      "sets_for": 15,
      "sets_against": 8,
      "set_diff": 7,
      "games_for": 90,
      "games_against": 65,
      "game_diff": 25
    }
  ]
}
```

**에러:**
- `400 VALIDATION_ERROR`: from/to 누락 또는 잘못된 날짜 형식, from > to
- 기간 내 경기가 없으면 빈 배열 반환 (에러가 아님)

---

## API 라우트 파일 구조 (Next.js App Router)

```
app/
  api/
    players/
      route.ts          → GET (목록), POST (등록)
      [id]/
        route.ts        → GET (상세), PUT (수정), DELETE (삭제)
    games/
      route.ts          → GET (목록), POST (기록)
      [id]/
        route.ts        → DELETE (삭제)
    rankings/
      route.ts          → GET (순위 조회)
```
