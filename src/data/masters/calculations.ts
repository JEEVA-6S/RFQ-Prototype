/* ═══════════════════════════════════════════════════════════
   COSTING CALCULATION ENGINE — SeaHydrosys
   Replicates all Excel formulas:
   - Raw material cost = weight × costPerKg
   - Machine cost = (cycleTime × qty / qtyPerCycle + setupTime) × ratePerMin
   - Paint cost = sum of paint parameters
   - Subtotal = RM + Machining + Paint + Bought-out
   - Overhead = subtotal × overhead%
   - Reject = subtotal × reject%
   - Cost before margin = subtotal + overhead + reject
   - Margin = costBeforeMargin × margin%
   - Unit price = costBeforeMargin + margin
   - Total price = unitPrice × orderQty
   ═══════════════════════════════════════════════════════════ */

import type {
  BOMItem,
  CostingOperation,
  CostingSummary,
  Machine,
  CostingParameter,
} from "./types";
import { machineStore, costingParamStore } from "./index";
import { getParam, getPaintCostPerUnit } from "./costingParams";

/* ─── Operation Cost Formula (from Excel) ─── */

/**
 * Calculate total cost for a single machining operation.
 * Excel formula: = (cycleTime * qty / qtyPerCycle + setupTime / batchQty) * ratePerMin
 * 
 * @param cycleTimeMin - cycle time in minutes per piece
 * @param setupTimeMin - setup/changeover time in minutes
 * @param qtyPerCycle - pieces produced per cycle
 * @param batchQty - order quantity (setup amortized over batch)
 * @param ratePerMin - machine cost per minute (from Machine Master)
 */
export function calcOperationCost(
  cycleTimeMin: number,
  setupTimeMin: number,
  qtyPerCycle: number,
  batchQty: number,
  ratePerMin: number,
): { totalTimeMin: number; totalCost: number } {
  // Setup amortized over batch
  const setupPerPiece = setupTimeMin / Math.max(batchQty, 1);
  const cyclePerPiece = cycleTimeMin / Math.max(qtyPerCycle, 1);
  const totalTimeMin = cyclePerPiece + setupPerPiece;
  const totalCost = Math.round(totalTimeMin * ratePerMin * 100) / 100;
  return { totalTimeMin, totalCost };
}

/* ─── Raw Material Cost Formula (from Excel) ─── */

/**
 * Calculate raw material cost for a BOM item.
 * Excel formula: = weight × costPerKg × (1 + overheadPct/100)
 */
export function calcRawMaterialCost(
  weightKg: number,
  costPerKg: number,
  rmOverheadPct: number = 0,
): number {
  return Math.round(weightKg * costPerKg * (1 + rmOverheadPct / 100) * 100) / 100;
}

/* ─── BOM Item Total Cost ─── */

/**
 * Calculate total cost for a single BOM line item.
 * Includes: raw material cost + all machining operations for this part.
 */
export function calcBOMItemCost(
  item: Pick<BOMItem, "weight" | "qty" | "isStandard">,
  costPerKg: number,
  rmOverheadPct: number,
  operations: Pick<CostingOperation, "cycleTimeMin" | "setupTimeMin" | "qtyPerCycle" | "ratePerMin">[],
  batchQty: number,
): { rawMaterialCost: number; machineCost: number; totalPartCost: number } {
  const rawMaterialCost = item.isStandard ? 0 : calcRawMaterialCost(item.weight * item.qty, costPerKg, rmOverheadPct);
  
  let machineCost = 0;
  for (const op of operations) {
    const { totalCost } = calcOperationCost(
      op.cycleTimeMin,
      op.setupTimeMin,
      op.qtyPerCycle,
      batchQty,
      op.ratePerMin,
    );
    machineCost += totalCost * item.qty;
  }

  return {
    rawMaterialCost,
    machineCost: Math.round(machineCost * 100) / 100,
    totalPartCost: Math.round((rawMaterialCost + machineCost) * 100) / 100,
  };
}

/* ─── Full Costing Summary (Excel summary sheet) ─── */

/**
 * Calculate complete costing summary for an RFQ.
 * Replicates the Excel costing summary sheet formulas.
 */
export function calcCostingSummary(
  rfqId: string,
  orderQty: number,
  rawMaterialCostTotal: number,
  machiningCostTotal: number,
  boughtOutCostTotal: number,
  params?: CostingParameter[],
): CostingSummary {
  const p = params || costingParamStore.getAll();
  
  const paintCost = getPaintCostPerUnit(p);
  const overheadPct = getParam(p, "Default Overhead %");
  const rejectPct = getParam(p, "Default Reject %");
  const marginPct = getParam(p, "Default Margin %");

  const subtotal = rawMaterialCostTotal + machiningCostTotal + paintCost + boughtOutCostTotal;
  const overheadCost = Math.round(subtotal * overheadPct / 100);
  const rejectCost = Math.round(subtotal * rejectPct / 100);
  const costBeforeMargin = subtotal + overheadCost + rejectCost;
  const marginCost = Math.round(costBeforeMargin * marginPct / 100);
  const unitPrice = costBeforeMargin + marginCost;
  const totalPrice = unitPrice * orderQty;

  return {
    rfqId,
    qty: orderQty,
    rawMaterialCost: rawMaterialCostTotal,
    machiningCost: machiningCostTotal,
    paintCost,
    boughtOutCost: boughtOutCostTotal,
    subtotal,
    overheadPct,
    overheadCost,
    rejectPct,
    rejectCost,
    costBeforeMargin,
    marginPct,
    marginCost,
    unitPrice,
    totalPrice,
  };
}

/* ─── Resolve Machine Rate ─── */

/**
 * Get the cost-per-minute for a machine by ID.
 * Falls back to process default machine if not found.
 */
export function getMachineRate(machineId: string): number {
  const machine = machineStore.getById(machineId);
  return machine?.costPerMin ?? 0;
}

/* ─── Build Operations from BOM + Process references ─── */

/**
 * Auto-generate costing operations for a BOM item based on its process string.
 * Maps process names to Machine Master entries.
 */
export function autoGenerateOperations(
  part: string,
  processString: string,
  machineOverrides?: Record<string, string>,
): Omit<CostingOperation, "id" | "rfqId" | "bomItemId" | "totalTime" | "totalCost">[] {
  const machines = machineStore.getAll();
  const ops = processString.split("+").map(s => s.trim()).filter(Boolean);
  
  const processToMachine: Record<string, Machine | undefined> = {
    "Cutting": machines.find(m => m.type === "Cutting"),
    "Sizing": machines.find(m => m.id === "MCH-002"), // CNC Lathe
    "Facing": machines.find(m => m.id === "MCH-002"),
    "Honing": machines.find(m => m.type === "Honing"),
    "OD Turning": machines.find(m => m.id === "MCH-002"),
    "Turning": machines.find(m => m.id === "MCH-002"),
    "Threading": machines.find(m => m.id === "MCH-002"),
    "Grooving": machines.find(m => m.id === "MCH-002"),
    "Bore": machines.find(m => m.type === "Boring") || machines.find(m => m.id === "MCH-002"),
    "Drilling": machines.find(m => m.id === "MCH-004"), // VMC
    "Welding": machines.find(m => m.type === "Welding"),
    "Weld Prep": machines.find(m => m.id === "MCH-003"), // Lathe HMT-1
    "Hard Chrome": machines.find(m => m.id === "MCH-002"), // outsourced
    "Assembly": machines.find(m => m.type === "Assembly"),
    "Painting": machines.find(m => m.type === "Painting"),
    "Testing": machines.find(m => m.type === "Testing"),
  };

  return ops.map(opName => {
    const machineId = machineOverrides?.[opName];
    const machine = machineId
      ? machines.find(m => m.id === machineId)
      : processToMachine[opName] || machines.find(m => m.id === "MCH-002");

    return {
      part,
      operation: opName,
      machineId: machine?.id ?? "MCH-002",
      cycleTimeMin: machine?.type === "Cutting" ? 4 : 10, // defaults
      setupTimeMin: machine?.setupTimeMin ?? 10,
      qtyPerCycle: 1,
      ratePerMin: machine?.costPerMin ?? 12,
    };
  });
}
