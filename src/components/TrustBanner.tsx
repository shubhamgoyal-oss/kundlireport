import { Users, MapPin, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function TrustBanner() {
  const { t } = useTranslation();
  return (
    <div className="bg-orange-500 text-white py-3 overflow-hidden">
      <div>
        <div className="flex whitespace-nowrap animate-banner-scroll text-sm sm:text-base md:text-lg">
          <span className="font-semibold mr-8 sm:mr-12 md:mr-16 flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('trust.trust1')}
          </span>
          <span className="font-semibold mr-8 sm:mr-12 md:mr-16 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('trust.trust2')}
          </span>
          <span className="font-semibold mr-8 sm:mr-12 md:mr-16 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('trust.trust3')}
          </span>
          <span className="font-semibold mr-8 sm:mr-12 md:mr-16 flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('trust.trust1')}
          </span>
          <span className="font-semibold mr-8 sm:mr-12 md:mr-16 flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {t('trust.trust2')}
          </span>
          <span className="font-semibold mr-8 sm:mr-12 md:mr-16 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('trust.trust3')}
          </span>
        </div>
      </div>
    </div>
  );
}