import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
    ArrowRight, RotateCcw, CheckCircle2,
    Clock,
} from "lucide-react";
import { RFQS, COSTING_SUMMARY } from "@/data/mock";
import { ModuleHeader, Section, Btn, MetricCard } from "@/components/shell/primitives";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";
import { formatSLADisplay, getSLABadgeColor } from "@/lib/utils";

export const Route = createFileRoute("/_app/revisions")({
    head: () => ({ meta: [{ title: "Revisions — SeaHydrosys" }] }),
    component: RevisionsPage,
});

const REVISIONS = [
    {
        rev: "r1", date: "2026-05-11", author: "Anita R.", reason: "Initial quote",
        changes: [], unitPrice: 3720, status: "superseded" as const,
    },
    {
        rev: "r2", date: "2026-05-12", author: "S. Patel", reason: "Customer requested alternate rod material",
        changes: [
            { field: "Rod Material", from: "EN19", to: "CK45-Hard Chrome", impact: "+₹145/unit" },
            { field: "Rod Supplier", from: "Internal", to: "Mukand Steel", impact: "+4 wk lead" },
            { field: "Machining — Rod OD Turning", from: "₹210", to: "₹267", impact: "+₹57/unit" },
        ],
        unitPrice: 3922, status: "superseded" as const,
    },
    {
        rev: "r3", date: "2026-05-13", author: "Anita R.", reason: "Margin adjustment per management",
        changes: [
            { field: "Margin", from: "15%", to: "18%", impact: "+₹102/unit" },
            { field: "Paint cost", from: "₹58", to: "₹72", impact: "+₹14/unit" },
            { field: "Testing", from: "Std test", to: "FAT with witness", impact: "+₹25/unit" },
        ],
        unitPrice: COSTING_SUMMARY.unitPrice, status: "current" as const,
    },
];

function RevisionsPage() {
    const navigate = useNavigate();
    const { activeRfqId, transition, setActiveRfq } = useWorkflow();
    const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];
    const [selectedRev, setSelectedRev] = useState(REVISIONS.length - 1);

    function handleAcceptRevision() {
        toast.success("Revision accepted — proceeding to PO handoff");
        setActiveRfq(rfq.id);
        transition(rfq.id, "PO", "Sales");
    }

    function handleRestartCosting() {
        toast.info("Restarting from costing stage");
        setActiveRfq(rfq.id);
        transition(rfq.id, "Costing", "Costing");
    }

    const currentRev = REVISIONS[selectedRev];
    const prevPrice = selectedRev > 0 ? REVISIONS[selectedRev - 1].unitPrice : currentRev.unitPrice;
    const priceDiff = currentRev.unitPrice - prevPrice;

    return (
        <>
            <ModuleHeader
                breadcrumbs={["Operate", "Quotation", "Revisions"]}
                title="Quote Revisions"
                subtitle={`${rfq.id} · ${rfq.client} · ${REVISIONS.length} revisions`}
                titleSuffix={
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold ${getSLABadgeColor(rfq.slaHrs)}`}>
                    <Clock className="h-3.5 w-3.5" />
                    SLA - {formatSLADisplay(rfq.slaHrs)}
                  </span>
                }
                actions={
                    <>
                        <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/quotes" })}>← Back to Quote</Btn>
                        <Btn variant="outline" size="sm" onClick={handleRestartCosting}>
                            <RotateCcw className="h-3.5 w-3.5" />Restart Costing
                        </Btn>
                        <Btn size="sm" onClick={handleAcceptRevision}>
                            <CheckCircle2 className="h-3.5 w-3.5" />Accept & Proceed to PO<ArrowRight className="h-3.5 w-3.5" />
                        </Btn>
                    </>
                }
            />

            <div className="space-y-6 p-6 lg:p-8">
                {/* ── KPIs ── */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <MetricCard label="Current Revision" value={currentRev.rev.toUpperCase()} hint={currentRev.date} />
                    <MetricCard label="Current Price" value={`₹${currentRev.unitPrice.toLocaleString()}`} hint="per unit" accent />
                    <MetricCard label="Price Change" value={priceDiff >= 0 ? `+₹${priceDiff}` : `-₹${Math.abs(priceDiff)}`} hint="vs previous" />
                    <MetricCard label="Total Revisions" value={`${REVISIONS.length}`} hint="since initial" />
                </div>

                <div className="grid grid-cols-12 gap-6">
                    {/* ── Revision Timeline ── */}
                    <div className="col-span-12 lg:col-span-4">
                        <Section title="Revision History">
                            <div className="p-4 space-y-0">
                                {REVISIONS.map((r, i) => (
                                    <div
                                        key={r.rev}
                                        onClick={() => setSelectedRev(i)}
                                        className={`relative cursor-pointer rounded-lg border p-3 transition-all ${i === selectedRev
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-transparent hover:bg-surface-2"
                                            }`}
                                    >
                                        {i > 0 && <div className="absolute left-6 -top-2 h-4 w-0.5 bg-border" />}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${r.status === "current"
                                                    ? "bg-primary text-white"
                                                    : "bg-muted text-muted-foreground"
                                                    }`}>
                                                    {r.rev.toUpperCase()}
                                                </span>
                                                <span className="text-[13px] font-semibold">{r.reason}</span>
                                            </div>
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{r.date}</span>
                                            <span>{r.author}</span>
                                            <span className="font-semibold tabular-nums">₹{r.unitPrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Section>
                    </div>

                    {/* ── Change Diff ── */}
                    <div className="col-span-12 lg:col-span-8">
                        <Section title={`Changes in ${currentRev.rev.toUpperCase()} — ${currentRev.reason}`}>
                            {currentRev.changes.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <div className="text-[14px] font-semibold">Initial version</div>
                                    <div className="text-[12px] mt-1">No changes to show</div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="ent-table">
                                        <thead>
                                            <tr>
                                                <th>Field</th><th>Previous Value</th><th></th><th>New Value</th><th>Impact</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {currentRev.changes.map((c, j) => (
                                                <tr key={j}>
                                                    <td className="font-semibold text-[13px]">{c.field}</td>
                                                    <td>
                                                        <span className="rounded bg-destructive/10 px-2 py-1 text-[12px] text-destructive line-through">{c.from}</span>
                                                    </td>
                                                    <td><ArrowRight className="h-3.5 w-3.5 text-muted-foreground" /></td>
                                                    <td>
                                                        <span className="rounded bg-success/10 px-2 py-1 text-[12px] text-success font-medium">{c.to}</span>
                                                    </td>
                                                    <td className="text-[12px] font-medium text-accent tabular-nums">{c.impact}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </Section>

                        {/* Price comparison */}
                        <div className="mt-6">
                            <Section title="Price Comparison Across Revisions">
                                <div className="p-5">
                                    <div className="flex items-end justify-around gap-4">
                                        {REVISIONS.map((r) => {
                                            const maxPrice = Math.max(...REVISIONS.map((rv) => rv.unitPrice));
                                            const pct = (r.unitPrice / maxPrice) * 100;
                                            return (
                                                <div key={r.rev} className="flex flex-col items-center gap-2">
                                                    <div className="text-[13px] font-bold tabular-nums">₹{r.unitPrice.toLocaleString()}</div>
                                                    <div className="flex h-32 items-end">
                                                        <div
                                                            className={`w-12 rounded-md transition-all ${r.status === "current" ? "bg-primary" : "bg-muted-foreground/30"}`}
                                                            style={{ height: `${pct}%` }}
                                                        />
                                                    </div>
                                                    <div className={`text-[12px] font-semibold ${r.status === "current" ? "text-primary" : "text-muted-foreground"}`}>
                                                        {r.rev.toUpperCase()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Section>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
