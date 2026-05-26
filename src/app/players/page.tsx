'use client'

import { useState, useEffect } from 'react'
import type { Player } from '@/types/database'

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 추가 폼 상태
  const [newName, setNewName] = useState('')
  const [newNickname, setNewNickname] = useState('')
  const [addingPlayer, setAddingPlayer] = useState(false)

  // 편집 상태
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editNickname, setEditNickname] = useState('')

  const fetchPlayers = async () => {
    try {
      setError(null)
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

  useEffect(() => {
    fetchPlayers()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return

    setAddingPlayer(true)
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          nickname: newNickname.trim() || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '선수 추가에 실패했습니다.')
      }
      setNewName('')
      setNewNickname('')
      await fetchPlayers()
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setAddingPlayer(false)
    }
  }

  const handleEdit = async (id: string) => {
    if (!editName.trim()) return

    try {
      const res = await fetch(`/api/players/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          nickname: editNickname.trim() || null,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '수정에 실패했습니다.')
      }
      setEditingId(null)
      await fetchPlayers()
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`정말 "${name}" 선수를 삭제하시겠습니까?`)) return

    try {
      const res = await fetch(`/api/players/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || '삭제에 실패했습니다.')
      }
      await fetchPlayers()
    } catch (err) {
      alert(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  const startEdit = (player: Player) => {
    setEditingId(player.id)
    setEditName(player.name)
    setEditNickname(player.nickname || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditNickname('')
  }

  if (loading) {
    return (
      <div className="p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4 w-32"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded mb-2"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* 헤더 */}
      <h1 className="text-xl font-bold text-slate-900">선수 관리</h1>

      {/* 선수 추가 폼 */}
      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">새 선수 추가</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="이름 (필수)"
            required
            maxLength={50}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900 placeholder-slate-400"
          />
          <input
            type="text"
            value={newNickname}
            onChange={(e) => setNewNickname(e.target.value)}
            placeholder="닉네임"
            maxLength={30}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900 placeholder-slate-400"
          />
        </div>
        <button
          type="submit"
          disabled={addingPlayer || !newName.trim()}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 rounded-lg text-sm transition-colors"
        >
          {addingPlayer ? '추가 중...' : '+ 선수 추가'}
        </button>
      </form>

      {/* 에러 표시 */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* 선수 목록 */}
      {players.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
          <p className="text-slate-500">등록된 선수가 없습니다.</p>
          <p className="text-sm text-slate-400 mt-1">위 폼에서 선수를 추가해보세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <div key={player.id} className="bg-white rounded-xl border border-gray-100 p-4">
              {editingId === player.id ? (
                /* 편집 모드 */
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="이름"
                      maxLength={50}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900"
                    />
                    <input
                      type="text"
                      value={editNickname}
                      onChange={(e) => setEditNickname(e.target.value)}
                      placeholder="닉네임"
                      maxLength={30}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-slate-900"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(player.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg transition-colors"
                    >
                      저장
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-slate-700 text-sm py-2 rounded-lg transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                /* 보기 모드 */
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">
                      {player.name}
                      {player.nickname && (
                        <span className="text-slate-400 ml-2 text-sm">({player.nickname})</span>
                      )}
                    </div>
                    {!player.is_active && (
                      <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded mt-1 inline-block">
                        비활성
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(player)}
                      className="text-sm text-green-600 hover:text-green-700 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(player.id, player.name)}
                      className="text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
