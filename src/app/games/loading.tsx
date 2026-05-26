export default function Loading() {
  return (
    <div className="p-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4 w-24"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl mb-2"></div>
      ))}
    </div>
  )
}
