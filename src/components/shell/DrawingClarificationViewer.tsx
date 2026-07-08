import { useState, useRef, useEffect, useCallback } from "react";
import {
    ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, X,
    ChevronRight,
    AlertTriangle, AlertCircle, CheckCircle2,
} from "lucide-react";
import { ConfidenceBadge } from "./primitives";
import type { PartExtractionRow, ClarificationItem } from "@/data/mock";

/* ─── Types ─── */
interface HotspotDef {
    num: number;
    partName: string;
    /** percentage of drawing container width — label position */
    x: number;
    /** percentage of drawing container height — label position */
    y: number;
    /** target x % on the actual part (leader line endpoint) */
    tx?: number;
    /** target y % on the actual part (leader line endpoint) */
    ty?: number;
}

/* ─── Hotspot positions (tuned to the SVG cylinder drawing below) ─── */
/* tx/ty = where the leader line points on the actual part              */
const HOTSPOTS: HotspotDef[] = [
    { num: 1, partName: "TUBE", x: 40, y: 28, tx: 40, ty: 38 },
    { num: 2, partName: "PISTON ROD", x: 75, y: 28, tx: 76, ty: 38 },
    { num: 3, partName: "PISTON", x: 51, y: 70 },
    { num: 4, partName: "GLAND", x: 64, y: 17, tx: 66, ty: 38 },
    { num: 5, partName: "END CAP", x: 16, y: 17, tx: 15, ty: 38 },
    { num: 6, partName: "ROD CLEVIS", x: 91, y: 38 },
    { num: 7, partName: "BACK CLEVIS", x: 8, y: 38 },
    { num: 8, partName: "SEAL KIT", x: 57, y: 80, tx: 50, ty: 69 },
    { num: 9, partName: "WEAR RING", x: 67, y: 80, tx: 64, ty: 70 },
];

/* ─── Status → visual config ─── */
const STATUS_CONFIG = {
    complete: {
        ring: "#10B981",
        fill: "#D1FAE5",
        text: "#065F46",
        glow: "rgba(16,185,129,0.35)",
        label: "Clarified",
        icon: CheckCircle2,
    },
    review: {
        ring: "#F59E0B",
        fill: "#FEF3C7",
        text: "#92400E",
        glow: "rgba(245,158,11,0.35)",
        label: "Review Needed",
        icon: AlertTriangle,
    },
    missing: {
        ring: "#EF4444",
        fill: "#FEE2E2",
        text: "#991B1B",
        glow: "rgba(239,68,68,0.4)",
        label: "Missing Data",
        icon: AlertCircle,
    },
} as const;

/* ─── Hydraulic Cylinder Technical Drawing SVG ─── */
export function ProposalCylinderDrawing() {
    return (
        <svg
            viewBox="0 0 880 370"
            xmlns="http://www.w3.org/2000/svg"
            className="h-full w-full"
            fontFamily="Inter, sans-serif"
        >
            {/* ── Background ── */}
            <rect width="880" height="370" fill="#FAFBFC" rx="4" />

            {/* Subtle dot grid */}
            <defs>
                <pattern id="dot" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.7" fill="#D1D5DB" />
                </pattern>
                <marker id="arr" markerWidth="5" markerHeight="4" refX="5" refY="2" orient="auto">
                    <polygon points="0 0,5 2,0 4" fill="#9CA3AF" />
                </marker>
                <marker id="arrl" markerWidth="5" markerHeight="4" refX="0" refY="2" orient="auto-start-reverse">
                    <polygon points="0 0,5 2,0 4" fill="#9CA3AF" />
                </marker>
            </defs>
            <rect width="880" height="370" fill="url(#dot)" />

            {/* ── Title block ── */}
            <rect x="630" y="320" width="230" height="40" fill="white" stroke="#D1D5DB" strokeWidth="0.8" />
            <line x1="630" y1="333" x2="860" y2="333" stroke="#D1D5DB" strokeWidth="0.5" />
            <text x="639" y="329" fontSize="7" fill="#6B7280">DWG NO.</text>
            <text x="639" y="356" fontSize="7" fill="#9CA3AF">7008707</text>
            <text x="730" y="329" fontSize="7" fill="#6B7280">TITLE</text>
            <text x="730" y="356" fontSize="7" fill="#9CA3AF">HA 2.5×1.5×180 ASSY</text>

            {/* ══════════════════════════════════════════════
          TOP VIEW — SIDE OUTLINE
      ══════════════════════════════════════════════ */}

            {/* Centerline (blue dashed) */}
            <line x1="40" y1="140" x2="845" y2="140" stroke="#93C5FD" strokeWidth="0.9" strokeDasharray="10,5,2,5" />

            {/* Back Clevis (left) */}
            <circle cx="62" cy="140" r="38" fill="white" stroke="#374151" strokeWidth="1.5" />
            <circle cx="62" cy="140" r="13" fill="#F3F4F6" stroke="#374151" strokeWidth="1" />
            <line x1="54" y1="132" x2="70" y2="148" stroke="#374151" strokeWidth="0.7" />
            <line x1="70" y1="132" x2="54" y2="148" stroke="#374151" strokeWidth="0.7" />
            <line x1="62" y1="102" x2="62" y2="178" stroke="#374151" strokeWidth="1.5" />
            {/* clevis body connecting to tube */}
            <rect x="100" y="122" width="24" height="36" fill="#E5E7EB" stroke="#374151" strokeWidth="1" />

            {/* Tube body */}
            <rect x="100" y="108" width="528" height="64" fill="white" stroke="#374151" strokeWidth="1.8" />
            {/* Hatch pattern on tube walls (top/bottom) */}
            {[0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160, 168, 176, 184, 192, 200, 208, 216, 224, 232, 240, 248, 256, 264, 272, 280, 288, 296, 304, 312, 320, 328, 336, 344, 352, 360, 368, 376, 384, 392, 400, 408, 416, 424, 432, 440, 448, 456, 464, 472, 480, 488, 496, 504, 512, 520].map((x, i) => (
                <line key={`ht${i}`} x1={100 + x} y1="108" x2={100 + x + 6} y2="114" stroke="#D1D5DB" strokeWidth="0.5" />
            ))}
            {[0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 128, 136, 144, 152, 160, 168, 176, 184, 192, 200, 208, 216, 224, 232, 240, 248, 256, 264, 272, 280, 288, 296, 304, 312, 320, 328, 336, 344, 352, 360, 368, 376, 384, 392, 400, 408, 416, 424, 432, 440, 448, 456, 464, 472, 480, 488, 496, 504, 512, 520].map((x, i) => (
                <line key={`hb${i}`} x1={100 + x} y1="172" x2={100 + x + 6} y2="166" stroke="#D1D5DB" strokeWidth="0.5" />
            ))}

            {/* End Cap (left) */}
            <rect x="100" y="100" width="52" height="80" fill="#F9FAFB" stroke="#374151" strokeWidth="1.5" />
            <line x1="152" y1="108" x2="152" y2="172" stroke="#6B7280" strokeWidth="0.8" strokeDasharray="3,2" />

            {/* Piston (inside tube — subtle) */}
            <rect x="440" y="110" width="32" height="60" fill="#E9EFF6" stroke="#9CA3AF" strokeWidth="0.8" />
            <line x1="447" y1="112" x2="447" y2="168" stroke="#9CA3AF" strokeWidth="0.5" />
            <line x1="453" y1="112" x2="453" y2="168" stroke="#9CA3AF" strokeWidth="0.5" />
            <line x1="459" y1="112" x2="459" y2="168" stroke="#9CA3AF" strokeWidth="0.5" />
            <line x1="465" y1="112" x2="465" y2="168" stroke="#9CA3AF" strokeWidth="0.5" />

            {/* Gland (right end cap of tube) */}
            <rect x="580" y="100" width="48" height="80" fill="#F9FAFB" stroke="#374151" strokeWidth="1.5" />
            <line x1="580" y1="108" x2="580" y2="172" stroke="#6B7280" strokeWidth="0.8" strokeDasharray="3,2" />

            {/* Piston Rod */}
            <rect x="550" y="123" width="260" height="34" fill="#F0F4FF" stroke="#374151" strokeWidth="1.5" />
            {/* Rod center dash */}
            <line x1="560" y1="140" x2="810" y2="140" stroke="#BFDBFE" strokeWidth="0.7" strokeDasharray="6,3" />

            {/* Rod Clevis (right) */}
            <line x1="810" y1="120" x2="832" y2="120" stroke="#374151" strokeWidth="1.5" />
            <line x1="810" y1="160" x2="832" y2="160" stroke="#374151" strokeWidth="1.5" />
            <rect x="810" y="120" width="22" height="40" fill="#E5E7EB" stroke="#374151" strokeWidth="1" />
            <circle cx="843" cy="140" r="30" fill="white" stroke="#374151" strokeWidth="1.5" />
            <circle cx="843" cy="140" r="11" fill="#F3F4F6" stroke="#374151" strokeWidth="1" />
            <line x1="835" y1="132" x2="851" y2="148" stroke="#374151" strokeWidth="0.7" />
            <line x1="851" y1="132" x2="835" y2="148" stroke="#374151" strokeWidth="0.7" />
            <line x1="843" y1="110" x2="843" y2="170" stroke="#374151" strokeWidth="1.5" />

            {/* ── Dimension annotations (top view) ── */}
            {/* ⌀89 bore */}
            <line x1="335" y1="80" x2="335" y2="108" stroke="#9CA3AF" strokeWidth="0.8" />
            <line x1="320" y1="84" x2="350" y2="84" stroke="#9CA3AF" strokeWidth="0.8"
                markerEnd="url(#arr)" markerStart="url(#arrl)" />
            <text x="360" y="87" fontSize="8.5" fill="#6B7280">Ø 89</text>

            {/* ⌀50 rod */}
            <line x1="680" y1="80" x2="680" y2="123" stroke="#9CA3AF" strokeWidth="0.8" />
            <line x1="665" y1="84" x2="695" y2="84" stroke="#9CA3AF" strokeWidth="0.8" />
            <text x="700" y="87" fontSize="8.5" fill="#6B7280">Ø 50</text>

            {/* "No weld on collar" note */}
            <text x="100" y="96" fontSize="7.5" fill="#9CA3AF" fontStyle="italic">No weld on</text>
            <text x="100" y="105" fontSize="7.5" fill="#9CA3AF" fontStyle="italic">collar surface</text>
            <line x1="152" y1="100" x2="165" y2="100" stroke="#D1D5DB" strokeWidth="0.6" />

            {/* 51±2 */}
            <text x="116" y="194" fontSize="8" fill="#6B7280">51 ±2</text>
            <line x1="100" y1="185" x2="152" y2="185" stroke="#9CA3AF" strokeWidth="0.7" />

            {/* ══════════════════════════════════════════════
          BOTTOM VIEW — ASSEMBLY CROSS-SECTION
      ══════════════════════════════════════════════ */}

            {/* Back clevis front view */}
            <circle cx="62" cy="270" r="42" fill="white" stroke="#374151" strokeWidth="1.5" />
            <circle cx="62" cy="270" r="20" fill="#F3F4F6" stroke="#6B7280" strokeWidth="0.9" />
            <line x1="62" y1="228" x2="62" y2="312" stroke="#374151" strokeWidth="1.2" />
            <line x1="20" y1="270" x2="104" y2="270" stroke="#374151" strokeWidth="1.2" />

            {/* Main tube assembly (outer shell) */}
            <rect x="100" y="228" width="528" height="84" fill="white" stroke="#374151" strokeWidth="1.8" />
            {/* Bore (inner surface) */}
            <rect x="116" y="240" width="496" height="60" fill="#F8FAFC" stroke="#9CA3AF" strokeWidth="0.6" />

            {/* End cap left */}
            <rect x="100" y="222" width="52" height="96" fill="#F0F2F5" stroke="#374151" strokeWidth="1.5" />

            {/* Piston assembly */}
            <rect x="438" y="228" width="44" height="84" fill="#DDE6F5" stroke="#6B7280" strokeWidth="1" />
            {/* Piston seal grooves */}
            <rect x="441" y="242" width="38" height="6" rx="1" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="0.5" />
            <rect x="441" y="262" width="38" height="6" rx="1" fill="#BFDBFE" stroke="#93C5FD" strokeWidth="0.5" />
            <rect x="441" y="280" width="38" height="6" rx="1" fill="#A7F3D0" stroke="#6EE7B7" strokeWidth="0.5" />
            {/* Wear ring groove on gland */}
            <rect x="591" y="244" width="4" height="52" rx="1" fill="#A7F3D0" stroke="#6EE7B7" strokeWidth="0.5" />

            {/* Gland right */}
            <rect x="580" y="222" width="48" height="96" fill="#F0F2F5" stroke="#374151" strokeWidth="1.5" />

            {/* Piston rod (right half) */}
            <rect x="550" y="244" width="260" height="52" fill="#EEF2FF" stroke="#374151" strokeWidth="1.5" />
            <line x1="560" y1="270" x2="810" y2="270" stroke="#C7D7FD" strokeWidth="0.7" strokeDasharray="6,3" />

            {/* Rod Clevis front view */}
            <circle cx="843" cy="270" r="40" fill="white" stroke="#374151" strokeWidth="1.5" />
            <circle cx="843" cy="270" r="18" fill="#F3F4F6" stroke="#6B7280" strokeWidth="0.9" />
            <line x1="843" y1="230" x2="843" y2="310" stroke="#374151" strokeWidth="1.2" />
            <line x1="803" y1="270" x2="883" y2="270" stroke="#374151" strokeWidth="1.2" />

            {/* ── Dimension lines below assembly ── */}
            <line x1="100" y1="330" x2="628" y2="330" stroke="#9CA3AF" strokeWidth="0.7" />
            <line x1="100" y1="326" x2="100" y2="334" stroke="#9CA3AF" strokeWidth="0.7" />
            <line x1="628" y1="326" x2="628" y2="334" stroke="#9CA3AF" strokeWidth="0.7" />
            <text x="364" y="343" textAnchor="middle" fontSize="8" fill="#6B7280">440 mm</text>

            {/* Stroke dim */}
            <line x1="152" y1="318" x2="580" y2="318" stroke="#9CA3AF" strokeWidth="0.6" strokeDasharray="2,2" />
            <text x="366" y="315" textAnchor="middle" fontSize="7.5" fill="#9CA3AF">STROKE 180 mm</text>

            {/* sub dims */}
            {[
                { x1: 100, x2: 129, label: "29" },
                { x1: 129, x2: 167, label: "38" },
                { x1: 167, x2: 347, label: "180" },
                { x1: 347, x2: 482, label: "—" },
                { x1: 482, x2: 542, label: "60" },
                { x1: 542, x2: 628, label: "93" },
            ].map(({ x1, x2, label }, i) => (
                <g key={`dim${i}`}>
                    <line x1={x1} y1="349" x2={x2} y2="349" stroke="#D1D5DB" strokeWidth="0.6" />
                    <line x1={x1} y1="346" x2={x1} y2="352" stroke="#D1D5DB" strokeWidth="0.6" />
                    <line x1={x2} y1="346" x2={x2} y2="352" stroke="#D1D5DB" strokeWidth="0.6" />
                    <text x={(x1 + x2) / 2} y="360" textAnchor="middle" fontSize="7" fill="#9CA3AF">{label}</text>
                </g>
            ))}

            {/* STAMP / SPEC block */}
            <rect x="10" y="320" width="180" height="40" fill="white" stroke="#D1D5DB" strokeWidth="0.7" />
            <text x="18" y="332" fontSize="6.5" fill="#9CA3AF" fontWeight="600">SPECIFICATION</text>
            <text x="18" y="342" fontSize="6.5" fill="#6B7280">BORE: Ø2.5"  ROD: Ø1.5"</text>
            <text x="18" y="351" fontSize="6.5" fill="#6B7280">STROKE: 180mm  WP: 3500 PSI</text>
            <text x="18" y="360" fontSize="6.5" fill="#6B7280">TEST PR: 4500 PSI</text>
        </svg>
    );
}

/* ─── Main Component ─── */
export function DrawingClarificationViewer({
    parts,
    clarifications,
    onMarkResolved,
    onMarkAllResolved,
    pendingCount,
}: {
    parts: PartExtractionRow[];
    clarifications: ClarificationItem[];
    onMarkResolved: (id: string) => void;
    onMarkAllResolved: () => void;
    pendingCount: number;
}) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ mx: 0, my: 0, px: 0, py: 0 });
    const [hoveredPart, setHoveredPart] = useState<string | null>(null);
    const [activePart, setActivePart] = useState<string | null>(null);
    const [filter, setFilter] = useState<"all" | "pending" | "clarified" | "highrisk">("all");
    const [showOverlay, setShowOverlay] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    /* ── Helpers ── */
    const getPartData = useCallback(
        (name: string) => parts.find((p) => p.part === name) ?? null,
        [parts]
    );
    const getClarifs = useCallback(
        (name: string) => clarifications.filter((c) => c.part === name),
        [clarifications]
    );

    /* ── Zoom handlers ── */
    const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
    const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
    const handleReset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    /* ── Pan handlers ── */
    const onMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest("[data-hotspot]")) return;
        setIsPanning(true);
        setPanStart({ mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y });
    };
    const onMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!isPanning) return;
            setPan({ x: panStart.px + e.clientX - panStart.mx, y: panStart.py + e.clientY - panStart.my });
        },
        [isPanning, panStart]
    );
    const onMouseUp = () => setIsPanning(false);

    /* ── Tooltip position (auto flip) ── */
    function getTooltipPos(x: number, y: number) {
        const flipX = x > 65;
        const flipY = y > 60;
        return { flipX, flipY };
    }

    /* ── Filter logic ── */
    function isVisible(partName: string): boolean {
        if (!showOverlay) return false;
        const p = getPartData(partName);
        if (!p) return filter === "all";
        if (filter === "all") return true;
        if (filter === "pending") return p.status === "missing" || p.status === "review";
        if (filter === "clarified") return p.status === "complete";
        if (filter === "highrisk") return p.status === "missing" || p.conf === "low";
        return true;
    }

    /* ── Derived stats ── */
    const stats = {
        total: parts.length,
        clarified: parts.filter((p) => p.status === "complete").length,
        pending: parts.filter((p) => p.status === "review").length,
        missing: parts.filter((p) => p.status === "missing").length,
        highConf: parts.filter((p) => p.conf === "high").length,
        medConf: parts.filter((p) => p.conf === "medium").length,
        lowConf: parts.filter((p) => p.conf === "low").length,
    };

    const recentAssumptions = clarifications
        .filter((c) => c.status === "pending")
        .slice(0, 3);

    const activePd = activePart ? getPartData(activePart) : null;
    const activeClarifs = activePart ? getClarifs(activePart) : [];
    const hoveredPd = hoveredPart ? getPartData(hoveredPart) : null;

    /* Close click popup on Escape */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setActivePart(null); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    return (
        <div className="relative flex h-full min-h-[600px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F5F7FA]">

            {/* ══════════════════════════════════
          LEFT: Drawing Viewer
      ══════════════════════════════════ */}
            <div className="relative flex flex-1 flex-col overflow-hidden">

                {/* Toolbar */}
                <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-white px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                        {/* Zoom */}
                        <button
                            onClick={handleZoomOut}
                            className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[42px] text-center text-[11px] font-semibold tabular-nums text-[#374151]">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn className="h-3.5 w-3.5" />
                        </button>
                        <div className="mx-1.5 h-4 w-px bg-[#E5E7EB]" />
                        <button
                            onClick={handleReset}
                            className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827] transition-colors"
                            title="Reset View"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setShowOverlay((s) => !s)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${showOverlay
                                ? "bg-[#EFF6FF] text-[#2563EB]"
                                : "bg-[#F3F4F6] text-[#6B7280]"
                                }`}
                            title="Toggle AI Overlay"
                        >
                            {showOverlay ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            AI Overlay {showOverlay ? "On" : "Off"}
                        </button>
                    </div>
                </div>

                {/* Drawing canvas */}
                <div
                    ref={containerRef}
                    className="relative flex-1 overflow-hidden"
                    style={{ cursor: isPanning ? "grabbing" : "grab", background: "#F5F7FA" }}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={() => { onMouseUp(); setHoveredPart(null); }}
                >
                    <div
                        className="absolute inset-0 origin-center transition-none"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                    >
                        {/* Drawing */}
                        <div className="m-4 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                            <ProposalCylinderDrawing />

                            {/* Hotspot overlay */}
                            <div className="absolute inset-0 pointer-events-none">
                                {/* ── Leader lines (label → part) ── */}
                                <svg
                                    className="absolute inset-0 w-full h-full"
                                    style={{ zIndex: 15, pointerEvents: "none" }}
                                    aria-hidden="true"
                                >
                                    <defs>
                                        <marker id="lline-dot" markerWidth="6" markerHeight="6" refX="3" refY="3">
                                            <circle cx="3" cy="3" r="2.5" fill="currentColor" />
                                        </marker>
                                    </defs>
                                    {HOTSPOTS.map((hs) => {
                                        if (hs.tx === undefined) return null;
                                        const pd = getPartData(hs.partName);
                                        if (!pd || !isVisible(hs.partName)) return null;
                                        const cfg = STATUS_CONFIG[pd.status];
                                        return (
                                            <g key={`ll-${hs.partName}`}>
                                                <line
                                                    x1={`${hs.x}%`} y1={`${hs.y}%`}
                                                    x2={`${hs.tx}%`} y2={`${hs.ty}%`}
                                                    stroke={cfg.ring}
                                                    strokeWidth="1.5"
                                                    strokeDasharray="5,3"
                                                    opacity="0.75"
                                                />
                                                <circle
                                                    cx={`${hs.tx}%`} cy={`${hs.ty}%`}
                                                    r="3"
                                                    fill={cfg.ring}
                                                    opacity="0.85"
                                                />
                                            </g>
                                        );
                                    })}
                                </svg>

                                {HOTSPOTS.map((hs) => {
                                    const pd = getPartData(hs.partName);
                                    if (!pd || !isVisible(hs.partName)) return null;
                                    const cfg = STATUS_CONFIG[pd.status];
                                    const isMissing = pd.status === "missing";
                                    const isHovered = hoveredPart === hs.partName;

                                    return (
                                        <div
                                            key={hs.partName}
                                            data-hotspot="true"
                                            className="pointer-events-auto absolute"
                                            style={{
                                                left: `${hs.x}%`,
                                                top: `${hs.y}%`,
                                                transform: "translate(-50%, -50%)",
                                                zIndex: isHovered ? 50 : 20,
                                            }}
                                            onMouseEnter={() => {
                                                setHoveredPart(hs.partName);
                                            }}
                                            onMouseLeave={() => setHoveredPart(null)}
                                            onClick={() => {
                                                setActivePart((prev) => prev === hs.partName ? null : hs.partName);
                                                setHoveredPart(null);
                                            }}
                                        >
                                            {/* Pulse ring for pending */}
                                            {isMissing && (
                                                <span
                                                    className="absolute inset-0 rounded-full animate-ping opacity-60"
                                                    style={{ background: cfg.glow }}
                                                />
                                            )}
                                            {/* Glow */}
                                            <span
                                                className="absolute inset-0 rounded-full"
                                                style={{
                                                    boxShadow: `0 0 ${isHovered ? 12 : 6}px ${cfg.glow}`,
                                                    borderRadius: "50%",
                                                    transition: "box-shadow 0.2s ease",
                                                }}
                                            />
                                            {/* Marker circle */}
                                            <div
                                                className="relative flex items-center justify-center font-bold text-white select-none"
                                                style={{
                                                    width: isHovered ? 28 : 22,
                                                    height: isHovered ? 28 : 22,
                                                    borderRadius: "50%",
                                                    background: cfg.ring,
                                                    border: `2.5px solid white`,
                                                    boxShadow: `0 2px 8px ${cfg.glow}, 0 1px 3px rgba(0,0,0,0.15)`,
                                                    fontSize: isHovered ? "11px" : "9px",
                                                    transition: "all 0.18s cubic-bezier(0.34, 1.56, 0.64, 1)",
                                                    cursor: "pointer",
                                                }}
                                            >
                                                {hs.num}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Hover Tooltip (part name only) ── */}
                    {hoveredPart && hoveredPd && (() => {
                        const cfg = STATUS_CONFIG[hoveredPd.status];
                        const hs = HOTSPOTS.find((h) => h.partName === hoveredPart)!;
                        const { flipX } = getTooltipPos(hs.x, hs.y);
                        return (
                            <div
                                ref={tooltipRef}
                                className="pointer-events-none absolute z-[100]"
                                style={{
                                    left: `${hs.x}%`,
                                    top: `${hs.y}%`,
                                    transform: `translate(${flipX ? "calc(-100% - 10px)" : "14px"}, -50%)`,
                                    animation: "fadeInUp 0.15s ease-out",
                                }}
                            >
                                <div
                                    className="rounded-full px-3 py-1 text-[11px] font-bold text-white shadow-lg whitespace-nowrap"
                                    style={{ background: cfg.ring }}
                                >
                                    {hoveredPart}
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── Click Popup ── */}
                    {activePart && activePd && (() => {
                        const hs = HOTSPOTS.find((h) => h.partName === activePart);
                        if (!hs) return null;
                        const cpCfg = STATUS_CONFIG[activePd.status];
                        const { flipX, flipY } = getTooltipPos(hs.x, hs.y);
                        return (
                            <>
                                {/* Backdrop — click outside to close */}
                                <div
                                    className="absolute inset-0 z-[110]"
                                    onClick={() => setActivePart(null)}
                                />
                                <div
                                    className="pointer-events-auto absolute z-[120] w-[288px] rounded-2xl bg-white"
                                    style={{
                                        left: `${hs.x}%`,
                                        top: `${hs.y}%`,
                                        transform: `translate(${flipX ? "calc(-100% - 16px)" : "20px"}, ${flipY ? "calc(-100% + 20px)" : "-20px"})`,
                                        border: `1px solid ${cpCfg.ring}50`,
                                        boxShadow: `0 16px 48px rgba(0,0,0,0.16), 0 0 0 1px ${cpCfg.ring}20`,
                                        animation: "fadeInUp 0.15s ease-out",
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between border-b border-[#F3F4F6] px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
                                                style={{ background: cpCfg.ring }}
                                            >
                                                {hs.num}
                                            </div>
                                            <span className="text-[13px] font-bold text-[#111827]">{activePart}</span>
                                            <ConfidenceBadge level={activePd.conf} />
                                        </div>
                                        <button
                                            onClick={() => setActivePart(null)}
                                            className="rounded-lg p-1 text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#374151] transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    {/* AI Insights list */}
                                    <div className="p-3 space-y-2 max-h-[340px] overflow-y-auto">
                                        <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF] mb-1">AI Insights &amp; Clarifications</div>
                                        {activeClarifs.length === 0 ? (
                                            <div className="rounded-xl bg-[#F9FAFB] px-3 py-4 text-center text-[11px] text-[#9CA3AF]">
                                                No clarifications needed for this part
                                            </div>
                                        ) : (
                                            activeClarifs.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="rounded-xl border p-3 transition-all"
                                                    style={{
                                                        borderColor: c.status === "resolved" ? "#BBF7D0" : c.status === "sent" ? "#BFDBFE" : "#FDE68A",
                                                        background: c.status === "resolved" ? "#F0FDF4" : c.status === "sent" ? "#EFF6FF" : "#FFFBEB",
                                                    }}
                                                >
                                                    <div className="flex items-center gap-1.5 mb-1.5">
                                                        <span className="text-[9px] font-mono text-[#9CA3AF]">{c.id}</span>
                                                        <span className="text-[11px] font-semibold text-[#374151]">{c.field}</span>
                                                        <ConfidenceBadge level={c.conf} />
                                                    </div>
                                                    <p className="text-[11px] leading-relaxed text-[#6B7280] mb-2.5">{c.issue}</p>
                                                    <div className="flex items-center gap-1.5">
                                                        
                                                        {c.status !== "resolved" && (
                                                            <button
                                                                onClick={() => { onMarkResolved(c.id); }}
                                                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                                            >
                                                                Ignore
                                                            </button>
                                                        )}
                                                        {c.status === "resolved" && (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                                                                <CheckCircle2 className="h-3 w-3" /> Resolved
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Hint text when no hotspots visible */}
                    {!showOverlay && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="rounded-xl bg-black/40 px-4 py-2 text-[12px] font-medium text-white backdrop-blur-sm">
                                AI Overlay hidden — click the toggle to show markers
                            </div>
                        </div>
                    )}
                </div>

                {/* Legend strip */}
                <div className="flex items-center gap-4 border-t border-[#E5E7EB] bg-white px-4 py-2">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                        const count = key === "complete"
                            ? stats.clarified
                            : key === "review"
                                ? stats.pending
                                : stats.missing;
                        return (
                            <div key={key} className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.ring }} />
                                <span className="text-[10px] font-medium text-[#6B7280]">{cfg.label}</span>
                                <span className="text-[10px] font-bold tabular-nums text-[#374151]">({count})</span>
                            </div>
                        );
                    })}
                    <span className="ml-auto text-[10px] text-[#9CA3AF] italic">Hover a marker · Click for AI insights &amp; actions</span>
                </div>
            </div>

            {/* ══════════════════════════════════
          RIGHT: AI Insights Sidebar
      ══════════════════════════════════ */}
            <div className="flex w-[264px] shrink-0 flex-col border-l border-[#E5E7EB] bg-white">
                <div className="border-b border-[#E5E7EB] px-4 py-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#6B7280]">AI Insights</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">

                    {/* Clarification Summary */}
                    <div>
                        <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">Clarification Summary</div>
                        <div className="grid grid-cols-2 gap-1.5">
                            {[
                                { label: "Total Parts", value: stats.total, color: "#374151" },
                                { label: "Clarified", value: stats.clarified, color: "#10B981" },
                                { label: "Pending", value: stats.pending, color: "#F59E0B" },
                                { label: "Missing", value: stats.missing, color: "#EF4444" },
                            ].map(({ label, value, color }) => (
                                <div
                                    key={label}
                                    className="rounded-xl border border-[#F3F4F6] bg-[#F9FAFB] p-2.5 text-center"
                                >
                                    <div className="text-[18px] font-bold tabular-nums" style={{ color }}>{value}</div>
                                    <div className="text-[9px] font-medium text-[#9CA3AF]">{label}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Extraction Health */}
                    <div>
                        <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">AI Extraction Health</div>
                        <div className="space-y-1.5">
                            {[
                                { label: "High Confidence", value: stats.highConf, color: "#10B981", bg: "#D1FAE5" },
                                { label: "Med Confidence", value: stats.medConf, color: "#F59E0B", bg: "#FEF3C7" },
                                { label: "Low Confidence", value: stats.lowConf, color: "#EF4444", bg: "#FEE2E2" },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} className="flex items-center gap-2.5">
                                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
                                    <div className="flex-1 text-[10px] font-medium text-[#374151]">{label}</div>
                                    <span
                                        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                                        style={{ background: bg, color }}
                                    >
                                        {value}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div>
                        <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">Quick Filter</div>
                        <div className="flex flex-wrap gap-1">
                            {([
                                { key: "all", label: "Show All" },
                                { key: "pending", label: "Pending" },
                                { key: "clarified", label: "Clarified" },
                                { key: "highrisk", label: "High Risk" },
                            ] as const).map(({ key, label }) => (
                                <button
                                    key={key}
                                    onClick={() => setFilter(key)}
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${filter === key
                                        ? "bg-[#2563EB] text-white"
                                        : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Recent Assumptions */}
                    {recentAssumptions.length > 0 && (
                        <div>
                            <div className="mb-2 text-[9px] font-bold uppercase tracking-[0.08em] text-[#9CA3AF]">Recent AI Assumptions</div>
                            <div className="space-y-1.5">
                                {recentAssumptions.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => {
                                            setActivePart((prev) => prev === c.part ? null : c.part);
                                        }}
                                        className="group w-full rounded-xl border border-[#F3F4F6] bg-[#FFFBEB] p-2.5 text-left hover:border-amber-200 hover:bg-amber-50 transition-all"
                                    >
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                            <span className="text-[10px] font-bold text-[#374151]">{c.part}</span>
                                            <span className="text-[9px] text-[#9CA3AF]">·</span>
                                            <span className="text-[9px] text-[#6B7280]">{c.field}</span>
                                        </div>
                                        <p className="text-[9.5px] leading-relaxed text-[#9CA3AF] line-clamp-2">{c.issue}</p>
                                        <div className="mt-1.5 flex items-center gap-1 text-[9px] font-semibold text-amber-700">
                                            Assumed by AI <ChevronRight className="h-2.5 w-2.5 group-hover:translate-x-0.5 transition-transform" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mark all action */}
                    {pendingCount > 0 && (
                        <button
                            onClick={onMarkAllResolved}
                            className="w-full rounded-xl border border-emerald-200 bg-emerald-50 py-2.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                            ✓ Mark All Clarified ({pendingCount})
                        </button>
                    )}
                </div>
            </div>

            {/* Keyframe animation */}
            <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(var(--tw-translate-x), calc(var(--tw-translate-y) + 6px)); }
          to   { opacity: 1; }
        }
      `}</style>
        </div>
    );
}
