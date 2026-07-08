/* ═══════════════════════════════════════════════════════════
   Workflow Context — Global RFQ workflow state management
   Enhanced: live ticker, getWorkflowSummary, realistic timelines
   ═══════════════════════════════════════════════════════════ */
import {
    createContext, useContext, useState, useCallback,
    useEffect, useRef, type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import type { RFQ, RFQStatus } from "../data/mock";
import { WORKFLOW_STAGES, RFQS, normalizeRfqStatus } from "../data/mock";
import { toast } from "sonner";
import { parseDateTime, parseSlaToMinutes, getSlaMetrics } from "../lib/utils";

/* ─── Types ─── */

export interface StageTimeline {
    stage: RFQStatus;
    startedAt?: number;
    completedAt?: number;
    slaMinutes?: number | null;
}

export type StageStatus = "completed" | "active" | "pending";
export type SlaHealth = "on-time" | "warning" | "breached" | "none";

export interface StageSummary {
    key: RFQStatus;
    label: string;
    owner: string;
    sla: string;
    status: StageStatus;
    slaHealth: SlaHealth;
    timeline: StageTimeline | undefined;
    progressPct: number;
}

interface WorkflowState {
    /** Currently selected / focused RFQ id */
    activeRfqId: string;
    /** Per-RFQ status overrides */
    statusMap: Record<string, RFQStatus>;
    /** Per-RFQ stage tracking */
    stageMap: Record<string, Record<RFQStatus, StageTimeline>>;
    /** Log of transitions */
    history: { rfqId: string; from: RFQStatus; to: RFQStatus; ts: number; actor: string }[];
    /** Live ticker — updates every 30s so SLA components re-render */
    now: number;
}

interface WorkflowCtx extends WorkflowState {
    setActiveRfq: (id: string) => void;
    getStatus: (id: string) => RFQStatus;
    getStageTimeline: (id: string, stage: RFQStatus) => StageTimeline | undefined;
    getStageStatus: (id: string, stage: RFQStatus, pageStage?: RFQStatus) => StageStatus;
    /** Returns a compact summary of all stages for the given RFQ — used by PipelineStageHeader */
    getWorkflowSummary: (id: string, pageStage?: RFQStatus) => StageSummary[];
    advance: (id: string, actor?: string) => void;
    transition: (id: string, to: RFQStatus, actor?: string) => void;
    setStatus: (id: string, status: RFQStatus, actor?: string) => void;
    navigateToStage: (status: RFQStatus) => void;
    resetStage: (id: string, stage: RFQStatus) => void;
}

const Ctx = createContext<WorkflowCtx | null>(null);

const STAGE_ORDER: RFQStatus[] = WORKFLOW_STAGES.map(s => s.key);

const ALLOWED_TRANSITIONS: Record<RFQStatus, RFQStatus[]> = {
    Received: ["BOM"],
    BOM: ["Feasibility"],
    Feasibility: ["Costing"],
    Costing: ["Review"],
    Review: ["Drawings"],
    Drawings: ["Quoted"],
    Quoted: ["PO"],
    PO: [],
    Evaluation: ["BOM"],
    Sent: ["PO"],
    Procurement: [],
};

function nextStage(current: RFQStatus): RFQStatus | null {
    const idx = STAGE_ORDER.indexOf(current);
    if (idx < 0 || idx >= STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[idx + 1];
}

function getStageSlaMinutes(stage: RFQStatus): number | null {
    const meta = WORKFLOW_STAGES.find(s => s.key === stage);
    return meta ? parseSlaToMinutes(meta.sla) : null;
}

/**
 * Pipeline display: when pageStage is set, all stages before that page are green,
 * the page stage is active (amber) until explicitly completed, later stages are pending.
 * Without pageStage: uses timeline.completedAt / statusMap for guards and summaries.
 */
function resolveStageStatus(
    statusMap: Record<string, RFQStatus>,
    stageMap: Record<string, Record<RFQStatus, StageTimeline>>,
    id: string,
    stage: RFQStatus,
    pageStage?: RFQStatus,
): StageStatus {
    const key = normalizeRfqStatus(stage);
    const timeline = stageMap[id]?.[key];

    if (pageStage) {
        const page = normalizeRfqStatus(pageStage);
        const pageIdx = STAGE_ORDER.indexOf(page);
        const stageIdx = STAGE_ORDER.indexOf(key);
        if (pageIdx >= 0 && stageIdx >= 0) {
            if (stageIdx < pageIdx) return "completed";
            if (stageIdx === pageIdx) {
                return timeline?.completedAt ? "completed" : "active";
            }
            return "pending";
        }
    }

    if (timeline?.completedAt) return "completed";

    const current = normalizeRfqStatus(statusMap[id] ?? "Received");
    if (key === current) return "active";

    return "pending";
}

/**
 * Build a realistic stage timeline map for an RFQ.
 * Completed stages get sequential start/end times based on SLA durations
 * so that SLA metrics show realistic non-zero elapsed times.
 */
function buildStageTimelineMap(rfq: RFQ): Record<RFQStatus, StageTimeline> {
    const map = {} as Record<RFQStatus, StageTimeline>;
    WORKFLOW_STAGES.forEach((stage) => {
        map[stage.key] = {
            stage: stage.key,
            slaMinutes: parseSlaToMinutes(stage.sla),
        };
    });

    const current = normalizeRfqStatus(rfq.status);
    const currentIdx = STAGE_ORDER.indexOf(current);
    const receivedAt = parseDateTime(rfq.receivedAt) ?? Date.now();

    const COMPLETED_STAGE_FILL = 0.88;
    const ACTIVE_STAGE_FILL = 0.55;

    // Walk through completed stages accumulating realistic timestamps
    let cursor = receivedAt;
    STAGE_ORDER.forEach((stage, idx) => {
        const timeline = map[stage];
        if (!timeline) return;
        const slaMs = (timeline.slaMinutes ?? 60) * 60000;

        if (idx < currentIdx) {
            const durationMs = Math.round(slaMs * COMPLETED_STAGE_FILL);
            timeline.startedAt = cursor;
            timeline.completedAt = cursor + durationMs;
            cursor = timeline.completedAt;
        } else if (idx === currentIdx) {
            // Active — partial progress within current stage SLA budget
            let fill = ACTIVE_STAGE_FILL;
            if (rfq.id === "RFQ-2026-00475") fill = 0.88;
            if (rfq.id === "RFQ-2026-00474") fill = 1.08;
            if (rfq.id === "RFQ-2026-00473") fill = 0.92;

            const elapsedMs = Math.round(slaMs * fill);
            timeline.startedAt = Date.now() - elapsedMs;
        }
    });

    return map;
}

export function WorkflowProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate();
    const [state, setState] = useState<WorkflowState>({
        activeRfqId: RFQS[0].id,
        statusMap: Object.fromEntries(RFQS.map(r => [r.id, normalizeRfqStatus(r.status)])),
        stageMap: Object.fromEntries(RFQS.map(r => [r.id, buildStageTimelineMap(r)])),
        history: [],
        now: Date.now(),
    });

    /* ─── Live ticker — updates every 30s ─── */
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        intervalRef.current = setInterval(() => {
            setState(s => ({ ...s, now: Date.now() }));
        }, 30000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    /* ─── Selectors ─── */
    const getStatus = useCallback((id: string): RFQStatus => {
        return normalizeRfqStatus(state.statusMap[id] ?? "Received");
    }, [state.statusMap]);

    const setActiveRfq = useCallback((id: string) => {
        setState(s => ({ ...s, activeRfqId: id }));
    }, []);

    const getStageTimeline = useCallback((id: string, stage: RFQStatus) => {
        return state.stageMap[id]?.[stage];
    }, [state.stageMap]);

    const getStageStatus = useCallback((id: string, stage: RFQStatus, pageStage?: RFQStatus): StageStatus => {
        return resolveStageStatus(state.statusMap, state.stageMap, id, stage, pageStage);
    }, [state.statusMap, state.stageMap]);

    const getWorkflowSummary = useCallback((id: string, pageStage?: RFQStatus): StageSummary[] => {
        return WORKFLOW_STAGES.map(stageMeta => {
            const timeline = state.stageMap[id]?.[stageMeta.key];
            const status = resolveStageStatus(
                state.statusMap,
                state.stageMap,
                id,
                stageMeta.key,
                pageStage,
            );

            const sla = getSlaMetrics({
                startedAt: timeline?.startedAt,
                completedAt: timeline?.completedAt,
                slaMinutes: timeline?.slaMinutes,
            });

            return {
                key: stageMeta.key,
                label: stageMeta.label,
                owner: stageMeta.owner,
                sla: stageMeta.sla,
                status,
                slaHealth: sla.status,
                timeline,
                progressPct: sla.progressPct,
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.statusMap, state.stageMap, state.now]);

    /* ─── Mutations ─── */
    const setStatus = useCallback((id: string, status: RFQStatus, actor = "System") => {
        const to = normalizeRfqStatus(status);
        setState(s => {
            const from = normalizeRfqStatus(s.statusMap[id] ?? "Received");
            const now = Date.now();
            const stageMap = { ...s.stageMap };
            const rfqStages = { ...(stageMap[id] ?? {}) } as Record<RFQStatus, StageTimeline>;

            const fromIdx = STAGE_ORDER.indexOf(from);
            const toIdx = STAGE_ORDER.indexOf(to);
            const isForward = fromIdx >= 0 && toIdx >= 0 && toIdx > fromIdx;

            if (from !== to && isForward) {
                const previous = rfqStages[from];
                if (previous && !previous.completedAt) {
                    const slaMin = previous.slaMinutes ?? getStageSlaMinutes(from) ?? 60;
                    const durationMs = Math.round(slaMin * 60000 * 0.88);
                    const startedAt = previous.startedAt ?? now - durationMs;
                    rfqStages[from] = {
                        ...previous,
                        startedAt,
                        completedAt: startedAt + durationMs,
                        slaMinutes: previous.slaMinutes ?? getStageSlaMinutes(from),
                    };
                }
            }

            const next = rfqStages[to] ?? { stage: to, slaMinutes: getStageSlaMinutes(to) };
            if (!next.startedAt) {
                rfqStages[to] = { ...next, startedAt: now, slaMinutes: next.slaMinutes ?? getStageSlaMinutes(to) };
            } else {
                rfqStages[to] = { ...next, slaMinutes: next.slaMinutes ?? getStageSlaMinutes(to) };
            }

            stageMap[id] = rfqStages;

            return {
                ...s,
                statusMap: { ...s.statusMap, [id]: to },
                stageMap,
                now: Date.now(),
                history: [...s.history, { rfqId: id, from, to, ts: now, actor }],
            };
        });
        const stage = WORKFLOW_STAGES.find(s => s.key === to);
        toast.success(`${id} moved to ${stage?.label ?? to}`);
    }, []);

    const transition = useCallback((id: string, to: RFQStatus, actor = "System") => {
        const target = normalizeRfqStatus(to);
        const current = normalizeRfqStatus(state.statusMap[id] ?? "Received");
        if (current === target) {
            const sameStage = WORKFLOW_STAGES.find(s => s.key === target);
            if (sameStage) navigate({ to: sameStage.route });
            return;
        }

        const currentIdx = STAGE_ORDER.indexOf(current);
        const targetIdx = STAGE_ORDER.indexOf(target);
        const isBackNavigation = targetIdx >= 0 && currentIdx >= 0 && targetIdx < currentIdx;
        const allowed = ALLOWED_TRANSITIONS[current] ?? [];
        if (!isBackNavigation && !allowed.includes(target)) {
            toast.error(`Invalid transition: ${current} → ${target}`);
            return;
        }

        setStatus(id, target, actor);
        const stage = WORKFLOW_STAGES.find(s => s.key === target);
        if (stage) navigate({ to: stage.route });
    }, [state.statusMap, setStatus, navigate]);

    const advance = useCallback((id: string, actor = "System") => {
        const current = normalizeRfqStatus(state.statusMap[id] ?? "Received");
        const next = ALLOWED_TRANSITIONS[current]?.[0] ?? nextStage(current);
        if (!next) {
            toast.info("This RFQ has reached the final stage.");
            return;
        }
        setStatus(id, next, actor);
        const stage = WORKFLOW_STAGES.find(s => s.key === next);
        if (stage) navigate({ to: stage.route });
    }, [state.statusMap, setStatus, navigate]);

    const navigateToStage = useCallback((status: RFQStatus) => {
        const target = normalizeRfqStatus(status);
        const current = normalizeRfqStatus(state.statusMap[state.activeRfqId] ?? "Received");
        if (target === current) {
            const stage = WORKFLOW_STAGES.find(s => s.key === target);
            if (stage) navigate({ to: stage.route });
            return;
        }

        const currentIdx = STAGE_ORDER.indexOf(current);
        const targetIdx = STAGE_ORDER.indexOf(target);
        const isBackNavigation = targetIdx >= 0 && targetIdx < currentIdx;
        const isAllowedForward = (ALLOWED_TRANSITIONS[current] ?? []).includes(target);

        if (!isBackNavigation && !isAllowedForward) {
            const currentLabel = WORKFLOW_STAGES.find(s => s.key === current)?.label ?? current;
            toast.warning(`Complete ${currentLabel} before moving to this stage`);
            return;
        }

        const stage = WORKFLOW_STAGES.find(s => s.key === target);
        if (stage) navigate({ to: stage.route });
    }, [navigate, state.statusMap, state.activeRfqId]);

    const resetStage = useCallback((id: string, stage: RFQStatus) => {
        setState(s => {
            const stageMap = { ...s.stageMap };
            const rfqStages = { ...(stageMap[id] ?? {}) } as Record<RFQStatus, StageTimeline>;
            rfqStages[stage] = {
                stage,
                slaMinutes: getStageSlaMinutes(stage),
                startedAt: Date.now(),
                completedAt: undefined,
            };
            stageMap[id] = rfqStages;
            return { ...s, stageMap };
        });
    }, []);

    return (
        <Ctx.Provider value={{
            ...state,
            setActiveRfq,
            getStatus,
            getStageTimeline,
            getStageStatus,
            getWorkflowSummary,
            advance,
            transition,
            setStatus,
            navigateToStage,
            resetStage,
        }}>
            {children}
        </Ctx.Provider>
    );
}

export function useWorkflow() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
    return ctx;
}
