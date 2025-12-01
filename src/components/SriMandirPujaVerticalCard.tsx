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
    
    // Ensure onBookClick completes before navigation
    if (onBookClick) {
      try {
        await onBookClick();
      } catch (err) {
        console.error('Error in onBookClick:', err);
      }
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="relative">
        {/* Image */}
        {puja.cover_media_url && (
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
            <img
              src={puja.cover_media_url}
              alt={displayTitle}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Details */}
        <div className="p-3 space-y-2">
          {/* Puja Title */}
          <h4 className="font-semibold text-sm line-clamp-2">
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

          {/* Book Button */}
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold"
            onClick={async (e) => {
              e.preventDefault();
              await handleBookClick();
              // Navigate after tracking completes
              window.open(pujaLink, '_blank', 'noopener,noreferrer');
            }}
          >
            {isHindi ? 'पूजा बुक करें' : 'Book Puja'}
            <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          
          <p className="text-[10px] text-center text-muted-foreground">
            {isHindi ? 'श्री मंदिर द्वारा संचालित' : 'Powered by Sri Mandir'}
          </p>
        </div>
      </div>
    </Card>
  );
};
