import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Info, Flame, Waves, Users, Moon, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SriMandirPujaCarousel } from '@/components/SriMandirPujaCarousel';
import { SriMandirPujaCard } from '@/components/SriMandirPujaCard';
import { SriMandirPujaVerticalCard } from '@/components/SriMandirPujaVerticalCard';
import { DoshaPujaCarousel } from '@/components/DoshaPujaCarousel';
import { fetchSriMandirPujas, filterPujasByDosha, getUpcomingPujas, getPrioritizedPuja, SriMandirPuja } from '@/utils/sriMandirPujas';
import { OtherDoshas } from '@/components/OtherDoshas';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import AstrologyChatbot from '@/components/AstrologyChatbot';
import { supabase } from '@/integrations/supabase/client';
import { CallbackFloater } from '@/components/CallbackFloater';
import { useExperiment } from '@/hooks/useExperiment';

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
    // New doshas (optional, backward-compatible)
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
  const [isTranslating, setIsTranslating] = useState(false);
  const isHindi = (i18n.language ? i18n.language.toLowerCase() : '').startsWith('hi');
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const statusMessageRef = React.useRef<HTMLHeadingElement>(null);
  
  // A/B test for puja carousel vs static cards
  const { variant: pujaDisplayVariant, isLoading: isExperimentLoading } = useExperiment('puja_carousel_test');

  // Translate explanations when language changes to Hindi
  useEffect(() => {
    if (!isHindi || isTranslating) return;

    const explanationsToTranslate: { key: string; text: string }[] = [];
    
    if (details.mangal?.explanation) {
      explanationsToTranslate.push({ key: 'mangal', text: details.mangal.explanation });
    }
    if (details.kaalSarp?.explanation) {
      explanationsToTranslate.push({ key: 'kaalSarp', text: details.kaalSarp.explanation });
    }
    if (details.pitra?.explanation) {
      explanationsToTranslate.push({ key: 'pitra', text: details.pitra.explanation });
    }
    if (details.sadeSati?.explanation) {
      explanationsToTranslate.push({ key: 'sadeSati', text: details.sadeSati.explanation });
    }

    if (explanationsToTranslate.length === 0) return;

    const translateAll = async () => {
      setIsTranslating(true);
      const translations: Record<string, string> = {};

      for (const { key, text } of explanationsToTranslate) {
        try {
          const { data, error } = await supabase.functions.invoke('translate-dosha', {
            body: { text }
          });

          if (error) {
            console.error(`Failed to translate ${key}:`, error);
            translations[key] = text; // Fallback to English
          } else {
            translations[key] = data.translatedText;
          }
        } catch (err) {
          console.error(`Error translating ${key}:`, err);
          translations[key] = text; // Fallback to English
        }
      }

      setTranslatedExplanations(translations);
      setIsTranslating(false);
    };

    translateAll();
  }, [isHindi, details]);

  useEffect(() => {
    // Scroll to status message when component mounts
    if (statusMessageRef.current) {
      // Use scrollIntoView with slight delay so the heading is clearly visible
      setTimeout(() => {
        statusMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 150);
    }

    // Fetch latest pujas
    setIsLoadingPujas(true);
    fetchSriMandirPujas()
      .then(setPujas)
      .finally(() => setIsLoadingPujas(false));

    // Set up hourly refresh
    const intervalId = setInterval(() => {
      fetchSriMandirPujas().then(setPujas);
    }, 60 * 60 * 1000); // 1 hour

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

  const getSeverityColor = (severity?: string) => {
    const s = (severity || '').toLowerCase();
    switch (s) {
      case 'high':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'low':
        return 'bg-accent/10 text-accent-foreground border-accent/20';
      default:
        return 'bg-muted text-muted-foreground border-muted/20';
    }
  };

  const getStatusIcon = (status?: string) => {
    if (!status) {
      return <CheckCircle className="w-4 h-4 mr-1 text-success" />;
    }
    const s = status.toLowerCase();
    if (s === 'present' || s === 'partial' || s.includes('active')) {
      return <AlertTriangle className="w-4 h-4 mr-1" />;
    }
    return <CheckCircle className="w-4 h-4 mr-1 text-success" />;
  };

  // Helpers: translate status and placements for Hindi
  const translateStatus = (status?: string) => {
    if (!status) return '';
    const key = status.toLowerCase();
    
    // Handle nullified status
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
      Sun: 'सूर्य',
      Moon: 'चंद्र',
      Mars: 'मंगल',
      Mercury: 'बुध',
      Jupiter: 'गुरु',
      Venus: 'शुक्र',
      Saturn: 'शनि',
      Rahu: 'राहु',
      Ketu: 'केतु',
    };
    const signMap: Record<string, string> = {
      Aries: 'मेष',
      Taurus: 'वृषभ',
      Gemini: 'मिथुन',
      Cancer: 'कर्क',
      Leo: 'सिंह',
      Virgo: 'कन्या',
      Libra: 'तुला',
      Scorpio: 'वृश्चिक',
      Sagittarius: 'धनु',
      Capricorn: 'मकर',
      Aquarius: 'कुंभ',
      Pisces: 'मीन',
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

  // Check if any doshas are present (including other doshas)
  const hasAnyDosha = 
    (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) ||
    isDoshaPresent(summary.kaalSarp) ||
    isDoshaPresent(summary.pitra) ||
    isDoshaPresent(summary.shaniSadeSati) ||
    isDoshaPresent(summary.grahan) ||
    isDoshaPresent(summary.shrapit) ||
    isDoshaPresent(summary.guruChandal) ||
    isDoshaPresent(summary.punarphoo) ||
    isDoshaPresent(summary.kemadruma) ||
    isDoshaPresent(summary.gandmool) ||
    isDoshaPresent(summary.kalathra) ||
    isDoshaPresent(summary.vishDaridra) ||
    isDoshaPresent(summary.ketuNaga);

  // Track book puja click by calculationId first, then by latest visitor_id row
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

      // 1) Try to update by calculationId if we have it
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

      // 2) If that failed or no calculationId, update latest row for this visitor
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
        // 3) Fallback: log in analytics_events so we still capture intent
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
        console.log('Book puja tracked for calculation/visitor:', calculationId, visitorId);
      }
    } catch (err) {
      console.error('Failed to track book puja:', err);
    }
  };

  return (
    <div ref={resultsRef} className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {/* Status Chips Summary Section */}
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
        
        <CardContent className={`space-y-2 ${hasAnyDosha ? 'pt-2' : ''}`}>
          {/* Check if any doshas are present */}
          {(() => {
            
            if (!hasAnyDosha) {
              return (
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
              );
            }
            
            return (
              <>

                {/* Dosha Cards with Integrated Puja Remedies - Max 3 */}
                {(() => {
                  // Define major doshas in priority order
                  const majorDoshas: Array<{ 
                    type: 'mangal' | 'kaal-sarp' | 'pitra' | 'shani'; 
                    label: string;
                    icon: typeof Flame;
                    description: string;
                    impact: string;
                  }> = [];
                  const otherDoshas: Array<{ 
                    type: 'rahu' | 'shrapit' | 'guru-chandal' | 'navagraha' | 'vishDaridra' | 'punarphoo' | 'kemadruma' | 'gandmool' | 'kalathra' | 'ketuNaga'; 
                    label: string;
                    description: string;
                    impact: string;
                  }> = [];
                  
                  // Check major doshas first (exclude nullified)
                  if (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) {
                    majorDoshas.push({ 
                      type: 'mangal', 
                      label: t('doshaResults.mangal.name'),
                      icon: Flame,
                      description: t('doshaResults.mangal.description'),
                      impact: t('doshaResults.mangal.impact')
                    });
                  }
                  if (isDoshaPresent(summary.kaalSarp)) {
                    majorDoshas.push({ 
                      type: 'kaal-sarp', 
                      label: t('doshaResults.kaalSarp.name'),
                      icon: Waves,
                      description: t('doshaResults.kaalSarp.description'),
                      impact: t('doshaResults.kaalSarp.impact')
                    });
                  }
                  if (isDoshaPresent(summary.pitra)) {
                    majorDoshas.push({ 
                      type: 'pitra', 
                      label: t('doshaResults.pitra.name'),
                      icon: Users,
                      description: t('doshaResults.pitra.description'),
                      impact: t('doshaResults.pitra.impact')
                    });
                  }
                  if (isDoshaPresent(summary.shaniSadeSati)) {
                    majorDoshas.push({ 
                      type: 'shani', 
                      label: t('doshaResults.sadeSati.name'),
                      icon: Moon,
                      description: t('doshaResults.sadeSati.description'),
                      impact: t('doshaResults.sadeSati.impact')
                    });
                  }
                  
                  // Check other doshas in priority order
                  if (summary.guruChandal && isDoshaPresent(summary.guruChandal)) {
                    otherDoshas.push({ 
                      type: 'guru-chandal', 
                      label: t('doshaResults.otherDoshas.guruChandal.name'),
                      description: t('doshaResults.otherDoshas.guruChandal.whatItIs'),
                      impact: t('doshaResults.otherDoshas.guruChandal.impact')
                    });
                  }
                  if (summary.grahan && isDoshaPresent(summary.grahan)) {
                    otherDoshas.push({ 
                      type: 'rahu', 
                      label: t('doshaResults.otherDoshas.rahuKetu.name'),
                      description: t('doshaResults.otherDoshas.rahuKetu.whatItIs'),
                      impact: t('doshaResults.otherDoshas.rahuKetu.impact')
                    });
                  }
                  if (summary.shrapit && isDoshaPresent(summary.shrapit)) {
                    otherDoshas.push({ 
                      type: 'shrapit', 
                      label: t('doshaResults.otherDoshas.shrapit.name'),
                      description: t('doshaResults.otherDoshas.shrapit.whatItIs'),
                      impact: t('doshaResults.otherDoshas.shrapit.impact')
                    });
                  }
                  if (isDoshaPresent(summary.vishDaridra)) {
                    otherDoshas.push({ 
                      type: 'vishDaridra', 
                      label: t('doshaResults.otherDoshas.vishDaridra.name'),
                      description: t('doshaResults.otherDoshas.vishDaridra.whatItIs'),
                      impact: t('doshaResults.otherDoshas.vishDaridra.impact')
                    });
                  }
                  if (isDoshaPresent(summary.punarphoo)) {
                    otherDoshas.push({ 
                      type: 'punarphoo', 
                      label: t('doshaResults.otherDoshas.punarphoo.name'),
                      description: t('doshaResults.otherDoshas.punarphoo.whatItIs'),
                      impact: t('doshaResults.otherDoshas.punarphoo.impact')
                    });
                  }
                  if (isDoshaPresent(summary.kemadruma)) {
                    otherDoshas.push({ 
                      type: 'kemadruma', 
                      label: t('doshaResults.otherDoshas.kemadruma.name'),
                      description: t('doshaResults.otherDoshas.kemadruma.whatItIs'),
                      impact: t('doshaResults.otherDoshas.kemadruma.impact')
                    });
                  }
                  if (isDoshaPresent(summary.gandmool)) {
                    otherDoshas.push({ 
                      type: 'gandmool', 
                      label: t('doshaResults.otherDoshas.gandmool.name'),
                      description: t('doshaResults.otherDoshas.gandmool.whatItIs'),
                      impact: t('doshaResults.otherDoshas.gandmool.impact')
                    });
                  }
                  if (isDoshaPresent(summary.kalathra)) {
                    otherDoshas.push({ 
                      type: 'kalathra', 
                      label: t('doshaResults.otherDoshas.kalathra.name'),
                      description: t('doshaResults.otherDoshas.kalathra.whatItIs'),
                      impact: t('doshaResults.otherDoshas.kalathra.impact')
                    });
                  }
                  if (isDoshaPresent(summary.ketuNaga)) {
                    otherDoshas.push({ 
                      type: 'ketuNaga', 
                      label: t('doshaResults.otherDoshas.ketuNaga.name'),
                      description: t('doshaResults.otherDoshas.ketuNaga.whatItIs'),
                      impact: t('doshaResults.otherDoshas.ketuNaga.impact')
                    });
                  }

                  // Combine in priority order and take max 3
                  const allActiveDoshas = [...majorDoshas, ...otherDoshas].slice(0, 3);
                  
                  if (allActiveDoshas.length === 0) return null;
                  
                  // Helper to determine if dosha has specific puja or needs Navagraha
                  const isOtherDosha = (type: string) => ['vishDaridra', 'punarphoo', 'kemadruma', 'gandmool', 'kalathra', 'ketuNaga'].includes(type);

                  return (
                    <div className="space-y-2 mt-2">
                      {/* Simple Ribbon Cards - Max 3 with just dosha names */}
                      <div className="grid grid-cols-1 gap-1.5">
                        {allActiveDoshas.map((dosha, index) => (
                          <div 
                            key={dosha.type} 
                            className="bg-gradient-to-r from-primary/10 to-accent/10 border-l-4 border-primary px-3 py-2 rounded-md"
                          >
                            <p className="font-bold text-sm text-foreground">
                              {dosha.label}
                            </p>
                          </div>
                        ))}
                      </div>

                      {/* Puja Remedies Section - Separate from dosha ribbons */}
                      {!isLoadingPujas && (
                        <>
                          {pujaDisplayVariant === 'carousel' ? (
                            // CAROUSEL VARIANT - Auto-rotating carousel of dosha + puja pairs
                            <DoshaPujaCarousel
                              items={allActiveDoshas.map((dosha) => {
                                const filtered = filterPujasByDosha(pujas, dosha.type);
                                let pujaToShow: SriMandirPuja | null = null;
                                
                                if (dosha.type === 'pitra') {
                                  pujaToShow = getPrioritizedPuja(filtered, 'pitra');
                                } else if (dosha.type === 'shani') {
                                  pujaToShow = getPrioritizedPuja(filtered, 'shani');
                                } else if (dosha.type === 'guru-chandal') {
                                  pujaToShow = getPrioritizedPuja(filtered, dosha.type);
                                } else if (dosha.type === 'mangal') {
                                  pujaToShow = getPrioritizedPuja(filtered, 'mangal');
                                } else if (isOtherDosha(dosha.type)) {
                                  pujaToShow = getPrioritizedPuja(filtered, 'navagraha');
                                } else {
                                  const priorityKeywordsMap: Record<string, string[]> = {
                                    'kaal-sarp': ['kaal sarp dosha', 'काल सर्प दोष'],
                                    rahu: ['grahan', 'rahu', 'ग्रहण', 'राहु'],
                                    shrapit: ['shrapit', 'श्रापित'],
                                  };
                                  const keywords = priorityKeywordsMap[dosha.type] || [];
                                  pujaToShow = getUpcomingPujas(filtered, 1, keywords)[0] || null;
                                }
                                
                                return {
                                  dosha: {
                                    type: dosha.type,
                                    label: dosha.label,
                                  },
                                  puja: pujaToShow!,
                                  isOtherDosha: isOtherDosha(dosha.type),
                                };
                              }).filter(item => item.puja !== null)}
                              onBookPujaClick={async (doshaType: string) => {
                                await trackBookPujaClick(doshaType);
                              }}
                            />
                          ) : (
                            // CONTROL VARIANT - Static vertical cards
                            <div className="mt-3 space-y-3">
                              <div className="text-center space-y-3">
                                <h3 className="text-xl font-semibold">
                                  {isHindi ? 'आपके लिए उपाय' : 'Remedies For You'}
                                </h3>
                                <div className="p-3 bg-accent/10 rounded-md border border-accent/30">
                                  <p className="text-sm font-medium">
                                    {isHindi 
                                      ? '🪔 वैदिक ऑनलाइन पूजा इन दोषों के नकारात्मक प्रभावों को कम करने का एक शक्तिशाली तरीका है।'
                                      : '🪔 Vedic online puja offers a powerful way to reduce the negative effects of these doshas.'}
                                  </p>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {isHindi ? 'आपके दोषों के लिए अनुशंसित पूजा' : 'Recommended pujas for your doshas'}
                                </p>
                              </div>
                              
                              {allActiveDoshas.map((dosha) => {
                                const filtered = filterPujasByDosha(pujas, dosha.type);
                                
                                // Get prioritized puja
                                let pujaToShow: SriMandirPuja | null = null;
                                
                                if (dosha.type === 'pitra') {
                                  pujaToShow = getPrioritizedPuja(filtered, 'pitra');
                                } else if (dosha.type === 'shani') {
                                  pujaToShow = getPrioritizedPuja(filtered, 'shani');
                                } else if (dosha.type === 'guru-chandal') {
                                  pujaToShow = getPrioritizedPuja(filtered, dosha.type);
                                } else if (dosha.type === 'mangal') {
                                  pujaToShow = getPrioritizedPuja(filtered, 'mangal');
                                } else if (isOtherDosha(dosha.type)) {
                                  pujaToShow = getPrioritizedPuja(filtered, 'navagraha');
                                } else {
                                  const priorityKeywordsMap: Record<string, string[]> = {
                                    'kaal-sarp': ['kaal sarp dosha', 'काल सर्प दोष'],
                                    rahu: ['grahan', 'rahu', 'ग्रहण', 'राहु'],
                                    shrapit: ['shrapit', 'श्रापित'],
                                  };
                                  const keywords = priorityKeywordsMap[dosha.type] || [];
                                  pujaToShow = getUpcomingPujas(filtered, 1, keywords)[0] || null;
                                }
                                
                                if (!pujaToShow) return null;
                                
                                return (
                                  <div key={dosha.type} className="space-y-3">
                                    <h4 className="font-semibold text-base text-foreground">
                                      {isHindi ? 'इसके लिए:' : 'For:'} {dosha.label}
                                    </h4>
                                    {isOtherDosha(dosha.type) && (
                                      <div className="p-3 bg-accent/10 rounded-md border border-accent/30">
                                        <p className="text-xs text-muted-foreground italic">
                                          {isHindi 
                                            ? 'इस दोष के लिए अभी हमारे पास विशिष्ट पूजा उपलब्ध नहीं है, लेकिन समग्र कल्याण के लिए नवग्रह शांति पूजा करवाएं।'
                                            : 'We don\'t have specific pujas for this dosha yet, but you can perform Navagraha Shanti Puja for overall well-being.'}
                                        </p>
                                      </div>
                                    )}
                                    <SriMandirPujaVerticalCard 
                                      puja={pujaToShow} 
                                      doshaType={dosha.type}
                                      onBookClick={async () => {
                                        await trackBookPujaClick(dosha.type);
                                      }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}

                      {isLoadingPujas && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3 mt-8">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">
                            {isHindi ? 'उपाय लोड हो रहे हैं...' : 'Loading remedies...'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            );
          })()}
        </CardContent>
      </Card>

      {/* Detailed Analysis Section */}
      <Card className="spiritual-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center gradient-spiritual bg-clip-text text-transparent">
            {t('doshaResults.detailedAnalysis')}
          </CardTitle>
          <CardDescription className="text-center">
            {t('doshaResults.basedOnChart')}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Accordion type="single" collapsible className="w-full space-y-4">
          {/* Mangal Dosha Details */}
          <AccordionItem value="mangal" className="border rounded-lg px-4">
            <AccordionTrigger 
              className="hover:no-underline"
              onClick={() => trackEvent('accordion_expanded', {
                metadata: { section: 'mangal_dosha', status: summary.mangal }
              })}
            >
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
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary space-y-2">
                <p className="text-sm text-muted-foreground italic">{t('doshaResults.mangal.description')}</p>
                <p className="text-sm text-muted-foreground font-medium">{t('doshaResults.mangal.impact')}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('doshaResults.educationalTool')}
                </p>
              </div>
              
              {details.mangal && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {t('doshaResults.explanation')}
                    </h4>
                    {isTranslating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>अनुवाद हो रहा है...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isHindi ? (translatedExplanations.mangal || details.mangal.explanation) : details.mangal.explanation}
                      </p>
                    )}
                  </div>

                  {details.mangal.placements && details.mangal.placements.length > 0 && (
                    <div className="p-3 bg-accent/10 rounded-md border border-accent/20">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {t('doshaResults.planetaryPositions')}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                        {details.mangal.placements.map((p, i) => (
                          <li key={i} className="leading-relaxed">{translatePlacement(p)}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        {isHindi 
                          ? 'ये ग्रहों की स्थितियां मंगल दोष की उपस्थिति का कारण हैं।'
                          : 'These planetary positions are the basis for Mangal Dosha detection.'}
                      </p>
                    </div>
                  )}

                  {details.mangal.notes && details.mangal.notes.length > 0 && (
                    <div className="p-3 bg-accent/20 rounded-md">
                      {details.mangal.notes.map((note, i) => (
                        <p key={i} className="text-sm">{note}</p>
                      ))}
                    </div>
                  )}

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        {t('doshaResults.traditionalRemedies')}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {(t('doshaResults.mangal.remedies', { returnObjects: true }) as string[]).map((remedy: string, i: number) => (
                          <li key={i}>{remedy}</li>
                        ))}
                      </ul>
                    </div>

                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Kaal Sarp Dosha Details */}
          <AccordionItem value="kaalSarp" className="border rounded-lg px-4">
            <AccordionTrigger 
              className="hover:no-underline"
              onClick={() => trackEvent('accordion_expanded', {
                metadata: { section: 'kaal_sarp_dosha', status: summary.kaalSarp }
              })}
            >
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
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary space-y-2">
                <p className="text-sm text-muted-foreground italic">{t('doshaResults.kaalSarp.description')}</p>
                <p className="text-sm text-muted-foreground font-medium">{t('doshaResults.kaalSarp.impact')}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('doshaResults.educationalTool')}
                </p>
              </div>
              
              {details.kaalSarp && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {t('doshaResults.explanation')}
                    </h4>
                    {isTranslating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>अनुवाद हो रहा है...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isHindi ? (translatedExplanations.kaalSarp || details.kaalSarp.explanation) : details.kaalSarp.explanation}
                      </p>
                    )}
                  </div>

                  {details.kaalSarp.placements && details.kaalSarp.placements.length > 0 && (
                    <div className="p-3 bg-accent/10 rounded-md border border-accent/20">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {t('doshaResults.planetaryPositions')}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                        {details.kaalSarp.placements.map((p, i) => (
                          <li key={i} className="leading-relaxed">{translatePlacement(p)}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        {isHindi 
                          ? 'सभी सात ग्रह राहु और केतु के बीच फंसे हैं, जो काल सर्प दोष का संकेत देता है।'
                          : 'All seven planets are trapped between Rahu and Ketu, indicating Kaal Sarp Dosha.'}
                      </p>
                    </div>
                  )}

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Waves className="w-4 h-4" />
                        {t('doshaResults.traditionalRemedies')}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {(t('doshaResults.kaalSarp.remedies', { returnObjects: true }) as string[]).map((remedy: string, i: number) => (
                          <li key={i}>{remedy}</li>
                        ))}
                      </ul>
                    </div>

                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Pitra Dosha Details */}
          <AccordionItem value="pitra" className="border rounded-lg px-4">
            <AccordionTrigger 
              className="hover:no-underline"
              onClick={() => trackEvent('accordion_expanded', {
                metadata: { section: 'pitra_dosha', status: summary.pitra }
              })}
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">{t('doshaResults.pitra.name')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('doshaResults.status')}: {translateStatus(summary.pitra)}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary space-y-2">
                <p className="text-sm text-muted-foreground italic">{t('doshaResults.pitra.description')}</p>
                <p className="text-sm text-muted-foreground font-medium">{t('doshaResults.pitra.impact')}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('doshaResults.educationalTool')}
                </p>
              </div>
              
              {details.pitra && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {t('doshaResults.explanation')}
                    </h4>
                    {isTranslating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>अनुवाद हो रहा है...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isHindi ? (translatedExplanations.pitra || details.pitra.explanation) : details.pitra.explanation}
                      </p>
                    )}
                  </div>

                  {details.pitra.placements && details.pitra.placements.length > 0 && (
                    <div className="p-3 bg-accent/10 rounded-md border border-accent/20">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {t('doshaResults.planetaryPositions')}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                        {details.pitra.placements.map((p, i) => (
                          <li key={i} className="leading-relaxed">{translatePlacement(p)}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        {isHindi 
                          ? '9वें भाव या सूर्य के साथ राहु/केतु का संबंध पितृ दोष का संकेत देता है।'
                          : 'Affliction of 9th house or Sun by Rahu/Ketu indicates Pitra Dosha.'}
                      </p>
                    </div>
                  )}

                  <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t('doshaResults.traditionalRemedies')}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {(t('doshaResults.pitra.remedies', { returnObjects: true }) as string[]).map((remedy: string, i: number) => (
                          <li key={i}>{remedy}</li>
                        ))}
                      </ul>
                    </div>

                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Sade Sati Details */}
          <AccordionItem value="sadeSati" className="border rounded-lg px-4">
            <AccordionTrigger 
              className="hover:no-underline"
              onClick={() => trackEvent('accordion_expanded', {
                metadata: { section: 'sade_sati', status: summary.shaniSadeSati }
              })}
            >
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-warning" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">{t('doshaResults.sadeSati.name')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('doshaResults.status')}: {translateStatus(summary.shaniSadeSati)}
                    {summary.shaniPhase && ` • ${t('doshaResults.phase')}: ${summary.shaniPhase}`}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary space-y-2">
                <p className="text-sm text-muted-foreground italic">{t('doshaResults.sadeSati.description')}</p>
                <p className="text-sm text-muted-foreground font-medium">{t('doshaResults.sadeSati.impact')}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('doshaResults.educationalTool')}
                </p>
              </div>
              
              {details.sadeSati && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      {t('doshaResults.explanation')}
                    </h4>
                    {isTranslating ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>अनुवाद हो रहा है...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {isHindi ? (translatedExplanations.sadeSati || details.sadeSati.explanation) : details.sadeSati.explanation}
                      </p>
                    )}
                  </div>

                  {details.sadeSati.placements && details.sadeSati.placements.length > 0 && (
                    <div className="p-3 bg-accent/10 rounded-md border border-accent/20">
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4" />
                        {t('doshaResults.planetaryPositions')}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
                        {details.sadeSati.placements.map((p, i) => (
                          <li key={i} className="leading-relaxed">{translatePlacement(p)}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-muted-foreground mt-3 italic">
                        {isHindi 
                          ? 'शनि का चंद्रमा की राशि से संबंध साढ़े साती का संकेत देता है।'
                          : 'Saturn\'s transit relative to Moon sign indicates Sade Sati phase.'}
                      </p>
                    </div>
                  )}

                  {details.sadeSati.notes && details.sadeSati.notes.length > 0 && (
                    <div className="p-3 bg-accent/20 rounded-md">
                      {details.sadeSati.notes.map((note, i) => (
                        <p key={i} className="text-sm">{note}</p>
                      ))}
                    </div>
                  )}

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        {t('doshaResults.traditionalRemedies')}
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {(t('doshaResults.sadeSati.remedies', { returnObjects: true }) as string[]).map((remedy: string, i: number) => (
                          <li key={i}>{remedy}</li>
                        ))}
                      </ul>
                    </div>

                </>
              )}
            </AccordionContent>
          </AccordionItem>
          </Accordion>

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


          {/* Sri Mandir Offered Other Remedies */}
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
                activeDoshas: [
                  summary.mangal === 'present' && 'Mangal Dosha',
                  summary.kaalSarp === 'present' && 'Kaal Sarp Dosha',
                  summary.pitra === 'present' && 'Pitra Dosha',
                  summary.shaniSadeSati === 'active' && 'Sade Sati'
                ].filter(Boolean),
                recommendedPujas: (() => {
                  const activeDoshas = [];
                  const isDoshaPresent = (status: string) => status === 'present' || status?.includes('present');
                  
                  if (isDoshaPresent(summary.mangal)) activeDoshas.push({ type: 'mangal', label: isHindi ? 'मंगल दोष' : 'Mangal Dosha' });
                  if (isDoshaPresent(summary.kaalSarp)) activeDoshas.push({ type: 'kaal-sarp', label: isHindi ? 'काल सर्प दोष' : 'Kaal Sarp Dosha' });
                  if (isDoshaPresent(summary.pitra)) activeDoshas.push({ type: 'pitra', label: isHindi ? 'पितृ दोष' : 'Pitra Dosha' });
                  if (isDoshaPresent(summary.shaniSadeSati)) activeDoshas.push({ type: 'shani', label: isHindi ? 'शनि साढ़े साती' : 'Shani Sade Sati' });
                  if (isDoshaPresent(summary.guruChandal)) activeDoshas.push({ type: 'guru-chandal', label: isHindi ? 'गुरु चांडाल दोष' : 'Guru Chandal Dosha' });
                  if (isDoshaPresent(summary.vishDaridra)) activeDoshas.push({ type: 'vishDaridra', label: isHindi ? 'विश दरिद्र योग' : 'Vish Daridra Yoga' });
                  if (isDoshaPresent(summary.punarphoo)) activeDoshas.push({ type: 'punarphoo', label: isHindi ? 'पुनर्फू दोष' : 'Punarphoo Dosha' });
                  if (isDoshaPresent(summary.kemadruma)) activeDoshas.push({ type: 'kemadruma', label: isHindi ? 'केमद्रुम योग' : 'Kemadruma Yoga' });
                  if (isDoshaPresent(summary.gandmool)) activeDoshas.push({ type: 'gandmool', label: isHindi ? 'गंडमूल दोष' : 'Gandmool Dosha' });
                  if (isDoshaPresent(summary.kalathra)) activeDoshas.push({ type: 'kalathra', label: isHindi ? 'कलत्र दोष' : 'Kalathra Dosha' });
                  if (isDoshaPresent(summary.ketuNaga)) activeDoshas.push({ type: 'ketuNaga', label: isHindi ? 'केतु नाग दोष' : 'Ketu Naga Dosha' });
                  
                  // Take max 3 and map to pujas
                  return activeDoshas.slice(0, 3).map(dosha => {
                    const filtered = filterPujasByDosha(pujas, dosha.type);
                    let puja: SriMandirPuja | null = null;
                    
                    if (dosha.type === 'pitra') {
                      puja = getPrioritizedPuja(filtered, 'pitra');
                    } else if (dosha.type === 'shani') {
                      puja = getPrioritizedPuja(filtered, 'shani');
                    } else if (dosha.type === 'guru-chandal') {
                      puja = getPrioritizedPuja(filtered, 'guru-chandal');
                    } else if (['vishDaridra', 'punarphoo', 'kemadruma', 'gandmool', 'kalathra', 'ketuNaga'].includes(dosha.type)) {
                      puja = getPrioritizedPuja(filtered, 'navagraha');
                    } else {
                      const priorityKeywordsMap: Record<string, string[]> = {
                        mangal: ['manglik', 'mangal dosha', 'मंगलिक', 'मंगल दोष'],
                        'kaal-sarp': ['kaal sarp dosha', 'काल सर्प दोष'],
                      };
                      const keywords = priorityKeywordsMap[dosha.type] || [];
                      puja = getUpcomingPujas(filtered, 1, keywords)[0] || null;
                    }
                    
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
                  });
                })()
              }}
            />
          </div>

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-accent/10 border border-accent/30 rounded-md">
            <p className="text-xs text-muted-foreground">
              {t('doshaResults.disclaimer')}
            </p>
          </div>
        </CardContent>
      </Card>
      
      {/* Callback Floater - appears after calculation */}
      <CallbackFloater calculationId={calculationId} />
    </div>
  );
};
