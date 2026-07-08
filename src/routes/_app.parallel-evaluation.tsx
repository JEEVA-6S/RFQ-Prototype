import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
    Plus, Trash2, Edit2, Save, X,
    Wrench, Settings, Package, AlertCircle, 
} from "lucide-react";
import { RFQS, MACHINE_MASTER, BOM_ROWS } from "@/data/mock";
import { machineStore, getOpsForRFQ } from "@/data/masters";

import { ModuleHeader, Section, Btn } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip, StageCompletionGuard } from "@/components/workflow";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/parallel-evaluation")({
    head: () => ({ meta: [{ title: "Parallel Technical & Commercial Evaluation — SeaHydrosys" }] }),
    component: ParallelEvaluationPage,
});

// Process operation interface
interface ProcessOperation {
    id: string;
    part: string;
    operation: string;
    machine: string;
    cycleTime: number;
    setupTime: number;
    rate: number;
    total: number;
    isOutsourced: boolean;
    vendor?: string;
    vendorPrice?: number;
}

// Checklist item interface
interface ChecklistItem {
    id: string;
    label: string;
    description: string;
    recommended: boolean;
    approved: boolean;
    approver: string;
}

// Conversion rate: INR to USD (operation costs are stored in INR)
const INR_TO_USD = 84;
// Function to get initial processes from master data
function getInitialProcesses(): ProcessOperation[] {
    const ops = getOpsForRFQ("RFQ-2026-00481");
    const machines = machineStore.getAll();
    const machineById = Object.fromEntries(machines.map(m => [m.id, m]));

    return ops.map((op, idx) => {
        const machine = machineById[op.machineId];
        return {
            id: `proc-${idx}`,
            part: op.part,
            operation: op.operation,
            machine: machine?.name ?? op.machineId,
            cycleTime: op.cycleTimeMin,
            setupTime: op.setupTimeMin,
            rate: Math.round((op.ratePerMin / INR_TO_USD) * 100) / 100,
            total: Math.round((op.totalCost / INR_TO_USD) * 100) / 100,
            isOutsourced: false,
        };
    });
}

const initialProcesses: ProcessOperation[] = getInitialProcesses();

// Outsourced parts with prices (in USD)
const initialOutsourcedParts: ProcessOperation[] = [
    { id: "out-1", part: "SEAL KIT", operation: "Procurement", machine: "—", cycleTime: 0, setupTime: 0, rate: 0, total: 2.19, isOutsourced: true, vendor: "Trelleborg", vendorPrice: 2.19 },
    { id: "out-2", part: "WEAR RING", operation: "Procurement", machine: "—", cycleTime: 0, setupTime: 0, rate: 0, total: 0.50, isOutsourced: true, vendor: "Trelleborg", vendorPrice: 0.50 },
    { id: "out-3", part: "Hard Chrome Plating", operation: "External Service", machine: "—", cycleTime: 0, setupTime: 0, rate: 0, total: 0.54, isOutsourced: true, vendor: "ChromePro", vendorPrice: 0.54 },
];

// Design feasibility checklist
const initialDesignChecks: ChecklistItem[] = [
    { id: "d1", label: "Drawing dimensions verified", description: "All critical dimensions (Bore 2.5\", Stroke 180mm, Rod 1.5\") validated against customer specs", recommended: true, approved: false, approver: "Design Team" },
    { id: "d2", label: "Material specifications confirmed", description: "ST 52 tube, CK45 rod, EN8 piston/gland materials match application requirements", recommended: true, approved: false, approver: "Design Team" },
    { id: "d3", label: "Tolerance & fit analysis complete", description: "H8/f7 fits for piston-bore, rod-gland interfaces verified for working pressure 210 bar", recommended: true, approved: false, approver: "Design Team" },
];

// Manufacturing feasibility checklist
const initialMfgChecks: ChecklistItem[] = [
    { id: "m1", label: "Machine capacity available", description: "CNC Lathe DX-200, Honing-H1, and all required machines have capacity in schedule", recommended: true, approved: false, approver: "Manufacturing Team" },
    { id: "m2", label: "Tooling & fixtures available", description: "All cutting tools, jigs, and fixtures for tie-rod cylinder assembly are in inventory", recommended: true, approved: false, approver: "Manufacturing Team" },
    { id: "m3", label: "Process sequence validated", description: "Cutting → Turning → Honing → Assembly → Testing sequence optimized for cycle time", recommended: true, approved: false, approver: "Manufacturing Team" },
];

// Parts & RM availability checklist
const initialProcurementChecks: ChecklistItem[] = [
    { id: "p1", label: "Raw materials in stock", description: "ST 52 tube, EN8 bar, ASTM A36 plate available in warehouse", recommended: true, approved: false, approver: "Procurement Team" },
    { id: "p2", label: "Critical items lead time OK", description: "CK45-HC rod (4 wk lead from Mukand) fits project timeline", recommended: true, approved: false, approver: "Procurement Team" },
    { id: "p3", label: "Vendor quotes received", description: "Trelleborg seal kit, ChromePro plating quotes confirmed within budget", recommended: true, approved: false, approver: "Procurement Team" },
];

function ParallelEvaluationPage() {
    const navigate = useNavigate();
    const { activeRfqId } = useWorkflow();
    const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];

    // Process operations state
    const [processes, setProcesses] = useState<ProcessOperation[]>(initialProcesses);
    const [outsourcedParts, setOutsourcedParts] = useState<ProcessOperation[]>(initialOutsourcedParts);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<ProcessOperation>>({});

    // Checklist states
    const [designChecks, setDesignChecks] = useState(initialDesignChecks);
    const [mfgChecks, setMfgChecks] = useState(initialMfgChecks);
    const [procurementChecks, setProcurementChecks] = useState(initialProcurementChecks);
    const [activeTab, setActiveTab] = useState<"design" | "mfg" | "procurement">("design");


    // Master data
    const machines = useMemo(() => machineStore.getAll(), []);
    // New process form
    const [showAddForm, setShowAddForm] = useState(false);
    const [newProcess, setNewProcess] = useState<Partial<ProcessOperation>>({
        part: "",
        operation: "",
        machine: "",
        cycleTime: 0,
        setupTime: 0,
        rate: 0,
        isOutsourced: false,
    });

    // Calculate totals
    const totalMachiningCost = processes.reduce((sum, p) => sum + p.total, 0);
    const totalOutsourcedCost = outsourcedParts.reduce((sum, p) => sum + (p.vendorPrice || p.total), 0);

    // Handlers
    function handleAddProcess() {
        if (!newProcess.part || !newProcess.operation) {
            toast.error("Part and Operation are required");
            return;
        }
        const total = ((newProcess.cycleTime || 0) + (newProcess.setupTime || 0)) * (newProcess.rate || 0) / 60;
        const process: ProcessOperation = {
            id: `proc-${Date.now()}`,
            part: newProcess.part || "",
            operation: newProcess.operation || "",
            machine: newProcess.machine || "",
            cycleTime: newProcess.cycleTime || 0,
            setupTime: newProcess.setupTime || 0,
            rate: newProcess.rate || 0,
            total: Math.round(total),
            isOutsourced: newProcess.isOutsourced || false,
            vendor: newProcess.vendor,
            vendorPrice: newProcess.vendorPrice,
        };

        if (newProcess.isOutsourced) {
            process.total = newProcess.vendorPrice || 0;
            setOutsourcedParts([...outsourcedParts, process]);
        } else {
            setProcesses([...processes, process]);
        }

        setNewProcess({ part: "", operation: "", machine: "", cycleTime: 0, setupTime: 0, rate: 0, isOutsourced: false });
        setShowAddForm(false);
        toast.success("Process added successfully");
    }

    function handleEditProcess(proc: ProcessOperation) {
        setEditingId(proc.id);
        setEditForm(proc);
    }

    // Handle machine change - auto-populate setup time and rate from Machine Master
    function handleMachineChange(machineName: string, isNewProcess: boolean = false) {
        const machine = machines.find(m => m.name === machineName);
        if (machine) {
            const updates = {
                machine: machineName,
                setupTime: machine.setupTimeMin || 0,
                rate: machine.costPerMin || 0,
            };
            if (isNewProcess) {
                setNewProcess(prev => ({ ...prev, ...updates }));
            } else {
                setEditForm(prev => ({ ...prev, ...updates }));
            }
        }
    }

    function handleSaveEdit() {
        if (!editingId) return;
        const total = editForm.isOutsourced
            ? editForm.vendorPrice || 0
            : ((editForm.cycleTime || 0) + (editForm.setupTime || 0)) * (editForm.rate || 0) / 60;

        if (editForm.isOutsourced) {
            setOutsourcedParts(outsourcedParts.map(p =>
                p.id === editingId ? { ...p, ...editForm, total: Math.round(total) } : p
            ));
        } else {
            setProcesses(processes.map(p =>
                p.id === editingId ? { ...p, ...editForm, total: Math.round(total) } : p
            ));
        }
        setEditingId(null);
        setEditForm({});
        toast.success("Process updated");
    }

    function handleDeleteProcess(id: string, isOutsourced: boolean) {
        if (isOutsourced) {
            setOutsourcedParts(outsourcedParts.filter(p => p.id !== id));
        } else {
            setProcesses(processes.filter(p => p.id !== id));
        }
        toast.success("Process deleted");
    }

    function handleChecklistToggle(type: "design" | "mfg" | "procurement", id: string) {
        if (type === "design") {
            setDesignChecks(designChecks.map(c => c.id === id ? { ...c, approved: !c.approved } : c));
        } else if (type === "mfg") {
            setMfgChecks(mfgChecks.map(c => c.id === id ? { ...c, approved: !c.approved } : c));
        } else {
            setProcurementChecks(procurementChecks.map(c => c.id === id ? { ...c, approved: !c.approved } : c));
        }
    }

    function handleSelectAll(type: "design" | "mfg" | "procurement", selectAll: boolean) {
        if (type === "design") {
            setDesignChecks(designChecks.map(c => ({ ...c, approved: selectAll })));
        } else if (type === "mfg") {
            setMfgChecks(mfgChecks.map(c => ({ ...c, approved: selectAll })));
        } else {
            setProcurementChecks(procurementChecks.map(c => ({ ...c, approved: selectAll })));
        }
        toast.success(selectAll ? "All items selected" : "All items deselected");
    }

    // Group processes by part
    const processesByPart = processes.reduce((acc, proc) => {
        if (!acc[proc.part]) acc[proc.part] = [];
        acc[proc.part].push(proc);
        return acc;
    }, {} as Record<string, ProcessOperation[]>);

    return (
        <>
            <ModuleHeader
                breadcrumbs={["Operate", "BOM", "Feasibility & Availability"]}
                title="Feasibility and Availability"
                titleSuffix={
                    <StageSLAChip stage="Feasibility" />
                }
                subtitle={`${rfq.id} · ${rfq.client} · Bore 2.5" × Stroke 180mm × Rod 1.5"`}
                actions={
                    <>
                        <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/bom" })}>
                            ← Back to Bom
                        </Btn>
                        <StageCompletionGuard stage="Feasibility" actor="Engineering" actionLabel="Complete & Continue to Costing" />
                    </>

                }
            />
            <StageWorkflowChrome stage="Feasibility" />

            <div className="grid grid-cols-12 gap-6 p-6 lg:p-8">
                {/* ═══ TOP: Feasibility Checklists with Tabs ═══ */}
                <div className="col-span-12">
                    {/* Tabs */}
                    <div className="flex w-full gap-1 mb-4 border-b border-border">
                        <button
                            onClick={() => setActiveTab("design")}
                            className={`flex flex-1 justify-center items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all -mb-[1px] ${activeTab === "design"
                                    ? "border-primary text-primary bg-primary/5"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <Wrench className="h-4 w-4" />
                            Design Feasibility
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${designChecks.every(c => c.approved) ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                                }`}>
                                {designChecks.filter(c => c.approved).length}/{designChecks.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("mfg")}
                            className={`flex flex-1 justify-center items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all -mb-[1px] ${activeTab === "mfg"
                                    ? "border-amber-500 text-amber-600 bg-amber-500/5"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <Settings className="h-4 w-4" />
                            Manufacturing Feasibility
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${mfgChecks.every(c => c.approved) ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                                }`}>
                                {mfgChecks.filter(c => c.approved).length}/{mfgChecks.length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab("procurement")}
                            className={`flex flex-1 justify-center items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition-all -mb-[1px] ${activeTab === "procurement"
                                    ? "border-emerald-500 text-emerald-600 bg-emerald-500/5"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`}
                        >
                            <Package className="h-4 w-4" />
                            Parts & RM Availability
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${procurementChecks.every(c => c.approved) ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"
                                }`}>
                                {procurementChecks.filter(c => c.approved).length}/{procurementChecks.length}
                            </span>
                        </button>
                    </div>

                    {/* Tab Content + Summary */}
                    <div className="grid grid-cols-12 gap-6">
                        {/* Checklist Content */}
                        <div className="col-span-12">
                            <div className="rounded-lg border border-border bg-background overflow-hidden">
                                {/* Select All Header */}
                                <div className="px-5 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                            checked={
                                                activeTab === "design" ? designChecks.every(c => c.approved) :
                                                    activeTab === "mfg" ? mfgChecks.every(c => c.approved) :
                                                        procurementChecks.every(c => c.approved)
                                            }
                                            onChange={(e) => handleSelectAll(activeTab, e.target.checked)}
                                        />
                                        <span className="text-[13px] font-medium">Select All</span>
                                    </label>
                                    <span className="text-[11px] text-muted-foreground">
                                        {activeTab === "design" ? `${designChecks.filter(c => c.approved).length}/${designChecks.length} approved` :
                                            activeTab === "mfg" ? `${mfgChecks.filter(c => c.approved).length}/${mfgChecks.length} approved` :
                                                `${procurementChecks.filter(c => c.approved).length}/${procurementChecks.length} approved`}
                                    </span>
                                </div>
                                <div className="divide-y divide-border/50">
                                    {activeTab === "design" && designChecks.map((check) => (
                                        <ChecklistRow
                                            key={check.id}
                                            check={check}
                                            onToggle={() => handleChecklistToggle("design", check.id)}
                                        />
                                    ))}
                                    {activeTab === "mfg" && mfgChecks.map((check) => (
                                        <ChecklistRow
                                            key={check.id}
                                            check={check}
                                            onToggle={() => handleChecklistToggle("mfg", check.id)}
                                        />
                                    ))}
                                    {activeTab === "procurement" && procurementChecks.map((check) => (
                                        <ChecklistRow
                                            key={check.id}
                                            check={check}
                                            onToggle={() => handleChecklistToggle("procurement", check.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>


                    </div>
                </div>

                {/* ═══ BOTTOM: Manufacturing Process Definition & Outsourced Parts ═══ */}
                <div className="col-span-12 space-y-6">
                    <Section title="Manufacturing Process Definition" action={
                        <Btn variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
                            <Plus className="h-3.5 w-3.5" />Add Process
                        </Btn>
                    }>
                        {/* Add Process Dialog */}
                        <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
                            <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-primary">Add New Process</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[12px] font-medium text-muted-foreground">Part *</label>
                                            <select
                                                className="field-input w-full mt-1 text-[13px]"
                                                value={newProcess.part || ""}
                                                onChange={(e) => setNewProcess({ ...newProcess, part: e.target.value })}
                                            >
                                                <option value="">Select Part</option>
                                                {[...new Set(BOM_ROWS.map(b => b.part))].map(part => (
                                                    <option key={part} value={part}>{part}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[12px] font-medium text-muted-foreground">Operation *</label>
                                            <input
                                                className="field-input w-full mt-1 text-[13px]"
                                                placeholder="e.g., Cutting"
                                                value={newProcess.operation || ""}
                                                onChange={(e) => setNewProcess({ ...newProcess, operation: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[12px] font-medium text-muted-foreground">Machine</label>
                                            <select
                                                className="field-input w-full mt-1 text-[13px]"
                                                value={newProcess.machine || ""}
                                                onChange={(e) => handleMachineChange(e.target.value, true)}
                                            >
                                                <option value="">Select Machine</option>
                                                {MACHINE_MASTER.map(m => (
                                                    <option key={m.name} value={m.name}>{m.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            <label className="flex items-center gap-2 text-[13px] pb-2">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4"
                                                    checked={newProcess.isOutsourced || false}
                                                    onChange={(e) => setNewProcess({ ...newProcess, isOutsourced: e.target.checked })}
                                                />
                                                Outsourced
                                            </label>
                                        </div>
                                    </div>
                                    {!newProcess.isOutsourced ? (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[12px] font-medium text-muted-foreground">Cycle Time (min)</label>
                                                <input
                                                    type="number"
                                                    className="field-input w-full mt-1 text-[13px] bg-muted/50"
                                                    value={newProcess.cycleTime || 0}
                                                    readOnly
                                                    title="Auto-populated from master data"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[12px] font-medium text-muted-foreground">Setup Time (min)</label>
                                                <input
                                                    type="number"
                                                    className="field-input w-full mt-1 text-[13px] bg-muted/50"
                                                    value={newProcess.setupTime || 0}
                                                    readOnly
                                                    title="Auto-populated from Machine Master"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[12px] font-medium text-muted-foreground">Rate ($/min)</label>
                                                <input
                                                    type="number"
                                                    className="field-input w-full mt-1 text-[13px] bg-muted/50"
                                                    value={newProcess.rate || 0}
                                                    readOnly
                                                    title="Auto-populated from Machine Master"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[12px] font-medium text-muted-foreground">Vendor</label>
                                                <input
                                                    className="field-input w-full mt-1 text-[13px]"
                                                    placeholder="Vendor name"
                                                    value={newProcess.vendor || ""}
                                                    onChange={(e) => setNewProcess({ ...newProcess, vendor: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[12px] font-medium text-muted-foreground">Vendor Price ($)</label>
                                                <input
                                                    type="number"
                                                    className="field-input w-full mt-1 text-[13px]"
                                                    value={newProcess.vendorPrice || 0}
                                                    onChange={(e) => setNewProcess({ ...newProcess, vendorPrice: +e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Btn variant="outline" size="sm" onClick={() => setShowAddForm(false)}>
                                        Cancel
                                    </Btn>
                                    <Btn size="sm" onClick={handleAddProcess}>
                                        <Plus className="h-3.5 w-3.5" />Add Process
                                    </Btn>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        {/* In-House Manufacturing Processes Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Part</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Operation</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Machine</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Cycle (min)</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Setup (min)</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground">Rate ($/min)</th>
                                        <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Total ($)</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(processesByPart).map(([part, partProcesses]) => (
                                        partProcesses.map((proc, idx) => (
                                            <tr key={proc.id} className={`border-b border-border/50 hover:bg-surface-2 ${idx === 0 ? "bg-surface/30" : ""}`}>
                                                {editingId === proc.id ? (
                                                    <>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                className="field-input w-full text-[12px] bg-muted/50 cursor-not-allowed"
                                                                value={editForm.part || ""}
                                                                readOnly
                                                                disabled
                                                                title="Part name cannot be changed"
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <input
                                                                className="field-input w-full text-[12px]"
                                                                value={editForm.operation || ""}
                                                                onChange={(e) => setEditForm({ ...editForm, operation: e.target.value })}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <select
                                                                className="field-input w-full text-[12px]"
                                                                value={editForm.machine || ""}
                                                                onChange={(e) => handleMachineChange(e.target.value)}
                                                            >
                                                                {MACHINE_MASTER.map(m => (
                                                                    <option key={m.name} value={m.name}>{m.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="font-mono text-[12px] text-muted-foreground">{editForm.cycleTime || 0}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="font-mono text-[12px] text-muted-foreground">{editForm.setupTime || 0}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className="font-mono text-[12px] text-muted-foreground">{editForm.rate || 0}</span>
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-mono text-muted-foreground">—</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button onClick={handleSaveEdit} className="p-1.5 hover:bg-success/10 rounded text-success">
                                                                    <Save className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-muted rounded text-muted-foreground">
                                                                    <X className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="px-3 py-2 font-semibold">{idx === 0 ? part : ""}</td>
                                                        <td className="px-3 py-2">{proc.operation}</td>
                                                        <td className="px-3 py-2 text-muted-foreground">{proc.machine}</td>
                                                        <td className="px-3 py-2 text-center font-mono">{proc.cycleTime}</td>
                                                        <td className="px-3 py-2 text-center font-mono">{proc.setupTime}</td>
                                                        <td className="px-3 py-2 text-center font-mono">{proc.rate}</td>
                                                        <td className="px-3 py-2 text-right font-mono font-semibold">${proc.total}</td>
                                                        <td className="px-3 py-2 text-center">
                                                            <div className="flex items-center justify-center gap-1">
                                                                <button onClick={() => handleEditProcess(proc)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                                                                    <Edit2 className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={() => handleDeleteProcess(proc.id, false)} className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))
                                    ))}
                                    <tr className="bg-muted/50 font-semibold">
                                        <td colSpan={6} className="px-3 py-2.5 text-right">Total In-House Machining Cost</td>
                                        <td className="px-3 py-2.5 text-right font-mono">${totalMachiningCost.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Section>

                    {/* Outsourced Parts & Services */}
                    <Section title="Outsourced Parts & Services">
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Part / Service</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Type</th>
                                        <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground">Vendor</th>
                                        <th className="px-3 py-2.5 text-right font-semibold text-muted-foreground">Unit Price ($)</th>
                                        <th className="px-3 py-2.5 text-center font-semibold text-muted-foreground w-20">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outsourcedParts.map((proc) => (
                                        <tr key={proc.id} className="border-b border-border/50 hover:bg-surface-2">
                                            {editingId === proc.id ? (
                                                <>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            className="field-input w-full text-[12px] bg-muted/50 cursor-not-allowed"
                                                            value={editForm.part || ""}
                                                            readOnly
                                                            disabled
                                                            title="Part name cannot be changed"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            className="field-input w-full text-[12px]"
                                                            value={editForm.operation || ""}
                                                            onChange={(e) => setEditForm({ ...editForm, operation: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <input
                                                            className="field-input w-full text-[12px]"
                                                            value={editForm.vendor || ""}
                                                            onChange={(e) => setEditForm({ ...editForm, vendor: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                        <input
                                                            type="number"
                                                            className="field-input w-24 text-[12px] text-right ml-auto"
                                                            value={editForm.vendorPrice || 0}
                                                            onChange={(e) => setEditForm({ ...editForm, vendorPrice: +e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={handleSaveEdit} className="p-1.5 hover:bg-success/10 rounded text-success">
                                                                <Save className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => setEditingId(null)} className="p-1.5 hover:bg-muted rounded text-muted-foreground">
                                                                <X className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-3 py-2 font-semibold">{proc.part}</td>
                                                    <td className="px-3 py-2 text-muted-foreground">{proc.operation}</td>
                                                    <td className="px-3 py-2">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-medium">
                                                            {proc.vendor}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-mono font-semibold">${(proc.vendorPrice ?? 0).toFixed(2)}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => handleEditProcess(proc)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button onClick={() => handleDeleteProcess(proc.id, true)} className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                    <tr className="bg-muted/50 font-semibold">
                                        <td colSpan={3} className="px-3 py-2.5 text-right">Total Outsourced Cost</td>
                                        <td className="px-3 py-2.5 text-right font-mono">${totalOutsourcedCost.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </Section>
                </div>

                {/* ═══ REVIEW DATA: Collapsible Sections ═══ */}

                

                
            </div>
        </>
    );
}

// Checklist row component
function ChecklistRow({ check, onToggle }: { check: ChecklistItem; onToggle: () => void }) {
    return (
        <div className="px-5 py-4 hover:bg-surface-2 transition-colors">
            <div className="flex items-start gap-4">
                <input
                    type="checkbox"
                    checked={check.approved}
                    onChange={onToggle}
                    className="mt-1 shrink-0 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className={`text-[12px] font-medium ${check.approved ? "text-foreground" : "text-foreground/80"}`}>
                            {check.label}
                        </span>

                    </div>
                    <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{check.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">Approval: {check.approver}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
