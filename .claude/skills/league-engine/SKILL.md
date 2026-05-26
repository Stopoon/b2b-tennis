---
name: league-engine
description: "B2B Tennis 복식 리그의 순위 계산, 점수 집계, 득실차 처리 로직을 구현하는 스킬. 순위 계산, 리그 점수, 득실차, 통계 집계, 랭킹 알고리즘 작업 시 반드시 이 스킬을 사용할 것."
---

# League Engine — 복식 리그 점수 계산 로직

B2B Tennis 복식 리그의 순위 계산 및 통계 집계 로직.

## 점수 체계

### 경기 포인트 계산
```typescript
// 팀 기준 경기 포인트
const POINTS = {
  WIN: 3,
  DRAW: 1,   // 복식에서 세트 동수 (예: 1-1) 시 적용 가능
  LOSS: 0,
}

// 복식이므로 개인 포인트 = 팀 포인트 (파트너와 동일)
```

### 순위 결정 기준 (우선순위 순서)
```
1. 경기 포인트 합계 (승×3 + 무×1)
2. 세트 득실차 (획득 세트 - 실점 세트)
3. 게임 득실차 (총 획득 게임 수 - 총 실점 게임 수)
4. 직접 대결 결과 (동점자들끼리 맞붙은 경기 기록)
5. 최근 경기 결과 (최신 경기 우선)
```

## TypeScript 구현 패턴

### 개인 통계 집계
```typescript
interface PlayerStats {
  playerId: string
  totalPoints: number
  wins: number
  draws: number
  losses: number
  gamesPlayed: number
  setsFor: number       // 획득 세트
  setsAgainst: number   // 실점 세트
  setDiff: number       // setsFor - setsAgainst
  gamesFor: number      // 획득 게임 수
  gamesAgainst: number  // 실점 게임 수
  gameDiff: number      // gamesFor - gamesAgainst
}
```

### 순위 정렬 함수
```typescript
function sortByRanking(players: PlayerStats[]): PlayerStats[] {
  return players.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints
    if (b.setDiff !== a.setDiff) return b.setDiff - a.setDiff
    if (b.gameDiff !== a.gameDiff) return b.gameDiff - a.gameDiff
    return 0 // 이후 직접 대결, 최근 경기 처리 필요
  })
}
```

### Supabase SQL로 집계 (API 최적화용)
```sql
-- 선수별 시즌 통계 집계 쿼리
SELECT
  p.id as player_id,
  p.nickname,
  COUNT(gt.id) as games_played,
  SUM(CASE WHEN gt.sets_won > opp.sets_won THEN 3
           WHEN gt.sets_won = opp.sets_won THEN 1
           ELSE 0 END) as total_points,
  SUM(gt.sets_won - opp.sets_won) as set_diff,
  SUM(gt.games_won - opp.games_won) as game_diff
FROM profiles p
JOIN game_teams gt ON (p.id = gt.player1_id OR p.id = gt.player2_id)
JOIN game_teams opp ON (opp.game_id = gt.game_id AND opp.side != gt.side)
JOIN games g ON (g.id = gt.game_id AND g.season_id = $1 AND g.status = 'completed')
GROUP BY p.id, p.nickname
ORDER BY total_points DESC, set_diff DESC, game_diff DESC
```

## 세트 점수 유효성 검증
```typescript
function isValidSetScore(homeGames: number, awayGames: number): boolean {
  const max = Math.max(homeGames, awayGames)
  const min = Math.min(homeGames, awayGames)

  // 일반 세트: 6-x (상대 4 이하), 7-5, 7-6(타이브레이크)
  if (max === 6 && min <= 4) return true
  if (max === 7 && (min === 5 || min === 6)) return true
  // 한국 동호회 관행: 4게임제도 허용 (설정 가능)
  return false
}
```

## 파트너 조합 통계 (복식 특화)
- 같은 파트너와의 승률을 별도 집계 (누구와 짝꿍이 좋은지)
- 경기별 파트너가 다를 수 있으므로 개인 기준 + 파트너 조합 기준 모두 제공

## 구현 시 주의사항
- 한 선수가 같은 게임에서 양쪽 팀에 등록될 수 없다 (DB 제약 또는 API 검증)
- 시즌 필터를 항상 적용하라 (전체 누적이 아닌 시즌별 순위)
- 순위 계산은 캐시하거나 materialized view 고려 (100명 이상 시)
