import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

interface JobRequest {
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
  language?: "en" | "hi" | "te" | "kn" | "mr" | "ta" | "gu";
  gender?: "M" | "F" | "O";
  hasTime?: boolean;
  visitorId: string;
  sessionId: string;
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const body: JobRequest = req.body;
    console.log("📝 [START-JOB] Creating Kundli report job for:", body.name, "| GENDER received from frontend:", JSON.stringify(body.gender), "| raw body keys:", Object.keys(body).join(","));

    const { name, dateOfBirth, timeOfBirth, placeOfBirth, latitude, longitude, timezone, language = "en", gender = "M", hasTime = true, visitorId, sessionId } = body;
    console.log(`📝 [START-JOB] GENDER after destructure: "${gender}" (body.gender was: "${body.gender}") hasTime=${hasTime}`);

    // Validate required fields
    if (!name || !dateOfBirth || !timeOfBirth || latitude === undefined || longitude === undefined || !visitorId || !sessionId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL ?? "",
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
    );

    // Insert job record
    const { data: job, error: insertError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .insert({
        visitor_id: visitorId,
        session_id: sessionId,
        name,
        date_of_birth: dateOfBirth,
        time_of_birth: timeOfBirth,
        place_of_birth: placeOfBirth,
        latitude,
        longitude,
        timezone,
        language,
        gender,
        has_time: hasTime !== false,
        status: "pending",
        progress_percent: 0,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("❌ [START-JOB] Failed to create job:", insertError);
      return res.status(500).json({ error: "Failed to create job" });
    }

    console.log("✅ [START-JOB] Job created:", job.id);

    // Trigger the worker function asynchronously (self-call within same Cloud Run instance)
    const PORT = process.env.PORT || 8080;
    const workerUrl = `http://localhost:${PORT}/process-kundli-job`;

    // Fire-and-forget: trigger process-kundli-job without waiting
    fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    }).catch(err => {
      console.error("⚠️ [START-JOB] Failed to trigger worker:", err);
    });

    res.json({ jobId: job.id, status: "pending" });
  } catch (error) {
    console.error("❌ [START-JOB] Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
});

export default router;
