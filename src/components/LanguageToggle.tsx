import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams<{ lang: string }>();
  const isHindi = i18n.language?.startsWith('hi');

  const toggle = () => {
    const next = isHindi ? 'en' : 'hi';
    
    // Track GTM event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: `language_toggle_${next}_click`,
        buttonId: 'language-toggle-btn',
        language: next,
        buttonType: 'language-toggle'
      });
    }
    
    // Update URL with new language
    const pathWithoutLang = location.pathname.replace(/^\/(en|hi)/, '');
    navigate(`/${next}${pathWithoutLang}${location.search}`);
  };

  return (
    <Button 
      id="language-toggle-btn" 
      variant="secondary" 
      size="sm" 
      onClick={toggle} 
      className="gap-1.5 sm:gap-2 h-10 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
      data-gtm-button-id="language-toggle-btn"
      data-gtm-button-type="language-toggle"
    >
      <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      <span className="hidden xs:inline">{isHindi ? 'Switch to English' : 'हिंदी में बदलें'}</span>
      <span className="xs:hidden">{isHindi ? 'EN' : 'हिं'}</span>
    </Button>
  );
}
