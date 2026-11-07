const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));

const PALETTE = {
  breakfast: { bg: "#fef3c7", fg: "#b45309", bar: "#f59e0b" },
  lunch: { bg: "#ffedd5", fg: "#c2410c", bar: "#f97316" },
  dinner: { bg: "#e0e7ff", fg: "#4338ca", bar: "#6366f1" },
};
const FALLBACK = [
  { bg: "#dbeafe", fg: "#1d4ed8", bar: "#3b82f6" },
  { bg: "#dcfce7", fg: "#15803d", bar: "#22c55e" },
  { bg: "#fce7f3", fg: "#be185d", bar: "#ec4899" },
];
const tone = (label, i) =>
  PALETTE[String(label).trim().toLowerCase()] || FALLBACK[i % FALLBACK.length];

const CSS = `
.orion-report, .orion-report * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.orion-report { font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #fff; font-size: 12px; line-height: 1.45; width: 100%; }

.orion-report .or-header { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 18px 22px; background: linear-gradient(135deg, #0b1b3f 0%, #14306b 100%); color: #fff; border-radius: 14px 14px 0 0; }
.orion-report .or-brand { display: flex; align-items: center; gap: 14px; }
.orion-report .or-logo { width: 48px; height: 48px; border-radius: 14px; background: linear-gradient(135deg, #fb923c, #f97316); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: #fff; overflow: hidden; }
.orion-report .or-logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
.orion-report .or-name { font-size: 26px; font-weight: 800; letter-spacing: 3px; line-height: 1; }
.orion-report .or-name span { color: #fb923c; }
.orion-report .or-tag { margin-top: 6px; font-size: 10.5px; letter-spacing: 0.8px; color: #bfdbfe; }
.orion-report .or-doc { text-align: right; }
.orion-report .or-doc-label { display: inline-block; padding: 5px 14px; border-radius: 999px; background: rgba(249,115,22,0.18); border: 1px solid rgba(251,146,60,0.55); color: #fdba74; font-size: 10.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
.orion-report .or-doc-date { margin-top: 8px; font-size: 10.5px; color: #cbd5e1; }
.orion-report .or-accent { height: 5px; background: linear-gradient(90deg, #f97316, #fbbf24, #3b82f6); border-radius: 0 0 6px 6px; }

.orion-report .or-title-row { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; margin: 22px 0 16px; }
.orion-report .or-title-row h1 { margin: 0; font-size: 22px; font-weight: 800; color: #0b1b3f; }
.orion-report .or-title-row p { margin: 4px 0 0; font-size: 12.5px; color: #64748b; }
.orion-report .or-count { padding: 6px 14px; border-radius: 999px; background: #fff7ed; border: 1px solid #fed7aa; color: #c2410c; font-size: 11.5px; font-weight: 700; white-space: nowrap; }

.orion-report .or-cards { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
.orion-report .or-card { flex: 1 1 120px; min-width: 110px; background: #fff; border: 1px solid #e2e8f0; border-left-width: 5px; border-radius: 10px; padding: 10px 14px; page-break-inside: avoid; }
.orion-report .or-card-label { font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #64748b; }
.orion-report .or-card-value { margin-top: 2px; font-size: 24px; font-weight: 800; line-height: 1.1; color: #0b1b3f; }
.orion-report .or-card.dark { background: #0b1b3f; border-color: #0b1b3f; }
.orion-report .or-card.dark .or-card-label { color: #93c5fd; }
.orion-report .or-card.dark .or-card-value { color: #fff; }
.orion-report .or-card.accent { background: linear-gradient(135deg, #fb923c, #f97316); border-color: #ea580c; }
.orion-report .or-card.accent .or-card-label { color: #ffedd5; }
.orion-report .or-card.accent .or-card-value { color: #fff; }

.orion-report .or-table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; }
.orion-report .or-table thead { display: table-header-group; }
.orion-report .or-table tfoot { display: table-row-group; }
.orion-report .or-table tr { page-break-inside: avoid; }
.orion-report .or-table th { background: #0b1b3f; color: #fff; padding: 10px; text-align: left; font-size: 10.5px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; }
.orion-report .or-table th.c, .orion-report .or-table td.c { text-align: center; }
.orion-report .or-table td { padding: 9px 10px; border-bottom: 1px solid #eef2f7; vertical-align: middle; color: #334155; }
.orion-report .or-table tbody tr:nth-child(even) td { background: #f8fafc; }
.orion-report .or-table td.sn { width: 34px; color: #94a3b8; font-weight: 600; }
.orion-report .or-table td.strong { color: #0f172a; font-weight: 700; }
.orion-report .or-table td.nowrap { white-space: nowrap; }
.orion-report .or-table td.empty { padding: 28px; text-align: center; color: #94a3b8; }
.orion-report .or-pill { display: inline-block; min-width: 32px; padding: 3px 10px; border-radius: 999px; font-weight: 700; text-align: center; }
.orion-report .or-zero { color: #cbd5e1; font-weight: 600; }
.orion-report .or-table tfoot td { background: #fff7ed; border-top: 2px solid #f97316; border-bottom: 0; padding: 11px 10px; color: #9a3412; font-size: 13px; font-weight: 800; }

.orion-report .or-sign { display: flex; gap: 48px; margin-top: 38px; page-break-inside: avoid; }
.orion-report .or-sign div { flex: 1; padding-top: 6px; border-top: 1px solid #94a3b8; text-align: center; font-size: 10.5px; color: #64748b; }
.orion-report .or-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: 18px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #94a3b8; page-break-inside: avoid; }

@page { margin: 12mm; }
`;

export function buildReportHTML({
  title = "Report",
  subtitle = "",
  columns = [],
  rows = [],
  totals = [],
  logo = "", // optional: image URL or data: URI to replace the "O" emblem
}) {
  const now = new Date();
  const generated = now.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const numIdx = columns.map((c, i) => (c.num ? i : -1)).filter((i) => i >= 0);
  const firstNum = numIdx.length ? numIdx[0] : columns.length;
  const toNum = (v) => Number(v) || 0;
  const mealsTotal = numIdx.reduce((s, i) => s + toNum(totals[i]), 0);

  /* summary cards */
  const cards = [
    `<div class="or-card dark" style="border-left-color:#f97316">
       <div class="or-card-label">Total Orders</div>
       <div class="or-card-value">${rows.length}</div>
     </div>`,
    ...numIdx.map((i, k) => {
      const t = tone(columns[i].label, k);
      return `<div class="or-card" style="border-left-color:${t.bar}">
        <div class="or-card-label">${esc(columns[i].label)}</div>
        <div class="or-card-value">${esc(totals[i] ?? 0)}</div>
      </div>`;
    }),
    numIdx.length
      ? `<div class="or-card accent">
          <div class="or-card-label">Total Meals</div>
          <div class="or-card-value">${mealsTotal}</div>
        </div>`
      : "",
  ].join("");

  /* table head */
  const head =
    `<th>#</th>` +
    columns
      .map((c) => `<th${c.num ? ' class="c"' : ""}>${esc(c.label)}</th>`)
      .join("");

  /* table body */
  const body = rows.length
    ? rows
        .map((row, r) => {
          const cells = columns
            .map((c, i) => {
              const value = c.get ? c.get(row) : "";
              if (c.num) {
                const t = tone(c.label, numIdx.indexOf(i));
                const inner = toNum(value)
                  ? `<span class="or-pill" style="background:${t.bg};color:${t.fg}">${esc(value)}</span>`
                  : `<span class="or-zero">0</span>`;
                return `<td class="c">${inner}</td>`;
              }
              const cls = [
                /name/i.test(c.label) ? "strong" : "",
                /phone|date/i.test(c.label) ? "nowrap" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return `<td${cls ? ` class="${cls}"` : ""}>${esc(value)}</td>`;
            })
            .join("");
          return `<tr><td class="sn">${r + 1}</td>${cells}</tr>`;
        })
        .join("")
    : `<tr><td class="empty" colspan="${columns.length + 1}">No records found</td></tr>`;

  /* totals row */
  const foot = rows.length
    ? `<tfoot><tr>
        <td colspan="${1 + firstNum}">TOTAL</td>
        ${columns
          .map((c, i) => (i >= firstNum ? `<td class="c">${esc(totals[i] ?? "")}</td>` : ""))
          .join("")}
      </tr></tfoot>`
    : "";

  return `<style>${CSS}</style>
<div class="orion-report">
  <div class="or-header">
    <div class="or-brand">
      <div class="or-logo">${logo ? `<img src="${esc(logo)}" alt="Orion Foods" />` : "O"}</div>
      <div>
        <div class="or-name">ORION <span>FOODS</span></div>
        <div class="or-tag">Homely Food &middot; Healthy Food &middot; Restaurant &amp; Caterers</div>
      </div>
    </div>
    <div class="or-doc">
      <div class="or-doc-label">Orders Report</div>
      <div class="or-doc-date">Generated ${esc(generated)}</div>
    </div>
  </div>
  <div class="or-accent"></div>

  <div class="or-title-row">
    <div>
      <h1>${esc(title)}</h1>
      ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
    </div>
    <div class="or-count">${rows.length} ${rows.length === 1 ? "record" : "records"}</div>
  </div>

  <div class="or-cards">${cards}</div>

  <table class="or-table">
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
    ${foot}
  </table>

  <div class="or-sign">
    <div>Prepared by</div>
    <div>Checked by</div>
  </div>

  <div class="or-footer">
    <span>ORION FOODS &middot; Homely &amp; Healthy Food</span>
    <span>System-generated report &middot; &copy; ${now.getFullYear()} Orion Foods</span>
  </div>
</div>`;
}