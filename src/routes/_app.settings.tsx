import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ModuleHeader, Section, Btn } from "@/components/shell/primitives";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X, Plus } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({ head: () => ({ meta: [{ title: "Settings — SeaHydrosys" }] }), component: Settings });

type SlaRow = { stage: string; owner: string; sla: string; endCondition: string };

function Settings() {
  const aiFeatures = ["Auto-extract RFQ fields", "Flag low-confidence fields", "Anomaly detection on costing", "Margin optimization suggestions", "Vendor recommendation engine"];
  const integrations = [["Email (IMAP/SMTP)", "Connected · sales@rfq-engine.com"], ["Microsoft Teams", "Connected"], ["ERP (SAP)", "Pending IT review"], ["DocuSign", "Connected"], ["CAD vault", "On-prem · file share"]];

  const [rolesSlaData, setRolesSlaData] = useState<SlaRow[]>([
    { stage: "RFQ Inbox (RFQ Parsing)", owner: "Sales", sla: "2", endCondition: "RFQ parsed, client identified, & details submitted to BOM" },
    { stage: "BOM & Parts (BOM Extraction)", owner: "Costing", sla: "4", endCondition: "Parts extracted, materials matched, & BOM generated" },
    { stage: "Feasibility & Availability (Procurement Response)", owner: "Procurement", sla: "48", endCondition: "Material & vendor availability checked & checklist items approved" },
    { stage: "Costing", owner: "Costing", sla: "2", endCondition: "Machine setup/run times, RM costs, & margins finalized" },
    { stage: "Internal Review", owner: "Sales & Management", sla: "1", endCondition: "Feasibility, design, & margins approved by management" },
    { stage: "Proposal Drawings", owner: "Design", sla: "4", endCondition: "Proposal drawings uploaded & shared with customer" },
    { stage: "Quote Management", owner: "Sales", sla: "2", endCondition: "Final quotation document submitted & sent to client" },
    
  ]);

  const [editingRows, setEditingRows] = useState<Set<number>>(new Set());
  const [drafts, setDrafts] = useState<Record<number, SlaRow>>({});

  function startEdit(i: number) {
    setDrafts(prev => ({ ...prev, [i]: { ...rolesSlaData[i] } }));
    setEditingRows(prev => new Set(prev).add(i));
  }

  function cancelEdit(i: number) {
    setEditingRows(prev => { const s = new Set(prev); s.delete(i); return s; });
  }

  function confirmEdit(i: number) {
    if (drafts[i]) {
      setRolesSlaData(prev => prev.map((row, idx) => (idx === i ? drafts[i] : row)));
      toast.success("Row updated");
    }
    cancelEdit(i);
  }

  function updateDraft(i: number, field: keyof SlaRow, value: string) {
    setDrafts(prev => ({ ...prev, [i]: { ...prev[i], [field]: value } }));
  }

  function deleteRow(i: number) {
    setRolesSlaData(prev => prev.filter((_, idx) => idx !== i));
    cancelEdit(i);
    toast.success("Row deleted");
  }

  function addRow() {
    const newRow: SlaRow = { stage: "New Stage", owner: "Owner", sla: "0 hrs", endCondition: "Define end condition" };
    setRolesSlaData(prev => {
      const next = [...prev, newRow];
      const newIdx = next.length - 1;
      setDrafts(d => ({ ...d, [newIdx]: { ...newRow } }));
      setEditingRows(s => new Set(s).add(newIdx));
      return next;
    });
  }

  const [aiEnabled, setAiEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(aiFeatures.map(f => [f, true]))
  );

  const [integrationStatus, setIntegrationStatus] = useState<Record<string, string>>(
    Object.fromEntries(integrations.map(([n]) => [n, integrations.find(([x]) => x === n)?.[1] || "Disconnected"]))
  );

  function toggleAiFeature(feature: string) {
    setAiEnabled(prev => ({ ...prev, [feature]: !prev[feature] }));
    toast.success(`${feature} ${!aiEnabled[feature] ? "enabled" : "disabled"}`);
  }

  function handleIntegrationAction(name: string) {
    const current = integrationStatus[name];
    if (current.includes("Connected")) {
      setIntegrationStatus(prev => ({ ...prev, [name]: "Disconnected" }));
      toast.success(`${name} disconnected`);
    } else {
      setIntegrationStatus(prev => ({ ...prev, [name]: "Connected" }));
      toast.success(`${name} connected`);
    }
  }

  function handleSaveAll() {
    toast.success("Settings saved successfully");
  }

  // In edit mode inputs always show a visible border so every field looks editable
  const cellCls =
    "w-full rounded border border-border bg-background px-1.5 py-1 text-[13px] outline-none transition focus:border-ring focus:ring-1 focus:ring-ring/20";

  return (
    <>
      <ModuleHeader
        breadcrumbs={["Configure"]}
        title="Workspace Settings"
        subtitle="Org: RFQ Engine"
        actions={<Btn onClick={handleSaveAll}>Save changes</Btn>}
      />
      <div className="grid grid-cols-12 gap-4 p-6">

        {/* Organisation */}
        <Section className="col-span-12" title="Organization">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 text-[13px]">
            {[
              ["Org name", "RFQ Engine"],
              ["Primary plant", "Mumbai"],
              ["Default currency", "USD"],
              ["Working hours", "Mon–Sat 09–18 IST"],
              ["Class society default", "LR / DNV"],
              ["Quote validity", "30 days"],
            ].map(([l, v]) => (
              <div key={l}>
                <div className="text-[11px] uppercase text-muted-foreground">{l}</div>
                <input defaultValue={v} className="mt-1 w-full rounded border bg-background px-2 py-1.5 outline-none focus:border-ring" />
              </div>
            ))}
          </div>
        </Section>

        {/* Roles & SLA */}
        <Section
          className="col-span-12"
          title="Roles & SLA"
          action={
            <button
              onClick={addRow}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-transparent px-3 py-1.5 text-[12px] font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Role &amp; SLA
            </button>
          }
        >
          <div className="overflow-x-auto">
            <table className="ent-table">
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>Stage</th>
                  <th style={{ width: "20%" }}>Owner</th>
                  <th style={{ width: "15%" }}>SLA</th>
                  <th style={{ width: "30%" }}>End Condition</th>
                  <th style={{ width: "10%" }} className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rolesSlaData.map((item, i) => {
                  const isEditing = editingRows.has(i);
                  const rowData = isEditing ? (drafts[i] || item) : item;

                  return (
                    <tr key={i}>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={rowData.stage}
                            onChange={(e) => updateDraft(i, "stage", e.target.value)}
                            className={cellCls}
                          />
                        ) : (
                          <span className="font-semibold text-foreground">{item.stage}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={rowData.owner}
                            onChange={(e) => updateDraft(i, "owner", e.target.value)}
                            className={cellCls}
                          />
                        ) : (
                          <span>{item.owner}</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={rowData.sla}
                              onChange={(e) => updateDraft(i, "sla", e.target.value)}
                              className={cellCls}
                            />
                            <span className="absolute right-2 text-[11px] text-muted-foreground">hrs</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-foreground/80">{item.sla} hrs</span>
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            type="text"
                            value={rowData.endCondition}
                            onChange={(e) => updateDraft(i, "endCondition", e.target.value)}
                            className={cellCls}
                          />
                        ) : (
                          <span className="text-muted-foreground text-[12px]">{item.endCondition}</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => confirmEdit(i)}
                                className="rounded p-1 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 dark:hover:bg-emerald-950/30"
                                title="Confirm"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => cancelEdit(i)}
                                className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEdit(i)}
                                className="rounded p-1 hover:bg-muted text-muted-foreground hover:text-foreground"
                                title="Edit"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteRow(i)}
                                className="rounded p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-600 dark:hover:bg-rose-950/30"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
        {/* AI */}
        <Section className="col-span-12 xl:col-span-6" title="AI assistant">
          <ul className="divide-y text-[13px]">
            {aiFeatures.map(s => (
              <li key={s} className="flex items-center justify-between px-4 py-2.5">
                <span>{s}</span>
                <Switch checked={aiEnabled[s]} onCheckedChange={() => toggleAiFeature(s)} />
              </li>
            ))}
          </ul>
        </Section>

        {/* Integrations */}
        <Section className="col-span-12 xl:col-span-6" title="Integrations">
          <ul className="divide-y text-[13px]">
            {integrations.map(([n]) => (
              <li key={n} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <div className="font-medium">{n}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">{integrationStatus[n]}</div>
                </div>
                <Btn variant="outline" size="sm" onClick={() => handleIntegrationAction(n)}>
                  {integrationStatus[n].includes("Connected") ? "Disconnect" : "Connect"}
                </Btn>
              </li>
            ))}
          </ul>
        </Section>

      </div>
    </>
  );
}
