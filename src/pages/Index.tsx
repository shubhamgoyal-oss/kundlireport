import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import SolutionFinder from '@/components/SolutionFinder';
import DoshaCalculator from '@/components/DoshaCalculator';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import ReviewTiles from '@/components/ReviewTiles';
import TrustBanner from '@/components/TrustBanner';
import Footer from '@/components/Footer';

const Index = () => {
  const [isSolutionFinderOpen, setIsSolutionFinderOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    trackEvent('page_view', { page: 'home' });
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* Hero Section - Medium.com inspired layout */}
      <main className="flex-1">
  
        <div className="container mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="text-center lg:text-left">
                <div className="mb-8">
                  <img 
                    src="/lovable-uploads/c8bc8544-fa1e-4c93-ac7d-859753199a68.png" 
                    alt="Sri Mandir" 
                    className="h-20 w-auto mx-auto lg:mx-0"
                  />
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground mb-6">
                  {t('index.heroTitlePart1')}
                  <span className="gradient-spiritual bg-clip-text text-transparent block">
                    {t('index.heroTitlePart2')}
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  {t('index.heroSubtitle')}
                </p>
              </div>

              {/* Dosha Calculator Card - Replaces the CTA Button */}
              <div className="w-full">
                <DoshaCalculator
                  onCalculate={(data) => {
                    trackEvent('dosha_calculate', { 
                      page: 'home',
                      metadata: {
                        hasTime: !data.unknownTime,
                        place: data.place 
                      }
                    });
                  }}
                />
              </div>

              {/* Optional: Keep Solution Finder as secondary option */}
              <Button
                id="solution-finder-cta-btn"
                onClick={() => { 
                  if (typeof window !== 'undefined' && (window as any).dataLayer) {
                    (window as any).dataLayer.push({
                      event: 'solution_finder_cta_click',
                      buttonId: 'solution-finder-cta-btn',
                      buttonType: 'secondary-cta',
                      page: 'home'
                    });
                  }
                  trackEvent('cta_my_solution_finder_click', { page: 'home' }); 
                  setIsSolutionFinderOpen(true); 
                }}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto group border-primary/50 hover:border-primary"
                data-gtm-button-id="solution-finder-cta-btn"
                data-gtm-button-type="secondary-cta"
                data-gtm-page="home"
              >
                <span className="flex items-center gap-2">
                  <span>{t('index.cta')}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </span>
              </Button>
            </div>

            {/* Right Image */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md lg:max-w-lg">
                <img 
                  src="/lovable-uploads/5cbf3c9a-c161-4411-bb68-f5d06531bbd9.png"
                  alt="Spiritual Devotee"
                  className="w-full h-auto rounded-2xl shadow-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-2xl"></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Trust Banner */}
      <TrustBanner />

      {/* Reviews Section */}
      <ReviewTiles />

      {/* Footer */}
      <Footer />

      {/* Solution Finder Modal */}
      <SolutionFinder 
        isOpen={isSolutionFinderOpen}
        onClose={() => setIsSolutionFinderOpen(false)}
      />
    </div>
  );
};

export default Index;
