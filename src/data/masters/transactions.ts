/* ═══════════════════════════════════════════════════════════
   TRANSACTIONAL DATA STORES — SeaHydrosys
   Stores for RFQ, BOM, and Costing records.
   These reference master data for calculations.
   ═══════════════════════════════════════════════════════════ */

import { DataStore } from "./store";
import type { RFQRecord, BOMItem, CostingOperation, CostingSummary } from "./types";

/* ─── Seed data for demo RFQ (Bore 2.5" × Stroke 180mm × Rod 1.5") ─── */

const rfqSeed: RFQRecord[] = [
  {
    id: "RFQ-2026-00481",
    clientId: "CLI-001", // Mahindra Marine
    subject: "Hydraulic cylinders for deck crane — Bore 2.5\" × Stroke 180mm × Rod 1.5\" — Qty 24",
    category: "Tie-Rod",
    qty: 24,
    priority: "High",
    status: "Costing",
    owner: "Anita R.",
    slaHrs: 3.2,
    receivedAt: "2026-05-13T09:14:00Z",
    attachments: ["7008707_BORE_2.5_STROKE_180MM_ROD_1.5_ASSY.xlsx", "GA_Drawing.pdf", "Spec_Sheet.pdf", "RFQ_Email.eml"],
    confidence: "high",
    revisionNo: 0,
  },
  {
    id: "RFQ-2026-00480",
    clientId: "CLI-002", // L&T
    subject: "Welded cylinders — offshore platform",
    category: "Welded",
    qty: 8,
    priority: "Critical",
    status: "PO",
    owner: "S. Patel",
    slaHrs: 1.4,
    receivedAt: "2026-05-13T08:01:00Z",
    attachments: ["LT_RFQ_Welded.pdf", "GA_WC_200.pdf"],
    confidence: "medium",
    revisionNo: 0,
  },
];

const bomSeed: BOMItem[] = [
  // RFQ-00481: Bore 2.5" × Stroke 180mm × Rod 1.5"
  {
    id: "BOM-001",
    rfqId: "RFQ-2026-00481",
    part: "TUBE",
    materialId: "MAT-001", // ST-52.3
    rawMaterialId: "RM-001", // ST-52.3 Ø76.2 tube
    od: 76.2,
    id_dim: 63.5,
    thickness: 6.35,
    length: 283,
    weight: 2.85,
    qty: 1,
    isStandard: false,
    process: "Cutting + Sizing + Facing + Honing",
    supplier: "Jindal Tubes",
    rawMaterialCost: 4.25, // 2.85 × 1.49/kg from Excel
    machineCost: 1.24, // From Excel
    totalPartCost: 5.49,
  },
  {
    id: "BOM-002",
    rfqId: "RFQ-2026-00481",
    part: "PISTON ROD",
    materialId: "MAT-002", // CK45-Hard Chrome
    rawMaterialId: "RM-003", // CK45-HC Ø38.1
    od: 38.1,
    length: 320,
    weight: 3.45,
    qty: 1,
    isStandard: false,
    process: "Cutting + OD Turning + Threading",
    supplier: "Mukand Steel",
    rawMaterialCost: 5.00, // 3.45 × 1.45/kg from Excel
    machineCost: 1.14, // From Excel
    totalPartCost: 6.14,
  },
  {
    id: "BOM-003",
    rfqId: "RFQ-2026-00481",
    part: "PISTON",
    materialId: "MAT-003", // EN8 / ASTM A36
    rawMaterialId: "RM-006", // EN8 Ø63
    od: 63.0,
    id_dim: 38.1,
    thickness: 35,
    weight: 1.17,
    qty: 1,
    isStandard: false,
    process: "Turning + Grooving",
    supplier: "Internal",
    rawMaterialCost: 1.16, // 1.17 × 0.99/kg from Excel
    machineCost: 0.70, // From Excel
    totalPartCost: 1.86,
  },
  {
    id: "BOM-004",
    rfqId: "RFQ-2026-00481",
    part: "GLAND",
    materialId: "MAT-003", // EN8 / ASTM A36
    rawMaterialId: "RM-006", // EN8 Ø63
    od: 63.0,
    id_dim: 38.1,
    thickness: 30,
    weight: 2.10,
    qty: 1,
    isStandard: false,
    process: "Turning + Bore",
    supplier: "Internal",
    rawMaterialCost: 2.08, // 2.10 × 0.99/kg from Excel
    machineCost: 1.14, // From Excel
    totalPartCost: 3.22,
  },
  {
    id: "BOM-005",
    rfqId: "RFQ-2026-00481",
    part: "END CAP",
    materialId: "MAT-006", // ASTM A36
    rawMaterialId: "RM-009", // A36 Flat
    od: 76.2,
    thickness: 20,
    weight: 0.69,
    qty: 1,
    isStandard: false,
    process: "Turning + Weld Prep + Welding",
    supplier: "Internal",
    rawMaterialCost: 0.68, // 0.69 × 0.99/kg from Excel
    machineCost: 0.61, // From Excel
    totalPartCost: 1.29,
  },
  {
    id: "BOM-006",
    rfqId: "RFQ-2026-00481",
    part: "ROD CLEVIS",
    materialId: "MAT-007", // ASTM A536
    rawMaterialId: "RM-010", // A536 DI Bar Ø50
    od: 50,
    id_dim: 20,
    length: 60,
    weight: 1.22,
    qty: 1,
    isStandard: false,
    process: "Turning + Drilling",
    supplier: "Internal",
    rawMaterialCost: 1.21, // 1.22 × 0.99/kg from Excel
    machineCost: 0.88, // From Excel
    totalPartCost: 2.09,
  },
  {
    id: "BOM-007",
    rfqId: "RFQ-2026-00481",
    part: "BACK CLEVIS",
    materialId: "MAT-007", // ASTM A536
    rawMaterialId: "RM-010", // A536 DI Bar Ø50
    od: 50,
    id_dim: 20,
    length: 55,
    weight: 2.11,
    qty: 1,
    isStandard: false,
    process: "Turning + Drilling",
    supplier: "Internal",
    rawMaterialCost: 2.09, // 2.11 × 0.99/kg from Excel
    machineCost: 0.78, // From Excel
    totalPartCost: 2.87,
  },
  {
    id: "BOM-008",
    rfqId: "RFQ-2026-00481",
    part: "BUCKET",
    materialId: "MAT-006", // placeholder
    partId: "PRT-012", // Bucket - 9/16"-18UNF
    weight: 0.01,
    qty: 2,
    isStandard: true,
    process: "Bought-out",
    supplier: "Internal Stock",
    rawMaterialCost: 0,
    machineCost: 0,
    totalPartCost: 0.82, // 0.41 × 2 from Excel
  },
  {
    id: "BOM-009",
    rfqId: "RFQ-2026-00481",
    part: "PLUG",
    materialId: "MAT-006", // placeholder
    partId: "PRT-013", // Plug - 9/16"-18UNF
    weight: 0.01,
    qty: 2,
    isStandard: true,
    process: "Bought-out",
    supplier: "Internal Stock",
    rawMaterialCost: 0,
    machineCost: 0,
    totalPartCost: 0.16, // 0.08 × 2 from Excel
  },
  {
    id: "BOM-010",
    rfqId: "RFQ-2026-00481",
    part: "SEAL KIT",
    materialId: "MAT-003", // placeholder
    partId: "PRT-014", // Seal Kit from Excel
    weight: 0.02,
    qty: 1,
    isStandard: true,
    process: "Bought-out",
    supplier: "Trelleborg",
    rawMaterialCost: 0,
    machineCost: 0,
    totalPartCost: 2.19, // From Excel
  },
];

const costingOpsSeed: CostingOperation[] = [
  // TUBE operations
  { id: "COP-001", rfqId: "RFQ-2026-00481", bomItemId: "BOM-001", part: "TUBE", operation: "Cutting", machineId: "MCH-001", cycleTimeMin: 4, setupTimeMin: 10, qtyPerCycle: 1, ratePerMin: 8, totalTime: 4.42, totalCost: 35.3 },
  { id: "COP-002", rfqId: "RFQ-2026-00481", bomItemId: "BOM-001", part: "TUBE", operation: "Sizing & Facing", machineId: "MCH-002", cycleTimeMin: 8, setupTimeMin: 15, qtyPerCycle: 1, ratePerMin: 18, totalTime: 8.63, totalCost: 155.3 },
  { id: "COP-003", rfqId: "RFQ-2026-00481", bomItemId: "BOM-001", part: "TUBE", operation: "Honing", machineId: "MCH-005", cycleTimeMin: 12, setupTimeMin: 10, qtyPerCycle: 1, ratePerMin: 14, totalTime: 12.42, totalCost: 173.8 },
  // PISTON ROD operations
  { id: "COP-004", rfqId: "RFQ-2026-00481", bomItemId: "BOM-002", part: "PISTON ROD", operation: "Cutting", machineId: "MCH-001", cycleTimeMin: 3, setupTimeMin: 10, qtyPerCycle: 1, ratePerMin: 8, totalTime: 3.42, totalCost: 27.3 },
  { id: "COP-005", rfqId: "RFQ-2026-00481", bomItemId: "BOM-002", part: "PISTON ROD", operation: "OD Turning", machineId: "MCH-002", cycleTimeMin: 14, setupTimeMin: 15, qtyPerCycle: 1, ratePerMin: 18, totalTime: 14.63, totalCost: 263.3 },
  { id: "COP-006", rfqId: "RFQ-2026-00481", bomItemId: "BOM-002", part: "PISTON ROD", operation: "Threading", machineId: "MCH-002", cycleTimeMin: 6, setupTimeMin: 10, qtyPerCycle: 1, ratePerMin: 18, totalTime: 6.42, totalCost: 115.5 },
  // PISTON operations
  { id: "COP-007", rfqId: "RFQ-2026-00481", bomItemId: "BOM-003", part: "PISTON", operation: "Turning + Grooving", machineId: "MCH-002", cycleTimeMin: 10, setupTimeMin: 12, qtyPerCycle: 1, ratePerMin: 18, totalTime: 10.5, totalCost: 189.0 },
  // GLAND operations
  { id: "COP-008", rfqId: "RFQ-2026-00481", bomItemId: "BOM-004", part: "GLAND", operation: "Turning + Bore", machineId: "MCH-002", cycleTimeMin: 10, setupTimeMin: 12, qtyPerCycle: 1, ratePerMin: 18, totalTime: 10.5, totalCost: 189.0 },
  // END CAP operations
  { id: "COP-009", rfqId: "RFQ-2026-00481", bomItemId: "BOM-005", part: "END CAP", operation: "Turning + Weld Prep", machineId: "MCH-003", cycleTimeMin: 8, setupTimeMin: 10, qtyPerCycle: 1, ratePerMin: 12, totalTime: 8.42, totalCost: 101.0 },
  { id: "COP-010", rfqId: "RFQ-2026-00481", bomItemId: "BOM-005", part: "END CAP", operation: "Welding", machineId: "MCH-007", cycleTimeMin: 6, setupTimeMin: 8, qtyPerCycle: 1, ratePerMin: 10, totalTime: 6.33, totalCost: 63.3 },
  // ROD CLEVIS
  { id: "COP-011", rfqId: "RFQ-2026-00481", bomItemId: "BOM-006", part: "ROD CLEVIS", operation: "Turning + Drilling", machineId: "MCH-002", cycleTimeMin: 12, setupTimeMin: 10, qtyPerCycle: 1, ratePerMin: 18, totalTime: 12.42, totalCost: 223.5 },
  // BACK CLEVIS
  { id: "COP-012", rfqId: "RFQ-2026-00481", bomItemId: "BOM-007", part: "BACK CLEVIS", operation: "Turning + Drilling", machineId: "MCH-002", cycleTimeMin: 10, setupTimeMin: 10, qtyPerCycle: 1, ratePerMin: 18, totalTime: 10.42, totalCost: 187.5 },
  // ASSEMBLY operations
  { id: "COP-013", rfqId: "RFQ-2026-00481", bomItemId: "BOM-001", part: "ASSY", operation: "Assembly", machineId: "MCH-010", cycleTimeMin: 15, setupTimeMin: 0, qtyPerCycle: 1, ratePerMin: 8, totalTime: 15, totalCost: 120.0 },
  { id: "COP-014", rfqId: "RFQ-2026-00481", bomItemId: "BOM-001", part: "ASSY", operation: "Painting", machineId: "MCH-008", cycleTimeMin: 8, setupTimeMin: 10, qtyPerCycle: 4, ratePerMin: 6, totalTime: 2.42, totalCost: 14.5 },
  { id: "COP-015", rfqId: "RFQ-2026-00481", bomItemId: "BOM-001", part: "ASSY", operation: "Pressure Testing", machineId: "MCH-009", cycleTimeMin: 10, setupTimeMin: 5, qtyPerCycle: 1, ratePerMin: 12, totalTime: 10.21, totalCost: 122.5 },
];

const costingSummarySeed: CostingSummary[] = [
  {
    rfqId: "RFQ-2026-00481",
    qty: 24,
    rawMaterialCost: 16.70,
    machiningCost: 6.34,
    paintCost: 5.04,
    boughtOutCost: 3.17,
    subtotal: 31.25,
    overheadPct: 12,
    overheadCost: 3.75,
    rejectPct: 2.5,
    rejectCost: 0.78,
    costBeforeMargin: 35.78,
    marginPct: 18,
    marginCost: 6.44,
    unitPrice: 42.22,
    totalPrice: 1013.28,
  },
];

/* ─── Store Instances ─── */

export const rfqStore = new DataStore<RFQRecord>("rfqs", rfqSeed);
export const bomStore = new DataStore<BOMItem>("bom_items", bomSeed);
export const costingOpsStore = new DataStore<CostingOperation>("costing_ops", costingOpsSeed);

// CostingSummary needs id field, so we adapt
type CostingSummaryWithId = CostingSummary & { id: string };
const costingSummaryWithIds: CostingSummaryWithId[] = costingSummarySeed.map((s, i) => ({
  ...s,
  id: `CSUM-${String(i + 1).padStart(3, "0")}`,
}));
export const costingSummaryStore = new DataStore<CostingSummaryWithId>("costing_summaries", costingSummaryWithIds);

/* ─── Helpers ─── */

/** Get all BOM items for a specific RFQ */
export function getBOMForRFQ(rfqId: string): BOMItem[] {
  return bomStore.find(item => item.rfqId === rfqId);
}

/** Get all operations for a specific RFQ */
export function getOpsForRFQ(rfqId: string): CostingOperation[] {
  return costingOpsStore.find(op => op.rfqId === rfqId);
}

/** Get operations for a specific BOM item */
export function getOpsForBOMItem(bomItemId: string): CostingOperation[] {
  return costingOpsStore.find(op => op.bomItemId === bomItemId);
}

/** Get costing summary for a specific RFQ */
export function getCostingSummaryForRFQ(rfqId: string): CostingSummaryWithId | undefined {
  return costingSummaryStore.find(s => s.rfqId === rfqId)[0];
}
