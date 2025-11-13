import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, MapPin, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { searchPlaces, type Place } from '@/utils/geocoding';
import { getTimeZoneForCoordinates } from '@/utils/timezone';
import DoshaResults from './DoshaResults';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

// Form validation schema
const birthInputSchema = z
  .object({
    name: z.string().max(100, "Name must be less than 100 characters").optional(),
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
    // If birth time is known and provided, validate format
    if (data.time && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.time)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time"],
        message: "Invalid time format (HH:MM)",
      });
    }

    // If birth time is known (unknownTime is false), time is required
    if (!data.unknownTime && (!data.time || data.time.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time"],
        message: "Time is required when birth time is known",
      });
    }

    // Require selecting a place result so lat/lon/tz are present
    if (data.place && (data.lat == null || data.lon == null || !data.tz)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["place"],
        message: "Please select a place from the dropdown list",
      });
    }
  });

type BirthInput = z.infer<typeof birthInputSchema>;

interface DoshaCalculatorProps {
  onCalculate?: (data: BirthInput) => void;
}

const DoshaCalculator = ({ onCalculate }: DoshaCalculatorProps) => {
  const { t } = useTranslation();
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [doshaResults, setDoshaResults] = useState<any>(null);
  const [calculationId, setCalculationId] = useState<string | null>(null);
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(-1);
  const [searchError, setSearchError] = useState<string | null>(null);

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
  
  // Debounced search timer
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  // Debounced place search (350ms)
  const handlePlaceSearch = (searchTerm: string) => {
    // Clear previous timer
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    if (searchTerm.length < 2) {
      setPlaceSearchResults([]);
      setSearchError(null);
      setShowPlaceResults(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    
    const timer = setTimeout(async () => {
      try {
        const results = await searchPlaces(searchTerm);
        
        if (results.length === 0) {
          // Show offline fallback
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
        setSearchError(error instanceof Error ? error.message : 'Search failed');
        
        // Show offline fallback on error
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
    setValue('tz', 'Asia/Kolkata'); // Default for India
    
    setShowPlaceResults(false);
    setPlaceSearchResults([]);
    setSelectedPlaceIndex(-1);
    
    toast.success(t('dosha.locationSelected'));
  };

  // Keyboard navigation for place results
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
    console.log('Form submitted with data:', data);
    
    // Track calculate button click
    trackEvent('calculate_dosha_clicked', {
      metadata: {
        hasTime: !data.unknownTime,
        place: data.place,
        date: data.date
      }
    });
    
    setIsCalculating(true);
    
    try {
      // Call the edge function to calculate chart
      const response = await fetch(
        'https://upqxbhzwqecaxfxgyxhe.supabase.co/functions/v1/calculate-dosha',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Calculation failed');
      }

      const result = await response.json();
      
      console.log('Dosha calculation result:', result);
      
      // Store and display results IMMEDIATELY (don't wait for DB save)
      setDoshaResults(result);
      toast.success(t('dosha.calculationSuccess'));
      
      // Save calculation to database asynchronously (non-blocking)
      const visitorId = localStorage.getItem('analytics_visitor_id') || 'unknown';
      const sessionId = localStorage.getItem('analytics_session_id') || 'unknown';
      
      // Helper function to convert status strings to boolean
      const isActive = (status?: string | boolean) => {
        if (typeof status === 'boolean') return status;
        const s = String(status || '').toLowerCase();
        return s === 'present' || s === 'active' || s === 'suggested';
      };
      
      // Non-blocking database save
      supabase.from('dosha_calculations').insert({
        visitor_id: visitorId,
        session_id: sessionId,
        name: data.name || '',
        date_of_birth: data.date,
        time_of_birth: data.time || '00:00',
        place_of_birth: data.place,
        latitude: data.lat || null,
        longitude: data.lon || null,
        mangal_dosha: isActive(result.summary?.mangal),
        kaal_sarp_dosha: isActive(result.summary?.kaalSarp),
        pitra_dosha: isActive(result.summary?.pitra),
        sade_sati: isActive(result.summary?.shaniSadeSati),
        grahan_dosha: isActive(result.summary?.grahan),
        shrapit_dosha: isActive(result.summary?.shrapit),
        guru_chandal_dosha: isActive(result.summary?.guruChandal),
        punarphoo_dosha: isActive(result.summary?.punarphoo),
        kemadruma_yoga: isActive(result.summary?.kemadruma),
        gandmool_dosha: isActive(result.summary?.gandmool),
        kalathra_dosha: isActive(result.summary?.kalathra),
        vish_daridra_yoga: isActive(result.summary?.vishDaridra),
        ketu_naga_dosha: isActive(result.summary?.ketuNaga),
        navagraha_umbrella: isActive(result.summary?.navagrahaUmbrella),
        calculation_results: result,
        book_puja_clicked: false,
      }).select().single().then(({ data: savedCalc, error }) => {
        if (error) {
          console.error('Failed to save calculation to database:', error);
        } else if (savedCalc) {
          setCalculationId(savedCalc.id);
          console.log('Calculation saved to database with ID:', savedCalc.id);
        }
      });
      
      if (onCalculate) {
        onCalculate(data);
      }
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error(t('dosha.calculationError'));
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto spiritual-glow">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="text-3xl font-bold text-center sm:text-left gradient-spiritual bg-clip-text text-transparent">
            {t('dosha.calculatorTitle')}
          </CardTitle>
          <CardDescription className="text-center sm:text-left text-base">
            {t('dosha.calculatorDesc')}
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-end sm:self-auto text-muted-foreground"
          onClick={() => {
            reset();
            setPlaceSearchResults([]);
            setShowPlaceResults(false);
            setDoshaResults(null);
            toast.success(t('dosha.formRefreshed'));
          }}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {t('dosha.refresh')}
        </Button>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit, (errs) => {
          const msg = (errs.place?.message as string)
            || (errs.time?.message as string)
            || (errs.date?.message as string)
            || (Object.values(errs)[0]?.message as string)
            || t('dosha.formError', 'Please correct the highlighted fields');
          toast.error(msg);
        })} className="space-y-6">
          {/* Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">{t('dosha.nameOptional')}</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder={t('dosha.enterName')}
              className="bg-input"
              onBlur={(e) => {
                if (e.target.value) {
                  trackEvent('form_field_filled', {
                    metadata: { field: 'name', value_length: e.target.value.length }
                  });
                }
              }}
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {t('dosha.dateOfBirth')} *
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="bg-input"
              required
              onBlur={(e) => {
                if (e.target.value) {
                  trackEvent('form_field_filled', {
                    metadata: { field: 'date', value: e.target.value }
                  });
                }
              }}
            />
            {errors.date && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.date.message}
              </p>
            )}
          </div>

          {/* Time of Birth with Unknown Toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {t('dosha.timeOfBirth')}
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="unknownTime"
                  checked={unknownTime}
                  onCheckedChange={(checked) => {
                    setValue('unknownTime', checked);
                    if (checked) {
                      trackEvent('unknown_time_toggled', {
                        metadata: { checked: true }
                      });
                    }
                  }}
                />
                <Label htmlFor="unknownTime" className="text-sm text-muted-foreground cursor-pointer">
                  {t('dosha.dontKnowTime')}
                </Label>
              </div>
            </div>
            
            {!unknownTime && (
              <>
                <Input
                  id="time"
                  type="time"
                  {...register('time')}
                  className="bg-input"
                  required={!unknownTime}
                  onBlur={(e) => {
                    if (e.target.value && !unknownTime) {
                      trackEvent('form_field_filled', {
                        metadata: { field: 'time', value: e.target.value }
                      });
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('dosha.timeFormat')}</p>
              </>
            )}
            
            {unknownTime && (
              <div className="p-3 bg-accent/20 border border-accent rounded-md">
                <p className="text-sm text-muted-foreground">
                  {t('dosha.unknownTimeWarning')}
                </p>
              </div>
            )}
            
            {errors.time && !unknownTime && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.time.message}
              </p>
            )}
          </div>

          {/* Place of Birth with Autocomplete */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="place" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('dosha.placeOfBirth')} *
              </Label>
              <span className="text-xs text-muted-foreground">{t('dosha.typeChars')}</span>
            </div>
            <div className="relative">
              <Input
                id="place"
                {...register('place')}
                placeholder={t('dosha.placePlaceholder')}
                className="bg-input"
                onChange={(e) => handlePlaceSearch(e.target.value)}
                onKeyDown={handlePlaceKeyDown}
                onFocus={() => placeSearchResults.length > 0 && setShowPlaceResults(true)}
                onBlur={(e) => {
                  setTimeout(() => setShowPlaceResults(false), 200);
                  if (e.target.value) {
                    trackEvent('form_field_filled', {
                      metadata: { field: 'place', value: e.target.value }
                    });
                  }
                }}
                required
                inputMode="text"
                autoComplete="off"
              />
              
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Place Search Results Dropdown */}
              {showPlaceResults && placeSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                  {placeSearchResults.map((place, index) => (
                    <button
                      key={`${place.lat}-${place.lon}-${index}`}
                      type="button"
                      onClick={() => handlePlaceSelect(place)}
                      className={`w-full px-4 py-3 text-left transition-colors border-b border-border last:border-b-0 ${
                        index === selectedPlaceIndex ? 'bg-accent' : 'hover:bg-accent/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm flex-1">{place.display_name}</p>
                        {place.confidence && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {place.confidence}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {place.lat.toFixed(4)}°N, {place.lon.toFixed(4)}°E
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {searchError && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ {searchError}
              </p>
            )}
            
            {errors.place && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.place.message}
              </p>
            )}
            
            <p className="text-[10px] text-muted-foreground">
              {t('dosha.privacyPlace')}
            </p>
          </div>

          {/* Coordinates and Time Zone Display - Hidden but kept for backend */}
          {watch('lat') && watch('lon') && (
            <div className="hidden">
              <div>
                <Label className="text-xs text-muted-foreground">{t('dosha.latitude')}</Label>
                <p className="font-mono text-sm">{watch('lat')?.toFixed(4)}°N</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('dosha.longitude')}</Label>
                <p className="font-mono text-sm">{watch('lon')?.toFixed(4)}°E</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('dosha.timeZone')}</Label>
                <p className="font-mono text-sm">{watch('tz') || 'Asia/Kolkata'}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full spiritual-glow bg-primary hover:bg-primary/90 text-white"
            disabled={isCalculating}
          >
            {isCalculating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('dosha.calculating')}
              </>
            ) : (
              t('dosha.calculateButton')
            )}
          </Button>

          {/* Disclaimer */}
          <p className="text-xs text-center text-muted-foreground">
            {t('dosha.disclaimer')}
          </p>
        </form>
      </CardContent>
    </Card>

    {/* Display Results */}
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
