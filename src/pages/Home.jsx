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
  FaPlay,
  FaPause,
  FaCheck,
} from "react-icons/fa";
import { GiHotMeal } from "react-icons/gi";
import { MdOutlineFastfood, MdPayment } from "react-icons/md";

import { about1, about2 } from "../assets/index";
import { PRICE, FULL_DAY_PRICE, TWO_MEAL_PRICE, normalCost, autoDayCost, formatINR } from "../assets/utils/pricing";

const CHEF_LOGO =
  "https://png.pngtree.com/png-clipart/20240202/original/pngtree-chef-logo-for-culinary-png-image_14215663.png";

/* ------------------------------------------------------------------ */
/*  Real food photos for the meal cards (optional)                     */
/*  1. Put your photos in src/assets and export them from assets/index */
/*  2. import { breakfastImg, lunchImg, dinnerImg } from "../assets/index";
/*  3. Replace the empty strings below with those imports.             */
/*  Left empty, the cards simply keep showing the emoji.               */
/* ------------------------------------------------------------------ */

const MEAL_PHOTOS = {
  breakfast: "",
  lunch: "",
  dinner: "",
};

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
/*  Device helpers                                                     */
/* ------------------------------------------------------------------ */

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const isFinePointer = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

const isSmallScreen = () => typeof window !== "undefined" && window.innerWidth < 768;

/* ------------------------------------------------------------------ */
/*  Scroll helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Fades + slides its children in once.
 * Uses IntersectionObserver, so fast scrolling (up or down) never leaves content hidden:
 * anything on screen OR already scrolled past is shown immediately.
 */
function Reveal({ children, delay = 0, y = 36, x = 0, scale = 1, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const [small] = useState(isSmallScreen);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          // visible now, or already above the viewport (fast scroll / jump)
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            setShown(true);
            io.disconnect();
          }
        });
      },
      { rootMargin: "0px 0px 12% 0px", threshold: 0 }
    );
    io.observe(el);

    return () => io.disconnect();
  }, []);

  // lighter, shorter animation on phones (no sideways slide, so no horizontal wobble)
  const dy = small ? Math.min(y, 16) : y;
  const dx = small ? 0 : x;
  const sc = small ? 1 : scale;
  const dur = small ? 0.5 : 0.8;
  const dl = small ? Math.min(delay, 60) : delay;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "none" : `translate3d(${dx}px, ${dy}px, 0) scale(${sc})`,
        transition: `opacity ${dur}s cubic-bezier(.2,.7,.2,1) ${dl}ms, transform ${dur}s cubic-bezier(.2,.7,.2,1) ${dl}ms`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Returns [ref, seen]. `seen` turns true once the element is on screen OR already scrolled past,
 * so fast scrolling can never leave a section hidden.
 */
function useSeen(rootMargin = "0px 0px -6% 0px") {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting || e.boundingClientRect.top < 0) {
            setSeen(true);
            io.disconnect();
          }
        });
      },
      { rootMargin, threshold: 0.08 }
    );
    io.observe(el);

    return () => io.disconnect();
  }, [rootMargin]);

  return [ref, seen];
}

/** Thin progress bar at the top of the page (GPU friendly: only transform changes). */
function ScrollProgress() {
  const bar = useRef(null);

  useEffect(() => {
    // smooth anchor scrolling only with a mouse; on touch it makes scrolling feel heavy
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    if (isFinePointer()) html.style.scrollBehavior = "smooth";

    let ticking = false;
    const update = () => {
      ticking = false;
      const max = html.scrollHeight - html.clientHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      html.style.scrollBehavior = prev;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-1">
      <div
        ref={bar}
        className="h-full w-full origin-left bg-gradient-to-r from-blue-500 via-orange-400 to-amber-300 shadow-[0_0_10px_rgba(251,146,60,.7)]"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}

/** Tilts its child slightly towards the mouse (desktop with a mouse only). */
function Tilt({ children, max = 7 }) {
  const ref = useRef(null);
  const [enabled] = useState(() => !prefersReducedMotion() && isFinePointer());

  if (!enabled) return <>{children}</>;

  const move = (e) => {
    if (!ref.current) return;
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
    if (prefersReducedMotion()) {
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
  { value: 7, suffix: "", label: "Days of fresh menu", emoji: "📅", tile: "from-sky-400/30 to-blue-500/20" },
  { value: 3, suffix: "", label: "Meals served daily", emoji: "🍽️", tile: "from-orange-400/30 to-amber-500/20" },
  { value: 10, suffix: "-day", label: "Auto order plans", emoji: "⚡", tile: "from-fuchsia-400/30 to-violet-500/20" },
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
    photo: MEAL_PHOTOS.breakfast,
    tile: "from-amber-100 to-orange-200",
  },
  {
    key: "lunch",
    label: "Lunch",
    time: "1:00 PM",
    price: PRICE.lunch,
    emoji: "🍛",
    photo: MEAL_PHOTOS.lunch,
    tile: "from-orange-100 to-rose-200",
  },
  {
    key: "dinner",
    label: "Dinner",
    time: "8:00 PM",
    price: PRICE.dinner,
    emoji: "🍲",
    photo: MEAL_PHOTOS.dinner,
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
      <div className="absolute inset-0 -z-0 hidden scale-95 rounded-[2rem] bg-gradient-to-br from-blue-400/40 to-orange-400/40 blur-2xl sm:block" />

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

        <div className="p-4 sm:p-6">
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
            {SAMPLE_MEALS.map(({ key, label, time, price, emoji, photo, tile }) => {
              const active = counts[key] > 0;
              return (
                <li
                  key={key}
                  className={`group flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all duration-300 ease-out ${
                    active
                      ? "border-orange-200 bg-orange-50/50 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                      : "border-slate-100 bg-slate-50 opacity-70"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span
                      className={`flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br text-2xl shadow-inner transition-transform duration-300 group-hover:scale-110 ${tile}`}
                    >
                      {photo ? (
                        <img
                          src={photo}
                          alt={label}
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span aria-hidden="true">{emoji}</span>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{label}</p>
                      <p className="truncate text-xs tabular-nums text-slate-500">
                        {time} · ₹{price} each
                      </p>
                    </div>
                  </div>

                  <div className="flex w-[104px] flex-none flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                      <button
                        type="button"
                        aria-label={`Remove one ${label}`}
                        onClick={() => change(key, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition duration-200 hover:bg-slate-100 hover:text-blue-700 active:scale-90"
                      >
                        <FaMinus className="text-[10px]" />
                      </button>
                      <span
                        key={counts[key]}
                        className="home-bump w-6 text-center text-sm font-bold tabular-nums text-slate-900"
                      >
                        {counts[key]}
                      </span>
                      <button
                        type="button"
                        aria-label={`Add one ${label}`}
                        onClick={() => change(key, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-700 text-white transition duration-200 hover:bg-blue-800 active:scale-90"
                      >
                        <FaPlus className="text-[10px]" />
                      </button>
                    </div>
                    <span className="text-[11px] font-semibold tabular-nums text-slate-500">
                      ₹{price * counts[key]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* premium total card */}
          <div className="relative mt-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0b1b3f] via-[#122a5c] to-[#0b1b3f] text-white shadow-lg shadow-blue-900/30 ring-1 ring-white/10">
            <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-orange-400/25 blur-2xl" />
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
              style={{ animation: "homeShine 5s ease-in-out 1.5s infinite" }}
            />

            <div className="relative flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
              <div className="min-w-0">
                <p className="text-xs tabular-nums text-blue-200/70">
                  {items} {items === 1 ? "meal" : "meals"} today
                </p>
                <p className="text-sm font-medium text-blue-100">Total amount</p>
              </div>
              <div className="flex-none text-right">
                {offerOn && (
                  <div className="flex items-center justify-end gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white">
                      <FaTimes className="text-[8px]" />
                    </span>
                    <span className="text-base font-semibold tabular-nums text-blue-200/70 line-through decoration-red-400 decoration-2">
                      {formatINR(regular)}
                    </span>
                  </div>
                )}
                <span
                  key={payable}
                  className="home-bump inline-block font-display text-3xl font-extrabold tabular-nums"
                >
                  {formatINR(payable)}
                </span>
              </div>
            </div>

            {offerOn && (
              <div className="relative flex items-center justify-between gap-2 bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white sm:px-5">
                <span className="flex min-w-0 items-center gap-2">
                  <FaTag className="flex-none text-xs" />
                  <span className="truncate">
                    {picked.length === 3 ? "Full day combo offer" : "Two meal combo offer"}
                  </span>
                </span>
                <span className="flex-none rounded-full bg-white/20 px-3 py-0.5 tabular-nums">
                  Saved {formatINR(saved)}
                </span>
              </div>
            )}
          </div>

          {/* 10-day auto order offer */}
          <div className="mt-3 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 p-3">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-orange-700">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
                <FaBolt />
              </span>
              10-day Auto Order offer
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-orange-100">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Full day</p>
                <p className="text-base font-extrabold tabular-nums text-slate-900">{formatINR(FULL_DAY_PRICE)}</p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-orange-100">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Any two meals</p>
                <p className="text-base font-extrabold tabular-nums text-slate-900">{formatINR(TWO_MEAL_PRICE)}</p>
              </div>
            </div>
            {comboPossible && !offerOn && (
              <p className="mt-2 text-center text-[11px] font-semibold text-orange-700">
                Combo offer applies when you pick 1 of each meal per day
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  How it works (step by step for customers)                          */
/* ------------------------------------------------------------------ */

/* ---------- illustrated step icons (multi-colour SVG, animate when the step is active) ---------- */

/** Step 1: phone with a sign-up form. Fields fill in one by one, then the tick pops. */
function AccountArt() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hwAcBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#334155" />
          <stop offset="1" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="hwAcScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id="hwAcAvatar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="hwAcOk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ade80" />
          <stop offset="1" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <ellipse cx="48" cy="90" rx="22" ry="3.5" fill="#0f172a" opacity=".14" />
      <rect x="26" y="6" width="44" height="80" rx="10" fill="url(#hwAcBody)" />
      <rect x="29.5" y="11" width="37" height="70" rx="7" fill="url(#hwAcScreen)" />
      <rect x="40" y="8.2" width="16" height="2.4" rx="1.2" fill="#475569" />
      <circle cx="48" cy="26" r="6.5" fill="url(#hwAcAvatar)" />
      <path d="M36 44c1.5-7.5 6.2-10.5 12-10.5S58.5 36.5 60 44z" fill="url(#hwAcAvatar)" />
      <rect x="35" y="50" width="26" height="5.5" rx="2.75" fill="#e2e8f0" />
      <rect className="hw-fill" x="35" y="50" width="26" height="5.5" rx="2.75" fill="#7dd3fc" style={{ "--d": "0s" }} />
      <rect x="35" y="58" width="26" height="5.5" rx="2.75" fill="#e2e8f0" />
      <rect className="hw-fill" x="35" y="58" width="26" height="5.5" rx="2.75" fill="#7dd3fc" style={{ "--d": "0.35s" }} />
      <rect x="35" y="66" width="26" height="5.5" rx="2.75" fill="#e2e8f0" />
      <rect className="hw-fill" x="35" y="66" width="26" height="5.5" rx="2.75" fill="#7dd3fc" style={{ "--d": "0.7s" }} />
      <circle className="hw-pop" cx="68" cy="68" r="11" fill="url(#hwAcOk)" stroke="#ffffff" strokeWidth="3" style={{ "--d": "1.1s" }} />
      <path
        className="hw-pop"
        d="M62.5 68.5l4 4 7-8"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ "--d": "1.1s" }}
      />
    </svg>
  );
}

/** Step 2: map tile with a bouncing pin, ripples and a dashed 1 km radius. */
function LocationArt() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hwLoPin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb7185" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
        <clipPath id="hwLoClip">
          <rect x="6" y="44" width="84" height="44" rx="10" />
        </clipPath>
      </defs>
      <rect x="6" y="44" width="84" height="44" rx="10" fill="#e0f2fe" />
      <g clipPath="url(#hwLoClip)">
        <rect x="10" y="49" width="22" height="15" rx="4" fill="#bbf7d0" />
        <rect x="70" y="66" width="16" height="12" rx="3" fill="#bbf7d0" />
        <path d="M6 83c22-9 42 3 84-8v14H6z" fill="#7dd3fc" />
        <path d="M6 64h84M34 44v44M64 44v44" stroke="#ffffff" strokeWidth="4" />
        <path d="M6 64h84M34 44v44M64 44v44" stroke="#cbd5e1" strokeWidth=".6" strokeDasharray="2 3" />
      </g>
      <rect x="6" y="44" width="84" height="44" rx="10" fill="none" stroke="#bae6fd" strokeWidth="1.2" />
      <ellipse cx="48" cy="72" rx="28" ry="9.5" fill="#fb7185" opacity=".14" stroke="#fb7185" strokeWidth="1.4" strokeDasharray="3 3" />
      <ellipse className="hw-ripple" cx="48" cy="72" rx="16" ry="5.5" fill="none" stroke="#e11d48" strokeWidth="1.6" style={{ "--d": "0s" }} />
      <ellipse className="hw-ripple" cx="48" cy="72" rx="16" ry="5.5" fill="none" stroke="#e11d48" strokeWidth="1.6" style={{ "--d": "0.9s" }} />
      <ellipse cx="48" cy="71" rx="5" ry="1.8" fill="#881337" opacity=".35" />
      <g className="hw-bounce">
        <path
          d="M48 8c-11.5 0-20.5 8.8-20.5 20 0 14.5 20.5 38 20.5 38s20.5-23.5 20.5-38c0-11.2-9-20-20.5-20z"
          fill="url(#hwLoPin)"
        />
        <path d="M48 8c-11.5 0-20.5 8.8-20.5 20 0 3 .9 6.200 2.400 9.400C32.500 21 40 14 48 14c8 0 15.500 7 18.100 23.400 1.500-3.200 2.400-6.400 2.400-9.400C68.500 16.800 59.500 8 48 8z" fill="#ffffff" opacity=".22" />
        <circle cx="48" cy="28" r="8.5" fill="#ffffff" />
        <circle cx="48" cy="28" r="4" fill="#e11d48" />
      </g>
    </svg>
  );
}

/** Step 3: wallet with a peeking card and a spinning rupee coin. */
function WalletArt() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hwWaBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="hwWaCard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde68a" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="hwWaCoin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fde047" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
      </defs>
      <ellipse cx="46" cy="89" rx="32" ry="3.5" fill="#0f172a" opacity=".14" />
      <g transform="rotate(-9 44 38)">
        <rect x="18" y="20" width="50" height="32" rx="5" fill="url(#hwWaCard)" />
        <rect x="18" y="27" width="50" height="6" fill="#b45309" opacity=".35" />
        <rect x="24" y="39" width="14" height="4" rx="2" fill="#ffffff" opacity=".75" />
      </g>
      <rect x="8" y="34" width="74" height="50" rx="11" fill="url(#hwWaBody)" />
      <path d="M8 46v-1c0-6 5-11 11-11h52c6 0 11 5 11 11v1z" fill="#6ee7b7" opacity=".5" />
      <rect x="13" y="40" width="64" height="39" rx="7" fill="none" stroke="#ffffff" strokeOpacity=".3" strokeWidth="1.2" strokeDasharray="3 3" />
      <rect x="60" y="52" width="28" height="19" rx="9.5" fill="#065f46" />
      <circle cx="72" cy="61.5" r="4.5" fill="url(#hwWaCoin)" stroke="#ffffff" strokeWidth="1.5" />
      <g className="hw-coin">
        <circle cx="76" cy="19" r="11" fill="url(#hwWaCoin)" stroke="#b45309" strokeWidth="1.5" />
        <circle cx="76" cy="19" r="7.5" fill="none" stroke="#ffffff" strokeOpacity=".55" strokeWidth="1.2" />
        <text x="76" y="23.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="#92400e">
          ₹
        </text>
      </g>
    </svg>
  );
}

/** Step 4: a hot meal on a plate, steam rising. */
function MealArt() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hwMePlate" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id="hwMeRice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="hwMeCurry" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      <ellipse cx="48" cy="89" rx="36" ry="4" fill="#0f172a" opacity=".14" />
      <ellipse cx="48" cy="77" rx="38" ry="11.5" fill="url(#hwMePlate)" />
      <ellipse cx="48" cy="75" rx="29" ry="8" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1" />
      <path d="M24 75c1.500-17 13-25 24-25s22.500 8 24 25c-8 5.500-40 5.500-48 0z" fill="url(#hwMeRice)" stroke="#e2e8f0" strokeWidth="1" />
      <circle cx="40" cy="65" r="1.100" fill="#cbd5e1" />
      <circle cx="48" cy="59" r="1.100" fill="#cbd5e1" />
      <circle cx="55" cy="66" r="1.100" fill="#cbd5e1" />
      <circle cx="46" cy="70" r="1.100" fill="#cbd5e1" />
      <circle cx="34" cy="72" r="1.100" fill="#cbd5e1" />
      <ellipse cx="64" cy="73" rx="10" ry="5" fill="url(#hwMeCurry)" />
      <ellipse cx="61" cy="71.500" rx="4" ry="1.500" fill="#fdba74" opacity=".8" />
      <ellipse cx="31" cy="74" rx="8" ry="4" fill="#22c55e" />
      <circle cx="28" cy="73" r="1.300" fill="#15803d" />
      <circle cx="33" cy="75" r="1.300" fill="#15803d" />
      <circle cx="35" cy="72.500" r="1.300" fill="#86efac" />
      <path className="hw-steam" d="M40 45c-4-5 4-8 0-14" fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" style={{ "--d": "0s" }} />
      <path className="hw-steam" d="M48 41c-4-6 4-9 0-16" fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" style={{ "--d": "0.6s" }} />
      <path className="hw-steam" d="M56 45c-4-5 4-8 0-14" fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" style={{ "--d": "1.2s" }} />
    </svg>
  );
}

/** Step 5: delivery scooter with a food box. Wheels spin, speed lines fly past. */
function DeliveryArt() {
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="hwDeBox" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="hwDeBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect x="4" y="81" width="88" height="3" rx="1.5" fill="#cbd5e1" />
      <path className="hw-speed" d="M6 46h12" stroke="#c4b5fd" strokeWidth="2.4" strokeLinecap="round" fill="none" style={{ "--d": "0s" }} />
      <path className="hw-speed" d="M3 54h15" stroke="#c4b5fd" strokeWidth="2.4" strokeLinecap="round" fill="none" style={{ "--d": "0.3s" }} />
      <path className="hw-speed" d="M7 62h11" stroke="#c4b5fd" strokeWidth="2.4" strokeLinecap="round" fill="none" style={{ "--d": "0.6s" }} />
      <g className="hw-ride">
        <circle cx="28" cy="72" r="9" fill="#1e293b" />
        <circle cx="28" cy="72" r="4.5" fill="#cbd5e1" />
        <g className="hw-spin" style={{ transformOrigin: "28px 72px" }}>
          <path d="M28 67.500v9M23.500 72h9" stroke="#64748b" strokeWidth="1.600" />
        </g>
        <circle cx="72" cy="72" r="9" fill="#1e293b" />
        <circle cx="72" cy="72" r="4.5" fill="#cbd5e1" />
        <g className="hw-spin" style={{ transformOrigin: "72px 72px" }}>
          <path d="M72 67.500v9M67.500 72h9" stroke="#64748b" strokeWidth="1.600" />
        </g>
        <path d="M30 59h28c4 0 7 2 9 6l1 3H30z" fill="url(#hwDeBody)" />
        <rect x="31" y="53.500" width="20" height="5.500" rx="2.750" fill="#1e293b" />
        <path d="M66 65l4-27" stroke="#6d28d9" strokeWidth="4.500" strokeLinecap="round" />
        <path d="M64 38h10" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" />
        <circle cx="75.500" cy="41" r="3.200" fill="#fde047" />
        <path d="M10 57h28" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
        <rect x="8" y="33" width="28" height="22" rx="4" fill="url(#hwDeBox)" />
        <rect x="8" y="41" width="28" height="3.500" fill="#ffffff" opacity=".45" />
        <circle cx="22" cy="49.500" r="2.500" fill="#ffffff" opacity=".85" />
        <path d="M46 53l-1-15 10 3 3 12z" fill="#1e293b" />
        <path d="M47 54l8 10" stroke="#1e293b" strokeWidth="4.500" strokeLinecap="round" />
        <path d="M53 41l11-3" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        <circle cx="50" cy="30" r="6.500" fill="#fbbf24" />
        <path d="M43.500 30a6.500 6.500 0 0 1 13 0z" fill="#ef4444" />
      </g>
    </svg>
  );
}

const HOW_STEPS = [
  {
    id: "account",
    Art: AccountArt,
    title: "Create your account",
    text: "Sign up with your name, phone number and address. It takes about one minute.",
    soft: "from-sky-100 via-sky-50 to-blue-100",
  },
  {
    id: "location",
    Art: LocationArt,
    title: "Set your delivery location",
    text: "Pin your home on the map. We deliver within 1 km of Golden Kitchen, Kakkanad.",
    soft: "from-rose-100 via-rose-50 to-pink-100",
  },
  {
    id: "wallet",
    Art: WalletArt,
    title: "Add money to your wallet",
    text: "Pay with UPI or GPay. Your balance is shown at the top and is used for every order.",
    soft: "from-emerald-100 via-emerald-50 to-teal-100",
  },
  {
    id: "meals",
    Art: MealArt,
    title: "Choose your meals",
    text: "Pick breakfast, lunch and dinner for a day, or start a 10-day Auto Order. One order per day.",
    soft: "from-orange-100 via-amber-50 to-orange-100",
  },
  {
    id: "track",
    Art: DeliveryArt,
    title: "Track and enjoy",
    text: "Follow your order from Placed to Delivered. Fresh, homely food reaches your door.",
    soft: "from-violet-100 via-fuchsia-50 to-violet-100",
  },
];

const CUTOFFS = [
  { emoji: "☕", label: "Breakfast", time: "7 PM" },
  { emoji: "🍛", label: "Lunch", time: "7 PM" },
  { emoji: "🌙", label: "Dinner", time: "9 PM" },
];

/** Small live preview at the bottom of each step card. Replays when the step becomes active. */
function StepDemo({ id, active }) {
  if (id === "account") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {["Name", "Phone", "Address"].map((t, k) => (
          <span
            key={t}
            className="hw-pop inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-bold text-sky-700 ring-1 ring-sky-200"
            style={{ "--d": `${k * 0.35}s` }}
          >
            <FaCheckCircle className="text-emerald-500" />
            {t}
          </span>
        ))}
      </div>
    );
  }

  if (id === "location") {
    return (
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5 flex-none">
          <span
            className={`absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 ${
              active ? "animate-ping" : ""
            }`}
          />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
        </span>
        <p className="text-xs font-bold text-slate-700">
          Delivery within <span className="text-rose-600">1 km</span> of the kitchen
        </p>
      </div>
    );
  }

  if (id === "wallet") {
    return (
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold text-slate-500">Sample balance</p>
          <p className="text-lg font-extrabold leading-tight tabular-nums text-emerald-600">
            ₹<CountUp key={active ? "on" : "off"} to={1000} />
          </p>
        </div>
        <div className="flex gap-1">
          {["UPI", "GPay"].map((t) => (
            <span key={t} className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              {t}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (id === "meals") {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {["☕", "🍛", "🌙"].map((e, k) => (
            <span
              key={e}
              className="hw-pop flex h-8 w-8 items-center justify-center rounded-full bg-white text-base ring-1 ring-orange-200"
              style={{ "--d": `${k * 0.3}s` }}
            >
              {e}
            </span>
          ))}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold text-slate-500">Auto Order full day</p>
          <p className="text-sm font-extrabold leading-tight text-orange-600">{formatINR(FULL_DAY_PRICE)}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="hw-barfill h-full w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
          style={{ transformOrigin: "left center" }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] font-bold text-slate-500">
        <span>Placed</span>
        <span>Preparing</span>
        <span>Delivered</span>
      </div>
    </div>
  );
}

function HowItWorks({ startTo, authed }) {
  const [ref, seen] = useSeen();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);
  const resume = useRef(null);
  const last = HOW_STEPS.length - 1;
  const reduced = prefersReducedMotion();

  // walk through the steps one by one so the customer sees the whole flow
  useEffect(() => {
    if (!seen || !auto || paused || prefersReducedMotion()) return undefined;
    const t = setInterval(() => setActive((i) => (i + 1) % HOW_STEPS.length), 3600);
    return () => clearInterval(t);
  }, [seen, auto, paused]);

  useEffect(() => () => clearTimeout(resume.current), []);

  // tap / click / focus a step: show it and pause the auto walk for a few seconds
  const pick = (i) => {
    setActive(i);
    setPaused(true);
    clearTimeout(resume.current);
    resume.current = setTimeout(() => setPaused(false), 7000);
  };

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative scroll-mt-16 overflow-hidden border-y border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white py-16 sm:py-24"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{ backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />
      <div className="home-drift-a pointer-events-none absolute -left-24 top-10 hidden h-80 w-80 rounded-full bg-orange-200/50 blur-3xl sm:block" />
      <div className="home-drift-b pointer-events-none absolute -right-24 bottom-10 hidden h-80 w-80 rounded-full bg-sky-200/50 blur-3xl sm:block" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-5">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Order in 5 simple steps
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Do steps 1 to 3 once. After that, ordering your daily meals takes only a few taps.
          </p>
          <button
            type="button"
            onClick={() => setAuto((a) => !a)}
            aria-pressed={auto}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-md ring-1 ring-slate-200 transition hover:shadow-lg active:scale-95"
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] text-white ${
                auto ? "bg-orange-500" : "bg-slate-400"
              }`}
            >
              {auto ? <FaPause /> : <FaPlay />}
            </span>
            Animation: {auto ? "On" : "Off"}
          </button>
        </Reveal>

        <div className="mt-10 sm:mt-12">
          {/* progress stepper */}
          <div className="relative mb-6 sm:mb-8">
            <span className="pointer-events-none absolute left-[10%] right-[10%] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-slate-200 lg:left-[calc(10%-0.5rem)] lg:right-[calc(10%-0.5rem)]">
              <span
                className="relative block h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width] duration-700 ease-out"
                style={{ width: `${seen ? (active / last) * 100 : 0}%` }}
              >
                <span className="absolute -right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-[0_0_14px_rgba(249,115,22,.9)] ring-4 ring-orange-400" />
              </span>
            </span>
            <div className="relative z-10 grid grid-cols-5 lg:gap-5">
              {HOW_STEPS.map((s, i) => (
                <div key={s.id} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    aria-label={`Step ${i + 1}: ${s.title}`}
                    aria-current={i === active ? "step" : undefined}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full text-sm font-extrabold transition-all duration-500 sm:h-12 sm:w-12 sm:text-base ${
                      i < active
                        ? "bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/30"
                        : i === active
                        ? "scale-110 bg-white text-orange-600 shadow-xl shadow-orange-500/30 ring-4 ring-orange-400"
                        : "bg-white text-slate-400 ring-2 ring-slate-200"
                    }`}
                  >
                    {i < active ? <FaCheck /> : i + 1}
                    {i === active && !reduced && (
                      <span aria-hidden="true" className="absolute inset-0 animate-ping rounded-full ring-4 ring-orange-300/60" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* step cards */}
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:gap-5">
            {HOW_STEPS.map((s, i) => {
              const Art = s.Art;
              const isActive = active === i;
              return (
                <li
                  key={s.id}
                  tabIndex={0}
                  onClick={() => pick(i)}
                  onFocus={() => pick(i)}
                  className={`cursor-pointer outline-none ${isActive ? "hw-on" : ""} ${
                    i === last ? "sm:col-span-2 lg:col-span-1" : ""
                  }`}
                  style={{
                    opacity: seen ? 1 : 0,
                    transform: seen ? "none" : "translate3d(0, 28px, 0) scale(.96)",
                    transition: `opacity .6s ease ${i * 140}ms, transform .6s cubic-bezier(.2,.7,.2,1) ${i * 140}ms`,
                  }}
                >
                  <div
                    className={`h-full rounded-3xl p-[2px] transition-all duration-500 ${
                      isActive
                        ? "bg-gradient-to-br from-orange-400 via-amber-300 to-orange-500 shadow-2xl shadow-orange-500/25 lg:-translate-y-2"
                        : "bg-slate-200/80 hover:-translate-y-1 hover:shadow-lg"
                    }`}
                  >
                    <div className="flex h-full flex-col rounded-[22px] bg-white p-4">
                      <div className={`relative flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${s.soft}`}>
                        <span className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/60" />
                        <span className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/50" />
                        <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-extrabold text-slate-700 shadow-sm">
                          Step {i + 1}
                        </span>
                        <div
                          className={`hw-art relative h-24 w-24 transition-transform duration-500 ${
                            isActive ? "scale-110" : "scale-100"
                          }`}
                        >
                          <Art />
                        </div>
                      </div>

                      <h3 className="mt-4 text-lg font-extrabold leading-snug text-slate-900">{s.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.text}</p>

                      <div className="mt-auto pt-4">
                        <div className="flex min-h-[3.25rem] flex-col justify-center rounded-2xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
                          <StepDemo id={s.id} active={isActive} />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* good to know */}
        <Reveal delay={100} className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0b1b3f] to-slate-900 p-5 text-white shadow-xl ring-1 ring-white/10">
            <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-500/30 blur-3xl" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-orange-500 text-xl text-white shadow-lg shadow-orange-500/30">
                <FaClock />
              </span>
              <div>
                <p className="text-base font-extrabold">Order time limit</p>
                <p className="text-xs leading-relaxed text-slate-300">Order or change before this time, the day before.</p>
              </div>
            </div>
            <div className="relative mt-4 grid grid-cols-3 gap-2">
              {CUTOFFS.map((c) => (
                <div key={c.label} className="rounded-2xl bg-white/10 px-2 py-3 text-center ring-1 ring-white/15">
                  <p className="text-xl leading-none" aria-hidden="true">
                    {c.emoji}
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-300">{c.label}</p>
                  <p className="text-base font-extrabold text-orange-300">{c.time}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white shadow-xl shadow-orange-500/25">
            <span className="pointer-events-none absolute -bottom-12 -left-10 h-36 w-36 rounded-full bg-white/20 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-white/20 text-xl text-white ring-1 ring-white/40">
                <FaBolt />
              </span>
              <div>
                <p className="text-base font-extrabold">10-day Auto Order</p>
                <p className="text-xs leading-relaxed text-orange-50">Order 10 days at once and save on every day.</p>
              </div>
            </div>
            <div className="relative mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-md">
                <p className="text-[11px] font-semibold text-slate-500">Full day</p>
                <p className="text-xl font-extrabold tabular-nums text-orange-600">{formatINR(FULL_DAY_PRICE)}</p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3 text-center shadow-md">
                <p className="text-[11px] font-semibold text-slate-500">Any two meals</p>
                <p className="text-xl font-extrabold tabular-nums text-orange-600">{formatINR(TWO_MEAL_PRICE)}</p>
              </div>
            </div>
            <p className="relative mt-3 text-center text-[11px] font-semibold text-orange-50">
              Take a leave on any day and it moves to the end of your plan.
            </p>
          </div>
        </Reveal>

        <Reveal delay={150} className="mt-10 flex justify-center">
          <Link
            to={startTo}
            className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/30 transition duration-300 hover:-translate-y-0.5 hover:from-orange-600 hover:to-amber-600 active:scale-[.98]"
          >
            {authed ? "Go to dashboard" : "Create free account"}
            <FaArrowRight className="text-xs transition group-hover:translate-x-1" />
          </Link>
        </Reveal>
      </div>
    </section>
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/90 p-4 sm:backdrop-blur-md"
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
    <section id="weekly-menu" className="relative scroll-mt-16 overflow-hidden bg-brand-gradient py-16 sm:py-24">
      <div className="bg-grid-dark absolute inset-0" />
      <div className="absolute -left-32 top-20 hidden h-96 w-96 rounded-full bg-blue-500/25 blur-3xl sm:block" />
      <div className="absolute -bottom-32 right-0 hidden h-[28rem] w-[28rem] rounded-full bg-orange-500/25 blur-3xl sm:block" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-5">
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

        <div className="mt-10 grid items-start gap-6 sm:mt-12 lg:grid-cols-5 lg:gap-8">
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
                    loading="lazy"
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
              <div className="absolute inset-0 hidden scale-95 rounded-[2rem] bg-gradient-to-br from-orange-400/30 to-indigo-400/30 blur-2xl sm:block" />

              <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/40 ring-1 ring-white/40">
                {/* header */}
                <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0b1b3f] to-slate-900 px-4 pb-4 pt-4 sm:px-5">
                  <span className="pointer-events-none absolute -right-10 -top-12 hidden h-36 w-36 rounded-full bg-orange-500/30 blur-3xl sm:block" />
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
  // Logged in -> secondary hero button goes to the user's dashboard, otherwise to register.
  const auth = getAuth();
  const startTo = auth ? dashboardFor(auth.role) : "/register";

  // "Explore Our Menu" scrolls to the weekly menu section.
  const scrollToMenu = (e) => {
    const el = document.getElementById("weekly-menu");
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  };

  return (
    // overflow-x: clip hides sideways overflow WITHOUT creating a scroll container
    // (overflow-x: hidden on html/body is what made mobile scrolling janky).
    <div
      className="flex min-h-screen w-full max-w-full flex-col bg-slate-50"
      style={{ overflowX: "clip" }}
    >
      <style>{`
        @keyframes homeFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes homeZoom { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
        @keyframes homeSlide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes homeBump { 0% { transform: scale(.82); opacity: .4; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes homeDrift { 0%, 100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(40px,-30px,0) scale(1.12); } }
        @keyframes homeSpin { to { transform: rotate(360deg); } }
        @keyframes homeSpinRev { to { transform: rotate(-360deg); } }
        @keyframes homeCue { 0%, 100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(7px); opacity: 1; } }
        @keyframes homeShine { 0% { transform: translateX(-120%) skewX(-20deg); } 60%, 100% { transform: translateX(260%) skewX(-20deg); } }

        .home-bump { animation: homeBump .32s cubic-bezier(.2,.8,.2,1); }

        /* Heavy background animations: desktop only, so phones scroll smoothly */
        @media (min-width: 1024px) and (prefers-reduced-motion: no-preference) {
          .home-drift-a { animation: homeDrift 14s ease-in-out infinite; }
          .home-drift-b { animation: homeDrift 17s ease-in-out -4s infinite; }
          .home-drift-c { animation: homeDrift 20s ease-in-out -8s infinite; }
          .home-spin-a { animation: homeSpin 40s linear infinite; }
          .home-spin-b { animation: homeSpinRev 60s linear infinite; }
          .home-cue { animation: homeCue 1.8s ease-in-out infinite; }
        }

        /* Phones: backdrop-filter repaints on every scroll frame and makes text vanish while scrolling fast */
        @media (max-width: 767px) {
          .glass {
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            background-color: rgba(255, 255, 255, 0.1) !important;
          }
        }

        /* How it works: illustrated icons animate while their step is active */
        @keyframes hwFill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes hwPop { 0% { transform: scale(.4); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes hwBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
        @keyframes hwRipple { 0% { transform: scale(.4); opacity: .8; } 100% { transform: scale(1.7); opacity: 0; } }
        @keyframes hwCoin { 0%, 100% { transform: scaleX(1) translateY(0); } 25% { transform: scaleX(.15) translateY(-3px); } 50% { transform: scaleX(1) translateY(-5px); } 75% { transform: scaleX(.15) translateY(-3px); } }
        @keyframes hwSteam { 0% { transform: translateY(4px); opacity: 0; } 40% { opacity: .9; } 100% { transform: translateY(-8px); opacity: 0; } }
        @keyframes hwSpin { to { transform: rotate(360deg); } }
        @keyframes hwSpeed { 0% { transform: translateX(8px); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(-8px); opacity: 0; } }
        @keyframes hwRide { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
        @keyframes hwBar { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes hwFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

        .hw-fill, .hw-pop, .hw-coin, .hw-ripple { transform-box: fill-box; }
        .hw-fill { transform-origin: left center; }
        .hw-pop, .hw-coin, .hw-ripple { transform-origin: center; }
        .hw-art { animation: hwFloat 4.5s ease-in-out infinite; }
        .hw-on .hw-fill { animation: hwFill .7s ease-out both; animation-delay: var(--d, 0s); }
        .hw-on .hw-pop { animation: hwPop .5s cubic-bezier(.2,1.4,.4,1) both; animation-delay: var(--d, 0s); }
        .hw-on .hw-bounce { animation: hwBounce 1.3s ease-in-out infinite; }
        .hw-on .hw-ripple { animation: hwRipple 1.8s ease-out infinite; animation-delay: var(--d, 0s); }
        .hw-on .hw-coin { animation: hwCoin 1.8s ease-in-out infinite; }
        .hw-on .hw-steam { animation: hwSteam 2s ease-in infinite; animation-delay: var(--d, 0s); }
        .hw-on .hw-spin { animation: hwSpin .8s linear infinite; }
        .hw-on .hw-speed { animation: hwSpeed .9s linear infinite; animation-delay: var(--d, 0s); }
        .hw-on .hw-ride { animation: hwRide .5s ease-in-out infinite; }
        .hw-on .hw-barfill { animation: hwBar 2.4s ease-out both; }

        @media (prefers-reduced-motion: reduce) {
          .home-drift-a, .home-drift-b, .home-drift-c, .home-spin-a, .home-spin-b, .home-cue, .home-bump, .hw-art, .hw-on * { animation: none !important; }
        }
      `}</style>

      <ScrollProgress />

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-brand-gradient">
        <div className="bg-grid-dark absolute inset-0" />

        {/* aurora blobs: static + lighter on phones, animated on desktop */}
        <div className="home-drift-a absolute -left-24 top-6 h-64 w-64 rounded-full bg-blue-500/30 blur-2xl sm:-left-32 sm:top-10 sm:h-96 sm:w-96 sm:bg-blue-500/35 sm:blur-3xl" />
        <div className="home-drift-b absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-orange-500/25 blur-2xl sm:-bottom-32 sm:right-0 sm:h-[28rem] sm:w-[28rem] sm:bg-orange-500/30 sm:blur-3xl" />
        <div className="home-drift-c absolute left-1/3 top-1/2 hidden h-72 w-72 rounded-full bg-violet-500/20 blur-3xl sm:block" />

        <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 pb-10 pt-7 sm:gap-14 sm:px-5 sm:pb-14 sm:pt-16 lg:grid-cols-2 lg:pb-16 lg:pt-28">
          <div className="animate-rise text-center lg:text-left">
            <div className="glass relative mb-5 inline-flex items-center gap-2 overflow-hidden rounded-full px-3.5 py-1.5 text-xs font-medium text-orange-200 sm:mb-6 sm:px-4 sm:py-2 sm:text-sm">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
                style={{ animation: "homeShine 4.5s ease-in-out infinite" }}
              />
              <GiHotMeal className="text-lg text-orange-500" />
              Meal ordering for homes, hostels and offices
            </div>

            <h1 className="text-[2rem] font-extrabold leading-[1.12] text-white sm:text-5xl lg:text-6xl">
              Every meal of the day, ordered in <span className="text-gradient">one place.</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-blue-100/80 sm:mt-6 sm:text-lg lg:mx-0">
              ORION FoodOrder lets you plan breakfast, lunch and dinner, pay by UPI, and follow each order in
              real time.
            </p>

            <div className="mt-5 flex items-center justify-center gap-3 lg:justify-start">
              <span className="text-sm font-semibold text-blue-100/80">Plan your</span>
              <RotatingMeal />
            </div>

            <div className="mt-7 flex flex-col justify-center gap-3 sm:mt-8 sm:flex-row lg:justify-start">
              <a
                href="#weekly-menu"
                onClick={scrollToMenu}
                className="btn-primary group relative overflow-hidden px-8 py-3.5 transition duration-300 active:scale-[.98]"
              >
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  style={{ animation: "homeShine 3.8s ease-in-out 1s infinite" }}
                />
                Explore Our Menu
                <FaArrowRight className="text-xs transition group-hover:translate-x-1" />
              </a>
              <Link to={startTo} className="btn-outline-light px-8 py-3.5 transition duration-300 active:scale-[.98]">
                {auth ? "Go to dashboard" : "Get started free"}
              </Link>
            </div>

            <ul className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[13px] text-blue-100/80 sm:mt-9 sm:gap-x-6 sm:text-sm lg:justify-start">
              {["UPI & GPay payments", "Live order tracking", "Separate staff and admin panels"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <FaCheckCircle className="text-orange-500" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-rise delay-200">
            <div className="relative">
              {/* rotating dashed rings (desktop only) */}
              <span
                aria-hidden="true"
                className="home-spin-a pointer-events-none absolute left-1/2 top-1/2 hidden h-[118%] w-[118%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20 lg:block"
              />
              <span
                aria-hidden="true"
                className="home-spin-b pointer-events-none absolute left-1/2 top-1/2 hidden h-[135%] w-[135%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 lg:block"
              />
              <Tilt>
                <SampleOrderCard />
              </Tilt>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 pb-12 sm:px-5 sm:pb-16 lg:pb-20">
          <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2.5 sm:gap-4">
            {HERO_STATS.map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl bg-gradient-to-b px-1.5 py-3.5 text-center ring-1 ring-white/20 sm:rounded-3xl sm:px-4 sm:py-5 ${s.tile}`}
              >
                <p className="text-xl leading-none sm:text-2xl" aria-hidden="true">
                  {s.emoji}
                </p>
                <p className="mt-2 font-display text-2xl font-extrabold leading-none text-white sm:text-3xl">
                  <CountUp to={s.value} />
                  <span className="text-sm text-orange-300 sm:text-base">{s.suffix}</span>
                </p>
                <p className="mt-1.5 text-[10px] font-semibold uppercase leading-tight tracking-wide text-blue-100/80 sm:text-xs">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 hidden justify-center lg:flex" aria-hidden="true">
            <span className="home-cue flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs text-white ring-1 ring-white/25">
              <FaChevronDown />
            </span>
          </div>
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 sm:py-24">
        <Reveal>
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-900/5 md:grid md:grid-cols-2">
            <div className="group relative flex min-h-[260px] items-center justify-center overflow-hidden bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4 md:min-h-[460px] lg:p-6">
              <img
                src={about1}
                alt="Orion Foods – Homely & Healthy Food"
                className="h-auto max-h-[560px] w-full rounded-2xl object-contain transition duration-700 group-hover:scale-[1.03]"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-14">
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

      {/* ============ HOW IT WORKS (3rd section) ============ */}
      <HowItWorks startTo={startTo} authed={Boolean(auth)} />

      {/* ============ WEEKLY MENU ============ */}
      <MenuShowcase />

      {/* ============ KITCHEN ============ */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 sm:py-24">
        <div className="grid items-center gap-10 md:grid-cols-2 lg:gap-16">
          <Reveal x={-40} y={20}>
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute inset-0 hidden scale-90 rounded-full bg-gradient-to-br from-orange-300/40 to-blue-300/40 blur-3xl sm:block" />
              <div className="relative flex items-center justify-center rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-900/5 sm:p-10">
                <img
                  src={CHEF_LOGO}
                  alt="Orion Foods chef"
                  className="h-auto max-h-[380px] w-full object-contain transition duration-500 hover:scale-105"
                  decoding="async"
                  loading="lazy"
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
      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 sm:px-5 sm:py-24">
        <Reveal className="mb-10 max-w-2xl sm:mb-14">
          <h2 className="text-3xl font-bold sm:text-4xl">Built for the way people actually eat</h2>
          <p className="mt-4 text-base text-slate-500 sm:text-lg">
            One platform for the person ordering, the team cooking and the admin keeping the books.
          </p>
        </Reveal>

        <div className="grid gap-5 md:grid-cols-6">
          <Reveal className="md:col-span-4">
            <div className="group relative h-full overflow-hidden rounded-3xl bg-[#0b1b3f] p-7 text-white transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/30 sm:p-8">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-600/40 blur-2xl sm:blur-3xl" />
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
            <div className="h-full rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/15 sm:p-8">
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
            <div className="card h-full p-7 transition duration-300 hover:-translate-y-1 hover:shadow-xl sm:p-8">
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
            <div className="card h-full p-7 transition duration-300 hover:shadow-xl sm:p-8">
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

      {/* ============ CTA ============ */}
      <section className="px-4 py-16 sm:px-5 sm:py-24">
        <Reveal scale={0.96} y={40}>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-brand-gradient px-6 py-14 text-center sm:px-16 sm:py-16">
            <div className="bg-grid-dark absolute inset-0" />
            <div className="absolute -bottom-20 left-1/2 h-64 w-96 -translate-x-1/2 rounded-full bg-orange-500/40 blur-2xl sm:blur-3xl" />
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
