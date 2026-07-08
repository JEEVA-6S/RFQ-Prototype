/* ═══════════════════════════════════════════════════════════
   SlaTrackerCard — Rich SLA tracking display with animated
   progress arc, metric grid, and status badge.
   Used on every stage page to surface SLA health.
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { Clock, CheckCircle2, AlertTriangle, XCircle, Timer } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";
import { WORKFLOW_STAGES, type RFQStatus } from "@/data/mock";
import { getSlaMetrics, getStageTimingDisplay, formatDateTime, formatDurationMinutes, type SlaStatus } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* ─── SLA Status configs ─── */
const SLA_CONFIG: Record<SlaStatus | "completed-ok" | "completed-late", {
    label: string;
    icon: typeof Clock;
    ring: string;
    badge: string;
    dot: string;
    track: string;
}> = {
    "none": {
        label: "Not Started",
        icon: Timer,
        ring: "stroke-muted-foreground/20",
        badge: "bg-muted text-muted-foreground ring-1 ring-border",
        dot: "bg-muted-foreground/40",
        track: "stroke-muted/50",
    },
    "on-time": {
        label: "On Time",
        icon: CheckCircle2,
        ring: "stroke-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800",
        dot: "bg-emerald-500",
        track: "stroke-emerald-100 dark:stroke-emerald-950",
    },
    "warning": {
        label: "Warning",
        icon: AlertTriangle,
        ring: "stroke-amber-500",
        badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800",
        dot: "bg-amber-500",
        track: "stroke-amber-100 dark:stroke-amber-950",
    },
    "breached": {
        label: "Breached",
        icon: XCircle,
        ring: "stroke-rose-500",
        badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-800",
        dot: "bg-rose-500",
        track: "stroke-rose-100 dark:stroke-rose-950",
    },
    "completed-ok": {
        label: "On Time",
        icon: CheckCircle2,
        ring: "stroke-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800",
        dot: "bg-emerald-500",
        track: "stroke-emerald-100 dark:stroke-emerald-950",
    },
    "completed-late": {
        label: "Delayed",
        icon: XCircle,
        ring: "stroke-rose-500",
        badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-800",
        dot: "bg-rose-500",
        track: "stroke-rose-100 dark:stroke-rose-950",
    },
};

/* ─── SVG Ring ─── */
const RING_SIZE = 80;
const STROKE_W = 7;
const RADIUS = (RING_SIZE - STROKE_W * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function SlaRing({ pct, status }: { pct: number; status: string }) {
    const cfg = SLA_CONFIG[status as keyof typeof SLA_CONFIG] ?? SLA_CONFIG["none"];
    const clampedPct = Math.min(100, Math.max(0, pct));
    const offset = CIRCUMFERENCE - (clampedPct / 100) * CIRCUMFERENCE;

    return (
        <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE_W}
                className={cfg.track}
            />
            {/* Fill */}
            <circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                fill="none"
                strokeWidth={STROKE_W}
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                className={cn("transition-all duration-700 ease-out", cfg.ring)}
            />
        </svg>
    );
}

/* ─── Metric item ─── */
function MetricItem({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="rounded-lg border border-border/70 bg-background px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
            <div className={cn("mt-0.5 text-[12px] font-semibold tabular-nums", highlight ? "text-primary" : "text-foreground")}>
                {value}
            </div>
        </div>
    );
}

/* ─── Main component ─── */
interface SlaTrackerCardProps {
    stage: RFQStatus;
    className?: string;
    /** If true, shows only a compact inline chip instead of the full card */
    compact?: boolean;
}

export function SlaTrackerCard({ stage, className, compact = false }: SlaTrackerCardProps) {
    const { activeRfqId, getStageTimeline, getStageStatus, now } = useWorkflow();
    const [, setTick] = useState(0);

    // Re-render every 30s in sync with context ticker
    useEffect(() => { setTick(t => t + 1); }, [now]);

    const stageMeta = WORKFLOW_STAGES.find(s => s.key === stage);
    const timeline = getStageTimeline(activeRfqId, stage);
    const stageStatus = getStageStatus(activeRfqId, stage);

    const sla = getSlaMetrics({
        startedAt: timeline?.startedAt,
        completedAt: timeline?.completedAt,
        slaMinutes: timeline?.slaMinutes,
    });

    // Determine the display status key
    const displayStatus: keyof typeof SLA_CONFIG = (() => {
        if (stageStatus === "completed") {
            return sla.isBreached ? "completed-late" : "completed-ok";
        }
        return sla.status;
    })();

    const cfg = SLA_CONFIG[displayStatus];
    const Icon = cfg.icon;
    const hasSla = Boolean(timeline?.slaMinutes);
    const { timeSpent, timeRemaining } = getStageTimingDisplay(
        stageStatus,
        sla,
        timeline?.slaMinutes,
    );

    // ─── Compact chip ───
    if (compact) {
        return (
            <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                cfg.badge,
                className,
            )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                <Icon className="h-3 w-3" />
                <span>{cfg.label}</span>
                {hasSla && (
                    <span className="ml-0.5 text-[10px] font-normal opacity-70 tabular-nums">
                        {stageStatus === "completed"
                            ? `${timeSpent} spent`
                            : stageStatus === "pending"
                                ? `${timeRemaining} remaining`
                                : `${timeSpent} · ${timeRemaining} left`}
                    </span>
                )}
            </span>
        );
    }

    // ─── Full card ───
    return (
        <div className={cn(
            "overflow-hidden rounded-xl border border-border bg-card shadow-card",
            className,
        )}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-3.5">
                <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                        SLA Tracker
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        cfg.badge,
                    )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground ring-1 ring-border">
                        {stageStatus.charAt(0).toUpperCase() + stageStatus.slice(1)}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-5">
                <div className="flex items-start gap-5">
                    {/* Ring + stage info */}
                    <div className="flex flex-col items-center gap-2 shrink-0">
                        <div className="relative">
                            <SlaRing pct={sla.progressPct} status={displayStatus} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-[13px] font-bold tabular-nums text-foreground leading-tight">
                                    {hasSla ? `${Math.round(sla.progressPct)}%` : "—"}
                                </span>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-[11px] font-bold text-foreground">{stageMeta?.label ?? stage}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">{stageMeta?.owner} · SLA {stageMeta?.sla}</div>
                        </div>
                    </div>

                    {/* Metric grid */}
                    <div className="flex-1 grid grid-cols-2 gap-2 md:grid-cols-3">
                        <MetricItem label="Started" value={formatDateTime(timeline?.startedAt)} />
                        <MetricItem label="Target" value={formatDateTime(sla.targetAt)} />
                        <MetricItem label="Completed" value={formatDateTime(timeline?.completedAt)} />
                        <MetricItem label="Time Spent" value={timeSpent} />
                        <MetricItem
                            label="Time Remaining"
                            value={timeRemaining}
                            highlight={stageStatus === "active" && sla.status === "warning"}
                        />
                        <MetricItem label="SLA Budget" value={stageMeta?.sla ?? "—"} />
                    </div>
                </div>

                {/* Progress bar */}
                {hasSla && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                SLA Progress
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                                {Math.round(sla.progressPct)}% elapsed
                            </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-700 ease-out",
                                    displayStatus === "breached" || displayStatus === "completed-late"
                                        ? "bg-rose-500"
                                        : displayStatus === "warning"
                                            ? "bg-amber-500"
                                            : "bg-emerald-500",
                                )}
                                style={{ width: `${Math.min(100, sla.progressPct)}%` }}
                            />
                        </div>
                        {(displayStatus === "breached" || displayStatus === "completed-late") && (
                            <div className="mt-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                                ⚠ Overran SLA by {formatDurationMinutes(
                                    Math.max(0, (sla.elapsedMinutes ?? 0) - (timeline?.slaMinutes ?? 0))
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Compact SLA badge for page headers — same tracker data as SlaTrackerCard */
export function StageSLAChip({
    stage,
    className,
}: {
    stage: RFQStatus;
    className?: string;
}) {
    return <SlaTrackerCard stage={stage} compact className={className} />;
}
