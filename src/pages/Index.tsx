import { useState } from 'react';
import { Button } from '@/components/ui/button';
import SolutionFinder from '@/components/SolutionFinder';
import LanguageSelector from '@/components/LanguageSelector';
import ReviewTiles from '@/components/ReviewTiles';

const Index = () => {
  const [isSolutionFinderOpen, setIsSolutionFinderOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo and Language Selector */}
      <header className="w-full p-6">
        <div className="flex items-center justify-between">
          <img 
            src="/lovable-uploads/3d7b9d6f-b1bc-4512-be16-d9dd2b31a265.png" 
            alt="Sri Mandir" 
            className="h-12 w-auto"
          />
          <LanguageSelector 
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        </div>
      </header>

      {/* Hero Section - Medium.com inspired layout */}
      <main className="flex-1">
        <div className="container mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
            {/* Left Content */}
            <div className="space-y-8">
              <div>
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


      {/* Reviews Section */}
      <ReviewTiles />

      {/* Solution Finder Modal */}
      <SolutionFinder 
        isOpen={isSolutionFinderOpen}
        onClose={() => setIsSolutionFinderOpen(false)}
      />
    </div>
  );
};

export default Index;
