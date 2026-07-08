/* Pipeline header with per-stage time spent / remaining — one import per stage page */
import { useEffect } from "react";
import { PipelineStageHeader } from "./PipelineStageHeader";
import { WORKFLOW_STAGES, normalizeRfqStatus, type RFQStatus } from "@/data/mock";
import { useWorkflow } from "@/context/WorkflowContext";

const STAGE_ORDER: RFQStatus[] = WORKFLOW_STAGES.map((s) => s.key);

interface StageWorkflowChromeProps {
    stage: RFQStatus;
    className?: string;
}

export function StageWorkflowChrome({ stage, className }: StageWorkflowChromeProps) {
    const { activeRfqId, getStageTimeline, getStatus, setStatus } = useWorkflow();
    const pageStage = normalizeRfqStatus(stage);

    useEffect(() => {
        const timeline = getStageTimeline(activeRfqId, pageStage);
        if (timeline?.completedAt) return;

        const current = normalizeRfqStatus(getStatus(activeRfqId));
        if (current === pageStage) return;

        const currentIdx = STAGE_ORDER.indexOf(current);
        const pageIdx = STAGE_ORDER.indexOf(pageStage);
        if (pageIdx > currentIdx) {
            setStatus(activeRfqId, pageStage, "Stage visit");
        }
    }, [activeRfqId, pageStage, getStageTimeline, getStatus, setStatus]);

    return <PipelineStageHeader currentStage={stage} className={className} />;
}
