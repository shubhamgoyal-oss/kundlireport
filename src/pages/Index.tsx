import { useState } from 'react';
import { Button } from '@/components/ui/button';
import SolutionFinder from '@/components/SolutionFinder';

const Index = () => {
  const [isSolutionFinderOpen, setIsSolutionFinderOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <header className="w-full p-6">
        <div className="flex items-center">
          <img 
            src="/lovable-uploads/3d7b9d6f-b1bc-4512-be16-d9dd2b31a265.png" 
            alt="Sri Mandir" 
            className="h-12 w-auto"
          />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
              Find Your Perfect
              <span className="gradient-spiritual bg-clip-text text-transparent block mt-2">
                Spiritual Solution
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Get personalized puja recommendations based on your birth details and life concerns. 
              Let divine wisdom guide you to the right spiritual practice.
            </p>
          </div>

          {/* Main CTA Button */}
          <Button
            onClick={() => setIsSolutionFinderOpen(true)}
            size="lg"
            className="spiritual-glow gradient-spiritual hover:scale-105 transition-transform duration-200 text-lg px-8 py-6"
          >
            🔮 My Solution Finder
          </Button>
        </div>
      </main>

      {/* Floating CTA Button - Alternative position */}
      <div className="fixed bottom-8 right-8 z-50">
        <Button
          onClick={() => setIsSolutionFinderOpen(true)}
          className="spiritual-glow gradient-sacred text-white shadow-lg hover:scale-110 transition-transform duration-200"
          size="lg"
        >
          🙏 Find My Solution
        </Button>
      </div>

      {/* Solution Finder Modal */}
      <SolutionFinder 
        isOpen={isSolutionFinderOpen}
        onClose={() => setIsSolutionFinderOpen(false)}
      />
    </div>
  );
};

export default Index;
