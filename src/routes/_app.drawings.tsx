import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import {
    Upload, CheckCircle2, FileText, Download,
    Paperclip, FileImage,
    Plus, Eye, Trash2,
} from "lucide-react";
import { RFQS } from "@/data/mock";
import rfqReceivedFromCustomerImg from "@/assets/RFQ Received From Customer.png";
import quoteImg from "@/assets/quote.png";
import { ModuleHeader, Section, Btn } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip, StageCompletionGuard } from "@/components/workflow";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ProposalCylinderDrawing } from "@/components/shell/DrawingClarificationViewer";

function DrawingPreviewPanel({ title, subtitle }: { title?: string; subtitle?: string }) {
    return (
        <div className="flex h-full min-h-[340px] flex-col">
            {(title || subtitle) && (
                <div className="shrink-0 border-b border-border bg-white/80 px-3 py-2">
                    {title && <div className="text-[11px] font-semibold text-foreground">{title}</div>}
                    {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
                </div>
            )}
            <div className="flex-1 overflow-auto p-3">
                <ProposalCylinderDrawing />
            </div>
        </div>
    );
}

export const Route = createFileRoute("/_app/drawings")({
    head: () => ({ meta: [{ title: "Proposal Drawings — SeaHydrosys" }] }),
    component: DrawingsPage,
});

type UploadedFile = { name: string; size: string; type: "PDF" | "PPT"; objectUrl: string };
type RefDoc = { id: string; label: string; meta: string; iconColor: string; bgColor: string; icon: "paperclip" | "filetext"; objectUrl?: string; imageUrl?: string };

/* ── Preview Modal ── */
function PreviewModal({ doc, onClose }: {
    doc: { title: string; meta: string; objectUrl?: string; imageUrl?: string; type?: string } | null;
    onClose: () => void;
}) {
    if (!doc) return null;
    return (
        <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-w-5xl w-full h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="flex flex-row items-center gap-3 px-5 py-3.5 border-b shrink-0 pr-12">
                    <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-50 text-blue-600">
                        <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <DialogTitle className="text-[14px] font-semibold leading-tight truncate">{doc.title}</DialogTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{doc.meta}</p>
                    </div>
                </DialogHeader>
                <div className="flex-1 overflow-hidden bg-zinc-100 flex items-center justify-center p-4">
                    {doc.imageUrl ? (
                        <img
                            src={doc.imageUrl}
                            alt={doc.title}
                            className="max-w-full max-h-full object-contain shadow-md rounded border bg-white"
                        />
                    ) : doc.objectUrl ? (
                        <iframe
                            src={doc.objectUrl}
                            title={doc.title}
                            className="w-full h-full border-0"
                        />
                    ) : (
                        <DrawingPreviewPanel
                            title={doc.title}
                            subtitle="Prototype preview — GA drawing from RFQ package"
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function DrawingsPage() {
    const navigate = useNavigate();
    const { activeRfqId } = useWorkflow();
    const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];
    const [uploaded, setUploaded] = useState<UploadedFile | null>(null);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const addRefInputRef = useRef<HTMLInputElement>(null);
    const [previewDoc, setPreviewDoc] = useState<{ title: string; meta: string; objectUrl?: string; type?: string } | null>(null);
    const [refDocs, setRefDocs] = useState<RefDoc[]>([
        {
            id: "rfq-attach",
            label: "Customer Request Attachment",
            meta: `${rfq.id}_Customer_RFQ.pdf · PDF · 1.2 MB · Received ${rfq.receivedAt}`,
            iconColor: "text-blue-600", bgColor: "bg-blue-50", icon: "paperclip",
            imageUrl: rfqReceivedFromCustomerImg,
        },
        {
            id: "our-quote",
            label: "Our Quote",
            meta: `${rfq.id}_Quote_v1.pdf · PDF · 0.8 MB · Generated from Costing`,
            iconColor: "text-emerald-600", bgColor: "bg-emerald-50", icon: "filetext",
            imageUrl: quoteImg,
        },
    ]);

    function formatBytes(bytes: number) {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function handleFile(file: File) {
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (!["pdf", "ppt", "pptx"].includes(ext ?? "")) {
            toast.error("Only PDF or PPT/PPTX files are accepted");
            return;
        }
        const type: "PDF" | "PPT" = ext === "pdf" ? "PDF" : "PPT";
        const objectUrl = URL.createObjectURL(file);
        setUploaded({ name: file.name, size: formatBytes(file.size), type, objectUrl });
        toast.success("Proposal drawing uploaded successfully");
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    }

    function handleAddRef(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
        const objectUrl = URL.createObjectURL(file);
        const newRef: RefDoc = {
            id: `ref-${Date.now()}`,
            label: file.name.replace(/\.[^.]+$/, ""),
            meta: `${file.name} · ${ext.toUpperCase()} · ${formatBytes(file.size)} · Added now`,
            iconColor: "text-violet-600", bgColor: "bg-violet-50",
            icon: "filetext", objectUrl,
        };
        setRefDocs((prev) => [...prev, newRef]);
        toast.success(`"${file.name}" added as reference`);
        if (addRefInputRef.current) addRefInputRef.current.value = "";
    }

    function handleRemoveRef(id: string) {
        setRefDocs((prev) => {
            const doc = prev.find((d) => d.id === id);
            if (doc?.objectUrl) URL.revokeObjectURL(doc.objectUrl);
            return prev.filter((d) => d.id !== id);
        });
    }

    function handleReplaceUploaded() {
        if (uploaded?.objectUrl) URL.revokeObjectURL(uploaded.objectUrl);
        setUploaded(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
        <>
            <ModuleHeader
                breadcrumbs={["Deliver", "Proposal Drawings"]}
                title="Proposal Drawings"
                subtitle={`${rfq.id} · ${rfq.client} · Create and share proposal drawing for customer approval`}
                titleSuffix={<StageSLAChip stage="Drawings" />}
                actions={
                    <>
                        <Btn variant="outline" size="sm" onClick={() => navigate({ to: "/review" })}>
                            ← Back to Review
                        </Btn>
                        <StageCompletionGuard stage="Drawings" actor="Sales" actionLabel="Proceed to Quote Management" />
                    </>
                }
            />
            <StageWorkflowChrome stage="Drawings" />

            <div className="p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                    {/* Reference Documents ── */}
                    <Section
                        title="Reference Documents"
                        className="flex flex-col"
                        action={
                            <>
                                <button
                                    onClick={() => addRefInputRef.current?.click()}
                                    title="Add reference document"
                                    className="grid h-7 w-7 place-items-center rounded-lg border border-dashed border-border hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                </button>
                                <input
                                    ref={addRefInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={handleAddRef}
                                />
                            </>
                        }
                    >
                        <div className="divide-y divide-border">
                            {refDocs.map((doc) => (
                                <div key={doc.id} className="flex items-center gap-3 px-4 py-3.5 group">
                                    <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${doc.bgColor} ${doc.iconColor}`}>
                                        {doc.icon === "paperclip" ? <Paperclip className="h-4.5 w-4.5" /> : <FileText className="h-4.5 w-4.5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13px] font-semibold leading-tight">{doc.label}</div>
                                        <div className="mt-0.5 text-[11px] text-muted-foreground leading-snug">{doc.meta}</div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Btn
                                            variant="outline" size="sm"
                                            onClick={() => setPreviewDoc({ title: doc.label, meta: doc.meta, objectUrl: doc.objectUrl, imageUrl: doc.imageUrl, type: "PDF" })}
                                        >
                                            <Eye className="h-3.5 w-3.5" />Preview
                                        </Btn>
                                        <Btn variant="outline" size="sm">
                                            <Download className="h-3.5 w-3.5" />
                                        </Btn>
                                        <button
                                            onClick={() => handleRemoveRef(doc.id)}
                                            title="Remove document"
                                            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* Upload Proposal Drawing ── */}
                    <Section title="Upload Proposal Drawing" className="flex flex-col">
                        <div className="p-5 space-y-4 flex-1 flex flex-col">
                            <p className="text-[12px] text-muted-foreground">
                                Create the proposal drawing in CAD software based on approved BOM &amp; dimensions, then upload below.
                            </p>

                            {uploaded ? (
                                <div className="flex-1 flex flex-col gap-3">
                                    {/* Uploaded file info bar */}
                                    <div className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4">
                                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-600">
                                            {uploaded.type === "PDF" ? <FileText className="h-6 w-6" /> : <FileImage className="h-6 w-6" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[14px] font-semibold text-emerald-800 leading-tight truncate">{uploaded.name}</div>
                                            <div className="mt-0.5 text-[11px] text-emerald-600">{uploaded.type} · {uploaded.size}</div>
                                        </div>
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                        <button
                                            onClick={handleReplaceUploaded}
                                            title="Remove uploaded drawing"
                                            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    {/* Preview area */}
                                    <div className="flex-1 rounded-xl border overflow-hidden bg-zinc-50 min-h-[340px]">
                                        {uploaded.type === "PDF" ? (
                                            <iframe
                                                src={uploaded.objectUrl}
                                                title={uploaded.name}
                                                className="w-full h-full border-0 min-h-[340px]"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full min-h-[340px] gap-3 text-muted-foreground">
                                                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white border shadow-sm">
                                                    <FileImage className="h-8 w-8 text-zinc-400" />
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[13px] font-semibold text-zinc-600">PPT preview not available</div>
                                                    <div className="text-[11px] mt-0.5">{uploaded.name}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {/* Actions row */}
                                    <div className="flex items-center justify-between">
                                        <Btn variant="outline" size="sm" onClick={handleReplaceUploaded}>
                                            Replace
                                        </Btn>
                                        <Btn
                                            variant="outline" size="sm"
                                            onClick={() => setPreviewDoc({ title: uploaded.name, meta: `${uploaded.type} · ${uploaded.size}`, objectUrl: uploaded.objectUrl, type: uploaded.type })}
                                        >
                                            <Eye className="h-3.5 w-3.5" />Full Screen Preview
                                        </Btn>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-1 flex-col gap-4">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                                        onDragLeave={() => setDragging(false)}
                                        onDrop={handleDrop}
                                        className={`flex shrink-0 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-surface-2"}`}
                                    >
                                        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10">
                                            <Upload className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[14px] font-semibold">Click or drag to upload</div>
                                            <div className="mt-1 text-[12px] text-muted-foreground">PDF or PPT — replaces preview below</div>
                                        </div>
                                        <Btn variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                            <Upload className="h-3.5 w-3.5" />Browse File
                                        </Btn>
                                    </div>
                                    {/* Removed: Proposal drawing preview before upload */}
                                </div>
                            )}

                            <input ref={fileInputRef} type="file" accept=".pdf,.ppt,.pptx" className="hidden" onChange={handleInputChange} />
                        </div>
                    </Section>

                </div>
            </div>

            {/* ── Preview Modal ── */}
            {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
        </>
    );
}
