/* ═══════════════════════════════════════════════════════════
   PipelineStageHeader — Full-width horizontal pipeline stepper
   Shown at the top of every stage page. Displays all 8 pipeline stages
   with SLA health dots, completion state, and click navigation.
   ═══════════════════════════════════════════════════════════ */
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock, Loader2 } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";
import { WORKFLOW_STAGES, normalizeRfqStatus, type RFQStatus } from "@/data/mock";
import { cn, getSlaMetrics, getStageTimingDisplay } from "@/lib/utils";
import type { StageSummary, SlaHealth } from "@/context/WorkflowContext";

/* ─── Health dot color map ─── */
const HEALTH_DOT: Record<SlaHealth, string> = {
    "on-time": "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]",
    "warning": "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]",
    "breached": "bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.7)] animate-pulse",
    "none": "bg-muted-foreground/25",
};

/* ─── Stage node visual configs ─── */
const NODE_CLASS = {
    completed: "bg-emerald-500 text-white border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
    active: "bg-amber-500 text-white border-2 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.35)]",
    pending: "bg-background text-muted-foreground border-2 border-border",
};

const NODE_SHELL_CLASS = {
    completed: "",
    active: "p-1.5 ring-4 ring-amber-500/20 rounded-full",
    pending: "",
};

const LABEL_CLASS = {
    completed: "text-emerald-700 dark:text-emerald-400 font-semibold",
    active: "text-amber-600 dark:text-amber-400 font-bold",
    pending: "text-muted-foreground font-medium",
};

const CONNECTOR_CLASS = {
    completed: "bg-emerald-400",
    active: "bg-gradient-to-r from-emerald-400 to-border",
    pending: "bg-border",
};

function getNodeVariant(s: StageSummary): "completed" | "active" | "pending" {
    if (s.status === "completed") return "completed";
    if (s.status === "active") return "active";
    return "pending";
}

/** Avoid amber "warning" on completed stages (0m remaining triggers warning in metrics). */
function resolveTimingBadgeKey(
    stageStatus: StageSummary["status"],
    sla: ReturnType<typeof getSlaMetrics>,
): keyof typeof SLA_STATUS_BADGE {
    if (stageStatus === "completed") {
        return sla.isBreached ? "breached" : "on-time";
    }
    return sla.status in SLA_STATUS_BADGE ? sla.status : "none";
}

/** Only show health dots for SLA risk — not on-time completed/active (prevents dot/icon color clash). */
function resolveHealthDot(
    summary: StageSummary,
    isBreached: boolean,
): SlaHealth | null {
    if (summary.status === "completed") {
        return isBreached ? "breached" : null;
    }
    if (summary.status === "active") {
        if (summary.slaHealth === "warning" || summary.slaHealth === "breached") {
            return summary.slaHealth;
        }
    }
    return null;
}

/* ─── Single stage node ─── */
function StageNode({
    summary,
    isLast,
    onClick,
    index,
}: {
    summary: StageSummary;
    isLast: boolean;
    onClick: () => void;
    index: number;
}) {
    const variant = getNodeVariant(summary);
    const isClickable = summary.status === "completed" || summary.status === "active";
    const shortLabel = summary.label;
    const nodeSla = getSlaMetrics({
        startedAt: summary.timeline?.startedAt,
        completedAt: summary.timeline?.completedAt,
        slaMinutes: summary.timeline?.slaMinutes,
    });
    const healthDot = resolveHealthDot(summary, nodeSla.isBreached);

    return (
        <div
            className="flex min-w-0 flex-1 items-start"
            style={{ animationDelay: `${index * 40}ms` }}
        >
            <div className="flex shrink-0 flex-col items-center">
                <div className="flex h-11 items-center px-1.5">
                    <button
                        onClick={onClick}
                        disabled={!isClickable}
                        className={cn(
                            "group relative z-10 shrink-0",
                            isClickable ? "cursor-pointer" : "cursor-default",
                        )}
                        title={`${summary.label} — ${summary.status} — ${summary.owner} · ${summary.sla}`}
                    >
                        <div className={cn("relative shrink-0", NODE_SHELL_CLASS[variant])}>
                            <div
                                className={cn(
                                    "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-300",
                                    NODE_CLASS[variant],
                                    isClickable && "group-hover:scale-105",
                                )}
                            >
                                {summary.status === "completed" ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : summary.status === "active" ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Circle className="h-3 w-3 opacity-40" />
                                )}
                            </div>
                            {healthDot && (
                                <span
                                    className={cn(
                                        "absolute -right-1 -top-1 z-20 h-2.5 w-2.5 rounded-full border-2 border-surface shadow-sm",
                                        HEALTH_DOT[healthDot],
                                    )}
                                />
                            )}
                        </div>
                    </button>
                </div>
                <span
                    className={cn(
                        "mb-1.5 max-w-[5.5rem] px-1 text-center text-[9.5px] leading-snug transition-colors",
                        "line-clamp-2 break-words",
                        LABEL_CLASS[variant],
                    )}
                >
                    {shortLabel}
                </span>
            </div>

            {!isLast && (
                <div
                    className="mx-1.5 flex h-11 min-w-[8px] flex-1 items-center"
                    aria-hidden
                >
                    <div
                        className={cn(
                            "h-0.5 w-full rounded-full transition-all duration-700",
                            CONNECTOR_CLASS[variant],
                        )}
                    />
                </div>
            )}
        </div>
    );
}

/* ─── Legend ─── */
function PipelineLegend() {
    return (
        <div className="flex items-center gap-4 shrink-0 ml-3">
            {[
                { dot: "bg-emerald-500", label: "On Time" },
                { dot: "bg-amber-500", label: "Warning" },
                { dot: "bg-rose-500", label: "Breached" },
                { dot: "bg-muted-foreground/25", label: "Pending" },
            ].map(({ dot, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full", dot)} />
                    <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                </div>
            ))}
        </div>
    );
}

/* ─── Main export ─── */
interface PipelineStageHeaderProps {
    /** The current page's stage — used to visually highlight the active pipeline position */
    currentStage: RFQStatus;
    className?: string;
    showLegend?: boolean;
}

const SLA_STATUS_BADGE: Record<string, string> = {
    "on-time": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    breached: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    none: "bg-muted text-muted-foreground ring-1 ring-border",
};

function StageTimingStrip({ stage }: { stage: RFQStatus }) {
    const { activeRfqId, getStageTimeline, getStageStatus, now } = useWorkflow();
    const pageStage = normalizeRfqStatus(stage);
    const [, setTick] = useState(0);
    useEffect(() => { setTick(t => t + 1); }, [now]);

    const stageMeta = WORKFLOW_STAGES.find(s => s.key === stage);
    const timeline = getStageTimeline(activeRfqId, pageStage);
    const stageStatus = getStageStatus(activeRfqId, pageStage, pageStage);
    const sla = getSlaMetrics({
        startedAt: timeline?.startedAt,
        completedAt: timeline?.completedAt,
        slaMinutes: timeline?.slaMinutes,
    });
    const hasSla = Boolean(timeline?.slaMinutes);
    const { timeSpent, timeRemaining } = getStageTimingDisplay(
        stageStatus,
        sla,
        timeline?.slaMinutes,
    );

    const slaLabel = stageStatus === "completed"
        ? (sla.isBreached ? "Delayed" : "Completed")
        : sla.status === "breached"
            ? "Breached"
            : sla.status === "warning"
                ? "Warning"
                : hasSla
                    ? "On Time"
                    : "Not Started";

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/70 bg-background/80 px-4 py-2.5 mb-3">
            <div className="flex items-center gap-2 shrink-0">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold text-foreground">
                    {stageMeta?.label ?? stage}
                </span>
                <span className="text-[10px] text-muted-foreground">
                    {stageMeta?.owner} · SLA {stageMeta?.sla ?? "—"}
                </span>
            </div>
            <div className="h-4 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time Spent</span>
                <span className="font-semibold tabular-nums text-foreground">{timeSpent}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[12px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Time Remaining</span>
                <span className={cn(
                    "font-semibold tabular-nums",
                    stageStatus === "active" && sla.status === "warning" && "text-amber-600",
                    stageStatus === "active" && sla.status === "breached" && "text-rose-600",
                    !(stageStatus === "active" && (sla.status === "warning" || sla.status === "breached")) && "text-foreground",
                )}>
                    {timeRemaining}
                </span>
            </div>
            <span className={cn(
                "ml-auto shrink-0 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold",
                SLA_STATUS_BADGE[resolveTimingBadgeKey(stageStatus, sla)],
            )}>
                {slaLabel}
            </span>
        </div>
    );
}

export function PipelineStageHeader({
    currentStage,
    className,
    showLegend = true,
}: PipelineStageHeaderProps) {
    const { activeRfqId, getWorkflowSummary, navigateToStage } = useWorkflow();
    const pageStage = normalizeRfqStatus(currentStage);
    const summary = getWorkflowSummary(activeRfqId, pageStage);

    const pageIdx = WORKFLOW_STAGES.findIndex(s => s.key === pageStage);
    const completedCount = pageIdx >= 0
        ? pageIdx
        : summary.filter(s => s.status === "completed").length;
    const totalCount = summary.length;
    const overallPct = Math.round((completedCount / totalCount) * 100);

    return (
        <div className={cn(
            "border-b border-border bg-surface/60 backdrop-blur-sm px-6 py-4",
            className,
        )}>
            <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                        Pipeline
                    </span>
                    <span className="font-mono text-[10px] font-bold text-primary">{activeRfqId}</span>
                </div>

                {/* Overall progress mini-bar */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[120px]">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-700 rounded-full"
                            style={{ width: `${overallPct}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                        {completedCount}/{totalCount} stages complete
                    </span>
                </div>

                {showLegend && <PipelineLegend />}
            </div>

            <StageTimingStrip stage={pageStage} />

            {/* Pipeline nodes — horizontally scrollable on small screens */}
            <div className="flex w-full items-start gap-0 overflow-x-auto px-1 pb-3 pt-1 scrollbar-thin">
                {summary.map((s, i) => (
                    <StageNode
                        key={s.key}
                        summary={s}
                        isLast={i === summary.length - 1}
                        onClick={() => navigateToStage(s.key)}
                        index={i}
                    />
                ))}
            </div>
        </div>
    );
}
