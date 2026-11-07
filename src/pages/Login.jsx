import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaArrowRight,
  FaSpinner,
  FaUtensils,
  FaCreditCard,
  FaClock,
  FaShieldAlt,
  FaUserPlus,
} from "react-icons/fa";
import { GiHotMeal } from "react-icons/gi";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const PERKS = [
  { icon: FaUtensils, title: "Easy ordering", text: "Set breakfast, lunch and dinner counts in a tap." },
  { icon: FaCreditCard, title: "UPI & GPay payments", text: "Pay instantly and track your balance." },
  { icon: FaClock, title: "Live order tracking", text: "Follow every order until it arrives." },
];

function GoogleLogo({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [notRegistered, setNotRegistered] = useState(false);

  const goToDashboard = (user) => {
    if (user.role === "admin") navigate("/admin");
    else if (user.role === "staff") navigate("/staff");
    else navigate("/customer");
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      goToDashboard(user);
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSuccess = async (response) => {
    if (!response?.credential) return toast.error("Google sign-in failed. Please try again.");
    setNotRegistered(false);
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle(response.credential);
      goToDashboard(user);
    } catch (err) {
      if (err.response?.data?.code === "NOT_REGISTERED") {
        setNotRegistered(true);
      } else {
        toast.error(err.response?.data?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-52px)] items-center justify-center overflow-hidden bg-slate-100 px-4 py-10 sm:px-6">
      {/* page background */}
      <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-400/25 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-orange-400/25 blur-3xl" />

      {/* ONE card: brand panel + form sit flush together */}
      <div className="animate-rise relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 lg:grid-cols-[5fr_6fr]">
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
              Your meals for the day, sorted in a few taps.
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

          <p className="relative z-10 text-xs text-blue-200/60">
            © {new Date().getFullYear()} ORION FoodOrder
          </p>
        </aside>

        {/* ===================== RIGHT: FORM ===================== */}
        <main className="flex items-center px-6 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto w-full max-w-sm">
            {/* mobile brand */}
            <Link to="/" className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-xl text-white">
                <GiHotMeal />
              </span>
              <span className="font-display text-lg font-bold text-slate-900">ORION FoodOrder</span>
            </Link>

            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <FaLock className="text-[10px]" /> Secure sign in
            </span>
            <h2 className="mt-4 text-3xl font-extrabold">Welcome back</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Sign in and we'll take you straight to your customer, staff or admin dashboard.
            </p>

            {/* ---------- Google login ---------- */}
            {GOOGLE_CLIENT_ID && (
              <div className="mt-8">
                <div
                  className={`group relative h-12 overflow-hidden rounded-2xl ${
                    googleLoading ? "pointer-events-none" : ""
                  }`}
                >
                  {/* visible custom button */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:border-blue-300 group-hover:shadow-lg group-hover:shadow-blue-500/10 group-active:translate-y-0 group-active:scale-[0.99]">
                    {googleLoading ? (
                      <>
                        <FaSpinner className="animate-spin text-slate-400" />
                        Logging in with Google…
                      </>
                    ) : (
                      <>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 ring-1 ring-slate-200 transition group-hover:bg-white group-hover:ring-blue-200">
                          <GoogleLogo className="h-[18px] w-[18px]" />
                        </span>
                        <span>Sign in with Google</span>
                        <FaArrowRight className="ml-auto text-xs text-slate-300 transition duration-200 group-hover:translate-x-1 group-hover:text-blue-500" />
                      </>
                    )}
                  </div>

                  {/* real Google button: invisible, stretched over the custom one so clicks work */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0"
                    style={{ transform: "scale(1.25)" }}
                  >
                    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                      <GoogleLogin
                        onSuccess={onGoogleSuccess}
                        onError={() => toast.error("Google sign-in failed. Please try again.")}
                        text="signin_with"
                        shape="rectangular"
                        theme="outline"
                        size="large"
                        width="400"
                      />
                    </GoogleOAuthProvider>
                  </div>
                </div>

                {/* not registered notice */}
                {notRegistered && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5"
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <FaUserPlus className="text-sm" />
                    </span>
                    <div className="text-xs leading-relaxed text-amber-900">
                      <p className="font-bold">This Google account is not registered</p>
                      <p className="mt-0.5">
                        Please create an account first, then you can login via Google.{" "}
                        <Link to="/register" className="font-bold text-orange-600 underline underline-offset-2 hover:text-orange-700">
                          Register now
                        </Link>
                      </p>
                    </div>
                  </div>
                )}

                <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] font-medium text-slate-400">
                  <FaShieldAlt className="text-emerald-500" />
                  For registered users · We never see your Google password
                </p>

                <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-slate-400">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent to-slate-200" />
                  or use email
                  <span className="h-px flex-1 bg-gradient-to-l from-transparent to-slate-200" />
                </div>
              </div>
            )}

            <form onSubmit={submit} className={`${GOOGLE_CLIENT_ID ? "" : "mt-8"} space-y-5`}>
              <div>
                <label htmlFor="email" className="field-label">
                  Email address
                </label>
                <div className="group relative">
                  <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600" />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field bg-slate-50 pl-11 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="field-label">
                  Password
                </label>
                <div className="group relative">
                  <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition group-focus-within:text-blue-600" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-field bg-slate-50 pl-11 pr-12 focus:bg-white"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-blue-700"
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in <FaArrowRight className="text-xs" />
                  </>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              New here?
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <Link to="/register" className="btn-outline w-full py-3">
              Create an account
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}