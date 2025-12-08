import { useState, useEffect } from 'react';
import SolutionFinder from '@/components/SolutionFinder';
import DoshaCalculator from '@/components/DoshaCalculator';
import LanguageToggle from '@/components/LanguageToggle';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CircleDot, ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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

      {/* Language Toggle - renders as floating or static based on calculation state */}
      <LanguageToggle />

      {/* Hero Section - Mobile-first optimized */}
      <main className="flex-1">
  
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-7xl">
          <div className="flex flex-col items-center mx-auto max-w-2xl w-full">
            {/* Content */}
            <div className="space-y-6 sm:space-y-8 w-full">
              <div className="text-center">
              <div className="mb-6 sm:mb-8 space-y-1.5">
                  <img 
                    src="/lovable-uploads/c8bc8544-fa1e-4c93-ac7d-859753199a68.png" 
                    alt="Sri Mandir" 
                    className="h-12 sm:h-16 w-auto mx-auto"
                    width="277"
                    height="84"
                    fetchPriority="high"
                  />
                  <div className="text-[10px] sm:text-xs text-muted-foreground font-medium space-y-0.5">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-primary text-[8px]">✦</span>
                      <span>{t('trustBadge.tagline')}</span>
                    </div>
                    <div className="font-semibold text-foreground">{t('trustBadge.downloads')}</div>
                  </div>
                </div>
                
                {/* Hero Heading */}
                <div className="mb-4 sm:mb-6">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                    {t('dosha.heroTitle')}
                  </h1>
                </div>
                
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-4 sm:mb-6 px-2">
                  {t('dosha.heroSubtitle')}
                </p>

                {/* Learn the Basics - Collapsible FAQ */}
                <Collapsible className="mb-4 sm:mb-6">
                  <CollapsibleTrigger className="flex items-center justify-center gap-2 text-sm sm:text-base font-medium text-primary hover:text-primary/80 transition-colors group min-h-[44px]">
                    <span>{t('dosha.whatIsDosha')}</span>
                    <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-3 sm:mt-4 bg-card border border-border rounded-lg p-3 sm:p-4">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                          <AccordionTrigger className="text-sm sm:text-base font-medium text-left min-h-[44px]">
                            <span className="flex items-center gap-2">
                              <CircleDot className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                              <span className="text-left">{t('dosha.whatIsDosha')}</span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="text-sm sm:text-base text-muted-foreground">
                            {t('dosha.whatIsDoshaAnswer')}
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="item-2">
                          <AccordionTrigger className="text-sm sm:text-base font-medium text-left min-h-[44px]">
                            <span className="flex items-center gap-2">
                              <CircleDot className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                              <span className="text-left">{t('dosha.whyImportant')}</span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="text-sm sm:text-base text-muted-foreground">
                            {t('dosha.whyImportantAnswer')}
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="item-3">
                          <AccordionTrigger className="text-sm sm:text-base font-medium text-left min-h-[44px]">
                            <span className="flex items-center gap-2">
                              <CircleDot className="w-4 h-4 text-primary flex-shrink-0" strokeWidth={1.5} />
                              <span className="text-left">{t('dosha.howImpact')}</span>
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="text-sm sm:text-base text-muted-foreground">
                            {t('dosha.howImpactAnswer')}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Dosha Calculator Card - Replaces the CTA Button */}
              <div className="w-full">
                <DoshaCalculator />
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
