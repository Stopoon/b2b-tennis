export default function Loading() {
  return (
    <div className="p-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4 w-16"></div>
      <div className="flex gap-2 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-20 bg-gray-200 rounded-full"></div>
        ))}
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-200 rounded-xl mb-2"></div>
      ))}
    </div>
  )
}
