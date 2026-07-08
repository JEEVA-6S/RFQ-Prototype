import type { CostingParameter } from "./types";

export const costingParameters: CostingParameter[] = [
  // ─── Overhead Parameters ───
  {
    id: "CP-001",
    parameter: "Default Overhead %",
    value: 12,
    unit: "%",
    category: "Overhead",
    description: "Applied to subtotal (RM + machining + paint + bought-out) to cover factory overhead, utilities, supervision.",
  },
  {
    id: "CP-002",
    parameter: "Admin Overhead %",
    value: 5,
    unit: "%",
    category: "Overhead",
    description: "Administrative overhead — finance, HR, IT systems.",
  },
  // ─── Reject Parameters ───
  {
    id: "CP-003",
    parameter: "Default Reject %",
    value: 2.5,
    unit: "%",
    category: "Reject",
    description: "Expected rejection/rework rate applied to subtotal cost.",
  },
  {
    id: "CP-004",
    parameter: "Machining Reject %",
    value: 1.5,
    unit: "%",
    category: "Reject",
    description: "Additional reject allowance for complex machining operations.",
  },
  // ─── Margin Parameters ───
  {
    id: "CP-005",
    parameter: "Default Margin %",
    value: 18,
    unit: "%",
    category: "Margin",
    description: "Standard profit margin applied to cost-before-margin.",
  },
  {
    id: "CP-006",
    parameter: "Minimum Margin %",
    value: 10,
    unit: "%",
    category: "Margin",
    description: "Floor margin — quotes below this require management approval.",
  },
  {
    id: "CP-007",
    parameter: "High-Value Margin %",
    value: 22,
    unit: "%",
    category: "Margin",
    description: "Applied to orders > $5L where custom engineering is involved.",
  },
  // ─── Labour Parameters ───
  {
    id: "CP-008",
    parameter: "Skilled Labour Rate",
    value: 18,
    unit: "$/hr",
    category: "Labour",
    description: "CNC operators, welders, assembly technicians.",
  },
  {
    id: "CP-009",
    parameter: "Helper Labour Rate",
    value: 10,
    unit: "$/hr",
    category: "Labour",
    description: "Material handling, cleaning, packing.",
  },
  // ─── Plant Parameters ───
  {
    id: "CP-010",
    parameter: "Plant Rate (Mumbai)",
    value: 28,
    unit: "$/hr",
    category: "Plant",
    description: "Loaded plant rate including utilities, depreciation, maintenance.",
  },
  {
    id: "CP-011",
    parameter: "Power Cost",
    value: 0.12,
    unit: "$/kWh",
    category: "Plant",
    description: "Electricity cost per kWh for machine power calculations.",
  },
  // ─── Amortization Parameters ───
  {
    id: "CP-012",
    parameter: "Setup Amortization",
    value: 1,
    unit: "batch",
    category: "Amortization",
    description: "Setup cost amortized over 1 batch (not spread across multiple orders).",
  },
  {
    id: "CP-013",
    parameter: "Tooling Amortization Batches",
    value: 5,
    unit: "batches",
    category: "Amortization",
    description: "Special tooling cost spread over expected 5 repeat batches.",
  },
  // ─── Paint Cost Breakdown (from Excel) ───
  {
    id: "CP-014",
    parameter: "Paint - Tank Setup Cost",
    value: 12.5,
    unit: "$/unit",
    category: "Overhead",
    description: "One-time tank preparation cost per batch, amortized per unit.",
  },
  {
    id: "CP-015",
    parameter: "Paint - Material Cost",
    value: 28.4,
    unit: "$/unit",
    category: "Overhead",
    description: "Paint and thinner material cost per cylinder.",
  },
  {
    id: "CP-016",
    parameter: "Paint - Labour Cost",
    value: 18.0,
    unit: "$/unit",
    category: "Labour",
    description: "Painter and helper labour cost per cylinder.",
  },
  {
    id: "CP-017",
    parameter: "Paint - Power Cost",
    value: 6.2,
    unit: "$/unit",
    category: "Plant",
    description: "Power cost for spray booth and drying.",
  },
  {
    id: "CP-018",
    parameter: "Paint - Chemical Cost",
    value: 4.8,
    unit: "$/unit",
    category: "Overhead",
    description: "Surface prep chemicals (degreaser, phosphating).",
  },
  {
    id: "CP-019",
    parameter: "Paint - DM Water Cost",
    value: 2.1,
    unit: "$/unit",
    category: "Plant",
    description: "De-mineralized water for cleaning and rinsing.",
  },
];

/* ─── Helper: Get paint cost total from parameters ─── */
export function getPaintCostPerUnit(params: CostingParameter[]): number {
  const paintParams = params.filter(p => p.parameter.startsWith("Paint -"));
  return paintParams.reduce((sum, p) => sum + p.value, 0);
}

/* ─── Helper: Get parameter value by ID or name ─── */
export function getParam(params: CostingParameter[], idOrName: string): number {
  const found = params.find(p => p.id === idOrName || p.parameter === idOrName);
  return found?.value ?? 0;
}
