import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FaPlus, FaUser, FaCreditCard, FaWallet, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import API from "../services/api";
import PaymentModal from "../components/PaymentModal";
import { MIN_BALANCE, formatINR } from "../assets/utils/pricing";

const STATUS_STYLE = {
  confirmed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
  processing: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  pending: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
};

const formatDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function Row({ icon: Icon, label, tone, children }) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl text-base ${tone}`}>
          <Icon />
        </span>
        <p className="text-sm font-medium text-slate-500">{label}</p>
      </div>
      <div className="min-w-0 text-right">{children}</div>
    </li>
  );
}

export default function CustomerDetails() {
  const [customer, setCustomer] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([API.get("/customers/me"), API.get("/payments/my")]);
      setCustomer(c.data);
      setPayments(Array.isArray(p.data) ? p.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load your wallet");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const afterPayment = async () => {
    await load();
    window.dispatchEvent(new Event("balance:refresh"));
  };

  if (!customer) {
    return (
      <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-56 animate-pulse rounded-3xl bg-slate-200" />
        <div className="h-64 animate-pulse rounded-3xl bg-slate-100" />
      </div>
    );
  }

  const balance = Number(customer.currentBalance || 0);
  const lowBalance = balance < MIN_BALANCE;
  const pct = Math.max(0, Math.min(100, Math.round((balance / MIN_BALANCE) * 100)));
  const last = payments[0];
  const status = last?.status;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">
        {/* ============ TITLE ============ */}
        <header>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">My Wallet</h1>
          <p className="mt-1 text-sm text-slate-500">Your balance and payment status.</p>
        </header>

        {/* ============ BALANCE CARD ============ */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 text-white shadow-xl shadow-indigo-900/20 sm:p-8">
          <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-violet-400/20 blur-2xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-100">Current balance</p>
                <p className="mt-1 truncate text-4xl font-extrabold tabular-nums sm:text-5xl">{formatINR(balance)}</p>
              </div>
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/15 text-xl backdrop-blur">
                <FaWallet />
              </span>
            </div>

            <span
              className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                lowBalance ? "bg-rose-500 text-white" : "bg-white/15 text-white"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${lowBalance ? "bg-white" : "bg-sky-300"}`} />
              {lowBalance ? "Low balance" : "Balance healthy"}
            </span>

            <div className="mt-6">
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${lowBalance ? "bg-rose-300" : "bg-sky-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-medium text-indigo-100">Minimum balance {formatINR(MIN_BALANCE)}</p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg shadow-indigo-950/20 transition hover:bg-indigo-50 active:scale-95 sm:w-auto"
            >
              <FaPlus className="text-xs" />
              Add Payment
            </button>
          </div>
        </section>

        {lowBalance && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <FaExclamationTriangle />
            </span>
            <p className="text-sm font-semibold leading-relaxed">
              Your balance is below {formatINR(MIN_BALANCE)}. Please add a payment soon to keep your orders running.
            </p>
          </div>
        )}

        {/* ============ ACCOUNT SUMMARY ============ */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Account summary</h2>
          </header>

          <ul className="divide-y divide-slate-100">
            <Row icon={FaUser} label="Name" tone="bg-sky-50 text-sky-600">
              <p className="truncate text-base font-bold text-slate-900">{customer.name}</p>
            </Row>

            <Row icon={FaCreditCard} label="Total payments" tone="bg-violet-50 text-violet-600">
              <p className="text-base font-bold tabular-nums text-slate-900">
                {formatINR(customer.totalPaymentsReceived)}
              </p>
            </Row>

            <Row icon={FaCheckCircle} label="Payment status" tone="bg-indigo-50 text-indigo-600">
              {status ? (
                <>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold capitalize ${
                      STATUS_STYLE[status] || "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    {status}
                  </span>
                  {(last?.amount || last?.createdAt) && (
                    <p className="mt-1 text-xs text-slate-400">
                      {last?.amount ? formatINR(last.amount) : ""}
                      {last?.amount && last?.createdAt ? " · " : ""}
                      {formatDate(last?.createdAt)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-base font-bold text-slate-400">—</p>
              )}
            </Row>
          </ul>
        </section>
      </div>

      {showModal && <PaymentModal onClose={() => setShowModal(false)} onSuccess={afterPayment} />}
    </div>
  );
}