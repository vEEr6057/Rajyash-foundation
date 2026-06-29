"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import type { TrendPoint } from "@/server/db/repositories/stats";

const AXIS = "var(--muted-foreground)";
const GRID = "var(--border)";

/** Recharts measures the DOM, so only render after mount to avoid SSR/hydration
 * mismatch (and zero-size warnings) on the server. */
function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 16px rgb(0 0 0 / 0.12)",
} as const;

/** Deliveries per day — area trend over the selected window. */
export function DeliveriesTrendChart({ data }: { data: TrendPoint[] }) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-[260px]" />;
  const fmtDate = (d: string) => {
    const [, m, day] = d.split("-");
    return `${day}/${m}`;
  };
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart accessibilityLayer data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        role="img"
        aria-label={`Deliveries per day over the last ${data.length} days`}>
        <defs>
          <linearGradient id="rj-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--leaf)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--leaf)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtDate}
          tick={{ fontSize: 11, fill: AXIS }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: AXIS }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(l) => fmtDate(String(l))}
          cursor={{ stroke: GRID }}
        />
        <Area
          type="monotone"
          dataKey="deliveries"
          stroke="var(--leaf)"
          strokeWidth={2}
          fill="url(#rj-trend)"
          isAnimationActive={false}
          dot={{ r: 2, fill: "var(--leaf)" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

/** Pickup status composition donut. */
export function StatusDonut({ data }: { data: DonutSlice[] }) {
  const mounted = useMounted();
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!mounted) return <div className="h-[220px]" />;
  if (total === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        —
      </div>
    );
  }
  const summary = data.map((d) => `${d.name}: ${d.value}`).join(", ");
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart role="img" aria-label={`Pickup status — ${summary}`}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export interface BarDatum {
  name: string;
  value: number;
}

/** Horizontal bar — top N categories (partners / destinations). */
export function TopBar({ data }: { data: BarDatum[] }) {
  const mounted = useMounted();
  if (!mounted) return <div className="h-[220px]" />;
  if (data.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        —
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 16 }}
        role="img"
        aria-label={data.map((d) => `${d.name}: ${d.value}`).join(", ")}>
        <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12, fill: "var(--foreground)" }}
          tickLine={false}
          axisLine={false}
          width={120}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--secondary)" }} />
        <Bar dataKey="value" fill="var(--primary)" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}
