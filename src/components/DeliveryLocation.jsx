import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  FaLocationArrow,
  FaMapMarkerAlt,
  FaPen,
  FaExternalLinkAlt,
  FaExclamationTriangle,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import API from "../services/api";
import {
  LOW_ACCURACY_METERS,
  KITCHEN_LOCATION,
  MAX_DELIVERY_KM,
  isDeliverable,
  pincodeMessage,
  hasLocation,
  mapsLink,
  distanceFromKitchen,
  distanceMessage,
} from "../assets/utils/delivery";

/* Map opens centred on the kitchen when nothing is saved and GPS is not used. */
const DEFAULT_CENTER = [KITCHEN_LOCATION.lat, KITCHEN_LOCATION.lng];

const PIN_ICON = L.divIcon({
  className: "",
  html: `<svg width="34" height="44" viewBox="0 0 24 32" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20 12 32 12 32s12-12 12-20.3C24 5.2 18.6 0 12 0z" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/><circle cx="12" cy="11.5" r="4.5" fill="#ffffff"/></svg>`,
  iconSize: [34, 44],
  iconAnchor: [17, 44],
});

/* ---------- address (place name) from lat/lng, with caching so it shows instantly ---------- */
const ADDRESS_TIMEOUT_MS = 6000;
const STORE_PREFIX = "addr:";

const resolvedAddresses = new Map(); // key -> address text (this tab, in memory)
const inflightAddresses = new Map(); // key -> pending request

const cacheKey = (lat, lng) => `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;

const readStored = (key) => {
  try {
    return sessionStorage.getItem(STORE_PREFIX + key) || "";
  } catch {
    return "";
  }
};

const writeStored = (key, value) => {
  try {
    sessionStorage.setItem(STORE_PREFIX + key, value);
  } catch {
    /* storage can be full or blocked: ignore */
  }
};

/* Returns the address if we already have it (instant), otherwise "" */
const getCachedAddress = (lat, lng) => {
  if (typeof lat !== "number" || typeof lng !== "number") return "";
  const key = cacheKey(lat, lng);
  if (resolvedAddresses.has(key)) return resolvedAddresses.get(key);
  const stored = readStored(key);
  if (stored) {
    resolvedAddresses.set(key, stored);
    return stored;
  }
  return "";
};

const fetchAddress = (lat, lng) => {
  const key = cacheKey(lat, lng);

  const cached = getCachedAddress(lat, lng);
  if (cached) return Promise.resolve(cached);
  if (inflightAddresses.has(key)) return inflightAddresses.get(key);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ADDRESS_TIMEOUT_MS);

  const promise = fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&accept-language=en&lat=${lat}&lon=${lng}`,
    { signal: controller.signal }
  )
    .then((res) => {
      if (!res.ok) throw new Error("Address lookup failed");
      return res.json();
    })
    .then((data) => {
      const a = (data && data.address) || {};
      const parts = [
        a.amenity || a.building || a.shop,
        a.road,
        a.neighbourhood || a.suburb,
        a.village || a.town || a.city,
        a.state_district || a.county,
        a.postcode,
      ].filter(Boolean);
      const unique = parts.filter((p, i) => parts.indexOf(p) === i);
      const text = unique.length
        ? unique.join(", ")
        : String((data && data.display_name) || "").replace(/,\s*India$/i, "");
      if (!text) throw new Error("No address found");

      resolvedAddresses.set(key, text);
      writeStored(key, text);
      return text;
    })
    .finally(() => {
      clearTimeout(timer);
      inflightAddresses.delete(key); // failures are not cached, so the next try can retry
    });

  inflightAddresses.set(key, promise);
  return promise;
};

/* Returns { address, loading } for a saved location */
export function useLocationAddress(location) {
  const lat = location && typeof location.lat === "number" ? location.lat : null;
  const lng = location && typeof location.lng === "number" ? location.lng : null;
  const saved = (location && location.address) || "";

  // start with whatever we already know, so the box is filled on the first render
  const [state, setState] = useState(() => ({
    address: saved || (lat != null && lng != null ? getCachedAddress(lat, lng) : ""),
    loading: false,
  }));

  useEffect(() => {
    if (lat == null || lng == null) {
      setState({ address: "", loading: false });
      return undefined;
    }
    if (saved) {
      setState({ address: saved, loading: false });
      return undefined;
    }
    const cached = getCachedAddress(lat, lng);
    if (cached) {
      setState({ address: cached, loading: false });
      return undefined;
    }

    let active = true;
    setState({ address: "", loading: true });
    fetchAddress(lat, lng)
      .then((address) => active && setState({ address, loading: false }))
      .catch(() => active && setState({ address: "", loading: false }));

    return () => {
      active = false;
    };
  }, [lat, lng, saved]);

  return state;
}

/* Read-only location block (used in the order details modal) */
export function LocationSummary({ location }) {
  const has = hasLocation(location);
  const { address, loading } = useLocationAddress(has ? location : null);

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-white text-sm text-sky-600 shadow-sm">
        <FaMapMarkerAlt />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Delivery location</p>
        {has ? (
          <>
            {loading ? (
              <p className="text-sm font-semibold text-slate-400">Finding address…</p>
            ) : (
              address && <p className="break-words text-sm font-bold text-slate-800">{address}</p>
            )}
            {location.note && <p className="break-words text-xs text-slate-600">{location.note}</p>}
            <p className="text-[11px] tabular-nums text-slate-400">
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </p>
            <a
              href={mapsLink(location.lat, location.lng)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline"
            >
              Open in Maps <FaExternalLinkAlt className="text-[10px]" />
            </a>
          </>
        ) : (
          <p className="text-sm font-bold text-slate-500">No location set yet</p>
        )}
      </div>
    </div>
  );
}

/* ---------- customer delivery details: remembered in memory so the modal opens instantly ---------- */
let deliveryCache = null; // { userId, customer }

const currentUserId = () => {
  try {
    const stored = JSON.parse(localStorage.getItem("user") || "null");
    return (stored && stored._id) || null;
  } catch {
    return null;
  }
};

/* Only returns data that belongs to the user who is logged in right now */
const cachedCustomer = () => {
  const id = currentUserId();
  return id && deliveryCache && deliveryCache.userId === id ? deliveryCache.customer : null;
};

const rememberCustomer = (customer) => {
  const id = currentUserId();
  if (id && customer) deliveryCache = { userId: id, customer };
};

/* Loads the logged-in customer's pincode + saved location */
export function useCustomerDelivery(active = true) {
  const [customer, setCustomerState] = useState(() => cachedCustomer());
  const [loading, setLoading] = useState(() => !cachedCustomer());

  const load = useCallback(async () => {
    // when we already have data, refresh quietly in the background instead of showing a skeleton
    if (!cachedCustomer()) setLoading(true);
    try {
      const { data } = await API.get("/customers/me");
      rememberCustomer(data);
      setCustomerState(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't load your delivery details");
    } finally {
      setLoading(false);
    }
  }, []);

  const setCustomer = useCallback((next) => {
    rememberCustomer(next);
    setCustomerState(next);
  }, []);

  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const pincode = customer?.pincode || "";

  return {
    customer,
    setCustomer,
    loading,
    pincode,
    deliverable: isDeliverable(pincode),
    location: hasLocation(customer?.location) ? customer.location : null,
    reload: load,
  };
}

/* Full-screen map: tap the map or drag the pin to choose the exact spot */
function MapPicker({ initial, initialNote, autoLocate, allowDetect, onClose, onConfirm }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  const [point, setPoint] = useState(initial ? { lat: initial.lat, lng: initial.lng } : null);
  const [accuracy, setAccuracy] = useState(null);
  const [note, setNote] = useState(initialNote || "");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickAddress, setPickAddress] = useState("");

  const place = useCallback((lat, lng, fromGps, acc) => {
    const map = mapRef.current;
    if (!map) return;

    if (!markerRef.current) {
      const marker = L.marker([lat, lng], { draggable: true, icon: PIN_ICON }).addTo(map);
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setPoint({ lat: p.lat, lng: p.lng });
        setAccuracy(null);
        if (circleRef.current) {
          circleRef.current.remove();
          circleRef.current = null;
        }
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }

    setPoint({ lat, lng });

    if (circleRef.current) {
      circleRef.current.remove();
      circleRef.current = null;
    }
    if (fromGps && acc > 0) {
      circleRef.current = L.circle([lat, lng], {
        radius: acc,
        color: "#0ea5e9",
        weight: 1,
        fillColor: "#0ea5e9",
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(map);
      setAccuracy(acc);
    } else {
      setAccuracy(null);
    }
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location. Tap the map to choose your spot.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        place(latitude, longitude, true, Math.round(acc || 0));
        if (mapRef.current) mapRef.current.setView([latitude, longitude], 15);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(
          err.code === 1
            ? "Location permission denied. You can still tap the map to choose your spot."
            : "Couldn't get your location. Tap the map to choose your spot."
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }, [place]);

  /* create the map once */
  useEffect(() => {
    if (!elRef.current) return undefined;

    const start = initial ? [initial.lat, initial.lng] : DEFAULT_CENTER;
    // the delivery area is only 1 km wide, so open zoomed in (zoom 14 shows the whole circle)
    const map = L.map(elRef.current, { zoomControl: true }).setView(start, initial ? 15 : 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;

    /* delivery area: kitchen + 1 km circle (not clickable, so taps still reach the map) */
    L.circle(DEFAULT_CENTER, {
      radius: MAX_DELIVERY_KM * 1000,
      color: "#f97316",
      weight: 2,
      dashArray: "6 6",
      fillColor: "#f97316",
      fillOpacity: 0.05,
      interactive: false,
    }).addTo(map);
    L.circleMarker(DEFAULT_CENTER, {
      radius: 7,
      color: "#ffffff",
      weight: 2,
      fillColor: "#f97316",
      fillOpacity: 1,
      interactive: false,
    }).addTo(map);

    map.on("click", (e) => place(e.latlng.lat, e.latlng.lng, false, 0));

    if (initial) place(initial.lat, initial.lng, false, 0);

    const t = setTimeout(() => map.invalidateSize(), 150);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* "Use my current location" opens the map and fetches GPS right away */
  useEffect(() => {
    if (autoLocate) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Look up the address for the pin as soon as it is placed, so it is ready when the user confirms.
     Waits a moment so dragging the pin around does not fire many requests. */
  useEffect(() => {
    if (!point) {
      setPickAddress("");
      return undefined;
    }
    const cached = getCachedAddress(point.lat, point.lng);
    if (cached) {
      setPickAddress(cached);
      return undefined;
    }

    setPickAddress("");
    let active = true;
    const timer = setTimeout(() => {
      fetchAddress(point.lat, point.lng)
        .then((address) => active && setPickAddress(address))
        .catch(() => {});
    }, 700);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [point]);

  /* Escape closes only this picker (not the modal behind it) */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        if (!saving) onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, saving]);

  const km = point ? distanceFromKitchen(point.lat, point.lng) : null;
  const tooFar = km != null && km > MAX_DELIVERY_KM;

  const confirm = async () => {
    if (!point) {
      toast.error("Tap the map or use your current location to place the pin");
      return;
    }
    if (tooFar) {
      toast.error(distanceMessage(km));
      return;
    }
    setSaving(true);
    const payload = { lat: point.lat, lng: point.lng, note: note.trim() };
    if (accuracy != null) payload.accuracy = accuracy;
    // the server keeps this only if it is set up to store an address
    if (pickAddress) payload.address = pickAddress;
    const ok = await onConfirm(payload);
    setSaving(false);
    if (ok) onClose();
  };

  const lowAccuracy = accuracy != null && accuracy > LOW_ACCURACY_METERS;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 sm:items-center sm:p-4">
      <div className="flex max-h-[96dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Choose delivery location</h3>
            <p className="text-xs text-slate-500">
              Tap the map or drag the red pin. We deliver within {MAX_DELIVERY_KM} km of our kitchen (orange circle).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close map"
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
          >
            <FaTimes />
          </button>
        </div>

        <div className="relative">
          <div
            ref={elRef}
            className="h-[48dvh] min-h-[260px] w-full"
            style={{ position: "relative", zIndex: 0 }}
          />
          {allowDetect && (
            <button
              type="button"
              onClick={locate}
              disabled={locating}
              className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-slate-800 shadow-lg ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-60"
              style={{ zIndex: 500 }}
            >
              <FaLocationArrow className="text-sky-600" />
              {locating ? "Locating…" : "My location"}
            </button>
          )}
        </div>

        <div className="space-y-2 overflow-y-auto px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold tabular-nums text-slate-700">
              {point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "No pin placed yet"}
            </span>
            {accuracy != null && (
              <span className={`font-semibold ${lowAccuracy ? "text-amber-600" : "text-emerald-600"}`}>
                GPS ±{accuracy} m{lowAccuracy ? " · drag the pin if it's off" : ""}
              </span>
            )}
          </div>

          {pickAddress && <p className="break-words text-xs font-semibold text-slate-600">{pickAddress}</p>}

          {km != null &&
            (tooFar ? (
              <p className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                <FaExclamationTriangle className="mt-0.5 flex-none" />
                {distanceMessage(km)}
              </p>
            ) : (
              <p className="text-xs font-semibold text-emerald-600">
                {km.toFixed(2)} km from our kitchen · within delivery area
              </p>
            ))}

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">Landmark / note (optional)</label>
            <input
              type="text"
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Near the temple, 2nd floor"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-300 bg-white py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={saving || !point || tooFar}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaCheck />
              {saving ? "Saving…" : "Confirm location"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* Location view + map picker. Used by customer and admin. */
export function LocationPanel({ location, onSave, allowDetect = true }) {
  const [picker, setPicker] = useState(null); // null | { auto: boolean }
  const has = hasLocation(location);
  const lowAccuracy = has && typeof location.accuracy === "number" && location.accuracy > LOW_ACCURACY_METERS;
  const { address, loading: addressLoading } = useLocationAddress(has ? location : null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-sky-50 text-sky-600">
          <FaMapMarkerAlt />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Delivery location</p>
          {has ? (
            <>
              {addressLoading ? (
                <p className="mt-0.5 text-sm font-semibold text-slate-400">Finding address…</p>
              ) : address ? (
                <p className="mt-0.5 break-words text-sm font-bold text-slate-900">{address}</p>
              ) : (
                <p className="mt-0.5 text-sm font-bold text-slate-900">Pinned location</p>
              )}
              <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-500">
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
              </p>
              {typeof location.accuracy === "number" && (
                <p className={`text-xs font-semibold ${lowAccuracy ? "text-amber-600" : "text-emerald-600"}`}>
                  GPS ±{location.accuracy} m{lowAccuracy ? " · low accuracy" : ""}
                </p>
              )}
              {location.note && <p className="break-words text-xs text-slate-600">{location.note}</p>}
              {location.updatedAt && (
                <p className="text-[11px] text-slate-400">
                  Updated {new Date(location.updatedAt).toLocaleString("en-IN")}
                </p>
              )}
              <a
                href={mapsLink(location.lat, location.lng)}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-sky-700 hover:underline"
              >
                Open in Maps <FaExternalLinkAlt className="text-[10px]" />
              </a>
            </>
          ) : (
            <p className="mt-0.5 text-sm text-slate-500">No location set yet</p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {allowDetect && (
          <button
            type="button"
            onClick={() => setPicker({ auto: true })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
          >
            <FaLocationArrow />
            Use my current location
          </button>
        )}
        <button
          type="button"
          onClick={() => setPicker({ auto: false })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
        >
          <FaPen />
          {has ? "Edit on map" : "Choose on map"}
        </button>
      </div>

      {picker && (
        <MapPicker
          initial={has ? { lat: location.lat, lng: location.lng } : null}
          initialNote={has ? location.note || "" : ""}
          autoLocate={picker.auto}
          allowDetect={allowDetect}
          onClose={() => setPicker(null)}
          onConfirm={onSave}
        />
      )}
    </div>
  );
}

/* Customer-side card: pincode alert + location panel */
export function DeliveryLocationCard({ delivery, showAlert = true }) {
  const { loading, pincode, deliverable, location, setCustomer } = delivery;

  const save = async (payload) => {
    try {
      const { data } = await API.put("/customers/me/location", payload);
      setCustomer(data);
      toast.success("Delivery location saved");
      window.dispatchEvent(new Event("profile:updated"));
      return true;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't save the location");
      return false;
    }
  };

  if (loading) return <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />;

  return (
    <div className="space-y-2">
      {showAlert && !deliverable && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600">
          <FaExclamationTriangle className="mt-0.5 flex-none" />
          {pincodeMessage(pincode)}
        </p>
      )}
      <LocationPanel location={location} onSave={save} />
    </div>
  );
}