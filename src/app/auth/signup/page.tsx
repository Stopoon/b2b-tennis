'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setInfo(null)

    if (!name.trim()) {
      setError('이름을 입력해 주세요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.')
      return
    }
    if (password !== passwordConfirm) {
      setError('비밀번호 확인이 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
            nickname: nickname.trim() || null,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          setError('이미 가입된 이메일입니다. 로그인을 시도해 주세요.')
        } else {
          setError(authError.message)
        }
        return
      }

      // 이메일 확인이 활성화된 경우 session이 없음
      if (data.session) {
        router.push('/')
        router.refresh()
      } else {
        setInfo(
          '가입이 신청되었습니다. 입력하신 이메일로 발송된 확인 링크를 클릭해 가입을 완료해 주세요.'
        )
      }
    } catch {
      setError('회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🎾</div>
          <h1 className="text-2xl font-bold text-slate-900">B2B Tennis 리그</h1>
          <p className="text-slate-500 mt-1">새 계정 만들기</p>
        </div>

        {/* 회원가입 카드 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={50}
                placeholder="홍길동"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="nickname" className="block text-sm font-medium text-slate-700 mb-1">
                닉네임 (선택)
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={30}
                placeholder="코트의 황제"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@example.com"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                비밀번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="6자 이상"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="password-confirm" className="block text-sm font-medium text-slate-700 mb-1">
                비밀번호 확인 <span className="text-red-500">*</span>
              </label>
              <input
                id="password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                minLength={6}
                placeholder="비밀번호 한 번 더"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            {info && (
              <div className="bg-green-50 text-green-700 text-sm px-3 py-2 rounded-lg">
                {info}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-500">
            이미 계정이 있나요?{' '}
            <Link href="/auth/login" className="text-green-600 font-medium hover:underline">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
