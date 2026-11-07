import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import API from "../services/api";
import { buildReportHTML, downloadReportPDF, printReport, sumMeals, todayInput } from "../assets/utils/report";
import { hasLocation, mapsLink } from "../assets/utils/delivery";
import { LocationPanel } from "../components/DeliveryLocation";

const formatINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const longDate = (value) => {
  if (!value) return "";
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const normalizeStatus = (s) => (s === "confirmed" || s === "rejected" ? s : "pending");
const errMsg = (err) => err?.response?.data?.message || err?.message || "Something went wrong";
const includes = (query, ...fields) =>
  fields.some((f) => String(f ?? "").toLowerCase().includes(query));

const MEALS = [
  { key: "breakfastCount", label: "Breakfast", emoji: "🌅", on: "bg-amber-100 text-amber-900", dot: "bg-amber-400", ring: "ring-amber-400", card: "bg-amber-50", short: "B" },
  { key: "lunchCount", label: "Lunch", emoji: "☀️", on: "bg-sky-100 text-sky-900", dot: "bg-sky-400", ring: "ring-sky-400", card: "bg-sky-50", short: "L" },
  { key: "dinnerCount", label: "Dinner", emoji: "🌙", on: "bg-indigo-100 text-indigo-900", dot: "bg-indigo-400", ring: "ring-indigo-400", card: "bg-indigo-50", short: "D" },
];

const th = "px-4 py-3 text-left text-sm font-medium text-slate-500";
const td = "px-4 py-3 text-base text-slate-700";
const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15";

const ICONS = {
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  trash: <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" />,
  edit: (<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>),
  image: (<><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" /></>),
  refresh: <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8M3 21v-5h5M21 3v5h-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  alert: (<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>),
  external: <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
  calendar: (<><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>),
  undo: <path d="M3 7v6h6M3 13a9 9 0 1 0 3-7.7" />,
  inbox: (<><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z" /></>),
  printer: (<><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></>),
  download: <path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16" />,
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>),
  arrow: <path d="M5 12h14M13 5l7 7-7 7" />,
  pin: (<><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" /><circle cx="12" cy="10" r="2.5" /></>),
};

function Icon({ name, className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

function Spinner({ className = "h-4 w-4" }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const VARIANTS = {
  primary: "bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-600",
  secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400",
  danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
  dangerSoft: "bg-white text-red-700 border border-red-200 hover:bg-red-50 focus-visible:ring-red-400",
};
const BTN_SIZES = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-base" };

function Button({ variant = "primary", size = "md", loading = false, disabled = false, className = "", children, ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      {...rest}
    >
      {loading && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function IconButton({ icon, label, tone = "default", ...rest }) {
  const tones = {
    default: "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
    danger: "text-slate-500 hover:bg-red-50 hover:text-red-600",
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent ${tones[tone]}`}
      {...rest}
    >
      <Icon name={icon} />
    </button>
  );
}

const STATUS = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  confirmed: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-800 ring-red-200", dot: "bg-red-500" },
};

function StatusBadge({ status }) {
  const s = STATUS[normalizeStatus(status)];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function MealChips({ order }) {
  return (
    <div className="inline-flex items-center gap-1">
      {MEALS.map((m) => {
        const n = Number(order[m.key] || 0);
        return (
          <span
            key={m.key}
            title={`${m.label}: ${n}`}
            className={`inline-flex min-w-[3.25rem] items-center justify-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium tabular-nums ${n > 0 ? m.on : "bg-slate-100 text-slate-400"}`}
          >
            <span className="opacity-70">{m.short}</span>
            {n}
          </span>
        );
      })}
    </div>
  );
}

function Avatar({ name = "?" }) {
  const initials = String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-teal-800">
      {initials || "?"}
    </span>
  );
}

function TableShell({ children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200">{children}</table>
    </div>
  );
}

function TableSkeleton({ cols = 5, rows = 5 }) {
  return (
    <TableShell>
      <tbody className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((__, c) => (
              <td key={c} className="px-4 py-4">
                <div className="h-4 animate-pulse rounded bg-slate-100" style={{ width: `${50 + ((r + c) % 4) * 12}%` }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </TableShell>
  );
}

function EmptyState({ title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon name="inbox" className="h-5 w-5" />
      </span>
      <p className="text-base font-semibold text-slate-800">{title}</p>
      {text && <p className="mt-1 max-w-xs text-base text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="relative block w-full sm:w-72">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
      />
    </label>
  );
}

function StatCard({ label, value, hint, onClick, highlight = false, tone = "border border-slate-200 bg-white" }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2 ${
        highlight ? "bg-teal-800 text-white hover:bg-teal-900" : tone
      }`}
    >
      <p className={`text-base ${highlight ? "text-teal-100" : "text-slate-500"}`}>{label}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${highlight ? "text-white" : "text-slate-900"}`}>{value}</p>
      {hint && <p className={`mt-1 text-sm ${highlight ? "text-teal-200" : "text-slate-500"}`}>{hint}</p>}
    </Tag>
  );
}

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const WIDTHS = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-5xl" };

function Modal({ open, onClose, title, description, header, children, footer, size = "md", busy = false }) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef(null);
  const returnFocus = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement;
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => {
      setMounted(false);
      returnFocus.current?.focus?.();
    }, 220);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mounted]);

  useEffect(() => {
    if (visible) panelRef.current?.focus();
  }, [visible]);

  const handleKeyDown = (e) => {
    if (e.key === "Escape" && !busy) {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panelRef.current) return;
    const items = panelRef.current.querySelectorAll(FOCUSABLE);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" onKeyDown={handleKeyDown}>
      <div
        aria-hidden="true"
        onClick={() => !busy && onClose()}
        className={`absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl outline-none transition duration-200 motion-reduce:transition-none sm:rounded-3xl ${WIDTHS[size]} ${
          visible ? "translate-y-0 opacity-100 sm:scale-100" : "translate-y-6 opacity-0 sm:translate-y-0 sm:scale-95"
        }`}
      >
        {header ? (
          <div aria-label={title} role="group">{header(onClose, busy)}</div>
        ) : (
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">{title}</h2>
              {description && <p className="mt-0.5 text-base text-slate-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="-mr-1 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50"
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </header>
        )}

        <div className="overflow-y-auto">{children}</div>

        {footer && (
          <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-end">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
}

function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", loading = false, onConfirm, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      busy={loading}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="flex gap-3 px-5 py-5">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-red-50 text-red-600">
          <Icon name="alert" className="h-5 w-5" />
        </span>
        <p className="pt-1 text-base leading-relaxed text-slate-600">{message}</p>
      </div>
    </Modal>
  );
}

function DatesModal({ open, dates, counts, selected, onSelect, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dates with orders"
      description="Select a date to see its orders."
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      <ul className="divide-y divide-slate-100">
        {dates.map((d) => (
          <li key={d}>
            <button
              type="button"
              onClick={() => onSelect(d)}
              aria-current={selected === d}
              className={`group flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-teal-50/60 focus:outline-none focus-visible:bg-teal-50 ${
                selected === d ? "bg-teal-50" : ""
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected === d ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <Icon name="calendar" className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-base font-medium text-slate-900">{formatDate(d)}</span>
                  <span className="block text-sm text-slate-500">{longDate(d)}</span>
                </span>
              </span>
              <span className="flex items-center gap-3">
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium tabular-nums text-slate-600">
                  {counts[d] || 0} {(counts[d] || 0) === 1 ? "order" : "orders"}
                </span>
                <Icon name="arrow" className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-teal-700" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

function PaymentReviewModal({ open, payment, onClose, onDecision }) {
  const [busy, setBusy] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [payment?._id]);

  const status = normalizeStatus(payment?.status);

  const decide = async (next) => {
    setBusy(next);
    const ok = await onDecision(payment._id, next);
    setBusy(null);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={Boolean(busy)}
      size="lg"
      title="Review payment"
      description="Check the amount against the screenshot before you decide."
      footer={
        payment && (
          <>
            <Button variant="secondary" onClick={onClose} disabled={Boolean(busy)}>Close</Button>
            <Button variant="dangerSoft" onClick={() => decide("rejected")} loading={busy === "rejected"} disabled={Boolean(busy) || status === "rejected"}>
              <Icon name="x" />
              Reject
            </Button>
            <Button onClick={() => decide("confirmed")} loading={busy === "confirmed"} disabled={Boolean(busy) || status === "confirmed"}>
              <Icon name="check" />
              Confirm payment
            </Button>
          </>
        )
      }
    >
      {payment && (
        <div className="space-y-5 px-5 py-5">
          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
            {[
              ["Customer", payment.customer?.name || "—"],
              ["Customer ID", payment.customerId],
              ["Amount", formatINR(payment.amount)],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="mt-0.5 text-base font-medium text-slate-900">{value}</dd>
              </div>
            ))}
            <div>
              <dt className="text-sm text-slate-500">Status</dt>
              <dd className="mt-0.5"><StatusBadge status={payment.status} /></dd>
            </div>
          </dl>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-base font-medium text-slate-800">Payment screenshot</h3>
              {payment.screenshot && (
                <a href={payment.screenshot} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline">
                  Open full size
                  <Icon name="external" className="h-3.5 w-3.5" />
                </a>
              )}
            </div>

            {payment.screenshot && !imgFailed ? (
              <div className="flex max-h-96 justify-center overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={payment.screenshot}
                  alt={`Payment proof from ${payment.customer?.name || payment.customerId}`}
                  onError={() => setImgFailed(true)}
                  className="max-h-[22rem] rounded-lg object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center">
                <Icon name="image" className="mb-2 h-6 w-6 text-slate-400" />
                <p className="text-base font-medium text-slate-700">
                  {payment.screenshot ? "The screenshot couldn't be previewed" : "No screenshot attached"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {payment.screenshot ? "Use “Open full size” to view it in a new tab." : "Ask the customer to upload proof before confirming."}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

const toDateInput = (v) => (v ? String(v).slice(0, 10) : "");
const clampCount = (n) => Math.max(0, Math.min(999, Number.isFinite(n) ? n : 0));
const formFromOrder = (o) => ({
  date: toDateInput(o?.date),
  breakfastCount: Number(o?.breakfastCount || 0),
  lunchCount: Number(o?.lunchCount || 0),
  dinnerCount: Number(o?.dinnerCount || 0),
});

function MealCard({ meal, value, original, onChange, showWas = true }) {
  const changed = value !== original;
  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl p-4 text-center transition-all ${meal.card} ${
        changed ? `ring-2 ${meal.ring} shadow-sm` : "ring-1 ring-slate-200"
      }`}
    >
      <span className="text-4xl leading-none" aria-hidden="true">{meal.emoji}</span>
      <label htmlFor={meal.key} className="mt-2 text-base font-semibold text-slate-800">{meal.label}</label>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label={`Decrease ${meal.label}`}
          onClick={() => onChange(clampCount(value - 1))}
          disabled={value <= 0}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-40"
        >
          <Icon name="minus" />
        </button>
        <input
          id={meal.key}
          type="number"
          inputMode="numeric"
          min="0"
          max="999"
          value={value}
          onChange={(e) => onChange(clampCount(parseInt(e.target.value, 10)))}
          className="w-14 rounded-lg bg-transparent py-1 text-center text-3xl font-bold tabular-nums text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label={`Increase ${meal.label}`}
          onClick={() => onChange(clampCount(value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-white shadow-sm transition hover:bg-teal-800 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
        >
          <Icon name="plus" />
        </button>
      </div>

      {showWas && (
        <p className={`mt-2 h-4 text-sm ${changed ? "font-medium text-slate-600" : "text-transparent"}`}>
          was {original}
        </p>
      )}
    </div>
  );
}

function EditOrderModal({ open, order, onClose, onSave }) {
  const [form, setForm] = useState(formFromOrder(order));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (order) setForm(formFromOrder(order));
  }, [order]);

  const initial = useMemo(() => formFromOrder(order), [order]);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const total = form.breakfastCount + form.lunchCount + form.dinnerCount;
  const initialTotal = initial.breakfastCount + initial.lunchCount + initial.dinnerCount;
  const diff = total - initialTotal;
  const valid = Boolean(form.date);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || !dirty) return;
    setSaving(true);
    const ok = await onSave(order._id, form);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="lg"
      title="Edit order"
      header={(close, busy) => (
        <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 px-6 pb-6 pt-5 text-white">
          <div className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-12 right-16 h-28 w-28 rounded-full bg-white/5" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                <Icon name="edit" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold leading-tight">Edit order</h2>
                <p className="text-base text-teal-100">Update the date and meal counts</p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              disabled={busy}
              aria-label="Close"
              className="rounded-xl p-1.5 text-teal-100 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
            >
              <Icon name="x" className="h-5 w-5" />
            </button>
          </div>
          {order && (
            <div className="relative mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">Service {order.serviceId}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 ring-1 ring-white/20">Customer {order.customerId}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 tabular-nums ring-1 ring-white/20">Total {formatINR(order.totalCost)}</span>
            </div>
          )}
        </div>
      )}
      footer={
        <>
          {dirty && !saving && (
            <button
              type="button"
              onClick={() => setForm(initial)}
              className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-base text-slate-500 transition-colors hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <Icon name="undo" />
              Reset changes
            </button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="edit-order-form" loading={saving} disabled={!valid || !dirty}>
            <Icon name="check" />
            Save changes
          </Button>
        </>
      }
    >
      <form id="edit-order-form" onSubmit={submit} className="space-y-6 px-6 py-6">
        <div>
          <label htmlFor="order-date" className="mb-2 block text-base font-medium text-slate-700">Service date</label>
          <div className="relative">
            <Icon name="calendar" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="order-date"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-base font-medium text-slate-900 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15"
            />
          </div>
          {form.date && <p className="mt-1.5 text-sm text-slate-500">{longDate(form.date)}</p>}
        </div>

        <div>
          <p className="mb-2 text-base font-medium text-slate-700">Meals per day</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {MEALS.map((m) => (
              <MealCard
                key={m.key}
                meal={m}
                value={form[m.key]}
                original={initial[m.key]}
                onChange={(v) => setForm((f) => ({ ...f, [m.key]: v }))}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
          <div>
            <p className="text-sm text-slate-500">Total meals</p>
            <p className="text-3xl font-bold tabular-nums text-slate-900">{total}</p>
          </div>
          {diff !== 0 ? (
            <span className={`rounded-full px-3 py-1 text-sm font-semibold tabular-nums ${diff > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
              {diff > 0 ? `+${diff}` : diff} from before
            </span>
          ) : (
            <span className="text-sm text-slate-400">{dirty ? "Date changed" : "No changes yet"}</span>
          )}
        </div>
      </form>
    </Modal>
  );
}

function InfoTile({ label, value, tone = "bg-slate-50 text-slate-900", labelTone = "text-slate-500" }) {
  return (
    <div className={`rounded-xl p-3.5 ${tone}`}>
      <p className={`text-sm ${labelTone}`}>{label}</p>
      <p className="mt-0.5 truncate text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
    </div>
  );
}

function CustomerDetailsModal({ open, customer, orders, payments, onClose, onSaveLocation }) {
  const [section, setSection] = useState("orders");

  useEffect(() => {
    if (open) setSection("orders");
  }, [open, customer?._id]);

  const myOrders = useMemo(() => {
    if (!customer) return [];
    return orders
      .filter((o) => o.customerId === customer.customerId)
      .sort((a, b) => toDateInput(b.date).localeCompare(toDateInput(a.date)));
  }, [orders, customer]);

  const myPayments = useMemo(() => {
    if (!customer) return [];
    return payments
      .filter((p) => p.customerId === customer.customerId)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  }, [payments, customer]);

  const meals = useMemo(() => sumMeals(myOrders), [myOrders]);
  const orderValue = myOrders.reduce((t, o) => t + Number(o.totalCost || 0), 0);
  const pendingAmount = myPayments
    .filter((p) => normalizeStatus(p.status) === "pending")
    .reduce((t, p) => t + Number(p.amount || 0), 0);
  const balance = Number(customer?.currentBalance || 0);
  const negative = balance < 0;

  const sections = [
    { id: "orders", label: "Orders", count: myOrders.length },
    { id: "payments", label: "Payments", count: myPayments.length },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Customer details"
      header={(close) => (
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 px-5 py-5 text-white sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/15 text-lg font-semibold ring-1 ring-white/25">
              {String(customer?.name || "?").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("") || "?"}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold leading-tight">{customer?.name || "Customer"}</h2>
              <p className="text-base text-teal-100">{customer?.customerId}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-xl p-1.5 text-teal-100 transition-colors hover:bg-white/15 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Icon name="x" className="h-5 w-5" />
          </button>
        </div>
      )}
      footer={<Button variant="secondary" onClick={onClose}>Close</Button>}
    >
      {customer && (
        <div className="space-y-6 px-5 py-5 sm:px-6">
          <section aria-label="Contact details">
            <h3 className="mb-2 text-base font-semibold text-slate-800">Contact</h3>
            <dl className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Email", customer.email || "—"],
                ["Phone", customer.phone || "—"],
                ["Address", customer.address || "—"],
                ["Pincode", customer.pincode || "—"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className="mt-0.5 break-words text-base font-medium text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-label="Delivery location">
            <h3 className="mb-2 text-base font-semibold text-slate-800">Delivery location</h3>
            <LocationPanel
              location={hasLocation(customer.location) ? customer.location : null}
              allowDetect={false}
              onSave={(payload) => onSaveLocation(customer._id, payload)}
            />
          </section>

          <section aria-label="Balance details">
            <h3 className="mb-2 text-base font-semibold text-slate-800">Balance details</h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <InfoTile
                label="Current balance"
                value={formatINR(balance)}
                tone={negative ? "bg-red-600 text-white" : "bg-teal-800 text-white"}
                labelTone={negative ? "text-red-100" : "text-teal-100"}
              />
              <InfoTile label="Opening balance" value={formatINR(customer.openingBalance)} />
              <InfoTile label="Payments received" value={formatINR(customer.totalPaymentsReceived)} tone="bg-emerald-50 text-emerald-900" labelTone="text-emerald-700" />
              <InfoTile label="Orders value" value={formatINR(orderValue)} />
              <InfoTile label="Total meals" value={customer.totalMeals ?? meals.breakfast + meals.lunch + meals.dinner} />
              <InfoTile label="Pending payments" value={formatINR(pendingAmount)} tone="bg-amber-50 text-amber-900" labelTone="text-amber-700" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <span className="rounded-md bg-amber-100 px-2.5 py-1 font-medium text-amber-900">🌅 Breakfast {meals.breakfast}</span>
              <span className="rounded-md bg-sky-100 px-2.5 py-1 font-medium text-sky-900">☀️ Lunch {meals.lunch}</span>
              <span className="rounded-md bg-indigo-100 px-2.5 py-1 font-medium text-indigo-900">🌙 Dinner {meals.dinner}</span>
            </div>
          </section>

          <section aria-label="History">
            <div role="tablist" aria-label="Customer history" className="mb-3 inline-flex rounded-xl bg-slate-100 p-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={section === s.id}
                  onClick={() => setSection(s.id)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-base font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    section === s.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {s.label}
                  <span className="rounded-full bg-slate-200/70 px-1.5 text-sm tabular-nums text-slate-600">{s.count}</span>
                </button>
              ))}
            </div>

            {section === "orders" &&
              (myOrders.length === 0 ? (
                <EmptyState title="No orders yet" text="This customer hasn't placed any orders." />
              ) : (
                <TableShell>
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Service</th>
                      <th className={th}>Date</th>
                      <th className={th}>Meals (B / L / D)</th>
                      <th className={`${th} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myOrders.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50/70">
                        <td className={`${td} font-medium text-slate-900`}>{o.serviceId}</td>
                        <td className={`${td} whitespace-nowrap`}>{formatDate(o.date)}</td>
                        <td className={td}><MealChips order={o} /></td>
                        <td className={`${td} text-right font-medium tabular-nums text-slate-900`}>{formatINR(o.totalCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-teal-50">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-base font-bold text-teal-900">Total</td>
                      <td className="px-4 py-3 text-base font-bold tabular-nums text-teal-900">
                        B {meals.breakfast} · L {meals.lunch} · D {meals.dinner}
                      </td>
                      <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-teal-900">{formatINR(orderValue)}</td>
                    </tr>
                  </tfoot>
                </TableShell>
              ))}

            {section === "payments" &&
              (myPayments.length === 0 ? (
                <EmptyState title="No payments yet" text="This customer hasn't made any payments." />
              ) : (
                <TableShell>
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Date</th>
                      <th className={th}>Amount</th>
                      <th className={th}>Proof</th>
                      <th className={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {myPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/70">
                        <td className={`${td} whitespace-nowrap`}>{formatDate(p.createdAt)}</td>
                        <td className={`${td} font-medium tabular-nums text-slate-900`}>{formatINR(p.amount)}</td>
                        <td className={td}>
                          {p.screenshot ? (
                            <a href={p.screenshot} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-teal-700 hover:underline">
                              <Icon name="image" />
                              Open
                            </a>
                          ) : (
                            <span className="text-slate-400">Not attached</span>
                          )}
                        </td>
                        <td className={td}><StatusBadge status={p.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              ))}
          </section>
        </div>
      )}
    </Modal>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-base font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function CustomerSelect({ id, customers, value, onChange }) {
  return (
    <select id={id} required value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
      <option value="">Select a customer…</option>
      {customers.map((c) => (
        <option key={c._id} value={c._id}>
          {c.name} ({c.customerId})
        </option>
      ))}
    </select>
  );
}

const EMPTY_CUSTOMER = { name: "", phone: "", email: "", address: "", pincode: "", password: "" };

function AddCustomerModal({ open, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY_CUSTOMER);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(EMPTY_CUSTOMER);
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.pincode.trim())) return toast.error("Enter a valid 6-digit pincode");
    setSaving(true);
    const ok = await onSave({ ...form, pincode: form.pincode.trim() });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      title="Add customer"
      description="Creates a customer account with a login."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="add-customer-form" loading={saving}>
            <Icon name="plus" />
            Add customer
          </Button>
        </>
      }
    >
      <form id="add-customer-form" onSubmit={submit} className="space-y-4 px-5 py-5">
        <Field label="Full name" htmlFor="ac-name">
          <input id="ac-name" required value={form.name} onChange={set("name")} className={inputCls} placeholder="John Doe" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="ac-phone">
            <input id="ac-phone" type="tel" required value={form.phone} onChange={set("phone")} className={inputCls} placeholder="9876543210" />
          </Field>
          <Field label="Email" htmlFor="ac-email">
            <input id="ac-email" type="email" required value={form.email} onChange={set("email")} className={inputCls} placeholder="john@example.com" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Field label="Address" htmlFor="ac-address">
              <input id="ac-address" required value={form.address} onChange={set("address")} className={inputCls} placeholder="123 Main St, City" />
            </Field>
          </div>
          <Field label="Pincode" htmlFor="ac-pincode">
            <input
              id="ac-pincode"
              required
              inputMode="numeric"
              maxLength={6}
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              className={inputCls}
              placeholder="683565"
            />
          </Field>
        </div>
        <Field label="Password" htmlFor="ac-pass">
          <input id="ac-pass" type="password" required minLength={6} value={form.password} onChange={set("password")} className={inputCls} placeholder="At least 6 characters" />
        </Field>
      </form>
    </Modal>
  );
}

function AddOrderModal({ open, onClose, onSave, customers }) {
  const blank = () => ({ customer: "", date: todayInput(), breakfastCount: 0, lunchCount: 0, dinnerCount: 0 });
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(blank());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = form.breakfastCount + form.lunchCount + form.dinnerCount;

  const submit = async (e) => {
    e.preventDefault();
    if (total === 0) return toast.error("Add at least one meal");
    setSaving(true);
    const ok = await onSave(form);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      size="lg"
      title="Add order"
      description="Place a meal order on behalf of a customer."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="add-order-form" loading={saving}>
            <Icon name="plus" />
            Add order
          </Button>
        </>
      }
    >
      <form id="add-order-form" onSubmit={submit} className="space-y-5 px-5 py-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Customer" htmlFor="ao-customer">
            <CustomerSelect id="ao-customer" customers={customers} value={form.customer} onChange={(v) => setForm((f) => ({ ...f, customer: v }))} />
          </Field>
          <Field label="Service date" htmlFor="ao-date">
            <input id="ao-date" type="date" required value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className={inputCls} />
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {MEALS.map((m) => (
            <MealCard
              key={m.key}
              meal={m}
              value={form[m.key]}
              original={0}
              showWas={false}
              onChange={(v) => setForm((f) => ({ ...f, [m.key]: v }))}
            />
          ))}
        </div>
        <p className="text-right text-base text-slate-500">
          Total meals: <span className="font-semibold text-slate-900">{total}</span>
        </p>
      </form>
    </Modal>
  );
}

function AddPaymentModal({ open, onClose, onSave, customers }) {
  const [form, setForm] = useState({ customer: "", amount: "" });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ customer: "", amount: "" });
      setFile(null);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(form.amount) > 0)) return toast.error("Enter a valid amount");
    setSaving(true);
    const ok = await onSave({ ...form, file });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={saving}
      title="Add payment"
      description="Record a payment received. It is saved as confirmed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" form="add-payment-form" loading={saving}>
            <Icon name="plus" />
            Add payment
          </Button>
        </>
      }
    >
      <form id="add-payment-form" onSubmit={submit} className="space-y-4 px-5 py-5">
        <Field label="Customer" htmlFor="ap-customer">
          <CustomerSelect id="ap-customer" customers={customers} value={form.customer} onChange={(v) => setForm((f) => ({ ...f, customer: v }))} />
        </Field>
        <Field label="Amount (₹)" htmlFor="ap-amount">
          <input id="ap-amount" type="number" min="1" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} className={inputCls} placeholder="e.g. 500" />
        </Field>
        <Field label="Screenshot (optional)" htmlFor="ap-file">
          <input
            id="ap-file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="w-full text-base text-slate-500 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-base file:font-medium file:text-teal-800 hover:file:bg-teal-100"
          />
        </Field>
      </form>
    </Modal>
  );
}

const ENDPOINTS = { payments: "/payments", orders: "/orders", customers: "/customers" };

const TABS = [
  { id: "payments", label: "Payments", search: "Search by customer or ID" },
  { id: "orders", label: "Orders", search: "Search by service, customer or date" },
  { id: "customers", label: "Customers", search: "Search by name, email or phone" },
  { id: "daily", label: "Total orders", search: "Search by customer or service" },
];

const ADD_BUTTONS = {
  payments: { label: "Add payment", kind: "addPayment" },
  orders: { label: "Add order", kind: "addOrder" },
  customers: { label: "Add customer", kind: "addCustomer" },
};

const PAYMENT_FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "confirmed", label: "Confirmed" },
  { id: "rejected", label: "Rejected" },
];

export default function AdminDashboard() {
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState({ payments: true, orders: true, customers: true });

  const setters = { payments: setPayments, orders: setOrders, customers: setCustomers };

  const load = useCallback(async (key) => {
    setLoading((s) => ({ ...s, [key]: true }));
    try {
      const { data } = await API.get(ENDPOINTS[key]);
      setters[key](Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(`Couldn't load ${key}. ${errMsg(err)}`);
    } finally {
      setLoading((s) => ({ ...s, [key]: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = useCallback(() => Promise.all(Object.keys(ENDPOINTS).map(load)), [load]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const mutate = async (request, successMsg, reloadKeys) => {
    try {
      await request();
      toast.success(successMsg);
      await Promise.all(reloadKeys.map(load));
      return true;
    } catch (err) {
      toast.error(errMsg(err));
      return false;
    }
  };

  const setPaymentStatus = (id, status) =>
    mutate(() => API.put(`/payments/${id}`, { status }), `Payment ${status}`, ["payments", "customers"]);
  const updateOrder = (id, form) =>
    mutate(() => API.put(`/orders/${id}`, form), "Order updated", ["orders", "customers"]);
  const deleteOrder = (id) =>
    mutate(() => API.delete(`/orders/${id}`), "Order deleted", ["orders", "customers"]);

  const addCustomer = (form) =>
    mutate(() => API.post("/auth/register", { ...form, role: "customer" }), "Customer added", ["customers"]);
  const addOrder = (form) =>
    mutate(() => API.post("/orders", form), "Order added", ["orders", "customers"]);
  const saveCustomerLocation = (id, body) =>
    mutate(() => API.put(`/customers/${id}/location`, body), "Location updated", ["customers", "orders"]);
  const addPayment = ({ customer, amount, file }) => {
    const fd = new FormData();
    fd.append("customer", customer);
    fd.append("amount", amount);
    if (file) fd.append("screenshot", file);
    return mutate(
      () => API.post("/payments", fd, { headers: { "Content-Type": "multipart/form-data" } }),
      "Payment added",
      ["payments", "customers"]
    );
  };

  const [tab, setTab] = useState("payments");
  const [query, setQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [reportDate, setReportDate] = useState(todayInput());

  const [ui, setUi] = useState({ kind: null, item: null, open: false });
  const [deleting, setDeleting] = useState(false);
  const openModal = (kind, item) => setUi({ kind, item, open: true });
  const closeModal = () => setUi((s) => ({ ...s, open: false }));

  const customerMap = useMemo(() => {
    const m = {};
    customers.forEach((c) => {
      m[c.customerId] = c;
    });
    return m;
  }, [customers]);

  const nameOf = useCallback(
    (o) => customerMap[o.customerId]?.name || o.customer?.name || o.customerId,
    [customerMap]
  );

  const locationOf = useCallback(
    (o) => {
      const fresh = customerMap[o.customerId]?.location;
      if (hasLocation(fresh)) return fresh;
      return hasLocation(o.customer?.location) ? o.customer.location : null;
    },
    [customerMap]
  );

  const viewCustomer =
    ui.kind === "customer" && ui.item
      ? customers.find((c) => c._id === ui.item._id) || ui.item
      : null;

  const stats = useMemo(() => {
    const pending = payments.filter((p) => normalizeStatus(p.status) === "pending");
    const confirmed = payments.filter((p) => p.status === "confirmed");
    const sum = (rows) => rows.reduce((t, p) => t + Number(p.amount || 0), 0);
    const meals = orders.reduce(
      (t, o) => t + Number(o.breakfastCount || 0) + Number(o.lunchCount || 0) + Number(o.dinnerCount || 0),
      0
    );
    return {
      pendingCount: pending.length,
      pendingAmount: sum(pending),
      confirmedCount: confirmed.length,
      confirmedAmount: sum(confirmed),
      meals,
    };
  }, [payments, orders]);

  const q = query.trim().toLowerCase();

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (p) =>
          (paymentFilter === "all" || normalizeStatus(p.status) === paymentFilter) &&
          (!q || includes(q, p.customerId, p.customer?.name))
      ),
    [payments, paymentFilter, q]
  );
  const filteredOrders = useMemo(
    () => orders.filter((o) => !q || includes(q, o.serviceId, o.customerId, o.date, nameOf(o))),
    [orders, q, nameOf]
  );
  const filteredCustomers = useMemo(
    () => customers.filter((c) => !q || includes(q, c.customerId, c.name, c.email, c.phone)),
    [customers, q]
  );

  const orderDates = useMemo(
    () => [...new Set(orders.map((o) => toDateInput(o.date)).filter(Boolean))].sort().reverse(),
    [orders]
  );
  const dateCounts = useMemo(() => {
    const m = {};
    orders.forEach((o) => {
      const d = toDateInput(o.date);
      if (d) m[d] = (m[d] || 0) + 1;
    });
    return m;
  }, [orders]);
  const dayOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          toDateInput(o.date) === reportDate && (!q || includes(q, o.serviceId, o.customerId, nameOf(o)))
      ),
    [orders, reportDate, q, nameOf]
  );
  const dayTotals = useMemo(() => sumMeals(dayOrders), [dayOrders]);

  const counts = {
    payments: payments.length,
    orders: orders.length,
    customers: customers.length,
    daily: orderDates.length,
  };
  const activeTab = TABS.find((t) => t.id === tab);
  const addBtn = ADD_BUTTONS[tab];

  const switchTab = (id) => {
    setTab(id);
    setQuery("");
  };
  const showPending = () => {
    setTab("payments");
    setQuery("");
    setPaymentFilter("pending");
  };
  const clearFilters = () => {
    setQuery("");
    setPaymentFilter("all");
  };
  const confirmDelete = async () => {
    setDeleting(true);
    const ok = await deleteOrder(ui.item._id);
    setDeleting(false);
    if (ok) closeModal();
  };

  const orderReport = (list, title, subtitle) => {
    const s = sumMeals(list);
    return buildReportHTML({
      title,
      subtitle,
      columns: [
        { label: "Service ID", get: (o) => o.serviceId },
        { label: "Date", get: (o) => formatDate(o.date) },
        { label: "Customer", get: (o) => nameOf(o) },
        { label: "Customer ID", get: (o) => o.customerId },
        { label: "Breakfast", num: true, get: (o) => o.breakfastCount || 0 },
        { label: "Lunch", num: true, get: (o) => o.lunchCount || 0 },
        { label: "Dinner", num: true, get: (o) => o.dinnerCount || 0 },
        { label: "Total", num: true, get: (o) => formatINR(o.totalCost) },
      ],
      rows: list,
      totals: ["Total", "", "", "", s.breakfast, s.lunch, s.dinner, formatINR(s.amount)],
    });
  };

  const runPrint = (html, title) => printReport(html, title);
  const runPDF = async (html, file) => {
    try {
      await downloadReportPDF(html, file);
    } catch {
      toast.error("Couldn't create the PDF");
    }
  };

  const singleOrderReport = (o) =>
    orderReport([o], `Order ${o.serviceId}`, `${nameOf(o)} · ${formatDate(o.date)}`);
  const allOrdersReport = () => orderReport(filteredOrders, "All orders", `${filteredOrders.length} orders`);
  const dayReport = () =>
    orderReport(dayOrders, `Total orders – ${longDate(reportDate)}`, `${dayOrders.length} orders`);

  const noResults = (
    <EmptyState
      title="Nothing matches your search"
      text="Try a different keyword or clear the filters."
      action={<Button variant="secondary" size="sm" onClick={clearFilters}>Clear filters</Button>}
    />
  );

  const paymentsTable = loading.payments ? (
    <TableSkeleton cols={5} />
  ) : payments.length === 0 ? (
    <EmptyState
      title="No payments yet"
      text="Submitted payments will appear here for review."
      action={<Button size="sm" onClick={() => openModal("addPayment", null)}><Icon name="plus" />Add payment</Button>}
    />
  ) : filteredPayments.length === 0 ? (
    noResults
  ) : (
    <TableShell>
      <thead className="bg-slate-50">
        <tr>
          <th className={th}>Customer</th>
          <th className={th}>Amount</th>
          <th className={th}>Proof</th>
          <th className={th}>Status</th>
          <th className={`${th} text-right`}>Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filteredPayments.map((p) => {
          const pending = normalizeStatus(p.status) === "pending";
          return (
            <tr key={p._id} className="hover:bg-slate-50/70">
              <td className={td}>
                <div className="flex items-center gap-3">
                  <Avatar name={p.customer?.name} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{p.customer?.name || "Unknown"}</p>
                    <p className="text-sm text-slate-500">{p.customerId}</p>
                  </div>
                </div>
              </td>
              <td className={`${td} font-medium tabular-nums text-slate-900`}>{formatINR(p.amount)}</td>
              <td className={td}>
                {p.screenshot ? (
                  <button
                    type="button"
                    onClick={() => openModal("payment", p)}
                    className="inline-flex items-center gap-1.5 text-teal-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
                  >
                    <Icon name="image" />
                    Preview
                  </button>
                ) : (
                  <span className="text-slate-400">Not attached</span>
                )}
              </td>
              <td className={td}><StatusBadge status={p.status} /></td>
              <td className={`${td} text-right`}>
                <Button size="sm" variant={pending ? "primary" : "secondary"} onClick={() => openModal("payment", p)}>
                  {pending ? "Review" : "View"}
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );

  const ordersTable = loading.orders ? (
    <TableSkeleton cols={6} />
  ) : orders.length === 0 ? (
    <EmptyState
      title="No orders yet"
      text="Meal orders will appear here once customers book."
      action={<Button size="sm" onClick={() => openModal("addOrder", null)}><Icon name="plus" />Add order</Button>}
    />
  ) : filteredOrders.length === 0 ? (
    noResults
  ) : (
    <TableShell>
      <thead className="bg-slate-50">
        <tr>
          <th className={th}>Service</th>
          <th className={th}>Date</th>
          <th className={th}>Customer</th>
          <th className={th}>Meals (B / L / D)</th>
          <th className={th}>Total</th>
          <th className={`${th} text-right`}>Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filteredOrders.map((o) => {
          const loc = locationOf(o);
          return (
            <tr key={o._id} className="hover:bg-slate-50/70">
              <td className={`${td} font-medium text-slate-900`}>{o.serviceId}</td>
              <td className={`${td} whitespace-nowrap`}>{formatDate(o.date)}</td>
              <td className={td}>
                <p className="font-medium text-slate-900">{nameOf(o)}</p>
                <p className="text-sm text-slate-500">{o.customerId}</p>
              </td>
              <td className={td}><MealChips order={o} /></td>
              <td className={`${td} font-medium tabular-nums text-slate-900`}>{formatINR(o.totalCost)}</td>
              <td className={`${td} text-right`}>
                <div className="inline-flex gap-1">
                  <IconButton
                    icon="pin"
                    label={loc ? "View delivery location" : "No location set"}
                    disabled={!loc}
                    onClick={() => loc && window.open(mapsLink(loc.lat, loc.lng), "_blank", "noopener")}
                  />
                  <IconButton icon="printer" label="Print order" onClick={() => runPrint(singleOrderReport(o), `Order ${o.serviceId}`)} />
                  <IconButton icon="download" label="Download PDF" onClick={() => runPDF(singleOrderReport(o), `order-${o.serviceId}.pdf`)} />
                  <IconButton icon="edit" label="Edit order" onClick={() => openModal("edit", o)} />
                  <IconButton icon="trash" label="Delete order" tone="danger" onClick={() => openModal("delete", o)} />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </TableShell>
  );

  const customersTable = loading.customers ? (
    <TableSkeleton cols={5} />
  ) : customers.length === 0 ? (
    <EmptyState
      title="No customers yet"
      text="Registered customers will appear here."
      action={<Button size="sm" onClick={() => openModal("addCustomer", null)}><Icon name="plus" />Add customer</Button>}
    />
  ) : filteredCustomers.length === 0 ? (
    noResults
  ) : (
    <TableShell>
      <thead className="bg-slate-50">
        <tr>
          <th className={th}>Customer</th>
          <th className={th}>Email</th>
          <th className={th}>Phone</th>
          <th className={`${th} text-center`}>Details</th>
          <th className={`${th} text-right`}>Current balance</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {filteredCustomers.map((c) => (
          <tr key={c._id} className="hover:bg-slate-50/70">
            <td className={td}>
              <div className="flex items-center gap-3">
                <Avatar name={c.name} />
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.customerId}</p>
                </div>
              </div>
            </td>
            <td className={td}>{c.email}</td>
            <td className={`${td} whitespace-nowrap`}>{c.phone}</td>
            <td className={`${td} text-center`}>
              <Button size="sm" variant="secondary" onClick={() => openModal("customer", c)}>
                <Icon name="eye" />
                View
              </Button>
            </td>
            <td className={`${td} text-right font-medium tabular-nums ${Number(c.currentBalance) < 0 ? "text-red-600" : "text-slate-900"}`}>
              {formatINR(c.currentBalance)}
            </td>
          </tr>
        ))}
      </tbody>
    </TableShell>
  );

  const dailyView = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <label htmlFor="report-date" className="mb-1.5 block text-base font-medium text-slate-700">Select date</label>
          <input
            id="report-date"
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base font-medium text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/15"
          />
          {reportDate && <p className="mt-1.5 text-sm text-slate-500">{longDate(reportDate)}</p>}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={dayOrders.length === 0} onClick={() => runPrint(dayReport(), `Orders ${reportDate}`)}>
            <Icon name="printer" />
            Print
          </Button>
          <Button disabled={dayOrders.length === 0} onClick={() => runPDF(dayReport(), `orders_${reportDate}.pdf`)}>
            <Icon name="download" />
            Download PDF
          </Button>
        </div>
      </div>

      {orderDates.length > 0 && (
        <button
          type="button"
          onClick={() => openModal("dates", null)}
          className="group flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-teal-600 hover:bg-teal-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <Icon name="calendar" />
            </span>
            <span>
              <span className="block text-base font-medium text-slate-900">Dates with orders</span>
              <span className="block text-sm text-slate-500">
                {orderDates.length} {orderDates.length === 1 ? "date" : "dates"} · tap to choose one
              </span>
            </span>
          </span>
          <Icon name="arrow" className="h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-teal-700" />
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard highlight label="Total orders" value={dayOrders.length} hint={`${formatINR(dayTotals.amount)} value`} />
        <StatCard label="🌅 Breakfast" value={dayTotals.breakfast} tone="bg-amber-50" />
        <StatCard label="☀️ Lunch" value={dayTotals.lunch} tone="bg-sky-50" />
        <StatCard label="🌙 Dinner" value={dayTotals.dinner} tone="bg-indigo-50" />
      </div>

      {loading.orders ? (
        <TableSkeleton cols={5} />
      ) : dayOrders.length === 0 ? (
        <EmptyState title="No orders on this date" text="Pick another date to see its orders." />
      ) : (
        <TableShell>
          <thead className="bg-slate-50">
            <tr>
              <th className={th}>Service</th>
              <th className={th}>Customer</th>
              <th className={th}>Meals (B / L / D)</th>
              <th className={`${th} text-right`}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dayOrders.map((o) => (
              <tr key={o._id} className="hover:bg-slate-50/70">
                <td className={`${td} font-medium text-slate-900`}>{o.serviceId}</td>
                <td className={td}>
                  <p className="font-medium text-slate-900">{nameOf(o)}</p>
                  <p className="text-sm text-slate-500">{o.customerId}</p>
                </td>
                <td className={td}><MealChips order={o} /></td>
                <td className={`${td} text-right font-medium tabular-nums text-slate-900`}>{formatINR(o.totalCost)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-teal-50">
            <tr>
              <td colSpan={2} className="px-4 py-3 text-base font-bold text-teal-900">Day total</td>
              <td className="px-4 py-3 text-base font-bold tabular-nums text-teal-900">
                B {dayTotals.breakfast} · L {dayTotals.lunch} · D {dayTotals.dinner}
              </td>
              <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-teal-900">{formatINR(dayTotals.amount)}</td>
            </tr>
          </tfoot>
        </TableShell>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">Admin dashboard</h1>
          <p className="mt-1 text-base text-slate-500">
            Review payments, manage meal orders and keep an eye on customer balances.
          </p>
        </div>
        <Button variant="secondary" onClick={loadAll}>
          <Icon name="refresh" />
          Refresh
        </Button>
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard highlight onClick={showPending} label="Waiting for review" value={stats.pendingCount} hint={`${formatINR(stats.pendingAmount)} pending`} />
        <StatCard label="Confirmed payments" value={formatINR(stats.confirmedAmount)} hint={`${stats.confirmedCount} payments`} />
        <StatCard label="Orders" value={orders.length} hint={`${stats.meals} meals booked`} />
        <StatCard label="Customers" value={customers.length} hint="Registered accounts" />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Dashboard sections" className="inline-flex flex-wrap rounded-xl bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => switchTab(t.id)}
                className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-base font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.label}
                <span className="rounded-full bg-slate-200/70 px-1.5 text-sm tabular-nums text-slate-600">{counts[t.id]}</span>
              </button>
            ))}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <SearchInput value={query} onChange={setQuery} placeholder={activeTab.search} />
            {addBtn && (
              <Button onClick={() => openModal(addBtn.kind, null)}>
                <Icon name="plus" />
                {addBtn.label}
              </Button>
            )}
          </div>
        </div>

        {tab === "payments" && (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by status">
            {PAYMENT_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setPaymentFilter(f.id)}
                aria-pressed={paymentFilter === f.id}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                  paymentFilter === f.id ? "bg-teal-700 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {tab === "orders" && filteredOrders.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">All {filteredOrders.length} listed orders:</span>
            <Button size="sm" variant="secondary" onClick={() => runPrint(allOrdersReport(), "All orders")}>
              <Icon name="printer" />
              Print
            </Button>
            <Button size="sm" variant="secondary" onClick={() => runPDF(allOrdersReport(), "all-orders.pdf")}>
              <Icon name="download" />
              Download PDF
            </Button>
          </div>
        )}

        <div role="tabpanel">
          {tab === "payments" && paymentsTable}
          {tab === "orders" && ordersTable}
          {tab === "customers" && customersTable}
          {tab === "daily" && dailyView}
        </div>
      </section>

      <PaymentReviewModal
        open={ui.open && ui.kind === "payment"}
        payment={ui.kind === "payment" ? ui.item : null}
        onClose={closeModal}
        onDecision={setPaymentStatus}
      />
      <CustomerDetailsModal
        open={ui.open && ui.kind === "customer"}
        customer={viewCustomer}
        orders={orders}
        payments={payments}
        onClose={closeModal}
        onSaveLocation={saveCustomerLocation}
      />
      <EditOrderModal
        open={ui.open && ui.kind === "edit"}
        order={ui.kind === "edit" ? ui.item : null}
        onClose={closeModal}
        onSave={updateOrder}
      />
      <DatesModal
        open={ui.open && ui.kind === "dates"}
        dates={orderDates}
        counts={dateCounts}
        selected={reportDate}
        onSelect={(d) => {
          setReportDate(d);
          closeModal();
        }}
        onClose={closeModal}
      />
      <AddCustomerModal open={ui.open && ui.kind === "addCustomer"} onClose={closeModal} onSave={addCustomer} />
      <AddOrderModal open={ui.open && ui.kind === "addOrder"} onClose={closeModal} onSave={addOrder} customers={customers} />
      <AddPaymentModal open={ui.open && ui.kind === "addPayment"} onClose={closeModal} onSave={addPayment} customers={customers} />
      <ConfirmDialog
        open={ui.open && ui.kind === "delete"}
        title="Delete this order?"
        message={
          ui.kind === "delete" && ui.item
            ? `Service ${ui.item.serviceId} for customer ${ui.item.customerId} on ${formatDate(ui.item.date)} will be removed. This can't be undone.`
            : ""
        }
        confirmLabel="Delete order"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={closeModal}
      />
    </div>
  );
}
