import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { POINTS } from '@/types/database'
import type { RankingEntry } from '@/types/database'

export const revalidate = 60

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const searchParams = req.nextUrl.searchParams
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // 필수 파라미터 검증
  if (!from || !to) {
    return NextResponse.json(
      { error: 'from과 to 파라미터는 필수입니다 (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(from) || !dateRegex.test(to)) {
    return NextResponse.json(
      { error: 'from, to 파라미터는 YYYY-MM-DD 형식이어야 합니다' },
      { status: 400 }
    )
  }

  if (from > to) {
    return NextResponse.json(
      { error: 'from은 to보다 이전이어야 합니다' },
      { status: 400 }
    )
  }

  // 기간 내 완료된 게임의 game_teams + 상대팀 조회
  const { data: games, error: gamesError } = await supabase
    .from('games')
    .select(`
      id,
      game_teams (
        id, side, player1_id, player2_id, sets_won, games_won
      )
    `)
    .eq('status', 'completed')
    .gte('played_at', `${from}T00:00:00Z`)
    .lte('played_at', `${to}T23:59:59Z`)

  if (gamesError) {
    return NextResponse.json(
      { error: gamesError.message },
      { status: 500 }
    )
  }

  if (!games || games.length === 0) {
    return NextResponse.json({ data: [] })
  }

  // 선수별 통계 집계
  const statsMap = new Map<
    string,
    {
      games_played: number
      wins: number
      draws: number
      losses: number
      sets_for: number
      sets_against: number
      games_for: number
      games_against: number
    }
  >()

  const initStats = () => ({
    games_played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    sets_for: 0,
    sets_against: 0,
    games_for: 0,
    games_against: 0,
  })

  for (const game of games) {
    const teams = game.game_teams as Array<{
      id: string
      side: string
      player1_id: string
      player2_id: string
      sets_won: number
      games_won: number
    }>

    if (teams.length !== 2) continue

    const homeTeam = teams.find((t) => t.side === 'home')
    const awayTeam = teams.find((t) => t.side === 'away')

    if (!homeTeam || !awayTeam) continue

    // home 팀 선수들 통계 업데이트
    const homePlayers = [homeTeam.player1_id, homeTeam.player2_id]
    const awayPlayers = [awayTeam.player1_id, awayTeam.player2_id]

    for (const playerId of homePlayers) {
      if (!statsMap.has(playerId)) statsMap.set(playerId, initStats())
      const s = statsMap.get(playerId)!
      s.games_played++
      s.sets_for += homeTeam.sets_won
      s.sets_against += awayTeam.sets_won
      s.games_for += homeTeam.games_won
      s.games_against += awayTeam.games_won

      if (homeTeam.sets_won > awayTeam.sets_won) {
        s.wins++
      } else if (homeTeam.sets_won === awayTeam.sets_won) {
        s.draws++
      } else {
        s.losses++
      }
    }

    for (const playerId of awayPlayers) {
      if (!statsMap.has(playerId)) statsMap.set(playerId, initStats())
      const s = statsMap.get(playerId)!
      s.games_played++
      s.sets_for += awayTeam.sets_won
      s.sets_against += homeTeam.sets_won
      s.games_for += awayTeam.games_won
      s.games_against += homeTeam.games_won

      if (awayTeam.sets_won > homeTeam.sets_won) {
        s.wins++
      } else if (awayTeam.sets_won === homeTeam.sets_won) {
        s.draws++
      } else {
        s.losses++
      }
    }
  }

  // 선수 이름 조회
  const playerIds = Array.from(statsMap.keys())
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, name, nickname')
    .in('id', playerIds)

  if (playersError) {
    return NextResponse.json(
      { error: playersError.message },
      { status: 500 }
    )
  }

  const playerNameMap = new Map<
    string,
    { name: string; nickname: string | null }
  >()
  for (const p of players || []) {
    playerNameMap.set(p.id, { name: p.name, nickname: p.nickname })
  }

  // 순위 배열 생성
  const rankings: Omit<RankingEntry, 'rank'>[] = []

  for (const [playerId, stats] of statsMap.entries()) {
    const playerInfo = playerNameMap.get(playerId)
    const totalPoints =
      stats.wins * POINTS.WIN +
      stats.draws * POINTS.DRAW +
      stats.losses * POINTS.LOSS

    rankings.push({
      player_id: playerId,
      player_name: playerInfo?.name || 'Unknown',
      player_nickname: playerInfo?.nickname || null,
      games_played: stats.games_played,
      wins: stats.wins,
      draws: stats.draws,
      losses: stats.losses,
      total_points: totalPoints,
      sets_for: stats.sets_for,
      sets_against: stats.sets_against,
      set_diff: stats.sets_for - stats.sets_against,
      games_for: stats.games_for,
      games_against: stats.games_against,
      game_diff: stats.games_for - stats.games_against,
    })
  }

  // 정렬: 포인트 -> 세트득실차 -> 게임득실차
  rankings.sort((a, b) => {
    if (b.total_points !== a.total_points)
      return b.total_points - a.total_points
    if (b.set_diff !== a.set_diff) return b.set_diff - a.set_diff
    if (b.game_diff !== a.game_diff) return b.game_diff - a.game_diff
    return 0
  })

  // 순위 번호 부여
  const rankedData: RankingEntry[] = rankings.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }))

  return NextResponse.json({ data: rankedData })
}
