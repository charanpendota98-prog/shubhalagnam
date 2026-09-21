"use client";

/** Lightweight inline SVG charts — no deps, animated, brand-styled. */

export function Sparkline({
  data,
  height = 56,
  stroke = "#7A0C2E",
  fill = "rgba(122,12,46,0.10)",
}: {
  data: number[];
  height?: number;
  stroke?: string;
  fill?: string;
}) {
  const w = 260;
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((v, i) => [i * step, height - (v / max) * (height - 8) - 4]);
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="h-full w-full" preserveAspectRatio="none">
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3.5} fill={stroke} />
      )}
    </svg>
  );
}

export function BarList({
  items,
  max,
  color = "#7A0C2E",
}: {
  items: { label: string; count: number }[];
  max?: number;
  color?: string;
}) {
  const top = max ?? Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="space-y-2.5">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3">
          <span className="w-28 shrink-0 truncate text-[12px] font-semibold text-slate-600" title={it.label}>
            {it.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(it.count / top) * 100}%`, background: color }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-[12px] font-bold text-slate-700">{it.count}</span>
        </div>
      ))}
      {!items.length && <p className="text-[12px] text-slate-400">No data yet.</p>}
    </div>
  );
}

export function Donut({
  segments,
  size = 120,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0));
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={16}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                className="transition-all duration-700"
              />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="fill-slate-800 text-lg font-black">
          {total}
        </text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px] font-semibold text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label} · {s.value}
          </div>
        ))}
      </div>
    </div>
  );
}
