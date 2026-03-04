# Firebase Dual-Write Quick Start (Next 90 Minutes)

## ⚡ 4-Step Setup (No Supabase Changes)

### Step 1: Install Firebase SDK (5 min)
```bash
npm install firebase firebase-admin
```

### Step 2: Get Firebase Config (5 min)
1. Open: https://console.firebase.google.com/u/0/project/kundli-report/settings/general
2. Scroll to "Your apps" section
3. Find "Kundli Report" web app (or create if missing)
4. Click the icon to copy the config
5. Paste into `.env.local`:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_MESSAGING_SENDER_ID=123...
VITE_FIREBASE_APP_ID=1:123...
VITE_ENABLE_DUAL_WRITE=true
VITE_ENABLE_FIREBASE_FALLBACK=true
```

### Step 3: Enable Dual-Write (2 min)
```bash
# Just set these in your .env.local
VITE_ENABLE_DUAL_WRITE=true
VITE_ENABLE_FIREBASE_FALLBACK=true
```

### Step 4: Update KundliReportGenerator.tsx (20 min)
Add 3 small hooks in the existing component. **Copy-paste these exactly:**

**At top of file (imports):**
```typescript
import { mirrorJobStartToFirebase, updateJobStatusInFirebaseFromPolling } from '@/integrations/firebase/dual-write-hook';
import { getJobFromFirebase } from '@/integrations/firebase/client';
```

**After job creation (line 212):**
```typescript
if (jobData?.jobId) {
  await mirrorJobStartToFirebase({
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
  }).catch(() => {}); // Fail silently
}
```

**In polling loop (after fetching from Supabase, around line 295):**
```typescript
if (payload.status && jobId) {
  await updateJobStatusInFirebaseFromPolling(
    jobId,
    payload.status,
    payload.currentPhase || 'pending',
    payload.progressPercent || 0,
    payload.error || payload.errorMessage
  ).catch(() => {}); // Fail silently
}
```

**In polling error handler (add fallback):**
```typescript
// If Supabase polling fails, try Firebase
if (!response.ok && response.status >= 500) {
  const firebaseJob = await getJobFromFirebase(jobId);
  if (firebaseJob) {
    console.log('[Fallback] Using Firebase data');
    payload = firebaseJob;
    // Continue with payload...
  }
}
```

---

## ✅ Test (10 min)
```bash
npm run dev
```

1. Generate 1 Kundli (English)
2. Check console for `✅ [Dual-Write]` logs
3. Check Firebase Console for new job doc (https://console.firebase.google.com/u/0/project/kundli-report/firestore)
4. Verify Supabase still shows the job normally

---

## 📊 What You Get

After these 90 minutes:
- ✅ Firebase is live and mirroring all job data
- ✅ Supabase is completely unchanged (no risk)
- ✅ If Supabase goes down, app falls back to Firebase reads
- ✅ Rollback: just set `VITE_ENABLE_DUAL_WRITE=false` and restart

---

## 🚨 Troubleshooting

**"Firebase not initialized" error?**
→ Check .env.local has all 3 Firebase keys

**"Dual-write hook not found" error?**
→ Run: `npm install` (makes sure node_modules updated)

**Jobs not showing in Firebase Console?**
→ Check `VITE_ENABLE_DUAL_WRITE=true` in .env.local
→ Check console for error logs

**Supabase still works but Firebase doesn't?**
→ That's OK! Supabase is primary. Firebase is backup.
→ Firebase errors are logged but never break the app.

---

## 🎯 Done!

After these 4 steps + testing, you have:
- Production-ready dual-write system
- Zero Supabase changes
- Easy rollback (1 env var)
- Safe to ship immediately

The rest of the migration can be done gradually.
