"use client";
import { useState } from "react";

const color: Record<string, string> = { LIST: "#166534", SKIP: "#991b1b", MANUAL_REVIEW: "#854d0e" };

export function ScanTable({ analyses }: { analyses: any[] }) {
  const [filter, setFilter] = useState<string>("LIST");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const rows = analyses.filter((a) => filter === "ALL" || a.decision === filter);
  const selectable = rows.filter((a) => a.decision !== "SKIP" && !a.listing);

  const toggleAll = (on: boolean) => setSelected(on ? new Set(selectable.map((a) => a.id)) : new Set());
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
        {["LIST", "MANUAL_REVIEW", "SKIP", "ALL"].map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} style={{ padding: "4px 10px", border: "1px solid #cbd5e1", borderRadius: 6, background: filter === f ? "#1e293b" : "#fff", color: filter === f ? "#fff" : "#0f172a", cursor: "pointer" }}>
            {f} ({f === "ALL" ? analyses.length : analyses.filter((a) => a.decision === f).length})
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <button type="submit" disabled={selected.size === 0} style={{ padding: "6px 12px", border: 0, borderRadius: 6, background: "#1d4ed8", color: "#fff", cursor: "pointer", opacity: selected.size ? 1 : 0.5 }}>
          List {selected.size} selected on target
        </button>
      </div>
      {[...selected].map((id) => <input key={id} type="hidden" name="analysisId" value={id} />)}
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", fontSize: 13 }}>
        <thead><tr style={{ textAlign: "left", background: "#e2e8f0" }}>
          <th style={{ padding: 8 }}><input type="checkbox" onChange={(e) => toggleAll(e.target.checked)} checked={selectable.length > 0 && selected.size === selectable.length} /></th>
          <th>ASIN</th><th>Title</th><th>Src price</th><th>Target BB</th><th>Sale</th><th>Profit</th><th>Margin</th><th>Rank</th><th>Decision</th><th>Reasons</th>
        </tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid #e2e8f0", opacity: a.listing ? 0.6 : 1 }}>
              <td style={{ padding: 8 }}>{a.decision !== "SKIP" && !a.listing && <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />}{a.listing && <span title={a.listing.status}>✓</span>}</td>
              <td><a href={a.sourceProduct.url} target="_blank">{a.sourceProduct.asin}</a></td>
              <td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.sourceProduct.title}</td>
              <td>{a.sourceProduct.price.toFixed(2)}</td>
              <td>{a.targetSnapshot?.buyBoxPrice?.toFixed?.(2) ?? "-"}</td>
              <td>{a.salePrice?.toFixed(2) ?? "-"}</td>
              <td style={{ fontWeight: 600 }}>{a.profit?.toFixed(2) ?? "-"}</td>
              <td>{a.marginPercent != null ? `${a.marginPercent}%` : "-"}</td>
              <td>{a.targetSnapshot?.salesRank ?? "-"}</td>
              <td style={{ color: color[a.decision], fontWeight: 600 }}>{a.decision}</td>
              <td style={{ fontSize: 12, color: "#475569", maxWidth: 260 }}>{a.reasons.join("; ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
