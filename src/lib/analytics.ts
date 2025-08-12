import { supabase } from "@/integrations/supabase/client";

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
};

export async function trackEvent(event_name: string, payload: TrackEventPayload = {}) {
  try {
    const session_id = getSessionId();
    const visitor_id = getVisitorId();
    await supabase.from("analytics_events").insert([
      {
        event_name,
        page: payload.page ?? null,
        step: payload.step ?? null,
        puja_id: payload.puja_id ?? null,
        puja_name: payload.puja_name ?? null,
        metadata: payload.metadata ?? null,
        session_id,
        visitor_id,
        user_id: null,
      },
    ]);
  } catch (err) {
    console.warn("trackEvent failed", err);
  }
}
