import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Clock, MapPin, Loader2, AlertCircle, RotateCcw, Edit, User, HelpCircle, ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { DoshaResults } from './DoshaResults';
import { DateOfBirthPicker } from './DateOfBirthPicker';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { trackEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';
import { SriMandirPujaCarousel } from '@/components/SriMandirPujaCarousel';
import { fetchSriMandirPujas, getUpcomingPujas, SriMandirPuja } from '@/utils/sriMandirPujas';

// Form validation schema - name is mandatory
const birthInputSchema = z
  .object({
    problemArea: z.string().max(500, "Maximum 500 characters allowed").optional(),
    name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
    gender: z.enum(["M", "F"], { required_error: "Gender is required" }),
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
  const { predictions, isSearching: isGoogleSearching, searchPlaces: searchGooglePlaces, getPlaceDetails, clearPredictions } = useGooglePlacesAutocomplete();
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [doshaResults, setDoshaResults] = useState<any>(null);
  const [calculationId, setCalculationId] = useState<string | null>(null);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(-1);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [pujas, setPujas] = useState<SriMandirPuja[]>([]);
  const [isLoadingPujas, setIsLoadingPujas] = useState(true);
  const isHindi = (i18n.language ? i18n.language.toLowerCase() : '').startsWith('hi');
  
  // Track which fields have been tracked this session to avoid duplicates
  const [trackedFields, setTrackedFields] = useState<Set<string>>(new Set());
  
  // Load pujas on mount
  useEffect(() => {
    const loadPujas = async () => {
      setIsLoadingPujas(true);
      const allPujas = await fetchSriMandirPujas();
      setPujas(allPujas);
      setIsLoadingPujas(false);
    };
    loadPujas();
  }, []);

  const trackFieldFilled = (field: string) => {
    if (!trackedFields.has(field)) {
      console.log(`[Analytics] Tracking form_field_filled: ${field}`);
      trackEvent('form_field_filled', { 
        page: 'home',
        metadata: { field } 
      });
      setTrackedFields(prev => new Set(prev).add(field));
    }
  };

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
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherProblemText, setOtherProblemText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Problem area options for MCQ
  const problemOptions = [
    { id: 'marriage', en: 'I am facing delays in marriage', hi: 'मेरी शादी में देरी हो रही है' },
    { id: 'financial', en: 'I am facing financial hardships', hi: 'मुझे आर्थिक कठिनाइयों का सामना करना पड़ रहा है' },
    { id: 'career', en: 'I am facing challenges in my career/job', hi: 'मुझे करियर/नौकरी में चुनौतियों का सामना करना पड़ रहा है' },
    { id: 'health', en: 'I am facing health issues', hi: 'मुझे स्वास्थ्य समस्याएं हैं' },
    { id: 'business', en: 'I am facing challenges in my business', hi: 'मुझे व्यापार में चुनौतियों का सामना करना पड़ रहा है' },
    { id: 'other', en: 'Other', hi: 'अन्य' },
  ];
  
  // Update form value when selections change
  useEffect(() => {
    const isHindi = i18n.language?.startsWith('hi');
    const selectedTexts = selectedProblems
      .filter(id => id !== 'other')
      .map(id => {
        const option = problemOptions.find(o => o.id === id);
        return option ? (isHindi ? option.hi : option.en) : '';
      })
      .filter(Boolean);
    
    if (showOtherInput && otherProblemText.trim()) {
      selectedTexts.push(otherProblemText.trim());
    }
    
    setValue('problemArea', selectedTexts.join('; '));
    if (selectedTexts.length > 0) {
      trackFieldFilled('problemArea');
    }
  }, [selectedProblems, otherProblemText, showOtherInput]);
  
  const toggleProblem = (id: string) => {
    if (id === 'other') {
      setShowOtherInput(!showOtherInput);
      if (!showOtherInput) {
        setSelectedProblems(prev => [...prev.filter(p => p !== 'other'), 'other']);
        // Close dropdown immediately so text input is visible
        setIsDropdownOpen(false);
      } else {
        setSelectedProblems(prev => prev.filter(p => p !== 'other'));
        setOtherProblemText('');
      }
    } else {
      setSelectedProblems(prev => 
        prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
      );
    }
  };
  
  const getSelectedDisplayText = () => {
    const isHindi = i18n.language?.startsWith('hi');
    const count = selectedProblems.filter(id => id !== 'other').length + (showOtherInput && otherProblemText ? 1 : 0);
    if (count === 0 && !showOtherInput) {
      return t('dosha.selectProblems', 'Select your problems');
    }
    if (count === 1 && !showOtherInput) {
      const option = problemOptions.find(o => o.id === selectedProblems[0]);
      return option ? (isHindi ? option.hi : option.en) : '';
    }
    return t('dosha.problemsSelected', '{{count}} problems selected', { count });
  };

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
      await searchGooglePlaces(searchTerm);
      setShowPlaceResults(true);
      setSelectedPlaceIndex(-1);
    }, 300);

    setSearchTimer(timer);
  };

  const handlePlaceSelect = async (placeId: string, displayName: string) => {
    // Get detailed place info including coordinates
    const details = await getPlaceDetails(placeId);
    
    if (details) {
      setValue('place', details.display_name);
      setValue('lat', details.lat);
      setValue('lon', details.lng);
      setValue('tz', 'Asia/Kolkata');
      
      toast.success(t('dosha.locationSelected'));
      
      // Track form field filled for place
      trackFieldFilled('place');
    } else {
      // Fallback if details fetch fails
      setValue('place', displayName);
      toast.error(t('dosha.locationError', 'Could not get location coordinates. Please try again.'));
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
        setSelectedPlaceIndex(prev => 
          prev < predictions.length - 1 ? prev + 1 : prev
        );
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
    const submissionData = {
      ...data,
      name: data.name.trim(),
      gender: data.gender,
    };
    
    // Start tracking scroll events after calculation starts
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('track_post_calculation_scroll', 'true');
      sessionStorage.setItem('calculation_start_time', Date.now().toString());
    }
    
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
      
      // Mark calculation as done for floating language toggle
      sessionStorage.setItem('dosha_calculated', 'true');
      
      toast.success(t('dosha.calculationSuccess'));
      
      // Track successful calculation
      trackEvent('dosha_calculate', {
        metadata: {
          calculation_id: (normalized as any).calculationId,
          place: submissionData.place,
          date: submissionData.date,
          hasTime: !submissionData.unknownTime,
          doshas_found: {
            mangal: normalized.summary?.mangal,
            kaalSarp: normalized.summary?.kaalSarp,
            pitra: normalized.summary?.pitra,
            shaniSadeSati: normalized.summary?.shaniSadeSati
          }
        }
      });
      
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
          </div>
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
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="p-4 sm:p-6">
        <form onSubmit={handleSubmit(onSubmit, (errs) => {
          console.log('[Form] Validation errors:', errs);
          const msg = (errs.place?.message as string)
            || (errs.time?.message as string)
            || (errs.date?.message as string)
            || (Object.values(errs)[0]?.message as string)
            || t('dosha.formError', 'Please correct the highlighted fields');
          toast.error(msg);
        })} className="space-y-4 sm:space-y-6">

          {/* Problem Area - Multi-Select Dropdown */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm sm:text-base font-medium">
              <HelpCircle className="w-4 h-4 flex-shrink-0" />
              {t('dosha.problemAreaLabel', 'Which is the biggest problem area of your life?')}
            </Label>
            
            <div className="relative" ref={dropdownRef}>
              {/* Dropdown Trigger */}
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full min-h-[44px] px-3 py-2 text-left bg-input border border-input rounded-md flex items-center justify-between hover:bg-accent/50 transition-colors"
              >
                <span className={`text-sm ${selectedProblems.length === 0 && !showOtherInput ? 'text-muted-foreground' : ''}`}>
                  {getSelectedDisplayText()}
                </span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu - Fixed position on mobile */}
              {isDropdownOpen && (
                <>
                  {/* Backdrop for mobile */}
                  <div 
                    className="fixed inset-0 bg-black/30 z-40 sm:hidden"
                    onClick={() => setIsDropdownOpen(false)}
                  />
                  <div className="fixed sm:absolute left-4 right-4 sm:left-0 sm:right-0 bottom-4 sm:bottom-auto sm:mt-1 z-50 bg-card border border-border rounded-lg shadow-xl sm:w-full">
                    <div className="max-h-[60vh] sm:max-h-64 overflow-y-auto">
                      {problemOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-center gap-3 px-4 py-4 sm:py-3 cursor-pointer hover:bg-accent/50 transition-colors border-b border-border last:border-0 ${
                            selectedProblems.includes(option.id) || (option.id === 'other' && showOtherInput)
                              ? 'bg-primary/5'
                              : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={option.id === 'other' ? showOtherInput : selectedProblems.includes(option.id)}
                            onChange={() => toggleProblem(option.id)}
                            className="w-5 h-5 sm:w-4 sm:h-4 accent-primary rounded"
                          />
                          <span className="text-base sm:text-sm">
                            {i18n.language?.startsWith('hi') ? option.hi : option.en}
                          </span>
                        </label>
                      ))}
                    </div>
                    {/* Done Button */}
                    <div className="p-3 border-t border-border bg-muted/30">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full py-3 sm:py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        {i18n.language?.startsWith('hi') ? 'पूर्ण' : 'Done'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Selected Tags */}
            {(selectedProblems.length > 0 || showOtherInput) && (
              <div className="flex flex-wrap gap-2">
                {selectedProblems.filter(id => id !== 'other').map((id) => {
                  const option = problemOptions.find(o => o.id === id);
                  if (!option) return null;
                  const text = i18n.language?.startsWith('hi') ? option.hi : option.en;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                    >
                      {text.length > 30 ? text.substring(0, 30) + '...' : text}
                      <button
                        type="button"
                        onClick={() => toggleProblem(id)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            
            {/* Other input field */}
            {showOtherInput && (
              <div className="mt-2">
                <Input
                  type="text"
                  value={otherProblemText}
                  onChange={(e) => setOtherProblemText(e.target.value)}
                  placeholder={t('dosha.problemAreaOtherPlaceholder', 'Please describe your problem')}
                  className="bg-input min-h-[44px] text-base"
                  maxLength={100}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dosha.problemAreaHint', 'Max 100 characters')}
                </p>
              </div>
            )}
            
            {errors.problemArea && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.problemArea.message}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2 text-sm sm:text-base">
              <User className="w-4 h-4 flex-shrink-0" />
              {t('dosha.name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              type="text"
              {...register('name', {
                onChange: (e) => {
                  if (e.target.value) {
                    trackFieldFilled('name');
                  }
                }
              })}
              placeholder={t('dosha.enterName')}
              className="bg-input min-h-[44px] text-base"
              required
              maxLength={100}
            />
            {errors.name && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm sm:text-base">
              <User className="w-4 h-4 flex-shrink-0" />
              {t('dosha.gender', 'Gender')} <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="M"
                  {...register('gender')}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">{t('dosha.male', 'Male')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="F"
                  {...register('gender')}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">{t('dosha.female', 'Female')}</span>
              </label>
            </div>
            {errors.gender && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.gender.message}
              </p>
            )}
          </div>

          {/* Date of Birth */}
          <DateOfBirthPicker
            value={watch('date')}
            onChange={(date) => {
              setValue('date', date);
              trackFieldFilled('date');
            }}
            error={errors.date?.message}
          />

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

            {unknownTime && (
              <div className="p-3 bg-accent/30 border border-primary/40 rounded-md mb-2">
                <p className="text-sm text-foreground">
                  {t('dosha.unknownTimeWarning')}
                </p>
              </div>
            )}

            {!unknownTime && (
              <>
                <Input
                  id="time"
                  type="time"
                  {...register('time', {
                    onChange: (e) => {
                      if (e.target.value) {
                        trackFieldFilled('time');
                      }
                    }
                  })}
                  className="bg-input min-h-[44px] text-base"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  {t('dosha.timeFormat')}
                </p>
              </>
            )}
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
            
            {showPlaceResults && predictions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {predictions.map((prediction, index) => (
                  <button
                    key={prediction.place_id}
                    type="button"
                    className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                      index === selectedPlaceIndex ? 'bg-accent' : ''
                    }`}
                    onClick={() => handlePlaceSelect(prediction.place_id, prediction.description)}
                  >
                    <div className="text-sm font-medium">{prediction.structured_formatting.main_text}</div>
                    <div className="text-xs text-muted-foreground">{prediction.structured_formatting.secondary_text}</div>
                  </button>
                ))}
              </div>
            )}
            
            {isGoogleSearching && (
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
          problemArea={watch('problemArea')}
          dateOfBirth={watch('date')}
        />
      )}

      {/* Always visible Sri Mandir Puja Remedies */}
      {pujas.length > 0 && (
        <div className="mt-8 space-y-4 w-full max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold gradient-spiritual bg-clip-text text-transparent">
              {isHindi ? 'श्री मंदिर द्वारा पूजा उपाय' : 'Sri Mandir Puja Remedies'}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {isHindi ? 'अपने दोषों के लिए प्रभावी पूजा उपाय देखें' : 'Explore effective puja remedies for your doshas'}
            </p>
          </div>
          <SriMandirPujaCarousel pujas={getUpcomingPujas(pujas, 10)} doshaType="all" />
        </div>
      )}
    </>
  );
};

export default DoshaCalculator;
