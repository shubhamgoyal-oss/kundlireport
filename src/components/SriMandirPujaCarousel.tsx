import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { SriMandirPuja, getPujaTitle, getTempleName, formatScheduleDate, getPujaLink, getCoverImageUrl } from '@/utils/sriMandirPujas';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';

interface SriMandirPujaCarouselProps {
  pujas: SriMandirPuja[];
  doshaType: string;
  autoPlayInterval?: number;
  calculationId?: string | null;
  onBookPujaClick?: () => void | Promise<void>;
}

export const SriMandirPujaCarousel = ({ 
  pujas, 
  doshaType,
  autoPlayInterval = 5000,
  calculationId,
  onBookPujaClick
}: SriMandirPujaCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasTrackedDisplay, setHasTrackedDisplay] = useState(false);

  // Track when puja remedies are displayed
  useEffect(() => {
    if (pujas.length > 0 && !hasTrackedDisplay) {
      trackEvent('puja_remedies_displayed', {
        metadata: {
          count: pujas.length,
          dosha_type: doshaType,
          puja_titles: pujas.map(puja => puja.pooja_title),
          calculation_id: calculationId
        }
      });
      setHasTrackedDisplay(true);
    }
  }, [pujas, hasTrackedDisplay, doshaType, calculationId]);

  useEffect(() => {
    if (pujas.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % pujas.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [pujas.length, autoPlayInterval]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + pujas.length) % pujas.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % pujas.length);
  };

  const handleBookClick = async (puja: SriMandirPuja) => {
    trackEvent('srimandir_puja_click', {
      metadata: {
        store_id: puja.store_id,
        pooja_title: puja.pooja_title,
        dosha: doshaType,
        schedule_date_ist: puja.schedule_date_ist,
      },
    });
    
    // Call the onBookPujaClick callback if provided
    if (onBookPujaClick) {
      await onBookPujaClick();
    }
  };

  if (pujas.length === 0) return null;

  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const isHindi = currentLang?.toLowerCase().startsWith('hi');
  const currentPuja = pujas[currentIndex];
  return (
    <div className="relative w-full max-w-md mx-auto pb-6" style={{ perspective: '1000px' }}>
      {/* Stacked cards effect - show current and next 2 cards */}
      <div className="relative" style={{ minHeight: '500px' }}>
        {[0, 1, 2].map((stackIdx) => {
          const pujaIndex = (currentIndex + stackIdx) % pujas.length;
          const puja = pujas[pujaIndex];
          if (!puja) return null;
          
          const isActive = stackIdx === 0;
          const offset = stackIdx * 8;
          const scale = 1 - stackIdx * 0.04;
          
          return (
            <Card 
              key={`${puja.store_id}-${stackIdx}`}
              className={`overflow-hidden transition-all duration-500 ${
                isActive ? 'relative z-10' : 'absolute top-0 left-0 right-0 pointer-events-none'
              }`}
              style={{
                transform: `translateY(${offset}px) scale(${scale})`,
                opacity: isActive ? 1 : 0.5,
                transformOrigin: 'top center',
              }}
            >
              <div className="relative">
                {/* Image */}
                {getCoverImageUrl(puja, currentLang) && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                    <img
                      src={getCoverImageUrl(puja, currentLang)}
                      alt={getPujaTitle(puja, currentLang)}
                      className="w-full h-full object-contain"
                    />
                    
                    {/* Navigation Arrows - Only show on active card if more than 1 puja */}
                    {isActive && pujas.length > 1 && (
                      <>
                        <button
                          onClick={handlePrevious}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-lg transition-colors z-20"
                          aria-label="Previous puja"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={handleNext}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-lg transition-colors z-20"
                          aria-label="Next puja"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}

                    {/* Dots Indicator - Only show on active card if more than 1 puja */}
                    {isActive && pujas.length > 1 && (
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                        {pujas.map((_, dotIdx) => (
                          <button
                            key={dotIdx}
                            onClick={() => setCurrentIndex(dotIdx)}
                            className={`h-2 rounded-full transition-all ${
                              dotIdx === currentIndex 
                                ? 'w-6 bg-primary' 
                                : 'w-2 bg-background/60 hover:bg-background/80'
                            }`}
                            aria-label={`Go to puja ${dotIdx + 1}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Details - Only show on active card */}
                {isActive && (
                  <div className="p-4 space-y-3">
                    {/* Puja Title */}
                    <h4 className="font-semibold text-base line-clamp-2">
                      {getPujaTitle(puja, currentLang)}
                    </h4>
                    
                    {/* Temple Name */}
                    {puja.temple_name && (
                      <p className="text-sm text-muted-foreground">
                        {getTempleName(puja, currentLang)}
                      </p>
                    )}

                    {/* Date */}
                    {puja.schedule_date_ist && (
                      <p className="text-sm font-medium text-foreground">
                        {formatScheduleDate(puja.schedule_date_ist, currentLang)}
                      </p>
                    )}

                    {/* Price */}
                    {puja.individual_pack_price_inr > 0 && (
                      <p className="text-sm font-semibold text-primary">
                        {isHindi ? '₹' : 'Starting from ₹'}{puja.individual_pack_price_inr}{isHindi ? ' से शुरू' : ''}
                      </p>
                    )}

                    {/* Book Button */}
                    <Button
                      asChild
                      size="lg"
                      className="w-full h-14 text-lg font-bold"
                      onClick={() => handleBookClick(puja)}
                    >
                      <a href={getPujaLink(puja, currentLang)} target="_blank" rel="noopener noreferrer">
                        {isHindi ? 'पूजा बुक करें' : 'Book Puja'}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    
                    <p className="text-xs text-center text-muted-foreground">{isHindi ? 'श्री मंदिर द्वारा संचालित' : 'Powered by Sri Mandir'}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
