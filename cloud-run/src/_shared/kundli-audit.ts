interface ReportInputRecord {
  jobId: string;
  visitorId?: string | null;
  sessionId?: string | null;
  source?: string;
  inputPayload: Record<string, unknown>;
  normalizedInput?: Record<string, unknown> | null;
}

interface ApiCallRecord {
  jobId: string;
  phase?: string;
  provider: string;
  apiName: string;
  requestPayload?: Record<string, unknown> | null;
  responsePayload?: Record<string, unknown> | null;
  httpStatus?: number | null;
  durationMs?: number | null;
  success: boolean;
  errorMessage?: string | null;
}

interface GeneratedReportRecord {
  jobId: string;
  language?: string;
  generationMode?: string | null;
  status: string;
  reportSummary?: Record<string, unknown> | null;
  pdfStorageBucket?: string | null;
  pdfStoragePath?: string | null;
  pdfSignedUrl?: string | null;
  pdfSizeBytes?: number | null;
  pageCount?: number | null;
}

function logNonFatal(prefix: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Unknown error");
  console.warn(`${prefix}: ${message}`);
}

export async function upsertKundliReportInput(supabase: any, record: ReportInputRecord) {
  try {
    const { error } = await supabase
      .from("kundli_report_inputs")
      .upsert({
        job_id: record.jobId,
        visitor_id: record.visitorId || null,
        session_id: record.sessionId || null,
        source: record.source || "web_form",
        input_payload: record.inputPayload,
        normalized_input: record.normalizedInput || null,
      }, { onConflict: "job_id" });
    if (error) logNonFatal("[KUNDLI-AUDIT] Could not upsert kundli_report_inputs", error);
  } catch (error) {
    logNonFatal("[KUNDLI-AUDIT] Failed upserting kundli_report_inputs", error);
  }
}

export async function insertKundliApiCall(supabase: any, record: ApiCallRecord) {
  try {
    const { error } = await supabase.from("kundli_api_calls").insert({
      job_id: record.jobId,
      phase: record.phase || null,
      provider: record.provider,
      api_name: record.apiName,
      request_payload: record.requestPayload || null,
      response_payload: record.responsePayload || null,
      http_status: record.httpStatus ?? null,
      duration_ms: record.durationMs ?? null,
      success: record.success,
      error_message: record.errorMessage || null,
    });
    if (error) logNonFatal("[KUNDLI-AUDIT] Could not insert kundli_api_calls", error);
  } catch (error) {
    logNonFatal("[KUNDLI-AUDIT] Failed inserting kundli_api_calls", error);
  }
}

export async function insertKundliApiCalls(supabase: any, records: ApiCallRecord[]) {
  if (!records.length) return;
  try {
    const rows = records.map((record) => ({
      job_id: record.jobId,
      phase: record.phase || null,
      provider: record.provider,
      api_name: record.apiName,
      request_payload: record.requestPayload || null,
      response_payload: record.responsePayload || null,
      http_status: record.httpStatus ?? null,
      duration_ms: record.durationMs ?? null,
      success: record.success,
      error_message: record.errorMessage || null,
    }));
    const { error } = await supabase.from("kundli_api_calls").insert(rows);
    if (error) logNonFatal("[KUNDLI-AUDIT] Could not insert batch kundli_api_calls", error);
  } catch (error) {
    logNonFatal("[KUNDLI-AUDIT] Failed inserting batch kundli_api_calls", error);
  }
}

export async function upsertKundliGeneratedReport(supabase: any, record: GeneratedReportRecord) {
  try {
    const { error } = await supabase
      .from("kundli_generated_reports")
      .upsert({
        job_id: record.jobId,
        language: record.language || "en",
        generation_mode: record.generationMode || null,
        status: record.status,
        report_summary: record.reportSummary || null,
        pdf_storage_bucket: record.pdfStorageBucket || null,
        pdf_storage_path: record.pdfStoragePath || null,
        pdf_signed_url: record.pdfSignedUrl || null,
        pdf_size_bytes: record.pdfSizeBytes ?? null,
        page_count: record.pageCount ?? null,
      }, { onConflict: "job_id" });
    if (error) logNonFatal("[KUNDLI-AUDIT] Could not upsert kundli_generated_reports", error);
  } catch (error) {
    logNonFatal("[KUNDLI-AUDIT] Failed upserting kundli_generated_reports", error);
  }
}
