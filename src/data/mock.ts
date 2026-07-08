/* ═══════════════════════════════════════════════════════════
   MOCK DATA — SeaHydrosys
   Based on real Excel costing sheet:
   "7008707_ BORE 2.5 X STROKE 180MM X ROD 1.5 ASSY.xlsx"

   NOTE: Master data is now sourced from @/data/masters.
   This file re-exports master data for backward compatibility
   and provides transactional/UI data.
   ═══════════════════════════════════════════════════════════ */

// Re-export master data stores for consistent access
export {
  masterData,
  clientStore,
  materialStore,
  rawMaterialStore,
  partStore,
  machineStore,
  processStore,
  costingParamStore,
} from "./masters";
export {
  rfqStore,
  bomStore,
  costingOpsStore,
  costingSummaryStore,
  getBOMForRFQ,
  getOpsForRFQ,
  getCostingSummaryForRFQ,
} from "./masters/transactions";
export {
  calcOperationCost,
  calcRawMaterialCost,
  calcBOMItemCost,
  calcCostingSummary,
  getMachineRate,
} from "./masters/calculations";
export type {
  Client,
  Material,
  RawMaterial,
  Part,
  Machine,
  Process,
  CostingParameter,
  BOMItem,
  CostingOperation,
  CostingSummary,
  RFQRecord,
  CylinderType,
} from "./masters";

/* ─── Types ─── */

export type RFQStatus =
  | "Received"
  | "BOM"
  | "Feasibility"
  | "Costing"
  | "Review"
  | "Drawings"
  | "Quoted"
  | "PO"
  /** @deprecated Merged into Received — use normalizeRfqStatus() */
  | "Evaluation"
  /** @deprecated Merged into Quoted */
  | "Sent"
  /** @deprecated Out of main pipeline; use PO */
  | "Procurement";

/** Maps legacy statuses onto the 8-stage sidebar pipeline */
export function normalizeRfqStatus(status: RFQStatus): RFQStatus {
  switch (status) {
    case "Evaluation":
      return "Received";
    case "Sent":
      return "Quoted";
    case "Procurement":
      return "PO";
    default:
      return status;
  }
}

export type Confidence = "high" | "medium" | "low";

export interface RFQ {
  id: string;
  client: string;
  sender: string;
  contactName?: string;
  assignedTo?: string;
  subject: string;
  category: string;
  qty: number;
  value: number;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: RFQStatus;
  owner: string;
  slaHrs: number;
  receivedAt: string;
  attachments: number;
  confidence: Confidence;
  region: string;
}

/* ─── Constants ─── */

export const TEAM_MEMBERS = [
  "Anita R.",
  "S. Patel",
  "K. Iyer",
  "M. Verma",
  "R. Kumar",
  "P. Singh",
];

export const WORK_CATEGORIES = [
  "Tie-Rod Cylinder",
  "Welded Cylinder",
  "Telescopic",
  "Mill-Type",
  "Long-Stroke",
  "Custom",
  "RFQ",
  "Revise Costing",
];

export const REGIONS = [
  "Northeast US",
  "Southeast US",
  "Midwest US",
  "Southwest US",
  "West Coast US",
  "International",
];

/* ─── Workflow Stages ─── */

/** RFQ Inbox → Quote: 20+75+60+90+35+45+35 = 360 min (6h) */
export const QUOTE_PIPELINE_SLA_MINUTES = 360;
export const QUOTE_PIPELINE_SLA_HRS = 6;

/** Eight pipeline stages — aligned with primary sidebar navigation */
export const WORKFLOW_STAGES: {
  key: RFQStatus;
  label: string;
  route: string;
  owner: string;
  sla: string;
}[] = [
  {
    key: "Received",
    label: "RFQ Inbox",
    route: "/rfq-inbox",
    owner: "Sales",
    sla: "2h",
  },
  {
    key: "BOM",
    label: "BOM & Parts",
    route: "/bom",
    owner: "Costing",
    sla: "4h",
  },
  {
    key: "Feasibility",
    label: "Feasibility & Availability",
    route: "/parallel-evaluation",
    owner: "Procurement",
    sla: "48h",
  },
  {
    key: "Costing",
    label: "Costing",
    route: "/costing",
    owner: "Costing",
    sla: "2h",
  },
  {
    key: "Review",
    label: "Internal Review",
    route: "/review",
    owner: "Sales + Mgmt",
    sla: "1h",
  },
  {
    key: "Drawings",
    label: "Proposal Drawings",
    route: "/drawings",
    owner: "Design",
    sla: "4h",
  },
  {
    key: "Quoted",
    label: "Quote Management",
    route: "/quotes",
    owner: "Sales",
    sla: "2h",
  },
  {
    key: "PO",
    label: "PO & Handoff",
    route: "/po-handoff",
    owner: "Sales",
    sla: "24h",
  },
];

// Alias for backward compat
export const PIPELINE_STAGES = WORKFLOW_STAGES;

/* ─── Active RFQs ─── */

export const RFQS: RFQ[] = [
  {
    id: "RFQ-2026-00481",
    client: "Armadillo Group",
    sender: "dustin.d@armadillogroup.com.au",
    contactName: "Dustin",
    subject:
      'Hydraulic cylinders for deck crane — Bore 2.5" × Stroke 180mm × Rod 1.5" — Qty 24',
    category: "Tie-Rod Cylinder",
    qty: 24,
    value: 184000,
    priority: "High",
    status: "Received",
    owner: "Anita R.",
    slaHrs: QUOTE_PIPELINE_SLA_HRS,
    receivedAt: "2026-05-22 09:14",
    attachments: 4,
    confidence: "high",
    region: "IN-West",
  },
  {
    id: "RFQ-2026-00480",
    client: "Larsen & Toubro Heavy Eng.",
    sender: "peter@lnt.com",
    contactName: "Peter",
    subject: "Welded cylinders — offshore platform",
    category: "Welded Cylinder",
    qty: 8,
    value: 412500,
    priority: "Critical",
    status: "PO",
    owner: "S. Patel",
    slaHrs: 1.4,
    receivedAt: "2026-05-13 08:01",
    attachments: 6,
    confidence: "medium",
    region: "IN-South",
  },
  {
    id: "RFQ-2026-00479",
    client: "Wilhelmsen Marine AS",
    sender: "thomas@wilhelmsenmarine.no",
    contactName: "Thomas",
    subject: "Telescopic cylinders — tug vessel",
    category: "Telescopic",
    qty: 12,
    value: 268900,
    priority: "High",
    status: "Feasibility",
    owner: "K. Iyer",
    slaHrs: 6.0,
    receivedAt: "2026-05-12 17:42",
    attachments: 3,
    confidence: "low",
    region: "EU-North",
  },
  {
    id: "RFQ-2026-00478",
    client: "Adani Ports",
    sender: "dustin@adaniports.com",
    contactName: "Dustin",
    subject: "Mill-type cylinders — quay crane",
    category: "Mill-Type",
    qty: 16,
    value: 198400,
    priority: "Medium",
    status: "BOM",
    owner: "Anita R.",
    slaHrs: 2.1,
    receivedAt: "2026-05-12 14:20",
    attachments: 2,
    confidence: "high",
    region: "IN-West",
  },
  {
    id: "RFQ-2026-00477",
    client: "Cochin Shipyard",
    sender: "peter@cochinshipyard.in",
    contactName: "Peter",
    subject: "Steering gear cylinder revision r2",
    category: "Welded Cylinder",
    qty: 6,
    value: 92800,
    priority: "High",
    status: "Feasibility",
    owner: "S. Patel",
    slaHrs: 4.0,
    receivedAt: "2026-05-12 11:08",
    attachments: 5,
    confidence: "medium",
    region: "IN-South",
  },
  {
    id: "RFQ-2026-00476",
    client: "Bharat Heavy Electricals",
    sender: "dustin@bhel.in",
    contactName: "Dustin",
    subject: "Tie-rod cylinder — turbine bay",
    category: "Tie-Rod Cylinder",
    qty: 30,
    value: 224000,
    priority: "Medium",
    status: "Review",
    owner: "M. Verma",
    slaHrs: 8.2,
    receivedAt: "2026-05-12 09:55",
    attachments: 2,
    confidence: "high",
    region: "IN-North",
  },
  {
    id: "RFQ-2026-00475",
    client: "Reliance Industries",
    sender: "peter@ril.com",
    contactName: "Peter",
    subject: "Long-stroke cylinders — refinery",
    category: "Long-Stroke",
    qty: 4,
    value: 312700,
    priority: "Critical",
    status: "Received",
    owner: "Anita R.",
    slaHrs: 0.5,
    receivedAt: "2026-05-12 08:14",
    attachments: 7,
    confidence: "high",
    region: "IN-West",
  },
  {
    id: "RFQ-2026-00474",
    client: "Damen Shipyards",
    sender: "rfq@damen.com",
    contactName: "Peter",
    subject: "Custom hatch cover cylinders",
    category: "Custom",
    qty: 10,
    value: 158300,
    priority: "Medium",
    status: "Received",
    owner: "K. Iyer",
    slaHrs: 12,
    receivedAt: "2026-05-11 16:31",
    attachments: 4,
    confidence: "medium",
    region: "EU-West",
  },
  {
    id: "RFQ-2026-00473",
    client: "JSW Steel",
    sender: "dustin@jsw.in",
    contactName: "Dustin",
    subject: "Mill-type ram replacement — line 4",
    category: "Mill-Type",
    qty: 2,
    value: 78900,
    priority: "Low",
    status: "Received",
    owner: "M. Verma",
    slaHrs: 24,
    receivedAt: "2026-05-11 14:02",
    attachments: 3,
    confidence: "high",
    region: "IN-South",
  },
  {
    id: "RFQ-2026-00472",
    client: "Tata Steel",
    sender: "dustin@tatasteel.com",
    contactName: "Dustin",
    subject: "Slab caster cylinders — 6-set",
    category: "Welded Cylinder",
    qty: 6,
    value: 196500,
    priority: "High",
    status: "PO",
    owner: "S. Patel",
    slaHrs: 36,
    receivedAt: "2026-05-11 10:18",
    attachments: 5,
    confidence: "high",
    region: "IN-East",
  },
];

/* ─── KPI Metrics ─── */

export const KPIS = [
  {
    label: "Total RFQs (MTD)",
    value: "284",
    delta: "+12.4%",
    trend: "up" as const,
    hint: "vs last month",
  },
  {
    label: "Conversion Ratio",
    value: "37.6%",
    delta: "+2.1pp",
    trend: "up" as const,
    hint: "Quote → PO",
  },
  {
    label: "Active Quotes",
    value: "62",
    delta: "+8",
    trend: "up" as const,
    hint: "in pipeline",
  },
  {
    label: "Avg Response Time",
    value: "5.4h",
    delta: "-1.2h",
    trend: "up" as const,
    hint: "RFQ → first quote",
  },
  {
    label: "Procurement Delays",
    value: "9",
    delta: "+3",
    trend: "down" as const,
    hint: "vendor SLA breach",
  },
  {
    label: "Pending Approvals",
    value: "14",
    delta: "—",
    trend: "flat" as const,
    hint: "across roles",
  },
  {
    label: "Revenue Pipeline",
    value: "$4.82M",
    delta: "+11.7%",
    trend: "up" as const,
    hint: "weighted",
  },
  {
    label: "SLA Violations",
    value: "3",
    delta: "-2",
    trend: "up" as const,
    hint: "last 24h",
  },
];

/* ─── AI Insights ─── */

export const AI_INSIGHTS = [
  {
    type: "risk",
    title: "RFQ-00479 — Low confidence on tolerance",
    desc: "Wilhelmsen Marine: tolerance H8/f7 inferred from text. Recommend designer review.",
    severity: "high" as const,
  },
  {
    type: "anomaly",
    title: "Material cost anomaly detected",
    desc: "CK45-Hard Chrome rod material quoted 18% above 6-month median by Vendor V-204.",
    severity: "medium" as const,
  },
  {
    type: "margin",
    title: "Margin warning — RFQ-00481",
    desc: "Current margin 11.2% vs target 18%. Suggest re-pricing machining ops.",
    severity: "high" as const,
  },
  {
    type: "delay",
    title: "Procurement delay risk",
    desc: "L&T RFQ blocked 36h on alternate vendor sourcing for seamless tube 219mm.",
    severity: "high" as const,
  },
  {
    type: "mapping",
    title: "Missing material mapping",
    desc: "'CK-45 equivalent' unmapped. 4 RFQs affected — update Materials Master.",
    severity: "medium" as const,
  },
  {
    type: "pattern",
    title: "Frequently revised RFQ",
    desc: "Cochin Shipyard RFQ has 3 revisions in 5 days. Suggest scoping call.",
    severity: "low" as const,
  },
];

/* ─── BOM — Real Excel data: Bore 2.5" × Stroke 180mm × Rod 1.5" ─── */

export const BOM_ROWS = [
  {
    part: "TUBE",
    matId: "ST 52",
    od: 76.2,
    id: 63.5,
    thk: 6.35,
    len: 280,
    weight: 2.64,
    supplier: "Jindal Tubes",
    rmRef: "Circular Bar",
    costKg: 85,
    qty: 1,
    process: "Honing + Sizing",
    standard: false,
    avail: "In Stock",
    conf: "high" as Confidence,
  },
  {
    part: "PISTON ROD",
    matId: "CK45-HARD CHROME",
    od: 38.1,
    id: 0,
    thk: 0,
    len: 320,
    weight: 2.88,
    supplier: "Mukand Steel",
    rmRef: "Circular Bar",
    costKg: 120,
    qty: 1,
    process: "Turning + Hard Chrome",
    standard: false,
    avail: "4 wk lead",
    conf: "high" as Confidence,
  },
  {
    part: "PISTON",
    matId: "EN8",
    od: 63.0,
    id: 38.1,
    thk: 35,
    len: 0,
    weight: 0.52,
    supplier: "Internal",
    rmRef: "Circular Bar",
    costKg: 75,
    qty: 1,
    process: "Turning + Grooving",
    standard: false,
    avail: "In Stock",
    conf: "high" as Confidence,
  },
  {
    part: "GLAND",
    matId: "EN8",
    od: 63.0,
    id: 38.1,
    thk: 30,
    len: 0,
    weight: 0.44,
    supplier: "Internal",
    rmRef: "Circular Bar",
    costKg: 75,
    qty: 1,
    process: "Turning + Bore",
    standard: false,
    avail: "In Stock",
    conf: "high" as Confidence,
  },
  {
    part: "END CAP",
    matId: "ASTM A36",
    od: 76.2,
    id: 0,
    thk: 20,
    len: 0,
    weight: 0.72,
    supplier: "Internal",
    rmRef: "Flat",
    costKg: 65,
    qty: 1,
    process: "Turning + Bore + Weld Prep",
    standard: false,
    avail: "In Stock",
    conf: "medium" as Confidence,
  },
  {
    part: "ROD CLEVIS",
    matId: "ASTM A536 65-45-12",
    od: 50,
    id: 20,
    thk: 0,
    len: 60,
    weight: 0.68,
    supplier: "Internal",
    rmRef: "Circular Bar",
    costKg: 95,
    qty: 1,
    process: "Turning + Drilling",
    standard: false,
    avail: "In Stock",
    conf: "high" as Confidence,
  },
  {
    part: "BACK CLEVIS",
    matId: "ASTM A536 65-45-12",
    od: 50,
    id: 20,
    thk: 0,
    len: 55,
    weight: 0.62,
    supplier: "Internal",
    rmRef: "Circular Bar",
    costKg: 95,
    qty: 1,
    process: "Turning + Drilling",
    standard: false,
    avail: "In Stock",
    conf: "high" as Confidence,
  },
  {
    part: "SEAL KIT",
    matId: "PU + NBR",
    od: 0,
    id: 63.5,
    thk: 0,
    len: 0,
    weight: 0.05,
    supplier: "Trelleborg",
    rmRef: "STD-SEAL-63",
    costKg: 0,
    qty: 1,
    process: "—",
    standard: true,
    avail: "Stock",
    conf: "high" as Confidence,
  },
  {
    part: "WEAR RING",
    matId: "PTFE Bronze",
    od: 63,
    id: 60,
    thk: 1.5,
    len: 0,
    weight: 0.02,
    supplier: "Trelleborg",
    rmRef: "STD-WR-63",
    costKg: 0,
    qty: 2,
    process: "—",
    standard: true,
    avail: "Stock",
    conf: "high" as Confidence,
  },
];

/* ─── Material Master (from Excel) ─── */

export const MATERIAL_MASTER = [
  {
    name: "ST 52",
    density: 7850,
    costKg: 85,
    type: "Seamless Tube",
    cylinders: ["Tie-Rod", "Welded"],
  },
  {
    name: "CK45-HARD CHROME",
    density: 7850,
    costKg: 120,
    type: "Chrome Rod",
    cylinders: ["Tie-Rod", "Telescopic", "Welded"],
  },
  {
    name: "ASTM A36",
    density: 7850,
    costKg: 65,
    type: "Mild Steel",
    cylinders: ["All"],
  },
  {
    name: "ASTM A536 65-45-12",
    density: 7100,
    costKg: 95,
    type: "Ductile Iron",
    cylinders: ["Tie-Rod", "Mill-Type"],
  },
  {
    name: "EN8",
    density: 7850,
    costKg: 75,
    type: "Carbon Steel",
    cylinders: ["All"],
  },
  {
    name: "EN19",
    density: 7850,
    costKg: 110,
    type: "Alloy Steel",
    cylinders: ["Tie-Rod", "Long-Stroke"],
  },
  {
    name: "EN24",
    density: 7850,
    costKg: 130,
    type: "High-Tensile",
    cylinders: ["Long-Stroke", "Custom"],
  },
  {
    name: "EN1A",
    density: 7850,
    costKg: 70,
    type: "Free Cutting",
    cylinders: ["Tie-Rod"],
  },
];

/* ─── Machine Master (from Excel) ─── */

export const MACHINE_MASTER = [
  {
    name: "Circular Saw CS-300",
    type: "Cutting",
    costMin: 8,
    capacity: "Ø300mm max",
  },
  {
    name: "CNC Lathe DX-200",
    type: "Turning",
    costMin: 18,
    capacity: "Ø200 × 600mm",
  },
  {
    name: "Lathe HMT-1",
    type: "Turning",
    costMin: 12,
    capacity: "Ø150 × 400mm",
  },
  {
    name: "Boring Mill BM-3",
    type: "Boring",
    costMin: 15,
    capacity: "Ø200 × 800mm",
  },
  { name: "VMC-650", type: "Milling", costMin: 22, capacity: "650×400×500" },
  { name: "Honing-H1", type: "Honing", costMin: 14, capacity: "Ø20–150mm" },
  { name: "MIG-W4", type: "Welding", costMin: 10, capacity: "300A" },
  { name: "Spray Booth", type: "Painting", costMin: 6, capacity: "3m × 2m" },
  { name: "Test Rig HT-2", type: "Testing", costMin: 12, capacity: "350 bar" },
  { name: "Assy Bench", type: "Assembly", costMin: 8, capacity: "Manual" },
];

/* ─── Machining Operations — Real Excel (Bore 2.5" cylinder) ─── */

export const COSTING_OPS = [
  {
    part: "TUBE",
    op: "Cutting",
    machine: "Circular Saw CS-300",
    cycle: 4,
    setup: 10,
    qtyCycle: 1,
    rate: 8,
    total: 42,
  },
  {
    part: "TUBE",
    op: "Sizing & Facing",
    machine: "CNC Lathe DX-200",
    cycle: 8,
    setup: 15,
    qtyCycle: 1,
    rate: 18,
    total: 159,
  },
  {
    part: "TUBE",
    op: "Honing",
    machine: "Honing-H1",
    cycle: 12,
    setup: 10,
    qtyCycle: 1,
    rate: 14,
    total: 178,
  },
  {
    part: "PISTON ROD",
    op: "Cutting",
    machine: "Circular Saw CS-300",
    cycle: 3,
    setup: 10,
    qtyCycle: 1,
    rate: 8,
    total: 34,
  },
  {
    part: "PISTON ROD",
    op: "OD Turning",
    machine: "CNC Lathe DX-200",
    cycle: 14,
    setup: 15,
    qtyCycle: 1,
    rate: 18,
    total: 267,
  },
  {
    part: "PISTON ROD",
    op: "Threading",
    machine: "CNC Lathe DX-200",
    cycle: 6,
    setup: 10,
    qtyCycle: 1,
    rate: 18,
    total: 118,
  },
  {
    part: "PISTON",
    op: "Turning + Grooving",
    machine: "CNC Lathe DX-200",
    cycle: 10,
    setup: 12,
    qtyCycle: 1,
    rate: 18,
    total: 192,
  },
  {
    part: "GLAND",
    op: "Turning + Bore",
    machine: "CNC Lathe DX-200",
    cycle: 10,
    setup: 12,
    qtyCycle: 1,
    rate: 18,
    total: 192,
  },
  {
    part: "END CAP",
    op: "Turning + Weld Prep",
    machine: "Lathe HMT-1",
    cycle: 8,
    setup: 10,
    qtyCycle: 1,
    rate: 12,
    total: 106,
  },
  {
    part: "END CAP",
    op: "Welding",
    machine: "MIG-W4",
    cycle: 6,
    setup: 8,
    qtyCycle: 1,
    rate: 10,
    total: 68,
  },
  {
    part: "ROD CLEVIS",
    op: "Turning + Drilling",
    machine: "CNC Lathe DX-200",
    cycle: 12,
    setup: 10,
    qtyCycle: 1,
    rate: 18,
    total: 226,
  },
  {
    part: "BACK CLEVIS",
    op: "Turning + Drilling",
    machine: "CNC Lathe DX-200",
    cycle: 10,
    setup: 10,
    qtyCycle: 1,
    rate: 18,
    total: 190,
  },
  {
    part: "ASSY",
    op: "Assembly",
    machine: "Assy Bench",
    cycle: 15,
    setup: 0,
    qtyCycle: 1,
    rate: 8,
    total: 120,
  },
  {
    part: "ASSY",
    op: "Painting",
    machine: "Spray Booth",
    cycle: 8,
    setup: 10,
    qtyCycle: 4,
    rate: 6,
    total: 63,
  },
  {
    part: "ASSY",
    op: "Pressure Testing",
    machine: "Test Rig HT-2",
    cycle: 10,
    setup: 5,
    qtyCycle: 1,
    rate: 12,
    total: 125,
  },
];

/* ─── Paint Cost Breakdown (from Excel) ─── */

export const PAINT_COSTS = [
  { item: "Tank Setup Cost", cost: 12.5 },
  { item: "Paint & Thinner", cost: 28.4 },
  { item: "Painter & Helper Labour", cost: 18.0 },
  { item: "Power Cost", cost: 6.2 },
  { item: "Chemical Cost", cost: 4.8 },
  { item: "DM Water Cost", cost: 2.1 },
];

/* ─── Costing Summary (derived from Excel) ─── */

export const COSTING_SUMMARY = {
  rmCost: 14, // sum of weight * costKg for all parts
  machiningCost: 10, // sum of all ops
  paintCost: 3,
  boughtOut: 2, // seal kit + wear rings
  overheadPct: 12,
  rejectPct: 2.5,
  marginPct: 18,
  get subtotal() {
    return this.rmCost + this.machiningCost + this.paintCost + this.boughtOut;
  },
  get overhead() {
    return Math.round((this.subtotal * this.overheadPct) / 100);
  },
  get rejectCost() {
    return Math.round((this.subtotal * this.rejectPct) / 100);
  },
  get costBeforeMargin() {
    return this.subtotal + this.overhead + this.rejectCost;
  },
  get margin() {
    return Math.round((this.costBeforeMargin * this.marginPct) / 100);
  },
  get unitPrice() {
    return this.costBeforeMargin + this.margin;
  },
};

/* ─── Procurement ─── */

export type ProcurementStatus =
  | "Pending"
  | "Vendor RFQ Sent"
  | "Price Received"
  | "Alternate Vendor Required"
  | "RM Approved";

export interface ProcurementRow {
  itemType: "raw-material" | "part" | "service";
  partName: string; // BOM part name (e.g. "TUBE", "PISTON ROD")
  material: string; // material / part description
  spec: string; // spec string
  qtyNeeded: number; // qty for this RFQ
  unit: string; // "kg" | "pcs" | "lot"
  supplier: string;
  supplierEmail: string;
  availability: string;
  moq: number;
  leadDays: number;
  price: number;
  basePrice?: number;
  supplierQuote?: number;
  altQuote?: number;
  alt: string;
  altEmail: string;
  altLeadDays?: number;
  rfqSentTo?: string[];
  approvedSupplier?: string;
  status: ProcurementStatus;
  flag: boolean;
  lastQuotedPrice?: number;
  masterRef?: string; // RM-xxx or PRT-xxx
  masterUpdated?: boolean;
}

export const PROCUREMENT_ROWS: ProcurementRow[] = [
  {
    itemType: "raw-material",
    partName: "TUBE",
    material: "ST 52 Seamless Tube Ø76.2",
    spec: "ST-52.3 Ø76.2 × t6.35, L=283mm",
    qtyNeeded: 24,
    unit: "pcs",
    supplier: "Jindal Tubes",
    supplierEmail: "sales@jindaltubes.com",
    availability: "In Stock",
    moq: 50,
    leadDays: 7,
    price: 85,
    basePrice: 85,
    supplierQuote: 85,
    altQuote: 87,
    alt: "Maharashtra Seamless",
    altEmail: "orders@msl.co.in",
    altLeadDays: 11,
    status: "Pending",
    flag: false,
    lastQuotedPrice: 82,
    masterRef: "RM-001",
  },
  {
    itemType: "raw-material",
    partName: "PISTON ROD",
    material: "CK45-Hard Chrome Rod Ø38.1",
    spec: "CK45-HC Rod Ø38.1 f7, L=320mm",
    qtyNeeded: 24,
    unit: "pcs",
    supplier: "Mukand Steel",
    supplierEmail: "procurement@mukand.com",
    availability: "4 wk lead",
    moq: 100,
    leadDays: 28,
    price: 120,
    basePrice: 120,
    supplierQuote: 120,
    altQuote: 117,
    alt: "Sunflag Iron",
    altEmail: "rfq@sunflag.in",
    altLeadDays: 21,
    status: "Alternate Vendor Required",
    flag: true,
    masterRef: "RM-003",
  },
  {
    itemType: "raw-material",
    partName: "CLEVIS",
    material: "ASTM A536 Ductile Iron Bar",
    spec: "ASTM A536 DI Ø80, L=65mm",
    qtyNeeded: 48,
    unit: "pcs",
    supplier: "Saru Foundry",
    supplierEmail: "sales@sarufoundry.com",
    availability: "Stock",
    moq: 10,
    leadDays: 5,
    price: 95,
    basePrice: 95,
    supplierQuote: 95,
    altQuote: 98,
    alt: "Bharat Forge",
    altEmail: "purchase@bharatforge.com",
    altLeadDays: 8,
    status: "Price Received",
    flag: false,
    lastQuotedPrice: 92,
    masterRef: "RM-005",
  },
  {
    itemType: "part",
    partName: "SEAL KIT",
    material: "PU Rod Seal Set Ø63.5",
    spec: "Rod seal + wiper + O-ring, Ø63.5",
    qtyNeeded: 24,
    unit: "pcs",
    supplier: "Trelleborg",
    supplierEmail: "india@trelleborg.com",
    availability: "Stock",
    moq: 25,
    leadDays: 3,
    price: 85,
    basePrice: 85,
    supplierQuote: 85,
    altQuote: 82,
    alt: "SKF / Hallite",
    altEmail: "seals@skf.com",
    altLeadDays: 6,
    status: "RM Approved",
    flag: false,
    masterRef: "PRT-003",
    approvedSupplier: "Trelleborg",
    rfqSentTo: ["Trelleborg", "SKF / Hallite"],
  },
  {
    itemType: "service",
    partName: "PISTON ROD",
    material: "Hard Chrome Plating service",
    spec: "25µm HC plating, Ø38.1 rods × 24 nos",
    qtyNeeded: 24,
    unit: "pcs",
    supplier: "ChromePro",
    supplierEmail: "jobs@chromepro.in",
    availability: "Booked",
    moq: 1,
    leadDays: 5,
    price: 45,
    basePrice: 45,
    supplierQuote: 45,
    altQuote: 48,
    alt: "Surftech",
    altEmail: "enquiry@surftech.co.in",
    altLeadDays: 9,
    status: "Vendor RFQ Sent",
    flag: false,
  },
  {
    itemType: "raw-material",
    partName: "PISTON / GLAND",
    material: "EN8 Round Bar Ø63",
    spec: "EN8 Ø63 bright bar, L=6000mm",
    qtyNeeded: 48,
    unit: "pcs",
    supplier: "Internal Stock",
    supplierEmail: "",
    availability: "Stock",
    moq: 1,
    leadDays: 0,
    price: 75,
    basePrice: 75,
    supplierQuote: 75,
    altQuote: 74,
    alt: "—",
    altEmail: "",
    altLeadDays: 0,
    status: "RM Approved",
    flag: false,
    masterRef: "RM-006",
    approvedSupplier: "Internal Stock",
    rfqSentTo: ["Internal Stock"],
  },
];

/* ─── Feasibility Checks ─── */

export const FEASIBILITY_CHECKS = [
  {
    check: "Bore 63.5mm manufacturability",
    result: "OK" as const,
    detail: "Within CNC lathe DX-200 capacity (Ø200mm max)",
    owner: "Manufacturing",
  },
  {
    check: "Machine capability — Honing",
    result: "OK" as const,
    detail: "Honing-H1 supports Ø20–150mm bore range",
    owner: "Manufacturing",
  },
  {
    check: "Tolerance H8/f7 achievable",
    result: "OK" as const,
    detail: "Standard ISO fit for hydraulic cylinders. CNC capable.",
    owner: "Design",
  },
  {
    check: "Material availability — CK45-HC",
    result: "Warning" as const,
    detail: "4 week lead time from Mukand. Consider alternate supplier.",
    owner: "Procurement",
  },
  {
    check: "Welding — End cap to tube",
    result: "OK" as const,
    detail: "MIG weld per WPS-042. Standard procedure.",
    owner: "Manufacturing",
  },
  {
    check: "Hard chrome — Rod plating",
    result: "OK" as const,
    detail: "25µm thickness. ChromePro slot available week 22.",
    owner: "Procurement",
  },
  {
    check: "Clevis design — ASTM A536",
    result: "Warning" as const,
    detail:
      "Ductile iron clevis — verify impact strength at -20°C for marine duty.",
    owner: "Design",
  },
  {
    check: "Class society compliance",
    result: "Blocker" as const,
    detail:
      "LR/DNV material cert 3.1 required. Confirm with customer which class.",
    owner: "Sales",
  },
];

/* ─── Notifications ─── */

export const NOTIFICATIONS = [
  {
    kind: "sla",
    text: "SLA breach risk — RFQ-00480 procurement at 1.4h to deadline",
    time: "12m ago",
    severity: "high" as const,
  },
  {
    kind: "assigned",
    text: "RFQ-00481 assigned to you for costing review",
    time: "32m ago",
    severity: "low" as const,
  },
  {
    kind: "approval",
    text: "Quote QT-2026-2210 awaiting Management approval",
    time: "1h ago",
    severity: "medium" as const,
  },
  {
    kind: "procurement",
    text: "Vendor Mukand Steel responded — CK45-HC Ø38.1 lead 4w",
    time: "2h ago",
    severity: "medium" as const,
  },
  {
    kind: "ai",
    text: "Low AI confidence on clevis material for RFQ-00479",
    time: "3h ago",
    severity: "medium" as const,
  },
  {
    kind: "revision",
    text: "Revision r3 requested by Cochin Shipyard on RFQ-00477",
    time: "5h ago",
    severity: "high" as const,
  },
  {
    kind: "approved",
    text: "Quote QT-2026-2204 approved by Reliance Industries",
    time: "yesterday",
    severity: "low" as const,
  },
];

/* ─── Audit Logs ─── */

export const AUDIT_LOGS = [
  {
    ts: "2026-05-13 09:42",
    actor: "Anita R.",
    role: "Costing",
    action: "Updated machining rate",
    target: "RFQ-00481 / OD Turning",
    before: "$16/min",
    after: "$18/min",
  },
  {
    ts: "2026-05-13 09:21",
    actor: "AI Parser",
    role: "System",
    action: "Extracted RFQ fields",
    target: "RFQ-00481",
    before: "—",
    after: "12 fields, conf 0.94",
  },
  {
    ts: "2026-05-13 08:08",
    actor: "S. Patel",
    role: "Procurement",
    action: "Sent vendor RFQ",
    target: "CK45-HC Ø38.1 → Mukand Steel",
    before: "—",
    after: "Awaiting price",
  },
  {
    ts: "2026-05-13 07:55",
    actor: "K. Iyer",
    role: "Design",
    action: "Flagged feasibility issue",
    target: "RFQ-00479 / Clevis material",
    before: "—",
    after: "Severity: Warning",
  },
  {
    ts: "2026-05-12 18:14",
    actor: "M. Verma",
    role: "Management",
    action: "Approved quote",
    target: "QT-2026-2204",
    before: "Pending",
    after: "Approved",
  },
];

/* ─── Roles ─── */

export const NAV_ROLES = [
  "Sales",
  "Costing",
  "Design",
  "Procurement",
  "Manufacturing",
  "Management",
  "Admin",
] as const;

/* ─── Client Master ─── */

export const CLIENT_MASTER = [
  {
    name: "Mahindra Marine",
    region: "IN-West",
    contact: "procurement@mahindramarine.com",
    rfqs: 42,
    conversionRate: "44%",
    since: "2019",
  },
  {
    name: "Larsen & Toubro",
    region: "IN-South",
    contact: "rfq@lnt.com",
    rfqs: 68,
    conversionRate: "38%",
    since: "2016",
  },
  {
    name: "Reliance Industries",
    region: "IN-West",
    contact: "epc.proc@ril.com",
    rfqs: 31,
    conversionRate: "52%",
    since: "2021",
  },
  {
    name: "Tata Steel",
    region: "IN-East",
    contact: "buy@tatasteel.com",
    rfqs: 55,
    conversionRate: "41%",
    since: "2018",
  },
  {
    name: "Cochin Shipyard",
    region: "IN-South",
    contact: "rfq@cochinshipyard.in",
    rfqs: 28,
    conversionRate: "35%",
    since: "2020",
  },
  {
    name: "BHEL",
    region: "IN-North",
    contact: "p1@bhel.in",
    rfqs: 37,
    conversionRate: "29%",
    since: "2017",
  },
  {
    name: "Adani Ports",
    region: "IN-West",
    contact: "buying@adaniports.com",
    rfqs: 19,
    conversionRate: "47%",
    since: "2022",
  },
];

/* ─── Process Master ─── */

export const PROCESS_MASTER = [
  {
    name: "Cutting",
    type: "Subtractive",
    defaultMachine: "Circular Saw CS-300",
    avgCycle: 5,
  },
  {
    name: "Turning",
    type: "Subtractive",
    defaultMachine: "CNC Lathe DX-200",
    avgCycle: 12,
  },
  {
    name: "Boring",
    type: "Subtractive",
    defaultMachine: "Boring Mill BM-3",
    avgCycle: 18,
  },
  {
    name: "Honing",
    type: "Finishing",
    defaultMachine: "Honing-H1",
    avgCycle: 14,
  },
  {
    name: "Drilling",
    type: "Subtractive",
    defaultMachine: "VMC-650",
    avgCycle: 10,
  },
  { name: "Welding", type: "Joining", defaultMachine: "MIG-W4", avgCycle: 8 },
  {
    name: "Painting",
    type: "Finishing",
    defaultMachine: "Spray Booth",
    avgCycle: 10,
  },
  {
    name: "Assembly",
    type: "Assembly",
    defaultMachine: "Assy Bench",
    avgCycle: 15,
  },
  {
    name: "Testing",
    type: "QA",
    defaultMachine: "Test Rig HT-2",
    avgCycle: 12,
  },
  {
    name: "Hard Chrome Plating",
    type: "Outsourced",
    defaultMachine: "—",
    avgCycle: 0,
  },
];

/* ─── Parts Extraction — Types ─── */

export type ExtractionSource =
  | "Drawing"
  | "Email Text"
  | "AI Inferred"
  | "Master Data";
export type CompletenessStatus = "complete" | "review" | "missing";

export interface PartExtractionRow {
  part: string;
  cylinderType: string;
  matId: string;
  od: number | null;
  id: number | null;
  thk: number | null;
  len: number | null;
  weight: number;
  qty: number;
  rmRef: string;
  standard: boolean;
  process: string;
  source: ExtractionSource;
  conf: Confidence;
  status: CompletenessStatus;
  missingFields: string[];
}

export interface ClarificationItem {
  id: string;
  part: string;
  field: string;
  issue: string;
  conf: Confidence;
  status: "pending" | "sent" | "received" | "resolved";
}

/* ─── Parts Extraction Data — Bore 2.5" × Stroke 180mm × Rod 1.5" (no cost, from drawing/xlsx) ─── */

export const PARTS_EXTRACTION: PartExtractionRow[] = [
  {
    part: "TUBE",
    cylinderType: "Tie-Rod",
    matId: "ST 52",
    od: 76.2,
    id: 63.5,
    thk: 6.35,
    len: 280,
    weight: 2.64,
    qty: 1,
    rmRef: "Seamless Tube Ø76.2 × t6.35",
    standard: false,
    process: "Honing + Sizing",
    source: "Drawing",
    conf: "high",
    status: "complete",
    missingFields: [],
  },
  {
    part: "PISTON ROD",
    cylinderType: "Tie-Rod",
    matId: "CK45-Hard Chrome",
    od: 38.1,
    id: null,
    thk: null,
    len: 320,
    weight: 2.88,
    qty: 1,
    rmRef: "Chrome Rod Ø38.1",
    standard: false,
    process: "Turning + Hard Chrome",
    source: "Drawing",
    conf: "high",
    status: "review",
    missingFields: [
      "Hard chrome plating thickness not specified on drawing (assumed 25µm)",
    ],
  },
  {
    part: "PISTON",
    cylinderType: "Tie-Rod",
    matId: "EN8",
    od: 63.0,
    id: 38.1,
    thk: 35,
    len: null,
    weight: 0.52,
    qty: 1,
    rmRef: "Round Bar Ø63",
    standard: false,
    process: "Turning + Grooving",
    source: "Drawing",
    conf: "medium",
    status: "review",
    missingFields: ["Material grade EN8 vs EN9 — confirm from customer"],
  },
  {
    part: "GLAND",
    cylinderType: "Tie-Rod",
    matId: "EN8",
    od: 63.0,
    id: 38.1,
    thk: 30,
    len: null,
    weight: 0.44,
    qty: 1,
    rmRef: "Round Bar Ø63",
    standard: false,
    process: "Turning + Bore",
    source: "Drawing",
    conf: "medium",
    status: "review",
    missingFields: ["Surface finish Ra value not specified on drawing"],
  },
  {
    part: "END CAP",
    cylinderType: "Tie-Rod",
    matId: "ASTM A36",
    od: 76.2,
    id: null,
    thk: 20,
    len: null,
    weight: 0.72,
    qty: 1,
    rmRef: "Flat Bar 76.2 × 20",
    standard: false,
    process: "Turning + Weld Prep",
    source: "Drawing",
    conf: "medium",
    status: "review",
    missingFields: ["Weld class / AWS standard not specified"],
  },
  {
    part: "ROD CLEVIS",
    cylinderType: "Tie-Rod",
    matId: "ASTM A536 GR.65-45-12",
    od: 50,
    id: 20,
    thk: null,
    len: 60,
    weight: 0.68,
    qty: 1,
    rmRef: "DI Bar Ø50",
    standard: false,
    process: "Turning + Drilling",
    source: "Drawing",
    conf: "high",
    status: "complete",
    missingFields: [],
  },
  {
    part: "BACK CLEVIS",
    cylinderType: "Tie-Rod",
    matId: "ASTM A536 GR.65-45-12",
    od: 50,
    id: 20,
    thk: null,
    len: 55,
    weight: 0.62,
    qty: 1,
    rmRef: "DI Bar Ø50",
    standard: false,
    process: "Turning + Drilling",
    source: "Drawing",
    conf: "high",
    status: "complete",
    missingFields: [],
  },
  {
    part: "SEAL KIT",
    cylinderType: "Tie-Rod",
    matId: "PU + NBR",
    od: null,
    id: 63.5,
    thk: null,
    len: null,
    weight: 0.05,
    qty: 1,
    rmRef: "STD-SEAL-63.5",
    standard: true,
    process: "Bought-out",
    source: "Master Data",
    conf: "medium",
    status: "missing",
    missingFields: [
      "Operating pressure not specified (assumed 160 bar)",
      "Fluid temperature range not specified (assumed -20°C to +80°C)",
    ],
  },
  {
    part: "WEAR RING",
    cylinderType: "Tie-Rod",
    matId: "PTFE Bronze",
    od: 63,
    id: 60,
    thk: 1.5,
    len: null,
    weight: 0.02,
    qty: 2,
    rmRef: "STD-WR-63",
    standard: true,
    process: "Bought-out",
    source: "Master Data",
    conf: "high",
    status: "complete",
    missingFields: [],
  },
];

/* ─── Client Clarification Items ─── */

export const CLARIFICATION_ITEMS: ClarificationItem[] = [
  {
    id: "CL-001",
    part: "PISTON",
    field: "Material Grade",
    issue:
      "AI extracted EN8 from drawing text. Please confirm if EN8 or EN9 grade is required for the piston.",
    conf: "medium",
    status: "pending",
  },
  {
    id: "CL-002",
    part: "GLAND",
    field: "Surface Finish",
    issue:
      "Surface finish Ra value not specified on drawing. Ra 1.6 assumed — please confirm or provide the required surface finish specification.",
    conf: "low",
    status: "pending",
  },
  {
    id: "CL-003",
    part: "END CAP",
    field: "Weld Standard",
    issue:
      "Welding standard not specified. AWS D1.1 assumed — please confirm applicable weld class and inspection level required.",
    conf: "low",
    status: "pending",
  },
  {
    id: "CL-004",
    part: "PISTON ROD",
    field: "Chrome Plating Thickness",
    issue:
      "Hard chrome plating thickness not mentioned in drawing. Standard 25µm assumed — please confirm or specify the required thickness.",
    conf: "medium",
    status: "sent",
  },
  {
    id: "CL-005",
    part: "SEAL KIT",
    field: "Operating Pressure",
    issue:
      "Maximum working pressure not mentioned in RFQ. 160 bar assumed — please confirm to ensure correct seal grade selection.",
    conf: "medium",
    status: "pending",
  },
  {
    id: "CL-006",
    part: "SEAL KIT",
    field: "Operating Temperature",
    issue:
      "Fluid and ambient temperature range not specified. -20°C to +80°C (marine standard) assumed — please confirm.",
    conf: "medium",
    status: "pending",
  },
];
