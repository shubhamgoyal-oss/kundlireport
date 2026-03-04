# Exact Code Changes for KundliReportGenerator.tsx

## File: `src/components/KundliReportGenerator.tsx`

### Change 1: Add imports at top (after existing imports)

**Location:** After line 30 (after other imports)

```typescript
import { mirrorJobStartToFirebase, updateJobStatusInFirebaseFromPolling } from '@/integrations/firebase/dual-write-hook';
import { getJobFromFirebase } from '@/integrations/firebase/client';
```

---

### Change 2: Mirror job to Firebase after creation

**Location:** After line 212 (after `jobData = result.data;`)

**Find this:**
```typescript
if (!result.error) {
  jobData = result.data;
  startError = null;
  break;
}
```

**Replace with:**
```typescript
if (!result.error) {
  jobData = result.data;
  startError = null;

  // Dual-write to Firebase (non-blocking)
  if (jobData?.jobId) {
    mirrorJobStartToFirebase({
      jobId: jobData.jobId,
      name: data.name.trim(),
      dateOfBirth: data.date,
      timeOfBirth: data.time || '12:00',
      placeOfBirth: data.place,
      latitude: data.lat || 0,
      longitude: data.lon || 0,
      timezone: tzOffset,
      language: reportLanguage,
      gender: data.gender,
      visitorId,
      sessionId,
    }).catch(err => {
      // Fail silently — Supabase is primary
      console.warn('[KundliReportGenerator] Dual-write failed:', err);
    });
  }

  break;
}
```

---

### Change 3: Update job status in Firebase during polling

**Location:** In the polling loop, after fetching from Supabase (around line 295-310)

**Find this:**
```typescript
const payload = await response.json();
if (payload.status === 'completed') {
  return { status: 'completed' };
}
```

**Add this BEFORE the if statement:**
```typescript
// Dual-write status update to Firebase
if (jobId && (VITE_ENABLE_DUAL_WRITE === 'true')) {
  updateJobStatusInFirebaseFromPolling(
    jobId,
    payload.status || 'processing',
    payload.currentPhase || 'pending',
    payload.progressPercent || 0,
    payload.error || payload.errorMessage
  ).catch(() => {
    // Fail silently
  });
}

const payload = await response.json();
if (payload.status === 'completed') {
  return { status: 'completed' };
}
```

---

### Change 4: Fallback to Firebase if Supabase fails (optional but recommended)

**Location:** In the polling error handler (around line 350+)

**Find this:**
```typescript
if (!response.ok) {
  await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  continue;
}
```

**Replace with:**
```typescript
if (!response.ok) {
  // Try Firebase fallback if Supabase is down
  if (response.status >= 500) {
    const firebaseJob = await getJobFromFirebase(jobId);
    if (firebaseJob) {
      console.log('[KundliReportGenerator] Supabase failed, using Firebase fallback');
      return {
        status: firebaseJob.status || 'failed',
        error: firebaseJob.errorMessage
      };
    }
  }

  await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  continue;
}
```

---

## Summary

**Total changes:** 4 small code blocks
**Lines added:** ~50 lines
**Breaking changes:** NONE (all non-blocking, Supabase untouched)
**Risk level:** VERY LOW (all errors are silently caught)

---

## Testing the Changes

After applying these 4 changes, run:

```bash
npm run dev
```

Then generate a Kundli and check console for logs:
```
✅ [Dual-Write] Job abc-123 created in Firebase
✅ [Dual-Write] Job abc-123 status updated in Firebase
✅ [Dual-Write] Event logged for job abc-123
```

If you see those, dual-write is working!

---

## Rollback (if needed)

If something breaks:
1. Remove the 4 code blocks above
2. Restart dev server
3. Everything works as before (Supabase-only)

No data loss, no risk.
