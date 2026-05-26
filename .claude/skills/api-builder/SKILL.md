---
name: api-builder
description: "B2B Tennis 사이트의 Next.js API Routes + Supabase 서버 로직을 구현하는 스킬. API 엔드포인트 구현, Supabase 쿼리, 인증 처리, 비즈니스 로직 작업 시 반드시 이 스킬을 사용할 것. 백엔드, API 개발, 서버 로직 요청 시에도 사용."
---

# API Builder — Next.js API Routes + Supabase

B2B Tennis 복식 리그 사이트의 서버 로직 구현 가이드.

## API Route 기본 패턴

```typescript
// app/api/games/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // 인증 필요 시 user null 체크

  const { searchParams } = new URL(req.url)
  const seasonId = searchParams.get('season_id')

  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      game_teams (
        side, sets_won, games_won,
        player1:profiles!player1_id(id, nickname),
        player2:profiles!player2_id(id, nickname)
      ),
      game_sets (set_number, home_games, away_games)
    `)
    .eq('season_id', seasonId)
    .eq('status', 'completed')
    .order('played_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

## 게임 기록 POST 패턴

```typescript
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  // 1. 유효성 검증 (Zod 권장)
  // 2. 같은 선수가 양팀에 있는지 체크
  const players = [body.home_player1, body.home_player2, body.away_player1, body.away_player2]
  if (new Set(players).size !== 4) {
    return NextResponse.json({ error: '같은 선수가 양팀에 있을 수 없습니다' }, { status: 400 })
  }

  // 3. 트랜잭션 형태로 순서대로 삽입
  const { data: game, error: gameError } = await supabase
    .from('games').insert({ season_id: body.season_id, played_at: body.played_at, recorded_by: user.id, status: 'completed' })
    .select().single()

  if (gameError) return NextResponse.json({ error: gameError.message }, { status: 500 })

  // game_teams, game_sets 순서대로 삽입...
}
```

## 순위 계산 API

```typescript
// app/api/rankings/route.ts
// league-engine 스킬의 SQL 쿼리를 사용
// 결과를 순위 순서로 정렬하여 반환
// 캐시 전략: revalidate = 60 (1분 캐시)
export const revalidate = 60

export async function GET(req: NextRequest) {
  // league-engine 스킬의 집계 SQL 실행
  // 정렬: total_points DESC, set_diff DESC, game_diff DESC
}
```

## Supabase Auth 미들웨어

```typescript
// middleware.ts (루트)
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(req) {
  // 보호된 경로: /games/new, /profile, /api/games (POST)
  // 비보호: /, /league, /players, /api/* (GET)
}
```

## 에러 응답 표준화

```typescript
// 모든 API에서 통일된 에러 형식 사용
interface ApiError {
  error: string
  code?: string  // 'UNAUTHORIZED' | 'VALIDATION' | 'DB_ERROR'
}

// HTTP 상태 코드 기준
// 400: 잘못된 요청 (중복 선수, 유효하지 않은 점수)
// 401: 인증 필요
// 403: 권한 없음 (타인 데이터 수정)
// 500: 서버/DB 에러
```

## 환경 변수
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # 서버 전용 (클라이언트 노출 금지)
```

## references/ 참조
- Supabase RLS 정책 패턴: `references/rls-patterns.md`
