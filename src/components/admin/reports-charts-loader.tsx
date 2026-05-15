"use client";

import dynamic from "next/dynamic";

function ReportsChartsPlaceholder() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {[0, 1].map((item) => (
        <div
          key={item}
          className="surface-card rounded-[24px] p-4 sm:rounded-[30px] sm:p-6"
        >
          <div className="h-3 w-36 rounded-full bg-black/10" />
          <div className="mt-5 h-72 rounded-[22px] border border-black/8 bg-white/55" />
        </div>
      ))}
    </div>
  );
}

export const ReportsChartsLoader = dynamic(
  () =>
    import("@/components/admin/reports-charts").then(
      (module) => module.ReportsCharts,
    ),
  {
    ssr: false,
    loading: () => <ReportsChartsPlaceholder />,
  },
);
