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

  const handleNext = () => {
    if (step === 1) {
      setIsCalculating(true);
      // Simulate calculation time
      setTimeout(() => {
        setIsCalculating(false);
        setStep(3);
      }, 2000);
    } else {
      setStep(step + 1);
    }
  };

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    setStep(4);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleClose = () => {
    setStep(1);
    setBirthDate({ day: '', month: '', year: '' });
    setSelectedArea('');
    setConcern('');
    onClose();
  };

  const isDateValid = birthDate.day && birthDate.month && birthDate.year;

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold mb-2">Enter Your Birth Details</h3>
        <p className="text-muted-foreground text-sm">
          Your birth details help us calculate your Rashi and Moolank for personalised guidance.
        </p>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="day">Day</Label>
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
          <Label htmlFor="month">Month</Label>
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
          <Label htmlFor="year">Year</Label>
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
      
      <Button 
        onClick={handleNext} 
        disabled={!isDateValid}
        className="w-full spiritual-glow"
      >
        Next <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderStep2 = () => (
    <div className="text-center space-y-6 py-8">
      <div className="animate-spin w-16 h-16 mx-auto mb-4">
        <Sparkles className="w-16 h-16 text-primary" />
      </div>
      <h3 className="text-2xl font-semibold gradient-spiritual bg-clip-text text-transparent">
        Consulting the Cosmos for You...
      </h3>
      <div className="flex justify-center space-x-2">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
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
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-muted"
              onClick={() => handleAreaSelect(area.key)}
            >
              <IconComponent className={`w-6 h-6 ${area.color}`} />
              <span className="text-sm font-medium">{area.label}</span>
            </Button>
          );
        })}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="concern">Briefly describe your concern (optional)</Label>
        <Textarea
          id="concern"
          placeholder="Tell us more about what you're seeking guidance for..."
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          rows={3}
        />
      </div>
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
            <Card key={index} className="border border-border spiritual-glow hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{puja.name}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Dedicated to {puja.deity}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm mb-4">{puja.description}</p>
                <Button 
                  className="w-full gradient-sacred text-white"
                  onClick={() => window.open('/calculatemymoolank', '_blank')}
                >
                  Book Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Button variant="outline" onClick={handleBack} className="w-full">
          Back to Categories
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-primary">
            🙏 My Solution Finder
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {step === 1 && renderStep1()}
          {(step === 2 || isCalculating) && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </DialogContent>
    </Dialog>
  );
}