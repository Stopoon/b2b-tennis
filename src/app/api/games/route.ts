import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { Database } from '@/types/database'

type GameRow = Database['public']['Tables']['games']['Row']

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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

  // 날짜 형식 검증
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (from && !dateRegex.test(from)) {
    return NextResponse.json(
      { error: 'from 파라미터는 YYYY-MM-DD 형식이어야 합니다' },
      { status: 400 }
    )
  }
  if (to && !dateRegex.test(to)) {
    return NextResponse.json(
      { error: 'to 파라미터는 YYYY-MM-DD 형식이어야 합니다' },
      { status: 400 }
    )
  }

  // 전체 갯수 조회
  let countQuery = supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  if (from) countQuery = countQuery.gte('played_at', `${from}T00:00:00Z`)
  if (to) countQuery = countQuery.lte('played_at', `${to}T23:59:59Z`)

  const { count: total, error: countError } = await countQuery

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  const totalCount = total ?? 0
  const totalPages = Math.ceil(totalCount / limit)
  const offset = (page - 1) * limit

  // 게임 목록 조회
  let query = supabase
    .from('games')
    .select(`
      *,
      game_teams (
        id, side, player1_id, player2_id, sets_won, games_won,
        player1:players!game_teams_player1_id_fkey(id, name, nickname),
        player2:players!game_teams_player2_id_fkey(id, name, nickname)
      ),
      game_sets (id, set_number, home_games, away_games, home_tiebreak, away_tiebreak)
    `)
    .eq('status', 'completed')
    .order('played_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (from) query = query.gte('played_at', `${from}T00:00:00Z`)
  if (to) query = query.lte('played_at', `${to}T23:59:59Z`)

  type GameWithRelations = {
    id: string
    played_at: string
    recorded_by: string
    status: string
    created_at: string
    game_teams: Array<{
      id: string
      side: string
      player1_id: string
      player2_id: string
      sets_won: number
      games_won: number
      player1: { id: string; name: string; nickname: string | null }
      player2: { id: string; name: string; nickname: string | null }
    }>
    game_sets: Array<{
      id: string
      set_number: number
      home_games: number
      away_games: number
      home_tiebreak: number | null
      away_tiebreak: number | null
    }>
  }

  const { data: games, error } = (await query) as {
    data: GameWithRelations[] | null
    error: Error | null
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 응답 형태 변환: game_teams 배열을 home_team/away_team으로 분리
  const formattedGames = (games || []).map((game) => {
    const teams = game.game_teams
    const sets = [...game.game_sets].sort((a, b) => a.set_number - b.set_number)

    const homeTeam = teams.find((t) => t.side === 'home')
    const awayTeam = teams.find((t) => t.side === 'away')

    return {
      id: game.id,
      played_at: game.played_at,
      recorded_by: game.recorded_by,
      status: game.status,
      home_team: homeTeam
        ? {
            id: homeTeam.id,
            side: 'home',
            player1: homeTeam.player1,
            player2: homeTeam.player2,
            sets_won: homeTeam.sets_won,
            games_won: homeTeam.games_won,
          }
        : null,
      away_team: awayTeam
        ? {
            id: awayTeam.id,
            side: 'away',
            player1: awayTeam.player1,
            player2: awayTeam.player2,
            sets_won: awayTeam.sets_won,
            games_won: awayTeam.games_won,
          }
        : null,
      sets,
      created_at: game.created_at,
    }
  })

  return NextResponse.json({
    data: formattedGames,
    meta: {
      page,
      limit,
      total: totalCount,
      total_pages: totalPages,
    },
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    played_at?: string
    home_player1_id?: string
    home_player2_id?: string
    away_player1_id?: string
    away_player2_id?: string
    sets?: Array<{
      home_games: number
      away_games: number
      home_tiebreak?: number | null
      away_tiebreak?: number | null
    }>
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: '잘못된 JSON 형식입니다' },
      { status: 400 }
    )
  }

  // 필수 필드 검증
  const {
    played_at,
    home_player1_id,
    home_player2_id,
    away_player1_id,
    away_player2_id,
    sets,
  } = body

  if (!played_at) {
    return NextResponse.json(
      { error: 'played_at은 필수입니다' },
      { status: 400 }
    )
  }

  if (
    !home_player1_id ||
    !home_player2_id ||
    !away_player1_id ||
    !away_player2_id
  ) {
    return NextResponse.json(
      { error: '4명의 선수 ID가 모두 필요합니다' },
      { status: 400 }
    )
  }

  // 4명이 모두 다른 선수인지 확인
  const playerIds = [
    home_player1_id,
    home_player2_id,
    away_player1_id,
    away_player2_id,
  ]
  if (new Set(playerIds).size !== 4) {
    return NextResponse.json(
      { error: '4명의 선수가 모두 달라야 합니다' },
      { status: 400 }
    )
  }

  // 세트 검증
  if (!sets || !Array.isArray(sets) || sets.length < 1 || sets.length > 3) {
    return NextResponse.json(
      { error: '세트는 1~3개여야 합니다' },
      { status: 400 }
    )
  }

  // 각 세트 점수 유효성 검증
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i]
    const { home_games: hg, away_games: ag } = set

    if (hg < 0 || ag < 0 || !Number.isInteger(hg) || !Number.isInteger(ag)) {
      return NextResponse.json(
        { error: `세트 ${i + 1}: 게임 수는 0 이상의 정수여야 합니다` },
        { status: 400 }
      )
    }

    const max = Math.max(hg, ag)
    const min = Math.min(hg, ag)
    const isValid =
      (max === 6 && min <= 4) ||
      (max === 7 && (min === 5 || min === 6))

    if (!isValid) {
      return NextResponse.json(
        {
          error: `세트 ${i + 1}: 유효하지 않은 세트 점수입니다 (${hg}-${ag})`,
        },
        { status: 400 }
      )
    }

    // 타이브레이크 검증: 7-6일 때만 허용
    if (max === 7 && min === 6) {
      if (
        set.home_tiebreak === undefined ||
        set.home_tiebreak === null ||
        set.away_tiebreak === undefined ||
        set.away_tiebreak === null
      ) {
        // 7-6 세트에서 타이브레이크 점수가 없어도 허용 (선택사항)
      }
    } else {
      // 7-6이 아닌 세트에서 타이브레이크가 있으면 에러
      if (
        (set.home_tiebreak !== undefined && set.home_tiebreak !== null) ||
        (set.away_tiebreak !== undefined && set.away_tiebreak !== null)
      ) {
        return NextResponse.json(
          {
            error: `세트 ${i + 1}: 7-6이 아닌 세트에는 타이브레이크를 입력할 수 없습니다`,
          },
          { status: 400 }
        )
      }
    }
  }

  // 선수 존재 및 활성 여부 확인
  const { data: players, error: playersError } = (await supabase
    .from('players')
    .select('id, is_active')
    .in('id', playerIds)) as {
      data: Array<{ id: string; is_active: boolean }> | null
      error: Error | null
    }

  if (playersError) {
    return NextResponse.json(
      { error: playersError.message },
      { status: 500 }
    )
  }

  if (!players || players.length !== 4) {
    return NextResponse.json(
      { error: '존재하지 않는 선수가 포함되어 있습니다' },
      { status: 404 }
    )
  }

  const inactivePlayers = players.filter((p) => !p.is_active)
  if (inactivePlayers.length > 0) {
    return NextResponse.json(
      { error: '비활성화된 선수가 포함되어 있습니다' },
      { status: 409 }
    )
  }

  // 세트 승/패 및 게임 수 계산
  let homeSetsWon = 0
  let awaySetsWon = 0
  let homeGamesWon = 0
  let awayGamesWon = 0

  for (const set of sets) {
    homeGamesWon += set.home_games
    awayGamesWon += set.away_games

    if (set.home_games > set.away_games) {
      homeSetsWon++
    } else {
      awaySetsWon++
    }
  }

  // 1. games INSERT
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      played_at,
      recorded_by: user.id,
      status: 'completed',
    })
    .select()
    .single() as { data: GameRow | null; error: Error | null }

  if (gameError || !game) {
    return NextResponse.json(
      { error: gameError?.message || '경기 생성 실패' },
      { status: 500 }
    )
  }

  // 2. game_teams INSERT (home, away)
  const { error: teamsError } = await supabase.from('game_teams').insert([
    {
      game_id: game.id,
      side: 'home' as const,
      player1_id: home_player1_id,
      player2_id: home_player2_id,
      sets_won: homeSetsWon,
      games_won: homeGamesWon,
    },
    {
      game_id: game.id,
      side: 'away' as const,
      player1_id: away_player1_id,
      player2_id: away_player2_id,
      sets_won: awaySetsWon,
      games_won: awayGamesWon,
    },
  ])

  if (teamsError) {
    // 롤백: game 삭제 (CASCADE로 관련 데이터도 삭제)
    await supabase.from('games').delete().eq('id', game.id)
    return NextResponse.json(
      { error: teamsError.message },
      { status: 500 }
    )
  }

  // 3. game_sets INSERT
  const setsToInsert = sets.map((set, idx) => ({
    game_id: game.id,
    set_number: idx + 1,
    home_games: set.home_games,
    away_games: set.away_games,
    home_tiebreak: set.home_tiebreak ?? null,
    away_tiebreak: set.away_tiebreak ?? null,
  }))

  const { error: setsError } = await supabase
    .from('game_sets')
    .insert(setsToInsert)

  if (setsError) {
    // 롤백: game 삭제 (CASCADE로 game_teams, game_sets도 삭제)
    await supabase.from('games').delete().eq('id', game.id)
    return NextResponse.json(
      { error: setsError.message },
      { status: 500 }
    )
  }

  // 생성된 게임 전체 조회 (선수 정보 포함)
  type CreatedGameRow = GameRow & {
    game_teams: unknown
    game_sets: unknown
  }
  const { data: createdGame, error: fetchError } = await supabase
    .from('games')
    .select(`
      *,
      game_teams (
        id, side, player1_id, player2_id, sets_won, games_won,
        player1:players!game_teams_player1_id_fkey(id, name, nickname),
        player2:players!game_teams_player2_id_fkey(id, name, nickname)
      ),
      game_sets (id, set_number, home_games, away_games, home_tiebreak, away_tiebreak)
    `)
    .eq('id', game.id)
    .single() as { data: CreatedGameRow | null; error: Error | null }

  if (fetchError || !createdGame) {
    // 이미 생성은 완료됨. 조회만 실패한 경우 기본 응답 반환.
    return NextResponse.json(
      {
        data: {
          id: game.id,
          played_at: game.played_at,
          status: game.status,
          recorded_by: game.recorded_by,
          created_at: game.created_at,
        },
      },
      { status: 201 }
    )
  }

  // 응답 형태 변환
  const teams = createdGame.game_teams as Array<{
    id: string
    side: string
    player1_id: string
    player2_id: string
    sets_won: number
    games_won: number
    player1: { id: string; name: string; nickname: string | null }
    player2: { id: string; name: string; nickname: string | null }
  }>
  const gameSets = (createdGame.game_sets as Array<{
    id: string
    set_number: number
    home_games: number
    away_games: number
    home_tiebreak: number | null
    away_tiebreak: number | null
  }>).sort((a, b) => a.set_number - b.set_number)

  const homeTeam = teams.find((t) => t.side === 'home')
  const awayTeam = teams.find((t) => t.side === 'away')

  return NextResponse.json(
    {
      data: {
        id: createdGame.id,
        played_at: createdGame.played_at,
        recorded_by: createdGame.recorded_by,
        status: createdGame.status,
        home_team: homeTeam
          ? {
              id: homeTeam.id,
              side: 'home',
              player1: homeTeam.player1,
              player2: homeTeam.player2,
              sets_won: homeTeam.sets_won,
              games_won: homeTeam.games_won,
            }
          : null,
        away_team: awayTeam
          ? {
              id: awayTeam.id,
              side: 'away',
              player1: awayTeam.player1,
              player2: awayTeam.player2,
              sets_won: awayTeam.sets_won,
              games_won: awayTeam.games_won,
            }
          : null,
        sets: gameSets,
        created_at: createdGame.created_at,
      },
    },
    { status: 201 }
  )
}
