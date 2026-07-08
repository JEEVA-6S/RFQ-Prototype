import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
    Mail, Paperclip, Clock,
    CheckCircle2, Sparkles, Send, ArrowLeft, Calendar,
    FileText, Building2, Tag, Hash, CalendarCheck, CheckCircle,
    Pencil, Save, ChevronRight, Plus, Trash2, UserRound, AlertCircle,
} from "lucide-react";
import rfqImage from "@/assets/RFQ Received From Customer.png";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { RFQS, TEAM_MEMBERS } from "@/data/mock";
import { ModuleHeader, PriorityDot, Btn, ConfidenceBadge } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip } from "@/components/workflow";
import { StageCompletionGuard } from "@/components/workflow/StageCompletionGuard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";
import { getSlaMetrics } from "@/lib/utils";

export const Route = createFileRoute("/_app/rfq-inbox")({
    head: () => ({ meta: [{ title: "RFQ Inbox — SeaHydrosys" }] }),
    component: RfqInbox,
});

// Work categories
const WORK_CATEGORIES = ["Tie-Rod Cylinder", "Welded Cylinder", "Telescopic", "Mill-Type", "Long-Stroke", "Custom", "RFQ", "Revise Costing"];
const ASSIGNEE_OPTIONS = ["Unassigned", ...TEAM_MEMBERS];

const customerRequestVariants = [
    (r: typeof RFQS[0]) => `Can we please have the below cylinder dimensions but your usual style of cylinder (threaded gland etc). ${r.qty}pcs per year.`,
    (r: typeof RFQS[0]) => `Please quote for ${r.qty} units of welded cylinders for offshore platform application. Need DNV certification.`,
    (r: typeof RFQS[0]) => `Requesting quotation for hydraulic cylinders as per attached specifications. Annual requirement: ${r.qty} pieces.`,
    (r: typeof RFQS[0]) => `Need pricing for custom hydraulic cylinders. Quantity: ${r.qty} units. Please confirm lead time.`,
    (r: typeof RFQS[0]) => `Please provide quote for ${r.qty} units with material test certificates. Delivery to Mumbai port.`,
];

const previewVariants = [
    (r: typeof RFQS[0]) => `Hello Shiva,\n\nCan we please have the below cylinder dimensions but your usual style of cylinder (threaded gland etc).\n\n${r.qty}pcs per year.\n\nPlease find attached drawings and technical specifications.\n\nRegards,\n${r.sender}`,
    (r: typeof RFQS[0]) => `Hi Shiva,\n\nPlease quote for ${r.qty} units of welded cylinders for offshore platform application. Need DNV certification.\n\nDrawings attached.\n\nBest,\n${r.sender}`,
    (r: typeof RFQS[0]) => `Dear Shiva,\n\nRequesting quotation for hydraulic cylinders as per attached specifications.\n\nAnnual requirement: ${r.qty} pieces.\n\nThanks,\n${r.sender}`,
    (r: typeof RFQS[0]) => `Hi Team,\n\nNeed pricing for custom hydraulic cylinders. Quantity: ${r.qty} units.\n\nPlease confirm lead time.\n\nRegards,\n${r.sender}`,
    (r: typeof RFQS[0]) => `Hello,\n\nPlease provide quote for ${r.qty} units with material test certificates. Delivery to Mumbai port.\n\nThanks,\n${r.sender}`,
];

function getAssignedTeamMember(index: number): string {
    if (index < 3) {
        return "Unassigned";
    }

    const randomIndex = (index * 7 + 3) % TEAM_MEMBERS.length;
    return TEAM_MEMBERS[randomIndex];
}

function mapStatusToStage(status: string): string {
    switch (status) {
        case "Received":
            return "RFQ";
        case "BOM":
            return "BOM & Parts";
        case "Feasibility":
            return "Feasibility & Availability";
        case "Costing":
            return "Costing";
        case "Review":
            return "Internal Review";
        case "Drawings":
            return "Proposal Drawing";
        case "Quoted":
        case "Sent":
            return "Quote Management";
        default:
            return status;
    }
}

function calculateCommitmentDate(receivedAt: string, slaHrs: number): string {
    const date = new Date(receivedAt);
    date.setHours(date.getHours() + Math.ceil(slaHrs) + 24);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function formatInboxReceivedAt(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function createInboxItem(r: typeof RFQS[number], index: number) {
    return {
        ...r,
        sNo: index + 1,
        enquiryNo: `ENQ-${r.id.split("-")[2]}`,
        customerRequest: customerRequestVariants[index % customerRequestVariants.length](r),
        noOfModels: r.qty,
        assignedTo: r.assignedTo || getAssignedTeamMember(index),
        assignedDate: r.receivedAt.split(" ")[0],
        commitmentDate: calculateCommitmentDate(r.receivedAt, r.slaHrs),
        completedOn: index >= RFQS.length - 3 ? calculateCommitmentDate(r.receivedAt, r.slaHrs - 2) : "",
        stage: index < 3 ? "RFQ" : mapStatusToStage(r.status),
        preview: previewVariants[index % previewVariants.length](r),
        received: r.receivedAt,
    };
}

type InboxMail = ReturnType<typeof createInboxItem>;

const INITIAL_INBOX_ITEMS = RFQS.map(createInboxItem);

function generateDraftResponse(mail: InboxMail): string {
    const contactName = mail.contactName || "Team";
    return `Dear ${contactName},

Thank you for sharing the enquiry with us, will review and share the quotation by the end of this week.

Key details noted:
• Subject: ${mail.subject}
• Quantity: ${mail.qty} units
• Reference: ${mail.id}

Best regards,
Mithilesh Ren.K
mithileshren@rfq-engine.com
RFQ Engine India Pvt Ltd`;
}

interface EditableFields {
    workCategory: string;
    noOfModels: number;
    assignedTo: string;
    assignedDate: string;
    commitmentDate: string;
    completedOn: string;
}

interface NewRFQFormData {
    client: string;
    sender: string;
    senderEmail: string;
    subject: string;
    customerRequest: string;
    qty: number;
    priority: "High" | "Medium" | "Low";
    region: string;
}

interface AttachmentItem {
    id: string;
    name: string;
    sizeLabel: string;
}

const INITIAL_NEW_RFQ_FORM_DATA: NewRFQFormData = {
    client: "",
    sender: "",
    senderEmail: "",
    subject: "",
    customerRequest: "",
    qty: 1,
    priority: "Medium",
    region: "India",
};

function formatAttachmentSize(sizeInBytes: number) {
    return sizeInBytes > 1_048_576 ? `${(sizeInBytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeInBytes / 1024))} KB`;
}

function RfqInbox() {
    const { getStatus, getStageTimeline, getStageStatus, setActiveRfq } = useWorkflow();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState<"inbox" | "commitment">("inbox");
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    // Modal and form state
    const [showAddRFQModal, setShowAddRFQModal] = useState(false);
    const [formData, setFormData] = useState<NewRFQFormData>(INITIAL_NEW_RFQ_FORM_DATA);
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [inboxItems, setInboxItems] = useState<InboxMail[]>(INITIAL_INBOX_ITEMS);

    // Editable fields state
    const [editableFields, setEditableFields] = useState<EditableFields | null>(null);

    // Draft response state
    const [draftResponse, setDraftResponse] = useState<string>("");
    const [responseSent, setResponseSent] = useState<Set<string>>(new Set());

    // Image popup state
    const [showImageModal, setShowImageModal] = useState(false);

    const selectedMail = selectedId ? inboxItems.find((r) => r.id === selectedId) : null;

    // Initialize editable fields and draft response when mail is selected
    useEffect(() => {
        if (selectedId) {
            const mail = inboxItems.find((r) => r.id === selectedId);
            if (mail) {
                setActiveRfq(mail.id);
                setEditableFields({
                    workCategory: mail.category,
                    noOfModels: mail.noOfModels,
                    assignedTo: mail.assignedTo,
                    assignedDate: mail.assignedDate,
                    commitmentDate: mail.commitmentDate,
                    completedOn: mail.completedOn,
                });
                setDraftResponse(generateDraftResponse(mail));
            }
        }
    }, [selectedId, inboxItems, setActiveRfq]);

    function handleBackToList() {
        setSelectedId(null);
        setEditableFields(null);
    }

    function handleSaveFields() {
        if (!selectedMail || !editableFields) {
            return;
        }

        setInboxItems((current) =>
            current.map((item) =>
                item.id === selectedMail.id
                    ? { ...item, ...editableFields }
                    : item
            )
        );
        toast.success("Design commitment data saved successfully");
    }

    function handleSendResponse() {
        if (selectedMail) {
            setResponseSent((prev) => new Set(prev).add(selectedMail.id));
            toast.success(`Response sent to ${selectedMail.sender}`);
        }
    }

    function handleAddRFQ() {
        if (!formData.client || !formData.sender || !formData.subject) {
            toast.error("Please fill in all required fields");
            return;
        }

        const receivedAt = formatInboxReceivedAt();
        const newRfqId = `RFQ-${receivedAt.replace(/[-:\s]/g, "").slice(0, 14)}`;
        const newItem: InboxMail = {
            id: newRfqId,
            client: formData.client,
            sender: formData.senderEmail || formData.sender,
            contactName: formData.sender,
            subject: formData.subject,
            category: formData.priority === "High" ? "Custom" : "RFQ",
            qty: formData.qty,
            value: 0,
            priority: formData.priority,
            status: "Received",
            owner: "",
            slaHrs: formData.priority === "High" ? 4 : formData.priority === "Medium" ? 8 : 24,
            receivedAt,
            attachments: attachments.length,
            confidence: "medium",
            region: formData.region,
            sNo: 1,
            enquiryNo: `ENQ-${receivedAt.replace(/[-:\s]/g, "").slice(0, 10)}`,
            customerRequest: formData.customerRequest || formData.subject,
            noOfModels: formData.qty,
            assignedTo: "Unassigned",
            assignedDate: receivedAt.split(" ")[0],
            commitmentDate: calculateCommitmentDate(receivedAt, formData.priority === "High" ? 4 : formData.priority === "Medium" ? 8 : 24),
            stage: mapStatusToStage("Received"),
            completedOn: "",
            preview: formData.customerRequest || formData.subject,
            received: receivedAt,
        };

        setInboxItems((current) => [
            newItem,
            ...current.map((item, index) => ({
                ...item,
                sNo: index + 2,
            })),
        ]);

        toast.success(
            `New RFQ "${formData.subject}" added successfully${attachments.length ? ` with ${attachments.length} attachment${attachments.length === 1 ? "" : "s"}` : ""}`
        );
        setShowAddRFQModal(false);
        setFormData(INITIAL_NEW_RFQ_FORM_DATA);
        setAttachments([]);
        if (attachmentInputRef.current) {
            attachmentInputRef.current.value = "";
        }
    }

    function resetFormData() {
        setFormData(INITIAL_NEW_RFQ_FORM_DATA);
        setAttachments([]);
        if (attachmentInputRef.current) {
            attachmentInputRef.current.value = "";
        }
    }

    function handleAttachmentPick(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) {
            return;
        }

        const pickedAttachments = Array.from(files).map((file) => ({
            id: `${file.name}-${file.lastModified}-${file.size}`,
            name: file.name,
            sizeLabel: formatAttachmentSize(file.size),
        }));

        setAttachments((current) => [...current, ...pickedAttachments]);
        e.target.value = "";
    }

    function removeAttachment(id: string) {
        setAttachments((current) => current.filter((attachment) => attachment.id !== id));
    }

    function updateFormField<K extends keyof NewRFQFormData>(field: K, value: NewRFQFormData[K]) {
        setFormData({ ...formData, [field]: value });
    }

    function updateField<K extends keyof EditableFields>(field: K, value: EditableFields[K]) {
        if (editableFields) {
            setEditableFields({ ...editableFields, [field]: value });
        }
    }

    // ─── List View (Gmail-style) ───
    if (!selectedMail) {
        return (
            <>
                <ModuleHeader
                    breadcrumbs={["Operate", "RFQ Inbox"]}
                    title="RFQ Inbox"
                    actions={
                        <>
                            <Btn variant="default" size="sm" onClick={() => setShowAddRFQModal(true)}>
                                <Plus className="h-3.5 w-3.5" />Add RFQ
                            </Btn>

                        </>
                    }
                />

                <div className="flex flex-col h-[calc(100vh-10rem)] border-t border-border">

                    <div className="px-6 py-3 border-b border-border bg-background">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "inbox" | "commitment")}>
                            <TabsList>
                                <TabsTrigger value="inbox">Inbox</TabsTrigger>
                                <TabsTrigger value="commitment">Commitment Sheet</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "inbox" | "commitment")}>
                        <TabsContent value="inbox">
                            <div className="flex-1 overflow-y-auto">
                                {inboxItems.map((r) => (
                                    <div
                                        key={r.id}
                                        onClick={() => setSelectedId(r.id)}
                                        className={`cursor-pointer border-b border-border px-6 py-4 transition-all hover:bg-surface/60 hover:shadow-sm flex items-center gap-4 ${getStatus(r.id) === "Received" ? "bg-surface/30 font-medium" : ""}`}
                                    >
                                        {/* Priority */}
                                        <div className="shrink-0">
                                            <PriorityDot p={r.priority} />
                                        </div>

                                        {/* Sender/Client */}
                                        <div className="w-[180px] shrink-0">
                                            <div className="text-[13px] font-semibold truncate">{r.client}</div>
                                            <div className="text-[11px] text-muted-foreground truncate">{r.sender}</div>
                                        </div>

                                        {/* Subject & Preview */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[11px] font-semibold text-primary">{r.id}</span>
                                                <span className="text-[13px] truncate">{r.subject}</span>
                                            </div>
                                            <div className="text-[12px] text-muted-foreground truncate mt-0.5">{r.customerRequest}</div>
                                        </div>

                                        {/* Meta Info */}
                                        <div className="flex items-center gap-4 shrink-0 text-[11px] text-muted-foreground">

                                            {(() => {
                                                const timeline = getStageTimeline(r.id, "Received");
                                                const stageStatus = getStageStatus(r.id, "Received");
                                                const sla = getSlaMetrics({
                                                    startedAt: timeline?.startedAt,
                                                    completedAt: timeline?.completedAt,
                                                    slaMinutes: timeline?.slaMinutes,
                                                });

                                                if (stageStatus !== "completed" && (sla.status === "warning" || sla.status === "breached")) {
                                                    const isBreached = sla.status === "breached";
                                                    const badgeClass = isBreached
                                                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-800"
                                                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-800";

                                                    return (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${badgeClass}`}>
                                                            <AlertCircle className="h-3 w-3" />
                                                            SLA
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                            <span className="flex items-center gap-1 max-w-[120px] truncate">
                                                <UserRound className="h-3.5 w-3.5" />
                                                {r.assignedTo || "Unassigned"}
                                            </span>
                                            <span className="w-[80px] text-right">{r.receivedAt.split(" ")[0]}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </TabsContent>

                        <TabsContent value="commitment">
                            <div className="flex-1 overflow-auto p-6">
                                <div className="rounded-lg border border-border bg-surface overflow-x-auto">
                                    <table className="ent-table">
                                        <thead>
                                            <tr>
                                                <th className="text-center" style={{ minWidth: 48 }}>S.No</th>
                                                <th style={{ minWidth: 110 }}>Enquiry Date</th>
                                                <th style={{ minWidth: 150 }}>Customer</th>
                                                <th style={{ minWidth: 200 }}>Email Subject</th>
                                                <th style={{ minWidth: 120 }}>Work Category</th>
                                                <th style={{ minWidth: 260 }}>Customer Request</th>
                                                <th className="text-center" style={{ minWidth: 80 }}>No. of Models</th>
                                                <th style={{ minWidth: 110 }}>Assigned Date</th>
                                                <th style={{ minWidth: 170 }}>Assigned To</th>
                                                <th style={{ minWidth: 120 }}>Commitment Date</th>
                                                <th style={{ minWidth: 150 }}>Est. Completion Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {inboxItems.map((r) => (
                                                <tr key={r.id} onClick={() => setSelectedId(r.id)} className="cursor-pointer">
                                                    <td className="text-center font-mono text-[11px] text-muted-foreground">{r.sNo}</td>
                                                    <td className="tabular-nums">{r.receivedAt.split(" ")[0]}</td>
                                                    <td className="font-semibold">{r.client}</td>
                                                    <td className="max-w-[260px] truncate" title={r.subject}>{r.subject}</td>
                                                    <td>{r.stage || mapStatusToStage(r.status)}</td>
                                                    <td className="max-w-[360px]" style={{ whiteSpace: 'normal', lineHeight: '1.5' }}>{r.customerRequest}</td>
                                                    <td className="text-center tabular-nums">{r.noOfModels}</td>
                                                    <td className="tabular-nums">{r.assignedDate}</td>
                                                    <td>
                                                        <Select
                                                            value={r.assignedTo || "Unassigned"}
                                                            onValueChange={(v) =>
                                                                setInboxItems((current) =>
                                                                    current.map((it) => (it.id === r.id ? { ...it, assignedTo: v === "Unassigned" ? "" : v } : it))
                                                                )
                                                            }
                                                        >
                                                            <SelectTrigger className="w-full h-8 min-w-[140px]">
                                                                <SelectValue placeholder="Unassigned" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {ASSIGNEE_OPTIONS.map((a) => (
                                                                    <SelectItem key={a} value={a}>
                                                                        {a}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="tabular-nums">{r.commitmentDate}</td>
                                                    <td className="tabular-nums">{r.completedOn || "—"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Add RFQ Modal */}
                <Dialog open={showAddRFQModal} onOpenChange={setShowAddRFQModal}>
                    <DialogContent className="sm:max-w-[900px] max-h-[92vh] p-0 overflow-hidden rounded-2xl flex flex-col">
                        <DialogHeader className="px-6 py-4 border-b border-border">
                            <DialogTitle>Add New RFQ</DialogTitle>
                            <DialogDescription>
                                Enter the details to manually add a new RFQ to the inbox
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
                            <div className="space-y-6">
                                {/* Client Name */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block text-foreground/80">Client Name *</label>
                                    <Input
                                        placeholder="Enter client name"
                                        value={formData.client}
                                        onChange={(e) => updateFormField("client", e.target.value)}
                                        className="h-10"
                                    />
                                </div>

                                {/* Sender Name and Email */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block text-foreground/80">Contact Person *</label>
                                        <Input
                                            placeholder="Sender name"
                                            value={formData.sender}
                                            onChange={(e) => updateFormField("sender", e.target.value)}
                                            className="h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block text-foreground/80">Email *</label>
                                        <Input
                                            placeholder="email@example.com"
                                            type="email"
                                            value={formData.senderEmail}
                                            onChange={(e) => updateFormField("senderEmail", e.target.value)}
                                            className="h-10"
                                        />
                                    </div>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block text-foreground/80">Subject *</label>
                                    <Input
                                        placeholder="RFQ subject"
                                        value={formData.subject}
                                        onChange={(e) => updateFormField("subject", e.target.value)}
                                        className="h-10"
                                    />
                                </div>

                                {/* Customer Request */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block text-foreground/80">Customer Request</label>
                                    <Textarea
                                        placeholder="Details of the customer request..."
                                        value={formData.customerRequest}
                                        onChange={(e) => updateFormField("customerRequest", e.target.value)}
                                        className="h-32 resize-none"
                                    />
                                </div>

                                {/* Quantity, Priority, Region */}
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <label className="text-sm font-medium mb-2 block text-foreground/80">Quantity</label>
                                        <Input
                                            type="number"
                                            placeholder="1"
                                            value={formData.qty}
                                            onChange={(e) => updateFormField("qty", parseInt(e.target.value) || 1)}
                                            min="1"
                                            className="h-10"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block text-foreground/80">Priority</label>
                                        <Select
                                            value={formData.priority}
                                            onValueChange={(value) =>
                                                updateFormField("priority", value as "High" | "Medium" | "Low")
                                            }
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="High">High</SelectItem>
                                                <SelectItem value="Medium">Medium</SelectItem>
                                                <SelectItem value="Low">Low</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-2 block text-foreground/80">Region</label>
                                        <Select
                                            value={formData.region}
                                            onValueChange={(value) => updateFormField("region", value)}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="India">India</SelectItem>
                                                <SelectItem value="North America">North America</SelectItem>
                                                <SelectItem value="Europe">Europe</SelectItem>
                                                <SelectItem value="Middle East">Middle East</SelectItem>
                                                <SelectItem value="Asia Pacific">Asia Pacific</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Attachments */}
                                <div>
                                    <label className="text-sm font-medium mb-2 block text-foreground/80">Attachments</label>
                                    <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4">
                                        {attachments.length > 0 ? (
                                            <div className="space-y-3">
                                                {attachments.map((attachment) => (
                                                    <div
                                                        key={attachment.id}
                                                        className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                                                    >
                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                                                            <Paperclip className="h-4 w-4" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="truncate text-[13px] font-medium">{attachment.name}</div>
                                                            <div className="text-[11px] text-muted-foreground">{attachment.sizeLabel}</div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAttachment(attachment.id)}
                                                            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                            aria-label={`Remove ${attachment.name}`}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => attachmentInputRef.current?.click()}
                                                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[12px] font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    Add attachment
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => attachmentInputRef.current?.click()}
                                                className="flex min-h-[140px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background px-4 py-5 text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
                                            >
                                                <Plus className="h-5 w-5" />
                                                <span className="mt-2 text-sm font-medium">Add attachment</span>
                                                <span className="mt-1 text-[11px] text-muted-foreground">PDF, image, or document</span>
                                            </button>
                                        )}
                                        <input
                                            ref={attachmentInputRef}
                                            type="file"
                                            multiple
                                            className="hidden"
                                            onChange={handleAttachmentPick}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Form Actions */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-surface/50">
                            <Btn
                                variant="outline"
                                onClick={() => {
                                    setShowAddRFQModal(false);
                                    resetFormData();
                                }}
                            >
                                Cancel
                            </Btn>
                            <Btn variant="default" onClick={handleAddRFQ}>
                                <Plus className="h-3.5 w-3.5" />Add RFQ
                            </Btn>
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    // ─── Detail View (Mail Content + Extracted Data) ───
    return (
        <>
            <ModuleHeader
                breadcrumbs={["Operate", "RFQ Inbox", selectedMail.id]}
                title={selectedMail.client}
                subtitle={selectedMail.subject}
                titlePrefix={
                    <button
                        onClick={handleBackToList}
                        className="flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors -ml-1"
                        title="Back to Inbox"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                }
                titleSuffix={
                    <StageSLAChip stage="Received" />
                }
                actions={
                    <StageCompletionGuard stage="Received" actor="Sales" actionLabel="Approve & Continue to BOM & Parts" />
                }
            />
            <StageWorkflowChrome stage="Received" />

            <div className="grid h-[calc(100vh-10rem)] grid-cols-2 gap-0 border-t border-border">
                {/* ── Left Half: Mail Content ── */}
                <div className="flex flex-col border-r border-border overflow-hidden">
                    <div className="border-b border-border px-6 py-4 bg-surface/30">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[16px] font-bold truncate">{selectedMail.subject}</h2>
                            <ConfidenceBadge level={selectedMail.confidence} />
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-[12px] text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{selectedMail.sender}</span>
                            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{selectedMail.receivedAt}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-foreground/90">{selectedMail.preview}</pre>

                        <div className="mt-6 rounded-lg border border-border bg-surface/60 p-4">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                                Attachments (1)
                            </div>
                            <div className="space-y-2">
                                <div
                                    onClick={() => setShowImageModal(true)}
                                    className="flex items-center gap-3 py-2 px-3 rounded-md bg-background/50 hover:bg-background transition-colors cursor-pointer"
                                >
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span className="text-primary text-[13px] font-medium hover:underline flex-1">
                                        technical_drawing
                                    </span>
                                    <span className="text-muted-foreground text-[12px]">PNG</span>
                                </div>
                            </div>
                        </div>

                        {/* Image Popup Modal */}
                        <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                                <DialogHeader>
                                    <DialogTitle>RFQ Received From Customer</DialogTitle>
                                    <DialogDescription>Technical drawing from customer</DialogDescription>
                                </DialogHeader>
                                <div className="flex justify-center items-center">
                                    <img
                                        src={rfqImage}
                                        alt="Technical Drawing"
                                        className="w-full h-auto rounded-lg border border-border"
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>

                        {/* Draft Response Section */}
                        <div className="mt-6 rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Pencil className="h-4 w-4 text-primary" />
                                    <span className="text-[12px] font-bold uppercase tracking-wider text-primary">
                                        Draft Response
                                    </span>
                                    <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                                        <Sparkles className="h-3 w-3" />AI-High
                                    </span>
                                </div>
                                <span className="text-[11px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                                    AI Generated — Edit as needed
                                </span>
                            </div>

                            {responseSent.has(selectedMail.id) ? (
                                <div className="flex items-center gap-2 py-4 text-emerald-600">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="text-[13px] font-medium">Response sent successfully</span>
                                </div>
                            ) : (
                                <>
                                    <textarea
                                        className="w-full h-[200px] p-3 text-[13px] leading-relaxed border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        value={draftResponse}
                                        onChange={(e) => setDraftResponse(e.target.value)}
                                        placeholder="Draft your response..."
                                    />
                                    <div className="flex items-center justify-between mt-3">

                                        <Btn size="sm" onClick={handleSendResponse}>
                                            <Send className="h-3.5 w-3.5" />Send Response
                                        </Btn>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Right Half: Extracted Data (Design Commitment Format) ── */}
                <div className="flex flex-col bg-surface/20 overflow-hidden">
                    <div className="border-b border-border px-6 py-4 bg-emerald-500/10 flex items-center justify-between">
                        <div>
                            <h3 className="text-[14px] font-bold text-emerald-700 dark:text-emerald-400">
                                DESIGN COMMITMENT
                            </h3>
                            <p className="text-[11px] text-muted-foreground mt-1">Extracted data from RFQ — editable fields highlighted</p>
                        </div>
                        <Btn size="sm" variant="teal" onClick={handleSaveFields}>
                            <Save className="h-3.5 w-3.5" />Save Changes
                        </Btn>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Priority and Region Cards - at top */}
                        <div className="mb-6 grid grid-cols-2 gap-4">
                            <div className="rounded-lg border border-border p-4 bg-background">
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Priority</div>
                                <div className="flex items-center gap-2">
                                    <PriorityDot p={selectedMail.priority} />
                                    <span className="text-[14px] font-semibold">{selectedMail.priority}</span>
                                </div>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-background">
                                <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Region</div>
                                <div className="text-[14px] font-semibold">{selectedMail.region}</div>
                            </div>
                        </div>

                        <div className="rounded-lg border border-border overflow-hidden bg-background">
                            {/* Table Header */}
                            <div className="grid grid-cols-2 bg-emerald-600 text-white text-[11px] font-semibold">
                                <div className="px-4 py-2.5 border-r border-emerald-500">Field</div>
                                <div className="px-4 py-2.5">Value</div>
                            </div>

                            {/* Table Rows */}
                            <div className="divide-y divide-border">
                                <ExtractedDataRow icon={<Hash className="h-3.5 w-3.5" />} label="S.No" value={String(selectedMail.sNo)} />
                                <ExtractedDataRow icon={<Calendar className="h-3.5 w-3.5" />} label="Enquiry Date" value={selectedMail.receivedAt.split(" ")[0]} />
                                <ExtractedDataRow icon={<FileText className="h-3.5 w-3.5" />} label="Enquiry No" value={selectedMail.enquiryNo} />
                                <ExtractedDataRow icon={<Building2 className="h-3.5 w-3.5" />} label="Name of the Customer" value={selectedMail.client} highlight />
                                <ExtractedDataRow icon={<Mail className="h-3.5 w-3.5" />} label="E mail Sub" value={selectedMail.subject} />

                                {/* Editable: Product Category */}
                                <div className="grid grid-cols-2 items-center">
                                    <div className="px-4 py-3 border-r border-border bg-surface/30 flex items-center gap-2">
                                        <span className="text-muted-foreground"><Tag className="h-3.5 w-3.5" /></span>
                                        <span className="text-[12px] font-medium text-muted-foreground">Product Category</span>
                                    </div>
                                    <div className="px-4 py-2 flex items-center gap-2">
                                        <select
                                            className="flex-1 px-2 py-1.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={editableFields?.workCategory || ""}
                                            onChange={(e) => updateField("workCategory", e.target.value)}
                                        >
                                            {WORK_CATEGORIES.map((cat) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Work Category (from commitment sheet) */}
                                <ExtractedDataRow icon={<Tag className="h-3.5 w-3.5" />} label="Work Category" value={selectedMail.stage || mapStatusToStage(selectedMail.status)} />

                                <ExtractedDataRow icon={<FileText className="h-3.5 w-3.5" />} label="Customer Request" value={selectedMail.customerRequest} multiline />

                                {/* Editable: NO.OF MODELS */}
                                <div className="grid grid-cols-2 items-center">
                                    <div className="px-4 py-3 border-r border-border bg-surface/30 flex items-center gap-2">
                                        <span className="text-muted-foreground"><Hash className="h-3.5 w-3.5" /></span>
                                        <span className="text-[12px] font-medium text-muted-foreground">NO.OF MODELS</span>
                                    </div>
                                    <div className="px-4 py-2 flex items-center gap-2">
                                        <input
                                            type="number"
                                            className="w-24 px-2 py-1.5 text-[13px] font-semibold border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={editableFields?.noOfModels || 0}
                                            onChange={(e) => updateField("noOfModels", parseInt(e.target.value) || 0)}
                                            min={1}
                                        />
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Editable: Assigned Date */}
                                <div className="grid grid-cols-2 items-center">
                                    <div className="px-4 py-3 border-r border-border bg-surface/30 flex items-center gap-2">
                                        <span className="text-muted-foreground"><Calendar className="h-3.5 w-3.5" /></span>
                                        <span className="text-[12px] font-medium text-muted-foreground">Assigned Date</span>
                                    </div>
                                    <div className="px-4 py-2 flex items-center gap-2">
                                        <input
                                            type="date"
                                            className="px-2 py-1.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={editableFields?.assignedDate || ""}
                                            onChange={(e) => updateField("assignedDate", e.target.value)}
                                        />
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Editable: Assigned To */}
                                <div className="grid grid-cols-2 items-center">
                                    <div className="px-4 py-3 border-r border-border bg-surface/30 flex items-center gap-2">
                                        <span className="text-muted-foreground"><UserRound className="h-3.5 w-3.5" /></span>
                                        <span className="text-[12px] font-medium text-muted-foreground">Assigned To</span>
                                    </div>
                                    <div className="px-4 py-2 flex items-center gap-2">
                                        <Select
                                            value={editableFields?.assignedTo || "Unassigned"}
                                            onValueChange={(value) => updateField("assignedTo", value)}
                                        >
                                            <SelectTrigger className="w-48 h-8 text-[13px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ASSIGNEE_OPTIONS.map((member) => (
                                                    <SelectItem key={member} value={member}>
                                                        {member}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Editable: Commitment Date */}
                                <div className="grid grid-cols-2 items-center">
                                    <div className="px-4 py-3 border-r border-border bg-surface/30 flex items-center gap-2">
                                        <span className="text-muted-foreground"><CalendarCheck className="h-3.5 w-3.5" /></span>
                                        <span className="text-[12px] font-medium text-muted-foreground">Commitment Date</span>
                                    </div>
                                    <div className="px-4 py-2 flex items-center gap-2">
                                        <input
                                            type="date"
                                            className="px-2 py-1.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={editableFields?.commitmentDate || ""}
                                            onChange={(e) => updateField("commitmentDate", e.target.value)}
                                        />
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Editable: Estimated Completion Date */}
                                <div className="grid grid-cols-2 items-center">
                                    <div className="px-4 py-3 border-r border-border bg-surface/30 flex items-center gap-2">
                                        <span className="text-muted-foreground"><CheckCircle className="h-3.5 w-3.5" /></span>
                                        <span className="text-[12px] font-medium text-muted-foreground">Estimated Completion Date</span>
                                    </div>
                                    <div className="px-4 py-2 flex items-center gap-2">
                                        <input
                                            type="date"
                                            className="px-2 py-1.5 text-[13px] border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={editableFields?.completedOn || ""}
                                            onChange={(e) => updateField("completedOn", e.target.value)}
                                        />
                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* AI Reasoning & Flags */}
                        <div className="mt-6">


                            {/* Similar Past RFQs */}
                            <div className="rounded-lg border border-border bg-background p-4">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Similar Past RFQs</div>
                                <div className="space-y-2">
                                    {["RFQ-2025-01842 (94% match)", "RFQ-2025-01203 (87% match)", "RFQ-2024-03421 (82% match)"].map((r) => (
                                        <div key={r} className="flex items-center gap-2 text-[12px]">
                                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-mono text-primary cursor-pointer hover:underline">{r}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

function ExtractedDataRow({
    icon,
    label,
    value,
    highlight = false,
    badge = false,
    multiline = false,
    completed = false
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
    badge?: boolean;
    multiline?: boolean;
    completed?: boolean;
}) {
    return (
        <div className={`grid grid-cols-2 ${multiline ? "" : "items-center"}`}>
            <div className="px-4 py-3 border-r border-border bg-surface/30 flex items-center gap-2">
                <span className="text-muted-foreground">{icon}</span>
                <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
            </div>
            <div className={`px-4 py-3 ${multiline ? "text-[12px] leading-relaxed" : "text-[13px]"}`}>
                {badge ? (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
                        {value}
                    </span>
                ) : completed ? (
                    <span className="text-emerald-600 font-semibold">{value}</span>
                ) : (
                    <span className={highlight ? "font-semibold text-primary" : ""}>{value}</span>
                )}
            </div>
        </div>
    );
}
