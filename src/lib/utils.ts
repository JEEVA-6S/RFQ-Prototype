import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SlaStatus = "on-time" | "warning" | "breached" | "none";

export function parseSlaToMinutes(sla: string): number | null {
  if (!sla || sla.trim() === "—") return null;
  const hoursMatch = sla.match(/(\d+(?:\.\d+)?)\s*h/i);
  if (hoursMatch) return Math.round(parseFloat(hoursMatch[1]) * 60);
  const minutesMatch = sla.match(/(\d+)\s*m/i);
  if (minutesMatch) return parseInt(minutesMatch[1], 10);
  return null;
}

export function parseDateTime(value?: string): number | undefined {
  if (!value) return undefined;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const ts = Date.parse(normalized);
  return Number.isNaN(ts) ? undefined : ts;
}

export function formatDateTime(ts?: number): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts));
}

export function formatDurationMinutes(totalMinutes?: number): string {
  if (totalMinutes == null || Number.isNaN(totalMinutes)) return "—";
  const minutes = Math.max(0, Math.round(totalMinutes));
  const hoursPart = Math.floor(minutes / 60);
  const minutesPart = minutes % 60;
  if (hoursPart <= 0) return `${minutesPart}m`;
  if (minutesPart === 0) return `${hoursPart}h`;
  return `${hoursPart}h ${minutesPart}m`;
}

export function getSlaMetrics(params: {
  startedAt?: number;
  completedAt?: number;
  slaMinutes?: number | null;
}): {
  status: SlaStatus;
  elapsedMinutes: number | null;
  remainingMinutes: number | null;
  targetAt?: number;
  progressPct: number;
  isBreached: boolean;
} {
  const { startedAt, completedAt, slaMinutes } = params;
  if (!startedAt || !slaMinutes) {
    return {
      status: "none",
      elapsedMinutes: null,
      remainingMinutes: null,
      targetAt: undefined,
      progressPct: 0,
      isBreached: false,
    };
  }

  const endAt = completedAt ?? Date.now();
  const elapsedMinutes = Math.max(0, (endAt - startedAt) / 60000);
  const remainingMinutes = Math.max(0, slaMinutes - elapsedMinutes);
  const targetAt = startedAt + slaMinutes * 60000;
  const progressPct = Math.min(100, Math.max(0, (elapsedMinutes / slaMinutes) * 100));
  const isBreached = endAt > targetAt;

  let status: SlaStatus = "on-time";
  if (isBreached) {
    status = "breached";
  } else if (remainingMinutes <= Math.min(30, slaMinutes * 0.2)) {
    status = "warning";
  }

  return {
    status,
    elapsedMinutes,
    remainingMinutes,
    targetAt,
    progressPct,
    isBreached,
  };
}

export type WorkflowStageStatus = "completed" | "active" | "pending";

export function getStageTimingDisplay(
  stageStatus: WorkflowStageStatus,
  sla: ReturnType<typeof getSlaMetrics>,
  slaMinutes?: number | null,
): { timeSpent: string; timeRemaining: string } {
  const hasSla = Boolean(slaMinutes);

  if (stageStatus === "pending") {
    return {
      timeSpent: "0m",
      timeRemaining: hasSla ? formatDurationMinutes(slaMinutes!) : "—",
    };
  }

  if (stageStatus === "completed") {
    return {
      timeSpent: hasSla ? formatDurationMinutes(sla.elapsedMinutes ?? undefined) : "—",
      timeRemaining: "0m",
    };
  }

  return {
    timeSpent: hasSla ? formatDurationMinutes(sla.elapsedMinutes ?? undefined) : "—",
    timeRemaining: hasSla ? formatDurationMinutes(sla.remainingMinutes ?? undefined) : "—",
  };
}

/* ─── SLA Helper Functions ─── */

export function calculateRemainingSLA(slaHrs: number): { hours: number; minutes: number; isExpired: boolean; percentage: number } {
  const maxSLA = 6; // RFQ inbox → quote pipeline budget (6 hours)
  const remainingHrs = Math.max(0, slaHrs - 0.5); // Simulate some time has passed
  
  const totalMinutes = Math.floor(remainingHrs * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  const isExpired = remainingHrs <= 0;
  const percentage = (remainingHrs / maxSLA) * 100;
  
  return { hours, minutes, isExpired, percentage };
}

export function formatSLADisplay(slaHrs: number): string {
  const { hours, minutes, isExpired } = calculateRemainingSLA(slaHrs);
  
  if (isExpired) {
    return "Expired";
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  
  return `${minutes}m`;
}

export function getSLABadgeColor(slaHrs: number): string {
  const maxSLA = 6;
  const remainingHrs = Math.max(0, slaHrs - 0.5);
  const percentage = (remainingHrs / maxSLA) * 100;
  
  if (remainingHrs <= 0) {
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  }
  
  if (percentage <= 33) {
    return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
  }
  
  if (percentage <= 66) {
    return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
  }
  
  return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
}
