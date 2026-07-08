import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import { RFQS } from "@/data/mock";
import { costingParamStore, getBOMForRFQ, getOpsForRFQ, masterData } from "@/data/masters";
import { Btn, ModuleHeader, Section } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip, StageCompletionGuard } from "@/components/workflow";
import { useWorkflow } from "@/context/WorkflowContext";

export const Route = createFileRoute("/_app/review")({
  head: () => ({ meta: [{ title: "Internal Review — SeaHydrosys" }] }),
  component: ReviewPage,
});

// Conversion rate: INR to USD (operation costs are stored in INR)
const INR_TO_USD = 84;

function ReviewPage() {
  const navigate = useNavigate();
  const { activeRfqId } = useWorkflow();
  const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];


  /* ── Master Data ── */
  const costParams = useMemo(() => costingParamStore.getAll(), []);
  const overheadParam = costParams.find((p) => p.parameter === "Default Overhead %");
  const marginParam = costParams.find((p) => p.parameter === "Default Margin %");

  /* ── BOM and Operations from master data (same as costing page) ── */
  const selectedRfqId = "RFQ-2026-00481";
  const bom = useMemo(() => getBOMForRFQ(selectedRfqId), []);
  const allOps = useMemo(() => getOpsForRFQ(selectedRfqId), []);

  /* ── Cost Calculation (matches costing page) ── */
  const costCalc = useMemo(() => {
    // Base costs from BOM
    const rawMaterialTotal = bom.filter(b => !b.isStandard).reduce((sum, b) => sum + b.rawMaterialCost, 0);
    const machiningTotal = bom.reduce((sum, b) => sum + b.machineCost, 0);
    const boughtOutTotal = bom.filter(b => b.isStandard).reduce((sum, b) => sum + b.totalPartCost, 0);

    // Default 5% cushion on raw materials
    const cushionPct = 5;
    const cushionAmount = rawMaterialTotal * (cushionPct / 100);
    const rmWithCushion = rawMaterialTotal + cushionAmount;

    // Level 1 Total (Part Cost)
    const level1Total = rmWithCushion + boughtOutTotal;

    // Level 2 Total (Machine Cost)
    const level2Total = machiningTotal;

    // Subtotal before add-ons
    const subtotalBase = level1Total + level2Total;

    // Level 3: Auxiliary costs (default percentages)
    const weldingPct = 3, paintingPct = 4, testingPct = 2, packagingPct = 1.5;
    const auxiliaryCost = subtotalBase * ((weldingPct + paintingPct + testingPct + packagingPct) / 100);

    // Subtotal with add-ons
    const subtotalWithAddons = subtotalBase + auxiliaryCost;

    // Overhead and margin (default 12% and 18%)
    const overheadPct = 12, marginPct = 18;
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
      auxiliaryCost,
      subtotalBase,
      subtotalWithAddons,
      overheadPct,
      overheadCost,
      marginPct,
      marginCost,
      unitPrice,
      totalPrice,
    };
  }, [bom, rfq?.qty]);

  /* ── BOM rows with machining cost per row ── */
  const bomRows = useMemo(() => bom.map((item) => {
    const material = masterData.materials.getById(item.materialId);
    const partOps = allOps.filter(op => op.part === item.part || op.bomItemId === item.id);
    const machineCostINR = partOps.reduce((sum, op) => sum + op.totalCost, 0);
    const machineCost = machineCostINR / INR_TO_USD;
    return {
      ...item,
      materialCode: material?.code || item.materialId,
      machineCost,
    };
  }), [bom, allOps]);

  return (
    <>
      <ModuleHeader
        breadcrumbs={["Operate", "Costing", "Review"]}
        title="Internal Review & Approval"
        subtitle={`${rfq.id} · ${rfq.client} · $${costCalc.unitPrice.toFixed(2)}/unit × ${rfq.qty} units`}
        titleSuffix={
          <StageSLAChip stage="Review" />
        }
        actions={
          <>
            <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/costing" })}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Costing
            </Btn>
            <StageCompletionGuard stage="Review" actor="Management" actionLabel="Approve & Continue to Proposal Drawing" />
          </>
        }
      />
      <StageWorkflowChrome stage="Review" />

      <div className="space-y-5 p-6 lg:p-8">

        {/* ── Middle Row: Cost Breakdown + Quote Summary side by side ── */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">

          {/* Cost Breakdown */}
          <Section title="Cost Breakdown">
            <div className="divide-y divide-border text-[12px]">
              <div className="flex items-center gap-2 bg-muted/40 px-4 py-2 text-[10px] text-muted-foreground">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Master Data
                </span>
                <span>Overhead / Margin rates sourced from Costing Parameter Master</span>
              </div>
              {[
                { label: "Raw Material + Cushion", val: costCalc.rmWithCushion },
                { label: "Machine Cost", val: costCalc.level2Total },
                { label: "Auxiliary Costs", val: costCalc.auxiliaryCost },
                { label: "Bought-out Parts", val: costCalc.boughtOutTotal },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{label}</span>
                  </div>
                  <span className="tabular-nums font-medium">${val.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between bg-muted/30 px-4 py-2.5 font-semibold">
                <span>Subtotal</span>
                <span className="tabular-nums">${costCalc.subtotalWithAddons.toFixed(2)}</span>
              </div>
              <div className="flex items-start justify-between px-4 py-2.5">
                <div>
                  <p className="text-muted-foreground">Factory Overhead</p>
                  <p className="mt-0.5 max-w-[200px] text-[10px] leading-relaxed text-muted-foreground/70">
                    {overheadParam
                      ? `${overheadParam.value}% · ${overheadParam.description?.split(".")[0]}`
                      : `${costCalc.overheadPct}%`}
                  </p>
                </div>
                <span className="tabular-nums font-medium">${costCalc.overheadCost.toFixed(2)}</span>
              </div>
              <div className="flex items-start justify-between px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <div>
                    <p className="text-muted-foreground">Profit Margin</p>
                    <p className="mt-0.5 max-w-[180px] text-[10px] leading-relaxed text-muted-foreground/70">
                      {marginParam
                        ? `${marginParam.value}% · ${marginParam.description?.split(".")[0]}`
                        : `${costCalc.marginPct}%`}
                    </p>
                  </div>
                </div>
                <span className="tabular-nums font-semibold text-emerald-700">${costCalc.marginCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between bg-primary/5 px-4 py-3">
                <span className="text-[13px] font-bold text-foreground">Unit Price</span>
                <span className="tabular-nums text-[16px] font-bold text-primary">${costCalc.unitPrice.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between bg-muted/40 px-4 py-2.5">
                <span className="text-muted-foreground">Order Value ({rfq.qty} units)</span>
                <span className="tabular-nums font-bold">${costCalc.totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </Section>

          {/* Quote Summary */}
          <Section title="Quote Summary Preview">
            <div className="divide-y divide-border">
              {([
                ["RFQ ID", rfq.id],
                ["Client", rfq.client],
                ["Cylinder Type", rfq.category],
                ["Specification", "Bore 2.5\u2033 \u00d7 Stroke 180 mm \u00d7 Rod 1.5\u2033"],
                ["Quantity", `${rfq.qty} units`],
                ["Unit Price", `$${costCalc.unitPrice.toFixed(2)}`],
                ["Total Value", `$${costCalc.totalPrice.toFixed(2)}`],
                ["Margin", `${costCalc.marginPct}%`],
                ["Delivery", "8\u201310 weeks ARO"],
                ["Validity", "30 days"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-5 py-4 text-[13px]">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="text-right font-medium">{value}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ── BOM — full width at bottom ─────────────────── */}
        <Section title="Bill of Materials">
          <div className="overflow-x-auto">
            <table className="ent-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Part</th>
                  <th>Material</th>
                  <th>Wt (kg)</th>
                  <th>Qty</th>
                  <th className="text-right">RM $</th>
                  <th className="text-right">Mfg $</th>
                  <th className="text-right">Total $</th>
                </tr>
              </thead>
              <tbody>
                {bomRows.map((r, i) => (
                  <tr key={i} className={r.isStandard ? "bg-muted/20" : ""}>
                    <td className="font-mono text-[11px] text-muted-foreground">{i + 1}</td>
                    <td className="text-[12px] font-semibold">{r.part}</td>
                    <td className="text-[12px] text-muted-foreground">{r.materialCode}</td>
                    <td className="tabular-nums text-[12px]">{r.weight.toFixed(2)}</td>
                    <td className="tabular-nums text-[12px]">{r.qty}</td>
                    <td className="tabular-nums text-right text-[12px]">
                      {r.isStandard ? "\u2014" : `$${r.rawMaterialCost.toFixed(2)}`}
                    </td>
                    <td className="tabular-nums text-right text-[12px]">
                      {r.machineCost > 0 ? `$${r.machineCost.toFixed(2)}` : "\u2014"}
                    </td>
                    <td className="tabular-nums text-right text-[12px] font-semibold">
                      ${r.totalPartCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={4} />
                  <td className="py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Total</td>
                  <td className="py-3 tabular-nums text-right text-[13px] font-bold text-foreground">${costCalc.rmWithCushion.toFixed(2)}</td>
                  <td className="py-3 tabular-nums text-right text-[13px] font-bold text-foreground">${costCalc.level2Total.toFixed(2)}</td>
                  <td className="py-3 tabular-nums text-right text-[13px] font-bold text-primary">${(costCalc.level1Total + costCalc.level2Total).toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>

      </div>
    </>
  );
}
