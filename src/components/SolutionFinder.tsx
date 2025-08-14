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
    name: "Physical and Mental Well-being Special Health and Wellness Special Puja and Yagya",
    description: "Invite Shiva's Divine Healing for Health and Longevity",
    deity: "Lord Shiva",
    categories: ["Health"],
    url: "https://www.srimandir.com/epuja/6122-shiv-rudrabhishek-18th-aug-25",
    image: "https://srm-cdn.a4b.io/yoda/1750792116008.webp"
  },
  {
    id: 2,
    name: "Grishneshwar Jyotirlinga Monday Shiv Aradhana Special",
    description: "To Destroy Ill Health, Evil Eye and Negative Energies",
    deity: "Lord Shiva",
    categories: ["Health"],
    url: "https://www.srimandir.com/epuja/grishneshwar-jyotirlinga-special-18th-aug-25",
    image: "https://srm-cdn.a4b.io/yoda/1754582216693.webp"
  },
  {
    id: 3,
    name: "Grishneshwar Jyotirling Special Rudrabhishek",
    description: "Divine blessings for health and protection from negative energies",
    deity: "Lord Shiva",
    categories: ["Health"],
    url: "https://www.srimandir.com/epuja/3342-grishneshwar-jyotirling-special-18th-aug-25",
    image: "https://srm-cdn.a4b.io/yoda/1754582221692.webp"
  },
  {
    id: 4,
    name: "Omkareshwar 11,000 Mahamrityunjaya Maha Anushthan",
    description: "For Healing, Longevity, and Protection From Illness and Untimely Death",
    deity: "Lord Shiva",
    categories: ["Health"],
    url: "https://www.srimandir.com/epuja/omkareshwar-11000-special-18th-aug-25",
    image: "https://srm-cdn.a4b.io/yoda/1754340753224.webp"
  },
  // Career puja
  {
    id: 5,
    name: "Academic & Creative Excellence Fire Ceremony",
    description: "For Students and Learners to Succeed in Exams, Academics, or Creative Fields",
    deity: "Goddess Saraswati",
    categories: ["Career"],
    url: "https://www.srimandir.com/epuja/1121-academic-creative-excellence-21st-aug-2025",
    image: "https://srm-cdn.a4b.io/yoda/1750681502152.webp"
  },
  // Love / Relationships pujas
  {
    id: 6,
    name: "Brihaspati Guru Graha Havan, Vishnu Sahasranama and Banana Tree Puja",
    description: "To Avoid Delays in Marriage and Find a Suitable Partner",
    deity: "Lord Brihaspati & Lord Vishnu",
    categories: ["Love / Relationships"],
    url: "https://www.srimandir.com/epuja/6656-brihaspati-guru-graha-yagya-vishnu-sahasranama-puja-21st-aug-2025",
    image: "https://srm-cdn.a4b.io/yoda/1754996720927.webp"
  },
  {
    id: 7,
    name: "Marriage Blessing Puja",
    description: "Special blessings for harmonious relationships and marriage",
    deity: "Divine Mother",
    categories: ["Love / Relationships"],
    url: "https://www.srimandir.com/epuja/1122-marriage-blessing-puja-21st-aug-2025",
    image: "https://srm-cdn.a4b.io/yoda/1750681504954.webp"
  },
  // Finances pujas
  {
    id: 8,
    name: "Bagalamukhi Tantra Yukta Hawan and 18,000 Rahu Mool Mantra Jaap",
    description: "Overcome Financial Crisis and Business Setbacks with Baglamukhi and Rahu's Divine Power",
    deity: "Goddess Bagalamukhi",
    categories: ["Finances"],
    url: "https://www.srimandir.com/epuja/bagalamukhi-tantra-yukta-hawan-19th-aug-25",
    image: "https://srm-cdn.a4b.io/yoda/1754997096971.webp"
  },
  {
    id: 9,
    name: "21 Somvar Jyotirlinga Special Puja",
    description: "For financial stability and prosperity",
    deity: "Lord Shiva",
    categories: ["Finances"],
    url: "https://www.srimandir.com/epuja/21-somvar-jyotirlinga-special-18th-aug-25",
    image: "https://srm-cdn.a4b.io/yoda/1754032384191.webp"
  },
  {
    id: 10,
    name: "Rin Nashak Special Puja",
    description: "For debt relief and financial freedom",
    deity: "Lord Ganesha",
    categories: ["Finances"],
    url: "https://www.srimandir.com/epuja/3389-rin-nashak-special-20th-aug-25",
    image: "https://srm-cdn.a4b.io/yoda/1754049894309.webp"
  },
  {
    id: 11,
    name: "Omkareshwar Jyotirling Special Puja",
    description: "For wealth and financial growth",
    deity: "Lord Shiva",
    categories: ["Finances"],
    url: "https://www.srimandir.com/epuja/omkareshwar-jyotirling-special-11th-aug-25-1754907631",
    image: "https://srm-cdn.a4b.io/yoda/1754340753224.webp"
  },
  // Peace of Mind pujas
  {
    id: 12,
    name: "Rahu Shanti Jaap Havan",
    description: "For mental peace and removal of negative planetary effects",
    deity: "Lord Vishnu",
    categories: ["Peace of Mind"],
    url: "https://www.srimandir.com/epuja/1111-rahu-shanti-jaap-havan-19th-aug-2025",
    image: "https://srm-cdn.a4b.io/yoda/1753884337613.webp"
  },
  {
    id: 13,
    name: "Last Day Sawan Special Puja",
    description: "For inner peace and spiritual well-being",
    deity: "Lord Shiva",
    categories: ["Peace of Mind"],
    url: "https://www.srimandir.com/epuja/3975-last-day-sawan-special-18th-aug-25",
    image: "https://srm-cdn.a4b.io/yoda/1754032384191.webp"
  },
  {
    id: 14,
    name: "Datta Mala Mantra Puja",
    description: "For mental clarity and spiritual peace",
    deity: "Lord Dattatreya",
    categories: ["Peace of Mind"],
    url: "https://www.srimandir.com/epuja/5509-datta-mala-mantra-19th-august-2025",
    image: "https://srm-cdn.a4b.io/yoda/1753959826895.webp"
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
      trackEvent('next_astrological_details_click', { page: 'solution_finder', step: 3 });
      setStep(4);
    } else if (step === 4 && selectedAreas.length > 0) {
      trackEvent('next_life_areas_click', { page: 'solution_finder', step: 4, metadata: { selectedAreas } });
      setStep(5);
    } else {
      setStep(step + 1);
    }
  };
  const handleAreaSelect = (area: string) => {
    if (selectedAreas.includes(area)) {
      setSelectedAreas(selectedAreas.filter(a => a !== area));
    } else {
      setSelectedAreas([...selectedAreas, area]); // Allow multiple selections
    }
    trackEvent('category_selected', { page: 'solution_finder' });
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(1); // Skip step 2 (loading screen) when going back from step 3
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
          <Button variant="outline" onClick={handleBack} className="flex-1">
            {t('common.back')}
          </Button>
        )}
        <Button 
          onClick={handleNext} 
          disabled={!isDateValid}
          className={`${step > 1 ? 'flex-1' : 'w-full'} bg-primary hover:bg-primary/90 text-white`}
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
    <div className="text-center space-y-6 py-8">
      <h3 className="text-xl font-semibold">{t('solutionFinder.astrologicalDetails')}</h3>
      <div className="bg-accent/20 rounded-lg p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{t('solutionFinder.yourRashi')}</p>
            <p className="text-lg font-semibold text-primary">{rashi}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{t('solutionFinder.yourMoolank')}</p>
            <p className="text-lg font-semibold text-primary">{moolank}</p>
          </div>
        </div>
      </div>
      <div className="flex gap-4">
        <Button variant="outline" onClick={handleBack} className="flex-1">
          {t('common.back')}
        </Button>
        <Button onClick={handleNext} className="flex-1 bg-primary hover:bg-primary/90 text-white">
          {t('common.next')} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderStep4 = () => (
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
                key={area.key}
                variant={selectedAreas.includes(area.key) ? "default" : "outline"}
                className={`w-full h-auto min-h-[84px] p-3 sm:p-4 flex flex-col items-center justify-center gap-2 transition-colors ${
                  selectedAreas.includes(area.key) 
                    ? 'bg-primary text-white' 
                    : 'hover:bg-primary hover:text-white'
                }`}
                onClick={() => handleAreaSelect(area.key)}
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
      
      <div className="sticky bottom-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-t border-border pt-4">
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            {t('common.back')}
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={selectedAreas.length === 0}
            className={`flex-1 ${selectedAreas.length > 0 ? 'bg-primary hover:bg-primary/90 text-white' : ''}`}
          >
            {t('common.next')} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => {
    const recommendations = specificPujas.filter(puja => 
      puja.categories.some(category => selectedAreas.includes(category))
    );
    
    return (
      <div className="flex flex-col h-full">
        <div className="text-center sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-10 pb-4 pt-2">
          <h3 className="text-xl font-semibold mb-2">Your Recommended Pujas</h3>
          <p className="text-sm text-muted-foreground">
            Based on your birth details and selected areas: {selectedAreas.join(', ')}
          </p>
        </div>
        
        <div className="flex-1 overflow-y-auto pt-4">
          <div className="space-y-4">
            {recommendations.length > 0 ? recommendations.map((puja) => (
              <Card key={puja.id} className="border border-border hover:shadow-lg transition-shadow">
                <div className="flex gap-4 p-4">
                  <img 
                    src={puja.image} 
                    alt={puja.name}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <CardHeader className="p-0 pb-2">
                      <CardTitle className="text-lg">{puja.name}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        Dedicated to {puja.deity}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="text-sm mb-4">{puja.description}</p>
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        onClick={() => { trackEvent('book_now_click', { page: 'solution_finder' }); window.open(puja.url, '_blank', 'noopener,noreferrer'); }}
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
        
        <div className="flex gap-4 pt-4 border-t border-border">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-center text-primary">
            {t('solutionFinder.title')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 flex-1 flex flex-col">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
        </div>
      </DialogContent>
    </Dialog>
  );
}