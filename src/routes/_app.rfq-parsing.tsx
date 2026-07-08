import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  XCircle, FileText, Sparkles, Edit3,
  AlertTriangle, RotateCcw, Eye, ChevronRight,
} from "lucide-react";
import { RFQS } from "@/data/mock";
import { ModuleHeader, Section, Btn, ConfidenceBadge } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip, StageCompletionGuard } from "@/components/workflow";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/rfq-parsing")({
  head: () => ({ meta: [{ title: "RFQ Parsing — SeaHydrosys" }] }),
  component: RfqParsing,
});

const EXTRACTED_FIELDS = [
  { field: "Client Name", value: "Mahindra Marine", confidence: "high" as const, source: "Email header" },
  { field: "Cylinder Type", value: "Tie-Rod Cylinder", confidence: "high" as const, source: "Subject line" },
  { field: "Bore Diameter", value: '2.5" (63.5mm)', confidence: "high" as const, source: "Drawing GA-001 Rev B" },
  { field: "Stroke Length", value: "180mm", confidence: "high" as const, source: "Drawing GA-001 Rev B" },
  { field: "Rod Diameter", value: '1.5" (38.1mm)', confidence: "high" as const, source: "Drawing GA-001 Rev B" },
  { field: "Working Pressure", value: "210 bar", confidence: "high" as const, source: "Technical Spec p.2" },
  { field: "Test Pressure", value: "315 bar (1.5×WP)", confidence: "high" as const, source: "Inferred" },
  { field: "Mounting", value: "Clevis both ends", confidence: "medium" as const, source: "Drawing GA-001" },
  { field: "Quantity", value: "24 units", confidence: "high" as const, source: "Email body" },
  { field: "Delivery", value: "8-10 weeks ARO", confidence: "high" as const, source: "Email body" },
  { field: "Tube Material", value: "ST 52 Seamless", confidence: "high" as const, source: "Spec Table 3" },
  { field: "Rod Material", value: "CK45-Hard Chrome", confidence: "high" as const, source: "Spec Table 3" },
  { field: "Seal Standard", value: "Parker / Trelleborg", confidence: "medium" as const, source: "Spec p.4" },
  { field: "Surface Finish", value: "Ra 0.2μm (Rod), Ra 0.4μm (Bore)", confidence: "high" as const, source: "Drawing note" },
  { field: "Tolerance", value: "H8/f7 (bore/rod fit)", confidence: "medium" as const, source: "Inferred from std" },
  { field: "Class Society", value: "LR / DNV — TBC", confidence: "low" as const, source: "Email mention" },
  { field: "FAT Required", value: "Yes — customer witness", confidence: "high" as const, source: "Email body" },
];

function RfqParsing() {
  const { activeRfqId, transition, setActiveRfq } = useWorkflow();
  const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];
  const [editing, setEditing] = useState<number | null>(null);
  const [fields, setFields] = useState(EXTRACTED_FIELDS);
  const [, setParsingDone] = useState(true);
  const [reparseCount, setReparseCount] = useState(0);

  function handleReject() {
    setActiveRfq(rfq.id);
    transition(rfq.id, "Received", "Sales");
    toast.error(`RFQ ${rfq.id} parsing rejected — returned to inbox`);
  }

  function handleReparse() {
    setParsingDone(false);
    setReparseCount((c) => c + 1);
    toast.info("Re-parsing with updated parameters…");
    setTimeout(() => {
      setParsingDone(true);
      toast.success("Re-parse complete — confidence improved");
    }, 1500);
  }

  function handleFieldEdit(idx: number, newValue: string) {
    setFields((prev) => prev.map((f, i) => (i === idx ? { ...f, value: newValue, confidence: "high" as const, source: "Manual override" } : f)));
    setEditing(null);
    toast.success(`Field "${fields[idx].field}" updated`);
  }

  return (
    <>
      <ModuleHeader
        breadcrumbs={["Operate", "RFQ Inbox", "Parsing"]}
        title="AI-Powered RFQ Parsing"
        subtitle={`${rfq.id} · ${rfq.client} · ${rfq.subject}`}
        titleSuffix={<StageSLAChip stage="Received" />}
        actions={
          <>
            <Btn variant="outline" size="sm" onClick={handleReparse}>
              <RotateCcw className="h-3.5 w-3.5" />Re-parse
            </Btn>
            <Btn variant="danger" size="sm" onClick={handleReject}>
              <XCircle className="h-3.5 w-3.5" />Reject
            </Btn>
            <StageCompletionGuard stage="Received" actor="Sales" actionLabel="Approve & Continue to BOM & Parts" />
          </>
        }
      />
      <StageWorkflowChrome stage="Received" />

      <div className="grid h-[calc(100vh-11rem)] grid-cols-12 gap-6 p-6 lg:p-8">
        {/* ── PDF Viewer ── */}
        <div className="col-span-5">
          <Section title="Source Document" action={<span className="text-[11px] text-muted-foreground">GA_Drawing.pdf · 2.4 MB</span>}>
            <div className="relative flex h-[calc(100vh-22rem)] items-center justify-center bg-muted/30 rounded-b-xl">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary/10">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <div className="text-[15px] font-bold">GA Drawing — Rev B</div>
                  <div className="mt-1 text-[12px] text-muted-foreground">
                    Bore 2.5" × Stroke 180mm × Rod 1.5"
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Tie-Rod Hydraulic Cylinder Assembly
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Btn variant="outline" size="sm"><Eye className="h-3.5 w-3.5" />Preview</Btn>
                  <Btn variant="outline" size="sm">Download</Btn>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 right-4 rounded-lg border bg-card/90 p-3 backdrop-blur">
                <div className="flex items-center gap-2 text-[11px]">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  <span className="font-semibold text-accent">AI Extraction</span>
                  <span className="text-muted-foreground">· {fields.length} fields · {reparseCount > 0 ? `${reparseCount + 1} passes` : "1 pass"}</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Overall confidence: <span className="font-semibold text-success">94.2%</span>
                  · {fields.filter((f) => f.confidence === "low").length} low-confidence fields
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Extracted Fields ── */}
        <div className="col-span-4">
          <Section
            title="Extracted Fields"
            action={
              <span className="text-[11px] text-muted-foreground">{fields.length} fields</span>
            }
          >
            <div className="h-[calc(100vh-22rem)] overflow-y-auto divide-y divide-border">
              {fields.map((f, idx) => (
                <div key={f.field} className="flex items-start gap-3 px-4 py-3 hover:bg-surface-2 transition-colors">
                  <div className="mt-1">
                    <ConfidenceBadge level={f.confidence} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{f.field}</div>
                    {editing === idx ? (
                      <input
                        autoFocus
                        className="field-input mt-1 w-full text-[13px]"
                        defaultValue={f.value}
                        onBlur={(e) => handleFieldEdit(idx, e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleFieldEdit(idx, (e.target as HTMLInputElement).value)}
                      />
                    ) : (
                      <div className="mt-0.5 text-[13px] font-medium">{f.value}</div>
                    )}
                    <div className="mt-0.5 text-[10px] text-muted-foreground">Source: {f.source}</div>
                  </div>
                  <button
                    onClick={() => setEditing(editing === idx ? null : idx)}
                    className="mt-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* ── AI Reasoning ── */}
        <div className="col-span-3">
          <Section title="AI Reasoning & Flags">
            <div className="h-[calc(100vh-22rem)] overflow-y-auto p-4 space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-amber-800">
                  <AlertTriangle className="h-3.5 w-3.5" />Attention Required
                </div>
                <ul className="mt-2 space-y-1.5 text-[12px] text-amber-700">
                  <li>• Class society (LR/DNV) not explicitly confirmed</li>
                  <li>• Tolerance H8/f7 inferred — verify with customer</li>
                  <li>• Mounting type needs drawing cross-reference</li>
                </ul>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Extraction Log</div>
                <div className="space-y-2 text-[11px] text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>Drawing text OCR — 17 fields identified</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>Email NLP — client, qty, delivery extracted</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>Spec table parsing — materials matched to master</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-warning">⚠</span>
                    <span>Class society reference ambiguous</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-success">✓</span>
                    <span>Historical match: 3 similar RFQs found</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border bg-card p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Similar Past RFQs</div>
                <div className="space-y-2">
                  {["RFQ-2025-01842 (94% match)", "RFQ-2025-01203 (87% match)", "RFQ-2024-03421 (82% match)"].map((r) => (
                    <div key={r} className="flex items-center gap-2 text-[12px]">
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-primary cursor-pointer hover:underline">{r}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <StageCompletionGuard stage="Received" actor="Sales" actionLabel="Approve & Continue to BOM & Parts" />
                <Btn variant="outline" className="w-full justify-center" size="sm" onClick={handleReparse}>
                  <RotateCcw className="h-3.5 w-3.5" />Re-parse Document
                </Btn>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}
