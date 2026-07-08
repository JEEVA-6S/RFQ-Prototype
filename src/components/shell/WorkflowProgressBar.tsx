import { WORKFLOW_STAGES, type RFQStatus } from "@/data/mock";
import { useWorkflow } from "@/context/WorkflowContext";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn, getSlaMetrics } from "@/lib/utils";

const STAGE_ORDER: RFQStatus[] = WORKFLOW_STAGES.map((stage) => stage.key);

export function WorkflowProgressBar({ className }: { className?: string }) {
    const { activeRfqId, getStatus, navigateToStage, getStageTimeline } = useWorkflow();
    const current = getStatus(activeRfqId);
    const currentOrderIdx = STAGE_ORDER.indexOf(current);

    return (
        <div className={cn("flex items-center gap-0.5 rounded-xl border bg-card/60 px-3 py-2 backdrop-blur", className)}>
            <span className="mr-2 text-xs font-medium text-muted-foreground shrink-0">{activeRfqId}</span>
            {STAGE_ORDER.map((key, i) => {
                const stage = WORKFLOW_STAGES.find(s => s.key === key)!;
                const stageOrderIdx = STAGE_ORDER.indexOf(key);
                const isActive = key === current;
                const isDone = currentOrderIdx > stageOrderIdx;
                const timeline = getStageTimeline(activeRfqId, key);
                const sla = getSlaMetrics({
                    startedAt: timeline?.startedAt,
                    completedAt: timeline?.completedAt,
                    slaMinutes: timeline?.slaMinutes,
                });
                const slaDot = sla.status === "breached"
                    ? "bg-rose-500"
                    : sla.status === "warning"
                        ? "bg-amber-500"
                        : sla.status === "on-time"
                            ? "bg-emerald-500"
                            : "bg-muted-foreground/40";
                return (
                    <div key={key} className="flex items-center">
                        <button
                            onClick={() => navigateToStage(key)}
                            className={cn(
                                "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                                isActive && "bg-primary/10 text-primary ring-1 ring-primary/30",
                                isDone && "text-emerald-600 dark:text-emerald-400",
                                !isActive && !isDone && "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            <span className={cn("h-1.5 w-1.5 rounded-full", slaDot)} />
                            {isDone ? (
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                            ) : isActive ? (
                                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                            ) : (
                                <Circle className="h-3 w-3 shrink-0 opacity-40" />
                            )}
                            <span className="hidden lg:inline">{stage.label.replace("RFQ ", "").replace("Quote ", "")}</span>
                        </button>
                        {i < STAGE_ORDER.length - 1 && (
                            <div className={cn(
                                "h-px w-3 transition-colors",
                                isDone ? "bg-emerald-400" : "bg-border",
                            )} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
