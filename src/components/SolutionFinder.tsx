import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Sparkles, Heart, Home, DollarSign, Brain, Baby, Plus } from 'lucide-react';

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
  { key: "Family Issues", label: "Family Issues", icon: Home, color: "text-green-500" },
  { key: "Finances", label: "Finances", icon: DollarSign, color: "text-yellow-600" },
  { key: "Peace of Mind", label: "Peace of Mind", icon: Brain, color: "text-purple-500" },
  { key: "Child Well-being", label: "Child Well-being", icon: Baby, color: "text-orange-500" },
  { key: "Other", label: "Other", icon: Plus, color: "text-gray-500" }
];

export default function SolutionFinder({ isOpen, onClose }: SolutionFinderProps) {
  const [step, setStep] = useState(1);
  const [birthDate, setBirthDate] = useState({ day: '', month: '', year: '' });
  const [selectedArea, setSelectedArea] = useState('');
  const [concern, setConcern] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [rashi, setRashi] = useState('');
  const [moolank, setMoolank] = useState('');

  const handleNext = () => {
    if (step === 1) {
      setIsCalculating(true);
      // Calculate Rashi and Moolank based on birth date
      setTimeout(() => {
        const rashis = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
        const calculatedRashi = rashis[parseInt(birthDate.month) - 1] || 'Aries';
        const calculatedMoolank = (parseInt(birthDate.day) % 9) + 1;
        
        setRashi(calculatedRashi);
        setMoolank(calculatedMoolank.toString());
        setIsCalculating(false);
        setStep(2);
      }, 2000);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3 && selectedArea) {
      setStep(4);
    } else {
      setStep(step + 1);
    }
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleClose = () => {
    setStep(1);
    setBirthDate({ day: '', month: '', year: '' });
    setSelectedArea('');
    setConcern('');
    setRashi('');
    setMoolank('');
    onClose();
  };

  const isDateValid = birthDate.day && birthDate.month && birthDate.year;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Enter your DOB</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Select value={birthDate.day} onValueChange={(value) => setBirthDate(prev => ({ ...prev, day: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Day" />
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
              <SelectValue placeholder="Month" />
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
              <SelectValue placeholder="Year" />
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
        <p className="text-sm text-gray-600">
          My Solution Finder is a simple 4-step tool that guides you to the most suitable puja based on your birth details and life concerns. You start by entering your date of birth, which helps us calculate your Rashi and Moolank in the background. Then, you select the area of life where you seek blessings — like health, career, or relationships. Based on this, the system recommends personalised pujas, and with one click, you're guided to the right puja to book.
        </p>
      </div>
      
      <Button 
        onClick={handleNext} 
        disabled={!isDateValid}
        className="w-full bg-primary hover:bg-primary/90 text-white"
      >
        Next <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="text-center space-y-6 py-8">
      {isCalculating ? (
        <>
          <div className="animate-spin w-16 h-16 mx-auto mb-4">
            <Sparkles className="w-16 h-16 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold text-primary">
            Consulting the Cosmos for You...
          </h3>
          <div className="flex justify-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Your Astrological Details</h3>
          <div className="bg-accent/20 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Your Rashi</p>
                <p className="text-lg font-semibold text-primary">{rashi}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Your Moolank</p>
                <p className="text-lg font-semibold text-primary">{moolank}</p>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={handleBack} className="flex-1">
              Back
            </Button>
            <Button onClick={handleNext} className="flex-1 bg-primary hover:bg-primary/90 text-white">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">What area of life do you need blessings for?</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {lifeAreas.map((area) => {
          const IconComponent = area.icon;
          return (
            <Button
              key={area.key}
              variant={selectedArea === area.key ? "default" : "outline"}
              className={`h-auto p-4 flex flex-col items-center space-y-2 hover:bg-muted ${
                selectedArea === area.key ? 'bg-primary text-white hover:bg-primary/90' : ''
              }`}
              onClick={() => handleAreaSelect(area.key)}
            >
              <IconComponent className={`w-6 h-6 ${selectedArea === area.key ? 'text-white' : area.color}`} />
              <span className="text-sm font-medium">{area.label}</span>
            </Button>
          );
        })}
      </div>
      
      {selectedArea && (
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
          <Button onClick={handleNext} className="flex-1 bg-primary hover:bg-primary/90 text-white">
            Next <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderStep4 = () => {
    const recommendations = pujaRecommendations[selectedArea] || [];
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Your Recommended Pujas</h3>
          <p className="text-sm text-muted-foreground">
            Based on your birth details and concern: <span className="font-medium text-primary">{selectedArea}</span>
          </p>
        </div>
        
        <div className="space-y-4">
          {recommendations.map((puja, index) => (
            <Card key={index} className="border border-border hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{puja.name}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Dedicated to {puja.deity}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm mb-4">{puja.description}</p>
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                  onClick={() => window.open('https://www.srimandir.com/', '_blank')}
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="flex gap-4">
          <Button variant="outline" onClick={handleBack} className="flex-1">
            Back
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-primary">
            My Solution Finder
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </DialogContent>
    </Dialog>
  );
}