import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { SriMandirPuja, translateTitle, formatScheduleDate } from '@/utils/sriMandirPujas';
import { trackEvent } from '@/lib/analytics';

interface SriMandirPujaCarouselProps {
  pujas: SriMandirPuja[];
  doshaType: string;
  autoPlayInterval?: number;
}

export const SriMandirPujaCarousel = ({ 
  pujas, 
  doshaType,
  autoPlayInterval = 3000 
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
    <Card className="overflow-hidden">
      <div className="relative">
        {/* Image */}
        {currentPuja.cover_media_url && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={currentPuja.cover_media_url}
              alt={translatedTitle}
              className="w-full h-full object-cover"
            />
            
            {/* Navigation Arrows - Only show if more than 1 puja */}
            {pujas.length > 1 && (
              <>
                <button
                  onClick={handlePrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-lg transition-colors"
                  aria-label="Previous puja"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-lg transition-colors"
                  aria-label="Next puja"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}

            {/* Dots Indicator - Only show if more than 1 puja */}
            {pujas.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                {pujas.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 rounded-full transition-all ${
                      idx === currentIndex 
                        ? 'w-6 bg-primary' 
                        : 'w-2 bg-background/60 hover:bg-background/80'
                    }`}
                    aria-label={`Go to puja ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Details */}
        <div className="p-4 space-y-3">
          {/* Puja Title */}
          <h4 className="font-semibold text-base line-clamp-2">{translatedTitle}</h4>
          
          {/* Temple Name */}
          {currentPuja.temple_name && (
            <p className="text-sm text-muted-foreground">{currentPuja.temple_name}</p>
          )}
          
          {/* Price */}
          {currentPuja.individual_pack_price_inr > 0 && (
            <p className="text-base font-semibold text-primary">
              Starting from ₹{currentPuja.individual_pack_price_inr}
            </p>
          )}

          {/* Book Button */}
          <Button
            asChild
            className="w-full"
            onClick={() => handleBookClick(currentPuja)}
          >
            <a href={currentPuja.puja_link} target="_blank" rel="noopener noreferrer">
              Book Puja
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">Powered by Sri Mandir</p>
        </div>
      </div>
    </Card>
  );
};
