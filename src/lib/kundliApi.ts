/**
 * Shared API helper for Kundli pipeline calls.
 * Routes requests to either Supabase Edge Functions or Google Cloud Run
 * based on the selected pipeline. Endpoints not available on Cloud Run
 * (e.g. store-kundli-pdf) automatically fall back to Supabase.
 */

export type Pipeline = 'supabase' | 'cloudrun';

/** Endpoints that exist on Cloud Run */
const CLOUD_RUN_ENDPOINTS = new Set([
  'load-kundli-sheet',
  'start-kundli-job',
  'process-kundli-job',
  'translate-kundli-report',
  'finalize-kundli-report',
  'get-kundli-job',
  'get-kundli-job-events',
  'decipher-kundli-input',
]);

/**
 * Low-level fetch that returns a raw Response.
 * Use for polling (GET) and fire-and-forget retriggers.
 */
export async function kundliApiFetch(
  pipeline: Pipeline,
  functionName: string,
  options: { method?: string; body?: any; query?: Record<string, string>; headers?: Record<string, string> } = {},
): Promise<Response> {
  // Auto-fallback: if Cloud Run doesn't host this endpoint, use Supabase
  const effectivePipeline =
    pipeline === 'cloudrun' && CLOUD_RUN_ENDPOINTS.has(functionName)
      ? 'cloudrun'
      : 'supabase';

  const { method = 'POST', body, query, headers: extraHeaders } = options;
  const qs = query ? '?' + new URLSearchParams(query).toString() : '';

  if (effectivePipeline === 'cloudrun') {
    const base = import.meta.env.VITE_CLOUD_RUN_URL;
    return fetch(`${base}/${functionName}${qs}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  // Supabase path
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return fetch(`${supabaseUrl}/functions/v1/${functionName}${qs}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      ...extraHeaders,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

/**
 * High-level invoke that returns `{ data, error }` — same shape as
 * `supabase.functions.invoke()` so callers need minimal changes.
 */
export async function kundliApiInvoke(
  pipeline: Pipeline,
  functionName: string,
  options: { body?: any } = {},
): Promise<{ data: any; error: any }> {
  try {
    const resp = await kundliApiFetch(pipeline, functionName, {
      method: 'POST',
      body: options.body,
    });
    const data = await resp.json();
    if (!resp.ok) {
      return { data: null, error: { message: data?.error || `HTTP ${resp.status}` } };
    }
    return { data, error: null };
  } catch (err: any) {
    return { data: null, error: { message: err.message || 'Network error' } };
  }
}
