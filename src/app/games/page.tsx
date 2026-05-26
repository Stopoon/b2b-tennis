'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { GameWithDetails, PaginationMeta } from '@/types/database'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const days = ['일', '월', '화', '수', '목', '금', '토']
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`
}

export default function GamesPage() {
  const [games, setGames] = useState<GameWithDetails[]>([])
  const [meta, setMeta] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchGames = async (pageNum: number, append = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const res = await fetch(`/api/games?page=${pageNum}&limit=10`)
      if (!res.ok) throw new Error('경기 목록을 불러올 수 없습니다.')
      const json = await res.json()

      if (append) {
        setGames((prev) => [...prev, ...(json.data || [])])
      } else {
        setGames(json.data || [])
      }
      setMeta(json.meta || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchGames(1)
  }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchGames(nextPage, true)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 경기를 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/games/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '삭제에 실패했습니다.')
      }
      setGames((prev) => prev.filter((g) => g.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-24"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded mb-2"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">경기 기록</h1>
        <Link
          href="/games/new"
          className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + 경기 기록
        </Link>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* 경기 목록 */}
      {games.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-3">🎾</div>
          <p className="text-slate-500 mb-3">아직 등록된 경기가 없어요.</p>
          <Link
            href="/games/new"
            className="inline-block bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            첫 경기를 기록해보세요!
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((game) => {
            const homeSets = game.home_team?.sets_won ?? 0
            const awaySets = game.away_team?.sets_won ?? 0
            const homeWon = homeSets > awaySets
            const awayWon = awaySets > homeSets

            return (
              <div key={game.id} className="bg-white rounded-xl border border-gray-100 p-4">
                {/* 날짜 + 삭제 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500">{formatDate(game.played_at)}</span>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors"
                  >
                    삭제
                  </button>
                </div>

                {/* 팀 대결 */}
                <div className="flex items-center">
                  {/* 홈 팀 */}
                  <div className={`flex-1 ${homeWon ? 'font-bold' : ''}`}>
                    <div className="text-sm text-slate-900">
                      {game.home_team?.player1?.name ?? '-'}
                    </div>
                    <div className="text-sm text-slate-900">
                      {game.home_team?.player2?.name ?? '-'}
                    </div>
                    {homeWon && (
                      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-1 inline-block font-medium">
                        승리
                      </span>
                    )}
                  </div>

                  {/* 스코어 */}
                  <div className="px-4 text-center">
                    <div className="text-2xl font-bold text-slate-900">
                      {homeSets} - {awaySets}
                    </div>
                    <div className="text-xs text-slate-400 mt-1 space-x-1">
                      {game.sets.map((s, i) => (
                        <span key={i}>
                          {i > 0 && <span className="text-slate-300"> / </span>}
                          {s.home_games}-{s.away_games}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 어웨이 팀 */}
                  <div className={`flex-1 text-right ${awayWon ? 'font-bold' : ''}`}>
                    <div className="text-sm text-slate-900">
                      {game.away_team?.player1?.name ?? '-'}
                    </div>
                    <div className="text-sm text-slate-900">
                      {game.away_team?.player2?.name ?? '-'}
                    </div>
                    {awayWon && (
                      <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded mt-1 inline-block font-medium">
                        승리
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 더 보기 버튼 */}
      {meta && meta.page < meta.total_pages && (
        <button
          onClick={handleLoadMore}
          disabled={loadingMore}
          className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-slate-700 font-medium py-3 rounded-xl text-sm transition-colors"
        >
          {loadingMore ? '불러오는 중...' : '더 보기'}
        </button>
      )}
    </div>
  )
}
