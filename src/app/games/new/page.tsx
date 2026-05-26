'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Player, SetScoreInput } from '@/types/database'

export default function NewGamePage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 폼 상태
  const [playedAt, setPlayedAt] = useState(() => {
    const now = new Date()
    return now.toISOString().split('T')[0]
  })
  const [homePlayer1, setHomePlayer1] = useState('')
  const [homePlayer2, setHomePlayer2] = useState('')
  const [awayPlayer1, setAwayPlayer1] = useState('')
  const [awayPlayer2, setAwayPlayer2] = useState('')
  const [sets, setSets] = useState<SetScoreInput[]>([
    { set_number: 1, home_games: 0, away_games: 0 },
  ])

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch('/api/players')
        if (!res.ok) throw new Error('선수 목록을 불러올 수 없습니다.')
        const json = await res.json()
        setPlayers(json.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
      } finally {
        setLoading(false)
      }
    }
    fetchPlayers()
  }, [])

  // 이미 선택된 선수 목록 (중복 방지)
  const selectedPlayers = [homePlayer1, homePlayer2, awayPlayer1, awayPlayer2].filter(Boolean)

  const isPlayerDisabled = (playerId: string, currentSelection: string) => {
    if (playerId === currentSelection) return false
    return selectedPlayers.includes(playerId)
  }

  // 세트 추가/삭제
  const addSet = () => {
    if (sets.length >= 3) return
    setSets([...sets, { set_number: sets.length + 1, home_games: 0, away_games: 0 }])
  }

  const removeSet = () => {
    if (sets.length <= 1) return
    setSets(sets.slice(0, -1))
  }

  const updateSetScore = (index: number, field: 'home_games' | 'away_games', value: string) => {
    const num = parseInt(value) || 0
    const clamped = Math.min(Math.max(num, 0), 7)
    const updated = [...sets]
    updated[index] = { ...updated[index], [field]: clamped }
    setSets(updated)
  }

  // 유효성 검증
  const isValid = () => {
    if (!homePlayer1 || !homePlayer2 || !awayPlayer1 || !awayPlayer2) return false
    const allPlayers = [homePlayer1, homePlayer2, awayPlayer1, awayPlayer2]
    if (new Set(allPlayers).size !== 4) return false
    if (sets.length === 0) return false
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid()) {
      alert('모든 선수를 선택하고, 중복되지 않게 해주세요.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const body = {
        played_at: new Date(playedAt).toISOString(),
        home_player1_id: homePlayer1,
        home_player2_id: homePlayer2,
        away_player1_id: awayPlayer1,
        away_player2_id: awayPlayer2,
        sets: sets.map((s, i) => ({
          set_number: i + 1,
          home_games: s.home_games,
          away_games: s.away_games,
        })),
      }

      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '경기 기록에 실패했습니다.')
      }

      alert('경기가 기록되었습니다!')
      router.push('/games')
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-40"></div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded mb-3"></div>
        ))}
      </div>
    )
  }

  const renderPlayerSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void
  ) => (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-slate-900 bg-white"
      >
        <option value="">선수 선택</option>
        {players.map((p) => (
          <option key={p.id} value={p.id} disabled={isPlayerDisabled(p.id, value)}>
            {p.name}{p.nickname ? ` (${p.nickname})` : ''}
          </option>
        ))}
      </select>
    </div>
  )

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold text-slate-900 mb-4">새 경기 기록</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 경기 날짜 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <label className="block text-sm font-semibold text-slate-700 mb-2">경기 날짜</label>
          <input
            type="date"
            value={playedAt}
            onChange={(e) => setPlayedAt(e.target.value)}
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-slate-900"
          />
        </div>

        {/* 팀 A (홈) */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-green-700 flex items-center gap-1">
            <span className="w-2 h-2 bg-green-600 rounded-full"></span>
            팀 A (홈)
          </h2>
          {renderPlayerSelect('선수 1', homePlayer1, setHomePlayer1)}
          {renderPlayerSelect('선수 2', homePlayer2, setHomePlayer2)}
        </div>

        {/* 팀 B (어웨이) */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-blue-700 flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            팀 B (어웨이)
          </h2>
          {renderPlayerSelect('선수 3', awayPlayer1, setAwayPlayer1)}
          {renderPlayerSelect('선수 4', awayPlayer2, setAwayPlayer2)}
        </div>

        {/* 세트 스코어 */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">세트 스코어</h2>
            <div className="flex gap-2">
              {sets.length > 1 && (
                <button
                  type="button"
                  onClick={removeSet}
                  className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 transition-colors"
                >
                  - 세트 삭제
                </button>
              )}
              {sets.length < 3 && (
                <button
                  type="button"
                  onClick={addSet}
                  className="text-xs text-green-600 hover:text-green-700 font-medium px-2 py-1 rounded hover:bg-green-50 transition-colors"
                >
                  + 세트 추가
                </button>
              )}
            </div>
          </div>

          {sets.map((set, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="text-sm text-slate-500 w-16 shrink-0">세트 {index + 1}</span>
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1">
                  <label className="sr-only">팀 A 점수</label>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={set.home_games}
                    onChange={(e) => updateSetScore(index, 'home_games', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-center text-lg font-bold text-green-700"
                  />
                </div>
                <span className="text-slate-400 font-bold text-lg">-</span>
                <div className="flex-1">
                  <label className="sr-only">팀 B 점수</label>
                  <input
                    type="number"
                    min={0}
                    max={7}
                    value={set.away_games}
                    onChange={(e) => updateSetScore(index, 'away_games', e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-center text-lg font-bold text-blue-700"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          type="submit"
          disabled={saving || !isValid()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-3 rounded-xl text-base transition-colors"
        >
          {saving ? '저장 중...' : '경기 기록 저장'}
        </button>
      </form>
    </div>
  )
}
