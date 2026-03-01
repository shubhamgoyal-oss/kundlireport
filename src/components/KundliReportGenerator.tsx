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
import { useIndianCitiesAutocomplete } from '@/hooks/useIndianCitiesAutocomplete';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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

const KundliReportGenerator = () => {
  const { t: _t } = useTranslation();
  const { predictions, searchPlaces, getPlaceDetails, clearPredictions } = useIndianCitiesAutocomplete();
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [kundliReport, setKundliReport] = useState<any>(null);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(-1);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobPhase, setJobPhase] = useState("");
  const isHindi = (i18n.language ? i18n.language.toLowerCase() : '').startsWith('hi');
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

    const timer = setTimeout(async () => {
      await searchPlaces(searchTerm);
      setShowPlaceResults(true);
      setSelectedPlaceIndex(-1);
    }, 150);

    setSearchTimer(timer);
  };

  const handlePlaceSelect = async (cityId: string, displayName: string) => {
    const details = await getPlaceDetails(cityId);
    
    if (details) {
      setValue('place', details.display_name);
      setValue('lat', details.lat);
      setValue('lon', details.lng);
      setValue('tz', 'Asia/Kolkata');
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
          handlePlaceSelect(selected.id, selected.displayName);
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
      let tzOffset = 5.5;
      if (data.tz) {
        try {
          const now = new Date();
          const utc = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
          const local = new Date(now.toLocaleString('en-US', { timeZone: data.tz }));
          tzOffset = (local.getTime() - utc.getTime()) / (1000 * 60 * 60);
        } catch (e) {
          console.warn('[KundliReportGenerator] Failed to calculate timezone offset:', e);
        }
      }

      const visitorId = localStorage.getItem('visitor_id') || crypto.randomUUID();
      const sessionId = localStorage.getItem('session_id') || crypto.randomUUID();
      
      if (!localStorage.getItem('visitor_id')) localStorage.setItem('visitor_id', visitorId);
      if (!localStorage.getItem('session_id')) localStorage.setItem('session_id', sessionId);

      let jobData: any = null;
      let startError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await supabase.functions.invoke('start-kundli-job', {
          body: {
            name: data.name.trim(),
            dateOfBirth: data.date,
            timeOfBirth: data.time || '12:00',
            placeOfBirth: data.place,
            latitude: data.lat || 0,
            longitude: data.lon || 0,
            timezone: tzOffset,
            language: isHindi ? 'hi' : 'en',
            gender: data.gender,
            visitorId,
            sessionId,
          },
        });

        if (!result.error) {
          jobData = result.data;
          startError = null;
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

      const pollJob = async (): Promise<any> => {
        pollCount++;
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-kundli-job?jobId=${jobId}`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
          }
        );
        
        if (!response.ok) {
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
        
        setJobProgress(jobStatus.progressPercent || 0);
        setJobPhase(jobStatus.currentPhase || '');

        if (jobStatus.status === 'completed' && jobStatus.report) {
          setJobProgress(100);
          setJobPhase('Complete');
          return jobStatus.report;
        }

        if (jobStatus.status === 'failed') {
          throw new Error(jobStatus.error || 'Report generation failed');
        }

        if (pollCount >= maxPolls) {
          throw new Error('Report generation timed out. Please try again.');
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
        return pollJob();
      };

      const report = await pollJob();
      
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
                    onChange={(e) => i18n.changeLanguage(e.target.value)}
                    defaultValue={i18n.language || 'en'}
                    className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="te">తెలుగు (Telugu)</option>
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

                {/* Date of Birth */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm sm:text-base font-medium">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    {isHindi ? 'जन्म तिथि' : 'Date of Birth'} <span className="text-destructive">*</span>
                  </Label>
                  <DateOfBirthPicker
                    value={watch('date') || ''}
                    onChange={(date) => setValue('date', date)}
                    error={errors.date?.message}
                  />
                </div>

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
                        handlePlaceSearch(e.target.value);
                      }}
                      onKeyDown={handlePlaceKeyDown}
                      autoComplete="off"
                      className={`bg-input min-h-[44px] text-base ${errors.place ? 'border-destructive' : ''}`}
                    />
                    {showPlaceResults && predictions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {predictions.map((prediction, idx) => (
                          <button
                            key={prediction.id}
                            type="button"
                            className={`w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors ${
                              idx === selectedPlaceIndex ? 'bg-accent' : ''
                            }`}
                            onClick={() => handlePlaceSelect(prediction.id, prediction.displayName)}
                          >
                            <span className="text-sm">{prediction.displayName}</span>
                          </button>
                        ))}
                      </div>
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
