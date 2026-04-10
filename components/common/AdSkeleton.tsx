export default function AdSkeleton() {
  return (
    <div className="border rounded-xl p-4 animate-pulse space-y-3">
      <div className="h-32 bg-gray-200 rounded" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
