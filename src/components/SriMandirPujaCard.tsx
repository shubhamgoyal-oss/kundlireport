import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { SriMandirPuja, getPujaTitle, getTempleName, formatScheduleDate, getPujaLink } from '@/utils/sriMandirPujas';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';

interface SriMandirPujaCardProps {
  puja: SriMandirPuja;
  doshaType: string;
}

export const SriMandirPujaCard = ({ puja, doshaType }: SriMandirPujaCardProps) => {
  const { i18n, t } = useTranslation();
  const currentLang = i18n.language;
  const isHindi = currentLang?.toLowerCase().startsWith('hi');
  
  // Debug log to see what we're getting
  console.log('Puja title from CSV:', puja.pooja_title);
  console.log('Current language:', currentLang);
  const displayTitle = getPujaTitle(puja, currentLang);
  const displayTempleName = getTempleName(puja, currentLang);
  const formattedDate = formatScheduleDate(puja.schedule_date_ist, currentLang);
  const pujaLink = getPujaLink(puja, currentLang);
  
  console.log('Display title after translation:', displayTitle, 'Link used:', pujaLink);

  const handleBookClick = () => {
    trackEvent('srimandir_puja_click', {
      metadata: {
        store_id: puja.store_id,
        pooja_title: puja.pooja_title,
        dosha: doshaType,
        schedule_date_ist: puja.schedule_date_ist,
      },
    });
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Image */}
        {puja.cover_media_url && (
          <div className="w-full sm:w-48 h-48 sm:h-auto flex-shrink-0">
            <img
              src={puja.cover_media_url}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Details */}
        <div className="flex-1 p-4 space-y-2">
          <h4 className="font-semibold text-base line-clamp-2">{displayTitle}</h4>
          
          {puja.temple_name && (
            <p className="text-sm text-muted-foreground">{displayTempleName}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {puja.schedule_date_ist && (
              <span className="font-medium">
                {isHindi ? 'निर्धारित' : 'Scheduled'}: {formattedDate}
              </span>
            )}
            {puja.individual_pack_price_inr > 0 && (
              <span className="font-semibold text-primary">₹{puja.individual_pack_price_inr}</span>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Button
              asChild
              size="sm"
              className="w-full sm:w-auto"
              onClick={handleBookClick}
            >
              <a href={pujaLink} target="_blank" rel="noopener noreferrer">
                {isHindi ? 'पूजा बुक करें' : 'Book Puja'}
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">
              {isHindi ? 'श्री मंदिर द्वारा संचालित' : 'Powered by Sri Mandir'}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};
