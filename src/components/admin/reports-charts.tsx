"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const colors = ["#96724f", "#1e1a16", "#c19f7a", "#615246", "#d7c0aa"];

export function ReportsCharts({
  locale,
  margins,
  debts,
}: {
  locale: "sq" | "en";
  margins: Array<{ name: string; marginCents: number }>;
  debts: Array<{ name: string; outstandingDebtCents: number }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="surface-card rounded-[30px] p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          {locale === "sq" ? "Marzhi i produktit" : "Product margin"}
        </p>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={margins.slice(0, 6).map((item) => ({ ...item, margin: item.marginCents / 100 }))}>
              <CartesianGrid stroke="rgba(22,20,18,0.08)" vertical={false} />
              <XAxis dataKey="name" hide />
              <YAxis tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="margin" fill="#1e1a16" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="surface-card rounded-[30px] p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">
          {locale === "sq" ? "Borxhi i klientëve" : "Client debt"}
        </p>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={debts.slice(0, 5).map((item) => ({
                  name: item.name,
                  value: item.outstandingDebtCents / 100,
                }))}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={94}
                paddingAngle={3}
              >
                {debts.slice(0, 5).map((item, index) => (
                  <Cell key={item.name} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
