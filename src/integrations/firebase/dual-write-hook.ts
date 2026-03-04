/**
 * Dual-Write Hook for React Components
 *
 * After Supabase job creation, automatically mirror to Firebase
 * No Supabase changes needed — just call this hook after invoking start-kundli-job
 */

import { doc, setDoc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from './client';
import { ENABLE_DUAL_WRITE } from './config';

interface JobData {
  jobId: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
  language: string;
  gender: string;
  visitorId: string;
  sessionId: string;
}

/**
 * After Supabase.functions.invoke('start-kundli-job') succeeds,
 * call this to mirror the job to Firebase
 *
 * Usage:
 *   const result = await supabase.functions.invoke('start-kundli-job', { body: {...} });
 *   if (result.data?.jobId) {
 *     await mirrorJobStartToFirebase({ jobId: result.data.jobId, ...jobDetails });
 *   }
 */
export async function mirrorJobStartToFirebase(jobData: JobData): Promise<void> {
  if (!ENABLE_DUAL_WRITE) return; // Skip if dual-write disabled

  try {
    const jobRef = doc(db, 'kundli_report_jobs', jobData.jobId);

    await setDoc(jobRef, {
      visitorId: jobData.visitorId,
      sessionId: jobData.sessionId,
      name: jobData.name,
      dateOfBirth: new Date(jobData.dateOfBirth),
      timeOfBirth: jobData.timeOfBirth,
      placeOfBirth: jobData.placeOfBirth,
      latitude: jobData.latitude,
      longitude: jobData.longitude,
      timezone: jobData.timezone,
      language: jobData.language,
      gender: jobData.gender,
      status: 'pending',
      currentPhase: 'pending',
      progressPercent: 0,
      createdAt: Timestamp.now(),
      heartbeatAt: Timestamp.now(),
    });

    console.log(`✅ [Dual-Write] Job ${jobData.jobId} created in Firebase`);
  } catch (error) {
    // Fail silently — Supabase is primary
    console.warn(`⚠️ [Dual-Write] Failed to mirror job to Firebase:`, error);
  }
}

/**
 * Call this in the polling loop to update job status in Firebase
 * This mirrors what Supabase is returning
 */
export async function updateJobStatusInFirebaseFromPolling(
  jobId: string,
  status: string,
  currentPhase: string,
  progressPercent: number,
  errorMessage?: string
): Promise<void> {
  if (!ENABLE_DUAL_WRITE) return;

  try {
    const updates: Record<string, any> = {
      status,
      currentPhase,
      progressPercent,
      heartbeatAt: Timestamp.now(),
    };

    if (errorMessage) {
      updates.errorMessage = errorMessage;
    }

    if (status === 'completed') {
      updates.completedAt = Timestamp.now();
    }

    const jobRef = doc(db, 'kundli_report_jobs', jobId);
    await updateDoc(jobRef, updates);

    console.log(`✅ [Dual-Write] Job ${jobId} status updated in Firebase`);
  } catch (error) {
    console.warn(`⚠️ [Dual-Write] Failed to update job status in Firebase:`, error);
  }
}

/**
 * Log phase event to Firebase (for audit trail)
 */
export async function logPhaseEventToFirebase(
  jobId: string,
  phase: string,
  progressPercent: number,
  message: string
): Promise<void> {
  if (!ENABLE_DUAL_WRITE) return;

  try {
    const eventsRef = collection(db, 'kundli_report_jobs', jobId, 'events');

    await addDoc(eventsRef, {
      phase,
      progressPercent,
      message,
      timestamp: Timestamp.now(),
    });

    console.log(`✅ [Dual-Write] Event logged for job ${jobId}`);
  } catch (error) {
    console.warn(`⚠️ [Dual-Write] Failed to log event in Firebase:`, error);
  }
}

export default {
  mirrorJobStartToFirebase,
  updateJobStatusInFirebaseFromPolling,
  logPhaseEventToFirebase,
};
