import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { SriMandirPuja, getPujaTitle, getTempleName, formatScheduleDate, getPujaLink } from '@/utils/sriMandirPujas';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';

interface SriMandirPujaVerticalCardProps {
  puja: SriMandirPuja;
  doshaType: string;
  onBookClick?: () => void | Promise<void>;
}

export const SriMandirPujaVerticalCard = ({ puja, doshaType, onBookClick }: SriMandirPujaVerticalCardProps) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language;
  const isHindi = currentLang?.toLowerCase().startsWith('hi');
  
  const displayTitle = getPujaTitle(puja, currentLang);
  const displayTempleName = getTempleName(puja, currentLang);
  const formattedDate = formatScheduleDate(puja.schedule_date_ist, currentLang);
  const pujaLink = getPujaLink(puja, currentLang);

  const handleBookClick = async () => {
    trackEvent('srimandir_puja_click', {
      metadata: {
        store_id: puja.store_id,
        pooja_title: puja.pooja_title,
        dosha: doshaType,
        schedule_date_ist: puja.schedule_date_ist,
      },
    });
    
    if (onBookClick) {
      await onBookClick();
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {/* Image */}
        {puja.cover_media_url && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
            <img
              src={puja.cover_media_url}
              alt={displayTitle}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Details */}
        <div className="p-4 space-y-3">
          {/* Puja Title */}
          <h4 className="font-semibold text-base line-clamp-2">
            {displayTitle}
          </h4>
          
          {/* Temple Name */}
          {puja.temple_name && (
            <p className="text-sm text-muted-foreground">
              {displayTempleName}
            </p>
          )}

          {/* Date */}
          {puja.schedule_date_ist && (
            <p className="text-sm font-medium text-foreground">
              {formattedDate}
            </p>
          )}
          
          {/* Price */}
          {puja.individual_pack_price_inr > 0 && (
            <p className="text-base font-semibold text-primary">
              {isHindi ? '₹' : 'Starting from ₹'}{puja.individual_pack_price_inr}{isHindi ? ' से शुरू' : ''}
            </p>
          )}

          {/* Book Button */}
          <Button
            asChild
            className="w-full"
            onClick={handleBookClick}
          >
            <a href={pujaLink} target="_blank" rel="noopener noreferrer">
              {isHindi ? 'पूजा बुक करें' : 'Book Puja'}
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            {isHindi ? 'श्री मंदिर द्वारा संचालित' : 'Powered by Sri Mandir'}
          </p>
        </div>
      </div>
    </Card>
  );
};
