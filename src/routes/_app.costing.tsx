import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AlertCircle, Cpu, Flame, Paintbrush, TestTube, BoxIcon, Building2, PiggyBank, ChevronRight, Send, Download, History, Save } from "lucide-react";
import { masterData, rfqStore, getBOMForRFQ, getOpsForRFQ } from "@/data/masters";
import type { RFQRecord, BOMItem } from "@/data/masters";
import { ModuleHeader, Section, MetricCard } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip, StageCompletionGuard } from "@/components/workflow";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkflow } from "@/context/WorkflowContext";

export const Route = createFileRoute("/_app/costing")({
    head: () => ({ meta: [{ title: "Commercial Cost Rollup - SeaHydrosys" }] }),
    component: CostingPage,
});

/* ─── Slider Cost Row ─── */
function SliderCostRow({
    label,
    pct,
    onPctChange,
    calculatedValue,
    hint,
    icon: Icon,
    max = 30
}: {
    label: string;
    pct: number;
    onPctChange: (val: number) => void;
    calculatedValue: number;
    hint?: string;
    icon?: React.ComponentType<{ className?: string }>;
    max?: number;
}) {
    return (
        <div className="rounded-lg border bg-card p-4 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <div>
                        <div className="text-[13px] font-medium">{label}</div>
                        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[18px] font-bold tabular-nums">${calculatedValue.toFixed(2)}</div>
                    <div className="text-[11px] text-muted-foreground">{pct.toFixed(1)}%</div>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <span className="text-[10px] text-muted-foreground w-6">0%</span>
                <Slider
                    value={[pct]}
                    onValueChange={([val]) => onPctChange(val)}
                    max={max}
                    step={0.5}
                    className="flex-1"
                />
                <span className="text-[10px] text-muted-foreground w-8">{max}%</span>
            </div>
        </div>
    );
}

/* ─── Send to Procurement Dialog ─── */
function SendToProcurementDialog({
    open,
    onOpenChange,
    rfq,
    bom,
    costCalc,
    masterData: md
}: {
    open: boolean;
    onOpenChange: (val: boolean) => void;
    rfq: RFQRecord;
    bom: (BOMItem & { totalPartCost?: number })[];
    costCalc: { unitPrice?: number; rmCost?: number; machiningCost?: number; totalPrice?: number; level1Total?: number; level2Total?: number; level3Total?: number; overheadCost?: number; marginCost?: number;[key: string]: unknown };
    masterData: typeof masterData;
}) {
    // State for editable fields: { [bomItemId]: { field: value } }
    const [editValues, setEditValues] = useState<Record<string, Record<string, number | string>>>({});

    const handleSend = () => {
        // Prepare procurement data
        const procurementData = {
            rfqId: rfq.id,
            subject: rfq.subject,
            qty: rfq.qty,
            unitPrice: costCalc.unitPrice ?? 0,
            totalPrice: costCalc.totalPrice,
            materials: bom.map(item => ({
                part: item.part,
                materialId: item.materialId,
                weight: item.weight,
                rawMaterialCost: item.rawMaterialCost,
                isStandard: item.isStandard,
            })),
            costBreakdown: {
                partCost: costCalc.level1Total ?? 0,
                machineCost: costCalc.level2Total ?? 0,
                auxiliaryCost: costCalc.level3Total ?? 0,
                overheads: costCalc.overheadCost,
                margin: costCalc.marginCost,
            },
            editedProcurementData: editValues,
            timestamp: new Date().toISOString(),
        };

        // Log the data (in real app, send to API)
        console.log("Sending to Procurement:", procurementData);
        onOpenChange(false);
    };

    const partsNeedingProcurement = bom.filter(b => {
        const part = b.partId ? md.parts.getById(b.partId) : undefined;
        const rawMaterial = b.rawMaterialId ? md.rawMaterials.getById(b.rawMaterialId) : undefined;
        const leadTime = part?.leadDays ?? rawMaterial?.leadDays ?? 0;
        return b.isStandard && leadTime > 0; // Only show items with lead time > 0
    });

    const handleFieldChange = (bomItemId: string, field: string, value: number | string) => {
        setEditValues(prev => ({
            ...prev,
            [bomItemId]: {
                ...(prev[bomItemId] || {}),
                [field]: value
            }
        }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Send Quote to Procurement</DialogTitle>
                    <DialogDescription>
                        Review and send quote details to the procurement team
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Quote Info */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Quote Information</h3>
                        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/40 rounded-lg">
                            <div>
                                <div className="text-[11px] text-muted-foreground">RFQ ID</div>
                                <div className="text-[14px] font-medium">{rfq.id}</div>
                            </div>
                            <div>
                                <div className="text-[11px] text-muted-foreground">Subject</div>
                                <div className="text-[14px] font-medium">{rfq.subject}</div>
                            </div>
                            <div>
                                <div className="text-[11px] text-muted-foreground">Quantity</div>
                                <div className="text-[14px] font-medium">{rfq.qty} units</div>
                            </div>
                            <div>
                                <div className="text-[11px] text-muted-foreground">Date</div>
                                <div className="text-[14px] font-medium">{new Date().toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Cost Breakdown */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Cost Breakdown</h3>
                        <div className="p-3 bg-muted/40 rounded-lg space-y-2 text-[13px]">
                            <div className="flex justify-between">
                                <span>Part Cost</span>
                                <span className="font-medium">${(costCalc.level1Total ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Machine Cost</span>
                                <span className="font-medium">${(costCalc.level2Total ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Auxiliary Cost</span>
                                <span className="font-medium">${(costCalc.level3Total ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Overheads</span>
                                <span className="font-medium">${(costCalc.overheadCost ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="border-t border-border pt-2 flex justify-between font-semibold">
                                <span>Unit Price</span>
                                <span>${(costCalc.unitPrice ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span>Order Total</span>
                                <span>${(costCalc.totalPrice ?? 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Parts Needing Procurement */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Parts to Procure ({partsNeedingProcurement.length})</h3>
                        {partsNeedingProcurement.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                                <div>
                                    <table className="w-full text-[12px]">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="py-2 px-3 text-left font-medium">BOM Part</th>
                                                <th className="py-2 px-3 text-left font-medium">Material</th>
                                                <th className="py-2 px-3 text-left font-medium">Spec</th>
                                                <th className="py-2 px-3 text-center font-medium">Qty</th>
                                                <th className="py-2 px-3 text-center font-medium">Lead Time</th>
                                                <th className="py-2 px-3 text-center font-medium">Price Estimation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {partsNeedingProcurement.map((item) => {
                                                const material = md.materials.getById(item.materialId);
                                                const materialName = material?.code || material?.description || "N/A";
                                                const rawMaterial = item.rawMaterialId ? md.rawMaterials.getById(item.rawMaterialId) : undefined;
                                                const part = item.partId ? md.parts.getById(item.partId) : undefined;

                                                // Build spec string from dimensions and raw material spec
                                                let spec = "";
                                                if (item.od) spec += `OD: ${item.od}mm`;
                                                if (item.id_dim) spec += (spec ? ", " : "") + `ID: ${item.id_dim}mm`;
                                                if (item.thickness) spec += (spec ? ", " : "") + `Th: ${item.thickness}mm`;
                                                if (item.length) spec += (spec ? ", " : "") + `L: ${item.length}mm`;
                                                if (rawMaterial?.spec) spec += (spec ? " - " : "") + rawMaterial.spec;

                                                // For standard parts without dimensions, build spec from part info
                                                if (!spec && part) {
                                                    spec = `${part.type} - ${part.material}`;
                                                    if (part.sku) spec += ` (${part.sku})`;
                                                }

                                                const leadTime = part?.leadDays ?? rawMaterial?.leadDays ?? 0;

                                                // Get editable values or use defaults
                                                const editedQty = editValues[item.id]?.qty ?? item.qty;
                                                const editedLeadTime = editValues[item.id]?.leadTime ?? leadTime;
                                                const editedBudgetPrice = editValues[item.id]?.budgetPrice ?? (item.totalPartCost ?? 0);

                                                return (
                                                    <tr key={item.id} className="border-b hover:bg-muted/20">
                                                        <td className="py-2 px-3">{item.part}</td>
                                                        <td className="py-2 px-3">{materialName}</td>
                                                        <td className="py-2 px-3 text-muted-foreground text-[11px]">{spec || "Standard Item"}</td>
                                                        <td className="py-2 px-3">
                                                            <Input
                                                                type="number"
                                                                value={editedQty}
                                                                onChange={(e) => handleFieldChange(item.id, "qty", parseInt(e.target.value) || 0)}
                                                                className="h-7 text-center text-[11px] w-16"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <Input
                                                                type="number"
                                                                value={editedLeadTime}
                                                                onChange={(e) => handleFieldChange(item.id, "leadTime", parseInt(e.target.value) || 0)}
                                                                className="h-7 text-center text-[11px] w-16"
                                                                placeholder="days"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-3">
                                                            <Input
                                                                type="number"
                                                                value={Number(editedBudgetPrice).toFixed(2)}
                                                                onChange={(e) => handleFieldChange(item.id, "budgetPrice", parseFloat(e.target.value) || 0)}
                                                                className="h-7 text-right text-[11px] w-24 tabular-nums"
                                                                placeholder="$"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 bg-muted/30 rounded-lg text-[13px] text-muted-foreground">
                                All parts are available in stock. No procurement needed.
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        <Send className="h-4 w-4" />
                        Send to Internal Review
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// Conversion rate: INR to USD (operation costs are stored in INR)
const INR_TO_USD = 84;

function CostingPage() {
    const { activeRfqId } = useWorkflow();
    const selectedRfqId = activeRfqId;
    const rfq = rfqStore.getById(selectedRfqId);
    const bom = getBOMForRFQ(selectedRfqId);
    const allOps = getOpsForRFQ(selectedRfqId);

    // Per-part cushion percentages (keyed by part id)
    const [partCushions, setPartCushions] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        bom.filter(b => !b.isStandard).forEach(b => { initial[b.id] = 5; });
        return initial;
    });
    const updatePartCushion = (partId: string, pct: number) => {
        setPartCushions(prev => ({ ...prev, [partId]: pct }));
    };

    // Track expanded rows
    const [expandedParts, setExpandedParts] = useState<Set<string>>(new Set());
    const toggleExpanded = (partId: string) => {
        setExpandedParts(prev => {
            const next = new Set(prev);
            if (next.has(partId)) {
                next.delete(partId);
            } else {
                next.add(partId);
            }
            return next;
        });
    };

    // Editable percentages for cost add-ons
    const [weldingPct, setWeldingPct] = useState(3);
    const [paintingPct, setPaintingPct] = useState(4);
    const [testingPct, setTestingPct] = useState(2);
    const [packagingPct, setPackagingPct] = useState(1.5);
    const [overheadPct, setOverheadPct] = useState(12);
    const [marginPct, setMarginPct] = useState(18);

    // Send to Procurement dialog
    const [sendToProcurementOpen, setSendToProcurementOpen] = useState(false);

    // ── Version tracking ──────────────────────────────────────────────────
    type CostingVersion = {
        version: number;
        label: string;
        timestamp: string;
        changedBy: string;
        // Table 1 — Part & Machine Cost (per-part cushions snapshot)
        partCushionsSnapshot: Record<string, number>;
        rawMaterialTotal: number;
        boughtOutTotal: number;
        cushionAmount: number;
        // Table 2 — Final Quote
        costBeforeMargin: number;
        marginCost: number;
        unitPrice: number;
        totalPrice: number;
        // Table 3 — Cost Composition
        level1Total: number;
        level2Total: number;
        level3Total: number;
        overheadCost: number;
        // Table 4 — Adjust Percentages (Auxiliary + OH + Margin)
        weldingPct: number; weldingCost: number;
        paintingPct: number; paintingCost: number;
        testingPct: number; testingCost: number;
        packagingPct: number; packagingCost: number;
        overheadPct: number;
        marginPct: number;
        subtotalBase: number;
    };
    const [versions, setVersions] = useState<CostingVersion[]>([]);
    const [currentVersion, setCurrentVersion] = useState(1);
    const [expandedVersion, setExpandedVersion] = useState<number | null>(null);
    const [expandedVersionTab, setExpandedVersionTab] = useState<Record<number, number>>({});
    // Load selected version into current working state when dropdown changes
    const handleVersionSelect = (versionNumberStr: string) => {
        if (versionNumberStr === "current") {
            // Reset to default/initial state if needed
            return;
        }
        const versionNumber = parseInt(versionNumberStr);
        const selectedVersion = versions.find(v => v.version === versionNumber);
        if (!selectedVersion) return;
        
        // Load all data from selected version into current editable state
        setPartCushions(selectedVersion.partCushionsSnapshot);
        setWeldingPct(selectedVersion.weldingPct);
        setPaintingPct(selectedVersion.paintingPct);
        setTestingPct(selectedVersion.testingPct);
        setPackagingPct(selectedVersion.packagingPct);
        setOverheadPct(selectedVersion.overheadPct);
        setMarginPct(selectedVersion.marginPct);
    };

    function saveVersion() {
        const v: CostingVersion = {
            version: currentVersion,
            label: `v${currentVersion}`,
            timestamp: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
            changedBy: "Costing",
            // T1 — Part & Machine
            partCushionsSnapshot: { ...partCushions },
            rawMaterialTotal: costCalc.rawMaterialTotal,
            boughtOutTotal: costCalc.boughtOutTotal,
            cushionAmount: costCalc.cushionAmount,
            // T2 — Final Quote
            costBeforeMargin: costCalc.costBeforeMargin,
            marginCost: costCalc.marginCost,
            unitPrice: costCalc.unitPrice,
            totalPrice: costCalc.totalPrice,
            // T3 — Cost Composition
            level1Total: costCalc.level1Total ?? 0,
            level2Total: costCalc.level2Total ?? 0,
            level3Total: costCalc.level3Total ?? 0,
            overheadCost: costCalc.overheadCost,
            // T4 — Percentages
            weldingPct, weldingCost: costCalc.weldingCost,
            paintingPct, paintingCost: costCalc.paintingCost,
            testingPct, testingCost: costCalc.testingCost,
            packagingPct, packagingCost: costCalc.packagingCost,
            overheadPct, marginPct,
            subtotalBase: costCalc.subtotalBase,
        };
        setVersions(prev => [v, ...prev]);
        setCurrentVersion(n => n + 1);
    }

    // ── Export CSV ────────────────────────────────────────────────────────
    function exportCSV() {
        const rows: string[][] = [];
        rows.push(["RFQ Engine — Costing Export"]);
        rows.push([`RFQ`, rfq?.id ?? "", `Subject`, rfq?.subject ?? "", `Qty`, String(rfq?.qty ?? "")]);
        rows.push([`Exported`, new Date().toLocaleString()]);
        rows.push([]);
        rows.push(["── BOM PARTS ──"]);
        rows.push(["Part", "Material", "Weight (kg)", "RM Cost ($)", "Cushion %", "Cushion ($)", "Machine Cost ($)", "Total ($)"]);
        bom.filter(b => !b.isStandard).forEach(b => {
            const material = masterData.materials.getById(b.materialId);
            const cushionPct = partCushions[b.id] ?? 5;
            const cushionAmt = b.rawMaterialCost * (cushionPct / 100);
            const partOps = allOps.filter(op => op.part === b.part || op.bomItemId === b.id);
            const machineCost = partOps.reduce((s, op) => s + op.totalCost, 0) / INR_TO_USD;
            rows.push([b.part, material?.code ?? "-", b.weight.toFixed(2), b.rawMaterialCost.toFixed(2), cushionPct.toFixed(1), cushionAmt.toFixed(2), machineCost.toFixed(2), (b.rawMaterialCost + cushionAmt + machineCost).toFixed(2)]);
        });
        bom.filter(b => b.isStandard).forEach(b => {
            rows.push([b.part, "Standard", "-", b.totalPartCost.toFixed(2), "-", "-", "-", b.totalPartCost.toFixed(2)]);
        });
        rows.push([]);
        rows.push(["── COST SUMMARY ──"]);
        rows.push(["Level", "Description", "Amount ($)"]);
        rows.push(["L1", "Part Cost (RM + Cushion + Bought-out)", (costCalc.level1Total ?? 0).toFixed(2)]);
        rows.push(["L2", "Machine Cost", (costCalc.level2Total ?? 0).toFixed(2)]);
        rows.push(["L3", `Auxiliary (Weld ${weldingPct}% / Paint ${paintingPct}% / Test ${testingPct}% / Pack ${packagingPct}%)`, costCalc.level3Total.toFixed(2)]);
        rows.push(["", `Overheads (${overheadPct}%)`, costCalc.overheadCost.toFixed(2)]);
        rows.push(["", `Margin (${marginPct}%)`, costCalc.marginCost.toFixed(2)]);
        rows.push(["UNIT PRICE", "", costCalc.unitPrice.toFixed(2)]);
        rows.push([`ORDER TOTAL (${rfq?.qty} units)`, "", costCalc.totalPrice.toFixed(2)]);
        rows.push([]);
        if (versions.length > 0) {
            rows.push(["── VERSION HISTORY ──"]);
            rows.push(["Version", "Saved", "By", "Unit Price", "Total", "Weld%", "Paint%", "Test%", "Pack%", "OH%", "Margin%"]);
            versions.forEach(v => rows.push([v.label, v.timestamp, v.changedBy, v.unitPrice.toFixed(2), v.totalPrice.toFixed(2), v.weldingPct.toString(), v.paintingPct.toString(), v.testingPct.toString(), v.packagingPct.toString(), v.overheadPct.toString(), v.marginPct.toString()]));
        }
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `costing-${rfq?.id ?? "export"}-${Date.now()}.csv`;
        a.click(); URL.revokeObjectURL(url);
    }

    // Calculate costs
    const costCalc = useMemo(() => {
        // Base costs from BOM
        const rawMaterialTotal = bom.filter(b => !b.isStandard).reduce((sum, b) => sum + b.rawMaterialCost, 0);
        const machiningTotal = bom.reduce((sum, b) => sum + b.machineCost, 0);
        const boughtOutTotal = bom.filter(b => b.isStandard).reduce((sum, b) => sum + b.totalPartCost, 0);

        // Cushion on raw materials (using per-part cushion percentages)
        const cushionAmount = bom.filter(b => !b.isStandard).reduce((sum, b) => {
            const pct = partCushions[b.id] ?? 5;
            return sum + (b.rawMaterialCost * (pct / 100));
        }, 0);
        const rmWithCushion = rawMaterialTotal + cushionAmount;

        // Level 1 Total (Part Cost)
        const level1Total = rmWithCushion + boughtOutTotal;

        // Level 2 Total (Machine Cost)
        const level2Total = machiningTotal;

        // Subtotal before add-ons
        const subtotalBase = level1Total + level2Total;

        // Level 3: Auxiliary costs (as % of subtotal)
        const weldingCost = subtotalBase * (weldingPct / 100);
        const paintingCost = subtotalBase * (paintingPct / 100);
        const testingCost = subtotalBase * (testingPct / 100);
        const packagingCost = subtotalBase * (packagingPct / 100);
        const level3Total = weldingCost + paintingCost + testingCost + packagingCost;

        // Subtotal with add-ons
        const subtotalWithAddons = subtotalBase + level3Total;

        // Overhead and margin
        const overheadCost = subtotalWithAddons * (overheadPct / 100);
        const costBeforeMargin = subtotalWithAddons + overheadCost;
        const marginCost = costBeforeMargin * (marginPct / 100);

        // Final prices
        const unitPrice = costBeforeMargin + marginCost;
        const totalPrice = unitPrice * (rfq?.qty || 1);

        return {
            rawMaterialTotal,
            cushionAmount,
            rmWithCushion,
            machiningTotal,
            boughtOutTotal,
            level1Total,
            level2Total,
            level3Total,
            subtotalBase,
            weldingCost,
            paintingCost,
            testingCost,
            packagingCost,
            subtotalWithAddons,
            overheadCost,
            costBeforeMargin,
            marginCost,
            unitPrice,
            totalPrice,
        };
    }, [bom, rfq?.qty, partCushions, weldingPct, paintingPct, testingPct, packagingPct, overheadPct, marginPct]);

    if (!rfq) {
        return (
            <div className="p-6">
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-destructive">
                    <AlertCircle className="inline h-4 w-4 mr-2" />
                    No RFQ data available.
                </div>
            </div>
        );
    }

    // Calculate auxiliary costs total
    const auxiliaryCostsTotal = costCalc.weldingCost + costCalc.paintingCost + costCalc.testingCost + costCalc.packagingCost;



    return (
        <>
            <ModuleHeader
                breadcrumbs={["Operate", "Costing"]}
                title="Commercial Cost Rollup"
                subtitle={`${rfq.id} • ${rfq.subject}`}
                titleSuffix={
                    <StageSLAChip stage="Costing" />
                }
                actions={
                    <>
                        <button
                            onClick={exportCSV}
                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] font-semibold text-foreground transition hover:bg-muted"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Export
                        </button>
                        <StageCompletionGuard stage="Costing" actor="Costing" actionLabel="Continue to Internal Review" />
                    </>
                }
            />
            <StageWorkflowChrome stage="Costing" />

            <div className="space-y-5 p-6 lg:p-8">
                {/* KPI Strip */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                    <MetricCard
                        label="Part Cost"
                        value={`$${(costCalc.level1Total ?? 0).toFixed(2)}`}
                        hint="RM + Cushion + Bought-out"
                    />
                    <MetricCard
                        label="Machine Cost"
                        value={`$${(costCalc.level2Total ?? 0).toFixed(2)}`}
                        hint={`${allOps.length} operations`}
                    />
                    <MetricCard
                        label="Auxiliary"
                        value={`$${auxiliaryCostsTotal.toFixed(2)}`}
                        hint="Weld + Paint + Test + Pack"
                    />
                    <MetricCard
                        label="Overheads"
                        value={`$${costCalc.overheadCost.toFixed(2)}`}
                        hint={`${overheadPct}%`}
                    />
                    <MetricCard
                        label="Unit Price"
                        value={`$${(costCalc.unitPrice ?? 0).toFixed(2)}`}
                        hint={`margin ${marginPct}%`}

                    />
                    <MetricCard
                        label="Order Total"
                        value={`$${costCalc.totalPrice.toFixed(2)}`}
                        hint={`${rfq.qty} units`}

                    />
                </div>
                

                {/* ── All four costing sections wrapped in one card ─────── */}
                <div className="rounded-xl border border-border bg-card shadow-sm">
                    {/* Section label */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <span className="text-[12px] font-bold uppercase tracking-wider text-muted-foreground">Costing Breakdown</span>
                            {versions.length > 0 && (
                                <Select defaultValue="current" onValueChange={handleVersionSelect}>
                                    <SelectTrigger className="w-[180px] h-8 text-[11px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="current">
                                            <span>v{currentVersion}</span>
                                        </SelectItem>
                                        {versions.map((v) => (
                                            <SelectItem key={v.version} value={v.version.toString()}>
                                                <span>{v.label}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <span className="text-[11px] text-muted-foreground">Adjust values across all sections, then save a version snapshot below.</span>
                    </div>

                    <div className="p-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                    {/* Left: Combined Cost Breakdown (2/3 width) */}
                    <div className="xl:col-span-2 space-y-5">
                        {/* Combined Part & Machine Cost Table */}
                        <Section
                            title={`Part & Machine Cost Breakdown`}
                            action={
                                <span className="text-[15px] font-bold tabular-nums text-foreground">
                                    ${((costCalc.level1Total ?? 0) + (costCalc.level2Total ?? 0)).toFixed(2)}
                                </span>
                            }
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Part</th>
                                            <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Material</th>
                                            <th className="py-2.5 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Weight (kg)</th>
                                            <th className="py-2.5 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">RM Cost</th>
                                            <th className="py-2.5 px-3 text-center text-[11px] font-semibold uppercase tracking-wider text-amber-600">Cushion %</th>
                                            <th className="py-2.5 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-amber-600">Cushion</th>
                                            <th className="py-2.5 px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Operations</th>
                                            <th className="py-2.5 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-emerald-600">Machine Cost</th>
                                            <th className="py-2.5 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bom.filter(b => !b.isStandard).map((item) => {
                                            const material = masterData.materials.getById(item.materialId);
                                            const cushionPctVal = partCushions[item.id] ?? 5;
                                            const cushionAmt = item.rawMaterialCost * (cushionPctVal / 100);
                                            const partOps = allOps.filter(op => op.part === item.part || op.bomItemId === item.id);
                                            const machineCostINR = partOps.reduce((sum, op) => sum + op.totalCost, 0);
                                            const machineCost = machineCostINR / INR_TO_USD; // Convert INR to USD
                                            const partTotal = item.rawMaterialCost + cushionAmt + machineCost;
                                            const isExpanded = expandedParts.has(item.id);
                                            const hasOps = partOps.length > 0;
                                            return (
                                                <>
                                                    <tr
                                                        key={item.id}
                                                        className={`border-b border-border/50 hover:bg-muted/20 ${hasOps ? 'cursor-pointer' : ''} ${isExpanded ? 'bg-muted/30' : ''}`}
                                                        onClick={() => hasOps && toggleExpanded(item.id)}
                                                    >
                                                        <td className="py-3 px-3 text-[13px] font-medium align-middle">
                                                            <span className="leading-tight">{item.part}</span>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-[12px] text-muted-foreground">{material?.code || "-"}</td>
                                                        <td className="py-2.5 px-3 tabular-nums text-[12px] text-right">{item.weight.toFixed(2)}</td>
                                                        <td className="py-2.5 px-3 tabular-nums text-[12px] text-right">${item.rawMaterialCost.toFixed(2)}</td>
                                                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={50}
                                                                step={0.5}
                                                                value={cushionPctVal}
                                                                onChange={(e) => updatePartCushion(item.id, parseFloat(e.target.value) || 0)}
                                                                className="w-12 h-6 px-1.5 text-[12px] text-center tabular-nums bg-muted/40 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                            />
                                                        </td>
                                                        <td className="py-2.5 px-3 tabular-nums text-[12px] text-right text-amber-600 dark:text-amber-400">+${cushionAmt.toFixed(2)}</td>
                                                        <td className="py-2.5 px-3 text-[11px] text-muted-foreground">
                                                            {hasOps ? (
                                                                <span className="text-primary">{partOps.length} ops</span>
                                                            ) : "-"}
                                                        </td>
                                                        <td className="py-2.5 px-3 tabular-nums text-[12px] text-right text-emerald-600 dark:text-emerald-400">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <ChevronRight className={`h-4 w-4 ${hasOps ? 'text-muted-foreground' : 'invisible'} transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                {machineCost > 0 ? `$${machineCost.toFixed(2)}` : "-"}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 tabular-nums text-[13px] text-right font-semibold">${partTotal.toFixed(2)}</td>
                                                    </tr>
                                                    {isExpanded && partOps.map((op) => {
                                                        const machine = masterData.machines.getById(op.machineId);
                                                        return (
                                                            <tr key={op.id} className="bg-muted/10 border-b border-border/30">
                                                                <td className="py-2 px-3 pl-10 text-[11px] text-muted-foreground" colSpan={2}>
                                                                    <div className="flex items-center gap-2">
                                                                        <Cpu className="h-3 w-3 text-emerald-500" />
                                                                        <span className="font-medium text-foreground">{op.operation}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 px-3 text-[11px] text-muted-foreground" colSpan={2}>
                                                                    <div>
                                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">{machine?.name || op.machineId}</span>
                                                                        {machine && (
                                                                            <span className="text-[10px] text-muted-foreground ml-2">
                                                                                ({machine.type})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 px-3 text-[10px] text-muted-foreground text-center" colSpan={2}>
                                                                    <div className="space-y-0.5">
                                                                        <div>Cycle: {op.cycleTimeMin} min</div>
                                                                        <div>Setup: {op.setupTimeMin} min</div>
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 px-3 text-[10px] text-muted-foreground">
                                                                    Rate: ${(op.ratePerMin / INR_TO_USD).toFixed(2)}/min
                                                                </td>
                                                                <td className="py-2 px-3 tabular-nums text-[11px] text-right text-emerald-600 dark:text-emerald-400">
                                                                    ${(op.totalCost / INR_TO_USD).toFixed(2)}
                                                                </td>
                                                                <td className="py-2 px-3"></td>
                                                            </tr>
                                                        );
                                                    })}
                                                </>
                                            );
                                        })}
                                        {/* Bought-out parts */}
                                        {bom.filter(b => b.isStandard).map((item) => (
                                            <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20 bg-purple-50/30 dark:bg-purple-950/10">
                                                <td className="py-2.5 px-3 text-[13px] font-medium">
                                                    {item.part}

                                                </td>
                                                <td className="py-2.5 px-3 text-[12px] text-muted-foreground">Standard</td>
                                                <td className="py-2.5 px-3 tabular-nums text-[12px] text-right text-muted-foreground">-</td>
                                                <td className="py-2.5 px-3 tabular-nums text-[12px] text-right">${item.totalPartCost.toFixed(2)}</td>
                                                <td className="py-2.5 px-3 text-center text-muted-foreground">-</td>
                                                <td className="py-2.5 px-3 text-center text-muted-foreground">-</td>
                                                <td className="py-2.5 px-3 text-muted-foreground">-</td>
                                                <td className="py-2.5 px-3 text-muted-foreground text-right">-</td>
                                                <td className="py-2.5 px-3 tabular-nums text-[13px] text-right font-semibold">${item.totalPartCost.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/50">
                                            <td colSpan={3} className="py-2.5 px-3 text-right text-[12px] font-bold">Totals</td>
                                            <td className="py-2.5 px-3 tabular-nums text-[12px] text-right">${(costCalc.rawMaterialTotal + costCalc.boughtOutTotal).toFixed(2)}</td>
                                            <td className="py-2.5 px-3 tabular-nums text-[11px] text-center text-muted-foreground">avg {(Object.values(partCushions).reduce((a, b) => a + b, 0) / Object.keys(partCushions).length).toFixed(1)}%</td>
                                            <td className="py-2.5 px-3 tabular-nums text-[12px] text-right text-amber-600">+${costCalc.cushionAmount.toFixed(2)}</td>
                                            <td className="py-2.5 px-3 text-[11px] text-muted-foreground">{allOps.length} ops</td>
                                            <td className="py-2.5 px-3 tabular-nums text-[12px] text-right text-emerald-600">${(costCalc.level2Total ?? 0).toFixed(2)}</td>
                                            <td className="py-2.5 px-3 tabular-nums text-[14px] text-right font-bold">${((costCalc.level1Total ?? 0) + (costCalc.level2Total ?? 0)).toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </Section>

                        {/* Final Quote & Cost Composition - Side by Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Final Price Card */}
                            <div className="rounded-xl border-2 border-primary bg-primary/5 p-5">
                                <div className="text-[11px] font-semibold tracking-wider text-primary/70 uppercase mb-3">
                                    Final Quote
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[13px] text-muted-foreground">Cost before Margin</span>
                                        <span className="text-[16px] font-semibold tabular-nums">
                                            ${costCalc.costBeforeMargin.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-[13px] text-muted-foreground">+ Margin ({marginPct}%)</span>
                                        <span className="text-[16px] font-semibold tabular-nums text-emerald-600">
                                            +${costCalc.marginCost.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="border-t border-primary/30 pt-3">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-[14px] font-medium">Unit Price</span>
                                            <span className="text-[28px] font-bold tabular-nums text-primary">
                                                ${(costCalc.unitPrice ?? 0).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-baseline pt-2 border-t border-primary/20">
                                        <span className="text-[13px] text-muted-foreground">
                                            Total ({rfq.qty} units)
                                        </span>
                                        <span className="text-[22px] font-bold tabular-nums text-foreground">
                                            ${costCalc.totalPrice.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Cost Breakdown Visual */}
                            <div className="rounded-xl border bg-card p-5">
                                <div className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase mb-4">
                                    Cost Composition
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { label: "Part Cost", value: costCalc.level1Total ?? 0, color: "bg-blue-500" },
                                        { label: "Machine Cost", value: costCalc.level2Total ?? 0, color: "bg-emerald-500" },
                                        { label: "Auxiliary", value: costCalc.level3Total ?? 0, color: "bg-amber-500" },
                                        { label: "Overheads", value: costCalc.overheadCost ?? 0, color: "bg-slate-500" },
                                        { label: "Margin", value: costCalc.marginCost ?? 0, color: "bg-primary" },
                                    ].map((item) => {
                                        const pct = (item.value / (costCalc.unitPrice ?? 1)) * 100;
                                        return (
                                            <div key={item.label}>
                                                <div className="flex items-center justify-between text-[11px] mb-1">
                                                    <span>{item.label}</span>
                                                    <span className="tabular-nums font-medium">${item.value.toFixed(2)} ({pct.toFixed(1)}%)</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${item.color} transition-all`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Adjustable Price Sliders (1/3 width) */}
                    <div className="space-y-4">
                        <Section title="Adjust Percentages">
                            <div className="p-4 space-y-3">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Auxiliary Costs</div>

                                <SliderCostRow
                                    label="Welding"
                                    hint="Weld prep, MIG/TIG"
                                    pct={weldingPct}
                                    onPctChange={setWeldingPct}
                                    calculatedValue={costCalc.weldingCost}
                                    icon={Flame}
                                    max={15}
                                />
                                <SliderCostRow
                                    label="Painting"
                                    hint="Surface prep, finish"
                                    pct={paintingPct}
                                    onPctChange={setPaintingPct}
                                    calculatedValue={costCalc.paintingCost}
                                    icon={Paintbrush}
                                    max={15}
                                />
                                <SliderCostRow
                                    label="Testing"
                                    hint="Pressure, inspection"
                                    pct={testingPct}
                                    onPctChange={setTestingPct}
                                    calculatedValue={costCalc.testingCost}
                                    icon={TestTube}
                                    max={10}
                                />
                                <SliderCostRow
                                    label="Packaging"
                                    hint="Crating, wrap"
                                    pct={packagingPct}
                                    onPctChange={setPackagingPct}
                                    calculatedValue={costCalc.packagingCost}
                                    icon={BoxIcon}
                                    max={10}
                                />

                                <div className="border-t border-border my-4" />
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overheads & Margin</div>

                                <SliderCostRow
                                    label="Overheads"
                                    hint="Factory, admin, utilities"
                                    pct={overheadPct}
                                    onPctChange={setOverheadPct}
                                    calculatedValue={costCalc.overheadCost}
                                    icon={Building2}
                                    max={25}
                                />
                                <SliderCostRow
                                    label="Margin"
                                    hint="Profit margin"
                                    pct={marginPct}
                                    onPctChange={setMarginPct}
                                    calculatedValue={costCalc.marginCost}
                                    icon={PiggyBank}
                                    max={35}
                                />
                            </div>
                        </Section>


                    </div>{/* end right slider column */}
                    </div>{/* end inner p-5 grid */}

                    {/* ── full-width Save Version footer ── */}
                    <div className="border-t border-border bg-muted/30 px-5 py-4 rounded-b-xl flex items-center justify-between gap-4">
                        <div className="text-[12px] text-muted-foreground">
                            Saves a complete snapshot of all four sections — Part &amp; Machine Cost, Final Quote, Cost Composition, and Percentages.
                        </div>
                        <button
                            onClick={saveVersion}
                            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow transition hover:bg-primary/90 active:scale-95"
                        >
                            <Save className="h-4 w-4" />
                            Save Costing Snapshot — v{currentVersion}
                        </button>
                    </div>
                </div>{/* end outer card */}

                {/* ── Version History ─────────────────────────────────── */}
                {versions.length > 0 && (
                    <Section
                        title="Version History"
                        action={
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <History className="h-3.5 w-3.5" />
                                {versions.length} saved {versions.length === 1 ? "version" : "versions"}
                            </div>
                        }
                    >
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b bg-muted/30">
                                    {["Version", "Saved at", "By", "Unit Price", "Order Total", "L1 Part", "L2 Machine", "L3 Auxiliary", "Overheads", "Margin %", ""].map(h => (
                                        <th key={h} className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {versions.map(v => {
                                    const isOpen = expandedVersion === v.version;
                                    const activeTab = expandedVersionTab[v.version] ?? 0;
                                    const setTab = (t: number) => setExpandedVersionTab(prev => ({ ...prev, [v.version]: t }));
                                    const tabs = ["T1 — Part & Machine", "T2 — Final Quote", "T3 — Cost Composition", "T4 — Percentages"];
                                    return (
                                        <>
                                            <tr
                                                key={v.version}
                                                className="border-b border-border/50 hover:bg-muted/20 cursor-pointer"
                                                onClick={() => setExpandedVersion(isOpen ? null : v.version)}
                                            >
                                                <td className="py-2.5 px-3">
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                                                        {v.label}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-muted-foreground">{v.timestamp}</td>
                                                <td className="py-2.5 px-3">{v.changedBy}</td>
                                                <td className="py-2.5 px-3 tabular-nums font-semibold">${v.unitPrice.toFixed(2)}</td>
                                                <td className="py-2.5 px-3 tabular-nums font-bold text-primary">${v.totalPrice.toFixed(2)}</td>
                                                <td className="py-2.5 px-3 tabular-nums text-muted-foreground">${v.level1Total.toFixed(2)}</td>
                                                <td className="py-2.5 px-3 tabular-nums text-muted-foreground">${v.level2Total.toFixed(2)}</td>
                                                <td className="py-2.5 px-3 tabular-nums text-muted-foreground">${v.level3Total.toFixed(2)}</td>
                                                <td className="py-2.5 px-3 tabular-nums text-muted-foreground">${v.overheadCost.toFixed(2)}</td>
                                                <td className="py-2.5 px-3 tabular-nums">{v.marginPct}%</td>
                                                <td className="py-2.5 px-3">
                                                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                                                </td>
                                            </tr>
                                            {isOpen && (
                                                <tr key={`${v.version}-detail`} className="bg-muted/10">
                                                    <td colSpan={11} className="px-4 py-4">
                                                        {/* Tab bar */}
                                                        <div className="flex gap-1 mb-4 border-b border-border pb-2">
                                                            {tabs.map((t, ti) => (
                                                                <button
                                                                    key={t}
                                                                    onClick={e => { e.stopPropagation(); setTab(ti); }}
                                                                    className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
                                                                        activeTab === ti
                                                                            ? "bg-primary text-primary-foreground"
                                                                            : "text-muted-foreground hover:bg-muted"
                                                                    }`}
                                                                >
                                                                    {t}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        {/* T1 — Part & Machine Cost */}
                                                        {activeTab === 0 && (
                                                            <div className="space-y-2">
                                                                <div className="grid grid-cols-4 gap-3">
                                                                    {[
                                                                        { label: "Raw Material Total", value: `$${v.rawMaterialTotal.toFixed(2)}` },
                                                                        { label: "Cushion Added", value: `+$${v.cushionAmount.toFixed(2)}` },
                                                                        { label: "Bought-out Parts", value: `$${v.boughtOutTotal.toFixed(2)}` },
                                                                        { label: "L1 Part Cost", value: `$${v.level1Total.toFixed(2)}`, accent: true },
                                                                    ].map((item: { label: string; value: string; accent?: boolean }) => (
                                                                        <div key={item.label} className={`rounded-lg border px-3 py-2 ${ item.accent ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'}`}>
                                                                            <div className="text-[10px] uppercase text-muted-foreground">{item.label}</div>
                                                                            <div className={`text-[15px] font-bold tabular-nums ${ item.accent ? 'text-primary' : ''}`}>{item.value}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="mt-3">
                                                                    <div className="text-[11px] font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Per-Part Cushion % at this version</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {bom.filter(b => !b.isStandard).map(b => (
                                                                            <div key={b.id} className="rounded border border-border bg-background px-2.5 py-1.5">
                                                                                <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{b.part}</div>
                                                                                <div className="text-[13px] font-semibold tabular-nums text-amber-600">{v.partCushionsSnapshot[b.id] ?? 5}%</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* T2 — Final Quote */}
                                                        {activeTab === 1 && (
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                {[
                                                                    { label: "Subtotal Base", value: `$${v.subtotalBase.toFixed(2)}` },
                                                                    { label: "Cost before Margin", value: `$${v.costBeforeMargin.toFixed(2)}` },
                                                                    { label: `Margin (${v.marginPct}%)`, value: `+$${v.marginCost.toFixed(2)}`, color: "text-emerald-600" },
                                                                    { label: "Unit Price", value: `$${v.unitPrice.toFixed(2)}`, accent: true },
                                                                    { label: `Order Total (${rfq.qty} units)`, value: `$${v.totalPrice.toFixed(2)}`, accent: true },
                                                                ].map((item: { label: string; value: string; accent?: boolean; color?: string }) => (
                                                                    <div key={item.label} className={`rounded-lg border px-3 py-2 ${ item.accent ? 'border-primary/40 bg-primary/5' : 'border-border bg-background' }`}>
                                                                        <div className="text-[10px] uppercase text-muted-foreground">{item.label}</div>
                                                                        <div className={`text-[15px] font-bold tabular-nums ${ item.color ?? (item.accent ? 'text-primary' : '')}`}>{item.value}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* T3 — Cost Composition */}
                                                        {activeTab === 2 && (
                                                            <div className="space-y-2">
                                                                {[
                                                                    { label: "L1 — Part Cost", value: v.level1Total, color: "bg-blue-500" },
                                                                    { label: "L2 — Machine Cost", value: v.level2Total, color: "bg-emerald-500" },
                                                                    { label: "L3 — Auxiliary", value: v.level3Total, color: "bg-amber-500" },
                                                                    { label: "Overheads", value: v.overheadCost, color: "bg-slate-500" },
                                                                    { label: "Margin", value: v.marginCost, color: "bg-primary" },
                                                                ].map(item => {
                                                                    const pct = (item.value / (v.unitPrice || 1)) * 100;
                                                                    return (
                                                                        <div key={item.label}>
                                                                            <div className="flex justify-between text-[12px] mb-1">
                                                                                <span className="font-medium">{item.label}</span>
                                                                                <span className="tabular-nums text-muted-foreground">${item.value.toFixed(2)} ({pct.toFixed(1)}%)</span>
                                                                            </div>
                                                                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                                                                                <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* T4 — Percentages */}
                                                        {activeTab === 3 && (
                                                            <div className="space-y-4">
                                                                <div>
                                                                    <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Auxiliary Costs</div>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                        {[
                                                                            { label: "Welding", pct: v.weldingPct, cost: v.weldingCost },
                                                                            { label: "Painting", pct: v.paintingPct, cost: v.paintingCost },
                                                                            { label: "Testing", pct: v.testingPct, cost: v.testingCost },
                                                                            { label: "Packaging", pct: v.packagingPct, cost: v.packagingCost },
                                                                        ].map(item => (
                                                                            <div key={item.label} className="rounded-lg border border-border bg-background px-3 py-2">
                                                                                <div className="text-[10px] uppercase text-muted-foreground">{item.label}</div>
                                                                                <div className="text-[15px] font-bold tabular-nums">{item.pct}%</div>
                                                                                <div className="text-[11px] text-muted-foreground">${item.cost.toFixed(2)}</div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">Overheads &amp; Margin</div>
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div className="rounded-lg border border-border bg-background px-3 py-2">
                                                                            <div className="text-[10px] uppercase text-muted-foreground">Overheads</div>
                                                                            <div className="text-[15px] font-bold tabular-nums">{v.overheadPct}%</div>
                                                                            <div className="text-[11px] text-muted-foreground">${v.overheadCost.toFixed(2)}</div>
                                                                        </div>
                                                                        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                                                                            <div className="text-[10px] uppercase text-muted-foreground">Margin</div>
                                                                            <div className="text-[15px] font-bold tabular-nums text-primary">{v.marginPct}%</div>
                                                                            <div className="text-[11px] text-muted-foreground">${v.marginCost.toFixed(2)}</div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Section>
                )}
            </div>

            {/* Send to Procurement Dialog */}
            <SendToProcurementDialog
                open={sendToProcurementOpen}
                onOpenChange={setSendToProcurementOpen}
                rfq={rfq}
                bom={bom}
                costCalc={costCalc}
                masterData={masterData}
            />
        </>
    );
}
