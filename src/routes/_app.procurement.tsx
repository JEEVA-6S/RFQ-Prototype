import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  CheckCircle2, AlertTriangle, Clock,
  RefreshCw, Mail, DollarSign,
  Send, Package, Wrench, Box,
} from "lucide-react";
import { RFQS, partStore, rawMaterialStore, type ProcurementRow, type ProcurementStatus } from "@/data/mock";
import { useProcurementRows } from "@/data/procurementStore";
import { ModuleHeader, Section, Btn, MetricCard } from "@/components/shell/primitives";
import { StageWorkflowChrome, StageSLAChip } from "@/components/workflow";
import { useWorkflow } from "@/context/WorkflowContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_app/procurement")({
  head: () => ({ meta: [{ title: "Procurement — SeaHydrosys" }] }),
  component: ProcurementPage,
});

const STATUS_STYLES: Record<ProcurementStatus, string> = {
  "Pending": "bg-slate-50 text-slate-600 ring-1 ring-slate-200",
  "Vendor RFQ Sent": "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  "Price Received": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "RM Approved": "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  "Alternate Vendor Required": "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

const ITEM_TYPE_ICON = {
  "raw-material": Box,
  "part": Package,
  "service": Wrench,
};
const ITEM_TYPE_LABEL = {
  "raw-material": "Raw Material",
  "part": "Bought-out Part",
  "service": "Service",
};

type VendorComparisonQuote = {
  supplier: string;
  email: string;
  leadDays: number;
  price: number;
  role?: string;
  rating?: number;
};

function formatUnit(unit: string) {
  return unit === "pcs" ? "pc" : unit;
}

function formatPrice(price: number) {
  return `$${price.toFixed(2)}`;
}

function formatDeltaString(price: number, base: number) {
  const diff = price - base;
  if (diff < -0.005) return `(-$${Math.abs(diff).toFixed(2)})`;
  return "";
}

function syncRowsFromMaster(sourceRows: ProcurementRow[]): ProcurementRow[] {
  return sourceRows.map((row) => {
    if (!row.masterRef) return row;

    if (row.masterRef.startsWith("RM-")) {
      const rm = rawMaterialStore.getById(row.masterRef);
      if (!rm) return row;
      return {
        ...row,
        price: rm.costPerKg,
        basePrice: row.basePrice ?? rm.costPerKg,
        supplierQuote: row.supplierQuote ?? rm.costPerKg,
        supplier: rm.supplier,
        alt: rm.altSupplier ?? row.alt,
        leadDays: rm.leadDays,
      };
    }

    if (row.masterRef.startsWith("PRT-")) {
      const part = partStore.getById(row.masterRef);
      if (!part) return row;
      return {
        ...row,
        price: part.costPerPc,
        basePrice: row.basePrice ?? part.costPerPc,
        supplierQuote: row.supplierQuote ?? part.costPerPc,
        supplier: part.vendor,
        alt: part.altVendor ?? row.alt,
        leadDays: part.leadDays,
      };
    }

    return row;
  });
}

function getReviewQuotes(row: ProcurementRow) {
  return [
    {
      supplier: row.supplier,
      email: row.supplierEmail,
      leadDays: row.leadDays,
      price: row.price,
      role: "Primary",
    },
    ...(row.alt && row.alt !== "—"
      ? [{
        supplier: row.alt,
        email: row.altEmail,
        leadDays: row.altLeadDays ?? row.leadDays,
        price: row.altQuote ?? row.basePrice ?? row.price,
        role: "Alternate",
      }]
      : []),
  ];
}

function getVendorComparisonQuotes(row: ProcurementRow): VendorComparisonQuote[] {
  const merged = new Map<string, VendorComparisonQuote>();
  getReviewQuotes(row).forEach((quote) => {
    merged.set(quote.supplier, {
      supplier: quote.supplier,
      email: quote.email,
      leadDays: quote.leadDays,
      price: quote.price,
      role: quote.role,
    });
  });

  return Array.from(merged.values()).sort((a, b) => a.price - b.price);
}

function canReviewRow(row: ProcurementRow) {
  if (row.status === "RM Approved") return true;
  return (row.status === "Vendor RFQ Sent" || row.status === "Price Received")
    && !row.approvedSupplier;
}

function ProcurementPage() {
  const { activeRfqId } = useWorkflow();
  const rfq = RFQS.find((r) => r.id === activeRfqId) ?? RFQS[0];
  const [rows, setRows] = useProcurementRows(rfq.id);

  // Dialogs
  const [rfqDialogIdx, setRfqDialogIdx] = useState<number | null>(null);
  const [reviewDialogIdx, setReviewDialogIdx] = useState<number | null>(null);
  const [selectedRowIdx, setSelectedRowIdx] = useState<number | null>(null);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{ rowIdx: number; field: 'price' | 'leadDays' } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  const defaultSelectedIdx = rows.findIndex((row) => row.flag);
  const activeRowIdx = selectedRowIdx !== null && rows[selectedRowIdx]
    ? selectedRowIdx
    : (defaultSelectedIdx >= 0 ? defaultSelectedIdx : 0);
  const activeRow = rows[activeRowIdx];

  const approved = rows.filter((r) => r.status === "RM Approved").length;
  const pending = rows.length - approved;
  const totalCost = rows.reduce((s, r) => s + r.price * r.qtyNeeded, 0);

  function updateMasterPrice(row: ProcurementRow, price?: number, leadDays?: number) {
    if (!row.masterRef) return false;
    const finalPrice = price ?? row.price;
    const finalLeadDays = leadDays ?? row.leadDays;
    if (row.masterRef.startsWith("RM-")) {
      const updated = rawMaterialStore.update(row.masterRef, {
        costPerKg: finalPrice,
        supplier: row.supplier,
        altSupplier: row.alt && row.alt !== "—" ? row.alt : undefined,
        leadDays: finalLeadDays,
        lastUpdated: new Date().toISOString().slice(0, 10),
      });
      return Boolean(updated);
    }
    if (row.masterRef.startsWith("PRT-")) {
      const updated = partStore.update(row.masterRef, {
        costPerPc: finalPrice,
        vendor: row.supplier,
        altVendor: row.alt && row.alt !== "—" ? row.alt : undefined,
        leadDays: finalLeadDays,
      });
      return Boolean(updated);
    }
    return false;
  }

  /* ── Actions ── */

  function handleSendVendorRfq(idx: number) {
    const row = rows[idx];
    const suppliers = [row.supplier, row.alt].filter((supplier): supplier is string => Boolean(supplier && supplier !== "—"));
    setRows((prev) => prev.map((r, i) => (
      i === idx
        ? {
          ...r,
          status: "Vendor RFQ Sent" as const,
          rfqSentTo: suppliers,
          masterUpdated: false,
        }
        : r
    )));
    toast.success(`RFQ sent to ${suppliers.join(" and ")}`);
    setRfqDialogIdx(null);
  }

  function openSendRfqDialog(idx: number) {
    setRfqDialogIdx(idx);
  }

  function handleOpenReview(idx: number) {
    const row = rows[idx];
    setSelectedRowIdx(idx);
    setRows((prev) => prev.map((r, i) => (
      i === idx
        ? {
          ...r,
          status: "Price Received" as const,
          masterUpdated: false,
        }
        : r
    )));
    setReviewDialogIdx(idx);
    toast.success(`Review opened for ${row.partName}`);
  }

  function buildApprovedRow(row: ProcurementRow, supplier: { supplier: string; email: string; leadDays: number; price: number }) {
    const isAlternate = row.alt && row.alt !== "—" && supplier.supplier === row.alt;
    if (isAlternate) {
      return {
        ...row,
        supplier: row.alt,
        supplierEmail: row.altEmail,
        alt: row.supplier,
        altEmail: row.supplierEmail,
        leadDays: supplier.leadDays,
        altLeadDays: row.leadDays,
        price: supplier.price,
        lastQuotedPrice: supplier.price,
        supplierQuote: supplier.price,
        altQuote: row.supplierQuote ?? row.price,
        approvedSupplier: supplier.supplier,
        status: "RM Approved" as const,
        masterUpdated: false,
      };
    }

    return {
      ...row,
      supplier: supplier.supplier,
      supplierEmail: supplier.email,
      leadDays: supplier.leadDays,
      price: supplier.price,
      lastQuotedPrice: supplier.price,
      supplierQuote: supplier.price,
      approvedSupplier: supplier.supplier,
      status: "RM Approved" as const,
      masterUpdated: false,
    };
  }

  function handleApproveQuote(idx: number, supplier: { supplier: string; email: string; leadDays: number; price: number }) {
    const currentRow = rows[idx];
    const approvedRow = buildApprovedRow(currentRow, supplier);
    const masterUpdated = updateMasterPrice(approvedRow, approvedRow.price);

    setRows((prev) => prev.map((r, i) => (i === idx ? { ...approvedRow, masterUpdated } : r)));
    setReviewDialogIdx(null);
    toast.success(
      masterUpdated
        ? `${currentRow.material} — approved from ${supplier.supplier} and master updated`
        : `${currentRow.material} — approved from ${supplier.supplier}`,
    );
  }

  function handleEditCell(rowIdx: number, field: 'price' | 'leadDays') {
    const row = rows[rowIdx];
    setEditingCell({ rowIdx, field });
    setEditValue(field === 'price' ? row.price.toString() : row.leadDays.toString());
  }

  function handleSaveEdit() {
    if (!editingCell) return;
    const row = rows[editingCell.rowIdx];
    const value = parseFloat(editValue);
    if (isNaN(value) || value <= 0) {
      toast.error("Invalid value");
      setEditingCell(null);
      return;
    }

    const isPrice = editingCell.field === 'price';
    const updatedRow = isPrice
      ? { ...row, price: value }
      : { ...row, leadDays: Math.round(value) };

    const masterUpdated = updateMasterPrice(
      updatedRow,
      isPrice ? value : undefined,
      !isPrice ? Math.round(value) : undefined
    );

    setRows((prev) => prev.map((r, i) => (i === editingCell.rowIdx ? { ...updatedRow, masterUpdated } : r)));
    setEditingCell(null);
    toast.success(
      masterUpdated
        ? `${row.material} — ${isPrice ? 'Price' : 'Lead time'} updated and master synced`
        : `${row.material} — ${isPrice ? 'Price' : 'Lead time'} updated`,
    );
  }

  /* ── Compose email body for Vendor RFQ ── */
  function composeVendorEmail(row: ProcurementRow) {
    const recipients = [row.supplierEmail, row.altEmail].filter((email) => Boolean(email));
    const contactLine = [row.supplier, row.alt].filter((supplier) => supplier && supplier !== "—").join(" / ");
    return {
      to: recipients.join(", "),
      subject: `RFQ — ${row.material} for ${rfq.id}`,
      body: [
        `Dear ${contactLine || row.supplier} Team,`,
        ``,
        `We require a quotation for the following item(s) from all shortlisted suppliers:`,
        ``,
        `Part / Component : ${row.partName}`,
        `Material / Service: ${row.material}`,
        `Specification     : ${row.spec}`,
        `Quantity Required : ${row.qtyNeeded} ${row.unit}`,
        `Current Price     : ${formatPrice(row.price)} / ${formatUnit(row.unit)}`,
        `Delivery          : Earliest availability`,
        ``,
        `Please provide:`,
        `  • Unit price ($/${formatUnit(row.unit)})`,
        `  • MOQ`,
        `  • Lead time (days)`,
        `  • Material test certificate availability`,
        ``,
        `Reference: ${rfq.id} — ${rfq.client}`,
        `Sent to: ${contactLine || row.supplier}`,
        ``,
        `Regards,`,
        `Procurement Team — RFQ-Engine`,
      ].join("\n"),
    };
  }

  return (
    <>
      <ModuleHeader
        breadcrumbs={["Operate", "BOM", "Procurement"]}
        title="Procurement & Vendor Management"
        subtitle={`${rfq.id} · ${rows.length} items · ${approved} approved · ${pending} pending`}
        titleSuffix={
          <StageSLAChip stage="PO" />
        }
        actions={
          <>
            <Btn variant="outline" size="sm" onClick={() => {
              setRows((prev) => syncRowsFromMaster(prev));
              toast.success("Procurement prices refreshed from master data");
            }}>
              <RefreshCw className="h-3.5 w-3.5" />Refresh Prices
            </Btn>
          </>
        }
      />
      <StageWorkflowChrome stage="PO" />

      <div className="space-y-6 p-6 lg:p-8">
        {/* ── Workflow Strip ── */}


        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard label="Total Items" value={`${rows.length}`} hint="parts + materials + services" />
          <MetricCard label="Approved" value={`${approved}/${rows.length}`} hint="RM approved" />
          <MetricCard label="Longest Lead" value={`${Math.max(...rows.map((r) => r.leadDays))}d`} hint="days" delta="CK45-HC Rod" />
          <MetricCard label="Est. RM Cost" value={`$${totalCost.toLocaleString()}`} hint="at qty" />
        </div>

        {/* ── Procurement Pipeline ── */}
        <Section
          title="Procurement"

        >
          <div className="overflow-x-auto">
            <table className="ent-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th className="w-32">Type</th>
                  <th className="w-36">BOM Part</th>
                  <th className="min-w-[180px]">Material / Service</th>
                  <th className="min-w-[180px]">Spec</th>
                  <th className="w-24">Qty</th>
                  <th className="min-w-[180px]">Supplier</th>
                  <th className="w-32">Alternate</th>
                  <th className="w-28">Availability</th>
                  <th className="w-20">Lead</th>
                  <th className="w-28">Price</th>
                  <th className="w-36">Status</th>
                  <th className="min-w-[240px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const TypeIcon = ITEM_TYPE_ICON[r.itemType];
                  return (
                    <tr
                      key={i}
                      className={`group cursor-pointer ${r.flag ? "bg-rose-50/50" : ""} ${i === activeRowIdx ? "ring-1 ring-primary/40 bg-primary/5" : ""}`}
                      onClick={() => setSelectedRowIdx(i)}
                    >
                      <td className="font-mono text-[11px] text-muted-foreground">{i + 1}</td>
                      <td>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <TypeIcon className="h-3 w-3" />
                          {ITEM_TYPE_LABEL[r.itemType]}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {r.flag && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                          <span className="font-semibold text-[13px]">{r.partName}</span>
                        </div>
                      </td>
                      <td className="text-[12px] align-top">{r.material}</td>
                      <td className="text-[11px] text-muted-foreground align-top">{r.spec}</td>
                      <td className="tabular-nums text-[12px] font-medium">
                        {r.qtyNeeded} {r.unit}
                      </td>
                      <td>
                        <div className="text-[12px]">{r.supplier}</div>
                        {r.supplierEmail && (
                          <div className="text-[10px] text-muted-foreground">{r.supplierEmail}</div>
                        )}
                      </td>
                      <td className="text-[12px] text-muted-foreground">{r.alt}</td>
                      <td>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.availability === "Stock" || r.availability === "In Stock"
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                          }`}>
                          {r.availability}
                        </span>
                      </td>
                      <td>
                        {editingCell?.rowIdx === i && editingCell?.field === 'leadDays' ? (
                          <input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleSaveEdit}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            className="w-12 px-1.5 py-0.5 text-[12px] font-medium border rounded"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded" onClick={(e) => {
                            e.stopPropagation();
                            handleEditCell(i, 'leadDays');
                          }}>
                            <Clock className={`h-3 w-3 ${r.leadDays > 14 ? "text-destructive" : "text-muted-foreground"}`} />
                            <span className={`tabular-nums text-[12px] font-medium ${r.leadDays > 14 ? "text-destructive" : ""}`}>
                              {r.leadDays}d
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="tabular-nums font-medium text-[12px]">
                        {editingCell?.rowIdx === i && editingCell?.field === 'price' ? (
                          <div className="flex items-center gap-1">
                            $<input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={handleSaveEdit}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              autoFocus
                              step="0.01"
                              className="w-16 px-1.5 py-0.5 text-[12px] font-medium border rounded"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        ) : (
                          <div className="cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded" onClick={(e) => {
                            e.stopPropagation();
                            handleEditCell(i, 'price');
                          }}>
                            {formatPrice(r.price)}/{formatUnit(r.unit)}
                            {r.lastQuotedPrice && r.lastQuotedPrice !== r.price && (
                              <div className="text-[10px] text-muted-foreground line-through">{formatPrice(r.lastQuotedPrice)}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div className="space-y-1">
                          {/* Approved supplier & Done - with border/background */}
                          {(r.status === "RM Approved" || r.approvedSupplier) && (
                            <div className="rounded-md border border-sky-100 bg-sky-50/40 p-1.5">
                              {r.status === "RM Approved" ? (
                                <div className="text-[11px] text-emerald-700">Approved supplier: {r.approvedSupplier ?? r.supplier}</div>
                              ) : r.approvedSupplier ? (
                                <div className="text-[11px] text-emerald-700">Approved supplier: {r.approvedSupplier}</div>
                              ) : null}
                              {r.status === "RM Approved" && (
                                <div className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                                  <CheckCircle2 className="h-3 w-3" />Done
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action buttons - without border/background */}
                          {r.status !== "RM Approved" && (
                            <div className="flex flex-row flex-wrap items-center gap-1">
                              {r.status !== "Vendor RFQ Sent" && r.status !== "Price Received" && (!r.rfqSentTo || r.rfqSentTo.length === 0) && !r.approvedSupplier && (
                                <Btn variant="outline" size="sm" onClick={() => openSendRfqDialog(i)}>
                                  <Mail className="h-3 w-3" />Send RFQ
                                </Btn>
                              )}
                              {(r.status === "Vendor RFQ Sent" || r.status === "Price Received") && !r.approvedSupplier && (
                                <Btn variant="teal" size="sm" onClick={() => handleOpenReview(i)}>
                                  <DollarSign className="h-3 w-3" />Review
                                </Btn>
                              )}
                            </div>
                          )}
                          {r.masterUpdated && (
                            <span className="text-[11px] font-semibold text-sky-700"></span>
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

        {/* ── Vendor Comparison ── */}
        <div className="grid grid-cols-12 gap-6">
          {selectedRowIdx !== null && activeRow && canReviewRow(activeRow) && (
            <Section
              className="col-span-12 lg:col-span-6"
              title={`Vendor Price Comparison — ${activeRow.material}`}
            >
              <div className="p-5 space-y-3">
                {getVendorComparisonQuotes(activeRow).map((vendor) => {
                  const isApproved = activeRow.status === "RM Approved" && (activeRow.approvedSupplier ?? activeRow.supplier) === vendor.supplier;
                  return (
                    <div key={vendor.supplier} className="flex items-center justify-between rounded-lg border p-3 hover:bg-surface-2 transition-colors">
                      <div>
                        <div className="text-[13px] font-semibold">{vendor.supplier}</div>
                        <div className="text-[11px] text-muted-foreground">
                          Lead: {vendor.leadDays}d
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-bold tabular-nums">{formatPrice(vendor.price)}/{formatUnit(activeRow.unit)}</div>
                        <Btn
                          variant={isApproved ? "teal" : "outline"}
                          size="sm"
                          className="mt-1"
                          onClick={() => handleApproveQuote(activeRowIdx, vendor)}
                          disabled={isApproved}
                        >
                          {isApproved ? "Approved" : "Select"}
                        </Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {selectedRowIdx !== null && activeRow && (
            <Section
              className={`col-span-12 ${activeRow && canReviewRow(activeRow) ? "lg:col-span-6" : "lg:col-span-12"}`}
              title={`Cost Trend — ${activeRow.material}`}
            >
              <div className="px-4 py-2">
                <CostTrend row={activeRow} unit={activeRow?.unit ?? "kg"} />
              </div>
            </Section>
          )}
        </div>
      </div>

      {/* ═══ Send Vendor RFQ Dialog ═══ */}
      <Dialog open={rfqDialogIdx !== null} onOpenChange={(open) => !open && setRfqDialogIdx(null)}>
        <DialogContent className="w-[95vw] max-w-[960px] max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" /> Send Vendor RFQ
            </DialogTitle>
            <DialogDescription>
              Review the RFQ email below and send to the supplier. Pricing will be updated once the vendor responds.
            </DialogDescription>
          </DialogHeader>
          {rfqDialogIdx !== null && (() => {
            const row = rows[rfqDialogIdx];
            const email = composeVendorEmail(row);
            return (
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[calc(85vh-180px)]">
                {/* Email Header */}
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="font-semibold text-muted-foreground w-12">To:</span>
                    <span className="font-medium">{email.to}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px]">
                    <span className="font-semibold text-muted-foreground w-12">Subject:</span>
                    <span className="font-medium">{email.subject}</span>
                  </div>
                </div>
                {/* Email Body */}
                <div className="rounded-lg border p-4">
                  <pre className="whitespace-pre-wrap text-[12px] leading-relaxed text-foreground font-sans">
                    {email.body}
                  </pre>
                </div>
                {/* Item Summary */}
                <div className="rounded-lg border bg-sky-50/50 p-3 text-[12px] space-y-1">
                  <div className="font-semibold text-sky-800">Item Summary</div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sky-700">
                    <span>BOM Part: <strong>{row.partName}</strong></span>
                    <span>Qty: <strong>{row.qtyNeeded} {row.unit}</strong></span>
                    <span>Current Price: <strong>{formatPrice(row.price)}/{formatUnit(row.unit)}</strong></span>
                    <span>Lead: <strong>{row.leadDays} days</strong></span>
                  </div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Btn variant="outline" size="sm" onClick={() => setRfqDialogIdx(null)}>Cancel</Btn>
            <Btn size="sm" onClick={() => rfqDialogIdx !== null && handleSendVendorRfq(rfqDialogIdx)}>
              <Send className="h-3.5 w-3.5" />Send RFQ Email
            </Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Supplier Review Dialog ═══ */}
      <Dialog open={reviewDialogIdx !== null} onOpenChange={(open) => !open && setReviewDialogIdx(null)}>
        <DialogContent className="w-[95vw] max-w-[860px] max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Review Supplier Prices
            </DialogTitle>
            <DialogDescription>
              Review supplier prices and approve the preferred quote.
            </DialogDescription>
          </DialogHeader>
          {reviewDialogIdx !== null && (() => {
            const row = rows[reviewDialogIdx];
            const reviewQuotes = getReviewQuotes(row);
            return (
              <div className="space-y-4 overflow-y-auto pr-1 max-h-[calc(85vh-180px)]">
                <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-[13px]">
                  <div><span className="text-muted-foreground">Material:</span> <strong>{row.material}</strong></div>
                  <div><span className="text-muted-foreground">Spec:</span> {row.spec}</div>
                  {row.masterRef && (
                    <div><span className="text-muted-foreground">Master Ref:</span> <code className="text-[11px] bg-muted px-1 rounded">{row.masterRef}</code></div>
                  )}
                </div>
                <div className="rounded-lg border overflow-hidden">
                  <table className="ent-table">
                    <thead>
                      <tr>
                        <th>Supplier</th>
                        <th>Email</th>
                        <th>Lead (days)</th>
                        <th className="text-right">Price</th>
                        <th className="w-32">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewQuotes.map((quote) => (
                        <tr key={quote.supplier}>
                          <td className="text-[12px] font-medium">{quote.supplier}</td>
                          <td className="text-[12px] text-muted-foreground">{quote.email || "—"}</td>
                          <td className="tabular-nums text-[12px]">{quote.leadDays}d</td>
                          <td className="tabular-nums text-right text-[12px] font-medium">{formatPrice(quote.price)}{formatDeltaString(quote.price, row.price)}/{formatUnit(row.unit)}</td>

                          <td>
                            <Btn variant="teal" size="sm" onClick={() => handleApproveQuote(reviewDialogIdx, quote)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />Approve
                            </Btn>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-800">
                  <strong>Note:</strong> Approving a quote updates the selected supplier, lead time, price, and master data.
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Btn variant="outline" size="sm" onClick={() => setReviewDialogIdx(null)}>Close</Btn>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const TREND_MONTHS = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];

type TrendSeries = { name: string; stroke: string; values: number[] };

function buildTrendSeries(row: ProcurementRow): TrendSeries[] {
  const cur = row.price;
  const base = row.basePrice ?? row.supplierQuote ?? cur;
  const lastQ = row.lastQuotedPrice ?? cur;
  const altCur = row.altQuote ?? +(cur * 1.02).toFixed(2);
  const altBase = +(altCur * (base / (cur || 1))).toFixed(2);

  // Deterministic per-row variance so the line is never flat
  const seed = row.masterRef ?? row.partName;
  function noise(index: number): number {
    let h = (index + 1) * 2654435761;
    for (let j = 0; j < seed.length; j++) {
      h = (((h ^ seed.charCodeAt(j)) * 2246822519) >>> 0);
    }
    return ((h / 0xffffffff) * 2 - 1); // [-1, 1]
  }

  function lerp(a: number, b: number, t: number) {
    return +(a + (b - a) * t).toFixed(2);
  }

  // Amplitude: ±5% of current price, minimum ±3
  const amp = Math.max(cur * 0.05, 3);

  // Primary series: realistic wave anchored at base (Dec) and cur (May)
  const primaryValues: number[] = [
    +(base + noise(0) * amp * 0.4).toFixed(2),
    +(lerp(base, cur, 0.2) + noise(1) * amp * 1.1).toFixed(2),
    +(lerp(base, cur, 0.4) + noise(2) * amp * 1.3).toFixed(2),
    +(lerp(base, cur, 0.6) + noise(3) * amp * 1.0).toFixed(2),
    +(lastQ + noise(4) * amp * 0.5).toFixed(2),
    cur,
  ];

  const result: TrendSeries[] = [
    { name: row.supplier, stroke: "var(--color-primary)", values: primaryValues },
  ];

  if (row.alt && row.alt !== "—") {
    const altAmp = Math.max(altCur * 0.05, 3);
    result.push({
      name: row.alt,
      stroke: "#f59e0b",
      values: [
        +(altBase + noise(5) * altAmp * 0.4).toFixed(2),
        +(lerp(altBase, altCur, 0.2) + noise(6) * altAmp * 1.0).toFixed(2),
        +(lerp(altBase, altCur, 0.4) + noise(7) * altAmp * 1.2).toFixed(2),
        +(lerp(altBase, altCur, 0.6) + noise(8) * altAmp * 0.9).toFixed(2),
        +(lerp(altBase, altCur, 0.85) + noise(9) * altAmp * 0.4).toFixed(2),
        altCur,
      ],
    });
  }
  return result;
}

function CostTrend({ row, unit }: { row: ProcurementRow | null; unit: string }) {
  if (!row) return null;

  const series = buildTrendSeries(row);
  const allVals = series.flatMap((s) => s.values);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const rangePad = (rawMax - rawMin) * 0.2 || rawMin * 0.05 || 2;
  const minVal = rawMin - rangePad;
  const maxVal = rawMax + rangePad;
  const range = maxVal - minVal;

  const W = 460, H = 120;
  const PL = 44, PR = 28, PT = 10, PB = 22;
  const cW = W - PL - PR;
  const cH = H - PT - PB;

  const xAt = (i: number) => PL + (i / (TREND_MONTHS.length - 1)) * cW;
  const yAt = (v: number) => PT + cH - ((v - minVal) / range) * cH;
  const yTicks = Array.from({ length: 5 }, (_, i) => minVal + (range * i) / 4);

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-50">
        {/* Gridlines + Y-axis labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PL} y1={yAt(tick)}
              x2={PL + cW} y2={yAt(tick)}
              stroke="currentColor" strokeOpacity="0.08" strokeWidth="1"
            />
            <text
              x={PL - 5} y={yAt(tick) + 3.5}
              textAnchor="end" fontSize="9"
              fill="currentColor" opacity="0.45"
            >
              ${tick.toFixed(0)}
            </text>
          </g>
        ))}

        {/* X-axis month labels */}
        {TREND_MONTHS.map((m, i) => (
          <text
            key={m} x={xAt(i)} y={H - 5}
            textAnchor="middle" fontSize="9"
            fill="currentColor" opacity="0.45"
          >
            {m}
          </text>
        ))}

        {/* Data series */}
        {series.map((s) => {
          const pts = s.values.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
          const lastIdx = s.values.length - 1;
          return (
            <g key={s.name}>
              <polyline
                points={pts}
                fill="none"
                stroke={s.stroke}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {s.values.map((v, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(v)} r="3" fill={s.stroke} />
              ))}
              {/* Price label on last dot */}
              <text
                x={xAt(lastIdx) + 6}
                y={yAt(s.values[lastIdx]) + 4}
                fontSize="9" fontWeight="600"
                fill={s.stroke}
              >
                ${s.values[lastIdx].toFixed(0)}/{formatUnit(unit)}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-5">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-5 rounded-full" style={{ background: s.stroke }} />
            <span className="text-[11px] text-muted-foreground">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="text-center text-[10px] text-muted-foreground">
        {row.spec} · prices in $/{formatUnit(unit)}
      </div>
    </div>
  );
}