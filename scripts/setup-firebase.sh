#!/bin/bash
set -e

echo "🔥 Firebase Setup for Kundli Report"
echo "=================================="
echo ""

# Check if Firebase project exists
PROJECT_ID="kundli-report"
echo "✓ Using Firebase Project: $PROJECT_ID"
echo ""

# Step 1: Create Firestore collections
echo "📦 Creating Firestore Collections..."
cat << 'EOF' > /tmp/firestore-init.js
const admin = require('firebase-admin');

const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'kundli-report'
});

const db = admin.firestore();

async function initializeFirestore() {
  console.log('Creating collections...');

  // Create kundli_report_jobs collection with sample doc
  // (Firestore auto-creates collections on first write)
  await db.collection('kundli_report_jobs').doc('_init').set({
    name: 'Init Document',
    createdAt: admin.firestore.Timestamp.now(),
  });

  console.log('✅ Collections ready!');
  console.log('   - kundli_report_jobs');
  console.log('   - kundli_report_jobs/{jobId}/events (subcollection)');
  console.log('   - kundli_report_jobs/{jobId}/apiCalls (subcollection)');

  process.exit(0);
}

initializeFirestore().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
EOF

echo ""
echo "To initialize Firestore, run:"
echo "  export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json"
echo "  node /tmp/firestore-init.js"
echo ""

# Step 2: Create Cloud Storage bucket
echo "🪣 Cloud Storage Setup..."
echo "Bucket Name: gs://kundli-report.appspot.com"
echo "Region: asia-southeast1"
echo ""
echo "Bucket will be created automatically with the Firebase project"
echo ""

# Step 3: Set up environment
echo "📝 Environment Variables..."
echo "Copy the following to .env.local:"
echo ""
echo "VITE_FIREBASE_API_KEY=<from Firebase Console>"
echo "VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase Console>"
echo "VITE_FIREBASE_APP_ID=<from Firebase Console>"
echo "VITE_ENABLE_DUAL_WRITE=true"
echo "VITE_ENABLE_FIREBASE_FALLBACK=true"
echo ""

# Step 4: Create Cloud Run service account (if needed)
echo "👤 Creating Service Account..."
echo "Run:"
echo "  gcloud iam service-accounts create kundli-cloud-run --display-name='Kundli Cloud Run'"
echo "  gcloud projects add-iam-policy-binding kundli-report --member='serviceAccount:kundli-cloud-run@kundli-report.iam.gserviceaccount.com' --role='roles/firebase.admin'"
echo ""

echo "✅ Firebase setup script complete!"
echo ""
echo "Next steps:"
echo "1. Open Firebase Console: https://console.firebase.google.com/u/0/project/kundli-report"
echo "2. Copy Web app config to .env.local"
echo "3. Set VITE_ENABLE_DUAL_WRITE=true"
echo "4. Start dev server: npm run dev"
echo ""
