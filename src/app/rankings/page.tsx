'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RankingEntry } from '@/types/database'

type DatePreset = 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom'

function getThisMonth() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { from, to }
}

function getLastMonth() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
  const to = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
  return { from, to }
}

function getThisYear() {
  const now = new Date()
  const from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
  const to = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]
  return { from, to }
}

function getLastYear() {
  const now = new Date()
  const from = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0]
  const to = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0]
  return { from, to }
}

function formatDateRange(from: string, to: string) {
  const f = new Date(from)
  const t = new Date(to)
  return `${f.getFullYear()}년 ${f.getMonth() + 1}월 ${f.getDate()}일 ~ ${t.getFullYear()}년 ${t.getMonth() + 1}월 ${t.getDate()}일`
}

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [preset, setPreset] = useState<DatePreset>('this_month')

  const initialDates = getThisMonth()
  const [fromDate, setFromDate] = useState(initialDates.from)
  const [toDate, setToDate] = useState(initialDates.to)

  const fetchRankings = useCallback(async (from: string, to: string) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/rankings?from=${from}&to=${to}`)
      if (!res.ok) throw new Error('순위를 불러올 수 없습니다.')
      const json = await res.json()
      setRankings(json.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRankings(fromDate, toDate)
  }, [fromDate, toDate, fetchRankings])

  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset)
    let dates: { from: string; to: string }
    switch (newPreset) {
      case 'this_month': dates = getThisMonth(); break
      case 'last_month': dates = getLastMonth(); break
      case 'this_year': dates = getThisYear(); break
      case 'last_year': dates = getLastYear(); break
      case 'custom': return // 직접 입력 시 날짜 변경 안 함
    }
    setFromDate(dates.from)
    setToDate(dates.to)
  }

  const presets: { key: DatePreset; label: string }[] = [
    { key: 'this_month', label: '이번 달' },
    { key: 'last_month', label: '지난 달' },
    { key: 'this_year', label: '올해' },
    { key: 'last_year', label: '작년' },
    { key: 'custom', label: '직접 입력' },
  ]

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-900">순위</h1>

      {/* 날짜 필터 */}
      <div className="space-y-3">
        {/* 빠른 선택 버튼 */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {presets.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handlePresetChange(key)}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                preset === key
                  ? 'bg-green-600 text-white'
                  : 'bg-white text-slate-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 직접 입력 날짜 */}
        {preset === 'custom' && (
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900"
            />
            <span className="text-slate-400">~</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900"
            />
          </div>
        )}

        {/* 현재 범위 표시 */}
        <p className="text-xs text-slate-500 text-center">
          {formatDateRange(fromDate, toDate)}
        </p>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* 로딩 */}
      {loading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      ) : rankings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-slate-500">해당 기간에 경기 기록이 없습니다.</p>
        </div>
      ) : (
        <>
          {/* 모바일 카드 뷰 */}
          <div className="space-y-2 sm:hidden">
            {rankings.map((entry) => (
              <div
                key={entry.player_id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                  entry.rank === 2 ? 'bg-gray-100 text-gray-600' :
                  entry.rank === 3 ? 'bg-orange-100 text-orange-600' :
                  'bg-slate-50 text-slate-500'
                }`}>
                  {entry.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {entry.player_name}
                    {entry.player_nickname && (
                      <span className="text-slate-400 ml-1 text-sm">({entry.player_nickname})</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {entry.games_played}경기 &middot; {entry.wins}승 {entry.draws}무 {entry.losses}패
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    세트 {entry.set_diff > 0 ? '+' : ''}{entry.set_diff} &middot; 게임 {entry.game_diff > 0 ? '+' : ''}{entry.game_diff}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-green-600">{entry.total_points}</div>
                  <div className="text-xs text-slate-400">포인트</div>
                </div>
              </div>
            ))}
          </div>

          {/* 데스크탑 테이블 뷰 */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full bg-white rounded-xl border border-gray-100 overflow-hidden">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500 font-medium">
                  <th className="px-3 py-3 text-center">순위</th>
                  <th className="px-3 py-3 text-left">선수</th>
                  <th className="px-3 py-3 text-center">경기</th>
                  <th className="px-3 py-3 text-center">승/무/패</th>
                  <th className="px-3 py-3 text-center">포인트</th>
                  <th className="px-3 py-3 text-center">세트</th>
                  <th className="px-3 py-3 text-center">게임</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((entry, index) => (
                  <tr
                    key={entry.player_id}
                    className={index < rankings.length - 1 ? 'border-b border-gray-50' : ''}
                  >
                    <td className="px-3 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                        entry.rank === 2 ? 'bg-gray-100 text-gray-600' :
                        entry.rank === 3 ? 'bg-orange-100 text-orange-600' :
                        'text-slate-500'
                      }`}>
                        {entry.rank}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-medium text-slate-900">{entry.player_name}</span>
                      {entry.player_nickname && (
                        <span className="text-slate-400 ml-1 text-sm">({entry.player_nickname})</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-slate-700">{entry.games_played}</td>
                    <td className="px-3 py-3 text-center text-sm text-slate-700">
                      {entry.wins}/{entry.draws}/{entry.losses}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-green-600">{entry.total_points}</td>
                    <td className="px-3 py-3 text-center text-sm text-slate-700">
                      {entry.set_diff > 0 ? '+' : ''}{entry.set_diff}
                    </td>
                    <td className="px-3 py-3 text-center text-sm text-slate-700">
                      {entry.game_diff > 0 ? '+' : ''}{entry.game_diff}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
