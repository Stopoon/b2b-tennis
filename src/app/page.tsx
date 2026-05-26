import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { RankingEntry } from '@/types/database'
import { POINTS } from '@/types/database'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

function getThisMonth() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { from, to }
}

interface RecentGame {
  id: string
  played_at: string
  home_team: {
    player1: { name: string }
    player2: { name: string }
    sets_won: number
  } | null
  away_team: {
    player1: { name: string }
    player2: { name: string }
    sets_won: number
  } | null
  sets: { set_number: number; home_games: number; away_games: number }[]
}

export default async function HomePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 최근 경기 3개 - Supabase 직접 조회 (서버 컴포넌트이므로 API 경유 불필요)
  let recentGames: RecentGame[] = []
  try {
    const { data: games } = await supabase
      .from('games')
      .select(`
        id, played_at,
        game_teams (
          id, side, sets_won,
          player1:players!game_teams_player1_id_fkey(id, name),
          player2:players!game_teams_player2_id_fkey(id, name)
        ),
        game_sets (set_number, home_games, away_games)
      `)
      .eq('status', 'completed')
      .order('played_at', { ascending: false })
      .limit(3)

    recentGames = (games || []).map((game) => {
      const teams = game.game_teams as Array<{
        id: string; side: string; sets_won: number;
        player1: { id: string; name: string };
        player2: { id: string; name: string };
      }>
      const sets = (game.game_sets as Array<{
        set_number: number; home_games: number; away_games: number;
      }>).sort((a, b) => a.set_number - b.set_number)

      const homeTeam = teams.find((t) => t.side === 'home')
      const awayTeam = teams.find((t) => t.side === 'away')

      return {
        id: game.id,
        played_at: game.played_at,
        home_team: homeTeam ? { player1: homeTeam.player1, player2: homeTeam.player2, sets_won: homeTeam.sets_won } : null,
        away_team: awayTeam ? { player1: awayTeam.player1, player2: awayTeam.player2, sets_won: awayTeam.sets_won } : null,
        sets,
      }
    })
  } catch {
    // 에러 시 빈 배열 유지
  }

  // 이번 달 순위 top 5 - Supabase 직접 조회
  let rankings: RankingEntry[] = []
  try {
    const { from, to } = getThisMonth()
    const { data: games } = await supabase
      .from('games')
      .select(`id, game_teams (id, side, player1_id, player2_id, sets_won, games_won)`)
      .eq('status', 'completed')
      .gte('played_at', `${from}T00:00:00Z`)
      .lte('played_at', `${to}T23:59:59Z`)

    if (games && games.length > 0) {
      const statsMap = new Map<string, { games_played: number; wins: number; draws: number; losses: number; sets_for: number; sets_against: number; games_for: number; games_against: number }>()
      const initStats = () => ({ games_played: 0, wins: 0, draws: 0, losses: 0, sets_for: 0, sets_against: 0, games_for: 0, games_against: 0 })

      for (const game of games) {
        const teams = game.game_teams as Array<{ id: string; side: string; player1_id: string; player2_id: string; sets_won: number; games_won: number }>
        if (teams.length !== 2) continue
        const homeTeam = teams.find((t) => t.side === 'home')
        const awayTeam = teams.find((t) => t.side === 'away')
        if (!homeTeam || !awayTeam) continue

        for (const pid of [homeTeam.player1_id, homeTeam.player2_id]) {
          if (!statsMap.has(pid)) statsMap.set(pid, initStats())
          const s = statsMap.get(pid)!
          s.games_played++; s.sets_for += homeTeam.sets_won; s.sets_against += awayTeam.sets_won
          s.games_for += homeTeam.games_won; s.games_against += awayTeam.games_won
          if (homeTeam.sets_won > awayTeam.sets_won) s.wins++
          else if (homeTeam.sets_won === awayTeam.sets_won) s.draws++
          else s.losses++
        }
        for (const pid of [awayTeam.player1_id, awayTeam.player2_id]) {
          if (!statsMap.has(pid)) statsMap.set(pid, initStats())
          const s = statsMap.get(pid)!
          s.games_played++; s.sets_for += awayTeam.sets_won; s.sets_against += homeTeam.sets_won
          s.games_for += awayTeam.games_won; s.games_against += homeTeam.games_won
          if (awayTeam.sets_won > homeTeam.sets_won) s.wins++
          else if (awayTeam.sets_won === homeTeam.sets_won) s.draws++
          else s.losses++
        }
      }

      const playerIds = Array.from(statsMap.keys())
      const { data: players } = await supabase.from('players').select('id, name, nickname').in('id', playerIds)
      const nameMap = new Map<string, { name: string; nickname: string | null }>()
      for (const p of players || []) nameMap.set(p.id, { name: p.name, nickname: p.nickname })

      const rankingsList = Array.from(statsMap.entries()).map(([pid, s]) => {
        const info = nameMap.get(pid)
        return {
          player_id: pid,
          player_name: info?.name || 'Unknown',
          player_nickname: info?.nickname || null,
          ...s,
          total_points: s.wins * POINTS.WIN + s.draws * POINTS.DRAW + s.losses * POINTS.LOSS,
          set_diff: s.sets_for - s.sets_against,
          game_diff: s.games_for - s.games_against,
        }
      })
      rankingsList.sort((a, b) => b.total_points - a.total_points || b.set_diff - a.set_diff || b.game_diff - a.game_diff)
      rankings = rankingsList.slice(0, 5).map((e, i) => ({ ...e, rank: i + 1 }))
    }
  } catch {
    // 에러 시 빈 배열 유지
  }

  return (
    <div className="p-4 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          🎾 B2B Tennis 리그
        </h1>
      </div>

      {/* 빠른 경기 기록 버튼 */}
      <Link
        href="/games/new"
        className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-medium py-3 rounded-xl transition-colors shadow-sm"
      >
        + 새 경기 기록하기
      </Link>

      {/* 최근 경기 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">최근 경기</h2>
          <Link href="/games" className="text-sm text-green-600 font-medium">
            전체 보기
          </Link>
        </div>

        {recentGames.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-slate-500">아직 등록된 경기가 없어요.</p>
            <Link href="/games/new" className="text-green-600 font-medium text-sm mt-2 inline-block">
              첫 경기를 기록해보세요!
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {recentGames.filter((g) => g.home_team && g.away_team).map((game) => {
              const homeWon = (game.home_team?.sets_won ?? 0) > (game.away_team?.sets_won ?? 0)
              const awayWon = (game.away_team?.sets_won ?? 0) > (game.home_team?.sets_won ?? 0)
              return (
                <div key={game.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="text-xs text-slate-500 mb-2">
                    {formatDate(game.played_at)}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`flex-1 ${homeWon ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                      <div className="text-sm">
                        {game.home_team?.player1.name} / {game.home_team?.player2.name}
                      </div>
                    </div>
                    <div className="px-3 text-center">
                      <div className="text-lg font-bold text-slate-900">
                        {game.home_team?.sets_won ?? 0} - {game.away_team?.sets_won ?? 0}
                      </div>
                      <div className="text-xs text-slate-400">
                        {game.sets.map(s => `${s.home_games}-${s.away_games}`).join(' / ')}
                      </div>
                    </div>
                    <div className={`flex-1 text-right ${awayWon ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                      <div className="text-sm">
                        {game.away_team?.player1.name} / {game.away_team?.player2.name}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 이번 달 순위 Top 5 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">이번 달 순위</h2>
          <Link href="/rankings" className="text-sm text-green-600 font-medium">
            전체 보기
          </Link>
        </div>

        {rankings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
            <p className="text-slate-500">이번 달 경기 기록이 없습니다.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {rankings.map((entry, index) => (
              <div
                key={entry.player_id}
                className={`flex items-center px-4 py-3 ${
                  index < rankings.length - 1 ? 'border-b border-gray-50' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3 ${
                  entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                  entry.rank === 2 ? 'bg-gray-100 text-gray-600' :
                  entry.rank === 3 ? 'bg-orange-100 text-orange-600' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  {entry.rank}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900 text-sm">
                    {entry.player_name}
                    {entry.player_nickname && (
                      <span className="text-slate-400 ml-1">({entry.player_nickname})</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.games_played}경기 {entry.wins}승 {entry.draws}무 {entry.losses}패
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">{entry.total_points}pt</div>
                  <div className="text-xs text-slate-500">세트 {entry.set_diff > 0 ? '+' : ''}{entry.set_diff}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
