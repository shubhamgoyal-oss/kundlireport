import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SriMandirPujaCarousel } from '@/components/SriMandirPujaCarousel';
import { SriMandirPuja, filterPujasByDosha, getUpcomingPujas } from '@/utils/sriMandirPujas';

interface OtherDoshasProps {
  pujas: SriMandirPuja[];
  // Future: backend will pass these flags when computed
  doshaFlags?: {
    rahuKetu?: { status: string };
    shrapit?: { status: string };
    guruChandal?: { status: string };
    punarphoo?: { status: string };
    kemadruma?: { status: string };
    gandmool?: { status: string };
    kalathra?: { status: string };
    vishDaridra?: { status: string };
    ketuNaga?: { status: string };
    navagraha?: { status: string };
    rahuSurya?: { status: string };
    naag?: { status: string };
  };
}

const otherDoshasData = {
  rahuKetu: {
    name: 'Rahu–Ketu / Grahan Dosha',
    whatItIs: 'Sun or Moon closely aligned with Rahu/Ketu (eclipse pattern); often called Grahan Dosha.',
    impact: 'Mood swings, detours, and anxiety; plans can feel eclipsed or delayed despite effort.',
    remedies: [
      'Mindfulness, stable routines, breath practices.',
      'Charity on eclipse-related days; light devotional worship.',
    ],
    keywords: ['rahu', 'ketu', 'grahan', 'राहु', 'केतु', 'ग्रहण'],
  },
  shrapit: {
    name: 'Shrapit Dosha (Saturn–Rahu)',
    whatItIs: 'Saturn and Rahu together or in a strong mutual aspect.',
    impact: 'Recurring obstacles, karmic delays, heavier duties; progress comes slowly.',
    remedies: [
      'Saturday discipline; service and humility.',
      'Rudrabhishek / Shani-focused prayers.',
    ],
    keywords: ['shrapit', 'shani rahu', 'शापित', 'शनि राहु'],
  },
  guruChandal: {
    name: 'Guru Chandal Dosha (Jupiter–Rahu/Ketu)',
    whatItIs: 'Jupiter with Rahu or Ketu.',
    impact: 'Judgment/mentor issues; promises vs. outcomes may misalign.',
    remedies: [
      'Study with grounded mentors; donation of knowledge/education items.',
      'Guru-focused prayers.',
    ],
    keywords: ['guru chandal', 'jupiter rahu', 'jupiter ketu', 'गुरु चांडाल'],
  },
  punarphoo: {
    name: 'Punarphoo Dosha (Saturn–Moon)',
    whatItIs: 'Moon with Saturn or under tight Saturn influence.',
    impact: 'On–off outcomes, emotional heaviness; delays that demand patience.',
    remedies: [
      'Monday calm practices; moon-soothing disciplines.',
      'Chandra–Shani pacification prayers.',
    ],
    keywords: ['punarphoo', 'moon saturn', 'chandra shani', 'पुनर्फू', 'चन्द्र शनि'],
  },
  kemadruma: {
    name: 'Kemadruma Yoga (Moon isolated)',
    whatItIs: 'Moon without planetary neighbors on either side (classical isolation).',
    impact: 'Feelings of isolation; fluctuating support or finances.',
    remedies: [
      'Community seva; gratitude and consistency rituals.',
      'Chandra pacification; Navagraha Shanti.',
    ],
    keywords: ['kemadruma', 'kemadrum', 'केमद्रुम'],
  },
  gandmool: {
    name: 'Gandmool Dosha (Moon in specific nakshatras)',
    whatItIs: 'Moon in Ashwini, Ashlesha, Magha, Jyeshtha, Moola, or Revati.',
    impact: 'Sensitive beginnings; requires mindful rites and guidance.',
    remedies: [
      'Gandmool Shanti with family blessings.',
    ],
    keywords: ['gandmool', 'gandmūl', 'गण्डमूल', 'गंडमूल'],
  },
  kalathra: {
    name: 'Kalathra Dosha (7th-house/partner affliction)',
    whatItIs: 'Strong malefic influence on the 7th house, its lord, or Venus.',
    impact: 'Relationship friction, delays, or breaks; partnership lessons.',
    remedies: [
      'Friday harmony practices; counseling/mediation mindset.',
      'Venus pacification where appropriate.',
    ],
    keywords: ['kalathra', 'kalatra', 'कलात्र'],
  },
  vishDaridra: {
    name: 'Vish/Daridra Yoga (Mars–Saturn harsh combo)',
    whatItIs: 'Tight Mars–Saturn conjunction/aspect in key houses.',
    impact: 'Stop–go outcomes; conflict between drive and restraint.',
    remedies: [
      'Structured effort; conflict-avoidance sadhana.',
      'Hanuman devotion; Navagraha Shanti.',
    ],
    keywords: ['vish yoga', 'daridra yoga', 'विष', 'दरिद्र'],
  },
  ketuNaga: {
    name: 'Ketu/Naga (Sarpa) Dosha (non-Kaal Sarp)',
    whatItIs: 'Ketu in key houses or afflicting Moon/Venus without full Kaal Sarp pattern.',
    impact: 'Detachment themes; relationship coolness vs. spiritual pull.',
    remedies: [
      'Naga devotion where traditional; steady devotional routines.',
    ],
    keywords: ['ketu dosh', 'naga', 'sarpa', 'केतु', 'नाग', 'सर्प'],
  },
  navagraha: {
    name: 'Navagraha Shanti (umbrella suggestion)',
    whatItIs: 'General graha stress when multiple minor flags appear together.',
    impact: 'Diffuse obstacles across areas of life; benefits from balanced pacification.',
    remedies: [
      'Balanced discipline; regular simple worship.',
    ],
    keywords: ['navagraha', 'नवग्रह'],
  },
  rahuSurya: {
    name: 'Rahu–Surya Dosha',
    whatItIs: 'Sun closely aligned with Rahu (eclipse pattern).',
    impact: 'Can bring pride–ego tests, visibility swings, and delays in recognition; plans may start strong but face sudden detours.',
    remedies: [
      'Humility practices; steady routine over hype.',
      'Sunday charity or Surya-focused devotion.',
    ],
    keywords: ['rahu surya', 'rahu–surya', 'sun rahu', 'राहु सूर्य', 'राहु-सूर्य', 'rahu', 'grahan'],
  },
  naag: {
    name: 'Naag (Naga/Sarpa) Dosha',
    whatItIs: 'Serpent dosha patterns involving Rahu/Ketu creating karmic themes around detachment and ancestral influences.',
    impact: 'Karmic patterns around spirituality, detachment, and ancestral duties; may create distance in relationships or worldly pursuits.',
    remedies: [
      'Naga devotion where traditional; serpent deity worship.',
      'Steady devotional routines; detachment practices.',
      'Ancestral healing rituals where appropriate.',
    ],
    keywords: ['naga', 'naag', 'sarpa', 'serpent', 'नाग', 'सर्प', 'kaal sarp', 'kalsarp'],
  },
};

export const OtherDoshas = ({ pujas, doshaFlags = {} }: OtherDoshasProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isDoshaPresent = (status?: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'present' || s.includes('active') || s === 'suggested';
  };

  // Check if any dosha is present
  const hasAnyDosha = Object.values(doshaFlags).some(flag => isDoshaPresent(flag?.status));
  const statusText = hasAnyDosha ? 'Some doshas active' : 'No doshas found';

  const filterPujasByKeywords = (keywords: string[]): SriMandirPuja[] => {
    return pujas.filter(puja => {
      const title = puja.pooja_title.toLowerCase();
      return keywords.some(keyword => title.includes(keyword.toLowerCase()));
    });
  };

  const renderDoshaPanel = (
    key: keyof typeof otherDoshasData,
    statusFlag?: { status: string }
  ) => {
    const dosha = otherDoshasData[key];
    const isPresent = isDoshaPresent(statusFlag?.status);
    const matchedPujas = getUpcomingPujas(filterPujasByKeywords(dosha.keywords));

    return (
      <AccordionItem value={key} className="border rounded-lg px-4" key={key}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <h3 className="font-semibold text-lg text-left">{dosha.name}</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">{dosha.whatItIs}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {isPresent ? (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Present
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                Absent
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 space-y-4">
          {/* What it is */}
          <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary">
            <p className="text-sm text-muted-foreground italic">{dosha.whatItIs}</p>
            <p className="text-sm text-muted-foreground font-medium mt-2">{dosha.impact}</p>
          </div>

          {/* Traditional Remedies - Only show if present */}
          {isPresent && (
            <div>
              <h5 className="font-medium mb-2 flex items-center gap-2">
                Traditional Remedies
              </h5>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {dosha.remedies.map((remedy, i) => (
                  <li key={i}>{remedy}</li>
                ))}
                <li>Do a {dosha.name} Nivaran Puja.</li>
              </ul>
            </div>
          )}

          {/* Sri Mandir Recommendations - Only show if present and has matches */}
          {isPresent && matchedPujas.length > 0 && (
            <div className="mt-6 space-y-3">
              <h5 className="font-medium text-base">Sri Mandir recommended solutions</h5>
              <SriMandirPujaCarousel pujas={matchedPujas} doshaType={key} />
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <Card className="spiritual-glow mt-6">
      <CardHeader 
        className="cursor-pointer hover:bg-accent/5 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="text-left">
            <h3 className="font-semibold text-lg">Other Doshas</h3>
            <p className="text-sm text-muted-foreground">
              Status: {statusText}
            </p>
          </div>
          <ChevronDown 
            className={`h-6 w-6 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <Accordion type="single" collapsible className="w-full space-y-4">
            {renderDoshaPanel('rahuKetu', doshaFlags.rahuKetu)}
            {renderDoshaPanel('shrapit', doshaFlags.shrapit)}
            {renderDoshaPanel('guruChandal', doshaFlags.guruChandal)}
            {renderDoshaPanel('punarphoo', doshaFlags.punarphoo)}
            {renderDoshaPanel('kemadruma', doshaFlags.kemadruma)}
            {renderDoshaPanel('gandmool', doshaFlags.gandmool)}
            {renderDoshaPanel('kalathra', doshaFlags.kalathra)}
            {renderDoshaPanel('vishDaridra', doshaFlags.vishDaridra)}
            {renderDoshaPanel('ketuNaga', doshaFlags.ketuNaga)}
            {renderDoshaPanel('rahuSurya', doshaFlags.rahuSurya)}
            {renderDoshaPanel('naag', doshaFlags.naag)}
            {renderDoshaPanel('navagraha', doshaFlags.navagraha)}
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
};
