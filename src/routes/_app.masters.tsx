import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import {
  Users, Layers, Package, Cpu, Calculator, Wrench,
  Clock, AlertTriangle, CheckCircle2,Factory, Cog, Target, Zap, Gauge,
  ArrowRight, Box, Truck
} from "lucide-react";
import { masterData } from "@/data/masters";
import { ModuleHeader, Section } from "@/components/shell/primitives";

export const Route = createFileRoute("/_app/masters")({
  head: () => ({ meta: [{ title: "Admin & Master Data - SeaHydrosys" }] }),
  component: Masters,
});

/* ═══════════════════ HELPER COMPONENTS ═══════════════════ */

function StatCard({ label, value, hint, icon: Icon, accent }: { label: string; value: string | number; hint?: string; icon?: React.ElementType; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-primary/30 bg-primary/5" : "bg-card"}`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className={`mt-2 text-[20px] font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[12px] font-medium tabular-nums">{String(value)}</span>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" }) {
  const colors = {
    default: "bg-muted text-muted-foreground",
    success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    danger: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${colors[variant]}`}>{children}</span>;
}

function ProgressBar({ value, max = 100, color = "bg-primary" }: { value: number; max?: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${Math.min((value / max) * 100, 100)}%` }} />
    </div>
  );
}

/* ═══════════════════ CLIENT MASTER ═══════════════════ */

function ClientMasterUI() {
  const clients = masterData.clients.getAll();
  const [selected, setSelected] = useState(0);
  const c = clients[selected];

  const total = clients.length;
  const avgRfqsPerCustomer = Math.round(clients.reduce((s, cl) => s + (cl.rfqCount ?? 0), 0) / Math.max(1, clients.length));
  const avgConversion = Math.round(clients.reduce((s, cl) => s + (cl.conversionRate ?? 0), 0) / Math.max(1, clients.length));
  const avgRfqs = avgRfqsPerCustomer;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Customers" value={total} />
        <StatCard label="Avg RFQs / Cust" value={avgRfqsPerCustomer}  />
        <StatCard label="Avg Conversion" value={`${avgConversion}%`} />
        <StatCard label="Avg RFQs" value={avgRfqs} />
      </div>

      <div className="overflow-x-auto">
        <table className="ent-table">
          <thead>
            <tr>
              <th>Name</th><th>Industry</th><th>Region</th><th>Contact</th>
              <th>Phone</th><th>RFQs</th><th>Conversion</th><th>Pricing</th><th>Since</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((cl, i) => (
              <tr key={cl.id} className={`hover:bg-muted/30 ${i === selected ? "bg-primary/5" : ""}`} onClick={() => setSelected(i)}>
                <td className="text-[12px] font-medium">{cl.name}</td>
                <td className="text-[12px]">{cl.industry}</td>
                <td className="text-[12px]">{cl.region}</td>
                <td className="text-[12px]">{cl.contact}</td>
                <td className="text-[12px] tabular-nums">{cl.phone ?? "-"}</td>
                <td className="text-[12px] tabular-nums">{cl.rfqCount ?? 0}</td>
                <td className="text-[12px] tabular-nums">{cl.conversionRate ?? 0}%</td>
                <td className="text-[12px]">{cl.pricingCategory ?? "Standard"}</td>
                <td className="text-[12px] tabular-nums">{cl.since}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[18px] font-bold">{c.name}</h2>
            <p className="text-[12px] text-muted-foreground mt-1">{c.industry} &middot; Since {c.since}</p>
          </div>
          <Badge variant={c.conversionRate > 60 ? "success" : c.conversionRate > 30 ? "warning" : "danger"}>
            {c.pricingCategory ?? "Standard"}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-5 mt-4">
          <Section title="Contact Details">
            <div className="p-4 space-y-1">
              <InfoRow label="Contact Person" value={c.contact} />
              <InfoRow label="Phone" value={c.phone ?? "Not provided"} />
              <InfoRow label="Address" value={c.address ?? "Not provided"} />
            </div>
          </Section>
          <Section title="Business Rules">
            <div className="p-4 space-y-1">
              <InfoRow label="Preferred Cylinders" value={c.preferredCylinderTypes?.join(", ") ?? "Any"} />
              <InfoRow label="Preferred Materials" value={c.preferredMaterials?.join(", ") ?? "Auto"} />
              <InfoRow label="Delivery Terms" value={c.standardDeliveryTerms ?? "CIF"} />
              <InfoRow label="Pricing Category" value={c.pricingCategory ?? "Standard"} />
              <InfoRow label="Approved Standards" value={c.approvedPartStandards?.join(", ") ?? "ISO Standard"} />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ MATERIALS MASTER ═══════════════════ */

function MaterialsMasterUI() {
  const materials = masterData.materials.getAll();
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<"basic" | "machining" | "compat" | "costing">("basic");
  const m = materials[selected];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-5 gap-3">
        {materials.map((mat, i) => (
          <button key={mat.id} onClick={() => setSelected(i)}
            className={`rounded-xl border p-4 text-left transition-all ${i === selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "hover:bg-muted/50"}`}>
            <div className="text-[13px] font-bold">{mat.code}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{mat.type}</div>
            <div className="text-[11px] font-medium mt-2 tabular-nums">${mat.costPerKg}/kg</div>
          </button>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {([["basic", "Basic Info"], ["machining", "Machining"], ["compat", "Compatibility"], ["costing", "Costing"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 text-[12px] font-medium border-b-2 transition-colors ${tab === key ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {tab === "basic" && (<>
          <Section title="Material Properties">
            <div className="p-4 space-y-1">
              <InfoRow label="Code" value={m.code} />
              <InfoRow label="Description" value={m.description} />
              <InfoRow label="Density" value={`${m.density} kg/m\u00B3`} />
              <InfoRow label="Type" value={m.type} />
              <InfoRow label="Grade Mapping" value={m.materialGradeMapping ?? "Standard"} />
              <InfoRow label="Used In" value={m.usedInCylinders.join(", ")} />
            </div>
          </Section>
          <Section title="Vendors & Certification">
            <div className="p-4 space-y-1">
              <InfoRow label="Vendors" value={m.vendors.join(", ")} />
              <InfoRow label="Class Cert Required" value={m.classCertRequired ? "Yes" : "No"} />
              <InfoRow label="Surface Finish" value={m.surfaceFinishCapability ?? "Standard"} />
            </div>
          </Section>
        </>)}
        {tab === "machining" && (<>
          <Section title="Machining Parameters">
            <div className="p-4 space-y-1">
              <InfoRow label="Machinability Index" value={m.machinabilityIndex ?? 1.0} />
              <InfoRow label="Cutting Speed" value={m.cuttingSpeed ? `${m.cuttingSpeed} m/min` : "Auto"} />
              <InfoRow label="Feed Rate" value={m.feedRate ? `${m.feedRate} mm/rev` : "Auto"} />
              <InfoRow label="Hardness" value={m.hardness ?? "Medium"} />
              <InfoRow label="Scrap %" value={`${m.scrapPct ?? 5}%`} />
            </div>
          </Section>
          <Section title="Machining Intelligence">
            <div className="p-4">
              <div className="text-[12px] text-muted-foreground mb-3">Machinability Rating</div>
              <ProgressBar value={(m.machinabilityIndex ?? 1.0) * 100} max={200} />
              <div className="mt-4 text-[12px] text-muted-foreground mb-3">Scrap Factor</div>
              <ProgressBar value={m.scrapPct ?? 5} max={20} color="bg-amber-500" />
            </div>
          </Section>
        </>)}
        {tab === "compat" && (<>
          <Section title="Compatible Processes">
            <div className="p-4">
              {(m.compatibleProcesses ?? ["Turning", "Milling", "Grinding"]).map(p => (
                <div key={p} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-[12px]">{p}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Compatible Tools">
            <div className="p-4">
              {(m.compatibleTools ?? ["Carbide Insert", "HSS"]).map(t => (
                <div key={t} className="flex items-center gap-2 py-1.5 border-b border-border/30 last:border-0">
                  <Wrench className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-[12px]">{t}</span>
                </div>
              ))}
            </div>
          </Section>
        </>)}
        {tab === "costing" && (<>
          <Section title="Cost Data">
            <div className="p-4 space-y-1">
              <InfoRow label="Cost per kg" value={`$${m.costPerKg}`} />
              <InfoRow label="Weldability" value={m.weldability ?? "Good"} />
            </div>
          </Section>
          <Section title="Linked Raw Materials">
            <div className="p-4">
              {masterData.rawMaterials.find(rm => rm.materialId === m.id).map(rm => (
                <div key={rm.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <div className="text-[12px] font-medium">{rm.spec}</div>
                    <div className="text-[11px] text-muted-foreground">{rm.form} &middot; {rm.supplier}</div>
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums">${rm.costPerKg}/kg</span>
                </div>
              ))}
            </div>
          </Section>
        </>)}
      </div>
    </div>
  );
}

/* ═══════════════════ RAW MATERIAL MASTER ═══════════════════ */

function RawMaterialMasterUI() {
  const rms = masterData.rawMaterials.getAll();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Package} label="Total RM Items" value={rms.length} />
        <StatCard icon={CheckCircle2} label="In Stock" value={rms.filter(r => r.availability === "In Stock").length} />
        <StatCard icon={AlertTriangle} label="Low Stock" value={rms.filter(r => r.availability === "Low Stock").length} />
        <StatCard icon={Truck} label="Avg Lead Time" value={`${Math.round(rms.reduce((s, r) => s + r.leadDays, 0) / rms.length)} days`} />
      </div>

      <div className="overflow-x-auto">
        <table className="ent-table">
          <thead>
            <tr>
              <th>RM Ref</th><th>Spec</th><th>Form</th><th>Supplier</th>
              <th>$/kg</th><th>Stock</th><th>MOQ</th><th>Lead</th><th>Status</th>
              <th>Rating</th><th>Volatility</th>
            </tr>
          </thead>
          <tbody>
            {rms.map(rm => (
              <tr key={rm.id}>
                <td className="text-[12px] font-medium">{rm.rmRef}</td>
                <td className="text-[12px]">{rm.spec}</td>
                <td className="text-[12px]">{rm.form}</td>
                <td className="text-[12px]">{rm.supplier}</td>
                <td className="text-[12px] tabular-nums font-medium">${rm.costPerKg}</td>
                <td className="text-[12px] tabular-nums">{rm.stockQty}</td>
                <td className="text-[12px] tabular-nums">{rm.moq}</td>
                <td className="text-[12px] tabular-nums">{rm.leadDays}d</td>
                <td>
                  <Badge variant={rm.availability === "In Stock" ? "success" : rm.availability === "Low Stock" ? "warning" : "danger"}>
                    {rm.availability}
                  </Badge>
                </td>
                <td className="text-[12px] tabular-nums">{rm.vendorRating ?? 4.5}/5</td>
                <td>
                  <Badge variant={rm.marketVolatility === "High" ? "danger" : rm.marketVolatility === "Medium" ? "warning" : "default"}>
                    {rm.marketVolatility ?? "Low"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════ PARTS MASTER ═══════════════════ */

function PartsMasterUI() {
  const parts = masterData.parts.getAll();
  const [selected, setSelected] = useState(0);
  const p = parts[selected];

  const total = parts.length;
  const totalVendors = new Set(parts.map(pt => pt.vendor)).size;
  const avgCost = Math.round(parts.reduce((s, pt) => s + (pt.costPerPc ?? 0), 0) / Math.max(1, parts.length));
  const totalStock = parts.reduce((s, pt) => s + (pt.stockQty ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Total Parts" value={total} />
        <StatCard label="Total Vendors" value={totalVendors} />
        <StatCard label="Avg Cost / pc" value={`$${avgCost}`} />
        <StatCard label="Total Stock" value={totalStock} />
      </div>

      <div className="overflow-x-auto">
        <table className="ent-table">
          <thead>
            <tr>
              <th>Part</th><th>SKU</th><th>Type</th><th>Vendor</th>
              <th>$/pc</th><th>Stock</th><th>MOQ</th><th>Lead</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((pt, i) => (
              <tr key={pt.id} className={`hover:bg-muted/30 ${i === selected ? "bg-primary/5" : ""}`} onClick={() => setSelected(i)}>
                <td className="text-[12px] font-medium">{pt.name}</td>
                <td className="text-[12px]">{pt.sku}</td>
                <td className="text-[12px]">{pt.type}</td>
                <td className="text-[12px]">{pt.vendor}</td>
                <td className="text-[12px] tabular-nums font-medium">${pt.costPerPc}</td>
                <td className="text-[12px] tabular-nums">{pt.stockQty}</td>
                <td className="text-[12px] tabular-nums">{pt.moq}</td>
                <td className="text-[12px] tabular-nums">{pt.leadDays}d</td>
                <td><Badge variant={pt.stockQty > 50 ? "success" : pt.stockQty > 10 ? "warning" : "danger"}>{pt.stockQty > 50 ? "In Stock" : pt.stockQty > 10 ? "Low" : "Out"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-[16px] font-bold">{p.name}</h2>
        <p className="text-[12px] text-muted-foreground">SKU: {p.sku} &middot; {p.material}</p>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <Section title="Part Details">
            <div className="p-4 space-y-1">
              <InfoRow label="Category" value={p.partCategory ?? p.type} />
              <InfoRow label="Standard Part" value={p.standardPartFlag ? "Yes" : "No"} />
              <InfoRow label="Reusable Design" value={p.reusableDesignFlag ? "Yes" : "No"} />
              <InfoRow label="Used In" value={p.usedInCylinders.join(", ")} />
            </div>
          </Section>
          <Section title="Routing Rules">
            <div className="p-4 space-y-1">
              <InfoRow label="Routing Template" value={p.standardRoutingTemplate ?? "Standard"} />
              <InfoRow label="Preferred Machine" value={p.preferredMachineType ?? "Auto"} />
              <InfoRow label="Preferred Tool" value={p.preferredToolType ?? "Auto"} />
              <InfoRow label="Tolerance" value={p.standardTolerance ?? "IT7"} />
            </div>
          </Section>
        </div>

        <Section title="Procurement">
          <div className="p-4 space-y-1">
            <InfoRow label="Vendor" value={p.vendor} />
            <InfoRow label="Alt Vendor" value={p.altVendor ?? "None"} />
            <InfoRow label="Cost/pc" value={`$${p.costPerPc}`} />
            <InfoRow label="Stock" value={p.stockQty} />
            <InfoRow label="MOQ" value={p.moq} />
            <InfoRow label="Lead Time" value={`${p.leadDays} days`} />
          </div>
        </Section>
      </div>
    </div>
  );
}

/* ═══════════════════ MACHINE MASTER ═══════════════════ */

function MachineMasterUI() {
  const machines = masterData.machines.getAll();

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Factory} label="Total Machines" value={machines.length} />
        <StatCard icon={CheckCircle2} label="Available" value={machines.filter(m => m.status === "Available").length} />
        <StatCard icon={Wrench} label="Maintenance" value={machines.filter(m => m.status === "Maintenance").length} />
        <StatCard icon={Gauge} label="Avg Utilization" value={`${Math.round(machines.reduce((s, m) => s + m.utilizationPct, 0) / machines.length)}%`} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {machines.map(m => (
          <div key={m.id} className="rounded-xl border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[13px] font-bold">{m.name}</div>
                <div className="text-[11px] text-muted-foreground">{m.type} &middot; {m.capacity}</div>
              </div>
              <Badge variant={m.status === "Available" ? "success" : m.status === "Maintenance" ? "danger" : "warning"}>
                {m.status}
              </Badge>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Utilization</span>
                <span className="font-medium">{m.utilizationPct}%</span>
              </div>
              <ProgressBar value={m.utilizationPct} color={m.utilizationPct > 80 ? "bg-red-500" : m.utilizationPct > 60 ? "bg-amber-500" : "bg-emerald-500"} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div><span className="text-muted-foreground">Rate:</span> <span className="font-medium">${m.costPerHour}/hr</span></div>
              <div><span className="text-muted-foreground">Setup:</span> <span className="font-medium">{m.setupTimeMin} min</span></div>
              <div><span className="text-muted-foreground">OEE:</span> <span className="font-medium">{m.oee ?? 85}%</span></div>
              <div><span className="text-muted-foreground">Reject:</span> <span className="font-medium">{m.rejectRate ?? 2}%</span></div>
            </div>

            {m.supportedProcesses && m.supportedProcesses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {m.supportedProcesses.map(proc => (
                  <span key={proc} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{proc}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ PROCESS MASTER ═══════════════════ */

function ProcessMasterUI() {
  const processes = masterData.processes.getAll();
  const grouped = processes.reduce((acc, p) => {
    if (!acc[p.type]) acc[p.type] = [];
    acc[p.type].push(p);
    return acc;
  }, {} as Record<string, typeof processes>);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon={Cog} label="Total Processes" value={processes.length} />
        <StatCard icon={Target} label="Process Types" value={Object.keys(grouped).length} />
        <StatCard icon={Clock} label="Avg Cycle" value={`${(processes.reduce((s, p) => s + p.avgCycleTimeMin, 0) / processes.length).toFixed(1)} min`} />
        <StatCard icon={Zap} label="Automatable" value={processes.filter(p => p.automationPossible).length} />
      </div>

      <Section title="Routing Workflow Categories">
        <div className="p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.keys(grouped).map(type => (
              <Badge key={type}>{type}</Badge>
            ))}
          </div>

          {Object.entries(grouped).map(([type, procs]) => (
            <div key={type} className="mb-4 last:mb-0">
              <h4 className="text-[12px] font-semibold text-muted-foreground mb-2 uppercase tracking-wider">{type}</h4>
              <div className="flex flex-wrap items-center gap-1">
                {procs.map((proc, i) => (
                  <div key={proc.id} className="flex items-center gap-1">
                    <div className="rounded-lg border bg-card px-3 py-2">
                      <div className="text-[12px] font-medium">{proc.name}</div>
                      <div className="text-[10px] text-muted-foreground">{proc.avgCycleTimeMin} min</div>
                    </div>
                    {i < procs.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Process Configuration">
        <div className="overflow-x-auto">
          <table className="ent-table">
            <thead>
              <tr>
                <th>Process</th><th>Type</th><th>Machine</th><th>Cycle (min)</th>
                <th>Setup (min)</th><th>Req Tool</th><th>Skill</th><th>Auto</th>
              </tr>
            </thead>
            <tbody>
              {processes.map(p => {
                const machine = masterData.machines.getById(p.defaultMachineId);
                return (
                  <tr key={p.id}>
                    <td className="text-[12px] font-medium">{p.name}</td>
                    <td><Badge>{p.type}</Badge></td>
                    <td className="text-[12px]">{machine?.name ?? p.defaultMachineId}</td>
                    <td className="text-[12px] tabular-nums">{p.avgCycleTimeMin}</td>
                    <td className="text-[12px] tabular-nums">{p.setupTimeMin}</td>
                    <td className="text-[12px]">{p.requiredToolType ?? "Auto"}</td>
                    <td className="text-[12px]">{p.skillLevelRequired ?? "Medium"}</td>
                    <td>{p.automationPossible ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <span className="text-[11px] text-muted-foreground">Manual</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

/* ═══════════════════ COSTING MASTER ═══════════════════ */

function CostingMasterUI() {
  const params = masterData.costingParams.getAll();
  const grouped = params.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {} as Record<string, typeof params>);

  return (
    <div className="space-y-5">
      <Section title="Cost Formula Engine">
        <div className="p-5">
          <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5">
            <h4 className="text-[12px] font-bold text-primary uppercase tracking-wider mb-3">Final Unit Price Formula</h4>
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-mono">
              <span className="rounded bg-blue-100 dark:bg-blue-900/30 px-2 py-1 text-blue-700 dark:text-blue-400">RM Cost</span>
              <span>+</span>
              <span className="rounded bg-amber-100 dark:bg-amber-900/30 px-2 py-1 text-amber-700 dark:text-amber-400">Machine Cost</span>
              <span>+</span>
              <span className="rounded bg-purple-100 dark:bg-purple-900/30 px-2 py-1 text-purple-700 dark:text-purple-400">Paint</span>
              <span>+</span>
              <span className="rounded bg-green-100 dark:bg-green-900/30 px-2 py-1 text-green-700 dark:text-green-400">Bought-Out</span>
              <span>= Subtotal</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[13px] font-mono mt-3">
              <span className="rounded bg-muted px-2 py-1">Subtotal</span>
              <span>&times;</span>
              <span className="rounded bg-orange-100 dark:bg-orange-900/30 px-2 py-1 text-orange-700 dark:text-orange-400">(1 + Overhead%)</span>
              <span>&times;</span>
              <span className="rounded bg-red-100 dark:bg-red-900/30 px-2 py-1 text-red-700 dark:text-red-400">(1 + Reject%)</span>
              <span>&times;</span>
              <span className="rounded bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 text-emerald-700 dark:text-emerald-400">(1 + Margin%)</span>
              <span>= <strong>Unit Price</strong></span>
            </div>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-2 gap-5">
        {Object.entries(grouped).map(([category, items]) => (
          <Section key={category} title={`${category} Parameters`}>
            <div className="p-4 space-y-1">
              {items.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div>
                    <div className="text-[12px] font-medium">{item.parameter}</div>
                    {item.description && <div className="text-[10px] text-muted-foreground">{item.description}</div>}
                  </div>
                  <div className="text-[13px] font-bold tabular-nums">{item.value} {item.unit}</div>
                </div>
              ))}
            </div>
          </Section>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════ MAIN COMPONENT ═══════════════════ */

const MODULES = [
  { key: "clients", label: "Customer Management", icon: Users },
  { key: "rawMaterial", label: "Raw Material & Vendor Hub", icon: Package },
  { key: "parts", label: "Parts Library", icon: Box },
  { key: "machines", label: "Machine Capability Center", icon: Cpu },
  { key: "processes", label: "Process Routing Engine", icon: Cog },
  { key: "costing", label: "Cost Configuration Engine", icon: Calculator },
  { key: "materials", label: "Material Intelligence", icon: Layers },
] as const;
type ModuleKey = typeof MODULES[number]["key"];

function Masters() {
  const [activeModule, setActiveModule] = useState<ModuleKey>("clients");

  return (
    <>
      <ModuleHeader
        breadcrumbs={["Configure", "Admin"]}
        title="Master Data"        
      />

      <div className="p-6">
        {/* Top tabs for master modules */}
        <div className="mb-4 border-b border-border/30">
          <div className="flex gap-2 overflow-x-auto">
            {MODULES.map((m) => {
              return (
                <button
                  key={m.key}
                  onClick={() => setActiveModule(m.key)}
                  className={`px-4 pb-3 pt-2 text-[13px] font-medium transition-colors ${
                    activeModule === m.key
                      ? "text-primary border-b-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-y-auto">
          {activeModule === "clients" && <ClientMasterUI />}
          {activeModule === "materials" && <MaterialsMasterUI />}
          {activeModule === "rawMaterial" && <RawMaterialMasterUI />}
          {activeModule === "parts" && <PartsMasterUI />}
          {activeModule === "machines" && <MachineMasterUI />}
          {activeModule === "processes" && <ProcessMasterUI />}
          {activeModule === "costing" && <CostingMasterUI />}
        </div>
      </div>
    </>
  );
}
