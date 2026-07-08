import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
    ArrowRight, FileText, Download, Factory,
    Calendar, DollarSign, CreditCard, StickyNote, Hash,
    User, MapPin, Mail,
} from "lucide-react";
import { RFQS, COSTING_SUMMARY, PARTS_EXTRACTION } from "@/data/mock";
import { ModuleHeader, Section, Btn, MetricCard } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip } from "@/components/workflow";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/po-handoff")({
    head: () => ({ meta: [{ title: "PO Receipt & Handoff — SeaHydrosys" }] }),
    component: PoHandoffPage,
});

type POStep = "po-entry" | "mfg-release";

const MFG_PACKAGE = [
    { title: "GA Drawing Rev B", type: "Drawing", status: "Ready", icon: "drawing" },
    { title: "Part Drawings (7 sheets)", type: "Drawing", status: "Ready", icon: "drawing" },
    { title: "Bill of Materials", type: "Document", status: "Ready", icon: "bom" },
    { title: "Process Routing Sheet", type: "Document", status: "Ready", icon: "doc" },
    { title: "Material Requisition", type: "Document", status: "Ready", icon: "doc" },
    { title: "Quality Plan", type: "Document", status: "In Progress", icon: "doc" },
    { title: "Test Procedure", type: "Document", status: "Ready", icon: "doc" },
    { title: "Weld Procedure (WPS-042)", type: "Document", status: "Ready", icon: "doc" },
];

const PAYMENT_TERMS = ["30% Advance, 70% on Dispatch", "50% Advance, 50% on Delivery", "100% Advance", "Net 30", "Net 45", "Letter of Credit"];
const INCOTERMS = ["EXW", "FOB", "CIF", "DDP", "DAP"];

function PoHandoffPage() {
    const navigate = useNavigate();
    const { activeRfqId, setActiveRfq } = useWorkflow();
    const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];
    const unitPrice = COSTING_SUMMARY.unitPrice;

    /* ── Step state ── */
    const [step, setStep] = useState<POStep>("po-entry");

    /* ── PO form ── */
    const [poForm, setPoForm] = useState({
        poNumber: `PO-2026-${rfq.id.slice(-4)}`,
        poDate: new Date().toISOString().slice(0, 10),
        poValue: String(Math.round(unitPrice * rfq.qty)),
        deliveryDate: "",
        paymentTerms: PAYMENT_TERMS[0],
        incoterms: INCOTERMS[0],
        deliveryAddress: rfq.client + " Warehouse",
        contactName: rfq.contactName ?? "Procurement Manager",
        contactEmail: rfq.sender,
        notes: "",
    });

    /* ── Checklist ── */
    // Removed: validation checklist is no longer needed

    /* ── Release state ── */
    const [released, setReleased] = useState(false);
    const workOrderId = `WO-2026-${rfq.id.slice(-4)}`;

    /* ── Handlers ── */
    function handlePoFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
        setPoForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    }

    function handleProceedToRelease() {
        if (!poForm.deliveryDate) toast.warning("Delivery date not set — you can add it later");
        else toast.success("PO details saved — proceed to release");
        setStep("mfg-release");
    }

    function handleRelease() {
        setReleased(true);
        setActiveRfq(rfq.id);
        toast.success(`${workOrderId} released — ${rfq.client} handoff complete`);
    }

    /* ── Step indicator ── */
    const STEPS: { id: POStep; label: string }[] = [
        { id: "po-entry", label: "1. PO Entry" },
        { id: "mfg-release", label: "2. Mfg Release" },
    ];

    return (
        <>
            <ModuleHeader
                breadcrumbs={["Operate", "Quotation", "PO Receipt"]}
                title="Purchase Order Receipt"
                subtitle={`${rfq.id} · ${rfq.client} · PO Entry → Validation → Production Release`}
                titleSuffix={
                                    <StageSLAChip stage="PO" />
                }
                actions={
                    <>
                        <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/quotes" })}>← Back to Quote</Btn>
                        {step === "po-entry" && (
                            <Btn size="sm" onClick={handleProceedToRelease}>
                                Next: Release <ArrowRight className="h-3.5 w-3.5" />
                            </Btn>
                        )}
                        {step === "mfg-release" && !released && (
                            <Btn size="sm" onClick={handleRelease}>
                                <Factory className="h-3.5 w-3.5" />Release to Production
                            </Btn>
                        )}
                    </>
                }
            />
            <StageWorkflowChrome stage="PO" />

            <div className="space-y-6 p-6 lg:p-8">

                {/* ── Step Indicator ── */}
                <div className="flex items-center gap-0 rounded-xl border bg-surface p-1">
                    {STEPS.map((s, i) => {
                    const stepOrder = ["po-entry", "validation", "mfg-release"];
                    const currentIdx = stepOrder.indexOf(step);
                    const thisIdx = stepOrder.indexOf(s.id);
                    const isDone = thisIdx < currentIdx;
                    const isActive = step === s.id;
                    return (
                        <div key={s.id} className="flex items-center flex-1">
                            <button
                                onClick={() => setStep(s.id)}
                                className={`flex-1 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all ${
                                    isActive
                                        ? "bg-primary text-white shadow-sm"
                                        : isDone
                                            ? "text-success cursor-pointer hover:bg-surface-2"
                                            : "text-muted-foreground cursor-pointer hover:bg-surface-2"
                                }`}
                            >
                                {isDone ? `✓ ${s.label.split(". ")[1]}` : s.label}
                            </button>
                            {i < STEPS.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-border mx-1" />}
                        </div>
                    );
                })}
                </div>

                {/* ── KPIs ── */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <MetricCard label="Quote Value" value={`₹${(unitPrice * rfq.qty).toLocaleString()}`} hint={`${rfq.qty} units`} accent />
                    <MetricCard label="Delivery Lead" value="8–10 wk" hint="from PO date" />
                    <MetricCard
                        label="Mfg Docs"
                        value={`${MFG_PACKAGE.filter((d) => d.status === "Ready").length}/${MFG_PACKAGE.length}`}
                        hint="ready"
                    />
                </div>

                {/* ════════════════ STEP 1: PO ENTRY ════════════════ */}
                {step === "po-entry" && (
                    <div className="grid grid-cols-12 gap-6">
                        {/* PO Details form */}
                        <div className="col-span-12 lg:col-span-7">
                            <Section title="PO Details — Sales Team Entry">
                                <div className="grid grid-cols-2 gap-5 p-6">
                                    {/* PO Number */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Hash className="h-3 w-3" />PO Number <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            name="poNumber"
                                            value={poForm.poNumber}
                                            onChange={handlePoFormChange}
                                            placeholder="e.g. PO-2026-MM-0081"
                                            className="field-input"
                                        />
                                    </div>
                                    {/* PO Date */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Calendar className="h-3 w-3" />PO Date
                                        </label>
                                        <input
                                            type="date"
                                            name="poDate"
                                            value={poForm.poDate}
                                            onChange={handlePoFormChange}
                                            className="field-input"
                                        />
                                    </div>
                                    {/* PO Value */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <DollarSign className="h-3 w-3" />PO Value (₹) <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            name="poValue"
                                            value={poForm.poValue}
                                            onChange={handlePoFormChange}
                                            className="field-input"
                                        />
                                    </div>
                                    {/* Delivery Date */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Calendar className="h-3 w-3" />Delivery Date <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="deliveryDate"
                                            value={poForm.deliveryDate}
                                            onChange={handlePoFormChange}
                                            className="field-input"
                                        />
                                    </div>
                                    {/* Payment Terms */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <CreditCard className="h-3 w-3" />Payment Terms
                                        </label>
                                        <select name="paymentTerms" value={poForm.paymentTerms} onChange={handlePoFormChange} className="field-input">
                                            {PAYMENT_TERMS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    {/* Incoterms */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <DollarSign className="h-3 w-3" />Incoterms
                                        </label>
                                        <select name="incoterms" value={poForm.incoterms} onChange={handlePoFormChange} className="field-input">
                                            {INCOTERMS.map((t) => <option key={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    {/* Delivery Address */}
                                    <div className="col-span-2">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <MapPin className="h-3 w-3" />Delivery Address
                                        </label>
                                        <input name="deliveryAddress" value={poForm.deliveryAddress} onChange={handlePoFormChange} className="field-input" />
                                    </div>
                                    {/* Contact */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <User className="h-3 w-3" />Client Contact
                                        </label>
                                        <input name="contactName" value={poForm.contactName} onChange={handlePoFormChange} className="field-input" />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Mail className="h-3 w-3" />Contact Email
                                        </label>
                                        <input type="email" name="contactEmail" value={poForm.contactEmail} onChange={handlePoFormChange} className="field-input" />
                                    </div>
                                    {/* Notes */}
                                    <div className="col-span-2">
                                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                            <StickyNote className="h-3 w-3" />Special Instructions / Notes
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={poForm.notes}
                                            onChange={handlePoFormChange}
                                            rows={3}
                                            placeholder="e.g. Hard anodizing required, special packaging, sea-freight..."
                                            className="field-input resize-none"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
                                    <Btn variant="outline" onClick={() => navigate({ to: "/quotes" })}>Cancel</Btn>
                                    <Btn onClick={handleProceedToRelease}>
                                        Save & Proceed to Release <ArrowRight className="h-3.5 w-3.5" />
                                    </Btn>
                                </div>
                            </Section>
                        </div>

                        {/* RFQ Summary sidebar */}
                        <div className="col-span-12 lg:col-span-5 space-y-5">
                            <Section title="Approved Quote Summary">
                                <div className="divide-y divide-border text-[13px]">
                                    {[
                                        ["RFQ ID", rfq.id],
                                        ["Client", rfq.client],
                                        ["Quote No.", `QT-2026-${rfq.id.slice(-4)}`],
                                        ["Product", `Bore 2.5" × Stroke 180mm × Rod 1.5" Hydraulic Cylinder`],
                                        ["Quantity", `${rfq.qty} units`],
                                        ["Unit Price", `₹${unitPrice.toLocaleString()}`],
                                        ["Total Value", `₹${(unitPrice * rfq.qty).toLocaleString()}`],
                                        ["Category", rfq.category],
                                        ["Priority", rfq.priority],
                                        ["Owner", rfq.owner],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex justify-between px-5 py-2.5">
                                            <span className="text-muted-foreground">{k}</span>
                                            <span className="font-medium text-right max-w-[60%]">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </Section>
                        </div>
                    </div>
                )}



                {/* ════════════════ STEP 2: MFG RELEASE ════════════════ */}
                {step === "mfg-release" && (
                    <div className="space-y-6">
                        {/* Release banner */}
                        {released ? (
                            <div className="flex items-center gap-5 rounded-xl border-2 border-success bg-success/5 p-6">
                                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-success text-white">
                                    <Factory className="h-8 w-8" />
                                </div>
                                <div>
                                    <div className="text-[20px] font-bold text-success">Production Released</div>
                                    <div className="mt-1 text-[13px] text-muted-foreground">
                                        Work Order <span className="font-semibold text-foreground">{workOrderId}</span> created ·{" "}
                                        {rfq.qty} × Bore 2.5" Hydraulic Cylinder · {rfq.client}
                                    </div>
                                    <div className="mt-1 text-[12px] text-muted-foreground">
                                        Material requisition issued · Shop floor scheduling initiated · Quality plan activated
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-5 rounded-xl border border-warning/40 bg-warning/5 p-5">
                                <FileText className="h-8 w-8 text-warning shrink-0" />
                                <div className="flex-1">
                                    <div className="text-[14px] font-bold">Ready for Production Release</div>
                                    <div className="text-[12px] text-muted-foreground mt-0.5">
                                        PO {poForm.poNumber} validated · Review the manufacturing package below and release to the shop floor.
                                    </div>
                                </div>
                                <Btn onClick={handleRelease}>
                                    <Factory className="h-3.5 w-3.5" />Release to Production
                                </Btn>
                            </div>
                        )}

                        <div className="grid grid-cols-12 gap-6">
                            {/* RFQ + BOM summary for Manufacturing */}
                            <div className="col-span-12 lg:col-span-7 space-y-5">
                                <Section title="Manufacturing — RFQ Specification">
                                    <div className="divide-y divide-border text-[13px]">
                                        {[
                                            ["Work Order", workOrderId],
                                            ["RFQ", rfq.id],
                                            ["PO Number", poForm.poNumber],
                                            ["Client", rfq.client],
                                            ["Product", `Bore 2.5" × Stroke 180mm × Rod 1.5" Assy`],
                                            ["Qty to Produce", `${rfq.qty} units`],
                                            ["Delivery Deadline", poForm.deliveryDate || "TBD"],
                                            ["Payment Terms", poForm.paymentTerms],
                                            ["Delivery Address", poForm.deliveryAddress],
                                            ["Special Notes", poForm.notes || "None"],
                                        ].map(([k, v]) => (
                                            <div key={k} className="flex justify-between px-5 py-2.5">
                                                <span className="text-muted-foreground">{k}</span>
                                                <span className="font-medium text-right max-w-[60%]">{v}</span>
                                            </div>
                                        ))}
                                    </div>
                                </Section>

                                {/* BOM summary table */}
                                <Section title="Bill of Materials — Production Reference">
                                    <div className="overflow-x-auto">
                                        <table className="ent-table">
                                            <thead>
                                                <tr>
                                                    <th>Part</th>
                                                    <th>Material</th>
                                                    <th className="text-right">OD (mm)</th>
                                                    <th className="text-right">Length (mm)</th>
                                                    <th className="text-right">Qty</th>
                                                    <th className="text-right">Weight (kg)</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {PARTS_EXTRACTION.slice(0, 6).map((p, i) => (
                                                    <tr key={i}>
                                                        <td className="font-medium">{p.part}</td>
                                                        <td className="text-muted-foreground">{p.matId}</td>
                                                        <td className="text-right tabular-nums">{p.od ?? "—"}</td>
                                                        <td className="text-right tabular-nums">{p.len ?? "—"}</td>
                                                        <td className="text-right tabular-nums font-semibold">{p.qty}</td>
                                                        <td className="text-right tabular-nums">{(p.weight * p.qty).toFixed(2)}</td>
                                                        <td>
                                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                                Approved
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="flex justify-end border-t border-border px-5 py-3">
                                        <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/bom" })}>
                                            <FileText className="h-3.5 w-3.5" />View Full BOM
                                        </Btn>
                                    </div>
                                </Section>
                            </div>

                            {/* Manufacturing package docs */}
                            <div className="col-span-12 lg:col-span-5 space-y-5">
                                <Section
                                    title="Manufacturing Document Package"
                                    action={
                                        <Btn variant="outline" size="sm">
                                            <Download className="h-3.5 w-3.5" />Download All
                                        </Btn>
                                    }
                                >
                                    <div className="divide-y divide-border">
                                        {MFG_PACKAGE.map((doc, i) => (
                                            <div key={i} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                                                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${doc.status === "Ready"
                                                    ? "bg-success/10 text-success"
                                                    : "bg-warning/10 text-warning"}`}>
                                                    {doc.icon === "drawing" ? <FileText className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[12px] font-semibold truncate">{doc.title}</div>
                                                    <div className="text-[10px] text-muted-foreground">{doc.type}</div>
                                                </div>
                                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${doc.status === "Ready"
                                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                    : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>
                                                    {doc.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </Section>

                                <Section title="Proposal Drawings">
                                    <div className="divide-y divide-border">
                                        {[
                                            { name: "GA Drawing Rev B", ref: "DRW-481-001", pages: 2 },
                                            { name: "Cylinder Assembly", ref: "DRW-481-002", pages: 4 },
                                            { name: "Part Detail Sheets", ref: "DRW-481-003", pages: 7 },
                                        ].map((d, i) => (
                                            <div key={i} className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors">
                                                <FileText className="h-4 w-4 shrink-0 text-accent" />
                                                <div className="flex-1">
                                                    <div className="text-[12px] font-semibold">{d.name}</div>
                                                    <div className="text-[10px] text-muted-foreground">{d.ref} · {d.pages} pages</div>
                                                </div>
                                                <Btn variant="ghost" size="sm">
                                                    <Download className="h-3.5 w-3.5" />
                                                </Btn>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end border-t border-border px-5 py-3">
                                        <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/drawings" })}>
                                            View All Drawings
                                        </Btn>
                                    </div>
                                </Section>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
