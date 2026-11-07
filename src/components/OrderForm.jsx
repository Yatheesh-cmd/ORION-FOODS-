import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import API from "../services/api";
import { PRICE, formatINR, normalCost } from "../assets/utils/pricing";
import { pincodeMessage } from "../assets/utils/delivery";
import { DeliveryLocationCard, useCustomerDelivery } from "../components/DeliveryLocation";
import {
  MEAL_KEYS,
  MEAL_LABEL,
  addDays,
  todayIST,
  isMealOpen,
  closedMessage,
  dateKey,
  openUntil,
  useNow,
} from "../assets/utils/cutoff";

const MEALS = [
  { key: "breakfast", icon: "🍳", tile: "from-amber-100 to-orange-100", ring: "ring-orange-300" },
  { key: "lunch", icon: "🍛", tile: "from-green-100 to-emerald-100", ring: "ring-emerald-300" },
  { key: "dinner", icon: "🍽️", tile: "from-indigo-100 to-purple-100", ring: "ring-purple-300" },
];

const COMBOS = [
  { label: "Breakfast + Lunch", meals: ["breakfast", "lunch"] },
  { label: "Breakfast + Dinner", meals: ["breakfast", "dinner"] },
  { label: "Breakfast + Lunch + Dinner", meals: ["breakfast", "lunch", "dinner"] },
];

const defaultDate = () => {
  const tomorrow = addDays(todayIST(), 1);
  return isMealOpen(tomorrow, "dinner") ? tomorrow : addDays(tomorrow, 1);
};

export default function OrderForm({ customer, order, onClose, onSuccess }) {
  const editing = Boolean(order);
  const now = useNow();
  const delivery = useCustomerDelivery(true);
  const blocked = !editing && !delivery.loading && !delivery.deliverable;
  const original = editing
    ? { breakfast: order.breakfastCount, lunch: order.lunchCount, dinner: order.dinnerCount }
    : { breakfast: 0, lunch: 0, dinner: 0 };

  const [date, setDate] = useState(editing ? dateKey(order.date) : defaultDate());
  const [counts, setCounts] = useState(original);
  const [loading, setLoading] = useState(false);
  const [booked, setBooked] = useState(() => new Set());

  /* dates this customer already has an order on (one order per date) */
  useEffect(() => {
    if (editing) return undefined;
    let alive = true;
    (async () => {
      try {
        const { data } = await API.get("/orders/my");
        if (!alive) return;
        const set = new Set((Array.isArray(data) ? data : []).map((o) => dateKey(o.date)));
        setBooked(set);
        setDate((current) => {
          let d = current;
          for (let i = 0; i < 60 && set.has(d); i += 1) d = addDays(d, 1);
          if (d !== current) setCounts({ breakfast: 0, lunch: 0, dinner: 0 });
          return d;
        });
      } catch {
        /* the server still blocks duplicate dates */
      }
    })();
    return () => {
      alive = false;
    };
  }, [editing]);

  const dateTaken = !editing && booked.has(date);

  const open = (meal, d = date) => isMealOpen(d, meal, now);

  const change = (meal, delta) => {
    if (!open(meal)) return toast.error(closedMessage(date, meal));
    setCounts((c) => ({ ...c, [meal]: Math.max(0, Math.min(20, c[meal] + delta)) }));
  };

  const pickCombo = (meals) => {
    const blockedMeal = meals.find((m) => !open(m));
    if (blockedMeal) return toast.error(closedMessage(date, blockedMeal));
    setCounts((c) => {
      const next = { ...c };
      MEAL_KEYS.forEach((k) => {
        if (open(k)) next[k] = meals.includes(k) ? 1 : 0;
      });
      return next;
    });
  };

  const changeDate = (value) => {
    setDate(value);
    setCounts((c) => {
      const next = { ...c };
      MEAL_KEYS.forEach((k) => {
        if (!isMealOpen(value, k, now)) next[k] = 0;
      });
      return next;
    });
  };

  const totalMeals = counts.breakfast + counts.lunch + counts.dinner;
  const totalAmount = normalCost(counts.breakfast, counts.lunch, counts.dinner);
  const extra = totalAmount - (editing ? Number(order.totalCost || 0) : 0);

  const handleSubmit = async () => {
    if (blocked) return toast.error(pincodeMessage(delivery.pincode));
    if (!date) return toast.error("Please select a date");
    if (dateTaken) {
      return toast.error("You already have an order on this date. Please edit that order instead.");
    }
    if (totalMeals === 0) return toast.error("Add at least one meal");

    const touched = MEAL_KEYS.find((m) => counts[m] !== original[m] && !open(m));
    if (touched) return toast.error(closedMessage(date, touched));

    if (extra > 0 && Number(customer.currentBalance) - extra <= 0) {
      return toast.error("Not enough balance. Your balance must stay above ₹0. Please add a payment first.");
    }

    const body = {
      date,
      breakfastCount: counts.breakfast,
      lunchCount: counts.lunch,
      dinnerCount: counts.dinner,
    };

    try {
      setLoading(true);
      if (editing) await API.put(`/orders/${order._id}/mine`, body);
      else await API.post("/orders", body);
      toast.success(editing ? "Order updated" : "Order placed");
      if (onSuccess) await onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save the order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)]">
        {/* ---------- header ---------- */}
        <div className="flex flex-none items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-white">
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-tight">{editing ? "Edit Order" : "Add New Order"}</h2>
            <p className="truncate text-[11px] text-orange-100">
              {editing ? `Service ${order.serviceId}` : "Choose a date and your meals"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-white/20 text-xl leading-none transition hover:bg-white/30"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* ---------- body (only this part scrolls, and only on very small screens) ---------- */}
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 pb-2 pt-2.5">
          <div>
            <label htmlFor="order-date" className="mb-0.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Order Date
            </label>
            <input
              id="order-date"
              type="date"
              value={date}
              min={addDays(todayIST(), 1)}
              disabled={editing}
              onChange={(e) => changeDate(e.target.value)}
              className={`w-full rounded-lg border px-3 py-1.5 text-sm font-semibold text-gray-800 outline-none transition focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500 ${
                dateTaken
                  ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                  : "border-gray-300 focus:border-orange-500 focus:ring-orange-200"
              }`}
            />
            {dateTaken && (
              <p className="mt-1 text-[11px] font-semibold leading-tight text-red-600">
                You already have an order on this date. Edit that order instead, or choose another date.
              </p>
            )}
          </div>

          <DeliveryLocationCard delivery={delivery} showAlert={!editing} compact />

          <div className="grid grid-cols-3 gap-1.5">
            {COMBOS.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => pickCombo(c.meals)}
                className="rounded-lg border border-orange-300 bg-orange-50 px-1 py-1.5 text-[10px] font-bold leading-tight text-orange-700 transition hover:bg-orange-100 active:scale-95"
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            {MEALS.map((m) => {
              const isOpen = open(m.key);
              const active = counts[m.key] > 0;
              return (
                <div
                  key={m.key}
                  className={`flex items-center justify-between rounded-xl border bg-white px-2.5 py-1.5 shadow-sm transition ${
                    active ? `ring-2 ${m.ring} border-transparent shadow-md` : "border-gray-200"
                  } ${isOpen ? "" : "opacity-60"}`}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-gradient-to-br text-xl ${m.tile}`}>
                      {m.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight text-gray-800">{MEAL_LABEL[m.key]}</p>
                      <p className="truncate text-[11px] leading-tight text-gray-500">
                        <span className="font-semibold text-orange-600">{formatINR(PRICE[m.key])} each</span> ·{" "}
                        {isOpen ? (
                          <>closes {openUntil(date, m.key)}</>
                        ) : (
                          <span className="font-semibold text-red-600">Closed</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => change(m.key, -1)}
                      disabled={counts[m.key] === 0}
                      aria-label={`Remove ${MEAL_LABEL[m.key]}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 text-base font-bold text-gray-600 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-base font-bold tabular-nums text-gray-800">
                      {counts[m.key]}
                    </span>
                    <button
                      type="button"
                      onClick={() => change(m.key, 1)}
                      aria-label={`Add ${MEAL_LABEL[m.key]}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-base font-bold text-white transition hover:bg-orange-600 active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between rounded-lg bg-orange-50 px-3 py-1.5">
            <div className="leading-tight">
              <p className="text-[11px] text-gray-500">
                {totalMeals} {totalMeals === 1 ? "meal" : "meals"} · Normal order, no combo offer
              </p>
              <p className="text-sm font-semibold text-gray-700">Total Amount</p>
            </div>
            <span className="text-xl font-bold text-orange-600">{formatINR(totalAmount)}</span>
          </div>
        </div>

        {/* ---------- footer: always visible ---------- */}
        <div className="flex flex-none gap-2 border-t border-slate-100 bg-white px-3 py-2.5">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || totalMeals === 0 || blocked || dateTaken}
            className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Saving..." : editing ? "Save Changes" : "Place Order"}
          </button>
        </div>
      </div>
    </div>
  );
}