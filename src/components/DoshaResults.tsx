import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Info, Flame, Waves, Users, Moon, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SriMandirPujaCarousel } from '@/components/SriMandirPujaCarousel';
import { fetchSriMandirPujas, filterPujasByDosha, getUpcomingPujas, SriMandirPuja } from '@/utils/sriMandirPujas';
import { OtherDoshas } from '@/components/OtherDoshas';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import AstrologyChatbot from '@/components/AstrologyChatbot';
import { supabase } from '@/integrations/supabase/client';

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

const DoshaResults = ({ summary, details, calculationId }: DoshaResultsProps) => {
  const { t, i18n } = useTranslation();
  const [pujas, setPujas] = useState<SriMandirPuja[]>([]);
  const [isLoadingPujas, setIsLoadingPujas] = useState(true);
  const [hasTrackedBookPuja, setHasTrackedBookPuja] = useState(false);
  const isHindi = (i18n.language ? i18n.language.toLowerCase() : '').startsWith('hi');

  useEffect(() => {
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
    return s === 'present' || s === 'active';
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
    if (s === 'present' || s.includes('active')) {
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

  // Check if any doshas are present
  const hasAnyDosha = 
    (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) ||
    isDoshaPresent(summary.kaalSarp) ||
    isDoshaPresent(summary.pitra) ||
    isDoshaPresent(summary.shaniSadeSati);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {/* Status Chips Summary Section */}
      <Card className="spiritual-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold gradient-spiritual bg-clip-text text-transparent">
            {hasAnyDosha 
              ? (isHindi ? 'आपके कुछ दोष पाए गए हैं' : 'Some Doshas Have Been Detected')
              : (isHindi ? 'कोई प्रमुख दोष नहीं मिला' : 'No Major Doshas Found')
            }
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
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
                {/* Top Doshas Display (Hindi Bold) */}
                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-foreground">
                    {isHindi ? (
                      <>
                        {isDoshaPresent(summary.shaniSadeSati) && 'शनि दोष'}
                        {isDoshaPresent(summary.shaniSadeSati) && (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) && ' | '}
                        {(isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) && 'मंगल दोष'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal))) && isDoshaPresent(summary.kaalSarp) && ' | '}
                        {isDoshaPresent(summary.kaalSarp) && 'कालसर्प दोष'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp)) && isDoshaPresent(summary.pitra) && ' | '}
                        {isDoshaPresent(summary.pitra) && 'पितृ दोष'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp) || isDoshaPresent(summary.pitra)) && isDoshaPresent(summary.vishDaridra) && ' | '}
                        {isDoshaPresent(summary.vishDaridra) && 'विष/दारिद्र्य योग'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp) || isDoshaPresent(summary.pitra) || isDoshaPresent(summary.vishDaridra)) && isDoshaPresent(summary.grahan) && ' | '}
                        {isDoshaPresent(summary.grahan) && 'ग्रहण दोष'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp) || isDoshaPresent(summary.pitra) || isDoshaPresent(summary.vishDaridra) || isDoshaPresent(summary.grahan)) && isDoshaPresent(summary.shrapit) && ' | '}
                        {isDoshaPresent(summary.shrapit) && 'श्रापित दोष'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp) || isDoshaPresent(summary.pitra) || isDoshaPresent(summary.vishDaridra) || isDoshaPresent(summary.grahan) || isDoshaPresent(summary.shrapit)) && isDoshaPresent(summary.guruChandal) && ' | '}
                        {isDoshaPresent(summary.guruChandal) && 'गुरु चांडाल दोष'}
                      </>
                    ) : (
                      <>
                        {isDoshaPresent(summary.shaniSadeSati) && 'Shani Dosha'}
                        {isDoshaPresent(summary.shaniSadeSati) && (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) && ' | '}
                        {(isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) && 'Mangal Dosha'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal))) && isDoshaPresent(summary.kaalSarp) && ' | '}
                        {isDoshaPresent(summary.kaalSarp) && 'Kaal Sarp Dosha'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp)) && isDoshaPresent(summary.pitra) && ' | '}
                        {isDoshaPresent(summary.pitra) && 'Pitra Dosha'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp) || isDoshaPresent(summary.pitra)) && isDoshaPresent(summary.vishDaridra) && ' | '}
                        {isDoshaPresent(summary.vishDaridra) && 'Vish/Daridra Yoga'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp) || isDoshaPresent(summary.pitra) || isDoshaPresent(summary.vishDaridra)) && isDoshaPresent(summary.grahan) && ' | '}
                        {isDoshaPresent(summary.grahan) && 'Grahan Dosha'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp) || isDoshaPresent(summary.pitra) || isDoshaPresent(summary.vishDaridra) || isDoshaPresent(summary.grahan)) && isDoshaPresent(summary.shrapit) && ' | '}
                        {isDoshaPresent(summary.shrapit) && 'Shrapit Dosha'}
                        {(isDoshaPresent(summary.shaniSadeSati) || (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) || isDoshaPresent(summary.kaalSarp) || isDoshaPresent(summary.pitra) || isDoshaPresent(summary.vishDaridra) || isDoshaPresent(summary.grahan) || isDoshaPresent(summary.shrapit)) && isDoshaPresent(summary.guruChandal) && ' | '}
                        {isDoshaPresent(summary.guruChandal) && 'Guru Chandal Dosha'}
                      </>
                    )}
                  </p>
                  {(isDoshaPresent(summary.punarphoo) || isDoshaPresent(summary.kemadruma) || isDoshaPresent(summary.gandmool) || isDoshaPresent(summary.kalathra) || isDoshaPresent(summary.ketuNaga)) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {isHindi ? '(अधिक दोष)' : '(More Doshas)'}
                    </p>
                  )}
                </div>

                {/* Combined Summary (Hindi - Emotional, Short) - Personalized */}
                <div className="p-4 bg-muted/30 rounded-lg border border-border/50 mb-6">
                  <p className="text-sm text-foreground leading-relaxed">
                    {(() => {
                      const activeDoshasList = [];
                      if (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) activeDoshasList.push({ key: 'mangal', hi: 'मंगल दोष', en: 'Mangal Dosha', effect: { hi: 'विवाह और रिश्तों में', en: 'marriage and relationships' } });
                      if (isDoshaPresent(summary.kaalSarp)) activeDoshasList.push({ key: 'kaalSarp', hi: 'कालसर्प दोष', en: 'Kaal Sarp Dosha', effect: { hi: 'करियर और मानसिक शांति में', en: 'career and mental peace' } });
                      if (isDoshaPresent(summary.pitra)) activeDoshasList.push({ key: 'pitra', hi: 'पितृ दोष', en: 'Pitra Dosha', effect: { hi: 'परिवार और संतान में', en: 'family and progeny' } });
                      if (isDoshaPresent(summary.shaniSadeSati)) activeDoshasList.push({ key: 'shani', hi: 'साढ़े साती', en: 'Sade Sati', effect: { hi: 'जीवन के सभी क्षेत्रों में', en: 'all areas of life' } });
                      if (isDoshaPresent(summary.vishDaridra)) activeDoshasList.push({ key: 'vishDaridra', hi: 'विष/दारिद्र्य योग', en: 'Vish/Daridra Yoga', effect: { hi: 'धन और समृद्धि में', en: 'wealth and prosperity' } });
                      if (isDoshaPresent(summary.grahan)) activeDoshasList.push({ key: 'grahan', hi: 'ग्रहण दोष', en: 'Grahan Dosha', effect: { hi: 'मानसिक स्वास्थ्य और स्पष्टता में', en: 'mental health and clarity' } });
                      if (isDoshaPresent(summary.shrapit)) activeDoshasList.push({ key: 'shrapit', hi: 'श्रापित दोष', en: 'Shrapit Dosha', effect: { hi: 'जीवन की प्रगति में', en: 'life progress' } });
                      if (isDoshaPresent(summary.guruChandal)) activeDoshasList.push({ key: 'guruChandal', hi: 'गुरु चांडाल दोष', en: 'Guru Chandal Dosha', effect: { hi: 'ज्ञान और आध्यात्मिकता में', en: 'wisdom and spirituality' } });
                      if (isDoshaPresent(summary.punarphoo)) activeDoshasList.push({ key: 'punarphoo', hi: 'पुनर्फू दोष', en: 'Punarphoo Dosha', effect: { hi: 'भावनात्मक स्थिरता में', en: 'emotional stability' } });
                      if (isDoshaPresent(summary.kemadruma)) activeDoshasList.push({ key: 'kemadruma', hi: 'केमद्रुम योग', en: 'Kemadruma Yoga', effect: { hi: 'मानसिक शांति में', en: 'mental peace' } });
                      if (isDoshaPresent(summary.gandmool)) activeDoshasList.push({ key: 'gandmool', hi: 'गंडमूल दोष', en: 'Gandmool Dosha', effect: { hi: 'स्वास्थ्य में', en: 'health' } });
                      if (isDoshaPresent(summary.kalathra)) activeDoshasList.push({ key: 'kalathra', hi: 'कलत्र दोष', en: 'Kalathra Dosha', effect: { hi: 'वैवाहिक जीवन में', en: 'married life' } });
                      if (isDoshaPresent(summary.ketuNaga)) activeDoshasList.push({ key: 'ketuNaga', hi: 'केतु नाग दोष', en: 'Ketu Naga Dosha', effect: { hi: 'आध्यात्मिक विकास में', en: 'spiritual growth' } });

                      if (activeDoshasList.length === 0) return null;

                      if (isHindi) {
                        const doshaNames = activeDoshasList.map(d => d.hi).join(', ');
                        const effects = activeDoshasList.map(d => d.effect.hi).join(', ');
                        return `आपकी कुंडली में ${doshaNames} पाए गए हैं, जो ${effects} रुकावटें, तनाव या देरी का कारण बन सकते हैं। लेकिन सही वैदिक उपाय से इनका प्रभाव कम किया जा सकता है।`;
                      } else {
                        const doshaNames = activeDoshasList.map(d => d.en).join(', ');
                        const effects = activeDoshasList.map(d => d.effect.en).join(', ');
                        return `Your birth chart shows ${doshaNames}, which may cause obstacles, stress or delays in ${effects}. However, their effects can be reduced with proper Vedic remedies.`;
                      }
                    })()}
                  </p>
                </div>

                {/* Remedies For You - Moved here from below */}
                {(() => {
                  const activeDoshas: Array<{ type: 'mangal' | 'kaal-sarp' | 'pitra' | 'shani' | 'rahu' | 'shrapit' | 'guru-chandal'; label: string }> = [];
                  
                  // Check each dosha and add to list if present/active (exclude nullified)
                  if (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) {
                    activeDoshas.push({ type: 'mangal', label: isHindi ? 'मंगल दोष' : 'Mangal Dosha' });
                  }
                  if (isDoshaPresent(summary.kaalSarp)) {
                    activeDoshas.push({ type: 'kaal-sarp', label: isHindi ? 'काल सर्प दोष' : 'Kaal Sarp Dosha' });
                  }
                  if (isDoshaPresent(summary.pitra)) {
                    activeDoshas.push({ type: 'pitra', label: isHindi ? 'पितृ दोष' : 'Pitra Dosha' });
                  }
                  if (isDoshaPresent(summary.shaniSadeSati)) {
                    activeDoshas.push({ type: 'shani', label: isHindi ? 'शनि साढ़े साती' : 'Shani Sade Sati' });
                  }
                  if (summary.grahan && isDoshaPresent(summary.grahan)) {
                    activeDoshas.push({ type: 'rahu', label: isHindi ? 'राहु दोष' : 'Rahu Dosha' });
                  }
                  if (summary.shrapit && isDoshaPresent(summary.shrapit)) {
                    activeDoshas.push({ type: 'shrapit', label: isHindi ? 'श्रापित दोष' : 'Shrapit Dosha' });
                  }
                  if (summary.guruChandal && isDoshaPresent(summary.guruChandal)) {
                    activeDoshas.push({ type: 'guru-chandal', label: isHindi ? 'गुरु चांडाल दोष' : 'Guru Chandal Dosha' });
                  }

                  // Get personalized pujas for each active dosha
                  const personalizedPujas: SriMandirPuja[] = [];
                  activeDoshas.forEach(dosha => {
                    const filtered = filterPujasByDosha(pujas, dosha.type);
                    const upcoming = getUpcomingPujas(filtered, 3); // Get up to 3 pujas per dosha
                    personalizedPujas.push(...upcoming);
                  });

                  // Remove duplicates based on store_id
                  const uniquePersonalizedPujas = personalizedPujas.filter(
                    (puja, index, self) => index === self.findIndex(p => p.store_id === puja.store_id)
                  );

                  return (
                    <div className="mt-6 space-y-4">
                      <div className="text-center space-y-3">
                        <h3 className="text-2xl font-bold">
                          {isHindi ? '🪔 आपके लिए उपाय' : '🪔 Remedies For You'}
                        </h3>
                        
                        <div className="max-w-2xl mx-auto">
                          {isHindi ? (
                            <>
                              <p className="text-sm text-foreground leading-relaxed mb-2">
                                वैदिक ऑनलाइन पूजा इन दोषों के नकारात्मक प्रभावों को कम करने का एक शक्तिशाली तरीका है।
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                हमारे पंडित आपके नाम, गोत्र और जन्म विवरण के साथ पूरी विधि करते हैं, हर वैदिक चरण को प्रामाणिकता और भक्ति के साथ पूरा करते हैं।
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm text-foreground leading-relaxed mb-2">
                                Vedic online puja offers a powerful way to reduce the negative effects of these doshas.
                              </p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                Our pandits perform the complete ritual with your name, gotra and birth details, following every Vedic step with authenticity and devotion.
                              </p>
                            </>
                          )}
                        </div>

                        <p className="text-base font-medium text-foreground pt-2">
                          {isHindi ? '📿 यह पूजा आपके दोष निवारण के लिए सबसे उपयुक्त है।' : '📿 Here is the puja best suited for your dosha relief.'}
                        </p>
                      </div>
                      
                      {isLoadingPujas ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">
                            {isHindi ? 'उपाय लोड हो रहे हैं...' : 'Loading...'}
                          </p>
                        </div>
                      ) : uniquePersonalizedPujas.length === 0 ? null : (
                        <SriMandirPujaCarousel 
                          pujas={uniquePersonalizedPujas} 
                          doshaType="personalized"
                          calculationId={calculationId}
                          onBookPujaClick={async () => {
                            if (!hasTrackedBookPuja && calculationId) {
                              try {
                                await supabase
                                  .from('dosha_calculator2')
                                  .update({ book_puja_clicked: true })
                                  .eq('id', calculationId);
                                setHasTrackedBookPuja(true);
                                console.log('Book puja tracked for calculation:', calculationId);
                              } catch (err) {
                                console.error('Failed to track book puja:', err);
                              }
                            }
                          }}
                        />
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
                    {summary.mangalSeverity && ` • ${t('doshaResults.severity')}: ${summary.mangalSeverity}`}
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
                    <p className="text-sm text-muted-foreground">{isHindi ? t('dosha.howImpactAnswer') : details.mangal.explanation}</p>
                  </div>

                  {details.mangal.placements && details.mangal.placements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">{t('doshaResults.placements')}</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.mangal.placements.map((p, i) => (
                          <li key={i}>{translatePlacement(p)}</li>
                        ))}
                      </ul>
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
                    <p className="text-sm text-muted-foreground">{isHindi ? t('dosha.howImpactAnswer') : details.kaalSarp.explanation}</p>
                  </div>

                  {details.kaalSarp.placements && details.kaalSarp.placements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">{t('doshaResults.placements')}</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.kaalSarp.placements.map((p, i) => (
                          <li key={i}>{translatePlacement(p)}</li>
                        ))}
                      </ul>
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
                    <p className="text-sm text-muted-foreground">{isHindi ? t('dosha.howImpactAnswer') : details.pitra.explanation}</p>
                  </div>

                  {details.pitra.placements && details.pitra.placements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">{t('doshaResults.placements')}</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.pitra.placements.map((p, i) => (
                          <li key={i}>{translatePlacement(p)}</li>
                        ))}
                      </ul>
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
                    <p className="text-sm text-muted-foreground">{isHindi ? t('dosha.howImpactAnswer') : details.sadeSati.explanation}</p>
                  </div>

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
              rahuKetu: summary.grahan ? { status: summary.grahan } : undefined,
              shrapit: summary.shrapit ? { status: summary.shrapit } : undefined,
              guruChandal: summary.guruChandal ? { status: summary.guruChandal } : undefined,
              punarphoo: summary.punarphoo ? { status: summary.punarphoo } : undefined,
              kemadruma: summary.kemadruma ? { status: summary.kemadruma } : undefined,
              gandmool: summary.gandmool ? { status: summary.gandmool } : undefined,
              kalathra: summary.kalathra ? { status: summary.kalathra } : undefined,
              vishDaridra: summary.vishDaridra ? { status: summary.vishDaridra } : undefined,
              ketuNaga: summary.ketuNaga ? { status: summary.ketuNaga } : undefined,
              navagraha: summary.navagrahaUmbrella ? { status: summary.navagrahaUmbrella } : undefined,
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
                ].filter(Boolean)
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
    </div>
  );
};

export default DoshaResults;
