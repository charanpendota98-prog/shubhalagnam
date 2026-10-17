"use client";

/**
 * 📊 Ops insights — the four numbers an operator acts on each morning.
 *
 * Everything shown here is an aggregate count the backend already computed.
 * Nothing is estimated, no member is named, and no figure is presented as an
 * outcome or success signal — a request that was "accepted" is acceptance of
 * contact, not a match.
 */
import { useLang } from "@/lib/lang";
import { BarList, Sparkline } from "./Charts";
import {
  agingLabel,
  funnelRows,
  hoursLabel,
  interestStatusRows,
  sharePercent,
  trendLabel,
} from "@/lib/ops-insights.mjs";

type Row = Record<string, any>;

type Props = {
  analytics: Row | null;
  /** Signups series for the sparkline; the dashboard already holds it. */
  series?: number[];
};

const PANEL = "bg-white rounded-3xl p-5 border border-gold/30 shadow-xs space-y-3";
const TITLE = "font-extrabold text-sm text-navy";
const EMPTY = "text-xs font-bold text-slate-500";

export default function OpsInsights({ analytics, series }: Props) {
  const { lang } = useLang();
  const te = lang === "te";
  const an = analytics || {};
  const aging = an.queue_aging as Row | undefined;
  const funnel = funnelRows(an.funnel, te);
  const engagement = (an.engagement || {}) as Row;
  const trend = (an.trend || {}) as { last_7d?: number; previous_7d?: number; delta?: number };
  const signupSeries = Array.isArray(series) && series.length ? series : [];

  const buckets = Array.isArray(aging?.buckets) ? aging.buckets : [];
  const waiting = Math.max(0, Number(aging?.pending_with_date) || 0);
  const statuses = interestStatusRows(engagement.interest_status, te);
  const savedTotal = Math.max(0, Number(engagement.saved_searches) || 0);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <section aria-labelledby="ops-aging" className={PANEL}>
        <h3 id="ops-aging" className={TITLE}>{te ? "⏳ క్యూ ఎంతసేపు నిరీక్షిస్తోంది" : "⏳ How long the queue has waited"}</h3>
        {buckets.length === 0 ? (
          <p className={EMPTY}>{te ? "ఈ సమయంలో pending profiles లేవు." : "Nothing is waiting in the queue right now."}</p>
        ) : (
          <>
            <BarList items={buckets.map((row: Row) => ({ label: agingLabel(row.label, te), count: Number(row.count) || 0 }))} />
            <p className="text-xs font-bold text-slate-600">
              {te ? "అత్యధిక నిరీక్షణ: " : "Oldest waiting: "}
              {hoursLabel(aging?.oldest_pending_hours, te)}
            </p>
          </>
        )}
      </section>

      <section aria-labelledby="ops-funnel" className={PANEL}>
        <h3 id="ops-funnel" className={TITLE}>{te ? "📉 సభ్యులు ఎక్కడ ఆగిపోతున్నారు" : "📉 Where members stall"}</h3>
        {funnel.length === 0 ? (
          <p className={EMPTY}>{te ? "ఫన్నెల్ డేటా అందుబాటులో లేదు." : "Funnel data is not available yet."}</p>
        ) : (
          <ul className="space-y-2">
            {funnel.map((row) => (
              <li key={row.step}>
                <div className="flex items-baseline justify-between gap-2 text-xs font-bold">
                  <span className="text-slate-700">{row.label}</span>
                  <span className="text-navy">
                    {row.count}
                    {row.share !== null && <span className="ml-1 font-semibold text-slate-500">{row.share}%</span>}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-[#7A0C2E]"
                    style={{ width: `${row.share === null ? 100 : Math.max(2, row.share)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ops-engagement" className={PANEL}>
        <h3 id="ops-engagement" className={TITLE}>{te ? "💬 అభ్యర్థనలు & సేవ్‌లు" : "💬 Requests & saves"}</h3>
        {statuses.length === 0 ? (
          <p className={EMPTY}>{te ? "ఇంకా అభ్యర్థనలు లేవు." : "No interest requests yet."}</p>
        ) : (
          <ul className="space-y-1.5">
            {statuses.map((row) => {
              const share = sharePercent(row.count, engagement.interests_total);
              return (
                <li key={row.label} className="flex items-baseline justify-between gap-2 text-xs font-bold">
                  <span className="text-slate-700">{row.label}</span>
                  <span className="text-navy">
                    {row.count}
                    {share !== null && <span className="ml-1 font-semibold text-slate-500">{share}%</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <dl className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
          {[
            { label: te ? "అభ్యర్థనలు" : "Requests", value: Math.max(0, Number(engagement.interests_total) || 0) },
            { label: te ? "Saved searches" : "Saved searches", value: savedTotal },
            { label: te ? "షార్ట్‌లిస్ట్" : "Shortlists", value: Math.max(0, Number(engagement.shortlist_entries) || 0) },
          ].map((item) => (
            <div key={item.label}>
              <dt className="text-[11px] font-bold text-slate-500">{item.label}</dt>
              <dd className="text-lg font-black text-navy">{item.value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] leading-relaxed text-slate-500">
          {te
            ? `Alerts ఆన్: ${Math.max(0, Number(engagement.saved_search_alerts_on) || 0)} (నమోదైన సమ్మతి ఉన్నవి మాత్రమే). అంగీకారం అంటే contact కు అంగీకారం, పెళ్లి ఫలితం కాదు.`
            : `Alerts on: ${Math.max(0, Number(engagement.saved_search_alerts_on) || 0)} (recorded consent only). Acceptance means contact was accepted, not that a match was made.`}
        </p>
      </section>

      <section aria-labelledby="ops-trend" className={PANEL}>
        <h3 id="ops-trend" className={TITLE}>{te ? "📈 రిజిస్ట్రేషన్ల ధోరణి" : "📈 Registration trend"}</h3>
        <p className="text-xs font-bold text-slate-700">{trendLabel(trend, te)}</p>
        {signupSeries.length > 0 ? (
          <div className="h-14">
            <Sparkline data={signupSeries} />
          </div>
        ) : (
          <p className={EMPTY}>{te ? "ట్రెండ్ డేటా అందుబాటులో లేదు." : "Trend data is not available yet."}</p>
        )}
        <p className="text-[11px] leading-relaxed text-slate-500">
          {te
            ? `గత 7 రోజులు: ${Math.max(0, Number(trend.last_7d) || 0)} · అంతకుముందు: ${Math.max(0, Number(trend.previous_7d) || 0)}`
            : `Last 7 days: ${Math.max(0, Number(trend.last_7d) || 0)} · Previous: ${Math.max(0, Number(trend.previous_7d) || 0)}`}
        </p>
      </section>
    </div>
  );
}
