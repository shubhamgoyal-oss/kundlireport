import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
};

export const OtherDoshas = ({ pujas, doshaFlags = {} }: OtherDoshasProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation();

  const isDoshaPresent = (status?: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'present' || s.includes('active') || s === 'suggested';
  };

  // Check if any dosha is present
  const hasAnyDosha = Object.values(doshaFlags).some(flag => isDoshaPresent(flag?.status));
  const statusText = hasAnyDosha 
    ? t('doshaResults.statusValues.someDoshasActive') 
    : t('doshaResults.statusValues.noDoshasFound');

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
    
    // Get translated dosha data
    const doshaKey = key as 'rahuKetu' | 'shrapit' | 'guruChandal' | 'punarphoo' | 'kemadruma' | 'gandmool' | 'kalathra' | 'vishDaridra' | 'ketuNaga' | 'navagraha';
    const translatedDosha = t(`doshaResults.otherDoshas.${doshaKey}`, { returnObjects: true }) as {
      name: string;
      whatItIs: string;
      impact: string;
      remedies: string[];
    };

    return (
      <AccordionItem value={key} className="border rounded-lg px-4" key={key}>
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 flex-1">
              <h3 className="font-semibold text-lg text-left">{translatedDosha.name}</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">{translatedDosha.whatItIs}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {isPresent ? (
              <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {t('doshaResults.statusValues.present')}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('doshaResults.statusValues.absent')}
              </Badge>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 space-y-4">
          {/* What it is */}
          <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary">
            <p className="text-sm text-muted-foreground italic">{translatedDosha.whatItIs}</p>
            <p className="text-sm text-muted-foreground font-medium mt-2">{translatedDosha.impact}</p>
          </div>

          {/* Traditional Remedies - Only show if present */}
          {isPresent && (
            <div>
              <h5 className="font-medium mb-2 flex items-center gap-2">
                {t('doshaResults.traditionalRemedies')}
              </h5>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {translatedDosha.remedies.map((remedy, i) => (
                  <li key={i}>{remedy}</li>
                ))}
              </ul>
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
            <h3 className="font-semibold text-lg">{t('doshaResults.otherDoshas.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('doshaResults.status')}: {statusText}
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
            {renderDoshaPanel('navagraha', doshaFlags.navagraha)}
          </Accordion>
        </CardContent>
      )}
    </Card>
  );
};
