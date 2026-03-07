import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Clock, MapPin, Loader2, Edit, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { KundliReportViewer } from './KundliReportViewer';
import { KundliProgressTracker } from './KundliProgressTracker';
import { DateOfBirthPicker } from './DateOfBirthPicker';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';
import { PipelineSelector } from './PipelineSelector';
import { kundliApiInvoke, kundliApiFetch, type Pipeline } from '@/lib/kundliApi';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { mirrorJobStartToFirebase, updateJobStatusInFirebaseFromPolling } from '@/integrations/firebase/dual-write-hook';
import { getJobFromFirebase } from '@/integrations/firebase/client';
import { detectTimezone, getUtcOffsetHours } from '@/utils/timezone';

// Form validation schema
const birthInputSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    gender: z.enum(["M", "F"], { required_error: "Gender is required" }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    time: z.string().optional().nullable(),
    unknownTime: z.boolean().default(false),
    place: z.string().min(1, "Birth place is required"),
    lat: z.number().optional(),
    lon: z.number().optional(),
    tz: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.time)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time"],
        message: "Invalid time format (HH:MM)",
      });
    }

    if (!data.unknownTime && (!data.time || data.time.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time"],
        message: "Time is required when birth time is known",
      });
    }

    if (data.place && (data.lat == null || data.lon == null || !data.tz)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["place"],
        message: "Please select a place from the dropdown list",
      });
    }
  });

type BirthInput = z.infer<typeof birthInputSchema>;
type ReportLanguage = 'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta' | 'gu';

const toReportLanguage = (langCode: string): ReportLanguage =>
  langCode === 'hi'
    ? 'hi'
    : langCode === 'te'
      ? 'te'
      : langCode === 'kn'
        ? 'kn'
        : langCode === 'mr'
          ? 'mr'
          : langCode === 'ta'
            ? 'ta'
            : langCode === 'gu'
              ? 'gu'
              : 'en';

const KundliReportGenerator = () => {
  const { t: _t } = useTranslation();
  const {
    isLoaded: isGooglePlacesLoaded,
    isSearching: isGooglePlacesSearching,
    predictions,
    searchPlaces,
    getPlaceDetails,
    clearPredictions,
  } = useGooglePlacesAutocomplete();
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [kundliReport, setKundliReport] = useState<any>(null);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(-1);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobPhase, setJobPhase] = useState("");
  const [pipeline, setPipeline] = useState<Pipeline>('supabase');
  // UI language follows route/i18n. Report language is user-selected independently.
  const uiLangCode = (i18n.language || 'en').toLowerCase().slice(0, 2);
  const uiLanguage: ReportLanguage = toReportLanguage(uiLangCode);
  const [reportLanguage, setReportLanguage] = useState<ReportLanguage>(uiLanguage);
  const isHindi = uiLanguage !== 'en'; // true for Indic UI labels
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BirthInput>({
    resolver: zodResolver(birthInputSchema),
    defaultValues: {
      unknownTime: false,
      place: "",
      gender: "M",
    },
  });

  const unknownTime = watch('unknownTime');

  const handlePlaceSearch = (searchTerm: string) => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    if (searchTerm.length < 2) {
      clearPredictions();
      setShowPlaceResults(false);
      return;
    }

    if (!isGooglePlacesLoaded) {
      setShowPlaceResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      await searchPlaces(searchTerm);
      setShowPlaceResults(true);
      setSelectedPlaceIndex(-1);
    }, 300);

    setSearchTimer(timer);
  };

  const handlePlaceSelect = async (placeId: string, displayName: string) => {
    const details = await getPlaceDetails(placeId);

    if (details) {
      setValue('place', details.display_name);
      setValue('lat', details.lat);
      setValue('lon', details.lng);
      // Detect timezone from country + city coordinates (handles multi-tz countries like USA)
      const tzResult = detectTimezone(details.country || '', details.lat, details.lng);
      setValue('tz', tzResult.ianaTimezone);
      console.log(`[KundliReportGenerator] Timezone: ${tzResult.displayLabel} (country="${details.country}", lat=${details.lat}, lon=${details.lng})`);
      toast.success(isHindi ? 'स्थान चुना गया' : 'Location selected');
    } else {
      setValue('place', displayName);
      toast.error(isHindi ? 'स्थान निर्देशांक प्राप्त नहीं हो सके' : 'Could not get location coordinates');
    }

    setShowPlaceResults(false);
    clearPredictions();
    setSelectedPlaceIndex(-1);
  };

  const handlePlaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPlaceResults || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedPlaceIndex(prev => prev < predictions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedPlaceIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedPlaceIndex >= 0 && selectedPlaceIndex < predictions.length) {
          const selected = predictions[selectedPlaceIndex];
          handlePlaceSelect(selected.place_id, selected.description);
        }
        break;
      case 'Escape':
        setShowPlaceResults(false);
        setSelectedPlaceIndex(-1);
        break;
    }
  };

  const onSubmit = async (data: BirthInput) => {
    trackEvent('generate_kundli_report_clicked', {
      metadata: {
        hasTime: !data.unknownTime,
        place: data.place,
        date: data.date,
      }
    });
    
    setIsGenerating(true);
    
    try {
      // Compute DST-aware timezone offset from stored IANA timezone + birth date
      let tzOffset = 5.5;
      if (data.tz) {
        try {
          const [y, m, d] = data.date.split('-').map(Number);
          const [hh, mm] = (data.time || '12:00').split(':').map(Number);
          const refDate = new Date(Date.UTC(y, m - 1, d, hh || 12, mm || 0));
          tzOffset = getUtcOffsetHours(data.tz, refDate);
        } catch (e) {
          console.warn('[KundliReportGenerator] Failed to calculate timezone offset:', e);
        }
      }
      console.log(`[KundliReportGenerator] Timezone offset: ${tzOffset} (iana=${data.tz})`);

      const visitorId = localStorage.getItem('visitor_id') || crypto.randomUUID();
      const sessionId = localStorage.getItem('session_id') || crypto.randomUUID();
      
      if (!localStorage.getItem('visitor_id')) localStorage.setItem('visitor_id', visitorId);
      if (!localStorage.getItem('session_id')) localStorage.setItem('session_id', sessionId);

      let jobData: any = null;
      let startError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await kundliApiInvoke(pipeline, 'start-kundli-job', {
          body: {
            name: data.name.trim(),
            dateOfBirth: data.date,
            timeOfBirth: data.time || '12:00',
            placeOfBirth: data.place,
            latitude: data.lat || 0,
            longitude: data.lon || 0,
            timezone: tzOffset,
            language: reportLanguage,
            gender: data.gender,
            hasTime: !data.unknownTime,
            visitorId,
            sessionId,
          },
        });

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

        startError = result.error;
        console.warn(`[KundliReportGenerator] Start job attempt ${attempt + 1} failed:`, result.error.message);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
        }
      }

      if (startError) {
        throw new Error(startError.message || 'Failed to start report generation');
      }

      const jobId = jobData?.jobId;
      if (!jobId) {
        throw new Error('No job ID returned');
      }

      console.log('[KundliReportGenerator] Job started:', jobId);
      
      const pollInterval = 3000;
      const maxPolls = 240;
      let pollCount = 0;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 5;
      const completedStablePollsRequired = 3;
      let completedStablePolls = 0;
      let completedStableRevision: number | null = null;

      // ── Stall detection & auto-retry ──────────────────────────────────────
      let lastProgressValue = -1;
      let lastProgressChangeTime = Date.now();
      let retriesAttempted = 0;
      const maxRetries = 2;         // max number of auto-retriggers
      const stallThresholdMs = 90_000; // 90s without progress change = stalled

      const getRetryFunctionName = (phase: string) => {
        const normalizedPhase = String(phase || '').toLowerCase();
        // CRITICAL: If the backend is retrying failed agents, do NOT trigger
        // translate/finalize — that would process partial data. Re-trigger
        // process-kundli-job instead so the retry can finish.
        if (normalizedPhase.includes('retry')) {
          return 'process-kundli-job';
        }
        if (normalizedPhase.includes('translat')) {
          return 'translate-kundli-report';
        }
        if (
          normalizedPhase.includes('finaliz')
          || normalizedPhase.includes('quality')
          || normalizedPhase.includes('chart')
          || normalizedPhase.includes('complete')
        ) {
          return 'finalize-kundli-report';
        }
        return 'process-kundli-job';
      };

      const retriggerStalledStage = async (phase: string, progress: number) => {
        retriesAttempted++;
        const functionName = getRetryFunctionName(phase);

        console.log(`🔄 [KundliReportGenerator] Job stalled at "${phase}" — auto-retrigger ${retriesAttempted}/${maxRetries}: ${functionName}`);
        try {
          await kundliApiFetch(pipeline, functionName, { body: { jobId } });
        } catch (retriggerErr) {
          console.warn('[KundliReportGenerator] Auto-retrigger failed:', retriggerErr);
        }
      };
      // ───────────────────────────────────────────────────────────────────────

      const pollJob = async (): Promise<any> => {
        pollCount++;

        let response: Response;
        try {
          response = await kundliApiFetch(pipeline, 'get-kundli-job', {
            method: 'GET',
            query: { jobId },
          });
        } catch (fetchError) {
          consecutiveErrors++;
          const errMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
          console.warn(`[KundliReportGenerator] Poll fetch error (${consecutiveErrors}/${maxConsecutiveErrors}):`, errMsg);
          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error(`Failed to check job status after repeated network errors: ${errMsg}`);
          }
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          return pollJob();
        }

        if (!response.ok) {
          // Try Firebase fallback if Supabase is down
          if (response.status >= 500 && import.meta.env.VITE_ENABLE_FIREBASE_FALLBACK === 'true') {
            try {
              const firebaseJob = await getJobFromFirebase(jobId);
              if (firebaseJob) {
                console.log('[KundliReportGenerator] Supabase failed, using Firebase fallback');
                return {
                  status: firebaseJob.status || 'failed',
                  error: firebaseJob.errorMessage
                };
              }
            } catch (fallbackErr) {
              console.warn('[KundliReportGenerator] Firebase fallback also failed:', fallbackErr);
            }
          }

          consecutiveErrors++;
          console.warn(`[KundliReportGenerator] Poll error (${consecutiveErrors}/${maxConsecutiveErrors}):`, response.status);
          if (consecutiveErrors >= maxConsecutiveErrors) {
            throw new Error('Failed to check job status after multiple retries');
          }
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          return pollJob();
        }

        consecutiveErrors = 0;
        const jobStatus = await response.json();
        console.log('[KundliReportGenerator] Job status:', jobStatus.status, jobStatus.progressPercent + '%');

        // Dual-write status update to Firebase
        if (jobId && (import.meta.env.VITE_ENABLE_DUAL_WRITE === 'true')) {
          updateJobStatusInFirebaseFromPolling(
            jobId,
            jobStatus.status || 'processing',
            jobStatus.currentPhase || 'pending',
            jobStatus.progressPercent || 0,
            jobStatus.error || jobStatus.errorMessage
          ).catch(() => {
            // Fail silently
          });
        }

        setJobProgress(jobStatus.progressPercent || 0);
        setJobPhase(jobStatus.currentPhase || '');

        const responseIsFinal = Boolean(
          jobStatus?.isFinal === true
          || jobStatus?.report?.isFinal === true
          || jobStatus?.report?.is_final === true
          || jobStatus?.report?.finalization?.isFinal === true
          || jobStatus?.report?.finalization?.is_final === true
        );
        const revisionRaw = Number(
          jobStatus?.reportRevision
          ?? jobStatus?.report?.revision
          ?? jobStatus?.report?.finalization?.revision
          ?? 0
        );
        const reportRevision = Number.isFinite(revisionRaw) ? Math.max(0, Math.floor(revisionRaw)) : 0;

        if (jobStatus.status === 'completed' && jobStatus.report && responseIsFinal) {
          if (completedStableRevision !== reportRevision) {
            completedStableRevision = reportRevision;
            completedStablePolls = 1;
          } else {
            completedStablePolls += 1;
          }

          if (completedStablePolls >= completedStablePollsRequired) {
            setJobProgress(100);
            setJobPhase('Complete');
            return jobStatus.report;
          }

          setJobPhase(`Final check (${completedStablePolls}/${completedStablePollsRequired})`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          return pollJob();
        }

        completedStablePolls = 0;
        completedStableRevision = null;

        if (jobStatus.status === 'failed') {
          throw new Error(jobStatus.error || 'Report generation failed');
        }

        // ── Stall detection ─────────────────────────────────────────────────
        const currentProgress = jobStatus.progressPercent || 0;
        if (currentProgress !== lastProgressValue) {
          lastProgressValue = currentProgress;
          lastProgressChangeTime = Date.now();
        }

        const stallDuration = Date.now() - lastProgressChangeTime;
        if (
          stallDuration > stallThresholdMs &&
          retriesAttempted < maxRetries &&
          jobStatus.status === 'processing'
        ) {
          await retriggerStalledStage(jobStatus.currentPhase || '', currentProgress);
          lastProgressChangeTime = Date.now(); // reset stall timer after retrigger
        }
        // ────────────────────────────────────────────────────────────────────

        if (pollCount >= maxPolls) {
          throw new Error('Report generation timed out. Please try again.');
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        return pollJob();
      };

      const report = await pollJob();

      // Mark unknown time so PDF shows "Time not available"
      if (data.unknownTime && report?.birthDetails) {
        report.birthDetails.unknownTime = true;
      }

      setKundliReport(report);
      setIsFormCollapsed(true);
      
      toast.success(isHindi ? 'कुंडली रिपोर्ट तैयार!' : 'Kundli report generated!');
      
      trackEvent('kundli_report_generated', {
        metadata: {
          place: data.place,
          date: data.date,
          hasTime: !data.unknownTime,
          jobId,
        }
      });
      
    } catch (error) {
      console.error('Report generation error:', error);
      
      trackEvent('kundli_report_error', {
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          place: data.place,
          date: data.date,
        }
      });
      
      toast.error(isHindi ? 'रिपोर्ट बनाने में त्रुटि। कृपया पुनः प्रयास करें।' : 'Error generating report. Please try again.');
    } finally {
      setIsGenerating(false);
      setJobProgress(0);
      setJobPhase('');
    }
  };

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto spiritual-glow">
        <Collapsible open={!isFormCollapsed} onOpenChange={(open) => setIsFormCollapsed(!open)}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-6">
            <div className="flex-1">
              <CardTitle className="text-2xl sm:text-3xl font-bold text-center sm:text-left gradient-spiritual bg-clip-text text-transparent flex items-center gap-2 justify-center sm:justify-start">
                <FileText className="w-6 h-6 text-primary" />
                {isHindi ? 'कुंडली रिपोर्ट' : 'Kundli Report Generator'}
              </CardTitle>
            </div>
            {isFormCollapsed && (
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="min-h-[44px] px-4">
                  <Edit className="w-4 h-4 mr-2" />
                  {isHindi ? 'संपादित करें' : 'Edit'}
                </Button>
              </CollapsibleTrigger>
            )}
          </CardHeader>
          
          <CollapsibleContent>
            <CardContent className="p-4 sm:p-6">
              <form onSubmit={handleSubmit(onSubmit, (errs) => {
                const msg = (errs.place?.message as string)
                  || (errs.time?.message as string)
                  || (errs.date?.message as string)
                  || (Object.values(errs)[0]?.message as string)
                  || (isHindi ? 'कृपया हाइलाइट किए गए फ़ील्ड सही करें' : 'Please correct the highlighted fields');
                toast.error(msg);
              })} className="space-y-4 sm:space-y-6">

                {/* Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2 text-sm sm:text-base font-medium">
                    <User className="w-4 h-4 flex-shrink-0" />
                    {isHindi ? 'आपका नाम' : 'Your Name'} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder={isHindi ? 'अपना नाम दर्ज करें' : 'Enter your name'}
                    className={`bg-input min-h-[44px] text-base ${errors.name ? 'border-destructive' : ''}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                {/* Report Language */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm sm:text-base font-medium">
                    {isHindi ? 'रिपोर्ट भाषा' : 'Report Language'} <span className="text-destructive">*</span>
                  </Label>
                  <select
                    value={reportLanguage}
                    onChange={(e) => setReportLanguage(e.target.value as ReportLanguage)}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
                    <option value="kn">ಕನ್ನಡ (Kannada)</option>
                    <option value="mr">मराठी (Marathi)</option>
                    <option value="ta">தமிழ் (Tamil)</option>
                    <option value="gu">ગુજરાતી (Gujarati)</option>
                  </select>
                </div>

                {/* Gender Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm sm:text-base font-medium">
                    <User className="w-4 h-4 flex-shrink-0" />
                    {isHindi ? 'लिंग' : 'Gender'} <span className="text-destructive">*</span>
                  </Label>
                  <RadioGroup
                    defaultValue="M"
                    onValueChange={(value) => setValue('gender', value as 'M' | 'F')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="M" id="male" />
                      <Label htmlFor="male" className="cursor-pointer">
                        {isHindi ? 'पुरुष' : 'Male'}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="F" id="female" />
                      <Label htmlFor="female" className="cursor-pointer">
                        {isHindi ? 'महिला' : 'Female'}
                      </Label>
                    </div>
                  </RadioGroup>
                  {errors.gender && (
                    <p className="text-xs text-destructive">{errors.gender.message}</p>
                  )}
                </div>

                {/* Pipeline Selector */}
                <PipelineSelector value={pipeline} onChange={setPipeline} disabled={isGenerating} isHindi={isHindi} />

                {/* Date of Birth */}
                <DateOfBirthPicker
                  value={watch('date') || ''}
                  onChange={(date) => setValue('date', date)}
                  error={errors.date?.message}
                />

                {/* Time of Birth */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="time" className="flex items-center gap-2 text-sm sm:text-base font-medium">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      {isHindi ? 'जन्म समय' : 'Time of Birth'} {!unknownTime && <span className="text-destructive">*</span>}
                    </Label>
                    <label className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('unknownTime')}
                        className="w-4 h-4"
                      />
                      {isHindi ? 'समय ज्ञात नहीं' : "Don't know time"}
                    </label>
                  </div>
                  {!unknownTime && (
                    <Input
                      id="time"
                      type="time"
                      {...register('time')}
                      className={`bg-input min-h-[44px] text-base ${errors.time ? 'border-destructive' : ''}`}
                    />
                  )}
                  {errors.time && !unknownTime && (
                    <p className="text-xs text-destructive">{errors.time.message}</p>
                  )}
                </div>

                {/* Place of Birth */}
                <div className="space-y-2">
                  <Label htmlFor="place" className="flex items-center gap-2 text-sm sm:text-base font-medium">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    {isHindi ? 'जन्म स्थान' : 'Place of Birth'} <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative" ref={dropdownRef}>
                    <Input
                      id="place"
                      {...register('place')}
                      placeholder={isHindi ? 'शहर खोजें...' : 'Search for a city...'}
                      onChange={(e) => {
                        register('place').onChange(e);
                        // Force fresh place selection for every edit (avoid stale lat/lon/tz)
                        setValue('lat', undefined);
                        setValue('lon', undefined);
                        setValue('tz', undefined);
                        handlePlaceSearch(e.target.value);
                      }}
                      onKeyDown={handlePlaceKeyDown}
                      autoComplete="off"
                      className={`bg-input min-h-[44px] text-base ${errors.place ? 'border-destructive' : ''}`}
                    />
                    {isGooglePlacesSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {showPlaceResults && predictions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {predictions.map((prediction, idx) => (
                          <button
                            key={prediction.place_id}
                            type="button"
                            className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${
                              idx === selectedPlaceIndex ? 'bg-accent' : ''
                            }`}
                            onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
                          >
                            <div className="text-sm font-medium">{prediction.structured_formatting.main_text}</div>
                            <div className="text-xs text-muted-foreground">{prediction.structured_formatting.secondary_text}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {!isGooglePlacesLoaded && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {isHindi ? 'स्थान सुझाव लोड हो रहे हैं...' : 'Loading place suggestions...'}
                      </p>
                    )}
                  </div>
                  {errors.place && (
                    <p className="text-xs text-destructive">{errors.place.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full min-h-[48px] text-base font-semibold"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {isHindi ? 'रिपोर्ट बना रहे हैं...' : 'Generating Report...'}
                    </>
                  ) : (
                    <>
                      <FileText className="w-5 h-5 mr-2" />
                      {isHindi ? 'कुंडली रिपोर्ट बनाएं' : 'Generate Kundli Report'}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Progress Tracker */}
      {isGenerating && (
        <KundliProgressTracker 
          progress={jobProgress} 
          currentPhase={jobPhase} 
          isHindi={isHindi} 
        />
      )}

      {/* Report Viewer */}
      {kundliReport && !isGenerating && (
        <div className="mt-6">
          <KundliReportViewer report={kundliReport} />
        </div>
      )}
    </>
  );
};

export default KundliReportGenerator;
