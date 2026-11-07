import { useEffect, useState } from "react";

export const MEAL_KEYS = ["breakfast", "lunch", "dinner"];
export const MEAL_LABEL = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" };

const CUT_HOUR = { breakfast: 19, lunch: 19, dinner: 21 };
const DAY_MS = 86400000;
const HOUR_MS = 3600000;

export const todayIST = () => new Date(Date.now() + 19800000).toISOString().slice(0, 10);

export const addDays = (date, n) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

export const dateKey = (value) => String(value || "").slice(0, 10);

export const cutoffMs = (date, meal) =>
  Date.parse(`${date}T00:00:00+05:30`) - (24 - CUT_HOUR[meal]) * HOUR_MS;

export const isMealOpen = (date, meal, now = Date.now()) => Boolean(date) && now < cutoffMs(date, meal);

export const openUntil = (date, meal) =>
  new Date(cutoffMs(date, meal)).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

export const shortDate = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export const dayLabel = (date) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

export const closedMessage = (date, meal) =>
  `${MEAL_LABEL[meal]} for ${shortDate(date)} can't be added or changed any more. It closed on ${openUntil(date, meal)}.`;

export const useNow = (ms = 30000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
};