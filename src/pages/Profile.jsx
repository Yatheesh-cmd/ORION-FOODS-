import { useEffect, useState } from "react";

import { toast } from "react-toastify";

import {
  FaIdBadge,
  FaUser,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaMapPin,
  FaSave,
  FaUndo,
  FaWallet,
  FaCheckCircle,
} from "react-icons/fa";

import API from "../services/api";

const FIELDS = [
  {
    key: "name",
    label: "Full name",
    icon: FaUser,
    type: "text",
    autoComplete: "name",
    span: "",
  },
  {
    key: "phone",
    label: "Phone number",
    icon: FaPhoneAlt,
    type: "tel",
    autoComplete: "tel",
    span: "",
  },
  {
    key: "email",
    label: "Email address",
    icon: FaEnvelope,
    type: "email",
    autoComplete: "email",
    span: "sm:col-span-2",
  },
  {
    key: "address",
    label: "Address",
    icon: FaMapMarkerAlt,
    type: "text",
    autoComplete: "street-address",
    span: "sm:col-span-2",
  },
  {
    key: "pincode",
    label: "Pincode",
    icon: FaMapPin,
    type: "text",
    autoComplete: "postal-code",
    span: "",
    inputMode: "numeric",
    maxLength: 6,
  },
];

const pick = (c) => ({
  name: c?.name || "",
  phone: c?.phone || "",
  email: c?.email || "",
  address: c?.address || "",
  pincode: c?.pincode || "",
});

const validate = (f) => {
  const e = {};

  if (!f.name.trim()) e.name = "Name is required";

  if (!/^[0-9+\-\s]{7,15}$/.test(f.phone.trim())) {
    e.phone = "Enter a valid phone number";
  }

  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) {
    e.email = "Enter a valid email address";
  }

  if (!f.address.trim()) e.address = "Address is required";

  if (!/^\d{6}$/.test(f.pincode.trim())) {
    e.pincode = "Enter a valid 6-digit pincode";
  }

  return e;
};

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function Profile() {
  const [customer, setCustomer] = useState(null);
  const [form, setForm] = useState(pick(null));
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/customers/me");

        setCustomer(data);
        setForm(pick(data));
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Couldn't load your profile"
        );
      }
    })();
  }, []);

  if (!customer) {
    return (
      <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
        <div className="h-48 animate-pulse rounded-[2rem] bg-slate-200" />

        <div className="grid gap-5 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
          <div className="h-28 animate-pulse rounded-3xl bg-slate-100" />
        </div>

        <div className="h-96 animate-pulse rounded-[2rem] bg-slate-100" />
      </div>
    );
  }

  const initial = (customer.name || "U").trim().charAt(0).toUpperCase();

  const original = pick(customer);

  const dirty = JSON.stringify(form) !== JSON.stringify(original);

  const errors = validate(form);

  const hasErrors = Object.keys(errors).length > 0;

  const missingPincode = !customer.pincode;

  const onChange = (key) => (e) => {
    let value = e.target.value;

    if (key === "pincode") {
      value = value.replace(/\D/g, "").slice(0, 6);
    }

    setForm((s) => ({
      ...s,
      [key]: value,
    }));
  };

  const submit = async (e) => {
    e.preventDefault();

    setTouched({
      name: true,
      phone: true,
      email: true,
      address: true,
      pincode: true,
    });

    if (hasErrors) {
      toast.error(Object.values(errors)[0]);
      return;
    }

    setSaving(true);

    try {
      const { data } = await API.put("/customers/me", form);

      setCustomer(data);
      setForm(pick(data));
      setTouched({});

      toast.success("Profile updated");

      window.dispatchEvent(new Event("profile:updated"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Couldn't update your profile"
      );
    } finally {
      setSaving(false);
    }
  };

  // Only Current Balance is kept here.
  // Total Meals, Current Meals and Member Since are removed.
  const stats = [
    {
      icon: FaWallet,
      label: "Current balance",
      value: money(customer.currentBalance),
      tone: "bg-emerald-50 text-emerald-600",
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-orange-50/60 via-slate-50 to-slate-50">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-10">

        {/* ============ HERO ============ */}
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-2xl shadow-slate-900/20 sm:p-9">
          <span className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/30 blur-3xl" />

          <span className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />

          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.07)_1px,transparent_0)] [background-size:22px_22px]" />

          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">

            <div className="rounded-[1.75rem] bg-gradient-to-br from-orange-400 to-amber-400 p-1 shadow-xl shadow-orange-500/30">
              <span className="flex h-24 w-24 items-center justify-center rounded-[1.5rem] bg-slate-900 text-5xl font-extrabold text-orange-400 sm:h-28 sm:w-28">
                {initial}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-orange-300">
                My Profile
              </p>

              <h1 className="mt-1 truncate text-2xl font-extrabold text-white sm:text-4xl">
                {customer.name}
              </h1>

              <p className="mt-1 truncate text-sm text-slate-300">
                {customer.email}
              </p>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">

                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold text-white ring-1 ring-white/20 backdrop-blur">
                  <FaIdBadge className="text-xs text-orange-300" />
                  {customer.customerId}
                </span>

                {customer.pincode && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-semibold text-slate-100 ring-1 ring-white/20 backdrop-blur">
                    <FaMapPin className="text-xs text-orange-300" />
                    {customer.pincode}
                  </span>
                )}

              </div>
            </div>
          </div>
        </section>

        {/* ============ STATS ============ */}
        <section className="grid grid-cols-1 gap-4">
          {stats.map(({ icon: Icon, label, value, tone }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span
                className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl text-lg ${tone}`}
              >
                <Icon />
              </span>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {label}
                </p>

                <p className="truncate text-xl font-extrabold text-slate-900">
                  {value}
                </p>
              </div>
            </div>
          ))}
        </section>

        {/* ============ PINCODE NOTICE (old accounts) ============ */}
        {missingPincode && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <FaMapPin className="mt-0.5 flex-none text-amber-500" />

            <p>
              <span className="font-bold">Add your pincode.</span> Your
              account doesn't have a pincode yet. Fill it in below and save.
            </p>
          </div>
        )}

        {/* ============ FORM ============ */}
        <form
          onSubmit={submit}
          noValidate
          className="overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-8">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 sm:text-xl">
                Personal details
              </h2>

              <p className="mt-0.5 text-sm text-slate-500">
                Keep your contact and delivery details up to date.
              </p>
            </div>

            {dirty ? (
              <span className="hidden items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200 sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            ) : (
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 sm:inline-flex">
                <FaCheckCircle className="text-[10px]" />
                All saved
              </span>
            )}
          </div>

          <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-8 sm:py-8">
            {FIELDS.map((f) => {
              const showError = touched[f.key] && errors[f.key];

              return (
                <div key={f.key} className={f.span}>
                  <label
                    htmlFor={`pf-${f.key}`}
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    {f.label}
                  </label>

                  <div className="group relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg bg-orange-50 text-sm text-orange-500 transition group-focus-within:bg-orange-500 group-focus-within:text-white">
                      <f.icon />
                    </span>

                    <input
                      id={`pf-${f.key}`}
                      type={f.type}
                      inputMode={f.inputMode}
                      maxLength={f.maxLength}
                      autoComplete={f.autoComplete}
                      value={form[f.key]}
                      onChange={onChange(f.key)}
                      onBlur={() =>
                        setTouched((t) => ({
                          ...t,
                          [f.key]: true,
                        }))
                      }
                      placeholder={
                        f.key === "pincode" ? "682001" : undefined
                      }
                      className={`w-full rounded-2xl border bg-slate-50 py-3.5 pl-14 pr-4 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-4 ${
                        showError
                          ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                          : "border-slate-200 focus:border-orange-500 focus:ring-orange-100"
                      }`}
                    />
                  </div>

                  {showError && (
                    <p className="mt-1.5 text-xs font-semibold text-red-500">
                      {errors[f.key]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-8">
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => {
                setForm(original);
                setTouched({});
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaUndo className="text-xs" />
              Reset
            </button>

            <button
              type="submit"
              disabled={!dirty || saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-amber-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              <FaSave />
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


