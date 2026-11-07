import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  FaTimes,
  FaSyncAlt,
  FaPen,
  FaCheck,
  FaLock,
  FaCoffee,
  FaSun,
  FaMoon,
  FaCalendarAlt,
  FaCalendarCheck,
  FaWallet,
  FaPiggyBank,
  FaUmbrellaBeach,
  FaInfoCircle,
  FaStopCircle,
  FaBolt,
  FaUtensils,
  FaExclamationTriangle,
} from "react-icons/fa";
import API from "../services/api";
import { AUTO_DAYS, FULL_DAY_PRICE, TWO_MEAL_PRICE, autoDayCost, formatINR, normalCost } from "../assets/utils/pricing";
import { pincodeMessage } from "../assets/utils/delivery";
import { DeliveryLocationCard, useCustomerDelivery } from "../components/DeliveryLocation";
import {
  MEAL_KEYS,
  addDays,
  todayIST,
  isMealOpen,
  closedMessage,
  dayLabel,
  shortDate,
  useNow,
} from "../assets/utils/cutoff";

const MEALS = [
  {
    key: "breakfast",
    short: "B",
    label: "Breakfast",
    icon: FaCoffee,
    on: "bg-amber-50 text-amber-700 ring-amber-200",
    tileOn: "border-amber-400 bg-amber-50 text-amber-800",
    iconOn: "bg-amber-400 text-white",
  },
  {
    key: "lunch",
    short: "L",
    label: "Lunch",
    icon: FaSun,
    on: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    tileOn: "border-emerald-400 bg-emerald-50 text-emerald-800",
    iconOn: "bg-emerald-500 text-white",
  },
  {
    key: "dinner",
    short: "D",
    label: "Dinner",
    icon: FaMoon,
    on: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    tileOn: "border-indigo-400 bg-indigo-50 text-indigo-800",
    iconOn: "bg-indigo-500 text-white",
  },
];

const PRESETS = [
  { label: "B + L", meals: ["breakfast", "lunch"] },
  { label: "B + D", meals: ["breakfast", "dinner"] },
  { label: "L + D", meals: ["lunch", "dinner"] },
  { label: "Full day", meals: ["breakfast", "lunch", "dinner"] },
];

const ZERO = { breakfast: 0, lunch: 0, dinner: 0 };
const FULL = { breakfast: 1, lunch: 1, dinner: 1 };
const countOf = (c) => c.breakfast + c.lunch + c.dinner;
const priceOf = (c) => autoDayCost(c.breakfast, c.lunch, c.dinner);
const regularOf = (c) => normalCost(c.breakfast, c.lunch, c.dinner);
const toBody = (c) => ({ breakfastCount: c.breakfast, lunchCount: c.lunch, dinnerCount: c.dinner });
const fromDay = (d) => ({ breakfast: d.breakfastCount, lunch: d.lunchCount, dinner: d.dinnerCount });
const defaultStart = () => addDays(todayIST(), 1);

const buildDraft = (start, tpl) =>
  Array.from({ length: AUTO_DAYS }, (_, i) => {
    const date = addDays(start, i);
    const c = { ...ZERO };
    MEAL_KEYS.forEach((m) => {
      c[m] = tpl[m] && isMealOpen(date, m) ? 1 : 0;
    });
    return c;
  });

const dayParts = (date) => {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { wd: "", num: "–", mon: "" };
  return {
    wd: d.toLocaleDateString("en-IN", { weekday: "short" }),
    num: d.getDate(),
    mon: d.toLocaleDateString("en-IN", { month: "short" }),
  };
};

function DateTile({ date, muted }) {
  const { wd, num, mon } = dayParts(date);
  return (
    <span
      className={`flex h-14 w-14 flex-none flex-col items-center justify-center rounded-2xl ${
        muted
          ? "bg-slate-100 text-slate-400"
          : "bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-md shadow-slate-900/20"
      }`}
    >
      <span className={`text-[9px] font-bold uppercase tracking-widest ${muted ? "text-slate-400" : "text-orange-300"}`}>
        {wd}
      </span>
      <span className="text-lg font-extrabold leading-none">{num}</span>
      <span className={`text-[9px] font-semibold uppercase ${muted ? "text-slate-400" : "text-slate-300"}`}>{mon}</span>
    </span>
  );
}

function Chips({ value }) {
  return (
    <div className="flex items-center gap-1.5">
      {MEALS.map((m) => {
        const Icon = m.icon;
        return (
          <span
            key={m.key}
            title={m.label}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-xl text-xs ${
              value[m.key] ? `${m.on} ring-1` : "bg-slate-50 text-slate-300"
            }`}
          >
            <Icon />
          </span>
        );
      })}
    </div>
  );
}

function MealTile({ meal, active, locked, onClick }) {
  const Icon = meal.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-xs font-bold transition active:scale-95 ${
        active ? meal.tileOn : "border-slate-200 bg-white text-slate-400 hover:border-slate-300"
      } ${locked ? "opacity-50" : ""}`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-base transition ${
          active ? meal.iconOn : "bg-slate-100 text-slate-400"
        }`}
      >
        <Icon />
      </span>
      {meal.label}
      <span className="absolute right-2 top-2 text-[10px]">
        {locked ? <FaLock className="text-slate-400" /> : active ? <FaCheck className="text-current" /> : null}
      </span>
    </button>
  );
}

function StatCard({ icon: Icon, label, value, tone, valueTone = "text-slate-900" }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-3 text-center shadow-sm">
      <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-sm ${tone}`}>
        <Icon />
      </span>
      <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-extrabold tabular-nums sm:text-xl ${valueTone}`}>{value}</p>
    </div>
  );
}

function SectionTitle({ n, children }) {
  return (
    <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">{n}</span>
      {children}
    </p>
  );
}

export default function AutoOrderModal({ open, balance, onClose, onChanged }) {
  const now = useNow();
  const delivery = useCustomerDelivery(open);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(defaultStart);
  const [template, setTemplate] = useState(FULL);
  const [draft, setDraft] = useState(() => buildDraft(defaultStart(), FULL));
  const [editDate, setEditDate] = useState(null);
  const [editVal, setEditVal] = useState(ZERO);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get("/auto-orders/me");
      setPlan(data.plan);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load your auto order");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setStart(defaultStart());
    setTemplate(FULL);
    setEditDate(null);
    load();
  }, [open, load]);

  useEffect(() => {
    setDraft(buildDraft(start, template));
  }, [start, template]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && !busy && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  const summary = useMemo(() => {
    let total = 0;
    let regular = 0;
    let leaves = 0;
    draft.forEach((c) => {
      if (countOf(c) === 0) {
        leaves += 1;
      } else {
        total += priceOf(c);
        regular += regularOf(c);
      }
    });
    total += leaves * priceOf(template);
    regular += leaves * regularOf(template);
    return { total, saving: regular - total, leaves };
  }, [draft, template]);

  if (!open) return null;

  const running = Boolean(plan && plan.active);
  const short = Number(balance) - summary.total <= 0;
  const blocked = !delivery.loading && !delivery.deliverable;

  const today = todayIST();
  const doneDays = running ? plan.days.filter((d) => d.date < today).length : 0;
  const totalDays = running ? plan.days.length : 0;
  const progress = totalDays ? Math.round((doneDays / totalDays) * 100) : 0;

  const toggleTemplate = (meal) => setTemplate((t) => ({ ...t, [meal]: t[meal] ? 0 : 1 }));

  const applyPreset = (meals) =>
    setTemplate({
      breakfast: meals.includes("breakfast") ? 1 : 0,
      lunch: meals.includes("lunch") ? 1 : 0,
      dinner: meals.includes("dinner") ? 1 : 0,
    });

  const toggleDraft = (index, meal) => {
    const date = addDays(start, index);
    const next = draft[index][meal] ? 0 : 1;
    if (next && !isMealOpen(date, meal, now)) return toast.error(closedMessage(date, meal));
    setDraft((d) => d.map((c, i) => (i === index ? { ...c, [meal]: next } : c)));
  };

  const create = async () => {
    if (blocked) return toast.error(pincodeMessage(delivery.pincode));
    if (countOf(template) === 0) return toast.error("Choose the meals for your auto order");
    setBusy(true);
    try {
      const { data } = await API.post("/auto-orders/me", {
        startDate: start,
        template: toBody(template),
        days: draft.map(toBody),
      });
      setPlan(data.plan);
      toast.success("Auto order started");
      if (onChanged) await onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't start the auto order");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (day) => {
    setEditDate(day.date);
    setEditVal(fromDay(day));
  };

  const setEditMeal = (meal, value) => {
    if (!isMealOpen(editDate, meal, now)) return toast.error(closedMessage(editDate, meal));
    setEditVal((v) => ({ ...v, [meal]: value }));
  };

  const markLeave = () => {
    setEditVal((v) => {
      const next = { ...v };
      MEAL_KEYS.forEach((m) => {
        if (isMealOpen(editDate, m, now)) next[m] = 0;
      });
      return next;
    });
  };

  const saveEdit = async () => {
    if (countOf(editVal) === 0 && !window.confirm("Mark this day as leave? It will move to the end of your plan.")) return;
    setBusy(true);
    try {
      const { data } = await API.put("/auto-orders/me/day", { date: editDate, ...toBody(editVal) });
      setPlan(data.plan);
      setEditDate(null);
      toast.success("Day updated");
      if (onChanged) await onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't update this day");
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!window.confirm("Stop your auto order? Meals that are still open to change will be cancelled and refunded.")) return;
    setBusy(true);
    try {
      const { data } = await API.delete("/auto-orders/me");
      setPlan(data.plan);
      setEditDate(null);
      toast.success("Auto order stopped");
      if (onChanged) await onChanged();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't stop the auto order");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 sm:p-6">
      <div aria-hidden="true" onClick={() => !busy && onClose()} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Set auto order"
        className="relative flex max-h-[calc(100dvh-2.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl sm:max-h-[90dvh]"
      >
        {/* ================= HEADER ================= */}
        <div className="relative flex-none overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-5 py-4">
          <span className="pointer-events-none absolute -right-12 -top-14 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-16 left-8 h-32 w-32 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-lg text-white shadow-lg shadow-orange-500/30">
                <FaSyncAlt className={busy ? "animate-spin" : ""} />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-extrabold leading-tight text-white sm:text-xl">
                    Auto Order · {AUTO_DAYS} days
                  </h2>
                  {running && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-200 ring-1 ring-emerald-300/40">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                      Active
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs font-medium text-slate-200">
                  Full day {formatINR(FULL_DAY_PRICE)} · Any two meals {formatINR(TWO_MEAL_PRICE)} per day
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Close"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/15 text-sm text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-50"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* ================= BODY ================= */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-5 sm:px-6">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />
              ))}
            </div>
          ) : running ? (
            <>
              {/* ---------- delivery location ---------- */}
              <DeliveryLocationCard delivery={delivery} showAlert={false} />

              {/* ---------- stats ---------- */}
              <div className="grid grid-cols-3 gap-2.5">
                <StatCard icon={FaCalendarCheck} label="Meal days" value={plan.mealDays} tone="bg-blue-50 text-blue-600" />
                <StatCard icon={FaCalendarAlt} label="Starts" value={shortDate(plan.startDate)} tone="bg-orange-50 text-orange-600" />
                <StatCard icon={FaWallet} label="Plan cost" value={formatINR(plan.totalCost)} tone="bg-emerald-50 text-emerald-600" valueTone="text-emerald-600" />
              </div>

              {/* ---------- progress ---------- */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">Plan progress</span>
                  <span className="text-slate-500">
                    {doneDays} of {totalDays} days done
                  </span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* ---------- day list ---------- */}
              <ul className="space-y-2.5">
                {plan.days.map((day) => {
                  const editing = editDate === day.date;
                  const value = editing ? editVal : fromDay(day);
                  const allLocked = MEAL_KEYS.every((m) => !isMealOpen(day.date, m, now));
                  const past = day.date < today;
                  return (
                    <li
                      key={day.date}
                      className={`rounded-2xl border bg-white p-3 shadow-sm transition ${
                        editing
                          ? "border-orange-300 ring-4 ring-orange-100"
                          : day.cancelled
                          ? "border-slate-200 bg-slate-50"
                          : "border-slate-200/80 hover:shadow-md"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <DateTile date={day.date} muted={day.cancelled || past} />

                        <div className="min-w-[110px] flex-1">
                          <p className={`text-sm font-extrabold ${day.cancelled ? "text-slate-400 line-through" : "text-slate-900"}`}>
                            {dayLabel(day.date)}
                          </p>
                          <div className="mt-1 text-[11px] font-bold">
                            {day.cancelled ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-500">
                                <FaUmbrellaBeach /> Leave
                              </span>
                            ) : day.extended ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-orange-600">
                                <FaBolt /> Carried forward · {formatINR(day.cost)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                                {formatINR(day.cost)}
                              </span>
                            )}
                          </div>
                        </div>

                        {!editing && <Chips value={value} />}

                        {!editing && (
                          <button
                            type="button"
                            disabled={allLocked || busy}
                            onClick={() => startEdit(day)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                              allLocked
                                ? "cursor-not-allowed bg-slate-100 text-slate-400"
                                : "bg-slate-900 text-white shadow-md shadow-slate-900/20 hover:bg-orange-500 hover:shadow-orange-500/30"
                            }`}
                          >
                            {allLocked ? <FaLock /> : <FaPen />}
                            Edit
                          </button>
                        )}
                      </div>

                      {/* ---------- inline editor ---------- */}
                      {editing && (
                        <div className="mt-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
                          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <FaPen className="text-orange-500" /> Choose meals for this day
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {MEALS.map((m) => {
                              const locked = !isMealOpen(day.date, m.key, now);
                              return (
                                <MealTile
                                  key={m.key}
                                  meal={m}
                                  active={Boolean(value[m.key])}
                                  locked={locked}
                                  onClick={() => setEditMeal(m.key, value[m.key] ? 0 : 1)}
                                />
                              );
                            })}
                          </div>

                          <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2.5 ring-1 ring-slate-200">
                            <span className="text-xs font-semibold text-slate-500">Day total</span>
                            {countOf(editVal) === 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-sm font-extrabold text-red-500">
                                <FaUmbrellaBeach /> Leave
                              </span>
                            ) : (
                              <span className="text-lg font-extrabold tabular-nums text-orange-600">
                                {formatINR(priceOf(editVal))}
                              </span>
                            )}
                          </div>

                          {countOf(editVal) === 0 && (
                            <p className="mt-2 flex items-start gap-1.5 text-[11px] font-semibold text-amber-700">
                              <FaInfoCircle className="mt-0.5 flex-none" />
                              This day becomes a leave and moves to the end of your plan.
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={markLeave}
                              disabled={busy}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <FaUmbrellaBeach />
                              Mark as leave
                            </button>
                            <div className="ml-auto flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditDate(null)}
                                disabled={busy}
                                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={saveEdit}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/25 transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50"
                              >
                                <FaCheck />
                                {busy ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>

              <p className="flex items-start gap-2 rounded-2xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 ring-1 ring-blue-100">
                <FaInfoCircle className="mt-0.5 flex-none text-blue-500" />
                Set a day to 0 meals to take a leave. That day moves to the end, so you always get {AUTO_DAYS} meal days.
                Breakfast and lunch can be changed until 7 PM, dinner until 9 PM the day before.
              </p>
            </>
          ) : (
            <>
              {/* ---------- delivery location ---------- */}
              <DeliveryLocationCard delivery={delivery} />

              {/* ---------- step 1 ---------- */}
              <div>
                <SectionTitle n="1">Start date</SectionTitle>
                <div className="group relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-orange-50 text-sm text-orange-500 transition group-focus-within:bg-orange-500 group-focus-within:text-white">
                    <FaCalendarAlt />
                  </span>
                  <input
                    id="auto-start"
                    type="date"
                    value={start}
                    min={defaultStart()}
                    onChange={(e) => e.target.value && setStart(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-14 pr-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* ---------- step 2 ---------- */}
              <div>
                <SectionTitle n="2">Meals every day</SectionTitle>
                <div className="grid grid-cols-3 gap-2.5">
                  {MEALS.map((m) => (
                    <MealTile
                      key={m.key}
                      meal={m}
                      active={Boolean(template[m.key])}
                      locked={false}
                      onClick={() => toggleTemplate(m.key)}
                    />
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    <FaBolt className="text-orange-500" /> Presets
                  </span>
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p.meals)}
                      className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-orange-400 hover:bg-orange-50 hover:text-orange-700 active:scale-95"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ---------- step 3 ---------- */}
              <div>
                <SectionTitle n="3">Customise your days</SectionTitle>
                <ul className="space-y-2">
                  {draft.map((c, i) => {
                    const date = addDays(start, i);
                    const n = countOf(c);
                    return (
                      <li
                        key={date}
                        className={`flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-2.5 shadow-sm ${
                          n === 0 ? "border-slate-200 bg-slate-50" : "border-slate-200/80"
                        }`}
                      >
                        <DateTile date={date} muted={n === 0} />
                        <div className="min-w-[100px] flex-1">
                          <p className={`text-sm font-extrabold ${n === 0 ? "text-slate-400 line-through" : "text-slate-900"}`}>
                            {dayLabel(date)}
                          </p>
                          <p className="mt-0.5 text-[11px] font-bold">
                            {n === 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-red-500">
                                <FaUmbrellaBeach /> Leave
                              </span>
                            ) : (
                              <span className="text-slate-500">{formatINR(priceOf(c))}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {MEALS.map((m) => {
                            const locked = !isMealOpen(date, m.key, now);
                            const Icon = m.icon;
                            return (
                              <button
                                key={m.key}
                                type="button"
                                onClick={() => toggleDraft(i, m.key)}
                                aria-label={`${m.label} on ${dayLabel(date)}`}
                                aria-pressed={Boolean(c[m.key])}
                                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-sm transition active:scale-95 ${
                                  c[m.key] ? `${m.on} ring-1` : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                                } ${locked ? "opacity-40" : ""}`}
                              >
                                <Icon />
                                {locked && <FaLock className="absolute -right-1 -top-1 rounded-full bg-white p-0.5 text-[10px] text-slate-500 shadow" />}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* ---------- summary ---------- */}
              <div className="grid grid-cols-3 gap-2.5">
                <StatCard icon={FaUmbrellaBeach} label="Leaves" value={summary.leaves} tone="bg-red-50 text-red-500" />
                <StatCard icon={FaPiggyBank} label="You save" value={formatINR(summary.saving)} tone="bg-emerald-50 text-emerald-600" valueTone="text-emerald-600" />
                <StatCard icon={FaUtensils} label="Total" value={formatINR(summary.total)} tone="bg-orange-50 text-orange-600" valueTone="text-orange-600" />
              </div>

              {short && (
                <p className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  <FaExclamationTriangle className="mt-0.5 flex-none" />
                  Your balance must stay above ₹0 after the auto order. Please add a payment first.
                </p>
              )}

              <p className="flex items-start gap-2 rounded-2xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-800 ring-1 ring-blue-100">
                <FaInfoCircle className="mt-0.5 flex-none text-blue-500" />
                Leave days are added after the last date automatically, so you always get {AUTO_DAYS} meal days.
              </p>
            </>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="flex flex-none flex-col-reverse gap-2 border-t border-slate-100 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          {running && (
            <button
              type="button"
              onClick={stop}
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:mr-auto"
            >
              <FaStopCircle />
              Stop auto order
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Close
          </button>
          {!running && !loading && (
            <button
              type="button"
              onClick={create}
              disabled={busy || short || blocked || countOf(template) === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <FaBolt />
              {busy ? "Starting…" : `Start auto order · ${formatINR(summary.total)}`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
