import { useState, useRef, useEffect, useCallback } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  X, Send, Sparkles, RotateCcw, Copy, ThumbsUp, ThumbsDown,
  Loader2, ChevronRight, Waves,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface PageConfig {
  title: string;
  subtitle: string;
  suggestions: string[];
}

// ── Page-aware config ──────────────────────────────────────────────────────────
const PAGE_CONFIG: Record<string, PageConfig> = {
  "/": {
    title: "Dashboard Assistant",
    subtitle: "Ask about your RFQ pipeline and metrics",
    suggestions: [
      "Summarize today's RFQ activity",
      "Which RFQs need immediate attention?",
      "What's the overall quote win rate this month?",
      "Show me the pipeline health overview",
    ],
  },
  "/rfq-inbox": {
    title: "RFQ Inbox Assistant",
    subtitle: "Get insights on incoming RFQs",
    suggestions: [
      "Which RFQs are at risk of SLA breach?",
      "Show me all high-priority unassigned RFQs",
      "What's the average response time this week?",
      "Which client sent the most RFQs today?",
    ],
  },
  "/rfq-parsing": {
    title: "Parsing Assistant",
    subtitle: "Understand parsing results and confidence scores",
    suggestions: [
      "Why does this RFQ have a low confidence score?",
      "What fields were auto-extracted from the email?",
      "How can I improve the parsing accuracy?",
      "Summarize the key requirements from this RFQ",
    ],
  },
  "/feasibility": {
    title: "Feasibility Assistant",
    subtitle: "Analyse technical and commercial feasibility",
    suggestions: [
      "What are the main technical risks for this RFQ?",
      "Is the requested delivery timeline achievable?",
      "Which parts have limited in-house capability?",
      "What's the recommended feasibility decision?",
    ],
  },
  "/bom": {
    title: "BOM Assistant",
    subtitle: "Explore bill of materials and part details",
    suggestions: [
      "What's the total estimated BOM cost?",
      "Are there any parts with critical lead times?",
      "List parts that require external procurement",
      "Highlight any substitution opportunities in the BOM",
    ],
  },
  "/costing": {
    title: "Costing Assistant",
    subtitle: "Break down costs and pricing strategy",
    suggestions: [
      "What are the top cost drivers for this RFQ?",
      "How was the gross margin calculated?",
      "Compare this quote to our last similar job",
      "What's the minimum viable price to win the bid?",
    ],
  },
  "/quotes": {
    title: "Quote Assistant",
    subtitle: "Track and manage quote submissions",
    suggestions: [
      "Which quotes are awaiting client approval?",
      "What's the average quote turnaround time?",
      "Show quotes submitted in the last 7 days",
      "Which clients haven't responded to quotes yet?",
    ],
  },
  "/review": {
    title: "Review Assistant",
    subtitle: "Streamline internal review workflows",
    suggestions: [
      "Who has pending review tasks right now?",
      "What comments were raised in the last review?",
      "Which RFQs are blocked on review approval?",
      "Summarise the key changes flagged by reviewers",
    ],
  },
  "/drawings": {
    title: "Drawings Assistant",
    subtitle: "Manage proposal drawings and approvals",
    suggestions: [
      "Which drawings are pending client approval?",
      "Are there any drawing revision conflicts?",
      "What DXF files are still awaiting upload?",
      "Show drawings updated in the last 48 hours",
    ],
  },
  "/po-handoff": {
    title: "PO Handoff Assistant",
    subtitle: "Track purchase orders and handoff status",
    suggestions: [
      "Which POs are ready for production handoff?",
      "What documents are missing from pending handoffs?",
      "Show me overdue PO acknowledgements",
      "What's the total value of POs in handoff queue?",
    ],
  },
  "/procurement": {
    title: "Procurement Assistant",
    subtitle: "Monitor orders, suppliers, and spend",
    suggestions: [
      "Which procurement orders are overdue?",
      "Who are the top suppliers this quarter?",
      "What items are currently out of stock?",
      "Show total procurement spend this month",
    ],
  },
  "/parallel-evaluation": {
    title: "Evaluation Assistant",
    subtitle: "Compare vendor bids and scores",
    suggestions: [
      "Which vendor has the best overall score?",
      "Compare the top 3 vendors on price and delivery",
      "Are there any disqualified bids and why?",
      "What criteria carries the most weight in scoring?",
    ],
  },
  "/revisions": {
    title: "Revisions Assistant",
    subtitle: "Track changes and revision history",
    suggestions: [
      "What changed in the latest revision?",
      "Who approved the most recent revision?",
      "Show all revisions for the active RFQ",
      "Are there unresolved conflicts in this revision?",
    ],
  },
  "/masters": {
    title: "Master Data Assistant",
    subtitle: "Explore materials, machines, and processes",
    suggestions: [
      "Show all materials with low stock levels",
      "What machine capacity is available next week?",
      "List all active suppliers in the system",
      "What are the standard process rates for welding?",
    ],
  },
  "/audit-logs": {
    title: "Audit Assistant",
    subtitle: "Review system activity and compliance",
    suggestions: [
      "Show all changes made today",
      "Who modified the costing parameters last?",
      "List failed login attempts this week",
      "Which records were deleted in the last 30 days?",
    ],
  },
  "/notifications": {
    title: "Notifications Assistant",
    subtitle: "Manage alerts and system messages",
    suggestions: [
      "What are my high-priority notifications?",
      "Which alerts are older than 24 hours?",
      "Show notifications related to SLA breaches",
      "How many unread notifications do I have?",
    ],
  },
  "/settings": {
    title: "Settings Assistant",
    subtitle: "Configure the system to your needs",
    suggestions: [
      "How do I update my notification preferences?",
      "Where can I manage user roles and permissions?",
      "How do I change the default SLA thresholds?",
      "What integrations are currently connected?",
    ],
  },
};

const DEFAULT_CONFIG: PageConfig = {
  title: "RFQ AI",
  subtitle: "Your intelligent RFQ operations assistant",
  suggestions: [
    "What can you help me with?",
    "Show me the most urgent pending tasks",
    "Give me a summary of today's activity",
    "How does the RFQ workflow work?",
  ],
};

// ── Mock AI Responses ──────────────────────────────────────────────────────────
const MOCK_RESPONSES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["sla", "breach", "risk", "overdue", "urgent"],
    response:
      "Based on current data, **3 RFQs are at SLA risk**:\n\n• **RFQ-2026-00481** — Mubarak Heavy Industries (2h left)\n• **RFQ-2026-00479** — Gulf Steel Works (4h left)\n• **RFQ-2026-00472** — SABIC (overdue by 1h)\n\nI recommend assigning RFQ-00472 to a senior estimator immediately and notifying the client of the delay.",
  },
  {
    keywords: ["high priority", "priority", "urgent", "critical"],
    response:
      "There are **4 high-priority RFQs** in the system:\n\n1. **RFQ-2026-00481** — Hydraulic cylinder assembly × 50 units — due in 2h\n2. **RFQ-2026-00480** — Subsea valve manifold — escalated by client\n3. **RFQ-2026-00475** — Custom actuator set — new strategic client\n4. **RFQ-2026-00471** — Pump housing casting — volume order\n\nAll four should be assigned before end of shift.",
  },
  {
    keywords: ["cost", "costing", "price", "margin", "budget"],
    response:
      "For **RFQ-2026-00481**, the cost breakdown is:\n\n| Category | Amount |\n|---|---|\n| Raw Materials | ₹4,82,000 |\n| Machining | ₹1,20,500 |\n| Surface Treatment | ₹38,200 |\n| Labour | ₹95,000 |\n| Overhead | ₹1,15,000 |\n| **Total Cost** | **₹8,50,700** |\n\nWith a **22% gross margin**, the recommended quote is **₹10,38,054**. This is 4% above our last similar job and within the client's estimated budget.",
  },
  {
    keywords: ["bom", "bill of materials", "parts", "components"],
    response:
      "The BOM for **RFQ-2026-00481** has **14 line items**:\n\n• 6 standard parts (in stock)\n• 5 machined components (2–3 day lead time)\n• 2 bought-out items (7-day procurement lead)\n• 1 special casting (14-day lead time ⚠️)\n\nThe casting is your **critical path item**. If you want to meet the 21-day delivery commitment, the casting PO should be placed today.",
  },
  {
    keywords: ["feasibility", "feasible", "risk", "capability", "technical"],
    response:
      "The feasibility analysis for this RFQ shows:\n\n**✅ Within Capability**\n• Hydraulic cylinder machining (CNC Mill, 3-axis)\n• Seal assembly and pressure testing\n• Standard surface treatments\n\n**⚠️ Concerns**\n• 50-unit volume — may require overtime in Week 2\n• One component requires 5-axis machining (outsource recommended)\n\n**Recommendation:** Accept with a caveat on delivery — propose 24 days instead of 21.",
  },
  {
    keywords: ["quote", "quotes", "submitted", "pending", "approval", "client"],
    response:
      "Quote status summary:\n\n• **5 quotes** pending client approval\n• **2 quotes** revised and resubmitted\n• **1 quote** accepted — awaiting PO\n• **3 quotes** require internal review before submission\n\nThe oldest pending response is **RFQ-2026-00463** (9 days since submission). I suggest sending a follow-up to that client today.",
  },
  {
    keywords: ["drawing", "drawings", "dxf", "revision", "approval"],
    response:
      "Drawing status for active RFQs:\n\n• **7 drawings** pending client approval\n• **3 drawings** have revision conflicts (tolerance mismatch)\n• **2 DXF files** are still awaiting engineer upload\n\nThe revision conflicts in RFQ-00477 and RFQ-00479 need to be resolved before quote submission — both involve seal housing tolerances (±0.01mm vs ±0.02mm).",
  },
  {
    keywords: ["vendor", "supplier", "evaluation", "compare", "score"],
    response:
      "Vendor evaluation scores for the current RFQ:\n\n| Vendor | Price | Delivery | Quality | **Total** |\n|---|---|---|---|---|\n| Apex Engineering | 88 | 90 | 92 | **90.0** |\n| Gulf Precision | 95 | 78 | 85 | **86.0** |\n| AlMetals | 75 | 95 | 88 | **86.0** |\n\n**Apex Engineering** leads overall. However, if delivery is critical, AlMetals has the fastest lead time.",
  },
  {
    keywords: ["procurement", "order", "stock", "supply", "purchase"],
    response:
      "Procurement overview:\n\n• **12 active purchase orders** totalling ₹28.4L\n• **3 orders overdue** by more than 2 days\n• **4 items** with stock below reorder level\n\nOverdue orders:\n1. Steel tubing (Supplier: GulfSteel) — 3 days late\n2. Hydraulic seals (Supplier: Parker Hannifin) — 1 day late\n3. Bronze bushings (Supplier: MetalEx) — 2 days late",
  },
  {
    keywords: ["review", "reviewer", "comment", "feedback", "approve"],
    response:
      "Internal review status:\n\n• **3 RFQs** in active review\n• **Ramesh K.** has 2 pending reviews (overdue)\n• **Priya M.** has completed 5 reviews today\n\nOpen comments:\n• RFQ-00481: \"Check material grade — client spec says SS316L, BOM shows SS304\"\n• RFQ-00479: \"Delivery date needs to be revised — production is at 94% capacity\"\n• RFQ-00476: \"Margin below 18% — escalate for approval\"",
  },
  {
    keywords: ["audit", "log", "change", "history", "who"],
    response:
      "Recent audit activity (last 24 hours):\n\n• **47 actions** logged\n• **12 record updates** (costing, BOM)\n• **3 user logins** from new devices\n• **1 bulk delete** — 8 draft RFQs removed by admin\n\nMost active user: **Anita R.** (23 actions)\nNote: The bulk deletion at 14:32 IST should be reviewed for compliance — those drafts may have been associated with client communications.",
  },
  {
    keywords: ["master", "material", "machine", "process", "rate", "data"],
    response:
      "Master data summary:\n\n**Materials:** 142 active, 8 below reorder level\n**Machines:** 14 active, 2 under maintenance (CNC-3, VMC-1)\n**Processes:** 28 standard processes defined\n\nCNC-3 is under maintenance until May 22 — this may impact machining capacity for RFQs scheduled for delivery before May 30. Consider rescheduling or outsourcing affected jobs.",
  },
  {
    keywords: ["po", "purchase order", "handoff", "production"],
    response:
      "PO Handoff queue:\n\n• **4 jobs** ready for production handoff\n• **2 jobs** have incomplete documentation (missing inspection plan)\n• **1 job** is awaiting customer advance payment confirmation\n\nReady to proceed: RFQ-00468, RFQ-00463, RFQ-00459, RFQ-00452\nBlocked: RFQ-00471 (missing inspection plan), RFQ-00466 (payment pending)",
  },
  {
    keywords: ["summary", "today", "activity", "pipeline", "overview"],
    response:
      "**Today's RFQ Operations Summary** — May 19, 2026\n\n📥 **Inbox:** 12 new RFQs received, 7 assigned\n⚙️ **In Progress:** 18 RFQs across parsing, costing & review\n📤 **Quotes Sent:** 4 today, 3 pending internal approval\n✅ **Won:** 2 orders confirmed (₹18.2L total)\n⚠️ **Alerts:** 3 SLA risks, 2 review bottlenecks\n\nOverall pipeline health: **Moderate** — SLA risk in the inbox needs immediate attention.",
  },
  {
    keywords: ["win rate", "conversion", "success", "performance"],
    response:
      "**Quote Performance — May 2026**\n\n• Quotes submitted: **32**\n• Won: **11** (34.4% win rate)\n• Lost: **8** (25%)\n• Pending: **13** (40.6%)\n\n📈 Win rate is **up 6%** vs April. The improvement is primarily from faster response times — average turnaround is now 2.1 days vs 2.8 days last month.",
  },
  {
    keywords: ["workflow", "how", "process", "steps", "help"],
    response:
      "The **RFQ Workflow** has 8 stages:\n\n1. **RFQ Inbox** — Receive and triage incoming enquiries\n2. **RFQ Parsing** — Auto-extract key data from emails/attachments\n3. **Feasibility** — Technical and commercial assessment\n4. **BOM & Parts** — Build bill of materials\n5. **Costing** — Calculate costs and set pricing\n6. **Internal Review** — Multi-level approval\n7. **Quote** — Submit to client\n8. **PO & Handoff** — Accept PO and hand off to production\n\nEach stage has SLA targets and role-based assignments. Would you like details on any specific stage?",
  },
];

function getAIResponse(question: string, pathname: string): string {
  const lower = question.toLowerCase();

  // Try keyword matching
  for (const item of MOCK_RESPONSES) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return item.response;
    }
  }

  // Page-specific fallback
  const pageKey = Object.keys(PAGE_CONFIG).find((k) => k !== "/" && pathname.startsWith(k)) || pathname;
  const pageConf = PAGE_CONFIG[pageKey] || DEFAULT_CONFIG;

  return `I understand you're asking about "${question}" on the **${pageConf.title}** page.\n\nBased on the current RFQ data, I don't have a specific pre-built answer for that exact query. Here are some things I can help you with on this page:\n\n${pageConf.suggestions
    .map((s) => `• ${s}`)
    .join("\n")}\n\nTry one of the suggestions above, or rephrase your question with more specific details.`;
}

// ── Markdown-lite renderer ─────────────────────────────────────────────────────
function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Table detection
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[-| ]+\|$/)) {
      const headers = line
        .split("|")
        .filter(Boolean)
        .map((h) => h.trim());
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(
          lines[i]
            .split("|")
            .filter(Boolean)
            .map((c) => c.trim())
        );
        i++;
      }
      i--;
      elements.push(
        <div key={i} className="my-2 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-muted/50">
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 text-left font-semibold text-foreground">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-t border-border hover:bg-muted/30 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-muted-foreground">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Bullet
    if (line.startsWith("• ") || line.startsWith("- ")) {
      elements.push(
        <div key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground leading-relaxed">
          <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numberedMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 text-[13px] text-muted-foreground leading-relaxed">
          <span className="mt-[1px] shrink-0 text-[11px] font-bold text-primary/70">{numberedMatch[1]}.</span>
          <span>{renderInline(numberedMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Blank line
    if (!line.trim()) {
      elements.push(<div key={i} className="h-1.5" />);
      continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-[13px] text-foreground leading-relaxed">
        {renderInline(line)}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-foreground">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Inline code: `text`
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
interface AIChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AIChatPanel({ open, onClose }: AIChatPanelProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get page config
  const pageKey = Object.keys(PAGE_CONFIG).find(
    (k) => k !== "/" && pathname.startsWith(k)
  ) || pathname;
  const pageConf = PAGE_CONFIG[pageKey] || DEFAULT_CONFIG;

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) clearTimeout(streamRef.current);
    };
  }, []);

  // Reset chat when page changes
  useEffect(() => {
    setMessages([]);
  }, [pathname]);

  const streamResponse = useCallback((msgId: string, fullText: string) => {
    let idx = 0;
    const chunkSize = 6;

    function tick() {
      idx = Math.min(idx + chunkSize, fullText.length);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, content: fullText.slice(0, idx), isStreaming: idx < fullText.length }
            : m
        )
      );
      if (idx < fullText.length) {
        streamRef.current = setTimeout(tick, 18);
      }
    }
    tick();
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsTyping(true);

      // Simulate AI "thinking" delay (500–900ms)
      const delay = 500 + Math.random() * 400;
      await new Promise((r) => setTimeout(r, delay));

      const response = getAIResponse(text, pathname);
      const assistantMsgId = `a-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setIsTyping(false);
      setMessages((prev) => [...prev, assistantMsg]);
      streamResponse(assistantMsgId, response);
    },
    [isTyping, pathname, streamResponse]
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleCopy(content: string, id: string) {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function handleLike(id: string) {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearChat() {
    setMessages([]);
    if (streamRef.current) clearTimeout(streamRef.current);
    setIsTyping(false);
  }

  const isEmpty = messages.length === 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-[100vw] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ borderLeft: "1px solid var(--color-border)" }}
      >
        {/* ── Header ── */}
        <div
          className="flex shrink-0 items-center gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-md">
            <Waves className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-foreground leading-tight">
              {pageConf.title}
            </div>
            <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {pageConf.subtitle}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                title="Clear chat"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin space-y-4">

            {/* Welcome / empty state */}
            {isEmpty && (
              <div className="flex flex-col items-center pt-6 pb-2 text-center">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-lg"
                  style={{ boxShadow: "0 0 0 8px color-mix(in oklch, var(--color-accent) 12%, transparent)" }}
                >
                  <Sparkles className="h-7 w-7 text-white" />
                </div>
                <div className="text-[15px] font-bold text-foreground">Ask me anything</div>
                <div className="mt-1 text-[12px] text-muted-foreground max-w-[260px]">
                  I have context about your current page and all RFQ data in the system.
                </div>

                {/* Suggested questions */}
                <div className="mt-6 w-full space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Suggested questions
                  </div>
                  {pageConf.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-3.5 py-3 text-left text-[13px] text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
                      style={{ border: "1px solid var(--color-border)" }}
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent opacity-70 group-hover:opacity-100" />
                      <span className="flex-1">{s}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {msg.role === "assistant" ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary shadow-sm">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-[10px] font-bold text-foreground">
                      AR
                    </div>
                  )}
                </div>

                {/* Bubble */}
                <div className={`group flex max-w-[82%] flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-[13px] ${
                      msg.role === "user"
                        ? "rounded-tr-sm bg-primary text-primary-foreground"
                        : "rounded-tl-sm bg-card"
                    }`}
                    style={msg.role === "assistant" ? { border: "1px solid var(--color-border)" } : {}}
                  >
                    {msg.role === "assistant" ? (
                      <div>
                        {renderMarkdown(msg.content)}
                        {msg.isStreaming && (
                          <span className="ml-1 inline-flex items-end gap-[2px]">
                            <span className="animate-bounce h-[5px] w-[5px] rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                            <span className="animate-bounce h-[5px] w-[5px] rounded-full bg-muted-foreground/60 [animation-delay:120ms]" />
                            <span className="animate-bounce h-[5px] w-[5px] rounded-full bg-muted-foreground/60 [animation-delay:240ms]" />
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="leading-relaxed">{msg.content}</span>
                    )}
                  </div>

                  {/* Actions (only for assistant, only when not streaming) */}
                  {msg.role === "assistant" && !msg.isStreaming && (
                    <div className="mt-1.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                        {copiedId === msg.id ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={() => handleLike(msg.id)}
                        className={`rounded-md p-1 transition-all hover:bg-muted ${
                          likedIds.has(msg.id) ? "text-success" : "text-muted-foreground hover:text-foreground"
                        }`}
                        title="Helpful"
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        className="rounded-md p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                        title="Not helpful"
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="mt-1 text-[10px] text-muted-foreground/50">
                    {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-primary shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div
                  className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3"
                  style={{ border: "1px solid var(--color-border)", background: "var(--color-card)" }}
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-[12px] text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input ── */}
          <div
            className="shrink-0 px-4 pb-4 pt-3"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            {/* Suggestion chips — show when there are messages */}
            {!isEmpty && (
              <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {pageConf.suggestions.slice(0, 2).map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="shrink-0 rounded-full px-2.5 py-1 text-[11px] text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                    style={{ border: "1px solid var(--color-border)" }}
                  >
                    {s.length > 36 ? s.slice(0, 34) + "…" : s}
                  </button>
                ))}
              </div>
            )}

            <div
              className="flex items-end gap-2 rounded-xl px-3 py-2"
              style={{ border: "1px solid var(--color-border)", background: "var(--color-card)" }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-grow
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this page…"
                className="flex-1 resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none leading-relaxed"
                style={{ minHeight: "24px", maxHeight: "120px" }}
                disabled={isTyping}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-1.5 text-center text-[10px] text-muted-foreground/40">
              Press Enter to send · Shift+Enter for new line
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
