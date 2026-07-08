import type { Process } from "./types";

export const processes: Process[] = [
  {
    id: "PRC-001",
    name: "Cutting",
    type: "Subtractive",
    defaultMachineId: "MCH-001", // Circular Saw CS-300
    avgCycleTimeMin: 5,
    applicableCylinders: "All",
    setupTimeMin: 10,
    notes: "Initial raw material cutting to length. Cold saw or band saw.",
  },
  {
    id: "PRC-002",
    name: "OD Turning",
    type: "Subtractive",
    defaultMachineId: "MCH-002", // CNC Lathe DX-200
    avgCycleTimeMin: 12,
    applicableCylinders: "All",
    setupTimeMin: 15,
    notes: "External diameter turning, facing, chamfering.",
  },
  {
    id: "PRC-003",
    name: "Sizing & Facing",
    type: "Subtractive",
    defaultMachineId: "MCH-002", // CNC Lathe DX-200
    avgCycleTimeMin: 8,
    applicableCylinders: "All",
    setupTimeMin: 15,
    notes: "Tube end sizing, facing to length, chamfer for seal entry.",
  },
  {
    id: "PRC-004",
    name: "Boring",
    type: "Subtractive",
    defaultMachineId: "MCH-006", // Boring Mill BM-3
    avgCycleTimeMin: 18,
    applicableCylinders: ["Welded", "Long-Stroke"],
    setupTimeMin: 30,
    notes: "Deep-hole boring for welded cylinder tubes.",
  },
  {
    id: "PRC-005",
    name: "Honing",
    type: "Finishing",
    defaultMachineId: "MCH-005", // Honing-H1
    avgCycleTimeMin: 14,
    applicableCylinders: "All",
    setupTimeMin: 25,
    notes: "Internal bore honing to H8 tolerance. Ra 0.4 achievable.",
  },
  {
    id: "PRC-006",
    name: "Threading",
    type: "Subtractive",
    defaultMachineId: "MCH-002", // CNC Lathe DX-200
    avgCycleTimeMin: 6,
    applicableCylinders: "All",
    setupTimeMin: 10,
    notes: "External/internal threading on rod end, gland, etc.",
  },
  {
    id: "PRC-007",
    name: "Turning + Grooving",
    type: "Subtractive",
    defaultMachineId: "MCH-002", // CNC Lathe DX-200
    avgCycleTimeMin: 10,
    applicableCylinders: "All",
    setupTimeMin: 12,
    notes: "Piston OD turning with O-ring and seal grooves.",
  },
  {
    id: "PRC-008",
    name: "Turning + Bore",
    type: "Subtractive",
    defaultMachineId: "MCH-002", // CNC Lathe DX-200
    avgCycleTimeMin: 10,
    applicableCylinders: "All",
    setupTimeMin: 12,
    notes: "Gland machining — OD, ID bore, seal grooves.",
  },
  {
    id: "PRC-009",
    name: "Turning + Weld Prep",
    type: "Subtractive",
    defaultMachineId: "MCH-003", // Lathe HMT-1
    avgCycleTimeMin: 8,
    applicableCylinders: ["Welded", "Mill-Type"],
    setupTimeMin: 10,
    notes: "End cap turning with weld bevel preparation.",
  },
  {
    id: "PRC-010",
    name: "Turning + Drilling",
    type: "Subtractive",
    defaultMachineId: "MCH-002", // CNC Lathe DX-200
    avgCycleTimeMin: 12,
    applicableCylinders: "All",
    setupTimeMin: 10,
    notes: "Clevis machining — OD turning, pin-hole drilling.",
  },
  {
    id: "PRC-011",
    name: "Welding",
    type: "Joining",
    defaultMachineId: "MCH-007", // MIG-W4
    avgCycleTimeMin: 8,
    applicableCylinders: ["Welded", "Mill-Type", "Custom"],
    setupTimeMin: 8,
    notes: "MIG/MAG welding per WPS. Includes preheat if required.",
  },
  {
    id: "PRC-012",
    name: "Painting",
    type: "Surface Treatment",
    defaultMachineId: "MCH-008", // Spray Booth
    avgCycleTimeMin: 10,
    costPerUnit: 72, // fixed paint cost per cylinder
    applicableCylinders: "All",
    setupTimeMin: 10,
    notes: "Marine PU 2-coat system. Includes surface prep, primer, topcoat.",
  },
  {
    id: "PRC-013",
    name: "Assembly",
    type: "Assembly",
    defaultMachineId: "MCH-010", // Assy Bench
    avgCycleTimeMin: 15,
    applicableCylinders: "All",
    setupTimeMin: 0,
    notes: "Seal installation, piston assembly, rod insertion, gland fitting.",
  },
  {
    id: "PRC-014",
    name: "Pressure Testing",
    type: "QA",
    defaultMachineId: "MCH-009", // Test Rig HT-2
    avgCycleTimeMin: 12,
    applicableCylinders: "All",
    setupTimeMin: 5,
    notes: "Hydrostatic test at 1.5× working pressure. Hold 5 min.",
  },
  {
    id: "PRC-015",
    name: "Hard Chrome Plating",
    type: "Outsourced",
    defaultMachineId: "MCH-002", // N/A but needs a ref
    avgCycleTimeMin: 0, // outsourced, time not relevant
    costPerUnit: 45, // fixed per rod
    applicableCylinders: "All",
    setupTimeMin: 0,
    notes: "Outsourced to ChromePro/Surftech. 25µm standard. 5 day TAT.",
  },
  {
    id: "PRC-016",
    name: "Port Drilling",
    type: "Subtractive",
    defaultMachineId: "MCH-004", // VMC-650
    avgCycleTimeMin: 10,
    applicableCylinders: "All",
    setupTimeMin: 18,
    notes: "Hydraulic port holes, SAE O-ring boss or BSP threads.",
  },
];
