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
}

export const DoshaResults = ({ summary, details, calculationId }: DoshaResultsProps) => {
  const { t, i18n } = useTranslation();
  const [pujas, setPujas] = useState<SriMandirPuja[]>([]);
  const [isLoadingPujas, setIsLoadingPujas] = useState(true);
  const [hasTrackedBookPuja, setHasTrackedBookPuja] = useState(false);
  const [translatedExplanations, setTranslatedExplanations] = useState<Record<string, string>>({});
  const isHindi = (i18n.language ? i18n.language.toLowerCase() : '').startsWith('hi');
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const statusMessageRef = React.useRef<HTMLHeadingElement>(null);
  
  useScrollTracking();

  // Translate explanations when language changes to Hindi
  useEffect(() => {
    if (!isHindi) return;

    const translations: Record<string, string> = {};
    
    const translateInline = (text: string): string => {
      if (!text) return text;
      let translated = text;
      
      // Full sentence/phrase translations first (before word-by-word)
      translated = translated
        .replace(/Sade Sati is currently active/gi, 'साढ़े साती वर्तमान में सक्रिय है')
        .replace(/Sade Sati is not active/gi, 'साढ़े साती सक्रिय नहीं है')
        .replace(/rising phase/gi, 'उदय चरण')
        .replace(/peak phase/gi, 'शिखर चरण')
        .replace(/setting phase/gi, 'अस्त चरण')
        .replace(/is currently in/gi, 'वर्तमान में है')
        .replace(/Mangal Dosha is present/gi, 'मंगल दोष उपस्थित है')
        .replace(/Mangal Dosha is absent/gi, 'मंगल दोष अनुपस्थित है')
        .replace(/Kaal Sarp Dosha is present/gi, 'काल सर्प दोष उपस्थित है')
        .replace(/Kaal Sarp Dosha is absent/gi, 'काल सर्प दोष अनुपस्थित है')
        .replace(/Pitra Dosha is present/gi, 'पितृ दोष उपस्थित है')
        .replace(/Pitra Dosha is absent/gi, 'पितृ दोष अनुपस्थित है')
        .replace(/All planets are hemmed/gi, 'सभी ग्रह फंसे हुए हैं')
        .replace(/between Rahu and Ketu/gi, 'राहु और केतु के बीच')
        .replace(/is placed in/gi, 'स्थित है')
        .replace(/from the/gi, 'से');
      
      // Planet names
      translated = translated
        .replace(/\bMars\b/g, 'मंगल')
        .replace(/\bMoon\b/g, 'चंद्र')
        .replace(/\bSun\b/g, 'सूर्य')
        .replace(/\bSaturn\b/g, 'शनि')
        .replace(/\bJupiter\b/g, 'गुरु')
        .replace(/\bVenus\b/g, 'शुक्र')
        .replace(/\bMercury\b/g, 'बुध')
        .replace(/\bRahu\b/g, 'राहु')
        .replace(/\bKetu\b/g, 'केतु')
        .replace(/\bAscendant\b/g, 'लग्न')
        .replace(/\bLagna\b/g, 'लग्न');
      
      // Signs
      translated = translated
        .replace(/\bAries\b/g, 'मेष')
        .replace(/\bTaurus\b/g, 'वृषभ')
        .replace(/\bGemini\b/g, 'मिथुन')
        .replace(/\bCancer\b/g, 'कर्क')
        .replace(/\bLeo\b/g, 'सिंह')
        .replace(/\bVirgo\b/g, 'कन्या')
        .replace(/\bLibra\b/g, 'तुला')
        .replace(/\bScorpio\b/g, 'वृश्चिक')
        .replace(/\bSagittarius\b/g, 'धनु')
        .replace(/\bCapricorn\b/g, 'मकर')
        .replace(/\bAquarius\b/g, 'कुम्भ')
        .replace(/\bPisces\b/g, 'मीन');
      
      // Common terms
      translated = translated
        .replace(/\bhouse\b/gi, 'भाव')
        .replace(/\bpresent\b/gi, 'मौजूद')
        .replace(/\babsent\b/gi, 'अनुपस्थित')
        .replace(/\bnullified\b/gi, 'निष्प्रभावित')
        .replace(/\bconjunction\b/gi, 'युति')
        .replace(/\baspect\b/gi, 'दृष्टि')
        .replace(/\bin\b/g, 'में')
        .replace(/\bActive\b/g, 'सक्रिय')
        .replace(/\bInactive\b/g, 'निष्क्रिय')
        .replace(/\bPhase\b/gi, 'चरण')
        .replace(/\bRising\b/g, 'उदय')
        .replace(/\bPeak\b/g, 'शिखर')
        .replace(/\bSetting\b/g, 'अस्त');
      
      return translated;
    };
    
    if (details.mangal?.explanation) {
      translations['mangal'] = translateInline(details.mangal.explanation);
    }
    if (details.kaalSarp?.explanation) {
      translations['kaalSarp'] = translateInline(details.kaalSarp.explanation);
    }
    if (details.pitra?.explanation) {
      translations['pitra'] = translateInline(details.pitra.explanation);
    }
    if (details.sadeSati?.explanation) {
      translations['sadeSati'] = translateInline(details.sadeSati.explanation);
    }

    setTranslatedExplanations(translations);
  }, [isHindi, details]);

  useEffect(() => {
    trackEvent('dosha_results_viewed', {
      metadata: {
        calculation_id: calculationId,
        has_any_dosha: hasAnyDosha,
        mangal: summary.mangal,
        kaal_sarp: summary.kaalSarp,
        pitra: summary.pitra,
        shani_sade_sati: summary.shaniSadeSati
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
        
        return (
          <Card key={dosha.type} className="spiritual-glow border border-primary/10">
            <CardHeader className="pb-3">
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
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {dosha.explanation || (isHindi ? 'ग्रहों की स्थिति के आधार पर' : 'Based on planetary positions')}
                </p>
                
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
                
                {/* Planetary Placements */}
                {dosha.placements && dosha.placements.length > 0 && (
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
                  {isHindi ? 'प्रभाव' : 'Impact if Present'}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {dosha.impact}
                </p>
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

              {/* Home Remedies Box */}
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <h4 className="font-semibold text-sm mb-2 text-success">
                  {isHindi ? 'घरेलू उपाय (यदि पूजा नहीं कर सकते)' : 'Home Remedies (if unable to do puja)'}
                </h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {dosha.remedies.map((remedy, i) => (
                    <li key={i}>{remedy}</li>
                  ))}
                </ul>
              </div>
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
