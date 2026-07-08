/* Reusable "Complete & Advance" action — matches header Btn pill style */
import { type ReactNode } from "react";
import { CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { Btn } from "@/components/shell/primitives";
import { useWorkflow } from "@/context/WorkflowContext";
import { WORKFLOW_STAGES, type RFQStatus } from "@/data/mock";
import { cn } from "@/lib/utils";

interface StageCompletionGuardProps {
    stage: RFQStatus;
    actionLabel?: string;
    actor?: string;
    className?: string;
    canAdvance?: boolean;
    canAdvanceMessage?: string;
}

function AdvanceButton({
    children,
    disabled,
    onClick,
    className,
}: {
    children: ReactNode;
    disabled?: boolean;
    onClick: () => void;
    className?: string;
}) {
    return (
        <Btn
            size="sm"
            disabled={disabled}
            onClick={onClick}
            className={cn("rounded-full px-5 shadow-sm", className)}
        >
            {children}
        </Btn>
    );
}

export function StageCompletionGuard({
    stage,
    actionLabel,
    actor = "Operator",
    className,
    canAdvance = true,
    canAdvanceMessage = "Complete all required fields before advancing.",
}: StageCompletionGuardProps) {
    const { activeRfqId, getStageTimeline, getStageStatus, navigateToStage, transition } = useWorkflow();

    const timeline = getStageTimeline(activeRfqId, stage);
    const isStageComplete = Boolean(timeline?.completedAt);
    const stageStatus = isStageComplete
        ? "completed"
        : getStageStatus(activeRfqId, stage, stage);
    const nextStageMeta = WORKFLOW_STAGES[WORKFLOW_STAGES.findIndex(s => s.key === stage) + 1];
    const cta = actionLabel ?? (nextStageMeta
        ? `Continue to ${nextStageMeta.label}`
        : "Mark as Complete");

    if (isStageComplete) {
        if (!nextStageMeta) return null;
        return (
            <AdvanceButton
                className={className}
                onClick={() => navigateToStage(nextStageMeta.key)}
            >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {cta}
                <ArrowRight className="h-3.5 w-3.5" />
            </AdvanceButton>
        );
    }

    if (stageStatus === "pending") {
        return (
            <span className={cn(
                "inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-4 py-2 text-[12px] text-muted-foreground",
                className,
            )}>
                <Lock className="h-3.5 w-3.5 shrink-0" />
                Complete earlier stages first
            </span>
        );
    }

    return (
        <div className={cn("flex flex-wrap items-center gap-2", className)}>
            {!canAdvance && (
                <span className="text-[12px] text-amber-700 dark:text-amber-400">
                    {canAdvanceMessage}
                </span>
            )}
            <AdvanceButton
                disabled={!canAdvance}
                onClick={() => {
                    if (nextStageMeta) {
                        transition(activeRfqId, nextStageMeta.key, actor);
                    }
                }}
            >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {cta}
                <ArrowRight className="h-3.5 w-3.5" />
            </AdvanceButton>
        </div>
    );
}
