import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import SolutionFinder from '@/components/SolutionFinder';
import DoshaCalculator from '@/components/DoshaCalculator';
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

      {/* Hero Section - Medium.com inspired layout */}
      <main className="flex-1">
  
        <div className="container mx-auto px-6 py-12 max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh] mx-auto">
            {/* Left Content */}
            <div className="space-y-8 mx-auto lg:mx-0 max-w-2xl w-full">
              <div className="text-center lg:text-left">
                <div className="mb-8">
                  <img 
                    src="/lovable-uploads/c8bc8544-fa1e-4c93-ac7d-859753199a68.png" 
                    alt="Sri Mandir" 
                    className="h-20 w-auto mx-auto lg:mx-0"
                  />
                </div>
                
                {/* Hero Heading with Icon */}
                <div className="flex items-center gap-3 mb-6 justify-center lg:justify-start">
                  <CircleDot className="w-8 h-8 text-primary opacity-70" strokeWidth={1.5} />
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground">
                    {t('dosha.heroTitle')}
                  </h1>
                </div>
                
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  {t('dosha.heroSubtitle')}
                </p>

                {/* Learn the Basics - Collapsible FAQ */}
                <Collapsible className="mb-6">
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors group">
                    <span>{t('dosha.whatIsDosha')}</span>
                    <ChevronDown className="w-4 h-4 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-4 bg-card border border-border rounded-lg p-4">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                          <AccordionTrigger className="text-sm font-medium">
                            <span className="flex items-center gap-2">
                              <CircleDot className="w-4 h-4 text-primary" strokeWidth={1.5} />
                              {t('dosha.whatIsDosha')}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground">
                            {t('dosha.whatIsDoshaAnswer')}
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="item-2">
                          <AccordionTrigger className="text-sm font-medium">
                            <span className="flex items-center gap-2">
                              <CircleDot className="w-4 h-4 text-primary" strokeWidth={1.5} />
                              {t('dosha.whyImportant')}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground">
                            {t('dosha.whyImportantAnswer')}
                          </AccordionContent>
                        </AccordionItem>
                        
                        <AccordionItem value="item-3">
                          <AccordionTrigger className="text-sm font-medium">
                            <span className="flex items-center gap-2">
                              <CircleDot className="w-4 h-4 text-primary" strokeWidth={1.5} />
                              {t('dosha.howImpact')}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="text-sm text-muted-foreground">
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
