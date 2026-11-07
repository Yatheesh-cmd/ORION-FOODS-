import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import {
  FaEye,
  FaPen,
  FaLock,
  FaTimes,
  FaInbox,
  FaHistory,
  FaHashtag,
  FaIdBadge,
  FaCalendarAlt,
  FaUtensils,
  FaCheckCircle,
} from "react-icons/fa";
import { MdBreakfastDining, MdLunchDining, MdDinnerDining } from "react-icons/md";
import { formatINR } from "../assets/utils/pricing";
import { MEAL_KEYS, dateKey, isMealOpen, closedMessage, useNow } from "../assets/utils/cutoff";
import { LocationSummary, useCustomerDelivery } from "../components/DeliveryLocation";

const formatDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dayParts = (date) => {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return { wd: "", num: "–", mon: "" };
  return {
    wd: d.toLocaleDateString("en-IN", { weekday: "short" }),
    num: d.getDate(),
    mon: d.toLocaleDateString("en-IN", { month: "short" }),
  };
};

function DateTile({ date }) {
  const { wd, num, mon } = dayParts(date);
  return (
    <span className="flex h-14 w-14 flex-none flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white shadow-md shadow-slate-900/20">
      <span className="text-[9px] font-bold uppercase tracking-widest text-orange-300">{wd}</span>
      <span className="text-lg font-extrabold leading-none">{num}</span>
      <span className="text-[9px] font-semibold uppercase text-slate-300">{mon}</span>
    </span>
  );
}

function MealPill({ icon: Icon, short, count, tone }) {
  const active = Number(count) > 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
        active ? tone : "bg-slate-50 text-slate-300 ring-slate-100"
      }`}
    >
      <Icon className="text-base" />
      {short} {count || 0}
    </span>
  );
}

function MealCard({ icon: Icon, label, count, tile, iconTone }) {
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${tile} p-4 text-center ring-1 ring-black/5`}>
      <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl text-2xl shadow-sm ${iconTone}`}>
        <Icon />
      </span>
      <p className="mt-2 text-xs font-semibold text-slate-600">{label}</p>
      <p className="text-2xl font-extrabold tabular-nums text-slate-900">{count ?? 0}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white text-sm text-orange-500 shadow-sm">
        <Icon />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-words text-sm font-bold text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}

function OrderDetailModal({ order, onClose }) {
  const delivery = useCustomerDelivery(true);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const totalMeals = (order.breakfastCount || 0) + (order.lunchCount || 0) + (order.dinnerCount || 0);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-transparent p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-5 text-white">
          <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-orange-500/30 blur-3xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <DateTile date={dateKey(order.date)} />
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Order details</p>
                <h2 className="text-xl font-extrabold text-white">{order.serviceId}</h2>
                <p className="text-sm text-slate-300">{formatDate(order.date)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white/10 text-sm ring-1 ring-white/20 transition hover:bg-white/20"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="space-y-5 overflow-y-auto p-5">
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Meals</h3>
            <div className="grid grid-cols-3 gap-3">
              <MealCard icon={MdBreakfastDining} label="Breakfast" count={order.breakfastCount} tile="from-amber-50 to-amber-100" iconTone="bg-amber-400 text-white" />
              <MealCard icon={MdLunchDining} label="Lunch" count={order.lunchCount} tile="from-emerald-50 to-emerald-100" iconTone="bg-emerald-500 text-white" />
              <MealCard icon={MdDinnerDining} label="Dinner" count={order.dinnerCount} tile="from-indigo-50 to-indigo-100" iconTone="bg-indigo-500 text-white" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={FaHashtag} label="Service ID" value={order.serviceId} />
            <InfoRow icon={FaIdBadge} label="Customer ID" value={order.customerId} />
            <InfoRow icon={FaCalendarAlt} label="Date" value={formatDate(order.date)} />
            <InfoRow icon={FaUtensils} label="Total meals" value={totalMeals} />
          </div>

          {delivery.loading ? (
            <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ) : (
            <LocationSummary location={delivery.location} />
          )}

          <div className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white shadow-lg shadow-orange-500/25">
            <span className="text-sm font-semibold text-orange-50">Total cost</span>
            <span className="text-3xl font-extrabold tabular-nums">{formatINR(order.totalCost)}</span>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function OrderTable({ orders, onEdit }) {
  const [selected, setSelected] = useState(null);
  const now = useNow();

  const tryEdit = (o) => {
    const date = dateKey(o.date);
    const editable = MEAL_KEYS.some((m) => isMealOpen(date, m, now));
    if (!editable) return toast.error(closedMessage(date, "dinner"));
    onEdit(o);
  };

  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white">
              <FaHistory />
            </span>
            <div>
              <h2 className="text-base font-extrabold text-slate-900 sm:text-lg">Order history</h2>
              <p className="text-xs text-slate-500">Edit orders while their meal window is open.</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {orders.length} {orders.length === 1 ? "order" : "orders"}
          </span>
        </div>

        <div className="hidden grid-cols-12 gap-3 bg-slate-50 px-7 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 md:grid">
          <span className="col-span-4">Service / Date</span>
          <span className="col-span-3">Meals</span>
          <span className="col-span-2 text-right">Total</span>
          <span className="col-span-3 text-right">Action</span>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-2xl text-slate-400">
              <FaInbox />
            </span>
            <p className="mt-4 text-base font-bold text-slate-700">No orders yet</p>
            <p className="mt-1 text-sm text-slate-400">Tap “Add Order” to place your first meal order.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {orders.map((o) => {
              const date = dateKey(o.date);
              const editable = MEAL_KEYS.some((m) => isMealOpen(date, m, now));
              return (
                <li
                  key={o._id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition hover:bg-slate-50 sm:px-7 md:grid md:grid-cols-12"
                >
                  <div className="flex min-w-[170px] flex-1 items-center gap-3 md:col-span-4">
                    <DateTile date={date} />
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">{o.serviceId}</p>
                      <p className="text-xs text-slate-500">{formatDate(o.date)}</p>
                      <span
                        className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          editable ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {editable ? <FaCheckCircle /> : <FaLock />}
                        {editable ? "Editable" : "Closed"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 md:col-span-3">
                    <MealPill icon={MdBreakfastDining} short="B" count={o.breakfastCount} tone="bg-amber-50 text-amber-700 ring-amber-200" />
                    <MealPill icon={MdLunchDining} short="L" count={o.lunchCount} tone="bg-emerald-50 text-emerald-700 ring-emerald-200" />
                    <MealPill icon={MdDinnerDining} short="D" count={o.dinnerCount} tone="bg-indigo-50 text-indigo-700 ring-indigo-200" />
                  </div>

                  <p className="ml-auto text-lg font-extrabold tabular-nums text-slate-900 md:col-span-2 md:text-right">
                    {formatINR(o.totalCost)}
                  </p>

                  <div className="flex w-full justify-end gap-2 md:col-span-3 md:w-auto">
                    <button
                      onClick={() => setSelected(o)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                    >
                      <FaEye />
                      View
                    </button>
                    <button
                      onClick={() => tryEdit(o)}
                      aria-disabled={!editable}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                        editable
                          ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600"
                          : "cursor-not-allowed bg-slate-100 text-slate-400"
                      }`}
                    >
                      {editable ? <FaPen /> : <FaLock />}
                      Edit
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {selected && <OrderDetailModal order={selected} onClose={() => setSelected(null)} />}
    </>
  );
}