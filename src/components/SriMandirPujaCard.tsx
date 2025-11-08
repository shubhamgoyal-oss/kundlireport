import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { SriMandirPuja, translateTitle, formatScheduleDate } from '@/utils/sriMandirPujas';
import { trackEvent } from '@/lib/analytics';

interface SriMandirPujaCardProps {
  puja: SriMandirPuja;
  doshaType: string;
}

export const SriMandirPujaCard = ({ puja, doshaType }: SriMandirPujaCardProps) => {
  const translatedTitle = translateTitle(puja.pooja_title);
  const formattedDate = formatScheduleDate(puja.schedule_date_ist);

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
          <div className="w-full sm:w-40 h-40 sm:h-auto flex-shrink-0">
            <img
              src={puja.cover_media_url}
              alt={translatedTitle}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Details */}
        <div className="flex-1 p-4 space-y-2">
          <h4 className="font-semibold text-base line-clamp-2">{translatedTitle}</h4>
          
          {puja.temple_name && (
            <p className="text-sm text-muted-foreground">{puja.temple_name}</p>
          )}
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {puja.schedule_date_ist && (
              <span className="font-medium">Scheduled: {formattedDate}</span>
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
              <a href={puja.puja_link} target="_blank" rel="noopener noreferrer">
                Book Puja
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="text-xs text-muted-foreground">Powered by Sri Mandir</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
