"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const GRID = "rgba(120,180,255,.08)";
const AXIS = "#5c718f";

const tooltipStyle = {
  background: "#151f31",
  border: "1px solid #1e2c44",
  borderRadius: 10,
  fontSize: 12,
  color: "#e8f4ff",
};

export function PercentBars({
  data,
  color = "#00f5a0",
}: {
  data: { label: string; title?: string; value: number; attempts?: number }[];
  color?: string;
}) {
  if (data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke={AXIS}
          fontSize={11}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: "rgba(255,255,255,.03)" }}
          formatter={(value: number, _name, item) => {
            const p = item.payload as { attempts?: number };
            return [
              p.attempts !== undefined ? `${value}% · ${p.attempts} attempts` : `${value}%`,
              "",
            ];
          }}
          labelFormatter={(label, payload) => {
            const p = payload?.[0]?.payload as { title?: string } | undefined;
            return p?.title ?? String(label);
          }}
        />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CountBars({
  data,
  colors = ["#00f5a0", "#00c9ff", "#f6a821"],
}: {
  data: { label: string; value: number }[];
  colors?: string[];
}) {
  if (data.length === 0) return <EmptyChart />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} />
        <YAxis stroke={AXIS} fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,.03)" }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[220px] items-center justify-center text-sm text-[var(--color-muted)]">
      Not enough data yet.
    </div>
  );
}
