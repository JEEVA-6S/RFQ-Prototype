import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ModuleHeader, Section, Btn } from "@/components/shell/primitives";
import { AUDIT_LOGS } from "@/data/mock";
export const Route = createFileRoute("/_app/audit-logs")({ head: () => ({ meta: [{ title: "Audit Logs — SeaHydrosys" }] }), component: Audit });
function Audit() {
  const [isActorMenuOpen, setIsActorMenuOpen] = useState(false);
  const [selectedActor, setSelectedActor] = useState<string>("All actors");

  const all = useMemo(() => [...AUDIT_LOGS, ...AUDIT_LOGS, ...AUDIT_LOGS], []);

  const actorOptions = useMemo(
    () => ["All actors", ...Array.from(new Set(all.map((l) => l.actor)))],
    [all],
  );

  const filteredLogs = useMemo(
    () => selectedActor === "All actors" ? all : all.filter((l) => l.actor === selectedActor),
    [all, selectedActor],
  );

  function escapeCsv(value: unknown) {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\n") || text.includes("\"")) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function handleExportCsv() {
    const headers = ["Timestamp", "Actor", "Role", "Action", "Target", "Before", "After"];
    const rows = filteredLogs.map((l) => [l.ts, l.actor, l.role, l.action, l.target, l.before, l.after]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    link.href = url;
    link.download = `audit-logs-${stamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (<>
    <ModuleHeader breadcrumbs={["Configure"]} title="Audit Logs" subtitle="Append-only · 7y retention · GDPR compliant"
      actions={<>
        <div className="relative">
          <Btn variant="outline" onClick={() => setIsActorMenuOpen((open) => !open)}>{selectedActor} ▾</Btn>
          {isActorMenuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-52 rounded-xl border border-border bg-surface p-1 shadow-lg">
              {actorOptions.map((actor) => (
                <button
                  key={actor}
                  type="button"
                  onClick={() => {
                    setSelectedActor(actor);
                    setIsActorMenuOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-[12px] transition-colors ${selectedActor === actor
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                    }`}
                >
                  {actor}
                </button>
              ))}
            </div>
          )}
        </div>
        <Btn onClick={handleExportCsv}>Export CSV</Btn>
      </>} />
    <div className="p-6">
      <Section title="Activity log">
        <table className="ent-table"><thead><tr>
          <th>Timestamp</th><th>Actor</th><th>Role</th><th>Action</th><th>Target</th><th>Before</th><th>After</th>
        </tr></thead><tbody>
            {filteredLogs.map((l, i) => (<tr key={i}>
              <td className="font-mono text-[11px]">{l.ts}</td>
              <td className="font-medium">{l.actor}</td>
              <td><span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider">{l.role}</span></td>
              <td>{l.action}</td>
              <td className="text-muted-foreground">{l.target}</td>
              <td className="font-mono text-[11px] text-muted-foreground">{l.before}</td>
              <td className="font-mono text-[11px] text-foreground">{l.after}</td>
            </tr>))}
          </tbody></table>
      </Section>
    </div></>);
}
