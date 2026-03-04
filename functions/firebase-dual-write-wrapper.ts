/**
 * Firebase Dual-Write Wrapper
 *
 * Intercepts Supabase responses and mirrors writes to Firebase.
 * Zero downtime for Supabase — all original logic stays unchanged.
 *
 * After Supabase job completes, automatically syncs to Firebase for failover.
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin (expects GOOGLE_APPLICATION_CREDENTIALS env var)
// Or use: admin.initializeApp();

const db = admin.firestore();
const firestoreRegion = 'asia-southeast1'; // Singapore

interface KundliJobData {
  jobId: string;
  visitorId: string;
  sessionId: string;
  name: string;
  dateOfBirth: string;
  timeOfBirth: string;
  placeOfBirth: string;
  latitude: number;
  longitude: number;
  timezone: number;
  language: 'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta';
  gender: 'M' | 'F' | 'O';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  currentPhase?: string;
  progressPercent?: number;
  errorMessage?: string;
  heartbeatAt?: string;
  completedAt?: string;
  createdAt?: string;
  reportPath?: string; // Cloud Storage path for full report
}

/**
 * After Supabase job is created, mirror to Firebase
 * Call this right after supabase.functions.invoke('start-kundli-job')
 */
export async function mirrorJobToFirebase(jobData: KundliJobData): Promise<void> {
  try {
    const docRef = db.collection('kundli_report_jobs').doc(jobData.jobId);

    await docRef.set({
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
      status: jobData.status || 'pending',
      currentPhase: jobData.currentPhase || 'pending',
      progressPercent: jobData.progressPercent || 0,
      createdAt: admin.firestore.Timestamp.now(),
      heartbeatAt: admin.firestore.Timestamp.now(),
    });

    console.log(`✅ [DUAL-WRITE] Job ${jobData.jobId} mirrored to Firebase`);
  } catch (error) {
    // Fail silently — Supabase is primary, Firebase is backup
    console.warn(`⚠️ [DUAL-WRITE] Failed to mirror job to Firebase:`, error);
  }
}

/**
 * Update job status in Firebase (mirrors Supabase updates)
 * Call this after any supabase.functions.invoke() that updates job status
 */
export async function updateJobStatusInFirebase(
  jobId: string,
  updates: Partial<KundliJobData>
): Promise<void> {
  try {
    const firestoreUpdates: Record<string, any> = {};

    if (updates.status) firestoreUpdates.status = updates.status;
    if (updates.currentPhase) firestoreUpdates.currentPhase = updates.currentPhase;
    if (updates.progressPercent !== undefined) firestoreUpdates.progressPercent = updates.progressPercent;
    if (updates.errorMessage) firestoreUpdates.errorMessage = updates.errorMessage;
    if (updates.completedAt) firestoreUpdates.completedAt = new Date(updates.completedAt);
    if (updates.reportPath) firestoreUpdates.reportPath = updates.reportPath;

    firestoreUpdates.heartbeatAt = admin.firestore.Timestamp.now();

    await db.collection('kundli_report_jobs').doc(jobId).update(firestoreUpdates);

    console.log(`✅ [DUAL-WRITE] Job ${jobId} updated in Firebase`);
  } catch (error) {
    // Fail silently — Supabase is primary
    console.warn(`⚠️ [DUAL-WRITE] Failed to update job in Firebase:`, error);
  }
}

/**
 * Add event/audit log to Firebase
 * Call this after each major phase change
 */
export async function logEventToFirebase(
  jobId: string,
  phase: string,
  progressPercent: number,
  message: string
): Promise<void> {
  try {
    const eventsRef = db.collection('kundli_report_jobs').doc(jobId).collection('events');

    await eventsRef.add({
      phase,
      progressPercent,
      message,
      timestamp: admin.firestore.Timestamp.now(),
    });

    console.log(`✅ [DUAL-WRITE] Event logged for job ${jobId}`);
  } catch (error) {
    console.warn(`⚠️ [DUAL-WRITE] Failed to log event in Firebase:`, error);
  }
}

/**
 * Poll job status from Firebase (fallback if Supabase is down)
 * Frontend will call this if Supabase polling fails
 */
export async function getJobFromFirebase(jobId: string): Promise<KundliJobData | null> {
  try {
    const doc = await db.collection('kundli_report_jobs').doc(jobId).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data();
    return {
      jobId,
      visitorId: data?.visitorId,
      sessionId: data?.sessionId,
      name: data?.name,
      dateOfBirth: data?.dateOfBirth?.toDate?.()?.toISOString?.()?.split('T')[0] || '',
      timeOfBirth: data?.timeOfBirth,
      placeOfBirth: data?.placeOfBirth,
      latitude: data?.latitude,
      longitude: data?.longitude,
      timezone: data?.timezone,
      language: data?.language,
      gender: data?.gender,
      status: data?.status,
      currentPhase: data?.currentPhase,
      progressPercent: data?.progressPercent,
      errorMessage: data?.errorMessage,
      completedAt: data?.completedAt?.toDate?.()?.toISOString() || undefined,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || undefined,
      reportPath: data?.reportPath,
    } as KundliJobData;
  } catch (error) {
    console.warn(`⚠️ [DUAL-WRITE] Failed to read job from Firebase:`, error);
    return null;
  }
}

export default {
  mirrorJobToFirebase,
  updateJobStatusInFirebase,
  logEventToFirebase,
  getJobFromFirebase,
};
