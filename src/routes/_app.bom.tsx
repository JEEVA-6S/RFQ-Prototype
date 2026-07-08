import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Mail, Send, CheckCheck, PenLine,
  Edit2, Save, Trash2, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  PARTS_EXTRACTION, CLARIFICATION_ITEMS, RFQS,
  type PartExtractionRow, type CompletenessStatus,
} from "@/data/mock";
import { ModuleHeader, Section, Btn, ConfidenceBadge, MetricCard } from "@/components/shell/primitives";
import { DrawingClarificationViewer } from "@/components/shell/DrawingClarificationViewer";
import { StageWorkflowChrome, StageSLAChip, StageCompletionGuard } from "@/components/workflow";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/bom")({
  head: () => ({ meta: [{ title: "Parts Extraction — SeaHydrosys" }] }),
  component: BomPage,
});

/* ── Style maps ── */
const COMPLETENESS_STYLE: Record<CompletenessStatus, string> = {
  complete: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  review: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  missing: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const COMPLETENESS_LABEL: Record<CompletenessStatus, string> = {
  complete: "✓ Complete",
  review: "⚠ Review",
  missing: "✗ Missing",
};

const PAGE_SIZE = 5;

/* ── Component ── */
function BomPage() {
  const navigate = useNavigate();
  const { activeRfqId } = useWorkflow();
  const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];

  const [parts, setParts] = useState(PARTS_EXTRACTION);
  const [clarifications, setClarifications] = useState(CLARIFICATION_ITEMS);
  /* ── Row edit state ── */
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PartExtractionRow>>({});
  const [bomPage, setBomPage] = useState(0);

  function handleEditPart(idx: number) {
    setEditingIdx(idx);
    setEditForm({ ...parts[idx] });
  }

  function handleSaveEdit() {
    if (editingIdx === null) return;
    setParts((prev) => {
      const next = [...prev];
      next[editingIdx] = { ...next[editingIdx], ...editForm } as PartExtractionRow;
      return next;
    });
    setEditingIdx(null);
    setEditForm({});
    toast.success("Part updated");
  }

  function handleCancelEdit() {
    setEditingIdx(null);
    setEditForm({});
  }

  function handleDeletePart(idx: number) {
    setParts((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      const maxPage = Math.max(0, Math.ceil(next.length / PAGE_SIZE) - 1);
      setBomPage((p) => Math.min(p, maxPage));
      return next;
    });
    toast.success("Part removed");
  }

  /* ── Derived stats ── */
  const completeParts = parts.filter((p) => p.status === "complete").length;
  const reviewParts = parts.filter((p) => p.status === "review").length;
  const missingParts = parts.filter((p) => p.status === "missing").length;
  const totalWeight = parts.reduce((s, r) => s + r.weight, 0);
  const pendingClarifs = clarifications.filter((c) => c.status === "pending").length;

  /* ── Email body (auto-composed from pending + sent items, user-editable) ── */
  // pending = not yet queued; sent = queued via "Mark Sent" → stays in draft until "Mark Clarified"
  const pendingItems = clarifications.filter((c) => c.status === "pending" || c.status === "sent");
  const composedBody = `Dear Team,

Thank you for your RFQ (Ref: 7008707 — Bore 2.5" × Stroke 180mm × Rod 1.5" Assembly).
We have reviewed the drawing and extracted the part details below.
To proceed with the final quotation, kindly clarify the following:

${pendingItems.map((c, i) => `${i + 1}. ${c.part} — ${c.field}:\n   ${c.issue}`).join("\n\n")}

Please revert at your earliest convenience so we can complete the extraction and submit our quotation.

Regards,
 RFQ Engine Sales Team`;
  const [emailBody, setEmailBody] = useState(composedBody);
  const [emailSubject, setEmailSubject] = useState(
    `Clarification Required — RFQ 7008707 Bore 2.5" × Stroke 180mm × Rod 1.5" Assembly`
  );
  const [emailHistory, setEmailHistory] = useState<{ subject: string; body: string; to: string; sentAt: string; expanded: boolean }[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showDraft, setShowDraft] = useState(true);

  /* auto-sync email body when clarifications change (removes resolved/sent items) */
  useEffect(() => {
    if (showDraft) setEmailBody(composedBody);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clarifications]);

  /* ── Handlers ── */
  function handleMarkSent(id: string) {
    setClarifications((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "sent" as const } : c))
    );
    toast.info("Marked as sent");
  }

  function handleMarkResolved(id: string) {
    const clarif = clarifications.find((c) => c.id === id);
    const updatedClarifs = clarifications.map((c) =>
      c.id === id ? { ...c, status: "resolved" as const } : c
    );
    setClarifications(updatedClarifs);

    if (clarif) {
      // Check if ALL clarifications for this part are now resolved
      const sibling = updatedClarifs.filter((c) => c.part === clarif.part);
      const allDone = sibling.every((c) => c.status === "resolved");
      if (allDone) {
        setParts((prev) =>
          prev.map((p) =>
            p.part === clarif.part ? { ...p, status: "complete" as const } : p
          )
        );
        toast.success(`${clarif.part} — all clarifications done, marked Complete`);
      } else {
        toast.success("Clarification resolved");
      }
    }
  }

  function handleMarkAllResolved() {
    const updatedClarifs = clarifications.map((c) => ({ ...c, status: "resolved" as const }));
    setClarifications(updatedClarifs);
    // Resolve all affected parts
    const resolvedPartNames = new Set(updatedClarifs.map((c) => c.part));
    setParts((prev) =>
      prev.map((p) =>
        resolvedPartNames.has(p.part) ? { ...p, status: "complete" as const } : p
      )
    );
    toast.success("All clarifications marked done — parts updated to Complete");
  }

  function handleSendEmail() {
    setEmailHistory((prev) => [
      {
        subject: emailSubject,
        body: emailBody,
        to: rfq.sender,
        sentAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        expanded: false,
      },
      ...prev,
    ]);
    setExpandedIdx(null);
    setClarifications((prev) =>
      prev.map((c) => (c.status === "pending" ? { ...c, status: "sent" as const } : c))
    );
    setEmailBody("");
    setEmailSubject("");
    setShowDraft(false);
    toast.success("Clarification email sent to client");
  }

  /* ── Render ── */
  return (
    <>
      <ModuleHeader
        breadcrumbs={["Operate", "RFQ Inbox", "BOM"]}
        title="Bill of Materials"
        subtitle={`${rfq.id} · Bore 2.5" × Stroke 180mm × Rod 1.5" · ${rfq.client}`}
        titleSuffix={
          <StageSLAChip stage="BOM" />
        }
        actions={
          <>
            <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/rfq-inbox" })}>
              ← Back to Inbox
            </Btn>
            <StageCompletionGuard stage="BOM" actor="Manufacturing" actionLabel="Continue to Feasibility & Availability" />
          </>
        }
      />
      <StageWorkflowChrome stage="BOM" />

      <div className="space-y-6 p-6 lg:p-8">

        {/* ── KPI Strip ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard
            label="Total Parts"
            value={`${parts.length}`}
          />
          <MetricCard
            label="Complete"
            value={`${completeParts}`}
            hint="all dimensions extracted"
          />
          <MetricCard
            label="Needs Clarification"
            value={`${reviewParts + missingParts}`}
          />
          <MetricCard
            label="Total Weight"
            value={`${totalWeight.toFixed(2)} kg`}
            hint="per unit assembly"
          />
        </div>

        {/* ── Extraction Summary ── */}
        <Section title="Extraction Summary">
          <div className="flex flex-wrap gap-6 p-5">
            {[
              { label: "Complete", count: completeParts, color: "bg-emerald-500" },
              { label: "Needs Review", count: reviewParts, color: "bg-amber-500" },
              { label: "Missing Data", count: missingParts, color: "bg-rose-500" },
            ].map((bar) => (
              <div key={bar.label} className="flex min-w-[220px] flex-1 items-center gap-3">
                <div className="w-24 text-[11px] text-muted-foreground">{bar.label}</div>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${bar.color}`}
                    style={{ width: `${(bar.count / parts.length) * 100}%` }}
                  />
                </div>
                <div className="w-10 text-right text-[11px] tabular-nums font-semibold">
                  {bar.count}/{parts.length}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Extracted Parts & Dimensions Table ── */}
        <Section
          title='Extracted Parts & Dimensions — Bore 2.5" Assembly'
        >
          <div className="overflow-x-auto">
            <table className="ent-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Part Name</th>
                  <th>Material</th>
                  <th>OD<br />(mm)</th>
                  <th>ID<br />(mm)</th>
                  <th>Wall / Thk<br />(mm)</th>
                  <th>Length<br />(mm)</th>
                  <th>Weight<br />(kg)</th>
                  <th>Qty</th>
                  <th>RM Reference</th>
                  <th>AI Conf</th>
                  <th>Status</th>
                  <th className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {parts.slice(bomPage * PAGE_SIZE, (bomPage + 1) * PAGE_SIZE).map((r, localI) => {
                  const i = bomPage * PAGE_SIZE + localI;
                  return (
                    <tr
                      key={i}
                      className={`group border-b border-border/50 ${r.status === "missing"
                        ? "bg-rose-50/40"
                        : r.status === "review"
                          ? "bg-amber-50/30"
                          : r.standard
                            ? "bg-muted/20"
                            : ""
                        }`}
                    >
                      <td className="font-mono text-[11px] text-muted-foreground">{i + 1}</td>

                      {editingIdx === i ? (
                        <>
                          {/* Part Name */}
                          <td className="px-3 py-2">
                            <input autoFocus className="field-input w-full text-[12px] font-semibold" value={editForm.part ?? ""} onChange={(e) => setEditForm({ ...editForm, part: e.target.value })} />
                          </td>
                          {/* Material */}
                          <td className="px-3 py-2">
                            <input className="field-input w-full text-[12px] font-medium" value={editForm.matId ?? ""} onChange={(e) => setEditForm({ ...editForm, matId: e.target.value })} />
                          </td>
                          {/* OD */}
                          <td className="px-3 py-2">
                            <input type="number" className="field-input w-20 text-[12px] tabular-nums" value={editForm.od ?? ""} onChange={(e) => setEditForm({ ...editForm, od: e.target.value === "" ? null : +e.target.value })} />
                          </td>
                          {/* ID */}
                          <td className="px-3 py-2">
                            <input type="number" className="field-input w-20 text-[12px] tabular-nums" value={editForm.id ?? ""} onChange={(e) => setEditForm({ ...editForm, id: e.target.value === "" ? null : +e.target.value })} />
                          </td>
                          {/* Wall / Thk */}
                          <td className="px-3 py-2">
                            <input type="number" className="field-input w-20 text-[12px] tabular-nums" value={editForm.thk ?? ""} onChange={(e) => setEditForm({ ...editForm, thk: e.target.value === "" ? null : +e.target.value })} />
                          </td>
                          {/* Length */}
                          <td className="px-3 py-2">
                            <input type="number" className="field-input w-20 text-[12px] tabular-nums" value={editForm.len ?? ""} onChange={(e) => setEditForm({ ...editForm, len: e.target.value === "" ? null : +e.target.value })} />
                          </td>
                          {/* Weight */}
                          <td className="px-3 py-2">
                            <input type="number" className="field-input w-20 text-[12px] tabular-nums font-medium" value={editForm.weight ?? ""} onChange={(e) => setEditForm({ ...editForm, weight: +e.target.value || 0 })} />
                          </td>
                          {/* Qty */}
                          <td className="px-3 py-2">
                            <input type="number" className="field-input w-14 text-[12px] tabular-nums text-center" value={editForm.qty ?? ""} onChange={(e) => setEditForm({ ...editForm, qty: +e.target.value || 0 })} />
                          </td>
                          {/* RM Reference */}
                          <td className="px-3 py-2">
                            <input className="field-input w-full text-[12px] font-mono" value={editForm.rmRef ?? ""} onChange={(e) => setEditForm({ ...editForm, rmRef: e.target.value })} />
                          </td>
                          {/* AI Conf — read-only */}
                          <td><ConfidenceBadge level={r.conf} /></td>
                          {/* Status — read-only */}
                          <td>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${COMPLETENESS_STYLE[r.status]}`}>
                              {COMPLETENESS_LABEL[r.status]}
                            </span>
                          </td>
                          {/* Save / Cancel */}
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={handleSaveEdit} className="p-1.5 hover:bg-success/10 rounded text-success" title="Save">
                                <Save className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={handleCancelEdit} className="p-1.5 hover:bg-muted rounded text-muted-foreground" title="Cancel">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Part Name */}
                          <td><span className="font-semibold text-[13px]">{r.part}</span></td>
                          {/* Material */}
                          <td><span className="text-[12px] font-medium">{r.matId}</span></td>
                          {/* OD */}
                          <td>{r.od != null ? <span className="tabular-nums text-[12px]">{r.od}</span> : <span className="text-muted-foreground text-[12px]">N/A</span>}</td>
                          {/* ID */}
                          <td>{r.id != null ? <span className="tabular-nums text-[12px]">{r.id}</span> : <span className="text-muted-foreground text-[12px]">N/A</span>}</td>
                          {/* Wall / Thk */}
                          <td>{r.thk != null ? <span className="tabular-nums text-[12px]">{r.thk}</span> : <span className="text-muted-foreground text-[12px]">—</span>}</td>
                          {/* Length */}
                          <td>{r.len != null ? <span className="tabular-nums text-[12px]">{r.len}</span> : <span className="text-muted-foreground text-[12px]">—</span>}</td>
                          {/* Weight */}
                          <td><span className="tabular-nums font-medium text-[12px]">{r.weight.toFixed(3)}</span></td>
                          {/* Qty */}
                          <td><span className="tabular-nums text-[12px]">{r.qty}</span></td>
                          {/* RM Reference */}
                          <td><span className="font-mono text-[11px] text-muted-foreground">{r.rmRef}</span></td>
                          {/* AI Conf — read-only */}
                          <td><ConfidenceBadge level={r.conf} /></td>
                          {/* Status — read-only */}
                          <td>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${COMPLETENESS_STYLE[r.status]}`}>
                              {COMPLETENESS_LABEL[r.status]}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1 transition-opacity">
                              <button onClick={() => handleEditPart(i)} className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground" title="Edit">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleDeletePart(i)} className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive" title="Delete">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 border-t border-border">
                  <td colSpan={7} className="px-3 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Total Assembly Weight
                  </td>
                  <td className="px-3 py-3 tabular-nums text-[14px] font-bold text-foreground bg-muted/40 transition-colors">
                    {totalWeight.toFixed(3)} <span className="text-[10px] text-muted-foreground font-normal">kg</span>
                  </td>
                  <td colSpan={5} className="px-3 py-3" />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Pagination ── */}
          {(() => {
            const totalPages = Math.ceil(parts.length / PAGE_SIZE);
            if (totalPages <= 1) return null;
            return (
              <div className="flex items-center justify-between border-t border-border px-5 py-3">
                <span className="text-[12px] text-muted-foreground">
                  Showing {bomPage * PAGE_SIZE + 1}–{Math.min((bomPage + 1) * PAGE_SIZE, parts.length)} of {parts.length} parts
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { setBomPage((p) => Math.max(0, p - 1)); setEditingIdx(null); }}
                    disabled={bomPage === 0}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: totalPages }, (_, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setBomPage(idx); setEditingIdx(null); }}
                      className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-md border px-2 text-[12px] font-medium transition-colors ${idx === bomPage
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-surface hover:bg-muted text-foreground"
                        }`}
                      aria-label={`Page ${idx + 1}`}
                      aria-current={idx === bomPage ? "page" : undefined}
                    >
                      {idx + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => { setBomPage((p) => Math.min(totalPages - 1, p + 1)); setEditingIdx(null); }}
                    disabled={bomPage === totalPages - 1}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })()}
        </Section>

        {/* ── AI Drawing Clarification ── */}
        <Section title="AI Drawing Clarification">
          <div className="p-4" style={{ height: 620 }}>
            <DrawingClarificationViewer
              parts={parts}
              clarifications={clarifications}
              onMarkSent={handleMarkSent}
              onMarkResolved={handleMarkResolved}
              onMarkAllResolved={handleMarkAllResolved}
              pendingCount={pendingClarifs}
            />
          </div>
        </Section>

        {/* ── Email Draft & History ── */}
        <Section
          title="Client Communication"
          action={
            <div className="flex items-center gap-2">
              {!showDraft && (
                <Btn variant="soft" size="sm" onClick={() => {
                  setEmailBody(composedBody);
                  setEmailSubject(`Clarification Required — RFQ 7008707 Bore 2.5" × Stroke 180mm × Rod 1.5" Assembly`);
                  setShowDraft(true);
                }}>
                  <PenLine className="h-3.5 w-3.5" />
                  Compose
                </Btn>
              )}
            </div>
          }
        >
          <div className="p-5 space-y-4">
            {/* Email Draft */}
            {showDraft && (
              <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span className="text-[12px] font-bold text-foreground">
                      Email Draft — Client Clarification
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span>To: {rfq.sender}</span>
                    <span>·</span>
                    <span>From: sales@rfq-engine.com</span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-3 flex items-baseline gap-2 text-[12px]">
                    <span className="shrink-0 font-semibold text-muted-foreground">Subject:</span>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-foreground outline-none hover:border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <textarea
                    rows={10}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    placeholder="Type your email body here…"
                    className="w-full resize-y rounded-lg border border-border bg-background p-5 font-sans text-[12px] leading-7 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
                  <Btn size="sm" disabled={!emailBody.trim() && !emailSubject.trim()} onClick={handleSendEmail}>
                    <Send className="h-3.5 w-3.5" />
                    Send Email to Client
                  </Btn>
                </div>
              </div>
            )}

            {/* Sent Email History */}
            {emailHistory.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Sent ({emailHistory.length})
                  </span>
                </div>
                {emailHistory.map((m, idx) => (
                  <div key={idx} className="overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40">
                    <button
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-emerald-50/60"
                      onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="truncate text-[12px] font-medium text-foreground">{m.subject || "(no subject)"}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-3 text-[10px] text-muted-foreground">
                        <span>To: {m.to}</span>
                        <span>{m.sentAt}</span>
                        <span className="text-[10px]">{expandedIdx === idx ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {expandedIdx === idx && (
                      <div className="border-t border-emerald-200 px-4 py-3">
                        <pre className="whitespace-pre-wrap font-sans text-[12px] leading-6 text-foreground">{m.body}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

      </div>
    </>
  );
}