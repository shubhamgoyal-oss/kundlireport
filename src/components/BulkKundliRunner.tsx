import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { preloadCityDatabase, searchPlaces } from '@/utils/geocoding';
import { Loader2, Play, Square, Table2, RefreshCw, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { KundliPDFDocument } from './KundliPDFDocument';
import { fetchMultipleCharts, PDF_CHARTS, BirthDetails } from '@/utils/kundaliChart';

type BulkStatus = 'pending' | 'normalizing' | 'geocoding' | 'queued' | 'processing' | 'completed' | 'failed';

interface LoadedSheetRow {
  rowNumber: number;
  normalized: Record<string, string>;
  raw: Record<string, string>;
}

interface BulkRowState {
  rowNumber: number;
  name: string;
  place: string;
  status: BulkStatus;
  gender: 'M' | 'F';
  language: 'en' | 'hi' | 'te';
  detectedGender?: string;
  jobId?: string;
  error?: string;
  source?: string;
  isPreparingPdf?: boolean;
  downloadUrl?: string;
  downloadFileName?: string;
  bucketSignedUrl?: string;
  pdfStorageBucket?: string;
  pdfStoragePath?: string;
}

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/19kP4JakQCH08mOk9Ky2ihYjaUs1rJtDd8_e7OoL3zDE/edit?gid=169692027#gid=169692027';

// ── localStorage persistence keys ──────────────────────────────────────
const LS_SHEET_URL = 'bulk_sheetUrl';
const LS_START_ROW = 'bulk_startRow';
const LS_END_ROW = 'bulk_endRow';
const LS_LANGUAGE = 'bulk_language';
const LS_ALL_ROWS = 'bulk_allRows';
const LS_BULK_ROWS = 'bulk_rows';

/** Strip non-serializable / transient fields before saving to localStorage */
function serializableBulkRows(rows: BulkRowState[]): BulkRowState[] {
  return rows.map((r) => {
    const { downloadUrl, isPreparingPdf, ...rest } = r;
    return rest as BulkRowState;
  });
}

/** Reset in-flight statuses to 'pending' so they can be re-run after restore */
function sanitizeRestoredRows(rows: BulkRowState[]): BulkRowState[] {
  const IN_FLIGHT: BulkStatus[] = ['normalizing', 'geocoding', 'queued', 'processing'];
  return rows.map((r) => ({
    ...r,
    downloadUrl: undefined,
    isPreparingPdf: false,
    status: IN_FLIGHT.includes(r.status) ? 'pending' : r.status,
  }));
}

const STATUS_COLORS: Record<BulkStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  normalizing: 'bg-amber-100 text-amber-800',
  geocoding: 'bg-orange-100 text-orange-800',
  queued: 'bg-sky-100 text-sky-800',
  processing: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function getVisitorAndSessionIds(): { visitorId: string; sessionId: string } {
  const visitorId = localStorage.getItem('visitor_id') || crypto.randomUUID();
  const sessionId = localStorage.getItem('session_id') || crypto.randomUUID();

  if (!localStorage.getItem('visitor_id')) localStorage.setItem('visitor_id', visitorId);
  if (!localStorage.getItem('session_id')) localStorage.setItem('session_id', sessionId);

  return { visitorId, sessionId };
}

export default function BulkKundliRunner() {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [startRow, setStartRow] = useState('2');
  const [endRow, setEndRow] = useState('20');
  const [allRows, setAllRows] = useState<LoadedSheetRow[]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRowState[]>([]);
  const [bulkLanguage, setBulkLanguage] = useState<'en' | 'hi' | 'te'>('en');

  const stopRequestedRef = useRef(false);
  const placeCacheRef = useRef<Map<string, { lat: number; lon: number; displayName: string }>>(new Map());
  const blobUrlsRef = useRef<string[]>([]);
  const restoredRef = useRef(false);  // prevent double-restore

  // Live ref for bulkRows — avoids stale closure in async processing loops
  const bulkRowsRef = useRef<BulkRowState[]>([]);
  useEffect(() => { bulkRowsRef.current = bulkRows; }, [bulkRows]);

  // ── Restore persisted state on mount ──────────────────────────────────
  useEffect(() => {
    preloadCityDatabase();

    try {
      const savedRows = localStorage.getItem(LS_BULK_ROWS);
      const savedAllRows = localStorage.getItem(LS_ALL_ROWS);
      const savedUrl = localStorage.getItem(LS_SHEET_URL);
      const savedStart = localStorage.getItem(LS_START_ROW);
      const savedEnd = localStorage.getItem(LS_END_ROW);
      const savedLang = localStorage.getItem(LS_LANGUAGE);

      if (savedRows) {
        const parsed: BulkRowState[] = JSON.parse(savedRows);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeRestoredRows(parsed);
          setBulkRows(sanitized);
          restoredRef.current = true;

          const completedCount = sanitized.filter((r) => r.status === 'completed').length;
          const totalCount = sanitized.length;
          toast.success(`Restored ${totalCount} rows (${completedCount} completed) from previous session`);
        }
      }

      if (savedAllRows) {
        const parsed: LoadedSheetRow[] = JSON.parse(savedAllRows);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllRows(parsed);
        }
      }

      if (savedUrl) setSheetUrl(savedUrl);
      if (savedStart) setStartRow(savedStart);
      if (savedEnd) setEndRow(savedEnd);
      if (savedLang && ['en', 'hi', 'te'].includes(savedLang)) {
        setBulkLanguage(savedLang as 'en' | 'hi' | 'te');
      }
    } catch (err) {
      console.warn('[BulkKundliRunner] Failed to restore from localStorage:', err);
    }
  }, []);

  // ── Save bulkRows to localStorage on every change ─────────────────────
  useEffect(() => {
    // Skip the initial empty state (before restore)
    if (!restoredRef.current && bulkRows.length === 0) return;
    try {
      localStorage.setItem(LS_BULK_ROWS, JSON.stringify(serializableBulkRows(bulkRows)));
    } catch (err) {
      console.warn('[BulkKundliRunner] Failed to save bulkRows:', err);
    }
  }, [bulkRows]);

  // ── Save allRows to localStorage on change ────────────────────────────
  useEffect(() => {
    if (!restoredRef.current && allRows.length === 0) return;
    try {
      localStorage.setItem(LS_ALL_ROWS, JSON.stringify(allRows));
    } catch (err) {
      console.warn('[BulkKundliRunner] Failed to save allRows:', err);
    }
  }, [allRows]);

  // ── Save settings to localStorage on change ───────────────────────────
  useEffect(() => { localStorage.setItem(LS_SHEET_URL, sheetUrl); }, [sheetUrl]);
  useEffect(() => { localStorage.setItem(LS_START_ROW, startRow); }, [startRow]);
  useEffect(() => { localStorage.setItem(LS_END_ROW, endRow); }, [endRow]);
  useEffect(() => { localStorage.setItem(LS_LANGUAGE, bulkLanguage); }, [bulkLanguage]);

  const startRowNum = Math.max(2, Number(startRow) || 2);
  const endRowNum = Math.max(startRowNum, Number(endRow) || startRowNum);

  const selectedRows = useMemo(() => {
    return allRows.filter((row) => row.rowNumber >= startRowNum && row.rowNumber <= endRowNum);
  }, [allRows, startRowNum, endRowNum]);

  const clearPersistedData = () => {
    [LS_BULK_ROWS, LS_ALL_ROWS].forEach((k) => localStorage.removeItem(k));
  };

  /** Run gender/name/place detection on the given sheet rows and update bulkRows */
  const detectGendersForRows = async (filteredRows: LoadedSheetRow[]) => {
    const BATCH_SIZE = 5;
    for (let i = 0; i < filteredRows.length; i += BATCH_SIZE) {
      const batch = filteredRows.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (r) => {
          try {
            const { data: decoded, error: decErr } = await supabase.functions.invoke(
              'decipher-kundli-input',
              { body: { row: r.normalized } },
            );
            if (!decErr && decoded) {
              const g: 'M' | 'F' = String(decoded?.gender || 'M').toUpperCase() === 'F' ? 'F' : 'M';
              const name = String(decoded?.name || '').trim();
              const place = String(decoded?.placeOfBirth || '').trim();
              setBulkRows((prev) =>
                prev.map((br) => {
                  if (br.rowNumber !== r.rowNumber) return br;
                  // Only set gender if user hasn't manually overridden it
                  // (first detection: detectedGender is undefined; re-detection: preserve user edits)
                  const userOverrode = br.detectedGender !== undefined && br.gender !== br.detectedGender;
                  return {
                    ...br,
                    detectedGender: g,
                    ...(userOverrode ? {} : { gender: g }),
                    ...(name ? { name } : {}),
                    ...(place ? { place } : {}),
                  };
                }),
              );
            }
          } catch (err) {
            console.warn(`[BulkKundliRunner] Gender detect failed for row ${r.rowNumber}:`, err);
          }
        }),
      );
    }
    toast.success('Gender detection complete');
  };

  /** Refresh all generated files: re-prepare PDFs for all completed rows */
  const [isRefreshingPdfs, setIsRefreshingPdfs] = useState(false);
  const refreshAllFiles = async () => {
    const targets = bulkRows.filter((r) => r.status === 'completed' && r.jobId);
    if (!targets.length) {
      toast.error('No completed rows to refresh');
      return;
    }
    setIsRefreshingPdfs(true);
    toast(`Regenerating PDFs for ${targets.length} completed row(s)…`);

    // Clear existing download URLs so preparePdfForRow runs fresh
    for (const t of targets) {
      updateBulkRow(t.rowNumber, { downloadUrl: undefined, bucketSignedUrl: undefined, isPreparingPdf: false });
    }

    for (const row of targets) {
      const freshRow = { ...row, downloadUrl: undefined, bucketSignedUrl: undefined };
      await preparePdfForRow(freshRow).catch((e) =>
        console.warn(`[Bulk] Refresh PDF failed for row ${row.rowNumber}:`, e),
      );
    }

    setIsRefreshingPdfs(false);
    toast.success('All PDFs refreshed');
  };

  const loadSheetRows = async () => {
    setIsLoadingSheet(true);
    // Clear old persisted data — fresh start
    clearPersistedData();
    restoredRef.current = true; // allow saving the new data
    try {
      const { data, error } = await supabase.functions.invoke('load-kundli-sheet', {
        body: { sheetUrl },
      });

      if (error) {
        throw new Error(error.message || 'Failed to load sheet');
      }

      const rows: LoadedSheetRow[] = Array.isArray(data?.rows)
        ? data.rows.map((r: any) => ({
            rowNumber: Number(r.rowNumber),
            normalized: r.normalized || {},
            raw: r.raw || {},
          }))
        : [];

      setAllRows(rows);
      // Pre-populate bulkRows for the selected range only
      const sNum = Math.max(2, Number(startRow) || 2);
      const eNum = Math.max(sNum, Number(endRow) || sNum);
      const filteredRows = rows.filter((r) => r.rowNumber >= sNum && r.rowNumber <= eNum);
      setBulkRows(
        filteredRows.map((r) => ({
          rowNumber: r.rowNumber,
          name: r.normalized.offering_user_name || r.normalized.name || '',
          place: r.normalized.place_of_birth || '',
          status: 'pending' as BulkStatus,
          gender: 'M' as const,
          language: bulkLanguage,
        })),
      );
      toast.success(`Loaded ${filteredRows.length} rows. Detecting gender…`);

      // Run gender/name/place detection
      await detectGendersForRows(filteredRows);
    } catch (err) {
      console.error('[BulkKundliRunner] Failed loading sheet:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load Google Sheet');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const updateBulkRow = (rowNumber: number, patch: Partial<BulkRowState>) => {
    setBulkRows((prev) => prev.map((row) => (row.rowNumber === rowNumber ? { ...row, ...patch } : row)));
  };

  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];
    };
  }, []);

  const buildDownloadFileName = (name: string, _rowNumber?: number): string => {
    const safeName = String(name || 'Kundli')
      .trim()
      .replace(/[^a-zA-Z0-9 _-]+/g, ' ')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `Kundli_Report_${safeName || 'Kundli'}.pdf`;
  };

  const saveAsDialog = async (blobUrl: string, suggestedName: string) => {
    // Helper: classic <a download> fallback
    const fallbackDownload = () => {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    // Try File System Access API first (gives a real Save-As folder picker)
    if ('showSaveFilePicker' in window) {
      try {
        const blob = await fetch(blobUrl).then((r) => r.blob());
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success(`Saved: ${suggestedName}`);
        return;
      } catch (err: any) {
        // User cancelled the dialog — not an error
        if (err?.name === 'AbortError') return;
        console.warn('showSaveFilePicker failed, using fallback download:', err);
      }
    }

    // Fallback for browsers without the API or if it failed
    fallbackDownload();
  };

  const blobToBase64Data = async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const fetchJobPayload = async (jobId: string, sessionId: string, visitorId: string): Promise<any> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-kundli-job?jobId=${jobId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-session-id': sessionId,
          'x-visitor-id': visitorId,
        },
      },
    );
    if (!response.ok) throw new Error(`Failed to fetch job payload (${response.status})`);
    return response.json();
  };

  // Mutex to prevent concurrent PDF generation which corrupts global language state
  const pdfMutexRef = useRef(Promise.resolve());

  const preparePdfForRow = async (row: BulkRowState) => {
    if (!row.jobId) {
      toast.error(`Row ${row.rowNumber}: missing jobId`);
      return;
    }
    if (row.downloadUrl) return;

    const { visitorId, sessionId } = getVisitorAndSessionIds();
    updateBulkRow(row.rowNumber, { isPreparingPdf: true, error: undefined });

    try {
      const payload = await fetchJobPayload(row.jobId, sessionId, visitorId);
      if (payload.status !== 'completed' || !payload.report) {
        throw new Error(`Job ${row.jobId} is not completed yet`);
      }

      const report = payload.report;
      const [year, month, day] = String(report.birthDetails?.dateOfBirth || '').split('-').map(Number);
      const [hour, minute] = String(report.birthDetails?.timeOfBirth || '12:00').split(':').map(Number);

      const birthDetails: BirthDetails = {
        day: Number.isFinite(day) ? day : 1,
        month: Number.isFinite(month) ? month : 1,
        year: Number.isFinite(year) ? year : 1990,
        hour: Number.isFinite(hour) ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        lat: Number(report.birthDetails?.latitude || 0),
        lon: Number(report.birthDetails?.longitude || 0),
        tzone: Number(report.birthDetails?.timezone || 5.5),
      };

      const rowLang = (row.language || bulkLanguage) as 'en' | 'hi' | 'te';
      const charts = await fetchMultipleCharts(birthDetails, 'North', rowLang === 'te' ? 'en' : rowLang, PDF_CHARTS);
      const reportWithCharts = { ...report, charts };
      // Serialize PDF generation via mutex — global ACTIVE_PDF_LANGUAGE must not be
      // corrupted by concurrent renders (e.g., Hindi overwriting Telugu mid-render).
      const blob = await (pdfMutexRef.current = pdfMutexRef.current.then(() =>
        pdf(<KundliPDFDocument report={reportWithCharts} language={rowLang} />).toBlob()
      ));
      const downloadUrl = URL.createObjectURL(blob);
      blobUrlsRef.current.push(downloadUrl);
      const fileName = buildDownloadFileName(row.name, row.rowNumber);

      let bucketSignedUrl: string | undefined;
      let pdfStorageBucket: string | undefined;
      let pdfStoragePath: string | undefined;
      try {
        const pdfBase64 = await blobToBase64Data(blob);
        const { data: storeData, error: storeError } = await supabase.functions.invoke('store-kundli-pdf', {
          body: {
            jobId: row.jobId,
            fileName,
            previewMode: false,
            pdfBase64,
          },
        });
        if (storeError) {
          throw new Error(storeError.message || 'Failed to store PDF in bucket');
        }
        bucketSignedUrl = typeof storeData?.signedUrl === 'string' ? storeData.signedUrl : undefined;
        pdfStorageBucket = typeof storeData?.bucket === 'string' ? storeData.bucket : undefined;
        pdfStoragePath = typeof storeData?.path === 'string' ? storeData.path : undefined;
      } catch (storageErr) {
        console.warn(`[BulkKundliRunner] Row ${row.rowNumber} storage upload failed:`, storageErr);
      }

      updateBulkRow(row.rowNumber, {
        isPreparingPdf: false,
        downloadUrl,
        downloadFileName: fileName,
        bucketSignedUrl,
        pdfStorageBucket,
        pdfStoragePath,
      });
    } catch (err) {
      updateBulkRow(row.rowNumber, {
        isPreparingPdf: false,
        error: err instanceof Error ? err.message : 'PDF preparation failed',
      });
      toast.error(`Row ${row.rowNumber}: ${err instanceof Error ? err.message : 'PDF preparation failed'}`);
    }
  };

  const prepareAllCompletedPdfs = async () => {
    const targets = bulkRows.filter((r) => r.status === 'completed' && !r.downloadUrl && !r.isPreparingPdf);
    if (!targets.length) {
      toast('No completed rows pending PDF preparation');
      return;
    }
    for (const row of targets) {
      // sequential to avoid browser memory spikes
      // eslint-disable-next-line no-await-in-loop
      await preparePdfForRow(row);
    }
    toast.success('Prepared downloadable PDFs for completed rows');
  };

  const pollJobUntilDone = async (
    jobId: string,
    sessionId: string,
    visitorId: string,
  ): Promise<{ status: 'completed' | 'failed'; error?: string }> => {
    const pollIntervalMs = 3000;
    const maxPolls = 360; // ~18 minutes

    // ── Stall detection & auto-retry ──────────────────────────────────────
    let lastProgress = -1;
    let lastProgressChangeTime = Date.now();
    let retriesAttempted = 0;
    const maxRetries = 2;
    const stallThresholdMs = 90_000; // 90s without progress change = stalled

    for (let i = 0; i < maxPolls; i++) {
      if (stopRequestedRef.current) {
        return { status: 'failed', error: 'Stopped by user' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-kundli-job?jobId=${jobId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-session-id': sessionId,
            'x-visitor-id': visitorId,
          },
        },
      );

      if (!response.ok) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      const payload = await response.json();
      if (payload.status === 'completed') {
        return { status: 'completed' };
      }
      if (payload.status === 'failed') {
        return { status: 'failed', error: payload.error || 'Job failed' };
      }

      // ── Stall detection: if progress stuck for 90s, re-trigger stalled stage ──
      const currentProgress = payload.progressPercent || 0;
      if (currentProgress !== lastProgress) {
        lastProgress = currentProgress;
        lastProgressChangeTime = Date.now();
      }

      const stallDuration = Date.now() - lastProgressChangeTime;
      if (stallDuration > stallThresholdMs && retriesAttempted < maxRetries && payload.status === 'processing') {
        retriesAttempted++;
        const phase = (payload.currentPhase || '').toLowerCase();
        let functionName = 'translate-kundli-report';
        if (phase.includes('finaliz') || phase.includes('quality') || phase.includes('chart')) {
          functionName = 'finalize-kundli-report';
        }
        console.log(`🔄 [BulkRunner] Job ${jobId} stalled at "${payload.currentPhase}" — auto-retrigger ${retriesAttempted}/${maxRetries}: ${functionName}`);
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ jobId }),
          });
        } catch (e) { console.warn('[BulkRunner] Retrigger failed:', e); }
        lastProgressChangeTime = Date.now(); // reset stall timer
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return { status: 'failed', error: 'Timed out while waiting for completion' };
  };

  const resolveCoordinates = async (place: string): Promise<{ lat: number; lon: number; displayName: string }> => {
    const key = place.trim().toLowerCase();
    const cached = placeCacheRef.current.get(key);
    if (cached) return cached;

    const results = await searchPlaces(place);
    if (!results.length) {
      throw new Error(`Could not resolve place: ${place}`);
    }

    const best = results[0];
    const value = {
      lat: best.lat,
      lon: best.lon,
      displayName: best.display_name || place,
    };
    placeCacheRef.current.set(key, value);
    return value;
  };

  const runBulkGeneration = async () => {
    if (!selectedRows.length) {
      toast.error('No rows available in selected range');
      return;
    }

    stopRequestedRef.current = false;
    setIsRunning(true);
    restoredRef.current = true; // ensure state gets persisted

    // Reset status for selected rows but preserve gender/language edits
    setBulkRows((prev) => {
      const selectedNums = new Set(selectedRows.map((r) => r.rowNumber));
      // Keep rows that are in the selected range, reset their status
      const existing = new Map(prev.map((r) => [r.rowNumber, r]));
      return selectedRows.map((row) => {
        const ex = existing.get(row.rowNumber);
        return {
          rowNumber: row.rowNumber,
          name: ex?.name || row.normalized.offering_user_name || row.normalized.name || '',
          place: ex?.place || row.normalized.place_of_birth || '',
          status: 'pending' as BulkStatus,
          gender: ex?.gender || 'M',
          language: ex?.language || bulkLanguage,
        };
      });
    });

    const { visitorId, sessionId } = getVisitorAndSessionIds();

    // Run gender/name/place detection before processing
    toast('Detecting gender for all rows…');
    await detectGendersForRows(selectedRows);

    // Track which rows failed for the auto-retry pass
    const firstPassFailed = new Set<number>();

    for (const row of selectedRows) {
      if (stopRequestedRef.current) break;

      try {
        updateBulkRow(row.rowNumber, { status: 'normalizing' });

        const { data: decoded, error: decodeError } = await supabase.functions.invoke('decipher-kundli-input', {
          body: { row: row.normalized },
        });

        if (decodeError) {
          throw new Error(decodeError.message || 'Failed to normalize row');
        }

        const name = String(decoded?.name || '').trim();
        const dateOfBirth = String(decoded?.dateOfBirth || '').trim();
        const timeOfBirth = String(decoded?.timeOfBirth || '').trim();
        const placeOfBirth = String(decoded?.placeOfBirth || '').trim();
        const detectedGender: 'M' | 'F' = String(decoded?.gender || 'M').toUpperCase() === 'F' ? 'F' : 'M';
        const source = String(decoded?.source || 'deterministic');

        if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth) {
          throw new Error('Missing normalized values after decipher step');
        }

        // Get current row state to read user's gender/language overrides
        // Use ref to avoid stale closure — bulkRows captured at function start won't reflect later setState updates
        const currentRow = bulkRowsRef.current.find((r) => r.rowNumber === row.rowNumber);
        const finalGender = currentRow?.gender || detectedGender;
        const finalLanguage = currentRow?.language || bulkLanguage;

        updateBulkRow(row.rowNumber, {
          name,
          place: placeOfBirth,
          source,
          detectedGender,
          status: 'geocoding',
        });

        // Check if Excel already has lat/long columns — skip geocoding if so
        const n = row.normalized;
        const rawLat = parseFloat(n.latitude || n.lat || '');
        const rawLon = parseFloat(n.longitude || n.lng || n.lon || '');
        const hasExcelCoords = !isNaN(rawLat) && !isNaN(rawLon) && rawLat !== 0 && rawLon !== 0;

        const coords = hasExcelCoords
          ? { lat: rawLat, lon: rawLon, displayName: placeOfBirth }
          : await resolveCoordinates(placeOfBirth);

        if (hasExcelCoords) {
          console.log(`[Bulk] Row ${row.rowNumber}: using Excel lat/lon ${rawLat},${rawLon}`);
        }

        updateBulkRow(row.rowNumber, { status: 'queued' });

        const { data: startData, error: startError } = await supabase.functions.invoke('start-kundli-job', {
          body: {
            name,
            dateOfBirth,
            timeOfBirth,
            placeOfBirth: coords.displayName,
            latitude: coords.lat,
            longitude: coords.lon,
            timezone: 5.5,
            language: finalLanguage,
            gender: finalGender,
            visitorId,
            sessionId,
          },
        });

        if (startError || !startData?.jobId) {
          throw new Error(startError?.message || 'Failed to start row job');
        }

        const jobId = String(startData.jobId);
        updateBulkRow(row.rowNumber, { status: 'processing', jobId });

        const result = await pollJobUntilDone(jobId, sessionId, visitorId);
        if (result.status === 'completed') {
          updateBulkRow(row.rowNumber, { status: 'completed' });
          // Auto-prepare PDF + upload to bucket for download link
          const completedRow = { rowNumber: row.rowNumber, name, place: placeOfBirth, status: 'completed' as BulkStatus, gender: finalGender, language: finalLanguage, jobId };
          await preparePdfForRow(completedRow).catch((e) => console.warn(`[Bulk] Auto PDF prep failed for row ${row.rowNumber}:`, e));
        } else {
          firstPassFailed.add(row.rowNumber);
          updateBulkRow(row.rowNumber, {
            status: 'failed',
            error: result.error || 'Job failed',
          });
        }
      } catch (err) {
        firstPassFailed.add(row.rowNumber);
        updateBulkRow(row.rowNumber, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // ── Auto-retry failed rows once ──────────────────────────────────────
    // Agent timeouts are intermittent; a second attempt usually succeeds.
    if (!stopRequestedRef.current && firstPassFailed.size > 0) {
      const retryRows = selectedRows.filter((r) => firstPassFailed.has(r.rowNumber));
      toast(`Retrying ${retryRows.length} failed row(s)…`);
      console.log(`[Bulk] Auto-retrying ${retryRows.length} failed rows: ${retryRows.map((r) => r.rowNumber).join(', ')}`);

      for (const row of retryRows) {
        if (stopRequestedRef.current) break;

        try {
          updateBulkRow(row.rowNumber, { status: 'normalizing', error: undefined, jobId: undefined });

          const { data: decoded, error: decodeError } = await supabase.functions.invoke('decipher-kundli-input', {
            body: { row: row.normalized },
          });

          if (decodeError) throw new Error(decodeError.message || 'Failed to normalize row');

          const name = String(decoded?.name || '').trim();
          const dateOfBirth = String(decoded?.dateOfBirth || '').trim();
          const timeOfBirth = String(decoded?.timeOfBirth || '').trim();
          const placeOfBirth = String(decoded?.placeOfBirth || '').trim();
          const detectedGender: 'M' | 'F' = String(decoded?.gender || 'M').toUpperCase() === 'F' ? 'F' : 'M';

          if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth) {
            throw new Error('Missing normalized values after decipher step');
          }

          // Use ref to avoid stale closure in retry pass
          const currentRow = bulkRowsRef.current.find((r) => r.rowNumber === row.rowNumber);
          const finalGender = currentRow?.gender || detectedGender;
          const finalLanguage = currentRow?.language || bulkLanguage;

          updateBulkRow(row.rowNumber, { status: 'geocoding' });

          const rn = row.normalized;
          const rawLat = parseFloat(rn.latitude || rn.lat || '');
          const rawLon = parseFloat(rn.longitude || rn.lng || rn.lon || '');
          const hasExcelCoords = !isNaN(rawLat) && !isNaN(rawLon) && rawLat !== 0 && rawLon !== 0;
          const coords = hasExcelCoords
            ? { lat: rawLat, lon: rawLon, displayName: placeOfBirth }
            : await resolveCoordinates(placeOfBirth);

          updateBulkRow(row.rowNumber, { status: 'queued' });

          const { data: startData, error: startError } = await supabase.functions.invoke('start-kundli-job', {
            body: {
              name, dateOfBirth, timeOfBirth,
              placeOfBirth: coords.displayName,
              latitude: coords.lat, longitude: coords.lon,
              timezone: 5.5,
              language: finalLanguage, gender: finalGender,
              visitorId, sessionId,
            },
          });

          if (startError || !startData?.jobId) {
            throw new Error(startError?.message || 'Failed to start row job');
          }

          const jobId = String(startData.jobId);
          updateBulkRow(row.rowNumber, { status: 'processing', jobId });

          const result = await pollJobUntilDone(jobId, sessionId, visitorId);
          if (result.status === 'completed') {
            updateBulkRow(row.rowNumber, { status: 'completed', error: undefined });
            // Auto-prepare PDF for retried row
            const completedRow = { rowNumber: row.rowNumber, name, place: placeOfBirth, status: 'completed' as BulkStatus, gender: finalGender as 'M' | 'F', language: finalLanguage as 'en' | 'hi' | 'te', jobId };
            await preparePdfForRow(completedRow).catch((e) => console.warn(`[Bulk] Auto PDF prep (retry) failed for row ${row.rowNumber}:`, e));
          } else {
            updateBulkRow(row.rowNumber, { status: 'failed', error: `Retry failed: ${result.error || 'Job failed'}` });
          }
        } catch (err) {
          updateBulkRow(row.rowNumber, {
            status: 'failed',
            error: `Retry failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      }
    }

    setIsRunning(false);
    if (stopRequestedRef.current) {
      toast('Bulk run stopped');
    } else {
      toast.success('Bulk run completed');
    }
  };

  const stopBulkRun = () => {
    stopRequestedRef.current = true;
  };

  const completedCount = bulkRows.filter((r) => r.status === 'completed').length;
  const failedCount = bulkRows.filter((r) => r.status === 'failed').length;

  return (
    <Card className="w-full max-w-4xl mx-auto mb-6 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Table2 className="w-5 h-5 text-primary" />
          Bulk Google Sheet Runner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-4 space-y-2">
            <Label htmlFor="sheet-url">Google Sheet URL</Label>
            <Input
              id="sheet-url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="Paste Google Sheet URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-row">Start Row</Label>
            <Input
              id="start-row"
              type="number"
              min={2}
              value={startRow}
              onChange={(e) => setStartRow(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-row">End Row</Label>
            <Input
              id="end-row"
              type="number"
              min={2}
              value={endRow}
              onChange={(e) => setEndRow(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-language">Report Language</Label>
            <select
              id="bulk-language"
              value={bulkLanguage}
              onChange={(e) => {
                const lang = e.target.value as 'en' | 'hi' | 'te';
                setBulkLanguage(lang);
                // Update all pending rows to the new default language
                setBulkRows((prev) => prev.map((r) => r.status === 'pending' ? { ...r, language: lang } : r));
              }}
              disabled={isRunning}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={loadSheetRows} disabled={isLoadingSheet || isRunning} className="w-full">
              {isLoadingSheet ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Load Rows
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Selected rows: <strong>{selectedRows.length}</strong> (range {startRowNum}-{endRowNum})
        </div>

        <div className="flex gap-2">
          <Button type="button" onClick={runBulkGeneration} disabled={isRunning || selectedRows.length === 0}>
            {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Start Sequential Generation
          </Button>
          <Button type="button" variant="destructive" onClick={stopBulkRun} disabled={!isRunning}>
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
          <Button type="button" variant="outline" onClick={refreshAllFiles} disabled={isRunning || isRefreshingPdfs || completedCount === 0}>
            {isRefreshingPdfs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Refresh All PDFs
          </Button>
          <Button type="button" variant="outline" onClick={prepareAllCompletedPdfs} disabled={isRunning || completedCount === 0}>
            Prepare Downloads
          </Button>
        </div>

        {!!bulkRows.length && (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="p-3 border-b bg-muted/40 text-sm">
              Completed: <strong>{completedCount}</strong> | Failed: <strong>{failedCount}</strong> | Total: <strong>{bulkRows.length}</strong>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Row</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Place</th>
                    <th className="text-left p-2">Gender</th>
                    <th className="text-left p-2">Language</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Job ID</th>
                    <th className="text-left p-2">Save PDF</th>
                    <th className="text-left p-2">Download Link (7 days)</th>
                    <th className="text-left p-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row) => (
                    <tr key={row.rowNumber} className="border-t">
                      <td className="p-2">{row.rowNumber}</td>
                      <td className="p-2">{row.name || '-'}</td>
                      <td className="p-2">{row.place || '-'}</td>
                      <td className="p-2">
                        {row.status === 'pending' ? (
                          <select
                            value={row.gender}
                            onChange={(e) => updateBulkRow(row.rowNumber, { gender: e.target.value as 'M' | 'F' })}
                            className="px-1 py-0.5 border border-input bg-background rounded text-xs w-16"
                          >
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                          </select>
                        ) : (
                          <span className="text-xs">{row.gender === 'M' ? 'Male' : 'Female'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.status === 'pending' ? (
                          <select
                            value={row.language}
                            onChange={(e) => updateBulkRow(row.rowNumber, { language: e.target.value as 'en' | 'hi' | 'te' })}
                            className="px-1 py-0.5 border border-input bg-background rounded text-xs w-18"
                          >
                            <option value="en">EN</option>
                            <option value="hi">HI</option>
                            <option value="te">TE</option>
                          </select>
                        ) : (
                          <span className="text-xs">{row.language === 'hi' ? 'HI' : row.language === 'te' ? 'TE' : 'EN'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge className={STATUS_COLORS[row.status]}>{row.status}</Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{row.jobId || '-'}</td>
                      <td className="p-2">
                        {row.status === 'completed' ? (
                          row.downloadUrl ? (
                            <button
                              type="button"
                              className="text-primary underline text-xs cursor-pointer bg-transparent border-none p-0"
                              onClick={() => void saveAsDialog(
                                row.downloadUrl!,
                                row.downloadFileName || buildDownloadFileName(row.name),
                              )}
                            >
                              Save PDF
                            </button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void preparePdfForRow(row)}
                              disabled={!!row.isPreparingPdf}
                            >
                              {row.isPreparingPdf ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                              {row.isPreparingPdf ? 'Preparing...' : 'Prepare PDF'}
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.bucketSignedUrl ? (
                          <a
                            href={row.bucketSignedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline text-xs font-medium"
                          >
                            📥 Download
                          </a>
                        ) : row.isPreparingPdf ? (
                          <span className="text-xs text-muted-foreground">Generating…</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2 text-red-700 text-xs">{row.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
