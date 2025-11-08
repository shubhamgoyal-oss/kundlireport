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

// Form validation schema
const birthInputSchema = z.object({
  name: z.string().max(100, "Name must be less than 100 characters").optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:MM)").optional(),
  unknownTime: z.boolean().default(false),
  place: z.string().min(1, "Birth place is required"),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  tz: z.string().min(1, "Time zone is required"),
  chartStyle: z.enum(["north", "south"]).default("north").optional(),
});

type BirthInput = z.infer<typeof birthInputSchema>;

interface DoshaCalculatorProps {
  onCalculate?: (data: BirthInput) => void;
}

const DoshaCalculator = ({ onCalculate }: DoshaCalculatorProps) => {
  const [placeSearchResults, setPlaceSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [doshaResults, setDoshaResults] = useState<any>(null);

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

  // Debounced place search
  const handlePlaceSearch = async (searchTerm: string) => {
    if (searchTerm.length < 3) {
      setPlaceSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPlaces(searchTerm);

      const inIndiaBounds = (p: Place) =>
        p.lat >= 8.0667 && p.lat <= 37.1 && p.lon >= 68.1167 && p.lon <= 97.4167;

      let filtered = results;
      if (searchTerm.length <= 5) {
        // Strictly show only within India's bounding box for short inputs
        filtered = results.filter(inIndiaBounds);
      }

      // Prefer India country results
      const indiaOnly = filtered.filter((p) => p.address?.country?.toLowerCase() === 'india');
      const finalResults = searchTerm.length <= 5 ? filtered : (indiaOnly.length > 0 ? indiaOnly : filtered);

      setPlaceSearchResults(finalResults);
      setShowPlaceResults(true);
    } catch (error) {
      console.error('Place search error:', error);
      toast.error('Failed to search places. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlaceSelect = async (place: Place) => {
    setValue('place', place.display_name);
    setValue('lat', place.lat);
    setValue('lon', place.lon);
    
    // Auto-detect time zone
    try {
      const timezone = await getTimeZoneForCoordinates(place.lat, place.lon);
      setValue('tz', timezone);
      toast.success(`Time zone detected: ${timezone}`);
    } catch (error) {
      console.error('Time zone detection error:', error);
      toast.error('Could not auto-detect time zone. Please verify manually.');
      setValue('tz', 'Asia/Kolkata'); // Default fallback
    }
    
    setShowPlaceResults(false);
    setPlaceSearchResults([]);
  };

  const onSubmit = async (data: BirthInput) => {
    if (!unknownTime && !data.time) {
      toast.error('Please enter birth time or mark it as unknown');
      return;
    }

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
      toast.success('Doshas calculated successfully!');
      
      // Store and display results
      setDoshaResults(result);
      
      if (onCalculate) {
        onCalculate(data);
      }
    } catch (error) {
      console.error('Calculation error:', error);
      toast.error('Failed to calculate doshas. Please try again.');
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
            Vedic Dosha Calculator
          </CardTitle>
          <CardDescription className="text-center sm:text-left text-base">
            Discover potential doshas in your birth chart based on classical Jyotish principles
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
            toast.success('Form refreshed');
          }}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="name">Name (Optional)</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Enter your name"
              className="bg-input"
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
              Date of Birth *
            </Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              className="bg-input"
              required
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
                Exact Time of Birth
              </Label>
              <div className="flex items-center gap-2">
                <Switch
                  id="unknownTime"
                  checked={unknownTime}
                  onCheckedChange={(checked) => setValue('unknownTime', checked)}
                />
                <Label htmlFor="unknownTime" className="text-sm text-muted-foreground cursor-pointer">
                  I don't know my birth time
                </Label>
              </div>
            </div>
            
            {!unknownTime && (
              <div className="relative">
                <Input
                  id="time"
                  type="time"
                  {...register('time')}
                  className="bg-input"
                  required={!unknownTime}
                />
                {!watch('time') && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 text-sm">
                    hh:mm AM/PM
                  </span>
                )}
              </div>
            )}
            
            {unknownTime && (
              <div className="p-3 bg-accent/20 border border-accent rounded-md">
                <p className="text-sm text-muted-foreground">
                  ⚠️ Without exact birth time, accuracy will be reduced. We'll run Moon-based checks only.
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
                Place of Birth *
              </Label>
              <span className="text-xs text-muted-foreground">Choose from suggested places</span>
            </div>
            <div className="relative">
              <Input
                id="place"
                {...register('place')}
                placeholder="Town, City, State"
                className="bg-input"
                onChange={(e) => handlePlaceSearch(e.target.value)}
                onFocus={() => placeSearchResults.length > 0 && setShowPlaceResults(true)}
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
                      className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b border-border last:border-b-0"
                    >
                      <p className="font-medium text-sm">{place.display_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Lat: {place.lat.toFixed(4)}, Lon: {place.lon.toFixed(4)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.place && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.place.message}
              </p>
            )}
          </div>

          {/* Coordinates and Time Zone Display */}
          {watch('lat') && watch('lon') && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-md">
              <div>
                <Label className="text-xs text-muted-foreground">Latitude</Label>
                <p className="font-mono text-sm">{watch('lat')?.toFixed(4)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Longitude</Label>
                <p className="font-mono text-sm">{watch('lon')?.toFixed(4)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Time Zone</Label>
                <p className="font-mono text-sm">{watch('tz') || 'Not detected'}</p>
              </div>
            </div>
          )}

          {/* Privacy Note */}
          <div className="p-4 bg-accent/10 border border-accent/30 rounded-md">
            <p className="text-sm text-muted-foreground">
              🔒 <strong>Privacy:</strong> We don't store your details server-side unless you generate a share link.
            </p>
          </div>

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
                Calculating...
              </>
            ) : (
              'Calculate My Doshas'
            )}
          </Button>

          {/* Disclaimer */}
          <p className="text-xs text-center text-muted-foreground">
            ⚠️ This is an educational tool based on classical Jyotish rules; not medical, legal, or financial advice.
          </p>
        </form>
      </CardContent>
    </Card>

    {/* Display Results */}
    {doshaResults && (
      <DoshaResults 
        summary={doshaResults.summary} 
        details={doshaResults.details} 
      />
    )}
  </>
  );
};

export default DoshaCalculator;
