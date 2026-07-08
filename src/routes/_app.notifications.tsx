import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ModuleHeader, Section, Btn } from "@/components/shell/primitives";
import { NOTIFICATIONS } from "@/data/mock";
import { Bell, X, AlertCircle, Settings2, Plus, Trash2, Mail, MonitorSmartphone, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({ meta: [{ title: "Notifications — SeaHydrosys" }] }),
  component: Notifications,
});

// ─── Types ───────────────────────────────────────────────────────────────────
type Rule = {
  id: number;
  event: string;
  condition: string;
  threshold: string;
  recipients: string;
  enabled: boolean;
};

const EVENT_OPTIONS = [
  "SLA breach",
  "RFQ assigned",
  "Approval pending",
  "Procurement delayed",
  "Low AI confidence",
  "Revision requested",
  "Quote approved",
];

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  "In-app": <MonitorSmartphone className="h-3 w-3" />,
  Email: <Mail className="h-3 w-3" />,
  Teams: <MessageSquare className="h-3 w-3" />,
};

const CHANNEL_ACTIVE: Record<string, string> = {
  "In-app": "bg-emerald-100 text-emerald-700 border-emerald-300",
  Email: "bg-sky-100 text-sky-700 border-sky-300",
  Teams: "bg-violet-100 text-violet-700 border-violet-300",
};

// ─── Component ────────────────────────────────────────────────────────────────
function Notifications() {
  const allNotifications = useMemo(() => NOTIFICATIONS.concat(NOTIFICATIONS), []);
  const [openedIds, setOpenedIds] = useState<Set<number>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<number | null>(null);

  // ── Channel preferences ──────────────────────────────────────────────────
  const notificationTypes = EVENT_OPTIONS;
  const channels = ["In-app", "Email", "Teams"];

  const [preferences, setPreferences] = useState<Record<string, Set<string>>>(
    Object.fromEntries(notificationTypes.map((n) => [n, new Set(channels)]))
  );
  const [prefDirty, setPrefDirty] = useState(false);

  function toggleChannelPreference(notifType: string, channel: string) {
    setPreferences((prev) => {
      const updated = new Map(Object.entries(prev).map(([k, v]) => [k, new Set(v)]));
      const channelSet = updated.get(notifType) || new Set();
      if (channelSet.has(channel)) channelSet.delete(channel);
      else channelSet.add(channel);
      updated.set(notifType, channelSet);
      return Object.fromEntries(updated);
    });
    setPrefDirty(true);
  }

  function savePreferences() {
    setPrefDirty(false);
    toast.success("Channel preferences saved");
  }

  // ── Notification rules modal ─────────────────────────────────────────────
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>([
    { id: 1, event: "SLA breach", condition: "Overdue by more than", threshold: "2 hrs", recipients: "Sales, Management", enabled: true },
    { id: 2, event: "Low AI confidence", condition: "Confidence below", threshold: "60%", recipients: "Costing", enabled: true },
    { id: 3, event: "Approval pending", condition: "Waiting longer than", threshold: "4 hrs", recipients: "Sales & Management", enabled: false },
    { id: 4, event: "Procurement delayed", condition: "Overdue by more than", threshold: "24 hrs", recipients: "Procurement, Management", enabled: true },
  ]);

  function toggleRule(id: number) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }

  function deleteRule(id: number) {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast.success("Rule deleted");
  }

  function addRule() {
    const newId = Math.max(0, ...rules.map((r) => r.id)) + 1;
    setRules((prev) => [
      ...prev,
      { id: newId, event: "SLA breach", condition: "Overdue by more than", threshold: "1 hr", recipients: "Sales", enabled: true },
    ]);
  }

  function updateRule(id: number, field: keyof Rule, value: string | boolean) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function saveRules() {
    setRulesOpen(false);
    toast.success("Notification rules saved");
  }

  // ── Notification dialog ──────────────────────────────────────────────────
  function handleMarkAllRead() {
    setOpenedIds(new Set(allNotifications.map((_, i) => i)));
    toast.success("All notifications marked as read");
  }

  function handleNotificationAction() {
    if (selectedNotification === null) return;
    setOpenedIds((prev) => new Set(prev).add(selectedNotification));
    setSelectedNotification(null);
    toast.success("Notification dismissed");
  }

  const currentNotif = selectedNotification !== null ? allNotifications[selectedNotification] : null;
  const severityConfig = {
    high: { bg: "bg-destructive/10", text: "text-destructive", label: "High Priority" },
    medium: { bg: "bg-warning/15", text: "text-[oklch(0.45_0.16_70)]", label: "Medium Priority" },
    info: { bg: "bg-success/10", text: "text-success", label: "Information" },
  };
  const config =
    severityConfig[currentNotif?.severity as keyof typeof severityConfig] || severityConfig.info;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <ModuleHeader
        breadcrumbs={["Configure"]}
        title="Notification Center"
        subtitle="In-app · Email · Teams · Slack-ready"
        actions={
          <>
            <Btn variant="outline" onClick={handleMarkAllRead}>
              Mark all read
            </Btn>
            <Btn onClick={() => setRulesOpen(true)}>
              <Settings2 className="h-3.5 w-3.5" />
              Notification rules
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-12 gap-4 p-6">
        {/* ── All notifications ── */}
        <Section className="col-span-12 xl:col-span-8" title="All notifications">
          <ul className="divide-y">
            {allNotifications.map((n, i) => {
              const isOpened = openedIds.has(i);
              return isOpened ? null : (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded ${
                      n.severity === "high"
                        ? "bg-destructive/10 text-destructive"
                        : n.severity === "medium"
                        ? "bg-warning/15 text-[oklch(0.45_0.16_70)]"
                        : "bg-success/10 text-success"
                    }`}
                  >
                    <Bell className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-foreground">{n.text}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {n.kind} · {n.time}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedNotification(i)}
                      className="rounded border px-2 py-1 text-[11px] hover:bg-muted transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => setOpenedIds((prev) => new Set(prev).add(i))}
                      className="rounded border px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
            {openedIds.size === allNotifications.length && (
              <li className="flex items-center justify-center px-4 py-8 text-[13px] text-muted-foreground">
                All notifications have been read
              </li>
            )}
          </ul>
        </Section>

        {/* ── Channel preferences ── */}
        <Section
          className="col-span-12 xl:col-span-4"
          title="Channel preferences"
          action={
            prefDirty ? (
              <button
                onClick={savePreferences}
                className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Save changes
              </button>
            ) : undefined
          }
        >
          <div className="px-4 pt-3 pb-1">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Choose which channels receive each alert type. Toggle a channel pill to enable or disable delivery. Changes take effect immediately on save.
            </p>
          </div>
          <ul className="divide-y text-[13px] mt-1">
            {notificationTypes.map((c) => (
              <li key={c} className="flex items-center justify-between px-4 py-2.5 gap-2">
                <span className="text-[12px] font-medium">{c}</span>
                <div className="flex gap-1 text-[11px] shrink-0">
                  {channels.map((ch) => {
                    const active = preferences[c]?.has(ch);
                    return (
                      <button
                        key={ch}
                        onClick={() => toggleChannelPreference(c, ch)}
                        title={active ? `Disable ${ch}` : `Enable ${ch}`}
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 font-semibold transition-all duration-150 ${
                          active
                            ? CHANNEL_ACTIVE[ch]
                            : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60"
                        }`}
                      >
                        {CHANNEL_ICONS[ch]}
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t">
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-emerald-600">Green</span> = In-app &nbsp;·&nbsp;
              <span className="font-semibold text-sky-600">Blue</span> = Email &nbsp;·&nbsp;
              <span className="font-semibold text-violet-600">Purple</span> = Teams
            </p>
          </div>
        </Section>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Notification Rules Modal
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="grid h-8 w-8 place-items-center rounded bg-primary/10">
                <Settings2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base">Notification Rules</DialogTitle>
                <DialogDescription className="mt-0.5">
                  Define when alerts are triggered, their conditions, thresholds, and who gets notified.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-2 space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_1.2fr_0.7fr_1fr_80px_48px] gap-2 px-3 py-1.5 rounded bg-muted/50">
              {["Event", "Condition", "Threshold", "Recipients", "Active", ""].map((h) => (
                <div key={h} className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {h}
                </div>
              ))}
            </div>

            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`grid grid-cols-[1fr_1.2fr_0.7fr_1fr_80px_48px] gap-2 items-center rounded-lg border px-3 py-2 transition-all ${
                  rule.enabled ? "border-border bg-card" : "border-border/40 bg-muted/20 opacity-60"
                }`}
              >
                {/* Event */}
                <select
                  value={rule.event}
                  onChange={(e) => updateRule(rule.id, "event", e.target.value)}
                  className="w-full rounded border border-border bg-background px-1.5 py-1 text-[12px] outline-none focus:border-ring"
                >
                  {EVENT_OPTIONS.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>

                {/* Condition */}
                <input
                  value={rule.condition}
                  onChange={(e) => updateRule(rule.id, "condition", e.target.value)}
                  className="w-full rounded border border-border bg-background px-1.5 py-1 text-[12px] outline-none focus:border-ring"
                />

                {/* Threshold */}
                <input
                  value={rule.threshold}
                  onChange={(e) => updateRule(rule.id, "threshold", e.target.value)}
                  className="w-full rounded border border-border bg-background px-1.5 py-1 text-[12px] outline-none focus:border-ring"
                />

                {/* Recipients */}
                <input
                  value={rule.recipients}
                  onChange={(e) => updateRule(rule.id, "recipients", e.target.value)}
                  className="w-full rounded border border-border bg-background px-1.5 py-1 text-[12px] outline-none focus:border-ring"
                  placeholder="e.g. Sales, Management"
                />

                {/* Toggle */}
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    rule.enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {rule.enabled ? "Active" : "Off"}
                </button>

                {/* Delete */}
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {/* Add rule */}
            <button
              onClick={addRule}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-2.5 text-[12px] font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add rule
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t mt-2">
            <Btn variant="outline" onClick={() => setRulesOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={saveRules}>Save rules</Btn>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          Open notification detail dialog
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog
        open={selectedNotification !== null}
        onOpenChange={(open) => !open && setSelectedNotification(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-start gap-3">
              <div className={`grid h-8 w-8 place-items-center rounded ${config.bg}`}>
                <AlertCircle className={`h-4 w-4 ${config.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base">{config.label}</DialogTitle>
                <DialogDescription className="mt-1">{currentNotif?.kind}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {currentNotif && (
            <div className="space-y-4">
              <div>
                <h4 className="text-[13px] font-semibold text-foreground mb-2">Message</h4>
                <p className="text-[13px] text-foreground leading-relaxed">{currentNotif.text}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground mb-1">Category</p>
                  <p className="text-[13px] font-medium text-foreground">{currentNotif.kind}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase text-muted-foreground mb-1">Time</p>
                  <p className="text-[13px] font-medium text-foreground">{currentNotif.time}</p>
                </div>
              </div>
              <div className="pt-4 flex gap-2 justify-end">
                <Btn variant="outline" onClick={() => setSelectedNotification(null)}>
                  Keep unread
                </Btn>
                <Btn onClick={handleNotificationAction}>Mark as read</Btn>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
