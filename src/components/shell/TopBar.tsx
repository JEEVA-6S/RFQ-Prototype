import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, Bell, Moon, Sun, ChevronDown } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { NOTIFICATIONS } from "@/data/mock";
import { AIChatPanel } from "./AIChatPanel";

const SEVERITY_CLS: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/15 text-[oklch(0.45_0.16_70)]",
  low: "bg-success/10 text-success",
};

export function TopBar() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [showNotifs, setShowNotifs] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const notifsRef = useRef<HTMLDivElement>(null);

  function toggleDark() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    setIsDark(next);
  }

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    }
    if (showNotifs) document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showNotifs]);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 bg-surface/80 px-6 backdrop-blur-xl" style={{ borderBottom: "1px solid var(--color-border)" }}>

        {/* Search — fixed width, left-anchored */}
        <div className="relative w-[580px] shrink-0">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search RFQs, clients, parts, quotes…"
            className="field-input h-9 rounded-lg pl-10 pr-14 text-[13px]"
          />

        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Right actions — grouped together */}
        <div className="flex items-center gap-2 shrink-0">

          {/* AI */}
          <button
            onClick={() => setShowAI(true)}
            className="btn-press flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-foreground transition-all duration-200 hover:bg-muted"
            style={{ border: "1px solid var(--color-border)" }}
          >
            <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--color-accent)" }} />
            Ask AI
          </button>

          {/* Divider */}
          <div className="h-5 w-px mx-1" style={{ background: "var(--color-border)" }} />

          {/* Icons */}
          <div className="flex items-center gap-0.5">

            {/* Bell + notifications dropdown */}
            <div className="relative" ref={notifsRef}>
              <button
                className="btn-press relative rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
                title="Notifications"
                onClick={() => setShowNotifs((v) => !v)}
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white shadow-sm">
                  {NOTIFICATIONS.length}
                </span>
              </button>

              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-96 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl z-50">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="text-[13px] font-bold text-foreground">Notifications</span>
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                      {NOTIFICATIONS.length} unread
                    </span>
                  </div>
                  <ul className="max-h-[340px] divide-y divide-border overflow-y-auto">
                    {NOTIFICATIONS.map((n, i) => (
                      <li key={i} className="flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                        <div className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded ${SEVERITY_CLS[n.severity]}`}>
                          <Bell className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] leading-snug text-foreground">{n.text}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{n.kind} · {n.time}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="border-t border-border px-4 py-2.5 text-center">
                    <Link
                      to="/notifications"
                      onClick={() => setShowNotifs(false)}
                      className="cursor-pointer text-[12px] font-semibold text-primary hover:underline block w-full"
                    >
                      View all notifications →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Dark mode toggle */}
            <button
              className="btn-press rounded-lg p-2 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground"
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleDark}
            >
              {isDark
                ? <Sun className="h-[18px] w-[18px]" />
                : <Moon className="h-[18px] w-[18px]" />
              }
            </button>
          </div>{/* end icons */}

          {/* Divider */}
          <div className="h-5 w-px mx-1" style={{ background: "var(--color-border)" }} />

          {/* User chip */}
          <button className="btn-press flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all duration-200 hover:bg-muted" style={{ border: "1px solid var(--color-border)" }}>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-[10px] font-bold text-white shadow-sm">
              AR
            </div>
            <div className="text-left text-[12px] leading-tight">
              <div className="font-semibold text-foreground">Anita R.</div>
              <div className="text-[10px] text-muted-foreground">Costing</div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

        </div>{/* end right actions */}
      </header>

      <AIChatPanel open={showAI} onClose={() => setShowAI(false)} />
    </>
  );
}
