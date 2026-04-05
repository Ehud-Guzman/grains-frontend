export default function SkeletonCard({ compact }) {
  return (
    <div className="bg-white rounded-2xl border border-earth-100 overflow-hidden animate-pulse">
      <div className={`bg-earth-100 ${compact ? 'aspect-square' : 'aspect-[4/3]'}`} />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-earth-100 rounded w-2/3" />
        <div className="h-3 bg-earth-100 rounded w-1/2" />
        <div className="h-9 bg-earth-100 rounded-xl mt-2" />
      </div>
    </div>
  )
}
