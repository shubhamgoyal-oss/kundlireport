import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Sparkles, Heart, Home, DollarSign, Brain, Baby, Plus } from 'lucide-react';
import { calculateRashi, calculateMoolank } from '@/utils/astrology';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';

interface SolutionFinderProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PujaRecommendation {
  name: string;
  description: string;
  deity: string;
}

const pujaRecommendations: Record<string, PujaRecommendation[]> = {
  Health: [
    { name: "Mahamrityunjaya Puja", description: "For healing and protection from ailments", deity: "Lord Shiva" },
    { name: "Dhanvantari Puja", description: "For complete wellness and vitality", deity: "Lord Dhanvantari" },
    { name: "Ashtadasha Nama Archana", description: "For mental and physical well-being", deity: "Lord Ganesha" }
  ],
  Career: [
    { name: "Saraswati Puja", description: "For wisdom and professional growth", deity: "Goddess Saraswati" },
    { name: "Ganesha Puja", description: "For removing career obstacles", deity: "Lord Ganesha" },
    { name: "Vishnu Sahasranama", description: "For stability and success", deity: "Lord Vishnu" }
  ],
  "Love / Relationships": [
    { name: "Radha Krishna Puja", description: "For divine love and harmony", deity: "Radha Krishna" },
    { name: "Parvati Puja", description: "For marital bliss and understanding", deity: "Goddess Parvati" },
    { name: "Shiva Parvati Puja", description: "For eternal love and unity", deity: "Shiva Parvati" }
  ],
  "Family Issues": [
    { name: "Satyanarayan Puja", description: "For family peace and prosperity", deity: "Lord Vishnu" },
    { name: "Gauri Ganesh Puja", description: "For family harmony", deity: "Gauri Ganesh" },
    { name: "Lakshmi Narayan Puja", description: "For household blessings", deity: "Lakshmi Narayan" }
  ],
  Finances: [
    { name: "Lakshmi Puja", description: "For wealth and abundance", deity: "Goddess Lakshmi" },
    { name: "Kubera Puja", description: "For financial stability", deity: "Lord Kubera" },
    { name: "Ganga Aarti", description: "For removing financial obstacles", deity: "River Ganga" }
  ],
  "Peace of Mind": [
    { name: "Shiva Abhishek", description: "For inner peace and tranquility", deity: "Lord Shiva" },
    { name: "Hanuman Chalisa", description: "For strength and peace", deity: "Lord Hanuman" },
    { name: "Krishna Aarti", description: "For joy and serenity", deity: "Lord Krishna" }
  ],
  "Child Well-being": [
    { name: "Bal Gopal Puja", description: "For child's health and happiness", deity: "Bal Gopal" },
    { name: "Ganesha Puja", description: "For child's wisdom and success", deity: "Lord Ganesha" },
    { name: "Durga Puja", description: "For child's protection", deity: "Goddess Durga" }
  ],
  Other: [
    { name: "Rudrabhishek", description: "For overall spiritual growth", deity: "Lord Shiva" },
    { name: "Vishnu Puja", description: "For general protection and blessings", deity: "Lord Vishnu" },
    { name: "Devi Puja", description: "For divine mother's grace", deity: "Divine Mother" }
  ]
};

const lifeAreas = [
  { key: "Health", label: "Health", icon: Heart, color: "text-red-500" },
  { key: "Career", label: "Career", icon: Sparkles, color: "text-blue-500" },
  { key: "Love / Relationships", label: "Love / Relationships", icon: Heart, color: "text-pink-500" },
  { key: "Finances", label: "Finances", icon: DollarSign, color: "text-yellow-600" },
  { key: "Peace of Mind", label: "Peace of Mind", icon: Brain, color: "text-purple-500" }
];

const specificPujas = [
  // Health pujas
  {
    id: 1,
    name: "3 - Jyotirlinga - Trimbakeshwar, Omkareshwar and Ghrishneshwar Rudrabhishek and Rudra Homam",
    description: "Blessings for Longevity and Better Health",
    deity: "Lord Shiva",
    categories: ["Health"],
    url: "https://www.srimandir.com/epuja/3-jyotirlinga-rudra-homam-25th-aug-25?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755134243723.webp"
  },
  {
    id: 2,
    name: "Grishneshwar Jyotirlinga Monday Shiv Special",
    description: "Special Monday blessings for health and protection",
    deity: "Lord Shiva",
    categories: ["Health"],
    url: "https://www.srimandir.com/epuja/3-grishneshwar-jyotirlinga-monday-shiv-special-25th-aug-25?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755134251808.webp"
  },
  {
    id: 3,
    name: "Health and Wellness Special Puja and Yagya",
    description: "Invite Shiva's Divine Healing for Health and Longevity",
    deity: "Lord Shiva",
    categories: ["Health"],
    url: "https://www.srimandir.com/epuja/health-wellness-special-puja-and-yagya-25th-aug-25?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755151602482.webp"
  },
  // Finance pujas
  {
    id: 4,
    name: "51,000 Surya Gayatri Mantra Jaap and Aditya Hridaya Stotra Path",
    description: "To Unlock Wealth & Growth in Business and Politics",
    deity: "Lord Surya",
    categories: ["Finances"],
    url: "https://www.srimandir.com/epuja/1234-surya-gayatri-mantra-puja-24th-aug-25?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755159825392.webp"
  },
  {
    id: 5,
    name: "Ganesh–Lakshmi–Saraswati Trisiddhi Puja",
    description: "Ganesh's Divine Blessings to Attract Wealth and Wisdom",
    deity: "Lord Ganesha, Goddess Lakshmi & Saraswati",
    categories: ["Finances"],
    url: "https://www.srimandir.com/epuja/2678-rin-nashak-special-27th-aug-25?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755762520281.webp"
  },
  // Love/Relationships pujas
  {
    id: 6,
    name: "Divine Love and Union",
    description: "Sacred rituals for love and harmonious relationships",
    deity: "Radha Krishna",
    categories: ["Love / Relationships"],
    url: "https://www.srimandir.com/epuja/3198-divine-love-and-union-25th-aug-25?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755134243723.webp"
  },
  // Career pujas
  {
    id: 7,
    name: "Rin Nashak Special for Career",
    description: "Remove career obstacles and achieve professional success",
    deity: "Lord Ganesha",
    categories: ["Career"],
    url: "https://www.srimandir.com/epuja/6509-rin-nashak-special-27th-aug-25?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755762528244.webp"
  },
  {
    id: 8,
    name: "Career and Job Puja",
    description: "Special blessings for career growth and job opportunities",
    deity: "Goddess Saraswati",
    categories: ["Career"],
    url: "https://www.srimandir.com/epuja/4567-career-and-job-puja-29th-aug-2025?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755151614089.webp"
  },
  // Peace of Mind pujas
  {
    id: 9,
    name: "Peace of Mind Puja",
    description: "Divine blessings for mental peace and tranquility",
    deity: "Lord Shiva",
    categories: ["Peace of Mind"],
    url: "https://www.srimandir.com/epuja/21-puja-peace-of-mind-25th-aug-25?utm_source=Facebook&utm_campaign=mysolutionfinder",
    image: "https://srm-cdn.a4b.io/yoda/1755151620052.webp"
  }
];

export default function SolutionFinder({ isOpen, onClose }: SolutionFinderProps) {
  const [step, setStep] = useState(1);
  const [birthDate, setBirthDate] = useState({ day: '', month: '', year: '' });
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [concern, setConcern] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [rashi, setRashi] = useState('');
  const [moolank, setMoolank] = useState('');
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step === 1) {
      // Track GTM event
      if (typeof window !== 'undefined' && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'solution_finder_step1_next_click',
          buttonId: 'solution-finder-step1-next-btn',
          buttonType: 'navigation-next',
          step: 1
        });
      }
      trackEvent('next_dob_click', { page: 'solution_finder', step: 1 });
      setIsCalculating(true);
      setStep(2);
      // Calculate accurate Rashi and Moolank based on birth date
      setTimeout(() => {
        const day = parseInt(birthDate.day);
        const month = parseInt(birthDate.month);
        const year = parseInt(birthDate.year);
        
        const calculatedRashi = calculateRashi(day, month, year);
        const calculatedMoolank = calculateMoolank(day, month, year);
        
        setRashi(calculatedRashi);
        setMoolank(calculatedMoolank.toString());
        setIsCalculating(false);
        setStep(3);
      }, 2000);
    } else if (step === 3) {
      // Move from astrological details to life areas selection
      setStep(4);
    } else if (step === 4 && selectedAreas.length > 0) {
      // Track GTM event for life areas selection
      if (typeof window !== 'undefined' && (window as any).dataLayer) {
        (window as any).dataLayer.push({
          event: 'solution_finder_step4_next_click',
          buttonId: 'solution-finder-step4-next-btn',
          buttonType: 'navigation-next',
          step: 4,
          selectedAreas: selectedAreas
        });
      }
      trackEvent('next_life_areas_click', { page: 'solution_finder', step: 4, metadata: { selectedAreas } });
      setStep(5);
    } else {
      setStep(step + 1);
    }
  };
  const handleAreaSelect = (area: string) => {
    // Track GTM event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: `solution_finder_area_${area.toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_')}_click`,
        buttonId: `solution-finder-area-${area.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}-btn`,
        buttonType: 'area-selection',
        area: area,
        step: 3
      });
    }
    
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else {
      setSelectedAreas([...selectedAreas, area]); // Allow multiple selections
    }
    trackEvent('category_selected', { page: 'solution_finder' });
  };

  const handleBack = () => {
    // Track GTM event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: `solution_finder_step${step}_back_click`,
        buttonId: `solution-finder-step${step}-back-btn`,
        buttonType: 'navigation-back',
        step: step
      });
    }
    
    if (step === 3) {
      setStep(1); // Skip step 2 (loading screen) when going back from step 3
    } else if (step === 4) {
      setStep(3); // Go back to astrological details
    } else if (step === 5) {
      setStep(4); // Go back to life areas selection
    } else {
      setStep(step - 1);
    }
  };

  const handleClose = () => {
    setStep(1);
    setBirthDate({ day: '', month: '', year: '' });
    setSelectedAreas([]);
    setConcern('');
    setRashi('');
    setMoolank('');
    setIsCalculating(false);
    onClose();
  };

  const isDateValid = birthDate.day && birthDate.month && birthDate.year;

  const areaKeyMap: Record<string, string> = {
    'Health': 'health',
    'Career': 'career',
    'Love / Relationships': 'love-relationships',
    'Finances': 'finances',
    'Peace of Mind': 'peace-of-mind',
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Enter your Date of Birth</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Select value={birthDate.day} onValueChange={(value) => setBirthDate(prev => ({ ...prev, day: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={t('solutionFinder.day')} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => (
                <SelectItem key={i + 1} value={(i + 1).toString()}>
                  {i + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select value={birthDate.month} onValueChange={(value) => setBirthDate(prev => ({ ...prev, month: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={t('solutionFinder.month')} />
            </SelectTrigger>
            <SelectContent>
              {['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'].map((month, i) => (
                <SelectItem key={month} value={(i + 1).toString()}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select value={birthDate.year} onValueChange={(value) => setBirthDate(prev => ({ ...prev, year: value }))}>
            <SelectTrigger>
              <SelectValue placeholder={t('solutionFinder.year')} />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 76 }, (_, i) => {
                const year = 2025 - i;
                return (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {t('solutionFinder.description')}
        </p>
      </div>
      
      <div className="flex gap-4">
        {step > 1 && (
          <Button 
            id="solution-finder-step1-back-btn" 
            variant="outline" 
            onClick={handleBack} 
            className="flex-1"
            data-gtm-button-id="solution-finder-step1-back-btn"
            data-gtm-button-type="navigation-back"
            data-gtm-step="1"
          >
            {t('common.back')}
          </Button>
        )}
        <Button 
          id="solution-finder-step1-next-btn"
          onClick={handleNext} 
          disabled={!isDateValid}
          className={`${step > 1 ? 'flex-1' : 'w-full'} bg-primary hover:bg-primary/90 text-white`}
          data-gtm-button-id="solution-finder-step1-next-btn"
          data-gtm-button-type="navigation-next"
          data-gtm-step="1"
        >
          {t('common.next')} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="text-center space-y-6 py-8">
      <h3 className="text-2xl font-semibold text-primary">
        {t('solutionFinder.readingMap')}
      </h3>
      <div className="flex justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="flex flex-col h-full">
      <div className="shrink-0 text-center">
        <h3 className="text-xl font-semibold mb-2">{t('solutionFinder.selectAreasHeading')}</h3>
        <p className="text-sm text-muted-foreground">{t('solutionFinder.selectAreasSub')}</p>
      </div>
      
      <div className="mt-4 flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {lifeAreas.map((area) => {
            const IconComponent = area.icon;
            return (
              <Button
                id={`solution-finder-area-${area.key.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}-btn`}
                key={area.key}
                variant={selectedAreas.includes(area.key) ? "default" : "outline"}
                className={`w-full h-auto min-h-[84px] p-3 sm:p-4 flex flex-col items-center justify-center gap-2 transition-colors ${
                  selectedAreas.includes(area.key) 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-primary hover:text-white'
                }`}
                onClick={() => handleAreaSelect(area.key)}
                data-gtm-button-id={`solution-finder-area-${area.key.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-')}-btn`}
                data-gtm-button-type="area-selection"
                data-gtm-area={area.key}
                data-gtm-step="3"
              >
              <IconComponent className={`w-6 h-6 ${selectedAreas.includes(area.key) ? 'text-white' : area.color}`} />
              <span className="text-center text-sm font-medium whitespace-normal break-words">
                {area.label}
              </span>
              </Button>
            );
          })}
        </div>
      </div>
      
      <div className="shrink-0 border-t border-border pt-4 mt-4">
        <div className="flex gap-4">
          <Button 
            id="solution-finder-step3-back-btn" 
            variant="outline" 
            onClick={handleBack} 
            className="flex-1"
            data-gtm-button-id="solution-finder-step3-back-btn"
            data-gtm-button-type="navigation-back"
            data-gtm-step="3"
          >
            {t('common.back')}
          </Button>
          <Button 
            id="solution-finder-step3-next-btn"
            onClick={handleNext} 
            disabled={selectedAreas.length === 0}
            className={`flex-1 ${selectedAreas.length > 0 ? 'bg-primary hover:bg-primary/90 text-white' : ''}`}
            data-gtm-button-id="solution-finder-step3-next-btn"
            data-gtm-button-type="navigation-next"
            data-gtm-step="3"
          >
            {t('common.next')} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => {
    const recommendations = specificPujas.filter(puja => 
      puja.categories.some(category => selectedAreas.includes(category))
    );
    
    return (
      <div className="flex flex-col h-full">
        {/* Fixed Header */}
        <div className="shrink-0 text-center pb-4 border-b border-border">
          <h3 className="text-xl font-semibold mb-2">{t('solutionFinder.recommendedTitle')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('solutionFinder.basedOn', { areas: selectedAreas.join(', ') })}
          </p>
        </div>
        
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1 max-h-[400px]">
          <div className="space-y-4">
            {recommendations.length > 0 ? recommendations.map((puja) => (
              <Card key={puja.id} className="border border-border hover:shadow-lg transition-shadow">
                <div className="flex gap-4 p-4">
                  <img 
                    src={puja.image} 
                    alt={puja.name}
                    className="w-20 h-20 object-cover rounded-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <CardHeader className="p-0 pb-2">
                      <CardTitle className="text-lg leading-tight">{puja.name}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        Dedicated to {puja.deity}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-sm mb-4 line-clamp-2">{puja.description}</p>
                      <Button 
                        id={`solution-finder-book-puja-${puja.id}-btn`}
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        onClick={() => { 
                          // Track GTM event
                          if (typeof window !== 'undefined' && (window as any).dataLayer) {
                            (window as any).dataLayer.push({
                              event: `solution_finder_book_puja_${puja.id}_click`,
                              buttonId: `solution-finder-book-puja-${puja.id}-btn`,
                              buttonType: 'book-puja',
                              pujaId: puja.id,
                              pujaName: puja.name,
                               step: 4
                             });
                           }
                           trackEvent('book_now_click', { page: 'solution_finder' }); 
                           window.open(puja.url, '_blank', 'noopener,noreferrer'); 
                         }}
                         data-gtm-button-id={`solution-finder-book-puja-${puja.id}-btn`}
                         data-gtm-button-type="book-puja"
                         data-gtm-puja-id={puja.id}
                         data-gtm-puja-name={puja.name}
                         data-gtm-step="4"
                      >
                        {t('common.bookNow')}
                      </Button>
                    </CardContent>
                  </div>
                </div>
              </Card>
            )) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t('solutionFinder.noPujas')}</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Fixed Footer */}
        <div className="shrink-0 border-t border-border pt-4 mt-4">
          <div className="flex gap-4">
            <Button 
              id="solution-finder-step4-back-btn" 
              variant="outline" 
              onClick={handleBack} 
              className="flex-1"
              data-gtm-button-id="solution-finder-step4-back-btn"
              data-gtm-button-type="navigation-back"
              data-gtm-step="4"
            >
              {t('common.back')}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderAstrologicalDetails = () => (
    <div className="text-center space-y-6 py-8">
      <h3 className="text-xl font-semibold">{t('solutionFinder.astrologicalDetails')}</h3>
      <div className="bg-accent/20 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{t('solutionFinder.yourRashi')} (Sun Sign)</p>
            <p className="text-lg font-semibold text-primary">{rashi}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{t('solutionFinder.yourMoolank')}</p>
            <p className="text-lg font-semibold text-primary">{moolank}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-4">
        <Button 
          id="solution-finder-step2-back-btn" 
          variant="outline" 
          onClick={handleBack} 
          className="flex-1"
          data-gtm-button-id="solution-finder-step2-back-btn"
          data-gtm-button-type="navigation-back"
          data-gtm-step="2"
        >
          {t('common.back')}
        </Button>
        <Button 
          id="solution-finder-step2-next-btn" 
          onClick={handleNext} 
          className="flex-1 bg-primary hover:bg-primary/90 text-white"
          data-gtm-button-id="solution-finder-step2-next-btn"
          data-gtm-button-type="navigation-next"
          data-gtm-step="2"
        >
          {t('common.next')} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-center text-primary">
            {t('solutionFinder.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 flex-1 flex flex-col overflow-hidden">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderAstrologicalDetails()}
          {step === 4 && renderStep3()}
          {step === 5 && renderStep4()}
        </div>
      </DialogContent>
    </Dialog>
  );
}