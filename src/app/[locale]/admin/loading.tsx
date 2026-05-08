function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-black/10 ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="panel-card rounded-[28px] p-6">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="mt-5 h-12 w-36" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="panel-card rounded-[30px] p-6">
          <SkeletonBlock className="h-8 w-44" />
          <SkeletonBlock className="mt-6 h-64 w-full" />
        </div>
        <div className="panel-card rounded-[30px] p-6">
          <SkeletonBlock className="h-8 w-44" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonBlock key={index} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="panel-card rounded-[30px] p-6">
        <SkeletonBlock className="h-8 w-52" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonBlock key={index} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
