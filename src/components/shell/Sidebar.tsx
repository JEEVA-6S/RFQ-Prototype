import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Inbox, Boxes, Truck, Calculator,
  Users, FileImage, FileText, PackageCheck, Database,
  Bell, ScrollText, Settings, Layers,
} from "lucide-react";
import seaLogo from "@/assets/RFQ-LOGO.png";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/rfq-inbox", label: "RFQ Inbox", icon: Inbox, badge: 12 },
  { to: "/bom", label: "BOM & Parts", icon: Boxes },
  { to: "/parallel-evaluation", label: "Feasibility & Availability", icon: Layers },
  { to: "/costing", label: "Costing", icon: Calculator },
  { to: "/review", label: "Internal Review", icon: Users, badge: 3 },
  { to: "/drawings", label: "Proposal Drawings", icon: FileImage },
  { to: "/quotes", label: "Quote Management", icon: FileText },
  { to: "/po-handoff", label: "PO & Handoff", icon: PackageCheck },
  { to: "/procurement", label: "Procurement", icon: Truck, badge: 4 },
  { to: "/masters", label: "Master Data", icon: Database },
  { to: "/notifications", label: "Notifications", icon: Bell, badge: 7 },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="flex h-screen w-[240px] shrink-0 flex-col bg-sidebar text-sidebar-foreground" style={{ borderRight: "1px solid var(--color-sidebar-border)" }}>

      {/* ── Brand ── */}
      <div className="flex items-center gap-2.5 px-4 py-3.5" style={{ borderBottom: "1px solid var(--color-sidebar-border)" }}>
        <img
          src={seaLogo}
          alt="SEA Hydrosystems"
          className="h-7 w-auto shrink-0 object-contain"
        />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold leading-tight text-white">RFQ Engine</div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV.map((it) => {
            const active = path === it.to;
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <Link
                  to={it.to}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200 ${active
                    ? "nav-active text-white"
                    : "text-sidebar-foreground/65 hover:bg-sidebar-active/50 hover:text-white"
                    }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-all duration-200 ${active ? "text-white" : "text-sidebar-muted group-hover:text-white/80"
                    }`} />
                  <span className="flex-1 truncate">{it.label}</span>
                  {it.badge != null && (
                    <span className={`min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums leading-none ${active
                      ? "bg-white/20 text-white"
                      : "bg-sidebar-active text-white/60"
                      }`}>
                      {it.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
