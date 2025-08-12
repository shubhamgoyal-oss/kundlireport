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
    await supabase.from("analytics_events").insert([
      {
        event_name,
        page: payload.page ?? null,
        step: payload.step ?? null,
        puja_id: payload.puja_id ?? null,
        puja_name: payload.puja_name ?? null,
        metadata: payload.metadata ?? null,
        session_id,
        user_id: null,
      },
    ]);
  } catch (err) {
    console.warn("trackEvent failed", err);
  }
}
