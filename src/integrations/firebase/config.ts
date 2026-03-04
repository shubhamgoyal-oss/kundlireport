/**
 * Firebase Configuration
 *
 * Minimal Firebase setup for dual-write + fallback polling
 * Project: kundli-report (asia-southeast1)
 */

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Firebase region for Cloud Run + Firestore
 * Set to asia-southeast1 (Singapore) for India latency
 */
export const FIREBASE_REGION = 'asia-southeast1';

/**
 * Cloud Run endpoint (will be set after deployment)
 * Format: https://start-kundli-job-HASH-sg.run.app/
 */
export const CLOUD_RUN_ENDPOINT = import.meta.env.VITE_CLOUD_RUN_ENDPOINT || 'http://localhost:3000';

/**
 * Flag to enable/disable Firebase fallback
 * true = read from Firebase if Supabase fails
 * false = fail if Supabase fails (original behavior)
 */
export const ENABLE_FIREBASE_FALLBACK = import.meta.env.VITE_ENABLE_FIREBASE_FALLBACK === 'true';

/**
 * Dual-write flag (write to both Supabase + Firebase)
 * true = write to both (during transition)
 * false = write to Supabase only (original behavior)
 */
export const ENABLE_DUAL_WRITE = import.meta.env.VITE_ENABLE_DUAL_WRITE === 'true';
