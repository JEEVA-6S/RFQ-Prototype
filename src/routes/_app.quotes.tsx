import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
  Send, Download, CheckCircle2,
  Paperclip, Mail, X, Plus, ChevronDown,
  FileText, FileImage, FileBadge2,
  Pencil, Save,
} from "lucide-react";
import { RFQS, COSTING_SUMMARY } from "@/data/mock";
import { ModuleHeader, Section, Btn } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip } from "@/components/workflow";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import quotePreviewImage from "@/assets/quote.png";

export const Route = createFileRoute("/_app/quotes")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      view: search.view as string | undefined,
    }
  },
  head: () => ({ meta: [{ title: "Quotation — " }] }),
  component: QuotesContainer,
});

const COMPANY = {
  name: "RFQ Engine India Private Limited",
  addressLine1: "Plot No. B-75, C-3, C-4, C-5, SIPCOT Industrial Park, 4th Main Road,",
  addressLine2: "Irrungattukottai, Sriperambudur 602117",
  addressLine3: "Tamil Nadu TN, India.",
  cin: "U29253TN2010PTTT74686",
  gstin: "33AAACW9449H1Z5",
  phone: "+91-9840143634",
  email: "sales@rfq-engine.com",
  website: "www.rfq-engine.com",
};

const CLIENT_ADDRESSES: Record<string, string[]> = {
  "Mahindra Marine": ["Mahindra Towers, Worli", "Mumbai, Maharashtra 400018", "India"],
  "Larsen & Toubro Heavy Eng.": ["L&T Marg, Powai", "Mumbai, Maharashtra 400072", "India"],
  "Wilhelmsen Marine AS": ["Strandveien 20, 1366 Lysaker", "Norway"],
  "Adani Ports": ["Adani House, Ahmedabad", "Gujarat 380009, India"],
  "Cochin Shipyard": ["Perumanoor P.O., Kochi", "Kerala 682015, India"],
  "Bharat Heavy Electricals": ["BHEL House, Siri Fort", "New Delhi 110049, India"],
  "Reliance Industries": ["RIL Corporate Park, Navi Mumbai", "Maharashtra 400701, India"],
  "Damen Shipyards": ["Avelingen-West 20", "4202 MS Gorinchem, Netherlands"],
  "JSW Steel": ["JSW Centre, Bandra Kurla Complex", "Mumbai 400051, India"],
  "Tata Steel": ["Bombay House, Homi Mody Street", "Mumbai 400001, India"],
};

type AttachmentDoc = {
  id: string;
  label: string;
  filename: string;
  size: string;
  icon: "pdf" | "drawing" | "rfq";
};

function QuotesContainer() {
  const { view: initialView } = Route.useSearch();
  const [view, setView] = useState<"list" | "detail">(initialView === "detail" ? "detail" : "list");

  if (view === "list") {
    return <QuotesList onSelect={() => setView("detail")} />;
  }
  return <QuoteDetail onBack={() => setView("list")} />;
}

function QuotesList({ onSelect }: { onSelect: (id: string) => void }) {
  const { setActiveRfq } = useWorkflow();

  return (
    <>
      <ModuleHeader
        breadcrumbs={["Operate", "Quote Management"]}
        title="Quotes"
        subtitle="Manage and view generated quotations"
      />
      <div className="p-6 lg:p-8">
        <div className="rounded-lg border border-border bg-surface overflow-x-auto">
          <table className="ent-table">
            <thead>
              <tr>
                <th style={{ minWidth: 100 }}>Quote No.</th>
                <th style={{ minWidth: 140 }}>RFQ Ref</th>
                <th style={{ minWidth: 200 }}>Client</th>
                <th style={{ minWidth: 160 }}>Category</th>
                <th className="text-center" style={{ minWidth: 80 }}>Qty</th>
                <th className="text-right" style={{ minWidth: 120 }}>Value (USD)</th>
                <th style={{ minWidth: 120 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {RFQS
                .map((rfq, rowIndex) => {
                  // Map raw status → stepper step label
                  const STATUS_MAP: Record<string, string> = {
                    Quoted:  "Quote Generated",
                    Sent:    "Sent to Client",
                    PO:      "PO Received",
                  };
                  const rawStatus = rowIndex === 0 ? "Quoted" : rfq.status;
                  const displayStatus = STATUS_MAP[rawStatus] ?? rawStatus;
                  return { rfq, displayStatus };
                })
                .filter(({ displayStatus }) =>
                  ["Quote Generated", "Sent to Client", "PO Received"].includes(displayStatus)
                )
                .map(({ rfq, displayStatus }) => {
                  const quoteNo = `Q${rfq.id.replace(/[^0-9]/g, "").slice(-5)}`;
                  const cs = COSTING_SUMMARY;
                  const totalValue = (cs.unitPrice * rfq.qty).toFixed(2);

                  // Status badge styles
                  let statusClasses = "bg-muted/30 text-muted-foreground border-transparent";
                  if (displayStatus === "Quote Generated")  statusClasses = "bg-cyan-50 text-cyan-700 border-cyan-200";
                  else if (displayStatus === "Sent to Client") statusClasses = "bg-success/10 text-success border-success/20";
                  else if (displayStatus === "PO Received")    statusClasses = "bg-violet-50 text-violet-700 border-violet-200";

                  return (
                    <tr key={rfq.id} className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => {
                        setActiveRfq(rfq.id);
                        onSelect(rfq.id);
                    }}>
                      <td className="font-semibold text-primary">{quoteNo}</td>
                      <td className="font-mono text-[11px] text-muted-foreground">{rfq.id}</td>
                      <td className="font-semibold">{rfq.client}</td>
                      <td>{rfq.category}</td>
                      <td className="text-center tabular-nums">{rfq.qty}</td>
                      <td className="text-right tabular-nums font-medium">${totalValue}</td>
                      <td>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusClasses}`}>
                          {displayStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}

            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function QuoteDetail({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const { activeRfqId, transition, setActiveRfq } = useWorkflow();
  const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];
  const [sent, setSent] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [editBody, setEditBody] = useState(false);
  const cs = COSTING_SUMMARY;
  // Derive display status matching the list view labels
  const STATUS_MAP: Record<string, string> = {
    Quoted:  "Quote Generated",
    Sent:    "Sent to Client",
    PO:      "PO Received",
  };
  const isFirstRfq = rfq.id === RFQS[0]?.id;
  const rawStatus = isFirstRfq ? "Quoted" : rfq.status;
  // After user clicks "Send", escalate to "Sent to Client"
  const displayStatus = sent ? "Sent to Client" : (STATUS_MAP[rawStatus] ?? rawStatus);

  // Badge colour matching the list
  const statusBadgeClass =
    displayStatus === "Quote Generated"  ? "bg-cyan-50 text-cyan-700 border border-cyan-200" :
    displayStatus === "Sent to Client"   ? "bg-success/10 text-success border border-success/20" :
    displayStatus === "PO Received"      ? "bg-violet-50 text-violet-700 border border-violet-200" :
    "bg-muted/30 text-muted-foreground border border-transparent";

  const quoteNo = `Q${rfq.id.replace(/[^0-9]/g, "").slice(-5)}`;
  const partNo = rfq.id.replace("RFQ-", "");
  const contactName = rfq.contactName ?? rfq.sender.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const clientAddr = CLIENT_ADDRESSES[rfq.client] ?? [rfq.client];
  const quoteDate = new Date(rfq.receivedAt.replace(" ", "T")).toLocaleDateString("en-GB");

  const defaultSubject = `Quotation #${quoteNo} – Part No. ${partNo} – ${rfq.client}`;
  const firstName = contactName.split(" ")[0];
  const defaultBody = `Dear ${firstName},

Please find attached our Quotation and Proposal Drawing for part number ${partNo}.

Quotation #${quoteNo}
  Part No.    : ${partNo}
  Quantity    : ${rfq.qty} Units
  Unit Price  : $ ${cs.unitPrice.toFixed(2)}
  Total Value : $ ${(cs.unitPrice * rfq.qty).toFixed(2)}
  Validity    : 12 June 2026
  Delivery    : 8–10 weeks from Purchase Order

Proposal Drawing: ${partNo}_PROPOSAL_DWG.pdf

Kindly review the enclosed documents and revert with your approval or queries.

--
Regards,
V. Shiva
RFQ Engine India Private Limited`;

  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [showRecipients, setShowRecipients] = useState(false);

  const defaultAttachments: AttachmentDoc[] = [
    { id: "rfq", label: "Customer RFQ", filename: `${rfq.id}_RFQ.pdf`, size: "1.1 MB", icon: "rfq" },
    { id: "quote", label: "Quotation Document", filename: `Quote_${partNo}.pdf`, size: "0.8 MB", icon: "pdf" },
    { id: "prop", label: "Proposal Drawing", filename: `${partNo}_PROPOSAL_DWG.pdf`, size: "2.4 MB", icon: "drawing" },
  ];
  const [attachments, setAttachments] = useState<AttachmentDoc[]>(defaultAttachments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function downloadFile(url: string, filename: string) {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  function handleDownloadQuote() {
    downloadFile(quotePreviewImage, `Quote_${partNo}.png`);
    toast.success("Quote document downloaded");
  }

  function removeAttachment(id: string) {
    setAttachments(a => a.filter(x => x.id !== id));
  }

  function handleAddFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(f => {
      setAttachments(a => [...a, {
        id: `custom-${Date.now()}-${f.name}`,
        label: f.name.replace(/\.[^.]+$/, ""),
        filename: f.name,
        size: f.size > 1_000_000 ? `${(f.size / 1_048_576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
        icon: "pdf",
      }]);
    });
    e.target.value = "";
  }

  function handleSend() {
    setSent(true);
    setActiveRfq(rfq.id);
    transition(rfq.id, "Quoted", "Sales");
    setShowComposer(false);
    toast.success(`Quote email sent to ${contactName}`);
  }

  function handleSaveDraft() {
    toast.info("Draft saved");
  }

  return (
    <>
      <ModuleHeader
        breadcrumbs={["Operate", "Review", "Quotation"]}
        title="Quotation Document"
        subtitle={`Quotation # ${quoteNo} · ${rfq.client}`}
        titleSuffix={
          <StageSLAChip stage="Quoted" />
        }
        actions={
          <>
            <Btn variant="ghost" size="sm" onClick={onBack} className="mr-2">← Back to Quotes</Btn>
            <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/drawings" })}>Proposal Drawing</Btn>
            <Btn variant="outline" size="sm" onClick={handleDownloadQuote}><Download className="h-3.5 w-3.5" />Download PDF</Btn>

            <Btn size="sm" disabled={sent} onClick={() => setShowComposer(v => !v)}>
              <Mail className="h-3.5 w-3.5" />{sent ? "Sent ✓" : showComposer ? "Hide Composer" : "Send to Client"}
            </Btn>
          </>
        }
      />
      <StageWorkflowChrome stage="Quoted" />

      <div className="flex flex-col-reverse gap-6 p-6 lg:p-8">
        <div className="grid grid-cols-12 gap-6">

          {/* ── Quote PDF Preview ── */}
          <div className="col-span-12 lg:col-span-8">
            <Section title="Final Quote Preview">
              {/* White A4-style document */}
              <div className="bg-white text-[#222] rounded-b-xl px-10 py-8 text-sm">

                {/* Title */}
                <h1 className="text-[22px] font-black text-center mb-6 tracking-tight">Final Quote</h1>

                {/* Company header */}
                <div className="flex justify-between items-start mb-8">
                  {/* Left: logo block + company info */}
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-14 shrink-0 items-center justify-center rounded bg-[#1a3a5c] text-white text-[8px] font-extrabold leading-tight text-center px-1 py-1">
                      SEA<br />HYDRO<br />SYSTEMS
                    </div>
                    <div>
                      <div className="text-[11px] font-bold">{COMPANY.name}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 leading-snug">
                        {COMPANY.addressLine1}<br />
                        {COMPANY.addressLine2}<br />
                        {COMPANY.addressLine3}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">CIN: {COMPANY.cin}</div>
                      <div className="text-[10px] text-gray-500">GSTIN: {COMPANY.gstin}</div>
                    </div>
                  </div>
                  {/* Right: customer address */}
                  <div className="text-right text-[11px] text-gray-600 leading-snug">
                    <div className="font-semibold text-[12px] text-gray-800">{rfq.client}</div>
                    {clientAddr.map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                </div>

                {/* Quotation number + date */}
                <div className="mb-0.5">
                  <span className="text-[20px] font-bold text-[#c0392b]">Quotation # {quoteNo}</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-2 mb-0.5">Quotation Date:</div>
                <div className="text-[12px] font-semibold mb-6">{quoteDate}</div>

                {/* Line items */}
                <table className="w-full text-[12px] border border-gray-300 mb-6">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Product</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-semibold">Quantity</th>
                      <th className="border border-gray-300 px-4 py-2 text-right font-semibold w-36">
                        Unit Price<br />(USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 px-4 py-3 text-[#c0392b] font-semibold">{partNo}</td>
                      <td className="border border-gray-300 px-4 py-3 text-right tabular-nums">{rfq.qty} Units</td>
                      <td className="border border-gray-300 px-4 py-3 text-right tabular-nums">$ {cs.unitPrice.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* Terms & Conditions */}
                <div className="text-[11px] text-gray-600 mb-10">
                  Terms &amp; Conditions:{" "}
                  <span className="text-blue-600 underline cursor-pointer">https://seahydro1.odoo.com/terms</span>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 pt-3 text-[10px] text-gray-400 text-center">
                  {COMPANY.phone} | {COMPANY.email} | {COMPANY.website} | GST: {COMPANY.gstin}
                </div>
              </div>
            </Section>
          </div>

          {/* ── Side Panel ── */}
          <div className="col-span-12 lg:col-span-4 space-y-5">

            <Section title="Quote Details">
              <div className="p-4 space-y-2 text-[12px]">
                {([
                  ["Quotation No.", `# ${quoteNo}`],
                  ["RFQ Ref", rfq.id],
                  ["Client", rfq.client],
                  ["Contact", contactName],
                  ["Qty", `${rfq.qty} units`],
                  ["Unit Price", `$ ${cs.unitPrice.toFixed(2)}`],
                  ["Total Value", `$ ${(cs.unitPrice * rfq.qty).toFixed(2)}`],
                  ["Valid Until", "12 Jun 2026"],
                  ["Delivery", "8–10 wks from PO"],
                ] as [string, string][]).map(([label, value], i) => (
                  <div key={i} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={label === "Total Value" ? "font-bold text-primary" : "font-medium text-right"}>{value}</span>
                  </div>
                ))}
                {/* Status badge — matches list view */}
                <div className="flex justify-between items-center gap-3 pt-1">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusBadgeClass}`}>
                    {displayStatus}
                  </span>
                </div>
              </div>
            </Section>

            <Section title="Status">
              <div className="p-4 space-y-2.5">
                {(() => {
                  const isSentToClient = displayStatus === "Sent to Client" || displayStatus === "PO Received";
                  const isPOReceived   = displayStatus === "PO Received";
                  return ([
                    ["Costing Finalized", true,           "09:42"],
                    ["Internal Review",   true,           "11:02"],
                    ["Quote Generated",   true,           "11:08"],
                    ["Sent to Client",    isSentToClient, isSentToClient ? "—" : ""],
                    ["PO Received",       isPOReceived,   isPOReceived   ? "—" : ""],
                  ] as [string, boolean, string][]);
                })().map(([step, done, time], i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${done ? "bg-success text-white" : "bg-muted text-muted-foreground"}`}>
                      {done ? <CheckCircle2 className="h-3 w-3" /> : <span className="text-[9px] font-bold">{i + 1}</span>}
                    </div>
                    <span className={`flex-1 text-[12px] ${done ? "" : "text-muted-foreground"}`}>{step}</span>
                    {time && <span className="text-[11px] text-muted-foreground">{time}</span>}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>

        {/* ── Gmail-style Email Composer ── */}
        {showComposer && (
          <div className="col-span-12">
            <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">

              {/* Gmail-style email header */}
              <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 rounded-full bg-primary grid place-items-center text-white text-[13px] font-bold shrink-0 mt-0.5">VR</div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-foreground">Shiva</span>
                      <span className="text-[12px] text-muted-foreground">&lt;shiva@rfq-engine.com&gt;</span>
                    </div>
                    {/* To recipients */}
                    <button
                      onClick={() => setShowRecipients(v => !v)}
                      className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors mt-0.5 group"
                    >
                      <span>to <span className="font-medium text-foreground">{contactName}</span>, {rfq.sender}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showRecipients ? "rotate-180" : ""}`} />
                    </button>
                    {showRecipients && (
                      <div className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-[11px] space-y-1 min-w-[280px]">
                        <div className="flex gap-3"><span className="text-muted-foreground w-12 shrink-0">from</span><span>shiva@rfq-engine.com</span></div>
                        <div className="flex gap-3"><span className="text-muted-foreground w-12 shrink-0">to</span><span>{rfq.sender}</span></div>
                        <div className="flex gap-3"><span className="text-muted-foreground w-12 shrink-0">subject</span>
                          <Input
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                            className="h-6 text-[11px] border-none shadow-none focus-visible:ring-0 px-0 flex-1 bg-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {/* Right: time + close */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span>{new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="text-muted-foreground/50">(just now)</span>
                  </div>
                  <button
                    onClick={() => setShowComposer(false)}
                    className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Email Body — click to edit */}
              <div className="relative group px-5 pt-4 pb-2">
                {!editBody ? (
                  <div
                    onClick={() => setEditBody(true)}
                    className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap min-h-[180px] cursor-text"
                  >
                    {body}
                    <Pencil className="absolute top-4 right-5 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <Textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    onBlur={() => setEditBody(false)}
                    autoFocus
                    className="min-h-[180px] rounded-none border-none shadow-none focus-visible:ring-0 resize-none text-[13px] leading-relaxed px-0 py-0"
                  />
                )}
              </div>

              {/* ── Gmail-style Attachment Thumbnails ── */}
              {attachments.length > 0 && (
                <div className="px-5 py-4 border-t border-border">
                  <p className="text-[12px] text-muted-foreground mb-3">
                    {attachments.length} attachment{attachments.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {attachments.map(doc => (
                      <AttachmentThumbnail
                        key={doc.id}
                        doc={doc}
                        onRemove={() => removeAttachment(doc.id)}
                      />
                    ))}
                    {/* Add more */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center w-[130px] h-[110px] rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-colors text-muted-foreground hover:text-primary gap-1.5"
                    >
                      <Plus className="h-5 w-5" />
                      <span className="text-[10px] font-medium">Add file</span>
                    </button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleAddFile} />
                  </div>
                </div>
              )}

              {/* Action bar */}
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-border bg-muted/20">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Paperclip className="h-3.5 w-3.5" />Attach File
                </button>
                <div className="flex items-center gap-2">
                  <Btn variant="ghost" size="sm" onClick={() => setShowComposer(false)}>Discard</Btn>
                  <Btn variant="outline" size="sm" onClick={handleSaveDraft}>
                    <Save className="h-3.5 w-3.5" />Save Draft
                  </Btn>
                  <Btn size="sm" disabled={sent} onClick={handleSend}>
                    <Send className="h-3.5 w-3.5" />{sent ? "Sent ✓" : "Send"}
                  </Btn>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

/* ── Gmail-style Attachment Thumbnail ── */
const DOC_STYLE: Record<AttachmentDoc["icon"], { strip: string; icon: string; label: string }> = {
  pdf: { strip: "bg-red-600", icon: "text-red-500", label: "PDF" },
  drawing: { strip: "bg-blue-600", icon: "text-blue-500", label: "DWG" },
  rfq: { strip: "bg-amber-500", icon: "text-amber-500", label: "RFQ" },
};

function AttachmentThumbnail({ doc, onRemove }: { doc: AttachmentDoc; onRemove: () => void }) {
  const style = DOC_STYLE[doc.icon];
  const Icon = doc.icon === "drawing" ? FileImage : doc.icon === "rfq" ? FileBadge2 : FileText;

  return (
    <div className="group relative w-[130px] rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow">
      {/* Preview area */}
      <div className="h-[78px] bg-gray-50 flex flex-col items-center justify-center gap-1.5 relative">
        {/* Simulated document lines */}
        <div className="absolute inset-3 flex flex-col gap-1 opacity-20">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-1 rounded-full bg-gray-400 ${i === 0 ? "w-full" : i === 1 ? "w-4/5" : i === 2 ? "w-full" : i === 3 ? "w-3/4" : "w-1/2"}`} />
          ))}
        </div>
        <Icon className={`h-7 w-7 ${style.icon} relative z-10`} />
        {/* Remove button on hover */}
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-white/90 shadow text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 z-20"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      {/* Filename strip — coloured like Gmail */}
      <div className={`${style.strip} px-2 py-1.5 flex items-center gap-1.5`}>
        <Icon className="h-3 w-3 text-white/90 shrink-0" />
        <span className="text-[10px] font-medium text-white truncate">{doc.filename.replace(/\.[^.]+$/, "")}</span>
      </div>
    </div>
  );
}
