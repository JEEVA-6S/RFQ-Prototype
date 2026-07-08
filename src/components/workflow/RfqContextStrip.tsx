/* ═══════════════════════════════════════════════════════════
   RfqContextStrip — Slim persistent strip showing active RFQ
   identity data on every stage page.
   ═══════════════════════════════════════════════════════════ */
import { Building2, Tag, Hash, DollarSign, Package, User } from "lucide-react";
import { useWorkflow } from "@/context/WorkflowContext";
import { RFQS, type RFQStatus } from "@/data/mock";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
    Critical: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400",
    High: "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
    Medium: "bg-sky-50 text-sky-600 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-400",
    Low: "bg-slate-50 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:text-slate-400",
};

function Chip({ icon: Icon, label, value, className }: {
    icon: typeof Hash;
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center gap-1.5 text-[12px]", className)}>
            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-semibold text-foreground">{value}</span>
        </div>
    );
}

interface RfqContextStripProps {
    /** Optional: highlight which field corresponds to the current stage */
    highlightStage?: RFQStatus;
    className?: string;
}

export function RfqContextStrip({ className }: RfqContextStripProps) {
    const { activeRfqId } = useWorkflow();
    const rfq = RFQS.find(r => r.id === activeRfqId) ?? RFQS[0];

    const formattedValue = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(rfq.value);

    return (
        <div className={cn(
            "flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-surface/40 px-6 py-2.5",
            className,
        )}>
            <Chip icon={Hash} label="RFQ" value={rfq.id} />
            <div className="h-3.5 w-px bg-border" />
            <Chip icon={Building2} label="Client" value={rfq.client} />
            <div className="h-3.5 w-px bg-border" />
            <Chip icon={Tag} label="Category" value={rfq.category} />
            <div className="h-3.5 w-px bg-border" />
            <Chip icon={Package} label="Qty" value={`${rfq.qty} units`} />
            <div className="h-3.5 w-px bg-border" />
            <Chip icon={DollarSign} label="Value" value={formattedValue} />
            <div className="h-3.5 w-px bg-border" />
            <Chip icon={User} label="Owner" value={rfq.owner} />
            <div className="ml-auto">
                <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide",
                    PRIORITY_STYLES[rfq.priority] ?? PRIORITY_STYLES["Medium"],
                )}>
                    {rfq.priority}
                </span>
            </div>
        </div>
    );
}
