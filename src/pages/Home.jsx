import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  FaUtensils,
  FaArrowRight,
  FaClock,
  FaPlus,
  FaMinus,
  FaCheckCircle,
  FaUser,
  FaUserTie,
  FaUserShield,
  FaBolt,
  FaTimes,
  FaTag,
  FaSearchPlus,
  FaIndustry,
  FaLeaf,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
} from "react-icons/fa";
import { GiHotMeal } from "react-icons/gi";
import { MdOutlineFastfood, MdPayment } from "react-icons/md";

import { about1, about2 } from "../assets/index";
import { PRICE, FULL_DAY_PRICE, TWO_MEAL_PRICE, normalCost, autoDayCost, formatINR } from "../assets/utils/pricing";

const CHEF_LOGO =
  "https://png.pngtree.com/png-clipart/20240202/original/pngtree-chef-logo-for-culinary-png-image_14215663.png";

/* ------------------------------------------------------------------ */
/*  Auth-aware links                                                   */
/* ------------------------------------------------------------------ */

// If you use an AuthContext, replace the body with: const { user } = useAuth(); return user || null;
const getAuth = () => {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (!token && !user) return null;
    return user || { role: "customer" };
  } catch {
    return null;
  }
};

const dashboardFor = (role) => (role === "admin" ? "/admin" : role === "staff" ? "/staff" : "/customer");

/* ------------------------------------------------------------------ */
/*  Scroll helpers                                                     */
/* ------------------------------------------------------------------ */

/* One shared scroll listener for every Reveal: works for fast scrolling in both directions */
const revealers = new Set();
let revealTicking = false;

const runRevealers = () => {
  revealTicking = false;
  revealers.forEach((fn) => fn());
};

const queueReveal = () => {
  if (revealTicking) return;
  revealTicking = true;
  requestAnimationFrame(runRevealers);
};

const addRevealer = (fn) => {
  if (revealers.size === 0) {
    window.addEventListener("scroll", queueReveal, { passive: true });
    window.addEventListener("resize", queueReveal);
    window.addEventListener("load", queueReveal);
  }
  revealers.add(fn);
};

const removeRevealer = (fn) => {
  revealers.delete(fn);
  if (revealers.size === 0) {
    window.removeEventListener("scroll", queueReveal);
    window.removeEventListener("resize", queueReveal);
    window.removeEventListener("load", queueReveal);
  }
};

/** Fades + slides its children in once. Anything on screen OR already scrolled past is always shown. */
function Reveal({ children, delay = 0, y = 36, x = 0, scale = 1, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const [small] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(true);
      return undefined;
    }

    const check = () => {
      const r = el.getBoundingClientRect();
      // on screen, already above the screen (fast scroll / jump), or just about to enter
      if (r.top < window.innerHeight * 0.95) {
        setShown(true);
        removeRevealer(check);
      }
    };

    addRevealer(check);
    check();
    // layout can shift while images load, so re-check a couple of times
    const t1 = setTimeout(check, 300);
    const t2 = setTimeout(check, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      removeRevealer(check);
    };
  }, []);

  // lighter, shorter animation on phones (no sideways slide, so no horizontal wobble)
  const dy = small ? Math.min(y, 22) : y;
  const dx = small ? 0 : x;
  const dur = small ? 0.55 : 0.8;
  const dl = small ? Math.min(delay, 80) : delay;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(${dx}px, ${dy}px, 0) scale(${scale})`,
        transition: `opacity ${dur}s cubic-bezier(.2,.7,.2,1) ${dl}ms, transform ${dur}s cubic-bezier(.2,.7,.2,1) ${dl}ms`,
        willChange: shown ? "auto" : "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

/** Thin progress bar at the top of the page. */
function ScrollProgress() {
  const bar = useRef(null);

  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";

    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      if (bar.current) bar.current.style.width = `${p}%`;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.documentElement.style.scrollBehavior = prev;
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1">
      <div
        ref={bar}
        className="h-full w-0 bg-gradient-to-r from-blue-500 via-orange-400 to-amber-300 shadow-[0_0_10px_rgba(251,146,60,.7)]"
      />
    </div>
  );
}

/** Tilts its child slightly towards the mouse (desktop only). */
function Tilt({ children, max = 7 }) {
  const ref = useRef(null);
  const enabled = useRef(true);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;
    enabled.current = !reduce && fine;
  }, []);

  const move = (e) => {
    if (!enabled.current || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(1100px) rotateY(${px * max}deg) rotateX(${-py * max}deg) translateZ(0)`;
  };
  const leave = () => {
    if (ref.current) ref.current.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg)";
  };

  return (
    <div onMouseMove={move} onMouseLeave={leave}>
      <div ref={ref} style={{ transition: "transform .25s ease-out", transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  );
}

/** Counts from 0 to `to` once on mount. */
function CountUp({ to, duration = 1200 }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(to);
      return undefined;
    }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration]);

  return <>{n}</>;
}

/* ------------------------------------------------------------------ */
/*  Hero extras                                                        */
/* ------------------------------------------------------------------ */

// Each meal gets its own colour (no blue, so it stands out on the blue hero background).
const ROTATE = [
  { emoji: "🌅", word: "Breakfast", color: "from-orange-500 to-amber-400 shadow-orange-500/40" },
  { emoji: "☀️", word: "Lunch", color: "from-emerald-500 to-lime-400 shadow-emerald-500/40" },
  { emoji: "🌙", word: "Dinner", color: "from-fuchsia-500 to-rose-500 shadow-fuchsia-500/40" },
];

function RotatingMeal() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % ROTATE.length), 2200);
    return () => clearInterval(t);
  }, []);

  const m = ROTATE[i];
  return (
    <span
      key={m.word}
      className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-1.5 text-sm font-extrabold text-white shadow-lg ring-1 ring-white/30 transition-colors ${m.color}`}
      style={{ animation: "homeSlide .45s ease-out" }}
    >
      <span className="text-base">{m.emoji}</span>
      {m.word}
    </span>
  );
}

const HERO_STATS = [
  { value: 7, suffix: "", label: "Days of fresh menu", emoji: "📅" },
  { value: 3, suffix: "", label: "Meals served daily", emoji: "🍽️" },
  { value: 10, suffix: "-day", label: "Auto order plans", emoji: "⚡" },
];

/* ------------------------------------------------------------------ */
/*  Hero sample card                                                   */
/* ------------------------------------------------------------------ */

const SAMPLE_MEALS = [
  {
    key: "breakfast",
    label: "Breakfast",
    time: "7:30 AM",
    price: PRICE.breakfast,
    emoji: "☕",
    tile: "from-amber-100 to-orange-200",
  },
  {
    key: "lunch",
    label: "Lunch",
    time: "1:00 PM",
    price: PRICE.lunch,
    emoji: "🍛",
    tile: "from-orange-100 to-rose-200",
  },
  {
    key: "dinner",
    label: "Dinner",
    time: "8:00 PM",
    price: PRICE.dinner,
    emoji: "🍲",
    tile: "from-blue-100 to-indigo-200",
  },
];

function SampleOrderCard() {
  const [counts, setCounts] = useState({ breakfast: 1, lunch: 1, dinner: 1 });

  const change = (key, delta) =>
    setCounts((c) => ({ ...c, [key]: Math.max(0, Math.min(9, c[key] + delta)) }));

  const picked = SAMPLE_MEALS.filter((m) => counts[m.key] > 0);
  const items = SAMPLE_MEALS.reduce((sum, m) => sum + counts[m.key], 0);
  const regular = normalCost(counts.breakfast, counts.lunch, counts.dinner);
  const comboPossible = picked.length >= 2;
  const offerOn = comboPossible && picked.every((m) => counts[m.key] === 1);
  const payable = offerOn ? autoDayCost(counts.breakfast, counts.lunch, counts.dinner) : regular;
  const saved = regular - payable;

  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute inset-0 -z-0 scale-95 rounded-[2rem] bg-gradient-to-br from-blue-400/40 to-orange-400/40 blur-2xl" />

      <div className="animate-float absolute -left-5 -top-6 z-20 hidden items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-xl ring-1 ring-slate-900/5 sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-green-600">
          <FaCheckCircle />
        </span>
        Payment received
      </div>
      <div className="animate-float-slow absolute -bottom-5 -right-4 z-20 hidden items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-xl shadow-orange-500/30 sm:flex">
        <FaClock /> Ready in 12 min
      </div>

      <div className="relative z-10 overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/30 ring-1 ring-white/40">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-orange-500" />

        <div className="p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">Today's order</h3>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                  </span>
                  Live
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">Sample – try the counters</p>
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FaUtensils />
            </span>
          </div>

          <ul className="space-y-3">
            {SAMPLE_MEALS.map(({ key, label, time, price, emoji, tile }) => {
              const active = counts[key] > 0;
              return (
                <li
                  key={key}
                  className={`group flex items-center justify-between rounded-2xl border p-3 transition-all duration-200 ${
                    active
                      ? "border-orange-200 bg-orange-50/50 shadow-sm"
                      : "border-slate-100 bg-slate-50 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-2xl shadow-inner transition-transform duration-200 group-hover:scale-110 ${tile}`}
                    >
                      <span aria-hidden="true">{emoji}</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                      <p className="text-xs text-slate-500">
                        {time} · ₹{price} each
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                      <button
                        type="button"
                        aria-label={`Remove one ${label}`}
                        onClick={() => change(key, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-blue-700"
                      >
                        <FaMinus className="text-[10px]" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold text-slate-900">{counts[key]}</span>
                      <button
                        type="button"
                        aria-label={`Add one ${label}`}
                        onClick={() => change(key, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700 text-white transition hover:bg-blue-800"
                      >
                        <FaPlus className="text-[10px]" />
                      </button>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">₹{price * counts[key]}</span>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-5 overflow-hidden rounded-2xl bg-[#0b1b3f] text-white">
            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-xs text-blue-200/70">
                  {items} {items === 1 ? "meal" : "meals"} today
                </p>
                <p className="text-sm font-medium text-blue-100">Total amount</p>
              </div>
              <div className="text-right">
                {offerOn && (
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white">
                      <FaTimes className="text-[8px]" />
                    </span>
                    <span className="text-base font-semibold text-blue-200/70 line-through decoration-red-400 decoration-2">
                      {formatINR(regular)}
                    </span>
                  </div>
                )}
                <span className="font-display text-3xl font-extrabold">{formatINR(payable)}</span>
              </div>
            </div>

            {offerOn && (
              <div className="flex items-center justify-between gap-2 bg-green-500 px-5 py-2.5 text-sm font-bold text-white">
                <span className="flex items-center gap-2">
                  <FaTag className="text-xs" />
                  {picked.length === 3 ? "Full day combo offer" : "Two meal combo offer"}
                </span>
                <span className="rounded-full bg-white/20 px-3 py-0.5">Saved {formatINR(saved)}</span>
              </div>
            )}
          </div>

          <p className="mt-3 text-center text-[11px] font-semibold text-orange-600">
            {comboPossible && !offerOn
              ? "Combo offer applies when you pick 1 of each meal per day"
              : `10-day Auto Order offer: full day ${formatINR(FULL_DAY_PRICE)} · any two meals ${formatINR(TWO_MEAL_PRICE)}`}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Weekly menu data                                                   */
/* ------------------------------------------------------------------ */

const rice = (extra) => ["Rice", "Parippu / Sambar / Moru curry", "Koottu curry / Thoran", extra, "Pickle"];
const NONVEG = "Fish / Egg / Chicken gravy";
const BUTTERMILK = "Butter milk / Rasam";

const WEEK_MENU = [
  {
    day: "Monday",
    short: "Mon",
    breakfast: ["Set dosa", "Sambar", "Chutney"],
    lunch: rice(NONVEG),
    dinner: ["Chapathi (3)", "Chicken curry (1 pc)"],
  },
  {
    day: "Tuesday",
    short: "Tue",
    breakfast: ["Idli", "Sambar", "Chutney"],
    lunch: rice(BUTTERMILK),
    dinner: ["Egg biriyani"],
  },
  {
    day: "Wednesday",
    short: "Wed",
    breakfast: ["Puttu", "Kadala curry"],
    lunch: ["Veg biriyani", "Raitha", "Pickle"],
    dinner: ["Set dosa", "Sambar", "Chutney"],
  },
  {
    day: "Thursday",
    short: "Thu",
    breakfast: ["Idli", "Sambar", "Chutney"],
    lunch: rice(NONVEG),
    dinner: ["Ghee rice", "Chicken curry (1 pc)"],
  },
  {
    day: "Friday",
    short: "Fri",
    breakfast: ["Upma", "Green peas curry"],
    lunch: rice(NONVEG),
    dinner: ["Appam / Idiyappam", "Veg kuruma"],
  },
  {
    day: "Saturday",
    short: "Sat",
    breakfast: ["Puttu", "Kadala curry / Cherupayar"],
    lunch: rice(BUTTERMILK),
    dinner: ["Chapathi", "Egg curry / Masala"],
  },
  {
    day: "Sunday",
    short: "Sun",
    breakfast: ["Appam", "Veg stew / Veg curry"],
    lunch: rice(NONVEG),
    dinner: ["Veg biriyani"],
  },
];

/* ---------- custom food icons (no emoji exists for these) ---------- */

/** Puttu: steamed rice cylinder with coconut and steam. */
function PuttuIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M10 8c-1.5-1.6 1.5-2.6 0-4.2M16 8c-1.5-1.6 1.5-2.6 0-4.2M22 8c-1.5-1.6 1.5-2.6 0-4.2" fill="none" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="4" y="12" width="21" height="13" rx="3.5" fill="#F3E3C3" stroke="#C9A468" strokeWidth="1.2" />
      <ellipse cx="25" cy="18.5" rx="3.2" ry="6.5" fill="#FFF8E7" stroke="#C9A468" strokeWidth="1.2" />
      <path d="M8 16.5h3M13 20h3.5M18 16.5h3M9 22h2.5M16 23h3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="24.5" cy="16.5" r=".9" fill="#E7D2A6" />
      <circle cx="25.5" cy="19.5" r=".9" fill="#E7D2A6" />
      <circle cx="24.5" cy="22" r=".9" fill="#E7D2A6" />
    </svg>
  );
}

/** Kadala curry: bowl of brown chickpeas in gravy. */
function KadalaIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M12 6c-1.2-1.2 1.2-2 0-3.2M18 6c-1.2-1.2 1.2-2 0-3.2" fill="none" stroke="#94a3b8" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M3 15h26a13 11 0 0 1-26 0z" fill="#C2410C" />
      <path d="M3 15h26" stroke="#9A3412" strokeWidth="1.2" />
      <ellipse cx="16" cy="15" rx="12.5" ry="3" fill="#7C2D12" />
      <g fill="#E0B067" stroke="#A16207" strokeWidth=".9">
        <circle cx="9" cy="13.5" r="2.5" />
        <circle cx="14" cy="11.8" r="2.6" />
        <circle cx="19.5" cy="12.2" r="2.6" />
        <circle cx="23.5" cy="14" r="2.3" />
        <circle cx="12" cy="15" r="2.2" />
        <circle cx="18" cy="15.2" r="2.3" />
      </g>
      <path d="M8 24h16" stroke="#9A3412" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />
    </svg>
  );
}

/** Pickle: red bottle with a label. */
function PickleIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="11.5" y="2.5" width="9" height="5" rx="1.5" fill="#7F1D1D" />
      <rect x="13" y="7" width="6" height="4.5" fill="#EF4444" />
      <rect x="7.5" y="10.5" width="17" height="19" rx="5" fill="#DC2626" />
      <rect x="10.5" y="16.5" width="11" height="8" rx="1.8" fill="#FEE2E2" />
      <path d="M13 19.5h6M13 22h4" stroke="#DC2626" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M10.5 13.5v13" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".35" />
    </svg>
  );
}

/** Dosa: golden crisp folded dosa on a plate. */
function DosaIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="25" rx="14" ry="4" fill="#E2E8F0" />
      <path d="M2.5 22C3.5 11 18 6 29.5 12.5c.8 6.5-10.5 12.5-27 9.5z" fill="#E9A23B" stroke="#B7791F" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M6.5 18.5c5.5-5.5 13-6.5 19-3" stroke="#F8D48A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M9 21.5c5.5.4 11-1.8 16-5" stroke="#B7791F" strokeWidth="1" fill="none" opacity=".55" strokeLinecap="round" />
      <circle cx="13" cy="16" r="1" fill="#B7791F" opacity=".55" />
      <circle cx="19" cy="13.8" r="1" fill="#B7791F" opacity=".55" />
      <circle cx="22" cy="18" r=".9" fill="#B7791F" opacity=".55" />
    </svg>
  );
}

/** Idli: three soft white idlis on a plate. */
function IdliIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <ellipse cx="16" cy="25.5" rx="14.5" ry="4" fill="#E2E8F0" />
      <path d="M2.5 24a6.7 7.5 0 0 1 13.4 0z" fill="#FFFDF7" stroke="#D6CFBA" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M16.1 24a6.7 7.5 0 0 1 13.4 0z" fill="#FFFDF7" stroke="#D6CFBA" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M9.5 17.5a6.2 7 0 0 1 12.4 0z" fill="#FFFFFF" stroke="#D6CFBA" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M5.5 20.5c1-1.2 2.4-1.8 3.8-1.8M19 20.5c1-1.2 2.4-1.8 3.8-1.8M12.3 14.3c.8-.8 1.8-1.2 2.9-1.2" stroke="#E7E1CF" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Chutney: small bowl of green coconut chutney. */
function ChutneyIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3.5 16h25a12.5 10.5 0 0 1-25 0z" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M6 16c2-5.5 6-7.5 10-7.5S24 10.5 26 16z" fill="#34C072" />
      <ellipse cx="16" cy="16" rx="12" ry="2.8" fill="#22A559" />
      <g fill="#EAFBEF">
        <circle cx="11" cy="13" r="1" />
        <circle cx="16" cy="11.5" r="1.1" />
        <circle cx="20.5" cy="13.2" r="1" />
        <circle cx="14" cy="15" r=".9" />
        <circle cx="19" cy="15.4" r=".9" />
      </g>
      <path d="M22 9.5c2.5-3.2 5.2-3.4 6.2-3.2-.2 1.2-1.6 3.8-6.2 3.2z" fill="#15803D" />
      <path d="M21.8 9.6c2-1.2 4-2.4 6-3" stroke="#BBF7D0" strokeWidth=".8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/** Dish keyword -> icon (first match wins). A string is an emoji, otherwise a component. */
const FOOD_ICONS = [
  ["puttu", PuttuIcon],
  ["kadala", KadalaIcon],
  ["pickle", PickleIcon],
  ["dosa", DosaIcon],
  ["idli", IdliIcon],
  ["chutney", ChutneyIcon],
  ["biriyani", "🍛"],
  ["ghee rice", "🍚"],
  ["gravy", "🍗"],
  ["chicken", "🍗"],
  ["fish", "🐟"],
  ["egg", "🥚"],
  ["appam", "🥞"],
  ["upma", "🍜"],
  ["chapathi", "🫓"],
  ["peas", "🥬"],
  ["stew", "🥘"],
  ["kuruma", "🥘"],
  ["masala", "🍛"],
  ["sambar", "🍲"],
  ["parippu", "🍲"],
  ["koottu", "🥗"],
  ["thoran", "🥗"],
  ["butter milk", "🥛"],
  ["raitha", "🥣"],
  ["rice", "🍚"],
  ["curry", "🥘"],
];

function FoodIcon({ name }) {
  const n = name.toLowerCase();
  const hit = FOOD_ICONS.find(([k]) => n.includes(k));
  const icon = hit ? hit[1] : "🍽️";
  if (typeof icon === "string") {
    return <span className="text-[17px] leading-none">{icon}</span>;
  }
  const Icon = icon;
  return <Icon className="h-6 w-6" />;
}

const MENU_MEALS = [
  {
    key: "breakfast",
    label: "Breakfast",
    time: "7:30 AM",
    emoji: "🌅",
    badge: "from-amber-400 to-orange-500 shadow-amber-400/40",
    block: "border-amber-100 bg-gradient-to-br from-amber-50/80 to-white",
    chip: "ring-amber-100 hover:ring-amber-300",
  },
  {
    key: "lunch",
    label: "Lunch",
    time: "1:00 PM",
    emoji: "☀️",
    badge: "from-emerald-400 to-teal-500 shadow-emerald-400/40",
    block: "border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white",
    chip: "ring-emerald-100 hover:ring-emerald-300",
  },
  {
    key: "dinner",
    label: "Dinner",
    time: "8:00 PM",
    emoji: "🌙",
    badge: "from-indigo-500 to-violet-600 shadow-indigo-400/40",
    block: "border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white",
    chip: "ring-indigo-100 hover:ring-indigo-300",
  },
];

const MENU_HIGHLIGHTS = [
  {
    icon: FaIndustry,
    title: "Our own food production",
    text: "Everything is cooked in our own kitchen, so quality stays in our hands.",
    tone: "bg-orange-500",
  },
  {
    icon: FaLeaf,
    title: "No outside cooked food",
    text: "We never buy ready-cooked items. Fresh, homely and hygienic.",
    tone: "bg-emerald-500",
  },
  {
    icon: FaSyncAlt,
    title: "Seasonal and fresh",
    text: "Items may change with seasonality and availability.",
    tone: "bg-blue-600",
  },
];

const todayIndex = () => (new Date().getDay() + 6) % 7; // Monday = 0

/** Which meal is next to be served right now (for today's menu). */
const upNextMeal = () => {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 16) return "lunch";
  if (h < 22) return "dinner";
  return null;
};

function ImageLightbox({ src, alt, onClose }) {
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

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      style={{ animation: "homeFade .25s ease-out" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Weekly menu"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/30 transition hover:rotate-90 hover:bg-white/25"
      >
        <FaTimes />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
        style={{ animation: "homeZoom .3s cubic-bezier(.2,.8,.2,1)" }}
      />
    </div>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/*  Weekly menu showcase                                               */
/* ------------------------------------------------------------------ */

function MenuShowcase() {
  const [active, setActive] = useState(todayIndex);
  const [zoom, setZoom] = useState(false);
  const isToday = active === todayIndex();
  const data = WEEK_MENU[active];
  const next = isToday ? upNextMeal() : null;
  const totalItems = MENU_MEALS.reduce((n, m) => n + data[m.key].length, 0);

  // Logged in -> straight to the orders/services page, otherwise to register.
  const auth = getAuth();
  const orderTo = auth ? (auth.role === "customer" ? "/services" : dashboardFor(auth.role)) : "/register";

  const go = (delta) => setActive((i) => (i + delta + WEEK_MENU.length) % WEEK_MENU.length);

  return (
    <section className="relative overflow-hidden bg-brand-gradient py-20 sm:py-24">
      <div className="bg-grid-dark absolute inset-0" />
      <div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
      <div className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-orange-500/25 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-7xl px-5">
        {/* ---------- heading ---------- */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className="glass mb-5 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-orange-200">
            <GiHotMeal className="text-base text-orange-400" />
            Weekly Menu
          </div>
          <h2 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl">
            What's cooking <span className="text-gradient">this week?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/80 sm:text-lg">
            Homely Kerala <span className="font-semibold text-orange-300">breakfast</span>,{" "}
            <span className="font-semibold text-orange-300">full meals</span> and{" "}
            <span className="font-semibold text-orange-300">dinner</span>, planned for every day of the week. Pick
            a day and see exactly what is on your plate.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            {MENU_MEALS.map((m) => (
              <span
                key={m.key}
                className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold text-blue-50"
              >
                <span className="text-sm" aria-hidden="true">
                  {m.emoji}
                </span>
                {m.label}
                <span className="text-orange-300">{m.time}</span>
              </span>
            ))}
          </div>
        </Reveal>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-5 lg:gap-8">
          {/* ---------- LEFT: why + printed card ---------- */}
          <div className="order-2 space-y-5 lg:order-1 lg:col-span-2">
            <Reveal x={-40} y={20}>
              <div className="glass rounded-3xl p-5 sm:p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Why our menu</p>
                <ul className="mt-4 space-y-4">
                  {MENU_HIGHLIGHTS.map(({ icon: Icon, title, text, tone }) => (
                    <li key={title} className="flex items-start gap-3.5">
                      <span
                        className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl text-white shadow-lg ${tone}`}
                      >
                        <Icon />
                      </span>
                      <div>
                        <p className="text-base font-bold text-white">{title}</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-blue-100/75">{text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal x={-40} y={20} delay={120}>
              <button
                type="button"
                onClick={() => setZoom(true)}
                aria-label="View the printed weekly menu card"
                className="group relative block w-full overflow-hidden rounded-3xl bg-gradient-to-br from-orange-400 via-amber-300 to-orange-500 p-1 text-left shadow-xl shadow-black/30 transition duration-300 ease-out hover:-translate-y-1 hover:shadow-orange-500/30"
              >
                <span className="relative block h-56 overflow-hidden rounded-[1.25rem] sm:h-72 lg:h-80">
                  <img
                    src={about2}
                    alt="Orion Foods printed weekly menu card"
                    className="h-full w-full object-cover object-top transition duration-700 ease-out group-hover:scale-105"
                    decoding="async"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />
                  <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4">
                    <span>
                      <span className="block text-base font-extrabold text-white sm:text-lg">Printed menu card</span>
                      <span className="block text-xs font-medium text-slate-200 sm:text-sm">Full week at a glance</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-lg sm:text-sm">
                      <FaSearchPlus /> View
                    </span>
                  </span>
                </span>
              </button>
            </Reveal>
          </div>

          {/* ---------- RIGHT: interactive compact menu ---------- */}
          <Reveal x={40} y={20} delay={120} className="order-1 lg:order-2 lg:col-span-3">
            <div className="relative">
              <div className="absolute inset-0 scale-95 rounded-[2rem] bg-gradient-to-br from-orange-400/30 to-indigo-400/30 blur-2xl" />

              <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/40 ring-1 ring-white/40">
                {/* header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0b1b3f] to-slate-900 px-4 pb-4 pt-4 sm:px-5">
                  <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-500/30 blur-3xl" />
                  <span
                    className="pointer-events-none absolute inset-0 opacity-[0.07]"
                    style={{
                      backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
                      backgroundSize: "16px 16px",
                    }}
                  />

                  <div className="relative flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Daily menu</p>
                      <h3 className="truncate text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                        {data.day}
                      </h3>
                      <p className="text-xs font-medium text-slate-300 sm:text-sm">{totalItems} items · 3 meals</p>
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      {isToday && (
                        <span className="hidden items-center gap-1.5 rounded-full bg-emerald-400/20 px-2.5 py-1 text-[11px] font-bold text-emerald-200 ring-1 ring-emerald-300/40 sm:inline-flex">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          </span>
                          Today
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => go(-1)}
                        aria-label="Previous day"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs text-white ring-1 ring-white/20 transition duration-300 hover:bg-white/20 active:scale-95"
                      >
                        <FaChevronLeft />
                      </button>
                      <button
                        type="button"
                        onClick={() => go(1)}
                        aria-label="Next day"
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs text-white ring-1 ring-white/20 transition duration-300 hover:bg-white/20 active:scale-95"
                      >
                        <FaChevronRight />
                      </button>
                    </div>
                  </div>

                  <div className="relative mt-3 grid grid-cols-7 gap-1.5" role="tablist" aria-label="Days of the week">
                    {WEEK_MENU.map((d, i) => (
                      <button
                        key={d.day}
                        type="button"
                        role="tab"
                        aria-selected={i === active}
                        onClick={() => setActive(i)}
                        className={`relative rounded-lg py-2 text-xs font-bold transition-all duration-300 ease-out active:scale-95 sm:text-sm ${
                          i === active
                            ? "scale-105 bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/40"
                            : "bg-white/10 text-slate-300 hover:-translate-y-0.5 hover:bg-white/20"
                        }`}
                      >
                        {d.short}
                        {i === todayIndex() && (
                          <span
                            className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-slate-900 ${
                              i === active ? "bg-white" : "bg-emerald-400"
                            }`}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* meals: one compact row per meal */}
                <div className="p-3 sm:p-5">
                  <div key={data.day} className="space-y-3">
                    {MENU_MEALS.map((m, mi) => (
                      <div
                        key={m.key}
                        className={`flex flex-col gap-3 rounded-2xl border p-3 transition-shadow duration-300 hover:shadow-md sm:flex-row sm:items-center sm:p-3.5 ${m.block}`}
                        style={{ animation: `homeSlide .45s ease-out ${mi * 90}ms both` }}
                      >
                        <div className="flex flex-none items-center gap-3 sm:w-40">
                          <span
                            className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-2xl shadow-md ${m.badge}`}
                          >
                            <span aria-hidden="true">{m.emoji}</span>
                          </span>
                          <div className="leading-tight">
                            <p className="text-base font-extrabold text-slate-900">{m.label}</p>
                            <p className="flex items-center gap-1 text-xs font-semibold text-slate-400">
                              <FaClock className="text-[10px]" /> {m.time}
                            </p>
                            {next === m.key && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                                Up next
                              </span>
                            )}
                          </div>
                        </div>

                        <ul className="flex flex-1 flex-wrap gap-2">
                          {data[m.key].map((item) => (
                            <li
                              key={item}
                              className={`inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3.5 text-[13px] font-semibold text-slate-700 shadow-sm ring-1 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:scale-[1.03] hover:shadow-md sm:text-sm ${m.chip}`}
                            >
                              <span
                                className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-slate-50"
                                aria-hidden="true"
                              >
                                <FoodIcon name={item} />
                              </span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <Link
                    to={orderTo}
                    className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition duration-300 hover:-translate-y-0.5 hover:from-orange-600 hover:to-amber-600 active:scale-[.98]"
                  >
                    Order from this menu
                    <FaArrowRight className="text-xs transition group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={100}>
          <p className="mt-8 text-center text-xs font-medium text-blue-200/60">
            All menu items are subject to change according to seasonality and availability.
          </p>
        </Reveal>
      </div>

      {zoom && <ImageLightbox src={about2} alt="Orion Foods weekly menu" onClose={() => setZoom(false)} />}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Static data                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    title: "Create your account",
    text: "Sign up in under a minute with your name, phone and delivery address.",
  },
  {
    title: "Choose your meals",
    text: "Set how many breakfasts, lunches and dinners you need for the day.",
  },
  {
    title: "Pay and track",
    text: "Pay by UPI or GPay, then follow the order until it reaches you.",
  },
];

const ROLES = [
  { icon: FaUser, name: "Customer", text: "Order meals, pay, view balance" },
  { icon: FaUserTie, name: "Staff", text: "Prepare and deliver orders" },
  { icon: FaUserShield, name: "Admin", text: "Manage users, menu and payments" },
];

const TRACK = ["Placed", "Preparing", "Delivered"];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Home() {
  // Logged in -> "Get started free" goes to the user's dashboard, otherwise to register.
  const auth = getAuth();
  const startTo = auth ? dashboardFor(auth.role) : "/register";

  // No sideways scroll / white strip on the right on phones.
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.overflowX;
    const prevBody = document.body.style.overflowX;
    html.style.overflowX = "hidden";
    document.body.style.overflowX = "hidden";
    return () => {
      html.style.overflowX = prevHtml;
      document.body.style.overflowX = prevBody;
    };
  }, []);

  return (
    <div className="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-slate-50">
      <style>{`
        @keyframes homeFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes homeZoom { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes homeSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes homeDrift { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(40px,-30px,0) scale(1.12); } }
        @keyframes homeSpin { to { transform: rotate(360deg); } }
        @keyframes homeCue { 0%, 100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(7px); opacity: 1; } }
        @keyframes homeShine { 0% { transform: translateX(-120%) skewX(-20deg); } 60%, 100% { transform: translateX(260%) skewX(-20deg); } }
        @media (prefers-reduced-motion: reduce) {
          [style*="homeDrift"], [style*="homeSpin"], [style*="homeCue"] { animation: none !important; }
        }
      `}</style>

      <ScrollProgress />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-brand-gradient">
        <div className="bg-grid-dark absolute inset-0" />

        {/* animated aurora */}
        <div
          className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-blue-500/35 blur-3xl"
          style={{ animation: "homeDrift 14s ease-in-out infinite" }}
        />
        <div
          className="absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-orange-500/30 blur-3xl"
          style={{ animation: "homeDrift 17s ease-in-out -4s infinite" }}
        />
        <div
          className="absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl"
          style={{ animation: "homeDrift 20s ease-in-out -8s infinite" }}
        />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 pb-14 pt-20 lg:grid-cols-2 lg:pb-16 lg:pt-28">
          <div className="animate-rise text-center lg:text-left">
            <div className="glass relative mb-6 inline-flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 text-sm font-medium text-orange-200">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                style={{ animation: "homeShine 4.5s ease-in-out infinite" }}
              />
              <GiHotMeal className="text-lg text-orange-500" />
              Meal ordering for homes, hostels and offices
            </div>

            <h1 className="text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
              Every meal of the day, ordered in <span className="text-gradient">one place.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-blue-100/80 lg:mx-0">
              ORION FoodOrder lets you plan breakfast, lunch and dinner, pay by UPI, and follow each order in
              real time.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3 lg:justify-start">
              <span className="text-sm font-semibold text-blue-100/80">Plan your</span>
              <RotatingMeal />
            </div>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link to={startTo} className="btn-primary group relative overflow-hidden px-8 py-3.5">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  style={{ animation: "homeShine 3.8s ease-in-out 1s infinite" }}
                />
                Get started free
                <FaArrowRight className="text-xs transition group-hover:translate-x-1" />
              </Link>
              <Link to="/login" className="btn-outline-light px-8 py-3.5">
                Login to account
              </Link>
            </div>

            <ul className="mt-9 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-blue-100/80 lg:justify-start">
              {["UPI & GPay payments", "Live order tracking", "Separate staff and admin panels"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <FaCheckCircle className="text-orange-500" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-rise delay-200">
            <div className="relative">
              {/* rotating dashed rings */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20 sm:block"
                style={{ animation: "homeSpin 40s linear infinite" }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 sm:block"
                style={{ animation: "homeSpin 60s linear reverse infinite" }}
              />
              <Tilt>
                <SampleOrderCard />
              </Tilt>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 lg:pb-20">
          <div className="glass mx-auto grid max-w-3xl grid-cols-3 divide-x divide-white/10 rounded-3xl py-4 sm:py-5">
            {HERO_STATS.map((s) => (
              <div key={s.label} className="px-2 text-center sm:px-4">
                <p className="text-xl" aria-hidden="true">
                  {s.emoji}
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-white sm:text-3xl">
                  <CountUp to={s.value} />
                  <span className="text-orange-300">{s.suffix}</span>
                </p>
                <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-100/70 sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 hidden justify-center md:flex" aria-hidden="true">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs text-white ring-1 ring-white/25"
              style={{ animation: "homeCue 1.8s ease-in-out infinite" }}
            >
              <FaChevronDown />
            </span>
          </div>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:py-24">
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-900/5 md:grid md:grid-cols-2">
            <div className="group relative flex min-h-[280px] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4 md:min-h-[460px] lg:p-6">
              <img
                src={about1}
                alt="Orion Foods – Homely & Healthy Food"
                className="h-auto max-h-[560px] w-full rounded-2xl object-contain transition duration-700 group-hover:scale-[1.03]"
              />
            </div>

            <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-14">
              <div className="mb-5 inline-flex items-center gap-2 self-start rounded-full bg-orange-50 px-3.5 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                About Orion Foods
              </div>

              <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                Homely Food. Healthy Food.
                <span className="mt-1 block text-blue-700">Restaurant & Caterers</span>
              </h2>

              <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
                At Orion Foods we believe every meal should taste like home — fresh, nutritious and prepared with
                care. We serve daily breakfast, lunch and dinner for homes, hostels and offices with complete
                transparency and hygiene.
              </p>

              <ul className="mt-7 space-y-3">
                {["No Ajinomoto", "No artificial colors & flavors", "No recycled oils"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <FaCheckCircle className="text-xs" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-9">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/25 transition hover:bg-blue-800"
                >
                  Order healthy meals
                  <FaArrowRight className="text-xs" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ============ WEEKLY MENU ============ */}
      <MenuShowcase />

      {/* ============ KITCHEN ============ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 py-20 sm:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
          <Reveal x={-40} y={20}>
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute inset-0 scale-90 rounded-full bg-gradient-to-br from-orange-300/40 to-blue-300/40 blur-3xl" />
              <div className="relative flex items-center justify-center rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-900/5 sm:p-10">
                <img
                  src={CHEF_LOGO}
                  alt="Orion Foods chef"
                  className="h-auto max-h-[380px] w-full object-contain transition duration-500 hover:scale-105"
                  decoding="async"
                />
              </div>
            </div>
          </Reveal>

          <Reveal x={40} y={20} delay={120}>
            <div className="text-center md:text-left">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                Our Kitchen
              </div>

              <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl lg:text-4xl">
                Cooked fresh by chefs who care about <span className="text-orange-500">every plate.</span>
              </h2>

              <p className="mt-5 text-[15px] leading-relaxed text-slate-600 sm:text-base">
                Behind every Orion Foods order is a kitchen team that cooks with fresh ingredients and simple,
                homely recipes. Meals are prepared in small batches every day, packed with hygiene in mind and
                delivered on time, so what reaches your table tastes just like food made at home.
              </p>

              <p className="mt-4 text-[15px] leading-relaxed text-slate-600 sm:text-base">
                Whether you are at home, in a hostel or at the office, you get the same care and the same taste
                at breakfast, lunch and dinner.
              </p>

              <div className="mt-8 flex justify-center md:justify-start">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600"
                >
                  Start ordering
                  <FaArrowRight className="text-xs" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24">
        <Reveal className="mb-14 max-w-2xl">
          <h2 className="text-3xl font-bold sm:text-4xl">Built for the way people actually eat</h2>
          <p className="mt-4 text-lg text-slate-500">
            One platform for the person ordering, the team cooking and the admin keeping the books.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-6">
          <Reveal className="md:col-span-4">
            <div className="group relative h-full overflow-hidden rounded-3xl bg-[#0b1b3f] p-8 text-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/30">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-600/40 blur-3xl" />
              <div className="bg-grid-dark absolute inset-0 opacity-60" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl text-orange-300 ring-1 ring-white/10">
                <MdOutlineFastfood />
              </span>
              <h3 className="relative mt-6 text-2xl font-bold text-white">Easy ordering</h3>
              <p className="relative mt-3 max-w-md leading-relaxed text-blue-100/75">
                Set your breakfast, lunch and dinner counts with a tap. Change them for tomorrow, or skip a day,
                without calling anyone.
              </p>
              <div className="relative mt-6 flex flex-wrap gap-2">
                {["☕ Breakfast", "🍛 Lunch", "🍲 Dinner"].map((m) => (
                  <span
                    key={m}
                    className="glass rounded-full px-3.5 py-1.5 text-xs font-medium text-blue-50 transition group-hover:bg-white/20"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="md:col-span-2" delay={120}>
            <div className="h-full rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/15">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl text-white shadow-lg shadow-orange-500/30">
                <MdPayment />
              </span>
              <h3 className="mt-6 text-xl font-bold">Secure payments</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Pay with UPI or GPay and see every payment and balance in one list.
              </p>
            </div>
          </Reveal>

          <Reveal className="md:col-span-2">
            <div className="card h-full p-8 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-700">
                <FaBolt />
              </span>
              <h3 className="mt-6 text-xl font-bold">Fast service</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Staff see new orders instantly, so meals are ready and delivered on time.
              </p>
              <div className="mt-5 flex items-center gap-1.5">
                {TRACK.map((t, i) => (
                  <div key={t} className="flex flex-1 flex-col gap-1.5">
                    <span className={`h-1.5 rounded-full ${i < 2 ? "bg-blue-600" : "bg-slate-200"}`} />
                    <span className="text-[10px] font-medium text-slate-500">{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal className="md:col-span-4" delay={120}>
            <div className="card h-full p-8 transition duration-300 hover:shadow-xl">
              <h3 className="text-xl font-bold">A dashboard for every role</h3>
              <p className="mt-2 text-sm text-slate-500">Each person signs in and sees only what they need.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {ROLES.map(({ icon: Icon, name, text }) => (
                  <div
                    key={name}
                    className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/50"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm transition group-hover:bg-blue-700 group-hover:text-white">
                      <Icon />
                    </span>
                    <p className="mt-3 font-semibold text-slate-900">{name}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ STEPS ============ */}
      <section className="border-y border-slate-200 bg-white py-24">
        <div className="mx-auto max-w-7xl px-5">
          <Reveal>
            <h2 className="max-w-xl text-3xl font-bold sm:text-4xl">Your first order in three steps</h2>
          </Reveal>

          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative">
                {i < STEPS.length - 1 && (
                  <span className="absolute left-14 top-6 hidden h-px w-[calc(100%-2rem)] bg-gradient-to-r from-blue-300 to-orange-300 md:block" />
                )}
                <Reveal delay={i * 150}>
                  <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 font-display text-lg font-bold text-white shadow-lg shadow-blue-700/30 ring-8 ring-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-xl font-bold">{s.title}</h3>
                  <p className="mt-2 max-w-xs leading-relaxed text-slate-500">{s.text}</p>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="px-5 py-24">
        <Reveal scale={0.96} y={40}>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-brand-gradient px-8 py-16 text-center sm:px-16">
            <div className="bg-grid-dark absolute inset-0" />
            <div className="absolute -bottom-20 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-orange-500/40 blur-3xl" />
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready to simplify your daily meals?</h2>
              <p className="mx-auto mt-4 max-w-xl text-blue-100/80">
                Create an account and place your first order today.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/register" className="btn-primary px-8 py-3.5">
                  Create account
                  <FaArrowRight className="text-xs" />
                </Link>
                <Link to="/login" className="btn-outline-light px-8 py-3.5">
                  I already have an account
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="mt-auto border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ORION FoodOrder. All rights reserved.
      </footer>
    </div>
  );
}