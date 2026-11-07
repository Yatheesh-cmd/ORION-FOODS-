import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import {
  buildReportHTML,
  downloadReportPDF,
  printReport,
  prettyDate,
  sumMeals,
  toDateInput,
  todayInput,
} from "../assets/utils/report";

/* ---------- report helpers ---------- */
const buildCols = (showDate) => [
  ...(showDate ? [{ label: "Date", get: (o) => prettyDate(o.date) }] : []),
  { label: "Customer Name", get: (o) => o.customer?.name || "—" },
  { label: "Phone", get: (o) => o.customer?.phone || "—" },
  { label: "Address", get: (o) => o.customer?.address || "—" },
  { label: "Breakfast", num: true, get: (o) => o.breakfastCount || 0 },
  { label: "Lunch", num: true, get: (o) => o.lunchCount || 0 },
  { label: "Dinner", num: true, get: (o) => o.dinnerCount || 0 },
];

const buildTotals = (showDate, s) => [
  "Total",
  ...Array(showDate ? 3 : 2).fill(""),
  s.breakfast,
  s.lunch,
  s.dinner,
];

const makeReport = ({ title, subtitle, rows, showDate }) =>
  buildReportHTML({
    title,
    subtitle,
    columns: buildCols(showDate),
    rows,
    totals: buildTotals(showDate, sumMeals(rows)),
  });

const longDate = (value) => {
  const v = toDateInput(value);
  if (!v) return "";
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};

/* ---------- small UI ---------- */
const BTN = {
  primary: "bg-teal-700 text-white hover:bg-teal-800",
  dark: "bg-slate-800 text-white hover:bg-slate-900",
  light: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
};

function Btn({ variant = "primary", className = "", ...rest }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-base font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${BTN[variant]} ${className}`}
      {...rest}
    />
  );
}

function Stat({ label, value, tone = "bg-white border border-slate-200", text = "text-slate-900" }) {
  return (
    <div className={`rounded-2xl p-4 ${tone}`}>
      <p className="text-base opacity-80">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${text}`}>{value}</p>
    </div>
  );
}

function OrdersTable({ rows, showDate, emptyText }) {
  const s = sumMeals(rows);
  const th = "px-4 py-3 text-left text-sm font-semibold text-slate-500";
  const td = "px-4 py-3 text-base text-slate-700";
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {showDate && <th className={th}>Date</th>}
            <th className={th}>Customer Name</th>
            <th className={th}>Phone</th>
            <th className={th}>Address</th>
            <th className={`${th} text-right`}>Breakfast</th>
            <th className={`${th} text-right`}>Lunch</th>
            <th className={`${th} text-right`}>Dinner</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={showDate ? 7 : 6} className="px-4 py-10 text-center text-base text-slate-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((o) => (
              <tr key={o._id} className="hover:bg-slate-50/70">
                {showDate && <td className={`${td} whitespace-nowrap`}>{prettyDate(o.date)}</td>}
                <td className={`${td} font-medium text-slate-900`}>{o.customer?.name || "—"}</td>
                <td className={`${td} whitespace-nowrap`}>{o.customer?.phone || "—"}</td>
                <td className={td}>{o.customer?.address || "—"}</td>
                <td className={`${td} text-right tabular-nums`}>{o.breakfastCount || 0}</td>
                <td className={`${td} text-right tabular-nums`}>{o.lunchCount || 0}</td>
                <td className={`${td} text-right tabular-nums`}>{o.dinnerCount || 0}</td>
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot className="bg-teal-50">
            <tr>
              <td colSpan={showDate ? 4 : 3} className="px-4 py-3 text-base font-bold text-teal-900">
                Total
              </td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-teal-900">{s.breakfast}</td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-teal-900">{s.lunch}</td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-teal-900">{s.dinner}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/* ---------- Customers modal ---------- */
function CustomersModal({ open, onClose, customers, orders }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState("desc");

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setSearch("");
      setSortDir("desc");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const orderCount = useMemo(() => {
    const m = {};
    orders.forEach((o) => {
      const id = o.customer?._id;
      if (id) m[id] = (m[id] || 0) + 1;
    });
    return m;
  }, [orders]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter(
      (c) => !q || [c.name, c.customerId, c.phone].some((f) => String(f ?? "").toLowerCase().includes(q))
    );
  }, [customers, search]);

  const customerOrders = useMemo(() => {
    if (!selected) return [];
    const rows = orders.filter((o) => o.customer?._id === selected._id);
    rows.sort((a, b) => {
      const diff = toDateInput(a.date).localeCompare(toDateInput(b.date));
      return sortDir === "asc" ? diff : -diff;
    });
    return rows;
  }, [orders, selected, sortDir]);

  if (!open) return null;

  const reportTitle = selected ? `Orders – ${selected.name}` : "";
  const reportSub = selected ? `${selected.customerId} · ${customerOrders.length} orders` : "";
  const html = () => makeReport({ title: reportTitle, subtitle: reportSub, rows: customerOrders, showDate: true });

  const onPrint = () => printReport(html(), reportTitle);

  const onPDF = async () => {
    if (!selected) return;
    try {
      await downloadReportPDF(html(), `${selected.name.replace(/\s+/g, "_")}_orders.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      toast.error(err?.message || "Couldn't create the PDF");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-5xl sm:rounded-3xl"
      >
        <header className="flex items-center justify-between gap-4 bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 px-6 py-5 text-white">
          <div>
            <h2 className="text-xl font-semibold">{selected ? selected.name : "All customers"}</h2>
            <p className="text-base text-teal-100">
              {selected ? `${selected.customerId} · ${customerOrders.length} orders` : `${customers.length} customers`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl px-3 py-1.5 text-2xl leading-none text-teal-100 hover:bg-white/15 hover:text-white"
          >
            ×
          </button>
        </header>

        <div className="overflow-y-auto p-5 sm:p-6">
          {!selected ? (
            <>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, ID or phone"
                className="mb-4 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-base focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15 sm:w-80"
              />
              {list.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 py-12 text-center text-base text-slate-500">
                  No customers found.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200">
                  {list.map((c) => (
                    <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-teal-50 text-base font-semibold text-teal-800">
                          {(c.name || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-medium text-slate-900">{c.name || "Unknown"}</p>
                          <p className="text-sm text-slate-500">
                            {c.customerId} · {c.phone || "no phone"} · {orderCount[c._id] || 0} orders
                          </p>
                        </div>
                      </div>
                      <Btn variant="primary" className="!py-1.5 text-sm" onClick={() => setSelected(c)}>
                        View orders
                      </Btn>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Btn variant="light" className="!py-2" onClick={() => setSelected(null)}>
                  ← All customers
                </Btn>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={sortDir}
                    onChange={(e) => setSortDir(e.target.value)}
                    aria-label="Sort by date"
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15"
                  >
                    <option value="desc">Date: newest first</option>
                    <option value="asc">Date: oldest first</option>
                  </select>
                  <Btn variant="dark" onClick={onPrint} disabled={customerOrders.length === 0}>
                    Print
                  </Btn>
                  <Btn onClick={onPDF} disabled={customerOrders.length === 0}>
                    Download PDF
                  </Btn>
                </div>
              </div>
              <OrdersTable rows={customerOrders} showDate emptyText="This customer has no orders yet." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */
export default function StaffDashboard() {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayInput());
  const [showCustomers, setShowCustomers] = useState(false);

  useEffect(() => {
    (async () => {
      const [o, c] = await Promise.allSettled([API.get("/orders"), API.get("/customers")]);
      const orderList = o.status === "fulfilled" && Array.isArray(o.value.data) ? o.value.data : [];
      const customerList = c.status === "fulfilled" && Array.isArray(c.value.data) ? c.value.data : [];
      if (o.status === "rejected") toast.error("Couldn't load orders");

      // merge customers: full list (if allowed) + customers found in orders
      const map = new Map();
      orderList.forEach((x) => x.customer?._id && map.set(x.customer._id, x.customer));
      customerList.forEach((x) => map.set(x._id, { ...map.get(x._id), ...x }));

      setCustomers([...map.values()].sort((a, b) => String(a.name).localeCompare(String(b.name))));
      setOrders(orderList.map((x) => ({ ...x, customer: map.get(x.customer?._id) || x.customer })));
      setLoading(false);
    })();
  }, []);

  const dayOrders = useMemo(
    () =>
      orders
        .filter((o) => toDateInput(o.date) === date)
        .sort((a, b) => String(a.customer?.name).localeCompare(String(b.customer?.name))),
    [orders, date]
  );
  const totals = useMemo(() => sumMeals(dayOrders), [dayOrders]);

  const dayHtml = () =>
    makeReport({
      title: `Orders – ${longDate(date)}`,
      subtitle: `${dayOrders.length} orders`,
      rows: dayOrders,
      showDate: false,
    });

  const onPrint = () => printReport(dayHtml(), `Orders ${date}`);

  const onPDF = async () => {
    try {
      await downloadReportPDF(dayHtml(), `orders_${date}.pdf`);
    } catch (err) {
      console.error("PDF error:", err);
      toast.error(err?.message || "Couldn't create the PDF");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Staff dashboard</h1>
          <p className="mt-1 text-base text-slate-500">Pick a date to see that day's orders, or browse every customer.</p>
        </div>
        <Btn onClick={() => setShowCustomers(true)}>
          Customers
          <span className="rounded-full bg-white/20 px-2 text-sm tabular-nums">{customers.length}</span>
        </Btn>
      </header>

      {/* Date picker + actions */}
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <label htmlFor="staff-date" className="mb-1.5 block text-base font-medium text-slate-700">
            Select date
          </label>
          <input
            id="staff-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base font-medium text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15"
          />
          {date && <p className="mt-1.5 text-sm text-slate-500">{longDate(date)}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="dark" onClick={onPrint} disabled={dayOrders.length === 0}>
            Print
          </Btn>
          <Btn onClick={onPDF} disabled={dayOrders.length === 0}>
            Download PDF
          </Btn>
        </div>
      </section>

      {/* Totals for the date */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Orders" value={dayOrders.length} tone="bg-teal-800 text-white" text="text-white" />
        <Stat label="🌅 Breakfast" value={totals.breakfast} tone="bg-amber-50" />
        <Stat label="☀️ Lunch" value={totals.lunch} tone="bg-sky-50" />
        <Stat label="🌙 Dinner" value={totals.dinner} tone="bg-indigo-50" />
      </section>

      {/* Orders of the selected date */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white py-14 text-center text-base text-slate-500">Loading…</div>
      ) : (
        <OrdersTable rows={dayOrders} showDate={false} emptyText="No orders on this date." />
      )}

      <CustomersModal
        open={showCustomers}
        onClose={() => setShowCustomers(false)}
        customers={customers}
        orders={orders}
      />
    </div>
  );
}