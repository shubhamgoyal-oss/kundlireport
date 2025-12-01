import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { SriMandirPuja, getPujaTitle, getTempleName, formatScheduleDate, getPujaLink } from '@/utils/sriMandirPujas';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';

interface DoshaPujaItem {
  dosha: {
    type: string;
    label: string;
  };
  puja: SriMandirPuja;
  isOtherDosha: boolean;
}

interface DoshaPujaCarouselProps {
  items: DoshaPujaItem[];
  autoPlayInterval?: number;
  onBookPujaClick?: (doshaType: string) => void | Promise<void>;
}

export const DoshaPujaCarousel = ({ 
  items, 
  autoPlayInterval = 5000,
  onBookPujaClick
}: DoshaPujaCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { t, i18n } = useTranslation();
  const isHindi = (i18n.language ? i18n.language.toLowerCase() : '').startsWith('hi');

  useEffect(() => {
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [items.length, autoPlayInterval]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleBookClick = async (item: DoshaPujaItem) => {
    trackEvent('srimandir_puja_click', {
      metadata: {
        store_id: item.puja.store_id,
        pooja_title: item.puja.pooja_title,
        dosha: item.dosha.type,
        schedule_date_ist: item.puja.schedule_date_ist,
      },
    });
    
    if (onBookPujaClick) {
      await onBookPujaClick(item.dosha.type);
    }
  };

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="text-center space-y-3">
        <h3 className="text-xl font-semibold">
          {isHindi ? 'आपके लिए उपाय' : 'Remedies For You'}
        </h3>
        <div className="p-3 bg-accent/10 rounded-md border border-accent/30">
          <p className="text-sm font-medium">
            {isHindi 
              ? '🪔 वैदिक ऑनलाइन पूजा इन दोषों के नकारात्मक प्रभावों को कम करने का एक शक्तिशाली तरीका है।'
              : '🪔 Vedic online puja offers a powerful way to reduce the negative effects of these doshas.'}
          </p>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative w-full max-w-md mx-auto pb-6" style={{ perspective: '1000px' }}>
        <div className="relative" style={{ minHeight: '550px' }}>
          {[0, 1, 2].map((stackIdx) => {
            const itemIndex = (currentIndex + stackIdx) % items.length;
            const item = items[itemIndex];
            if (!item) return null;
            
            const isActive = stackIdx === 0;
            const offset = stackIdx * 8;
            const scale = 1 - stackIdx * 0.04;
            
            return (
              <Card 
                key={`${item.dosha.type}-${stackIdx}`}
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
                  {/* Dosha Label */}
                  {isActive && (
                    <div className="p-4 pb-2 bg-gradient-to-r from-primary/10 to-accent/10 border-b-2 border-primary">
                      <p className="font-bold text-base text-foreground text-center">
                        {isHindi ? 'इसके लिए:' : 'For:'} {item.dosha.label}
                      </p>
                    </div>
                  )}

                  {/* Image */}
                  {item.puja.cover_media_url && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                      <img
                        src={item.puja.cover_media_url}
                        alt={getPujaTitle(item.puja, i18n.language)}
                        className="w-full h-full object-contain"
                      />
                      
                      {/* Navigation Arrows - Only show on active card if more than 1 item */}
                      {isActive && items.length > 1 && (
                        <>
                          <button
                            onClick={handlePrevious}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-lg transition-colors z-20"
                            aria-label="Previous remedy"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handleNext}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 shadow-lg transition-colors z-20"
                            aria-label="Next remedy"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      )}

                      {/* Dots Indicator - Only show on active card if more than 1 item */}
                      {isActive && items.length > 1 && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                          {items.map((_, dotIdx) => (
                            <button
                              key={dotIdx}
                              onClick={() => setCurrentIndex(dotIdx)}
                              className={`h-2 rounded-full transition-all ${
                                dotIdx === currentIndex 
                                  ? 'w-6 bg-primary' 
                                  : 'w-2 bg-background/60 hover:bg-background/80'
                              }`}
                              aria-label={`Go to remedy ${dotIdx + 1}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Details - Only show on active card */}
                  {isActive && (
                    <div className="p-4 space-y-3">
                      {/* Other Dosha Message */}
                      {item.isOtherDosha && (
                        <div className="p-3 bg-accent/10 rounded-md border border-accent/30">
                          <p className="text-xs text-muted-foreground italic">
                            {isHindi 
                              ? 'इस दोष के लिए अभी हमारे पास विशिष्ट पूजा उपलब्ध नहीं है, लेकिन समग्र कल्याण के लिए नवग्रह शांति पूजा करवाएं।'
                              : "We don't have specific pujas for this dosha yet, but you can perform Navagraha Shanti Puja for overall well-being."}
                          </p>
                        </div>
                      )}

                      {/* Puja Title */}
                      <h4 className="font-semibold text-base line-clamp-2">
                        {getPujaTitle(item.puja, i18n.language)}
                      </h4>
                      
                      {/* Temple Name */}
                      {item.puja.temple_name && (
                        <p className="text-sm text-muted-foreground">
                          {getTempleName(item.puja, i18n.language)}
                        </p>
                      )}

                      {/* Date */}
                      {item.puja.schedule_date_ist && (
                        <p className="text-sm font-medium text-foreground">
                          {formatScheduleDate(item.puja.schedule_date_ist, i18n.language)}
                        </p>
                      )}

                      {/* Book Button */}
                      <Button
                        asChild
                        size="lg"
                        className="w-full h-14 text-lg font-bold"
                        onClick={() => handleBookClick(item)}
                      >
                        <a href={getPujaLink(item.puja, i18n.language)} target="_blank" rel="noopener noreferrer">
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
    </div>
  );
};
