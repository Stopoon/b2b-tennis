export default function Loading() {
  return (
    <div className="p-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4 w-28"></div>
      <div className="h-32 bg-gray-200 rounded-xl mb-4"></div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-200 rounded-xl mb-2"></div>
      ))}
    </div>
  )
}
