import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import SolutionFinder from '@/components/SolutionFinder';
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
      </main>-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '194243889879467');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=194243889879467&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
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

              {/* Main CTA Button */}
              <Button
                onClick={() => { trackEvent('cta_my_solution_finder_click', { page: 'home' }); setIsSolutionFinderOpen(true); }}
                size="lg"
                className="spiritual-glow bg-primary hover:bg-primary/90 text-white hover:scale-105 transition-transform duration-200 text-base sm:text-lg px-6 sm:px-10 md:px-12 py-4 sm:py-6 md:py-8 h-auto rounded-full w-full sm:w-auto group"
              >
                <span className="flex flex-col items-center gap-1">
                  <span>{t('index.cta')}</span>
                  <span className="flex items-center gap-2 text-xs opacity-90">
                    <span>{t('index.clickHere')}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
                  </span>
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
