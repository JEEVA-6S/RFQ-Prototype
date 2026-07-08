/* ═══════════════════════════════════════════════════════════
   MASTER DATA INDEX — SeaHydrosys
   Single import point for all master data stores.
   Usage: import { masterData } from "@/data/masters";
   ═══════════════════════════════════════════════════════════ */

import { DataStore } from "./store";
import type {
  Client,
  Material,
  RawMaterial,
  Part,
  Machine,
  Process,
  CostingParameter,
} from "./types";

// Seed data imports
import { clients as clientSeed } from "./clients";
import { materials as materialSeed } from "./materials";
import { rawMaterials as rawMaterialSeed } from "./rawMaterials";
import { parts as partSeed } from "./parts";
import { machines as machineSeed } from "./machines";
import { processes as processSeed } from "./processes";
import { costingParameters as costingParamSeed } from "./costingParams";

/* ─── Instantiate Stores ─── */

export const clientStore = new DataStore<Client>("clients", clientSeed);
export const materialStore = new DataStore<Material>("materials", materialSeed);
export const rawMaterialStore = new DataStore<RawMaterial>("raw_materials", rawMaterialSeed);
export const partStore = new DataStore<Part>("parts", partSeed);
export const machineStore = new DataStore<Machine>("machines", machineSeed);
export const processStore = new DataStore<Process>("processes", processSeed);
export const costingParamStore = new DataStore<CostingParameter>("costing_params", costingParamSeed);

/* ─── Unified Access Object ─── */

export const masterData = {
  clients: clientStore,
  materials: materialStore,
  rawMaterials: rawMaterialStore,
  parts: partStore,
  machines: machineStore,
  processes: processStore,
  costingParams: costingParamStore,

  /** Reset ALL master data to seed values */
  resetAll() {
    clientStore.reset();
    materialStore.reset();
    rawMaterialStore.reset();
    partStore.reset();
    machineStore.reset();
    processStore.reset();
    costingParamStore.reset();
  },

  /** Export all master data as a single JSON blob */
  exportAll(): string {
    return JSON.stringify({
      clients: clientStore.getAll(),
      materials: materialStore.getAll(),
      rawMaterials: rawMaterialStore.getAll(),
      parts: partStore.getAll(),
      machines: machineStore.getAll(),
      processes: processStore.getAll(),
      costingParams: costingParamStore.getAll(),
    }, null, 2);
  },
} as const;

/* ─── Re-exports ─── */
export type { Client, Material, RawMaterial, Part, Machine, Process, CostingParameter } from "./types";
export type { BOMItem, CostingOperation, CostingSummary, RFQRecord, CylinderType } from "./types";
export { DataStore, generateId } from "./store";
export { getParam, getPaintCostPerUnit } from "./costingParams";
export {
  rfqStore,
  bomStore,
  costingOpsStore,
  costingSummaryStore,
  getBOMForRFQ,
  getOpsForRFQ,
  getOpsForBOMItem,
  getCostingSummaryForRFQ
} from "./transactions";
export { calcCostingSummary, calcOperationCost, calcRawMaterialCost, calcBOMItemCost, autoGenerateOperations } from "./calculations";
