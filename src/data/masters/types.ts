/* ═══════════════════════════════════════════════════════════
   MASTER DATA TYPES — SeaHydrosys
   All reference data types used across the system.
   These types mirror the Excel costing sheet structure.
   ═══════════════════════════════════════════════════════════ */

/* ─── Common ─── */
export type CylinderType = "Tie-Rod" | "Welded" | "Telescopic" | "Mill-Type" | "Long-Stroke" | "Custom";

/* ─── Client Master ─── */
export interface Client {
  id: string;
  name: string;
  region: string;
  industry: string;
  contact: string;
  phone?: string;
  address?: string;
  rfqCount: number;
  conversionRate: number; // percentage
  since: string; // year
  notes?: string;
  lastRfqDate?: string;
  // New Fields (Client Context)
  preferredCylinderTypes?: string[];
  preferredMaterials?: string[];
  standardDeliveryTerms?: string;
  pricingCategory?: "Premium" | "Standard" | "OEM" | string;
  approvedPartStandards?: string[];
  historicalRfqPatterns?: string;
}

/* ─── Materials Master ─── */
export interface Material {
  id: string;
  code: string; // e.g. "ST-52.3", "EN-19"
  description: string;
  density: number; // kg/m³
  costPerKg: number; // $/kg or $/kg
  type: string; // e.g. "Seamless Tube", "Chrome Rod"
  usedInCylinders: CylinderType[];
  vendors: string[];
  notes?: string;
  classCertRequired?: boolean;
  // New Fields (Intelligence)
  compatibleProcesses?: string[];
  compatibleTools?: string[];
  machinabilityIndex?: number;
  cuttingSpeed?: number;
  feedRate?: number;
  weldability?: string;
  hardness?: string;
  materialGradeMapping?: string;
  scrapPct?: number;
  surfaceFinishCapability?: string;
}

/* ─── Raw Material Master ─── */
export interface RawMaterial {
  id: string;
  rmRef: string; // e.g. "RM-ST523-152"
  materialId: string; // FK → Material.id
  spec: string; // e.g. "ST-52.3 Ø152.4 sml"
  form: "Circular Bar" | "Flat" | "Plate" | "Tube" | "Hex Bar" | "Sheet";
  od?: number; // mm
  thickness?: number; // mm
  length?: number; // mm
  stockQty: number; // kg or pcs
  moq: number;
  costPerKg: number; // $/kg
  overheadPct: number; // % overhead on raw material
  supplier: string;
  altSupplier?: string;
  leadDays: number;
  availability: "In Stock" | "Low Stock" | "Out of Stock" | "On Order";
  lastUpdated: string;
  // New Fields (Procurement)
  alternateRm?: string[];
  vendorRating?: number;
  standardStockSizes?: string[];
  scrapRecoveryPct?: number;
  marketVolatility?: "High" | "Medium" | "Low" | string;
  lastPurchaseCost?: number;
  freightCost?: number;
  procurementStatus?: "RFQ Sent" | "Approved" | "Pending" | string;
}

/* ─── Parts Master (Bought-out / Outsourced) ─── */
export interface Part {
  id: string;
  name: string;
  sku: string; // standard SKU reference
  type: string; // e.g. "Seal", "Wear Ring", "Port Plug"
  material: string; // e.g. "PU+NBR", "PTFE Bronze"
  vendor: string;
  altVendor?: string;
  costPerPc: number;
  stockQty: number;
  moq: number;
  leadDays: number;
  usedInCylinders: CylinderType[];
  overheadPct: number;
  notes?: string;
  // New Fields (BOM Engine)
  partCategory?: "Rod" | "Tube" | "Seal" | string;
  standardPartFlag?: boolean;
  standardRoutingTemplate?: string;
  preferredMachineType?: string;
  preferredToolType?: string;
  weightFormula?: string;
  cadTemplateRef?: string;
  inspectionMethod?: string;
  standardTolerance?: string;
  alternateVendors?: string[];
  reusableDesignFlag?: boolean;
}

/* ─── Machine Master ─── */
export interface Machine {
  id: string;
  name: string;
  type: string; // e.g. "Turning", "Milling", "Honing"
  capacity: string; // human-readable capacity
  maxDiameter?: number; // mm
  maxLength?: number; // mm
  setupTimeMin: number; // minutes
  costPerMin: number; // $/min or $/min
  costPerHour: number; // derived: costPerMin * 60
  utilizationPct: number; // current utilization %
  status: "Available" | "Maintenance" | "Full";
  notes?: string;
  // New Fields (Manufacturing)
  supportedProcesses?: string[];
  compatibleTools?: string[];
  maxBore?: number;
  maxStroke?: number;
  machineEfficiencyPct?: number;
  oee?: number;
  hourlyEnergyCost?: number;
  maintenanceSchedule?: string;
  preferredMaterials?: string[];
  queueCapacity?: number;
  machinePriorityRank?: number;
  automationLevel?: "High" | "Medium" | "Low" | string;
  rejectRate?: number;
}

/* ─── Process Master ─── */
export interface Process {
  id: string;
  name: string;
  type: "Subtractive" | "Finishing" | "Joining" | "Assembly" | "QA" | "Outsourced" | "Surface Treatment";
  defaultMachineId: string; // FK → Machine.id
  avgCycleTimeMin: number; // minutes
  costPerUnit?: number; // fixed cost per unit if applicable
  applicableCylinders: CylinderType[] | "All";
  setupTimeMin: number;
  notes?: string;
  // New Fields (Routing)
  sequenceOrder?: number;
  requiredToolType?: string;
  compatibleMachines?: string[];
  standardCycleFormula?: string;
  setupFormula?: string;
  skillLevelRequired?: "High" | "Medium" | "Low" | string;
  inspectionRequired?: boolean;
  reworkProbability?: number;
  surfaceFinishOutput?: string;
  toleranceCapability?: string;
  dependencyProcess?: string;
  automationPossible?: boolean;
}

/* ─── Costing Master (Parameters) ─── */
export interface CostingParameter {
  id: string;
  parameter: string;
  value: number;
  unit: string;
  category: "Overhead" | "Margin" | "Reject" | "Labour" | "Plant" | "Amortization";
  description?: string;
  // New Fields (Cost Intelligence)
  formula?: string;
  machineUtilizationFactor?: number;
  energyCostFormula?: string;
  laborGradeRates?: string;
  rejectCostFormula?: string;
  packagingRules?: string;
  freightRules?: string;
  regionalTaxRules?: string;
  profitStrategy?: string;
  urgencyMultiplier?: number;
  moqCostImpact?: string;
  revisionCostRules?: string;
  currencyConversion?: string;
}

/* ─── Transactional: RFQ ─── */
export interface RFQRecord {
  id: string;
  clientId: string; // FK → Client.id
  subject: string;
  category: CylinderType;
  qty: number;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: string;
  owner: string;
  slaHrs: number;
  receivedAt: string;
  attachments: string[];
  extractedData?: Record<string, unknown>;
  confidence: "high" | "medium" | "low";
  revisionNo: number;
}

/* ─── Transactional: BOM Line Item ─── */
export interface BOMItem {
  id: string;
  rfqId: string; // FK → RFQRecord.id
  part: string;
  materialId: string; // FK → Material.id
  rawMaterialId?: string; // FK → RawMaterial.id
  od?: number;
  id_dim?: number; // "id" conflicts with id field, use id_dim for inner diameter
  thickness?: number;
  length?: number;
  weight: number; // kg
  qty: number;
  isStandard: boolean; // bought-out part?
  partId?: string; // FK → Part.id (if bought-out)
  process: string;
  supplier: string;
  // Computed from master data references:
  rawMaterialCost: number; // weight * costPerKg from RawMaterial/Material
  machineCost: number; // from operations
  totalPartCost: number;
}

/* ─── Transactional: Costing Operation ─── */
export interface CostingOperation {
  id: string;
  rfqId: string;
  bomItemId: string; // FK → BOMItem.id
  part: string;
  operation: string;
  machineId: string; // FK → Machine.id
  cycleTimeMin: number;
  setupTimeMin: number;
  qtyPerCycle: number;
  ratePerMin: number; // from Machine.costPerMin
  // Calculated fields (Excel formula replicated):
  totalTime: number; // (cycleTime * qty / qtyPerCycle) + setupTime
  totalCost: number; // totalTime * ratePerMin
}

/* ─── Transactional: Costing Summary ─── */
export interface CostingSummary {
  rfqId: string;
  qty: number;
  // Calculated from BOM + Operations + Master params:
  rawMaterialCost: number;
  machiningCost: number;
  paintCost: number;
  boughtOutCost: number;
  subtotal: number; // rm + machining + paint + boughtOut
  overheadPct: number; // from CostingParameter
  overheadCost: number; // subtotal * overheadPct / 100
  rejectPct: number; // from CostingParameter
  rejectCost: number; // subtotal * rejectPct / 100
  costBeforeMargin: number; // subtotal + overhead + reject
  marginPct: number; // from CostingParameter
  marginCost: number; // costBeforeMargin * marginPct / 100
  unitPrice: number; // costBeforeMargin + margin
  totalPrice: number; // unitPrice * qty
}
