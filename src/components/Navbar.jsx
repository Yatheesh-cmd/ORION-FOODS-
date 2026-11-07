import { useCallback, useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import {
  FaBars,
  FaTimes,
  FaSignOutAlt,
  FaTachometerAlt,
  FaUserShield,
  FaUserTie,
  FaArrowRight,
  FaWallet,
  FaUser,
  FaUtensils,
} from "react-icons/fa";
import { logo } from "../assets";
import { MIN_BALANCE, formatINR } from "../assets/utils/pricing";

const ROLE_LINK = {
  admin: { to: "/admin", label: "Admin", icon: FaUserShield },
  staff: { to: "/staff", label: "Staff", icon: FaUserTie },
};

const CUSTOMER_LINKS = [
  { to: "/customer", label: "Dashboard", icon: FaTachometerAlt, end: true },
  { to: "/services", label: "Orders", icon: FaUtensils },
  { to: "/customer/details", label: "Wallet", icon: FaWallet },
  { to: "/customer/profile", label: "Profile", icon: FaUser },
];

// Role badges tuned for the dark navbar.
const ROLE_BADGE = {
  customer: "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-300/40",
  staff: "bg-sky-400/20 text-sky-200 ring-1 ring-sky-300/40",
  admin: "bg-violet-400/20 text-violet-200 ring-1 ring-violet-300/40",
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  const isCustomer = user?.role === "customer";

  const loadProfile = useCallback(async () => {
    if (!isCustomer) {
      setProfile(null);
      return;
    }
    try {
      const { data } = await API.get("/customers/me");
      setProfile(data);
    } catch {
      setProfile(null);
    }
  }, [isCustomer]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile, location.pathname]);

  useEffect(() => {
    window.addEventListener("balance:refresh", loadProfile);
    window.addEventListener("profile:updated", loadProfile);
    return () => {
      window.removeEventListener("balance:refresh", loadProfile);
      window.removeEventListener("profile:updated", loadProfile);
    };
  }, [loadProfile]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Shrink + deepen the shadow once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu with Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate("/login");
  };

  const roleLink = user ? ROLE_LINK[user.role] : null;
  const displayName = profile?.name || user?.name || "";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const balance = Number(profile?.currentBalance || 0);
  const lowBalance = Boolean(profile) && balance < MIN_BALANCE;

  const navLinkClass = ({ isActive }) =>
    `group relative inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all duration-300 ${
      isActive
        ? "bg-white/10 text-white ring-1 ring-white/15 shadow-inner"
        : "text-blue-100/80 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white"
    }`;

  // Small round icon button used on mobile (dashboard / wallet / profile).
  const mobileIconClass = ({ isActive }) =>
    `flex h-9 min-w-[2.25rem] flex-col items-center justify-center rounded-xl text-sm shadow-sm ring-1 transition-all duration-300 active:scale-90 sm:h-10 sm:min-w-[2.5rem] ${
      isActive
        ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/40 ring-violet-200/50"
        : "bg-white/10 text-violet-300 ring-white/15 hover:bg-white/20"
    }`;

  return (
    <header
      className={`sticky top-0 z-50 border-b border-white/10 bg-[#0b1b3f]/85 backdrop-blur-xl transition-all duration-300 ${
        scrolled ? "shadow-xl shadow-black/30" : "shadow-md shadow-black/10"
      }`}
    >
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-violet-500 via-fuchsia-400 to-orange-400" />
      {/* soft glow */}
      <div className="pointer-events-none absolute -top-10 right-10 h-24 w-48 rounded-full bg-violet-400/20 blur-3xl" />

      <nav
        className={`relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 transition-all duration-300 sm:px-6 ${
          scrolled ? "h-14" : "h-16"
        }`}
      >
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center overflow-hidden rounded-xl bg-white shadow-lg shadow-black/20 ring-2 ring-violet-300/60 transition duration-300 group-hover:rotate-6 group-hover:scale-105">
            <img src={logo} alt="ORION Foods logo" className="h-7 w-7 object-contain" />
          </span>
          <span className="truncate text-lg font-extrabold tracking-tight text-white">
            ORION{" "}
            <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">Foods</span>
          </span>
        </Link>

        {/* ---------------- desktop ---------------- */}
        <div className="hidden items-center gap-1.5 md:flex">
          {!user && (
            <>
              <NavLink to="/login" className={navLinkClass}>
                Login
              </NavLink>
              <Link
                to="/register"
                className="group ml-1 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition duration-300 hover:-translate-y-0.5 hover:from-orange-600 hover:to-amber-600"
              >
                Signup
                <FaArrowRight className="text-[10px] transition group-hover:translate-x-1" />
              </Link>
            </>
          )}

          {isCustomer &&
            CUSTOMER_LINKS.map((l) => {
              const isWallet = l.label === "Wallet";
              return (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  aria-label={l.label}
                  title={l.label}
                  className={navLinkClass}
                >
                  {({ isActive }) => (
                    <>
                      <l.icon className={`text-xs transition ${isActive ? "text-violet-300" : "text-violet-300/70 group-hover:text-violet-300"}`} />
                      {!isWallet && l.label}
                      {isWallet && profile && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            lowBalance
                              ? "bg-red-500/20 text-red-200 ring-1 ring-red-400/40"
                              : "bg-violet-400/20 text-violet-100 ring-1 ring-violet-300/40"
                          }`}
                        >
                          {formatINR(balance)}
                        </span>
                      )}
                      {isActive && (
                        <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-violet-300 to-fuchsia-300" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}

          {user && !isCustomer && roleLink && (
            <NavLink to={roleLink.to} className={navLinkClass}>
              <roleLink.icon className="text-xs text-violet-300" />
              {roleLink.label}
            </NavLink>
          )}

          {user && (
            <>
              <div className="ml-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-4 backdrop-blur transition duration-300 hover:bg-white/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-md shadow-fuchsia-500/30 ring-2 ring-white/20">
                  {initial}
                </span>
                <div className="leading-tight">
                  <p className="max-w-[140px] truncate text-sm font-semibold text-white">{displayName}</p>
                  <span
                    className={`mt-0.5 inline-block rounded-full px-2 py-px text-[10px] font-bold uppercase tracking-wide ${
                      ROLE_BADGE[user.role] || "bg-white/10 text-slate-200"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition duration-300 hover:bg-red-500 hover:ring-red-400"
              >
                <FaSignOutAlt className="text-xs" />
                Logout
              </button>
            </>
          )}
        </div>

        {/* ---------------- mobile ---------------- */}
        <div className="flex items-center gap-1.5 md:hidden">
          {isCustomer && (
            <>
              <NavLink to="/customer" end aria-label="Dashboard" className={mobileIconClass}>
                <FaTachometerAlt />
              </NavLink>

              <NavLink
                to="/customer/details"
                aria-label="Wallet"
                className={(s) => `${mobileIconClass(s)} gap-0.5 px-1.5`}
              >
                {({ isActive }) => (
                  <>
                    <FaWallet className="text-[13px]" />
                    <span
                      className={`text-[9px] font-extrabold leading-none ${
                        isActive ? "text-white" : lowBalance ? "text-red-300" : "text-violet-100"
                      }`}
                    >
                      {profile ? formatINR(balance) : "…"}
                    </span>
                  </>
                )}
              </NavLink>

              <NavLink to="/customer/profile" aria-label="Profile" className={mobileIconClass}>
                <FaUser />
              </NavLink>
            </>
          )}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 transition duration-300 hover:bg-white/20 active:scale-90 sm:h-10 sm:w-10"
          >
            <span className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`}>
              {open ? <FaTimes /> : <FaBars />}
            </span>
          </button>
        </div>
      </nav>

      {/* ---------------- mobile menu (smooth open/close) ---------------- */}
      <div
        className={`absolute inset-x-0 top-full overflow-hidden border-b border-white/10 bg-[#0b1b3f]/95 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all duration-300 ease-out md:hidden ${
          open ? "max-h-[34rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
        }`}
      >
        <div className="p-4">
          {!user && (
            <div className="grid gap-3">
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-xl bg-white/10 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/20"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:from-orange-600 hover:to-amber-600"
              >
                Signup
                <FaArrowRight className="text-[10px]" />
              </Link>
            </div>
          )}

          {user && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 font-bold text-white shadow-md shadow-fuchsia-500/30 ring-2 ring-white/20">
                  {initial}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate font-semibold text-white">{displayName}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-px text-[10px] font-bold uppercase tracking-wide ${
                      ROLE_BADGE[user.role] || "bg-white/10 text-slate-200"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              {isCustomer &&
                CUSTOMER_LINKS.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end} className={(s) => `${navLinkClass(s)} w-full py-3`}>
                    <l.icon className="text-xs text-violet-300" />
                    {l.label}
                  </NavLink>
                ))}

              {!isCustomer && roleLink && (
                <NavLink to={roleLink.to} className={(s) => `${navLinkClass(s)} w-full py-3`}>
                  <roleLink.icon className="text-xs text-violet-300" />
                  {roleLink.label}
                </NavLink>
              )}

              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-semibold text-white ring-1 ring-white/15 transition duration-300 hover:bg-red-500 hover:ring-red-400"
              >
                <FaSignOutAlt className="text-xs" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}