import { supabase } from "@/integrations/supabase/client";
import { getUserLocation } from "@/utils/geolocation";

const SESSION_KEY = "analytics_session_id";

function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anon-session";
  }
}

const VISITOR_KEY = "analytics_visitor_id";

function setCookie(name: string, value: string, days: number) {
  try {
    const maxAge = Math.floor(days * 24 * 60 * 60);
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; samesite=lax`;
  } catch {
    // ignore
  }
}

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[-.]/g, "\\$&")}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function generateId(): string {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY) || getCookie(VISITOR_KEY);
    if (!id) {
      id = generateId();
    }
    try {
      localStorage.setItem(VISITOR_KEY, id);
    } catch {}
    setCookie(VISITOR_KEY, id, 400); // ~13 months
    return id;
  } catch {
    let id = getCookie(VISITOR_KEY);
    if (!id) {
      id = generateId();
      setCookie(VISITOR_KEY, id, 400);
    }
    return id;
  }
}

export type TrackEventPayload = {
  page?: string;
  step?: number;
  puja_id?: number;
  puja_name?: string;
  metadata?: Record<string, any> | null;
  user_country?: string | null;
  user_city?: string | null;
  user_latitude?: number | null;
  user_longitude?: number | null;
};

export async function trackEvent(event_name: string, payload: TrackEventPayload = {}) {
  try {
    const session_id = getSessionId();
    const visitor_id = getVisitorId();

    // Get user's current location
    const location = await getUserLocation();

    const now = new Date();
    const nowUtcIso = now.toISOString();
    const event_time_ist_str = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);

    await supabase.from("analytics_events").insert([
      {
        event_name,
        page: payload.page ?? null,
        step: payload.step ?? null,
        puja_id: payload.puja_id ?? null,
        puja_name: payload.puja_name ?? null,
        metadata: {
          ...(payload.metadata ?? {}),
          event_time_utc: nowUtcIso,
          event_time_ist: event_time_ist_str,
          tz: "Asia/Kolkata",
          tz_offset_min: 330,
        },
        session_id,
        visitor_id,
        user_id: null,
        user_country: payload.user_country ?? location.country,
        user_city: payload.user_city ?? location.city,
        user_latitude: payload.user_latitude ?? location.latitude,
        user_longitude: payload.user_longitude ?? location.longitude,
      },
    ]);
  } catch (err) {
    console.warn("trackEvent failed", err);
  }
}
