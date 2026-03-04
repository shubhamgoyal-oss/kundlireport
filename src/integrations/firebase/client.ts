/**
 * Firebase Client Wrapper
 *
 * Minimal Firebase setup for:
 * 1. Dual-write to Firestore (after Supabase writes)
 * 2. Fallback polling (if Supabase is down)
 * 3. Report retrieval from Cloud Storage
 *
 * Supabase remains primary — Firebase is backup/mirror only.
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, getBytes } from 'firebase/storage';
import { firebaseConfig, FIREBASE_REGION } from './config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore (for job status polling)
export const db = getFirestore(app);

// Cloud Storage (for report retrieval)
export const storage = getStorage(app, `gs://kundli-report.appspot.com`);

/**
 * Get job status from Firebase (fallback if Supabase is unreachable)
 * Returns null if job not found or Firebase is unavailable
 */
export async function getJobFromFirebase(jobId: string): Promise<any | null> {
  try {
    const jobRef = doc(db, 'kundli_report_jobs', jobId);
    const jobSnap = await getDoc(jobRef);

    if (!jobSnap.exists()) {
      return null;
    }

    return {
      id: jobSnap.id,
      ...jobSnap.data(),
    };
  } catch (error) {
    console.warn('[Firebase] Failed to get job:', error);
    return null;
  }
}

/**
 * Get report JSON from Cloud Storage
 * Called when user clicks "Download Report"
 */
export async function getReportFromStorage(reportPath: string): Promise<any | null> {
  try {
    if (!reportPath) return null;

    const reportRef = ref(storage, reportPath);
    const reportBytes = await getBytes(reportRef);
    const reportText = new TextDecoder().decode(reportBytes);
    const reportJson = JSON.parse(reportText);

    return reportJson;
  } catch (error) {
    console.warn('[Firebase Storage] Failed to retrieve report:', error);
    return null;
  }
}

/**
 * List all jobs for a session (for bulk upload tracking)
 * Fallback if Supabase is down
 */
export async function listJobsBySessionFirebase(sessionId: string): Promise<any[]> {
  try {
    const jobsRef = collection(db, 'kundli_report_jobs');
    const q = query(jobsRef, where('sessionId', '==', sessionId));
    const querySnap = await getDocs(q);

    return querySnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.warn('[Firebase] Failed to list jobs by session:', error);
    return [];
  }
}

export default {
  db,
  storage,
  getJobFromFirebase,
  getReportFromStorage,
  listJobsBySessionFirebase,
};
