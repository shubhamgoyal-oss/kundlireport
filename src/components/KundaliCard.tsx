import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchKundaliSvg, BirthDetails, ChartType } from '@/utils/kundaliChart';

interface KundaliCardProps {
  birthDetails: BirthDetails;
}

export const KundaliCard: React.FC<KundaliCardProps> = ({ birthDetails }) => {
  const { i18n } = useTranslation();
  const [chartType, setChartType] = useState<ChartType>('North');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [svgString, setSvgString] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const isHindi = (i18n.language || '').toLowerCase().startsWith('hi');
  const language = isHindi ? 'hi' : 'en';

  const fetchChart = useCallback(async (type: ChartType) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setStatus('loading');
    setErrorMsg('');
    
    try {
      const svg = await fetchKundaliSvg({
        birthDetails,
        chartType: type,
        language,
        signal: controller.signal
      });
      
      if (!controller.signal.aborted) {
        setSvgString(svg);
        setStatus('success');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Ignore abort errors
      }
      console.error('[KundaliCard] Fetch error:', error);
      if (!controller.signal.aborted) {
        setErrorMsg(error.message || 'Failed to load chart');
        setStatus('error');
      }
    }
  }, [birthDetails, language]);

  // Fetch on mount and when chartType changes
  useEffect(() => {
    fetchChart(chartType);
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [chartType, fetchChart]);

  const handleChartTypeChange = (type: ChartType) => {
    if (type !== chartType) {
      setChartType(type);
    }
  };

  const handleRetry = () => {
    fetchChart(chartType);
  };

  return (
    <Card className="spiritual-glow border border-primary/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-bold">
          {isHindi ? 'आपकी कुंडली' : 'Your Kundali'}
        </CardTitle>
        
        {/* Chart Type Toggle */}
        <div className="flex gap-2 mt-3">
          <Button
            type="button"
            size="sm"
            variant={chartType === 'North' ? 'default' : 'outline'}
            className="rounded-full px-4"
            onClick={() => handleChartTypeChange('North')}
          >
            {isHindi ? 'उत्तर भारतीय' : 'North'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={chartType === 'South' ? 'default' : 'outline'}
            className="rounded-full px-4"
            onClick={() => handleChartTypeChange('South')}
          >
            {isHindi ? 'दक्षिण भारतीय' : 'South'}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="w-full max-w-[360px] mx-auto">
          {status === 'loading' && (
            <Skeleton className="w-full aspect-square rounded-lg" />
          )}
          
          {status === 'success' && svgString && (
            <div 
              className="w-full aspect-square"
              dangerouslySetInnerHTML={{ __html: svgString }}
            />
          )}
          
          {status === 'error' && (
            <div className="w-full aspect-square flex flex-col items-center justify-center bg-muted/30 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground mb-3">
                {isHindi ? 'कुंडली लोड नहीं हो सकी' : "Couldn't load Kundali image"}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                {isHindi ? 'पुनः प्रयास करें' : 'Retry'}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
