export default function SellerAnalyticsPage() {
  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">Analytics</h1>
      <p className="text-gray-500">
        Performance of your ads
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <Stat label="Total Ads" value="0" />
        <Stat label="Total Views" value="0" />
        <Stat label="Messages" value="0" />
        <Stat label="Sold Items" value="0" />

      </div>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-5 bg-white dark:bg-neutral-900">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
