'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-4 text-center mt-20">
      <div className="text-6xl mb-4">🎾</div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">오류가 발생했습니다</h2>
      <p className="text-red-500 mb-6 text-sm">{error.message}</p>
      <button
        onClick={reset}
        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}
