import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { preloadCityDatabase, searchPlaces } from '@/utils/geocoding';
import { Loader2, Play, Square, Table2, RefreshCw } from 'lucide-react';
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

  const stopRequestedRef = useRef(false);
  const placeCacheRef = useRef<Map<string, { lat: number; lon: number; displayName: string }>>(new Map());
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    preloadCityDatabase();
  }, []);

  const startRowNum = Math.max(2, Number(startRow) || 2);
  const endRowNum = Math.max(startRowNum, Number(endRow) || startRowNum);

  const selectedRows = useMemo(() => {
    return allRows.filter((row) => row.rowNumber >= startRowNum && row.rowNumber <= endRowNum);
  }, [allRows, startRowNum, endRowNum]);

  const loadSheetRows = async () => {
    setIsLoadingSheet(true);
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
      toast.success(`Loaded ${rows.length} rows from Google Sheet`);
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

  const buildDownloadFileName = (name: string, rowNumber: number): string => {
    const safeName = String(name || 'Kundli')
      .trim()
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `Kundli_Report_${safeName || 'Kundli'}_row_${rowNumber}.pdf`;
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

      const charts = await fetchMultipleCharts(birthDetails, 'North', 'en', PDF_CHARTS);
      const reportWithCharts = { ...report, charts };
      const blob = await pdf(<KundliPDFDocument report={reportWithCharts} />).toBlob();
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

    setBulkRows(
      selectedRows.map((row) => ({
        rowNumber: row.rowNumber,
        name: row.normalized.offering_user_name || row.normalized.name || '',
        place: row.normalized.place_of_birth || '',
        status: 'pending',
      })),
    );

    const { visitorId, sessionId } = getVisitorAndSessionIds();

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
        const gender = String(decoded?.gender || 'M').toUpperCase() === 'F' ? 'F' : 'M';
        const source = String(decoded?.source || 'deterministic');

        if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth) {
          throw new Error('Missing normalized values after decipher step');
        }

        updateBulkRow(row.rowNumber, {
          name,
          place: placeOfBirth,
          source,
          status: 'geocoding',
        });

        const coords = await resolveCoordinates(placeOfBirth);

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
            language: 'en',
            gender,
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
        } else {
          updateBulkRow(row.rowNumber, {
            status: 'failed',
            error: result.error || 'Job failed',
          });
        }
      } catch (err) {
        updateBulkRow(row.rowNumber, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
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
          Bulk Google Sheet Runner (English default)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-3 space-y-2">
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
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Job ID</th>
                    <th className="text-left p-2">Download</th>
                    <th className="text-left p-2">Bucket Link</th>
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
                        <Badge className={STATUS_COLORS[row.status]}>{row.status}</Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{row.jobId || '-'}</td>
                      <td className="p-2">
                        {row.status === 'completed' ? (
                          row.downloadUrl ? (
                            <a
                              href={row.downloadUrl}
                              download={row.downloadFileName || buildDownloadFileName(row.name, row.rowNumber)}
                              className="text-primary underline text-xs"
                            >
                              Download PDF
                            </a>
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
                            className="text-primary underline text-xs"
                          >
                            Open from bucket
                          </a>
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
