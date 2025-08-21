import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

export default function LanguageToggle() {
  const { i18n, t } = useTranslation();
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
    
    i18n.changeLanguage(next);
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <Button 
        id="language-toggle-btn" 
        variant="secondary" 
        size="sm" 
        onClick={toggle} 
        className="gap-2"
        data-gtm-button-id="language-toggle-btn"
        data-gtm-button-type="language-toggle"
      >
        <Globe className="h-4 w-4" />
        {isHindi ? t('common.switchToEnglish') : t('common.switchToHindi')}
      </Button>
    </div>
  );
}
