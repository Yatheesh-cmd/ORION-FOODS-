import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FaPlus,
  FaSyncAlt,
  FaWallet,
  FaUtensils,
  FaExclamationTriangle,
  FaReceipt,
  FaConciergeBell,
} from "react-icons/fa";
import API from "../services/api";
import OrderForm from "../components/OrderForm";
import OrderTable from "../components/OrderTable";
import AutoOrderModal from "../components/AutoOrderModal";
import { MIN_BALANCE, formatINR } from "../assets/utils/pricing";

export default function Services() {
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showAuto, setShowAuto] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, o] = await Promise.all([API.get("/customers/me"), API.get("/orders/my")]);
      setCustomer(c.data);
      setOrders(Array.isArray(o.data) ? o.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load your orders");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
    window.dispatchEvent(new Event("balance:refresh"));
  }, [load]);

  if (!customer) {
    return (
      <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
        <div className="h-44 animate-pulse rounded-[2rem] bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
        </div>
        <div className="h-64 animate-pulse rounded-[2rem] bg-slate-100" />
      </div>
    );
  }

  const balance = Number(customer.currentBalance || 0);
  const lowBalance = balance < MIN_BALANCE;

  const stats = [
    {
      label: "Current balance",
      value: formatINR(balance),
      icon: FaWallet,
      tone: lowBalance ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600",
      valueTone: lowBalance ? "text-red-600" : "text-slate-900",
      hint: lowBalance ? "Low balance" : "Available to order",
      hintTone: lowBalance ? "text-red-500" : "text-emerald-600",
    },
    {
      label: "Total meals",
      value: customer.totalMeals || 0,
      icon: FaUtensils,
      tone: "bg-orange-50 text-orange-600",
      valueTone: "text-slate-900",
      hint: "Meals ordered so far",
      hintTone: "text-slate-400",
    },
    {
      label: "Orders placed",
      value: orders.length,
      icon: FaReceipt,
      tone: "bg-blue-50 text-blue-600",
      valueTone: "text-slate-900",
      hint: "In your history",
      hintTone: "text-slate-400",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-100 via-slate-50 to-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        {/* ============ HERO ============ */}
        <header className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 p-6 shadow-2xl shadow-slate-900/20 sm:p-9">
          <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/25 blur-3xl" />
          <span className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-blue-500/25 blur-3xl" />
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:22px_22px]" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-2xl text-white shadow-lg shadow-orange-500/30">
                <FaConciergeBell />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">Meal services</p>
                <h1 className="mt-1 text-2xl font-extrabold text-white sm:text-4xl">My Orders</h1>
                <p className="mt-1 text-sm text-slate-300">Place, edit and track your meals in one place.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowAuto(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-white/10 px-5 py-3 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20 sm:flex-none"
              >
                <FaSyncAlt className="text-orange-300" />
                Set Auto Order
              </button>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-amber-600 active:scale-95 sm:flex-none"
              >
                <FaPlus className="text-xs" />
                Add Order
              </button>
            </div>
          </div>
        </header>

        {/* ============ STATS ============ */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, tone, valueTone, hint, hintTone }) => (
            <div
              key={label}
              className="group flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-900/5"
            >
              <span className={`flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-xl ${tone}`}>
                <Icon />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className={`truncate text-2xl font-extrabold tabular-nums ${valueTone}`}>{value}</p>
                <p className={`text-xs font-semibold ${hintTone}`}>{hint}</p>
              </div>
            </div>
          ))}
        </section>

        {lowBalance && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 px-5 py-4 text-red-700">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-red-100 text-red-600">
              <FaExclamationTriangle />
            </span>
            <p className="text-sm font-semibold leading-relaxed">
              Your balance is below {formatINR(MIN_BALANCE)}. Please add a payment soon. Your balance can never go to
              ₹0 or below.
            </p>
          </div>
        )}

        <OrderTable orders={orders} onEdit={setEditing} />
      </div>

      {showForm && (
        <OrderForm customer={customer} onClose={() => setShowForm(false)} onSuccess={refresh} />
      )}

      {editing && (
        <OrderForm customer={customer} order={editing} onClose={() => setEditing(null)} onSuccess={refresh} />
      )}

      <AutoOrderModal
        open={showAuto}
        balance={balance}
        onClose={() => setShowAuto(false)}
        onChanged={refresh}
      />
    </div>
  );
}
