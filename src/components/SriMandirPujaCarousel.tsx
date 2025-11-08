import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { SriMandirPuja, translateTitle, translateTempleName, formatScheduleDate } from '@/utils/sriMandirPujas';
import { trackEvent } from '@/lib/analytics';

interface SriMandirPujaCarouselProps {
  pujas: SriMandirPuja[];
  doshaType: string;
  autoPlayInterval?: number;
}

export const SriMandirPujaCarousel = ({ 
  pujas, 
  doshaType,
  autoPlayInterval = 5000 
}: SriMandirPujaCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const handleBookClick = (puja: SriMandirPuja) => {
    trackEvent('srimandir_puja_click', {
      metadata: {
        store_id: puja.store_id,
        pooja_title: puja.pooja_title,
        dosha: doshaType,
        schedule_date_ist: puja.schedule_date_ist,
      },
    });
  };

  if (pujas.length === 0) return null;

  const currentPuja = pujas[currentIndex];
  const translatedTitle = translateTitle(currentPuja.pooja_title);

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
                {puja.cover_media_url && (
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                    <img
                      src={puja.cover_media_url}
                      alt={translateTitle(puja.pooja_title)}
                      className="w-full h-full object-cover"
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
                      {translateTitle(puja.pooja_title)}
                    </h4>
                    
                    {/* Temple Name */}
                    {puja.temple_name && (
                      <p className="text-sm text-muted-foreground">
                        {translateTempleName(puja.temple_name)}
                      </p>
                    )}

                    {/* Date */}
                    {puja.schedule_date_ist && (
                      <p className="text-sm font-medium text-foreground">
                        {formatScheduleDate(puja.schedule_date_ist)}
                      </p>
                    )}
                    
                    {/* Price */}
                    {puja.individual_pack_price_inr > 0 && (
                      <p className="text-base font-semibold text-primary">
                        Starting from ₹{puja.individual_pack_price_inr}
                      </p>
                    )}

                    {/* Book Button */}
                    <Button
                      asChild
                      className="w-full"
                      onClick={() => handleBookClick(puja)}
                    >
                      <a href={puja.puja_link} target="_blank" rel="noopener noreferrer">
                        Book Puja
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    
                    <p className="text-xs text-center text-muted-foreground">Powered by Sri Mandir</p>
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
