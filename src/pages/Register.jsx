import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  FaUser,
  FaPhone,
  FaMapMarkerAlt,
  FaMapPin,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaSpinner,
  FaUtensils,
  FaCreditCard,
  FaClock,
} from "react-icons/fa";
import { GiHotMeal } from "react-icons/gi";

const PERKS = [
  { icon: FaUtensils, title: "Free to join", text: "Create your account in under a minute." },
  { icon: FaCreditCard, title: "UPI & GPay payments", text: "Pay instantly and track your balance." },
  { icon: FaClock, title: "Live order tracking", text: "Follow every order from your own dashboard." },
];

/* Simple 0–4 password strength score */
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["bg-slate-200", "bg-red-500", "bg-orange-500", "bg-blue-500", "bg-green-500"];

function IconInput({ id, label, icon: Icon, children }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="group relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600" />
        {children}
      </div>
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    pincode: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const updatePincode = (e) =>
    setForm({ ...form, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) });
  const strength = getStrength(form.password);
  const field = "input-field bg-slate-50 pl-11 focus:bg-white";

  const submit = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(form.pincode)) {
      toast.error("Enter a valid 6-digit pincode");
      return;
    }

    setLoading(true);
    try {
      // Public sign-up always creates a customer account.
      const user = await register({ ...form, role: "customer" });
      if (user?.role === "admin") navigate("/admin");
      else if (user?.role === "staff") navigate("/staff");
      else navigate("/customer");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-52px)] items-center justify-center overflow-hidden bg-slate-100 px-4 py-10 sm:px-6">
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-400/25 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-orange-400/25 blur-3xl" />

      <div className="animate-rise relative z-10 grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 lg:grid-cols-[2fr_3fr]">
        {/* ===================== LEFT: BRAND PANEL ===================== */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-10 lg:flex">
          <div className="bg-grid-dark absolute inset-0" />
          <div className="absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />
          <div className="absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-orange-500/30 blur-3xl" />

          <Link to="/" className="relative z-10 flex items-center gap-3 text-white">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500 text-2xl shadow-lg shadow-orange-500/30">
              <GiHotMeal />
            </span>
            <span className="font-display text-xl font-bold">ORION FoodOrder</span>
          </Link>

          <div className="relative z-10 my-10">
            <h1 className="text-3xl font-extrabold leading-tight text-white xl:text-4xl">
              Create your account and place your first order today.
            </h1>
            <ul className="mt-8 space-y-3">
              {PERKS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="glass flex items-start gap-4 rounded-2xl p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/90 text-white shadow-lg shadow-orange-500/20">
                    <Icon />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-blue-100/75">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-xs text-blue-200/60">© {new Date().getFullYear()} ORION FoodOrder</p>
        </aside>

        {/* ===================== RIGHT: FORM ===================== */}
        <main className="px-6 py-10 sm:px-12 sm:py-12">
          <div className="mx-auto w-full max-w-xl">
            <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl text-white">
                <GiHotMeal />
              </span>
              <span className="font-display text-lg font-bold text-slate-900">ORION FoodOrder</span>
            </Link>

            <h2 className="text-3xl font-extrabold">Create account</h2>
            <p className="mt-2 text-sm text-slate-500">Fill in your details to start ordering meals.</p>

            <form onSubmit={submit} className="mt-7 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <IconInput id="name" label="Full name" icon={FaUser}>
                  <input
                    id="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={update("name")}
                    className={field}
                  />
                </IconInput>

                <IconInput id="phone" label="Phone number" icon={FaPhone}>
                  <input
                    id="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="9876543210"
                    value={form.phone}
                    onChange={update("phone")}
                    className={field}
                  />
                </IconInput>
              </div>

              <IconInput id="email" label="Email address" icon={FaEnvelope}>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update("email")}
                  className={field}
                />
              </IconInput>

              <div className="grid gap-5 md:grid-cols-[2fr_1fr]">
                <IconInput id="address" label="Address" icon={FaMapMarkerAlt}>
                  <input
                    id="address"
                    type="text"
                    required
                    autoComplete="street-address"
                    placeholder="123 Main St, City"
                    value={form.address}
                    onChange={update("address")}
                    className={field}
                  />
                </IconInput>

                <IconInput id="pincode" label="Pincode" icon={FaMapPin}>
                  <input
                    id="pincode"
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    pattern="\d{6}"
                    title="Enter a 6-digit pincode"
                    autoComplete="postal-code"
                    placeholder="682001"
                    value={form.pincode}
                    onChange={updatePincode}
                    className={field}
                  />
                </IconInput>
              </div>

              <div>
                <IconInput id="password" label="Password" icon={FaLock}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={form.password}
                    onChange={update("password")}
                    className={`${field} pr-12`}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-blue-700"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </IconInput>

                {form.password && (
                  <div className="mt-3">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            i <= strength ? STRENGTH_COLORS[strength] : "bg-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">
                      {STRENGTH_LABELS[strength]} · use 8+ characters with upper and lower case, a number and a
                      symbol
                    </p>
                  </div>
                )}
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" /> Creating account…
                  </>
                ) : (
                  <>
                    Create account <FaArrowRight className="text-xs" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-blue-700 hover:text-orange-500 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
