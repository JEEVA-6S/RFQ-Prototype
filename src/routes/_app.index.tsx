import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import {
  ChevronRight, RefreshCw, ChevronDown,
  TrendingUp, MapPin, Clock, Percent,
} from "lucide-react";
import { WORKFLOW_STAGES, type RFQStatus } from "@/data/mock";
import { ModuleHeader, Section, Btn } from "@/components/shell/primitives";
import { useWorkflow } from "@/context/WorkflowContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Operations Dashboard — SeaHydrosys" }] }),
  component: Dashboard,
});

/* ─── Period filter ─── */
type PeriodKey = "30d" | "3m" | "6m" | "1y";

const PERIOD_LABELS: Record<PeriodKey, string> = {
  "30d": "Last 30 days",
  "3m": "Last 3 months",
  "6m": "Last 6 months",
  "1y": "Last year",
};

const CAT_COLORS = [
  "oklch(0.55 0.15 245)",
  "oklch(0.65 0.13 200)",
  "oklch(0.7 0.14 155)",
  "oklch(0.74 0.16 75)",
  "oklch(0.6 0.18 25)",
  "oklch(0.5 0.05 250)",
];

interface ProductCategory {
  name: string;
  count: number;
  pct: number;
  onTime: number;
  inDelay: number;
}

function productCat(name: string, count: number, pct: number): ProductCategory {
  const onTime = Math.max(0, Math.round(count * 0.68));
  const inDelay = Math.max(0, count - onTime);
  return { name, count, pct, onTime, inDelay };
}

interface PeriodData {
  conversion: { value: string;  converted: number; total: number };
  avgResponseTime: { value: string;  };
  productCategories: ProductCategory[];
  topCustomers: { name: string; rfqs: number; conversion: string; revenue: string }[];
  geography: { region: string; rfqs: number; pct: number }[];
}

/* ─────────────────────────────────────────────────────────────────────────────
   Pipeline funnel rationale (based on 1 800 RFQs / year = 5 RFQs / day):
   Each stage value = total RFQs that flowed through that stage in the period.
   Stages narrow as RFQs are dropped/lost at each transition.
     Received  → 100 %  of total
     BOM       →  98 %
     Evaluation →  94 %
     Costing   →  84 %
     Review    →  76 %
     Sent      →  63 %   (Quote Sent to customer)
     Revision  →  19 %   (subset of Sent that needed revision)
     Approved  →  37.6 % (conversion rate of total)
     PO        →  95 % of Approved
     Procurement→  95 % of PO
     Production →  94 % of Procurement
   Periods: 1y = 1 800, 6m = 900, 3m = 450, 30d = 150.
─────────────────────────────────────────────────────────────────────────────── */
const PERIOD_DATA: Record<PeriodKey, PeriodData> = {
  "30d": {
    conversion: { value: "34.0%",  converted: 51, total: 150 },
    avgResponseTime: { value: "5.4h",  },
    productCategories: [
      productCat("Tie-Rod Cylinder", 6, 28.6),
      productCat("Welded Cylinder", 5, 23.8),
      productCat("Mill-Type", 4, 19.0),
      productCat("Telescopic", 3, 14.3),
      productCat("Long-Stroke", 2, 9.5),
      productCat("Custom", 1, 4.8),
    ],
    topCustomers: [
      { name: "Reliance Industries", rfqs: 4, conversion: "36%", revenue: "$62k" },
      { name: "L&T Heavy Eng.", rfqs: 3, conversion: "33%", revenue: "$45k" },
      { name: "Mahindra Marine", rfqs: 3, conversion: "37%", revenue: "$37k" },
      { name: "Tata Steel", rfqs: 2, conversion: "30%", revenue: "$27k" },
      { name: "Adani Ports", rfqs: 2, conversion: "28%", revenue: "$21k" },
    ],
    geography: [
      { region: "\uD83C\uDDEE\uD83C\uDDF3 India", rfqs: 51, pct: 34 },
      { region: "\uD83C\uDDEA\uD83C\uDDFA Europe / EU", rfqs: 32, pct: 21 },
      { region: "\uD83C\uDDFA\uD83C\uDDF8 United States", rfqs: 21, pct: 14 },
      { region: "\uD83C\uDDEC\uD83C\uDDE7 United Kingdom", rfqs: 12, pct: 8 },
      { region: "\uD83C\uDDE6\uD83C\uDDFA Australia", rfqs: 8, pct: 5 },
    ],
  },
  "3m": {
    conversion: { value: "36.0%",  converted: 162, total: 450 },
    avgResponseTime: { value: "5.8h",  },
    productCategories: [
      productCat("Tie-Rod Cylinder", 19, 28.8),
      productCat("Welded Cylinder", 16, 24.2),
      productCat("Mill-Type", 11, 16.7),
      productCat("Telescopic", 8, 12.1),
      productCat("Long-Stroke", 7, 10.6),
      productCat("Custom", 5, 7.6),
    ],
    topCustomers: [
      { name: "Reliance Industries", rfqs: 11, conversion: "38%", revenue: "$185k" },
      { name: "L&T Heavy Eng.", rfqs: 8, conversion: "35%", revenue: "$136k" },
      { name: "Mahindra Marine", rfqs: 7, conversion: "38%", revenue: "$109k" },
      { name: "Tata Steel", rfqs: 6, conversion: "33%", revenue: "$80k" },
      { name: "Adani Ports", rfqs: 5, conversion: "30%", revenue: "$64k" },
    ],
    geography: [
      { region: "\uD83C\uDDEE\uD83C\uDDF3 India", rfqs: 153, pct: 34 },
      { region: "\uD83C\uDDEA\uD83C\uDDFA Europe / EU", rfqs: 95, pct: 21 },
      { region: "\uD83C\uDDFA\uD83C\uDDF8 United States", rfqs: 63, pct: 14 },
      { region: "\uD83C\uDDEC\uD83C\uDDE7 United Kingdom", rfqs: 36, pct: 8 },
      { region: "\uD83C\uDDE6\uD83C\uDDFA Australia", rfqs: 22, pct: 5 },
    ],
  },
  "6m": {
    conversion: { value: "37.0%",  converted: 333, total: 900 },
    avgResponseTime: { value: "6.1h",  },
    productCategories: [
      productCat("Tie-Rod Cylinder", 38, 28.6),
      productCat("Welded Cylinder", 32, 24.1),
      productCat("Mill-Type", 23, 17.3),
      productCat("Telescopic", 16, 12.0),
      productCat("Long-Stroke", 14, 10.5),
      productCat("Custom", 10, 7.5),
    ],
    topCustomers: [
      { name: "Reliance Industries", rfqs: 21, conversion: "39%", revenue: "$370k" },
      { name: "L&T Heavy Eng.", rfqs: 16, conversion: "37%", revenue: "$272k" },
      { name: "Mahindra Marine", rfqs: 14, conversion: "40%", revenue: "$219k" },
      { name: "Tata Steel", rfqs: 12, conversion: "34%", revenue: "$161k" },
      { name: "Adani Ports", rfqs: 10, conversion: "32%", revenue: "$128k" },
    ],
    geography: [
      { region: "\uD83C\uDDEE\uD83C\uDDF3 India", rfqs: 306, pct: 34 },
      { region: "\uD83C\uDDEA\uD83C\uDDFA Europe / EU", rfqs: 189, pct: 21 },
      { region: "\uD83C\uDDFA\uD83C\uDDF8 United States", rfqs: 126, pct: 14 },
      { region: "\uD83C\uDDEC\uD83C\uDDE7 United Kingdom", rfqs: 72, pct: 8 },
      { region: "\uD83C\uDDE6\uD83C\uDDFA Australia", rfqs: 45, pct: 5 },
    ],
  },
  "1y": {
    conversion: { value: "37.6%",  converted: 677, total: 1800 },
    avgResponseTime: { value: "6.4h",  },
    productCategories: [
      productCat("Tie-Rod Cylinder", 76, 28.7),
      productCat("Welded Cylinder", 63, 23.8),
      productCat("Mill-Type", 46, 17.4),
      productCat("Telescopic", 33, 12.5),
      productCat("Long-Stroke", 28, 10.6),
      productCat("Custom", 19, 7.2),
    ],
    topCustomers: [
      { name: "Reliance Industries", rfqs: 42, conversion: "42%", revenue: "$740k" },
      { name: "L&T Heavy Eng.", rfqs: 32, conversion: "38%", revenue: "$543k" },
      { name: "Mahindra Marine", rfqs: 28, conversion: "41%", revenue: "$438k" },
      { name: "Tata Steel", rfqs: 24, conversion: "35%", revenue: "$321k" },
      { name: "Adani Ports", rfqs: 21, conversion: "33%", revenue: "$256k" },
    ],
    geography: [
      { region: "\uD83C\uDDEE\uD83C\uDDF3 India", rfqs: 612, pct: 34 },
      { region: "\uD83C\uDDEA\uD83C\uDDFA Europe / EU", rfqs: 378, pct: 21 },
      { region: "\uD83C\uDDFA\uD83C\uDDF8 United States", rfqs: 252, pct: 14 },
      { region: "\uD83C\uDDEC\uD83C\uDDE7 United Kingdom", rfqs: 144, pct: 8 },
      { region: "\uD83C\uDDE6\uD83C\uDDFA Australia", rfqs: 90, pct: 5 },
    ],
  },
};

/* ─── Current pipeline snapshot (live WIP — not period-filtered) ─── */
const CURRENT_PIPELINE: Partial<Record<RFQStatus, number>> = {
  Received: 150, BOM: 147, Feasibility: 141, Costing: 126,
  Review: 114, Drawings: 95, Quoted: 120, PO: 54,
};

/* ─── Period Dropdown ─── */
function PeriodDropdown({ value, onChange }: { value: PeriodKey; onChange: (k: PeriodKey) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-foreground shadow-sm hover:bg-muted transition-colors"
      >
        {PERIOD_LABELS[value]}
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
            <button
              key={k}
              onClick={() => { onChange(k); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-[13px] transition-colors hover:bg-muted ${k === value ? "bg-primary/5 font-semibold text-primary" : "text-foreground"
                }`}
            >
              {PERIOD_LABELS[k]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


function Dashboard() {
  const navigate = useNavigate();
  const { navigateToStage } = useWorkflow();
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const data = PERIOD_DATA[period];

  return (
    <>
      <ModuleHeader
        breadcrumbs={["Dashboard"]}
        title="Operations Dashboard"
        subtitle="Mumbai Plant · Mon 13 May 2026 · Realtime"
        actions={
          <>
            <Btn variant="outline" size="sm" onClick={() => window.location.reload()}><RefreshCw className="h-3.5 w-3.5" />Refresh</Btn>
            <PeriodDropdown value={period} onChange={setPeriod} />
          </>
        }
      />

      <div className="space-y-6 p-6 lg:p-8">

        {/* ── Top KPIs ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Conversion Ratio */}
          <div className="kpi-card">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Conversion Ratio</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[28px] font-bold tabular-nums leading-none tracking-tight">{data.conversion.value}</div>
              
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {data.conversion.converted} converted / {data.conversion.total} total
            </div>
          </div>

          {/* Avg Response Time */}
          <div className="kpi-card">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Avg Response Time</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[28px] font-bold tabular-nums leading-none tracking-tight">{data.avgResponseTime.value}</div>
              
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">RFQ receipt → Quote sent</div>
          </div>

          {/* Total Enquiries */}
          <div className="kpi-card">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal" />
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Total Enquiries</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-[28px] font-bold tabular-nums leading-none tracking-tight">
                {data.conversion.total.toLocaleString()}
              </div>
              
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {data.conversion.converted.toLocaleString()} converted · {PERIOD_LABELS[period]}
            </div>
          </div>
        </div>

        {/* ── Pipeline ── */}
        <Section title="Pipeline — RFQs by Stage">
          <Pipeline counts={CURRENT_PIPELINE} onStageClick={(status) => navigateToStage(status)} />
        </Section>

        {/* ── Main content grid ── */}
        <div className="grid grid-cols-12 gap-6">

          {/* ── Product Categories ── */}
          <Section className="col-span-12 xl:col-span-4" title="Product Categories">
            <div className="p-5">
              <TooltipProvider delayDuration={150}>
                <ul className="space-y-3">
                  {data.productCategories.map((cat, idx) => (
                    <li key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-medium">{cat.name}</span>
                        <span className="text-[11px] tabular-nums text-muted-foreground">{cat.count} RFQs ({cat.pct}%)</span>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="h-2.5 rounded-full bg-muted overflow-hidden cursor-default">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${cat.pct * 3}%`, background: CAT_COLORS[idx] }}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="border border-border bg-popover px-3 py-2 text-popover-foreground shadow-md"
                        >
                          <p className="text-[11px] font-semibold text-foreground mb-1.5">{cat.name}</p>
                          <div className="space-y-1 text-[11px]">
                            <p>
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">On time SLA:</span>{" "}
                              <span className="tabular-nums font-semibold">{cat.onTime}</span> RFQs
                            </p>
                            <p>
                              <span className="font-medium text-rose-600 dark:text-rose-400">In delay:</span>{" "}
                              <span className="tabular-nums font-semibold">{cat.inDelay}</span> RFQs
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  ))}
                </ul>
              </TooltipProvider>
            </div>
          </Section>

          {/* ── Top Customers ── */}
          <Section
            className="col-span-12 xl:col-span-4"
            title="Top Customers"
            action={
              <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/masters" })}>
                View All <ChevronRight className="h-3.5 w-3.5" />
              </Btn>
            }
          >
            <div className="overflow-x-auto">
              <table className="ent-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>RFQs</th>
                    <th>Conv.</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCustomers.map((c) => (
                    <tr key={c.name} className="hover:bg-primary/5 transition-colors">
                      <td className="font-medium">{c.name}</td>
                      <td className="tabular-nums">{c.rfqs}</td>
                      <td className="tabular-nums text-success font-medium">{c.conversion}</td>
                      <td className="tabular-nums font-semibold">{c.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          {/* ── Geography ── */}
          <Section className="col-span-12 xl:col-span-4" title="Geography Distribution">
            <div className="p-5">
              <ul className="space-y-3">
                {data.geography.map((g) => (
                  <li key={g.region}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2 text-[12px] font-medium">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {g.region}
                      </span>
                      <span className="text-[11px] tabular-nums text-muted-foreground">{g.rfqs} RFQs</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${g.pct * 2.5}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

/* ─── Pipeline ─── */
function Pipeline({ counts, onStageClick }: { counts: Partial<Record<RFQStatus, number>>; onStageClick: (status: RFQStatus) => void }) {
  const max = Math.max(...Object.values(counts).map((v) => v ?? 0), 1);
  return (
    <div className="p-5">
      <div className="flex gap-3">
        {WORKFLOW_STAGES.map((s) => {
          const c = counts[s.key] ?? 0;
          const pct = (c / max);
          const h = Math.max(8, Math.round(100 * pct));
          return (
            <div key={s.key} className="group flex flex-1 flex-col items-center transition-all duration-200 hover:-translate-y-0.5 cursor-pointer min-w-0" onClick={() => onStageClick(s.key)}>
              <div className="flex h-28 w-full items-end justify-center px-2">
                <div
                  className="w-full rounded-md transition-all duration-500"
                  style={{
                    height: `${h}px`,
                    background: "linear-gradient(180deg, var(--color-primary), var(--color-accent))",
                    opacity: c === 0 ? 0.15 : 0.85,
                  }}
                />
              </div>
              <div className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-2 text-center transition-all duration-200 group-hover:shadow-card">
                <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{s.owner} · {s.sla}</div>
                <div className="mt-0.5 truncate text-[11px] font-semibold leading-tight">{s.label}</div>
                <div className="mt-1 text-[16px] font-bold tabular-nums text-primary">{c}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
