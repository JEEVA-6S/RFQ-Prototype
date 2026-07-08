import { type ReactNode } from "react";
import type { Confidence, RFQStatus } from "@/data/mock";

/* ─── Confidence Badge ─── */
export function ConfidenceBadge({ level }: { level: Confidence }) {
  const map: Record<Confidence, { cls: string; dot: string; label: string }> = {
    high: { cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-success", label: "High" },
    medium: { cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", dot: "bg-warning", label: "Med" },
    low: { cls: "bg-rose-50 text-rose-700 ring-1 ring-rose-200", dot: "bg-destructive", label: "Low" },
  };
  const { cls, dot, label } = map[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-semibold ${cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      AI·{label}
    </span>
  );
}

/* ─── Status Pill ─── */
const STATUS_STYLES: Record<RFQStatus, string> = {
  Received: "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  BOM: "bg-violet-50 text-violet-600 ring-1 ring-violet-200",
  Evaluation: "bg-purple-50 text-purple-600 ring-1 ring-purple-200",
  Feasibility: "bg-purple-50 text-purple-600 ring-1 ring-purple-200",
  Procurement: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Costing: "bg-sky-50 text-sky-600 ring-1 ring-sky-200",
  Review: "bg-fuchsia-50 text-fuchsia-600 ring-1 ring-fuchsia-200",
  Quoted: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
  Sent: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Drawings: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200",
  PO: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
};

export function StatusPill({ status }: { status: RFQStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

/* ─── Priority Dot ─── */
export function PriorityDot({ p }: { p: "Low" | "Medium" | "High" | "Critical" }) {
  const styles: Record<string, string> = {
    Low: "bg-slate-300",
    Medium: "bg-info",
    High: "bg-warning",
    Critical: "bg-destructive animate-pulse",
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${styles[p]}`} title={p} />;
}

/* ─── SLA Bar ─── */
export function SLABar({ hrs }: { hrs: number }) {
  const pct = Math.max(0, Math.min(100, (hrs / 48) * 100));
  const color = hrs < 2 ? "bg-destructive" : hrs < 8 ? "bg-warning" : "bg-success";
  const textColor = hrs < 2 ? "text-destructive" : hrs < 8 ? "text-warning" : "text-muted-foreground";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${100 - pct}%` }} />
      </div>
      <span className={`text-[11px] tabular-nums font-semibold ${textColor}`}>{hrs}h</span>
    </div>
  );
}

/* ─── Section Card ─── */
export function Section({
  title, action, children, className = "",
}: {
  title: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-300 ${className}`}>
      <header className="section-header">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{title}</h3>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </header>
      <div>{children}</div>
    </section>
  );
}

/* ─── Module Header ─── */
export function ModuleHeader({
  title, subtitle, actions, titlePrefix, titleSuffix, 
}: {
  title: ReactNode; subtitle?: string; actions?: ReactNode; breadcrumbs?: string[]; titlePrefix?: ReactNode; titleSuffix?: ReactNode;
}) {
  return (
    <div className="module-header px-8 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {titlePrefix}
            <h1 className="text-[20px] font-bold leading-tight tracking-tight text-foreground">{title}</h1>
            {titleSuffix && <div className="flex items-center gap-2">{titleSuffix}</div>}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 pt-1">{actions}</div>
        )}
      </div>
    </div>
  );
}

/* ─── Button ─── */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "default" | "ghost" | "outline" | "soft" | "danger" | "teal";
  size?: "sm" | "md";
}

export function Btn({ children, variant = "default", size = "md", className = "", ...props }: BtnProps) {
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    ghost: "bg-transparent hover:bg-muted text-foreground",
    outline: "border border-border bg-surface hover:bg-muted text-foreground",
    soft: "bg-primary-soft text-primary hover:bg-primary-soft/70",
    danger: "bg-destructive text-destructive-foreground hover:opacity-90",
    teal: "bg-teal text-white hover:opacity-90",
  };
  const sizes = { sm: "px-3.5 py-2 text-[12px]", md: "px-4 py-2.5 text-[13px]" };

  return (
    <button
      {...props}
      className={`btn-press inline-flex items-center gap-2 rounded-lg font-semibold transition-all duration-200 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/* ─── Metric Card ─── */
export function MetricCard({
  label, value, delta, trend, hint, accent = false,
}: {
  label: string; value: string; delta?: string; trend?: "up" | "down" | "flat"; hint?: string; accent?: boolean;
}) {
  const trendCls = trend === "up" ? "text-success" : trend === "down" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className={`kpi-card${accent ? " kpi-card-accent" : ""}`}>
      <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-[22px] font-bold tabular-nums leading-none tracking-tight text-foreground">{value}</div>
        {delta && (
          <span className={`text-[11px] font-semibold tabular-nums ${trendCls}`}>{delta}</span>
        )}
      </div>
      {hint && <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
