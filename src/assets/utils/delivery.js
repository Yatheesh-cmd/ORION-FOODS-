export const DELIVERY_PINCODE = "682048";

export const LOW_ACCURACY_METERS = 100;

/* Kitchen: Golden Cassia Business Hotel, Kakkanad (same value as the backend file). */
export const KITCHEN_LOCATION = { lat: 10.0166811, lng: 76.361225 };

/* Maximum delivery distance from the kitchen, in km */
export const MAX_DELIVERY_KM = 1;

export const isDeliverable = (pincode) => String(pincode || "").trim() === DELIVERY_PINCODE;

export const pincodeMessage = (pincode) =>
  pincode
    ? `Sorry, we deliver only to pincode ${DELIVERY_PINCODE}. Your pincode ${pincode} is not valid for delivery. Please change your pincode in your Profile.`
    : `We deliver only to pincode ${DELIVERY_PINCODE}. Please add your pincode in your Profile.`;

export const hasLocation = (loc) =>
  Boolean(loc) && typeof loc.lat === "number" && typeof loc.lng === "number";

export const mapsLink = (lat, lng) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

/* Straight-line distance in km (haversine) */
export const distanceKm = (lat1, lng1, lat2, lng2) => {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const distanceFromKitchen = (lat, lng) =>
  distanceKm(lat, lng, KITCHEN_LOCATION.lat, KITCHEN_LOCATION.lng);

export const distanceMessage = (km) =>
  `This location is ${km.toFixed(1)} km away from our kitchen. We deliver only within ${MAX_DELIVERY_KM} km.`;