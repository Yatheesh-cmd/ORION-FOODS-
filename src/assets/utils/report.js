import html2pdf from "html2pdf.js";

export const toDateInput = (v) => (v ? String(v).slice(0, 10) : "");

export const todayInput = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

export const prettyDate = (value) => {
  const v = toDateInput(value);
  if (!v) return "—";
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const sumMeals = (orders) =>
  orders.reduce(
    (t, o) => ({
      breakfast: t.breakfast + Number(o.breakfastCount || 0),
      lunch: t.lunch + Number(o.lunchCount || 0),
      dinner: t.dinner + Number(o.dinnerCount || 0),
      amount: t.amount + Number(o.totalCost || 0),
    }),
    { breakfast: 0, lunch: 0, dinner: 0, amount: 0 }
  );

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c])
  );

/* ================================================================
   REPORT CSS  (every rule is scoped to .report so it can safely
   live in the main page while the PDF is generated)
   ================================================================ */

const REPORT_CSS = `
  .report, .report * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .report {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #111827;
    background: #ffffff;
    width: 100%;
    padding: 6px 4px;
  }

  /* ---------- Header ---------- */
  .report .rp-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding-bottom: 12px;
    border-bottom: 3px solid #ea580c;
  }

  .report .rp-brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .report .rp-logo {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: #ea580c;
    color: #ffffff;
    font-size: 26px;
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .report .rp-name {
    font-size: 30px;
    font-weight: 800;
    letter-spacing: 4px;
    line-height: 1;
    color: #0b1b3f;
  }

  .report .rp-name span {
    color: #ea580c;
  }

  .report .rp-tag {
    margin-top: 7px;
    font-size: 11px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #6b7280;
  }

  .report .rp-meta {
    text-align: right;
    font-size: 11px;
    line-height: 1.6;
    color: #4b5563;
  }

  .report .rp-meta b {
    display: block;
    font-size: 13px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #0b1b3f;
  }

  .report .rp-rule {
    height: 1px;
    margin-top: 3px;
    background: #d1d5db;
  }

  /* ---------- Title ---------- */
  .report .rp-title {
    margin: 18px 0 14px;
  }

  .report h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.3;
    color: #111827;
  }

  .report .sub {
    margin: 4px 0 0;
    font-size: 13px;
    color: #4b5563;
  }

  /* ---------- Table (plain black lines) ---------- */
  .report table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    border: 1.5px solid #000000;
    font-size: 13px;
    background: #ffffff;
  }

  .report table th,
  .report table td {
    border: 1px solid #000000;
    padding: 9px 12px;
    text-align: left;
    vertical-align: middle;
    line-height: 1.45;
    overflow-wrap: break-word;
  }

  .report table thead th {
    background: #e5e7eb;
    color: #000000;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .report table tbody tr:nth-child(even) td {
    background: #f9fafb;
  }

  .report table tfoot td {
    background: #f3f4f6;
    font-weight: 700;
  }

  .report .c {
    text-align: center !important;
  }

  .report .sn {
    width: 46px;
    text-align: center;
    color: #374151;
  }

  .report .nw {
    white-space: nowrap;
  }

  .report .bold {
    font-weight: 700;
  }

  .report .empty {
    padding: 26px;
    text-align: center;
    color: #6b7280;
  }

  /* ---------- Footer ---------- */
  .report .rp-foot {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 16px;
    padding-top: 8px;
    border-top: 1px solid #d1d5db;
    font-size: 11px;
    color: #6b7280;
  }

  /* ---------- Page breaks ---------- */
  .report tr {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  .report thead {
    display: table-header-group;
  }

  .report tfoot {
    display: table-row-group;
  }
`;

/* ================================================================
   BUILD REPORT HTML
   ================================================================ */

export function buildReportHTML({
  title,
  subtitle = "",
  columns,
  rows,
  totals,
}) {
  const firstNum = columns.findIndex((c) => c.num);
  const labelSpan = 1 + (firstNum === -1 ? columns.length : firstNum); // +1 for "#"

  const head =
    `<th class="sn">#</th>` +
    columns
      .map((c) => `<th class="${c.num ? "c" : ""}">${esc(c.label)}</th>`)
      .join("");

  const cellClass = (c) =>
    [
      c.num ? "c" : "",
      /name/i.test(c.label) ? "bold" : "",
      /phone|date/i.test(c.label) ? "nw" : "",
    ]
      .filter(Boolean)
      .join(" ");

  const body = rows.length
    ? rows
        .map(
          (r, i) =>
            `<tr>
              <td class="sn">${i + 1}</td>
              ${columns
                .map((c) => `<td class="${cellClass(c)}">${esc(c.get(r))}</td>`)
                .join("")}
            </tr>`
        )
        .join("")
    : `<tr><td colspan="${columns.length + 1}" class="empty">No orders found</td></tr>`;

  const foot =
    totals && rows.length
      ? `<tfoot>
          <tr>
            <td colspan="${labelSpan}">${esc(totals[0] || "Total")}</td>
            ${columns
              .map((c, i) =>
                firstNum !== -1 && i >= firstNum
                  ? `<td class="c">${esc(totals[i])}</td>`
                  : ""
              )
              .join("")}
          </tr>
        </tfoot>`
      : "";

  return `
    <style>${REPORT_CSS}</style>

    <div class="report">

      <div class="rp-head">
        <div class="rp-brand">
          <div class="rp-logo">O</div>
          <div>
            <div class="rp-name">ORION <span>FOODS</span></div>
            <div class="rp-tag">Homely Food &middot; Healthy Food</div>
          </div>
        </div>
        <div class="rp-meta">
          <b>Orders Report</b>
          ${esc(new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }))}
        </div>
      </div>
      <div class="rp-rule"></div>

      <div class="rp-title">
        <h1>${esc(title)}</h1>
        ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ""}
      </div>

      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
        ${foot}
      </table>

      <div class="rp-foot">
        <span>Generated on ${esc(new Date().toLocaleString("en-IN"))}</span>
        <span>ORION Foods</span>
      </div>

    </div>
  `;
}

/* ================================================================
   PRINT REPORT
   ================================================================ */

export function printReport(html, title = "Report") {
  const iframe = document.createElement("iframe");

  iframe.style.cssText = `
    position: fixed;
    right: 0;
    bottom: 0;
    width: 0;
    height: 0;
    border: 0;
    visibility: hidden;
  `;

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win.document;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${esc(title)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `);
  doc.close();

  const cleanup = () => setTimeout(() => iframe.remove(), 500);

  win.onafterprint = cleanup;

  setTimeout(() => {
    win.focus();
    win.print();
    setTimeout(cleanup, 60000);
  }, 300);
}

/* ================================================================
   DOWNLOAD REPORT PDF
   ================================================================ */

const PDF_WIDTH = 1050; // px – report width used while building the PDF

const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => resolve()));

export async function downloadReportPDF(html, filename = "report.pdf") {
  // Render in the main page (styles included) so the PDF gets the real CSS.
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${PDF_WIDTH}px`,
    "background:#ffffff",
    "opacity:0",
    "pointer-events:none",
    "z-index:-1",
  ].join(";");
  holder.innerHTML = html;
  document.body.appendChild(holder);

  const prevX = window.scrollX;
  const prevY = window.scrollY;

  try {
    const reportEl = holder.querySelector(".report");
    if (!reportEl) throw new Error("Report element not found");

    reportEl.style.width = `${PDF_WIDTH}px`;

    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        /* ignore */
      }
    }
    await nextFrame();
    await nextFrame();

    const rect = reportEl.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) {
      throw new Error("Report has no size - HTML is empty");
    }

    // a scrolled page can make html2canvas capture a blank area
    window.scrollTo(0, 0);

    await html2pdf()
      .set({
        margin: 8,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          windowWidth: PDF_WIDTH + 50,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "landscape",
          compress: true,
        },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: ["tr", ".rp-head", ".rp-foot"],
        },
      })
      .from(reportEl)
      .save();
  } finally {
    holder.remove();
    window.scrollTo(prevX, prevY);
  }
}