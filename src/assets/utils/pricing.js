export const PRICE = { breakfast: 70, lunch: 80, dinner: 90 };
export const AUTO_DAYS = 10;
export const FULL_DAY_PRICE = 200;
export const TWO_MEAL_PRICE = 145;
export const MIN_BALANCE = 500;

export const formatINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export const normalCost = (b, l, d) => b * PRICE.breakfast + l * PRICE.lunch + d * PRICE.dinner;

export const autoDayCost = (b, l, d) => {
  const bb = b > 0 ? 1 : 0;
  const ll = l > 0 ? 1 : 0;
  const dd = d > 0 ? 1 : 0;
  const n = bb + ll + dd;
  if (n === 3) return FULL_DAY_PRICE;
  if (n === 2) return TWO_MEAL_PRICE;
  return normalCost(bb, ll, dd);
};
