import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { FaUtensils, FaHistory, FaArrowRight } from "react-icons/fa";
import API from "../services/api";
import { formatINR } from "../assets/utils/pricing";
import { enableOneSignalForUser } from "../services/onesignal";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function RecentOrders({ orders, loading }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <FaHistory className="text-orange-500" />
          Recent orders
        </h2>
        <Link to="/services" className="text-sm font-semibold text-orange-600 hover:underline">
          View all
        </Link>
      </header>

      {loading ? (
        <div className="space-y-3 p-5 sm:p-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-2xl text-orange-500">
            <FaUtensils />
          </span>
          <p className="mt-3 font-semibold text-slate-800">No orders yet</p>
          <p className="mt-1 text-sm text-slate-500">Place your first meal order to see it here.</p>
          <Link
            to="/services"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition hover:bg-orange-600"
          >
            Order now <FaArrowRight className="text-xs" />
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {orders.map((o) => (
            <li key={o._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{o.serviceId}</p>
                <p className="text-sm text-slate-500">{formatDate(o.date)}</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-800">B {o.breakfastCount || 0}</span>
                <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-800">L {o.lunchCount || 0}</span>
                <span className="rounded-lg bg-indigo-100 px-2.5 py-1 text-indigo-800">D {o.dinnerCount || 0}</span>
              </div>
              <p className="ml-auto text-base font-extrabold tabular-nums text-slate-900">{formatINR(o.totalCost)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function CustomerDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/orders/my");
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Couldn't load your orders");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Link this device to the logged-in customer for push notifications
  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/push/me");
        if (data?.externalId) await enableOneSignalForUser(data.externalId);
      } catch {
        // push is optional: never block the dashboard
      }
    })();
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
        <Link
          to="/services"
          className="group relative flex items-center gap-5 overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 shadow-xl shadow-orange-500/25 transition hover:-translate-y-0.5 hover:shadow-2xl sm:p-8"
        >
          <span className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/15" />
          <span className="pointer-events-none absolute -bottom-16 right-24 h-40 w-40 rounded-full bg-white/10" />
          <span className="relative flex h-16 w-16 flex-none items-center justify-center rounded-2xl bg-white text-3xl text-orange-600 shadow-lg">
            <FaUtensils />
          </span>
          <div className="relative min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Orders / Services</h1>
            <p className="mt-1 text-sm font-medium text-orange-50 sm:text-base">
              Place meal orders, edit them in time and set your 10-day auto order.
            </p>
          </div>
          <FaArrowRight className="relative flex-none text-xl text-white transition group-hover:translate-x-1" />
        </Link>

        <RecentOrders orders={orders.slice(0, 5)} loading={loading} />
      </div>
    </div>
  );
}