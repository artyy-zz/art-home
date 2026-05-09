"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function DashboardCharts({
  locale,
  revenueSeries,
  materialUsage,
}: {
  locale: "sq" | "en";
  revenueSeries: Array<{ month: string; revenue: number; profit: number; vat: number }>;
  materialUsage: Array<{ name: string; quantity: number }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="surface-card rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          {locale === "sq" ? "Të ardhura / fitim" : "Revenue / Profit"}
        </p>
        <div className="mt-5 h-72 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={288}
            initialDimension={{ width: 600, height: 288 }}
          >
            <LineChart data={revenueSeries}>
              <CartesianGrid stroke="rgba(22,20,18,0.08)" vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#96724f"
                strokeWidth={3}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#161412"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="surface-card rounded-[24px] p-4 sm:rounded-[30px] sm:p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          {locale === "sq" ? "Përdorimi i materialit" : "Material usage"}
        </p>
        <div className="mt-5 h-72 min-w-0">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={288}
            initialDimension={{ width: 600, height: 288 }}
          >
            <BarChart data={materialUsage}>
              <CartesianGrid stroke="rgba(22,20,18,0.08)" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#96724f" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
