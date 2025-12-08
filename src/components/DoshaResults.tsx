import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Info, Flame, Waves, Users, Moon, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SriMandirPujaCarousel } from '@/components/SriMandirPujaCarousel';
import { SriMandirPujaVerticalCard } from '@/components/SriMandirPujaVerticalCard';
import { fetchSriMandirPujas, filterPujasByDosha, getUpcomingPujas, getPrioritizedPuja, SriMandirPuja } from '@/utils/sriMandirPujas';
import { OtherDoshas } from '@/components/OtherDoshas';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import AstrologyChatbot from '@/components/AstrologyChatbot';
import { supabase } from '@/integrations/supabase/client';
import { CallbackFloater } from '@/components/CallbackFloater';
import { useScrollTracking } from '@/hooks/useScrollTracking';

interface DoshaResultsProps {
  summary: {
    mangal: string;
    mangalSeverity?: string;
    kaalSarp: string;
    kaalSarpType?: string;
    kaalSarpSubtype?: string;
    pitra: string;
    shaniSadeSati: string;
    shaniPhase?: number;
    grahan?: string;
    grahanSeverity?: string;
    grahanSubtype?: string;
    rahuSurya?: string;
    shrapit?: string;
    guruChandal?: string;
    punarphoo?: string;
    kemadruma?: string;
    gandmool?: string;
    kalathra?: string;
    vishDaridra?: string;
    ketuNaga?: string;
    navagrahaUmbrella?: string;
  };
  details: Record<string, {
    explanation: string;
    triggeredBy?: string[];
    placements?: string[];
    notes?: string[];
    remedies: string[];
  }>;
  calculationId?: string | null;
  problemArea?: string;
}

export const DoshaResults = ({ summary, details, calculationId, problemArea }: DoshaResultsProps) => {
  const { t, i18n } = useTranslation();
  const [pujas, setPujas] = useState<SriMandirPuja[]>([]);
  const [isLoadingPujas, setIsLoadingPujas] = useState(true);
  const [hasTrackedBookPuja, setHasTrackedBookPuja] = useState(false);
  const [translatedExplanations, setTranslatedExplanations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [personalizedImpacts, setPersonalizedImpacts] = useState<Record<string, { title: string; text: string }>>({});
  const [isLoadingImpacts, setIsLoadingImpacts] = useState(false);
  const isHindi = (i18n.language ? i18n.language.toLowerCase() : '').startsWith('hi');
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const statusMessageRef = React.useRef<HTMLHeadingElement>(null);
  
  useScrollTracking();

  // Translate explanations when language changes to Hindi using Lovable AI
  useEffect(() => {
    // Clear translations when switching to English
    if (!isHindi) {
      setTranslatedExplanations({});
      setIsTranslating(false);
      return;
    }

    const translateText = async (text: string): Promise<string> => {
      if (!text) return text;
      try {
        const response = await supabase.functions.invoke('translate-dosha', {
          body: { text }
        });
        return response.data?.translatedText || text;
      } catch (error) {
        console.error('Translation error:', error);
        return text;
      }
    };

    const translateAllExplanations = async () => {
      setIsTranslating(true);
      const translations: Record<string, string> = {};
      
      // Translate all explanations in parallel
      const promises: Promise<void>[] = [];
      
      if (details.mangal?.explanation) {
        promises.push(translateText(details.mangal.explanation).then(t => { translations['mangal'] = t; }));
      }
      if (details.kaalSarp?.explanation) {
        promises.push(translateText(details.kaalSarp.explanation).then(t => { translations['kaalSarp'] = t; }));
      }
      if (details.pitra?.explanation) {
        promises.push(translateText(details.pitra.explanation).then(t => { translations['pitra'] = t; }));
      }
      if (details.sadeSati?.explanation) {
        promises.push(translateText(details.sadeSati.explanation).then(t => { translations['sadeSati'] = t; }));
      }

      await Promise.all(promises);
      setTranslatedExplanations(translations);
      setIsTranslating(false);
    };

    translateAllExplanations();
  }, [isHindi, details]);

  // Generate personalized impacts when problemArea is provided
  useEffect(() => {
    if (!problemArea || problemArea.trim().length === 0) {
      setPersonalizedImpacts({});
      return;
    }

    // Helper functions defined inline to avoid hoisting issues
    const checkDoshaPresent = (status?: string) => {
      const s = (status || '').toLowerCase();
      return s === 'present' || s === 'active' || s === 'partial';
    };
    const checkDoshaNullified = (status?: string) => {
      const s = (status || '').toLowerCase();
      return s.includes('nullified');
    };

    const generateImpacts = async () => {
      setIsLoadingImpacts(true);
      const impacts: Record<string, { title: string; text: string }> = {};
      
      const doshaTypes = ['mangal', 'kaal-sarp', 'pitra', 'shani'];
      const activeTypes = doshaTypes.filter(type => {
        if (type === 'mangal') return checkDoshaPresent(summary.mangal) && !checkDoshaNullified(summary.mangal);
        if (type === 'kaal-sarp') return checkDoshaPresent(summary.kaalSarp);
        if (type === 'pitra') return checkDoshaPresent(summary.pitra);
        if (type === 'shani') return checkDoshaPresent(summary.shaniSadeSati);
        return false;
      });

      const promises = activeTypes.map(async (doshaType) => {
        try {
          const response = await supabase.functions.invoke('generate-impact', {
            body: {
              doshaType,
              problemArea,
              language: isHindi ? 'hi' : 'en'
            }
          });
          if (response.data?.impactText) {
            impacts[doshaType] = {
              title: response.data.impactTitle || (isHindi ? 'प्रभाव' : 'Impact if Present'),
              text: response.data.impactText
            };
          }
        } catch (error) {
          console.error(`Failed to generate impact for ${doshaType}:`, error);
        }
      });

      await Promise.all(promises);
      setPersonalizedImpacts(impacts);
      setIsLoadingImpacts(false);
    };

    generateImpacts();
  }, [problemArea, isHindi, summary]);

  useEffect(() => {
    trackEvent('dosha_results_viewed', {
      metadata: {
        calculation_id: calculationId,
        has_any_dosha: hasAnyDosha,
        mangal: summary.mangal,
        kaal_sarp: summary.kaalSarp,
        pitra: summary.pitra,
        shani_sade_sati: summary.shaniSadeSati,
        problem_area: problemArea
      }
    });
    
    if (statusMessageRef.current) {
      setTimeout(() => {
        statusMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 150);
    }

    setIsLoadingPujas(true);
    fetchSriMandirPujas()
      .then(setPujas)
      .finally(() => setIsLoadingPujas(false));

    const intervalId = setInterval(() => {
      fetchSriMandirPujas().then(setPujas);
    }, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const isDoshaPresent = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s === 'present' || s === 'active' || s === 'partial';
  };

  const isDoshaNullified = (status?: string) => {
    const s = (status || '').toLowerCase();
    return s.includes('nullified');
  };

  const translateStatus = (status?: string) => {
    if (!status) return '';
    const key = status.toLowerCase();
    
    if (key.includes('nullified')) {
      return isHindi ? 'उपस्थित (निरस्त)' : 'Present (Nullified)';
    }
    
    const map: Record<string, string> = {
      present: t('doshaResults.statusValues.present'),
      absent: t('doshaResults.statusValues.absent'),
      inactive: t('doshaResults.statusValues.inactive'),
      active: t('doshaResults.statusValues.active'),
      suggested: t('doshaResults.statusValues.suggested'),
      partial: isHindi ? 'आंशिक' : 'Partial',
    };
    return map[key] || status;
  };

  const translatePlacement = (line: string) => {
    if (!isHindi) return line;
    let s = line;

    const planetMap: Record<string, string> = {
      Sun: 'सूर्य', Moon: 'चंद्र', Mars: 'मंगल', Mercury: 'बुध',
      Jupiter: 'गुरु', Venus: 'शुक्र', Saturn: 'शनि', Rahu: 'राहु', Ketu: 'केतु',
    };
    const signMap: Record<string, string> = {
      Aries: 'मेष', Taurus: 'वृषभ', Gemini: 'मिथुन', Cancer: 'कर्क',
      Leo: 'सिंह', Virgo: 'कन्या', Libra: 'तुला', Scorpio: 'वृश्चिक',
      Sagittarius: 'धनु', Capricorn: 'मकर', Aquarius: 'कुंभ', Pisces: 'मीन',
    };

    Object.entries(planetMap).forEach(([en, hi]) => {
      s = s.replace(new RegExp(`\\b${en}\\b`, 'g'), hi);
    });
    Object.entries(signMap).forEach(([en, hi]) => {
      s = s.replace(new RegExp(`\\b${en}\\b`, 'g'), hi);
    });

    s = s
      .replace(/\bin\b/gi, 'में')
      .replace(/\bhouse\b/gi, 'भाव')
      .replace(/from\s+Lagna/gi, 'लग्न से')
      .replace(/with empty neighboring signs/gi, 'पड़ोसी राशियों के बिना')
      .replace(/isolated/gi, 'अकेला');

    s = s.replace(/(\d+)(st|nd|rd|th)?\s*भाव/gi, (_m, num) => `${num}वें भाव`);

    return s;
  };

  const hasAnyDosha = 
    (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) ||
    isDoshaPresent(summary.kaalSarp) ||
    isDoshaPresent(summary.pitra) ||
    isDoshaPresent(summary.shaniSadeSati);

  const trackBookPujaClick = async (doshaType: string) => {
    if (hasTrackedBookPuja) return;

    try {
      const visitorId = typeof window !== 'undefined'
        ? localStorage.getItem('analytics_visitor_id') || 'unknown'
        : 'unknown';
      const sessionId = typeof window !== 'undefined'
        ? localStorage.getItem('analytics_session_id') || 'unknown'
        : 'unknown';

      let updated = false;

      if (calculationId) {
        const { error } = await supabase
          .from('dosha_calculator2')
          .update({ book_puja_clicked: true })
          .eq('id', calculationId);

        if (error) {
          console.error('Failed to update book_puja_clicked by id:', error);
        } else {
          updated = true;
        }
      }

      if (!updated && visitorId) {
        const { error } = await supabase
          .from('dosha_calculator2')
          .update({ book_puja_clicked: true })
          .eq('visitor_id', visitorId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Failed to update book_puja_clicked by visitor_id:', error);
        } else {
          updated = true;
        }
      }

      if (!updated) {
        await supabase.from('analytics_events').insert({
          visitor_id: visitorId,
          session_id: sessionId,
          event_name: 'book_puja_clicked',
          metadata: {
            calculation_id: calculationId,
            dosha_type: doshaType,
          },
        });
      } else {
        setHasTrackedBookPuja(true);
      }
    } catch (err) {
      console.error('Failed to track book puja:', err);
    }
  };

  // Build list of active major doshas with all their data
  const activeDoshas: Array<{
    type: string;
    detailKey: string;
    label: string;
    icon: typeof Flame;
    status: string;
    severity?: string;
    phase?: number;
    explanation: string;
    placements?: string[];
    impact: string;
    remedies: string[];
    pujaType: string;
  }> = [];

  // Helper to get phase explanation
  const getPhaseExplanation = (phase?: number) => {
    if (!phase) return '';
    if (isHindi) {
      if (phase === 1) return 'उदय चरण (Rising Phase): शनि आपकी चंद्र राशि से पहले की राशि में है। यह साढ़े साती की शुरुआत है।';
      if (phase === 2) return 'शिखर चरण (Peak Phase): शनि आपकी चंद्र राशि में है। यह साढ़े साती का सबसे प्रभावशाली समय है।';
      if (phase === 3) return 'अस्त चरण (Setting Phase): शनि आपकी चंद्र राशि के बाद की राशि में है। साढ़े साती समाप्त होने वाली है।';
    } else {
      if (phase === 1) return 'Rising Phase: Saturn is in the sign before your Moon sign. This marks the beginning of Sade Sati.';
      if (phase === 2) return 'Peak Phase: Saturn is in your Moon sign. This is the most intense period of Sade Sati.';
      if (phase === 3) return 'Setting Phase: Saturn is in the sign after your Moon sign. Sade Sati is nearing its end.';
    }
    return '';
  };

  if (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) {
    activeDoshas.push({
      type: 'mangal',
      detailKey: 'mangal',
      label: t('doshaResults.mangal.name'),
      icon: Flame,
      status: summary.mangal,
      severity: summary.mangalSeverity,
      explanation: isHindi ? (translatedExplanations.mangal || details.mangal?.explanation || '') : (details.mangal?.explanation || ''),
      placements: details.mangal?.placements,
      impact: t('doshaResults.mangal.impact'),
      remedies: t('doshaResults.mangal.remedies', { returnObjects: true }) as string[],
      pujaType: 'mangal',
    });
  }
  if (isDoshaPresent(summary.kaalSarp)) {
    activeDoshas.push({
      type: 'kaal-sarp',
      detailKey: 'kaalSarp',
      label: t('doshaResults.kaalSarp.name'),
      icon: Waves,
      status: summary.kaalSarp,
      explanation: isHindi ? (translatedExplanations.kaalSarp || details.kaalSarp?.explanation || '') : (details.kaalSarp?.explanation || ''),
      placements: details.kaalSarp?.placements,
      impact: t('doshaResults.kaalSarp.impact'),
      remedies: t('doshaResults.kaalSarp.remedies', { returnObjects: true }) as string[],
      pujaType: 'kaal-sarp',
    });
  }
  if (isDoshaPresent(summary.pitra)) {
    activeDoshas.push({
      type: 'pitra',
      detailKey: 'pitra',
      label: t('doshaResults.pitra.name'),
      icon: Users,
      status: summary.pitra,
      explanation: isHindi ? (translatedExplanations.pitra || details.pitra?.explanation || '') : (details.pitra?.explanation || ''),
      placements: details.pitra?.placements,
      impact: t('doshaResults.pitra.impact'),
      remedies: t('doshaResults.pitra.remedies', { returnObjects: true }) as string[],
      pujaType: 'pitra',
    });
  }
  if (isDoshaPresent(summary.shaniSadeSati)) {
    activeDoshas.push({
      type: 'shani',
      detailKey: 'sadeSati',
      label: t('doshaResults.sadeSati.name'),
      icon: Moon,
      status: summary.shaniSadeSati,
      phase: summary.shaniPhase,
      explanation: isHindi ? (translatedExplanations.sadeSati || details.sadeSati?.explanation || '') : (details.sadeSati?.explanation || ''),
      placements: details.sadeSati?.placements,
      impact: t('doshaResults.sadeSati.impact'),
      remedies: t('doshaResults.sadeSati.remedies', { returnObjects: true }) as string[],
      pujaType: 'shani',
    });
  }

  // Get puja benefits by dosha type
  const getPujaBenefits = (pujaType: string, hindi: boolean): string[] => {
    const benefits: Record<string, { en: string[]; hi: string[] }> = {
      mangal: {
        en: [
          'Calms aggressive Mars energy causing conflict and instability.',
          'Reduces hurdles through fire offerings to pacify Mangal.',
          'Strengthens harmony in relationships and domestic life.',
          'Protects from impulsive decisions and heated confrontations.'
        ],
        hi: [
          'संघर्ष और अस्थिरता पैदा करने वाली आक्रामक मंगल ऊर्जा को शांत करती है।',
          'मंगल को शांत करने के लिए हवन से बाधाओं को कम करती है।',
          'रिश्तों और पारिवारिक जीवन में सामंजस्य को मजबूत करती है।',
          'आवेगपूर्ण निर्णयों और गरमागरम टकराव से बचाती है।'
        ]
      },
      pitra: {
        en: [
          'Brings peace to ancestors through Tarpan offerings.',
          'Removes unseen family obstacles blocking progress.',
          'Restores blessings lost due to ancestral imbalance.',
          'Improves health, stability, and family harmony.'
        ],
        hi: [
          'तर्पण के माध्यम से पूर्वजों को शांति प्रदान करती है।',
          'प्रगति में बाधा डालने वाली अदृश्य पारिवारिक बाधाओं को दूर करती है।',
          'पैतृक असंतुलन के कारण खोए हुए आशीर्वाद को पुनर्स्थापित करती है।',
          'स्वास्थ्य, स्थिरता और पारिवारिक सद्भाव में सुधार करती है।'
        ]
      },
      'kaal-sarp': {
        en: [
          'Balances Rahu-Ketu energies causing sudden setbacks.',
          'Rituals reduce fear, confusion, and unexpected losses.',
          'Strengthens protection against karmic disturbances.',
          'Restores direction and stability in major life areas.'
        ],
        hi: [
          'अचानक झटके देने वाली राहु-केतु ऊर्जाओं को संतुलित करती है।',
          'अनुष्ठान भय, भ्रम और अप्रत्याशित नुकसान को कम करते हैं।',
          'कर्म संबंधी गड़बड़ियों से सुरक्षा को मजबूत करती है।',
          'जीवन के प्रमुख क्षेत्रों में दिशा और स्थिरता बहाल करती है।'
        ]
      },
      shani: {
        en: [
          'Pacifies Saturn\'s pressure through Shani Abhishek rituals.',
          'Reduces delays, financial strain, and mental burden.',
          'Increases resilience during Saturn\'s testing phase.',
          'Brings steady progress and long-term protection.'
        ],
        hi: [
          'शनि अभिषेक अनुष्ठानों से शनि के दबाव को शांत करती है।',
          'देरी, वित्तीय तनाव और मानसिक बोझ को कम करती है।',
          'शनि की परीक्षा अवधि में लचीलापन बढ़ाती है।',
          'स्थिर प्रगति और दीर्घकालिक सुरक्षा लाती है।'
        ]
      }
    };
    
    return benefits[pujaType]?.[hindi ? 'hi' : 'en'] || [];
  };

  // Get puja for a dosha type
  const getPujaForDosha = (pujaType: string): SriMandirPuja | null => {
    const filtered = filterPujasByDosha(pujas, pujaType as any);
    if (pujaType === 'pitra') return getPrioritizedPuja(filtered, 'pitra');
    if (pujaType === 'shani') return getPrioritizedPuja(filtered, 'shani');
    if (pujaType === 'mangal') return getPrioritizedPuja(filtered, 'mangal');
    const priorityKeywordsMap: Record<string, string[]> = {
      'kaal-sarp': ['kaal sarp dosha', 'काल सर्प दोष'],
    };
    const keywords = priorityKeywordsMap[pujaType] || [];
    return getUpcomingPujas(filtered, 1, keywords)[0] || null;
  };

  return (
    <div ref={resultsRef} className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {/* Status Header */}
      <Card className="spiritual-glow border-2 border-primary/20">
        <CardHeader>
          <CardTitle 
            ref={statusMessageRef}
            className={`text-2xl sm:text-3xl font-bold break-words ${hasAnyDosha ? 'text-primary' : 'gradient-spiritual bg-clip-text text-transparent'}`}
          >
            {hasAnyDosha 
              ? (isHindi ? 'कुछ दोष पाए गए हैं' : 'Some Doshas Have Been Detected')
              : (isHindi ? '✓ कोई प्रमुख दोष नहीं मिला' : '✓ No Major Doshas Found')
            }
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {!hasAnyDosha ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-success" />
              <p className="text-lg font-medium text-foreground">
                {isHindi ? 'कोई प्रमुख दोष नहीं पाया गया' : 'No major doshas found'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {isHindi 
                  ? 'आपकी कुंडली में कोई प्रमुख दोष नहीं है'
                  : 'Your birth chart shows no major doshas'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Status Pills showing all detected doshas */}
              <div className="flex flex-wrap gap-2">
                {activeDoshas.map((dosha) => (
                  <div 
                    key={dosha.type} 
                    className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 px-4 py-2 rounded-full"
                  >
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm text-foreground">
                      {dosha.label}: {translateStatus(dosha.status)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Individual Dosha Sections */}
      {activeDoshas.map((dosha, index) => {
        const puja = getPujaForDosha(dosha.pujaType);
        const DoshaIcon = dosha.icon;
        const phaseExplanation = dosha.type === 'shani' && dosha.phase ? getPhaseExplanation(dosha.phase) : '';
        
        // Subtle background colors for visual differentiation
        const sectionColors = [
          'bg-orange-50/50 dark:bg-orange-950/20 border-l-4 border-l-orange-400',
          'bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-l-blue-400',
          'bg-purple-50/50 dark:bg-purple-950/20 border-l-4 border-l-purple-400',
          'bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-l-amber-400',
        ];
        const sectionColor = sectionColors[index % sectionColors.length];
        
        return (
          <Card key={dosha.type} className={`spiritual-glow border border-primary/10 ${sectionColor}`}>
            {/* Section indicator badge */}
            <div className="px-4 pt-3">
              <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                {isHindi ? `दोष ${index + 1} का ${activeDoshas.length}` : `Dosha ${index + 1} of ${activeDoshas.length}`}
              </Badge>
            </div>
            
            <CardHeader className="pb-3 pt-2">
              <CardTitle className="flex items-center gap-3 text-xl">
                <DoshaIcon className="w-6 h-6 text-primary" />
                {dosha.label}
              </CardTitle>
              <CardDescription>
                {t('doshaResults.status')}: {translateStatus(dosha.status)}
                {dosha.severity && ` • ${t('doshaResults.severity')}: ${dosha.severity}`}
                {dosha.phase && ` • ${isHindi ? 'चरण' : 'Phase'}: ${dosha.phase}`}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Why is this dosha marked? */}
              <div className="space-y-2">
                <h4 className="font-semibold text-base flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  {isHindi ? 'यह दोष आपकी कुंडली में क्यों है?' : 'Why is this dosha marked in your kundli?'}
                </h4>
                {isHindi && isTranslating ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>अनुवाद हो रहा है...</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {dosha.explanation || (isHindi ? 'ग्रहों की स्थिति के आधार पर' : 'Based on planetary positions')}
                  </p>
                )}
                
                {/* Phase Explanation for Sade Sati */}
                {phaseExplanation && (
                  <div className="mt-3 p-3 bg-warning/10 rounded-md border border-warning/20">
                    <h5 className="font-medium text-sm mb-2">
                      {isHindi ? 'वर्तमान चरण का अर्थ:' : 'Current Phase Meaning:'}
                    </h5>
                    <p className="text-sm text-muted-foreground">
                      {phaseExplanation}
                    </p>
                  </div>
                )}
                
                {/* Planetary Placements - Skip for Pitra Dosha as explanation covers it */}
                {dosha.type !== 'pitra' && dosha.placements && dosha.placements.length > 0 && (
                  <div className="mt-3 p-3 bg-accent/10 rounded-md border border-accent/20">
                    <h5 className="font-medium text-sm mb-2">
                      {isHindi ? 'ग्रहों की स्थिति:' : 'Planetary Positions:'}
                    </h5>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {dosha.placements.map((p, i) => (
                        <li key={i}>{translatePlacement(p)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Impact Box */}
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 text-destructive">
                  {personalizedImpacts[dosha.pujaType]?.title || (isHindi ? 'प्रभाव' : 'Impact if Present')}
                </h4>
                {isLoadingImpacts ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{isHindi ? 'प्रभाव विश्लेषण हो रहा है...' : 'Analyzing impact...'}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {personalizedImpacts[dosha.pujaType]?.text || dosha.impact}
                  </p>
                )}
              </div>

              {/* Puja Recommendation */}
              <div className="space-y-2">
                <h4 className="font-semibold text-base">
                  {isHindi ? 'पूजा उपाय' : 'Puja Recommendation'}
                </h4>
                {isLoadingPujas ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : puja ? (
                  <SriMandirPujaVerticalCard 
                    puja={puja} 
                    doshaType={dosha.type}
                    onBookClick={() => trackBookPujaClick(dosha.type)}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {isHindi ? 'इस दोष के लिए कोई विशेष पूजा उपलब्ध नहीं है' : 'No specific puja available for this dosha'}
                  </p>
                )}
              </div>

              {/* How this Puja will help */}
              {puja && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-base flex items-center gap-2">
                    {isHindi ? 'यह पूजा कैसे मदद करेगी' : 'How this Puja will help'}
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {getPujaBenefits(dosha.pujaType, isHindi).map((benefit, i) => (
                      <li key={i}>{benefit}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Detailed Analysis Section - All 4 Major Doshas */}
      <Card className="spiritual-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center gradient-spiritual bg-clip-text text-transparent">
            {t('doshaResults.detailedAnalysis')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('doshaResults.basedOnChart')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {/* Mangal Dosha */}
            <AccordionItem value="mangal" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Flame className="w-5 h-5 text-destructive" />
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{t('doshaResults.mangal.name')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('doshaResults.status')}: {translateStatus(summary.mangal)}
                      {summary.mangalSeverity && !isDoshaNullified(summary.mangal) && ` • ${t('doshaResults.severity')}: ${summary.mangalSeverity}`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground italic">{t('doshaResults.mangal.description')}</p>
                {details.mangal && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">{t('doshaResults.explanation')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {isHindi ? (translatedExplanations.mangal || details.mangal.explanation) : details.mangal.explanation}
                      </p>
                    </div>
                    {details.mangal.placements && details.mangal.placements.length > 0 && (
                      <div className="p-3 bg-accent/10 rounded-md">
                        <h4 className="font-medium mb-2">{t('doshaResults.planetaryPositions')}</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {details.mangal.placements.map((p, i) => (
                            <li key={i}>{translatePlacement(p)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <h4 className="font-medium mb-2">{t('doshaResults.traditionalRemedies')}</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {(t('doshaResults.mangal.remedies', { returnObjects: true }) as string[]).map((remedy, i) => (
                      <li key={i}>{remedy}</li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Kaal Sarp Dosha */}
            <AccordionItem value="kaalSarp" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Waves className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{t('doshaResults.kaalSarp.name')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('doshaResults.status')}: {translateStatus(summary.kaalSarp)}
                      {summary.kaalSarpType && ` • ${t('doshaResults.type')}: ${summary.kaalSarpType}`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground italic">{t('doshaResults.kaalSarp.description')}</p>
                {details.kaalSarp && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">{t('doshaResults.explanation')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {isHindi ? (translatedExplanations.kaalSarp || details.kaalSarp.explanation) : details.kaalSarp.explanation}
                      </p>
                    </div>
                    {details.kaalSarp.placements && details.kaalSarp.placements.length > 0 && (
                      <div className="p-3 bg-accent/10 rounded-md">
                        <h4 className="font-medium mb-2">{t('doshaResults.planetaryPositions')}</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {details.kaalSarp.placements.map((p, i) => (
                            <li key={i}>{translatePlacement(p)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <h4 className="font-medium mb-2">{t('doshaResults.traditionalRemedies')}</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {(t('doshaResults.kaalSarp.remedies', { returnObjects: true }) as string[]).map((remedy, i) => (
                      <li key={i}>{remedy}</li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Pitra Dosha */}
            <AccordionItem value="pitra" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-secondary" />
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{t('doshaResults.pitra.name')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('doshaResults.status')}: {translateStatus(summary.pitra)}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground italic">{t('doshaResults.pitra.description')}</p>
                {details.pitra && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">{t('doshaResults.explanation')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {isHindi ? (translatedExplanations.pitra || details.pitra.explanation) : details.pitra.explanation}
                      </p>
                    </div>
                    {details.pitra.placements && details.pitra.placements.length > 0 && (
                      <div className="p-3 bg-accent/10 rounded-md">
                        <h4 className="font-medium mb-2">{t('doshaResults.planetaryPositions')}</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {details.pitra.placements.map((p, i) => (
                            <li key={i}>{translatePlacement(p)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <h4 className="font-medium mb-2">{t('doshaResults.traditionalRemedies')}</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {(t('doshaResults.pitra.remedies', { returnObjects: true }) as string[]).map((remedy, i) => (
                      <li key={i}>{remedy}</li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Shani Sade Sati */}
            <AccordionItem value="sadeSati" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-warning" />
                  <div className="text-left">
                    <h3 className="font-semibold text-lg">{t('doshaResults.sadeSati.name')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t('doshaResults.status')}: {translateStatus(summary.shaniSadeSati)}
                      {summary.shaniPhase && ` • ${isHindi ? 'चरण' : 'Phase'}: ${summary.shaniPhase}`}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4 space-y-4">
                <p className="text-sm text-muted-foreground italic">{t('doshaResults.sadeSati.description')}</p>
                {details.sadeSati && (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">{t('doshaResults.explanation')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {isHindi ? (translatedExplanations.sadeSati || details.sadeSati.explanation) : details.sadeSati.explanation}
                      </p>
                    </div>
                    {details.sadeSati.placements && details.sadeSati.placements.length > 0 && (
                      <div className="p-3 bg-accent/10 rounded-md">
                        <h4 className="font-medium mb-2">{t('doshaResults.planetaryPositions')}</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {details.sadeSati.placements.map((p, i) => (
                            <li key={i}>{translatePlacement(p)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                <div>
                  <h4 className="font-medium mb-2">{t('doshaResults.traditionalRemedies')}</h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {(t('doshaResults.sadeSati.remedies', { returnObjects: true }) as string[]).map((remedy, i) => (
                      <li key={i}>{remedy}</li>
                    ))}
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Other Doshas Section */}
      <OtherDoshas
        pujas={pujas}
        doshaFlags={{
          rahuKetu: summary.grahan ? { 
            status: summary.grahan,
            explanation: details.grahan?.explanation,
            placements: details.grahan?.placements
          } : undefined,
          shrapit: summary.shrapit ? { 
            status: summary.shrapit,
            explanation: details.shrapit?.explanation,
            placements: details.shrapit?.placements
          } : undefined,
          guruChandal: summary.guruChandal ? { 
            status: summary.guruChandal,
            explanation: details.guruChandal?.explanation,
            placements: details.guruChandal?.placements
          } : undefined,
          punarphoo: summary.punarphoo ? { 
            status: summary.punarphoo,
            explanation: details.punarphoo?.explanation,
            placements: details.punarphoo?.placements
          } : undefined,
          kemadruma: summary.kemadruma ? { 
            status: summary.kemadruma,
            explanation: details.kemadruma?.explanation,
            placements: details.kemadruma?.placements
          } : undefined,
          gandmool: summary.gandmool ? { 
            status: summary.gandmool,
            explanation: details.gandmool?.explanation,
            placements: details.gandmool?.placements
          } : undefined,
          kalathra: summary.kalathra ? { 
            status: summary.kalathra,
            explanation: details.kalathra?.explanation,
            placements: details.kalathra?.placements
          } : undefined,
          vishDaridra: summary.vishDaridra ? { 
            status: summary.vishDaridra,
            explanation: details.vishDaridra?.explanation,
            placements: details.vishDaridra?.placements
          } : undefined,
          ketuNaga: summary.ketuNaga ? { 
            status: summary.ketuNaga,
            explanation: details.ketuNaga?.explanation,
            placements: details.ketuNaga?.placements
          } : undefined,
          navagraha: summary.navagrahaUmbrella ? { 
            status: summary.navagrahaUmbrella,
            explanation: details.navagraha?.explanation,
            placements: details.navagraha?.placements
          } : undefined,
        }}
      />

      {/* Sri Mandir Other Remedies */}
      {pujas.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold gradient-spiritual bg-clip-text text-transparent">
              {isHindi ? 'श्री मंदिर द्वारा अन्य उपाय' : 'Sri Mandir Offered Other Remedies'}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {getUpcomingPujas(pujas, 10).length} {t('doshaResults.upcomingPujas')}
            </p>
          </div>
          <SriMandirPujaCarousel pujas={getUpcomingPujas(pujas, 10)} doshaType="all" />
        </div>
      )}

      {/* AI Chatbot Section */}
      <div className="mt-8">
        <AstrologyChatbot 
          doshaContext={{
            summary,
            details,
            activeDoshas: activeDoshas.map(d => d.label),
            recommendedPujas: activeDoshas.slice(0, 3).map(dosha => {
              const puja = getPujaForDosha(dosha.pujaType);
              return {
                doshaType: dosha.type,
                doshaLabel: dosha.label,
                puja: puja ? {
                  title: puja.pooja_title,
                  titleEnglish: puja.pooja_title_english,
                  temple: puja.temple_name,
                  templeEnglish: puja.temple_name_english,
                  scheduleDate: puja.schedule_date_ist,
                  link: puja.puja_link,
                  linkHindi: puja.puja_link_hindi
                } : null
              };
            })
          }}
        />
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-accent/10 border border-accent/30 rounded-md">
        <p className="text-xs text-muted-foreground">
          {t('doshaResults.disclaimer')}
        </p>
      </div>
      
      {/* Callback Floater */}
      <CallbackFloater calculationId={calculationId} />
    </div>
  );
};
