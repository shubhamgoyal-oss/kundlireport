import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Clock, MapPin, Loader2, AlertCircle, RotateCcw, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { searchPlaces, type Place } from '@/utils/geocoding';
import DoshaResults from './DoshaResults';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

// Form validation schema - no name or gender fields
const birthInputSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    time: z.string().optional().nullable(),
    unknownTime: z.boolean().default(false),
    place: z.string().min(1, "Birth place is required"),
    lat: z.number().optional(),
    lon: z.number().optional(),
    tz: z.string().optional(),
    chartStyle: z.enum(["north", "south"]).default("north").optional(),
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

const DoshaCalculator = () => {
  const { t } = useTranslation();
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [doshaResults, setDoshaResults] = useState<any>(null);
  const [calculationId, setCalculationId] = useState<string | null>(null);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(-1);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BirthInput>({
    resolver: zodResolver(birthInputSchema),
    defaultValues: {
      unknownTime: false,
      chartStyle: "north",
    },
  });

  const unknownTime = watch('unknownTime');
  const placeValue = watch('place');

  const handlePlaceSearch = (searchTerm: string) => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    if (searchTerm.length < 2) {
      setPlaceSearchResults([]);
      setShowPlaceResults(false);
      return;
    }

    setIsSearching(true);
    
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(searchTerm);
        
        if (results.length === 0) {
          const { INDIAN_CITIES_FALLBACK } = await import('@/utils/geocoding');
          const fallback = INDIAN_CITIES_FALLBACK.filter(city =>
            city.display_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          setPlaceSearchResults(fallback);
        } else {
          setPlaceSearchResults(results);
        }
        
        setShowPlaceResults(true);
        setSelectedPlaceIndex(-1);
      } catch (error) {
        console.error('Place search error:', error);
        const { INDIAN_CITIES_FALLBACK } = await import('@/utils/geocoding');
        const fallback = INDIAN_CITIES_FALLBACK.filter(city =>
          city.display_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setPlaceSearchResults(fallback);
        setShowPlaceResults(true);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    setSearchTimer(timer);
  };

  const handlePlaceSelect = async (place: Place) => {
    setValue('place', place.display_name);
    setValue('lat', place.lat);
    setValue('lon', place.lon);
    setValue('tz', 'Asia/Kolkata');
    
    setShowPlaceResults(false);
    setPlaceSearchResults([]);
    setSelectedPlaceIndex(-1);
    
    toast.success(t('dosha.locationSelected'));
  };

  const handlePlaceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPlaceResults || placeSearchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedPlaceIndex(prev => 
          prev < placeSearchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedPlaceIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedPlaceIndex >= 0 && selectedPlaceIndex < placeSearchResults.length) {
          handlePlaceSelect(placeSearchResults[selectedPlaceIndex]);
        }
        break;
      case 'Escape':
        setShowPlaceResults(false);
        setSelectedPlaceIndex(-1);
        break;
    }
  };

  const onSubmit = async (data: BirthInput) => {
    // Always send default name and gender
    const submissionData = {
      ...data,
      name: 'Default User',
      gender: 'male',
    };
    
    trackEvent('calculate_dosha_clicked', {
      metadata: {
        hasTime: !submissionData.unknownTime,
        place: submissionData.place,
        date: submissionData.date
      }
    });
    
    setIsCalculating(true);
    
    try {
      const visitorId = localStorage.getItem('analytics_visitor_id') || 'unknown';
      const sessionId = localStorage.getItem('analytics_session_id') || 'unknown';
      
      const response = await supabase.functions.invoke('calculate-dosha', {
        body: submissionData,
        headers: {
          'x-visitor-id': visitorId,
          'x-session-id': sessionId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Calculation failed');
      }

      const result = response.data;
      
      const normalized = { ...result, summary: { ...(result?.summary || {}) } } as any;
      if (!normalized.summary.shaniSadeSati) {
        if (normalized.summary.sadeSati) {
          normalized.summary.shaniSadeSati = normalized.summary.sadeSati === 'active' ? 'active' : 'inactive';
        }
        if (normalized.summary.sadeSatiPhase && normalized.summary.shaniPhase == null) {
          const phaseStr = String(normalized.summary.sadeSatiPhase);
          normalized.summary.shaniPhase = phaseStr.includes('RISING') ? 1 : (phaseStr.includes('PEAK') ? 2 : (phaseStr.includes('SETTING') ? 3 : null));
        }
      }
      
      setDoshaResults(normalized);
      setIsFormCollapsed(true);
      toast.success(t('dosha.calculationSuccess'));
      
      if ((normalized as any).calculationId) {
        setCalculationId((normalized as any).calculationId);
      }
    } catch (error) {
      console.error('Calculation error:', error);
      
      // Track unsuccessful calculation
      trackEvent('dosha_calculate_unsuccessful', {
        metadata: {
          error: error instanceof Error ? error.message : 'Unknown error',
          place: submissionData.place,
          date: submissionData.date,
          hasTime: !submissionData.unknownTime
        }
      });
      
      toast.error(t('dosha.calculationError'));
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto spiritual-glow">
      <Collapsible open={!isFormCollapsed} onOpenChange={(open) => setIsFormCollapsed(!open)}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-4 sm:p-6">
          <div className="flex-1">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center sm:text-left gradient-spiritual bg-clip-text text-transparent">
              {t('dosha.calculatorTitle')}
            </CardTitle>
            <CardDescription className="text-center sm:text-left text-sm sm:text-base mt-1">
              {t('dosha.calculatorDesc')}
            </CardDescription>
          </div>
          <div className="flex gap-2 justify-center sm:justify-end">
            {isFormCollapsed && (
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] px-4"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {t('dosha.edit', 'Edit')}
                </Button>
              </CollapsibleTrigger>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground min-h-[44px] px-4"
              onClick={() => {
                reset();
                setPlaceSearchResults([]);
                setShowPlaceResults(false);
                setDoshaResults(null);
                setIsFormCollapsed(false);
                toast.success(t('dosha.formRefreshed'));
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('dosha.refresh')}
            </Button>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit, (errs) => {
          const msg = (errs.place?.message as string)
            || (errs.time?.message as string)
            || (errs.date?.message as string)
            || (Object.values(errs)[0]?.message as string)
            || t('dosha.formError', 'Please correct the highlighted fields');
          toast.error(msg);
        })} className="space-y-4 sm:space-y-6">

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2 text-sm sm:text-base">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              {t('dosha.dateOfBirth')} *
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="bg-input min-h-[44px] text-base"
              required
            />
            {errors.date && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.date.message}
              </p>
            )}
          </div>

          {/* Birth Time */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2 text-sm sm:text-base">
              <Clock className="w-4 h-4 flex-shrink-0" />
              {t('dosha.timeOfBirth')} *
            </Label>
            
            <div className="flex items-center gap-2 mb-2">
              <Switch
                id="unknownTime"
                checked={unknownTime}
                onCheckedChange={(checked) => {
                  setValue('unknownTime', checked);
                  if (checked) {
                    setValue('time', '');
                  }
                }}
              />
              <Label htmlFor="unknownTime" className="text-sm cursor-pointer">
                {t('dosha.unknownTime')}
              </Label>
            </div>

            <Input
              id="time"
              type="time"
              {...register('time')}
              disabled={unknownTime}
              className="bg-input min-h-[44px] text-base"
              required={!unknownTime}
            />
            <p className="text-xs text-muted-foreground">
              {t('dosha.timeFormat')}
            </p>
            {errors.time && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.time.message}
              </p>
            )}
          </div>

          {/* Place of Birth */}
          <div className="space-y-2 relative">
            <Label htmlFor="place" className="flex items-center gap-2 text-sm sm:text-base">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              {t('dosha.placeOfBirth')} *
            </Label>
            <Input
              id="place"
              {...register('place')}
              placeholder={t('dosha.enterPlace')}
              className="bg-input min-h-[44px] text-base"
              onChange={(e) => handlePlaceSearch(e.target.value)}
              onKeyDown={handlePlaceKeyDown}
              autoComplete="off"
              required
            />
            
            {showPlaceResults && placeSearchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {placeSearchResults.map((place, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                      index === selectedPlaceIndex ? 'bg-accent' : ''
                    }`}
                    onClick={() => handlePlaceSelect(place)}
                  >
                    <div className="text-sm font-medium">{place.display_name}</div>
                  </button>
                ))}
              </div>
            )}
            
            {isSearching && (
              <div className="absolute right-3 top-9">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {errors.place && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.place.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isCalculating}
            className="w-full min-h-[44px] text-base font-medium"
          >
            {isCalculating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('dosha.calculating')}
              </>
            ) : (
              t('dosha.calculateButton')
            )}
          </Button>
        </form>
        </CardContent>
        </CollapsibleContent>
      </Collapsible>
      </Card>

      {doshaResults && (
        <DoshaResults
          summary={doshaResults.summary}
          details={doshaResults.details}
          calculationId={calculationId}
        />
      )}
    </>
  );
};

export default DoshaCalculator;
