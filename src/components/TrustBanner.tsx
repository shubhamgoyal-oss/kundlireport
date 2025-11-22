import { Users, MapPin, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TrustBanner() {
  const { t } = useTranslation();
  return (
    <div className="bg-orange-500 text-white py-2.5 sm:py-3 overflow-hidden">
      <div>
        <div className="flex whitespace-nowrap animate-banner-scroll text-xs sm:text-sm md:text-base">
          <span className="font-semibold mr-6 sm:mr-8 md:mr-12 flex items-center gap-1.5 sm:gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('trust.trust1')}
          </span>
          <span className="font-semibold mr-6 sm:mr-8 md:mr-12 flex items-center gap-1.5 sm:gap-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('trust.trust2')}
          </span>
          <span className="font-semibold mr-6 sm:mr-8 md:mr-12 flex items-center gap-1.5 sm:gap-2">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('trust.trust3')}
          </span>
          <span className="font-semibold mr-6 sm:mr-8 md:mr-12 flex items-center gap-1.5 sm:gap-2">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('trust.trust1')}
          </span>
          <span className="font-semibold mr-6 sm:mr-8 md:mr-12 flex items-center gap-1.5 sm:gap-2">
            <MapPin className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('trust.trust2')}
          </span>
          <span className="font-semibold mr-6 sm:mr-8 md:mr-12 flex items-center gap-1.5 sm:gap-2">
            <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
            {t('trust.trust3')}
          </span>
        </div>
      </div>
    </div>
  );
}