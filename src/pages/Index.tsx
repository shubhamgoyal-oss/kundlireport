import { useState } from 'react';
import { Button } from '@/components/ui/button';
import SolutionFinder from '@/components/SolutionFinder';

import ReviewTiles from '@/components/ReviewTiles';
import TrustBanner from '@/components/TrustBanner';
import Footer from '@/components/Footer';

const Index = () => {
  const [isSolutionFinderOpen, setIsSolutionFinderOpen] = useState(false);
  

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
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground mb-6">
                  Find Your Perfect
                  <span className="gradient-spiritual bg-clip-text text-transparent block">
                    Spiritual Solution
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Get personalized puja recommendations to guide your spiritual practice.
                </p>
              </div>

              {/* Main CTA Button */}
              <Button
                onClick={() => setIsSolutionFinderOpen(true)}
                size="lg"
                className="spiritual-glow bg-primary hover:bg-primary/90 text-white hover:scale-105 transition-transform duration-200 text-xl px-12 py-8 h-auto rounded-full"
              >
                My Solution Finder
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
