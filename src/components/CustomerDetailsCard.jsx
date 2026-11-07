import { Link } from "react-router-dom";
import { FaIdBadge, FaEnvelope, FaPhoneAlt, FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";

/* Ajinomoto-inspired palette (edit hex values here) */
const C = {
  blue: "#0b3a8c",
  blueDark: "#072a66",
  blueSoft: "#e8efff",
  red: "#d9262c",
  redDark: "#b81c22",
};

function InfoTile({ icon: Icon, label, value, className = "" }) {
  return (
    <div
      className={`group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#0b3a8c]/30 hover:shadow-lg hover:shadow-[#0b3a8c]/10 ${className}`}
    >
      <span
        className="flex h-11 w-11 flex-none items-center justify-center rounded-xl text-lg transition group-hover:text-white group-hover:[background-color:#0b3a8c]"
        style={{ backgroundColor: C.blueSoft, color: C.blue }}
      >
        <Icon />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-0.5 break-words text-base font-semibold text-slate-900">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function CustomerDetailsCard({ customer }) {
  const initial = customer?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  return (
    <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5">
      {/* Header banner */}
      <div
        className="relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10"
        style={{ background: `linear-gradient(135deg, ${C.blueDark} 0%, ${C.blue} 60%, #1b5ad0 100%)` }}
      >
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-white/10" />
        <div
          className="pointer-events-none absolute -bottom-20 right-24 h-48 w-48 rounded-full opacity-40 blur-2xl"
          style={{ backgroundColor: C.red }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1.5" style={{ backgroundColor: C.red }} />

        <div className="relative z-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <span
            className="flex h-20 w-20 flex-none items-center justify-center rounded-3xl text-4xl font-extrabold text-white shadow-lg ring-4 ring-white/20"
            style={{ backgroundColor: C.red }}
          >
            {initial}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100/80">My Profile</p>
            <h2 className="mt-1 break-words text-2xl font-extrabold text-white sm:text-3xl">
              {customer?.name || "Customer"}
            </h2>
            <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur">
              <FaIdBadge className="text-xs" />
              {customer?.customerId || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 sm:p-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoTile icon={FaEnvelope} label="Email" value={customer?.email} />
          <InfoTile icon={FaPhoneAlt} label="Phone" value={customer?.phone} />
          <InfoTile icon={FaMapMarkerAlt} label="Address" value={customer?.address} className="sm:col-span-2" />
        </div>

        <Link
          to="/customer/details"
          className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-base font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus-visible:ring-4 focus-visible:ring-[#d9262c]/30 sm:w-auto"
          style={{ backgroundColor: C.red }}
        >
          View account details
          <FaArrowRight className="text-xs transition group-hover:translate-x-1" />
        </Link>
      </div>
    </section>
  );
}