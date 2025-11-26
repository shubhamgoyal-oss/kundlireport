import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Info, Flame, Waves, Users, Moon, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { SriMandirPujaCarousel } from '@/components/SriMandirPujaCarousel';
import { SriMandirPujaCard } from '@/components/SriMandirPujaCard';
import { SriMandirPujaVerticalCard } from '@/components/SriMandirPujaVerticalCard';
import { fetchSriMandirPujas, filterPujasByDosha, getUpcomingPujas, getPrioritizedPuja, SriMandirPuja } from '@/utils/sriMandirPujas';
import { OtherDoshas } from '@/components/OtherDoshas';
import { useTranslation } from 'react-i18next';
import { trackEvent } from '@/lib/analytics';
import AstrologyChatbot from '@/components/AstrologyChatbot';
import { supabase } from '@/integrations/supabase/client';
import { CallbackFloater } from '@/components/CallbackFloater';

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
  const isHindi = (i18n.language ? i18n.language.toLowerCase() : '').startsWith('hi');
  const resultsRef = React.useRef<HTMLDivElement>(null);
  const statusMessageRef = React.useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // Scroll to status message when component mounts
    if (statusMessageRef.current) {
      // Use scrollIntoView with slight delay so the heading is clearly visible
      setTimeout(() => {
        statusMessageRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
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
    <div ref={resultsRef} className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {/* Status Chips Summary Section */}
      <Card className={hasAnyDosha ? "animate-urgent-blink border-2" : "spiritual-glow"} style={hasAnyDosha ? { 
        backgroundColor: 'hsl(var(--danger-bg))', 
        borderColor: 'hsl(var(--danger-border))' 
      } : undefined}>
        <CardHeader className={hasAnyDosha ? "border-b-2" : ""} style={hasAnyDosha ? { 
          borderBottomColor: 'hsl(var(--danger-border))',
          backgroundColor: 'hsl(0 84.2% 92%)'
        } : undefined}>
          <CardTitle 
            ref={statusMessageRef}
            className={`text-2xl sm:text-3xl font-bold break-words ${hasAnyDosha ? '' : 'gradient-spiritual bg-clip-text text-transparent'}`}
            style={hasAnyDosha ? { color: 'hsl(var(--danger-text))' } : undefined}
          >
            {hasAnyDosha 
              ? (isHindi ? '🚨 आपके कुछ दोष पाए गए हैं 🚨' : '🚨 Some Doshas Have Been Detected 🚨')
              : (isHindi ? '✓ कोई प्रमुख दोष नहीं मिला' : '✓ No Major Doshas Found')
            }
          </CardTitle>
        </CardHeader>
        
        <CardContent className={`space-y-4 ${hasAnyDosha ? 'pt-6' : ''}`}>
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

                {/* Individual Dosha Boxes for Major Doshas */}
                <div className="space-y-4 mb-6">
                  {/* Mangal Dosha Box */}
                  {(isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) && (
                    <div className="border-l-4 border-destructive rounded-lg overflow-hidden animate-urgent-blink" style={{ backgroundColor: 'hsl(var(--danger-bg))', borderLeftColor: 'hsl(var(--danger-border))' }}>
                      <div className="p-3">
                        <h4 className="font-semibold text-base mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--danger-text))' }}>
                          <Flame className="w-4 h-4" style={{ color: 'hsl(var(--danger-border))' }} />
                          {t('doshaResults.mangal.name')}
                        </h4>
                        <div className="p-2 rounded-md space-y-1 break-words" style={{ backgroundColor: 'hsl(0 84.2% 95%)' }}>
                          <p className="text-sm italic" style={{ color: 'hsl(var(--danger-text))' }}>{t('doshaResults.mangal.description')}</p>
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--danger-text))' }}>{t('doshaResults.mangal.impact')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Kaal Sarp Dosha Box */}
                  {isDoshaPresent(summary.kaalSarp) && (
                    <div className="border-l-4 border-destructive rounded-lg overflow-hidden animate-urgent-blink" style={{ backgroundColor: 'hsl(var(--danger-bg))', borderLeftColor: 'hsl(var(--danger-border))' }}>
                      <div className="p-3">
                        <h4 className="font-semibold text-base mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--danger-text))' }}>
                          <Waves className="w-4 h-4" style={{ color: 'hsl(var(--danger-border))' }} />
                          {t('doshaResults.kaalSarp.name')}
                        </h4>
                        <div className="p-2 rounded-md space-y-1 break-words" style={{ backgroundColor: 'hsl(0 84.2% 95%)' }}>
                          <p className="text-sm italic" style={{ color: 'hsl(var(--danger-text))' }}>{t('doshaResults.kaalSarp.description')}</p>
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--danger-text))' }}>{t('doshaResults.kaalSarp.impact')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pitra Dosha Box */}
                  {isDoshaPresent(summary.pitra) && (
                    <div className="border-l-4 border-destructive rounded-lg overflow-hidden animate-urgent-blink" style={{ backgroundColor: 'hsl(var(--danger-bg))', borderLeftColor: 'hsl(var(--danger-border))' }}>
                      <div className="p-3">
                        <h4 className="font-semibold text-base mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--danger-text))' }}>
                          <Users className="w-4 h-4" style={{ color: 'hsl(var(--danger-border))' }} />
                          {t('doshaResults.pitra.name')}
                        </h4>
                        <div className="p-2 rounded-md space-y-1 break-words" style={{ backgroundColor: 'hsl(0 84.2% 95%)' }}>
                          <p className="text-sm italic" style={{ color: 'hsl(var(--danger-text))' }}>{t('doshaResults.pitra.description')}</p>
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--danger-text))' }}>{t('doshaResults.pitra.impact')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Shani Sade Sati Box */}
                  {isDoshaPresent(summary.shaniSadeSati) && (
                    <div className="border-l-4 border-destructive rounded-lg overflow-hidden animate-urgent-blink" style={{ backgroundColor: 'hsl(var(--danger-bg))', borderLeftColor: 'hsl(var(--danger-border))' }}>
                      <div className="p-3">
                        <h4 className="font-semibold text-base mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--danger-text))' }}>
                          <Moon className="w-4 h-4" style={{ color: 'hsl(var(--danger-border))' }} />
                          {t('doshaResults.sadeSati.name')}
                        </h4>
                        <div className="p-2 rounded-md space-y-1 break-words" style={{ backgroundColor: 'hsl(0 84.2% 95%)' }}>
                          <p className="text-sm italic" style={{ color: 'hsl(var(--danger-text))' }}>{t('doshaResults.sadeSati.description')}</p>
                          <p className="text-sm font-medium" style={{ color: 'hsl(var(--danger-text))' }}>{t('doshaResults.sadeSati.impact')}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other Doshas Box */}
                  {(() => {
                    const otherDoshas = [];
                    if (isDoshaPresent(summary.vishDaridra)) otherDoshas.push(isHindi ? 'विष/दारिद्र्य योग' : 'Vish/Daridra Yoga');
                    if (isDoshaPresent(summary.grahan)) otherDoshas.push(isHindi ? 'ग्रहण दोष' : 'Grahan Dosha');
                    if (isDoshaPresent(summary.shrapit)) otherDoshas.push(isHindi ? 'श्रापित दोष' : 'Shrapit Dosha');
                    if (isDoshaPresent(summary.guruChandal)) otherDoshas.push(isHindi ? 'गुरु चांडाल दोष' : 'Guru Chandal Dosha');
                    if (isDoshaPresent(summary.punarphoo)) otherDoshas.push(isHindi ? 'पुनर्फू दोष' : 'Punarphoo Dosha');
                    if (isDoshaPresent(summary.kemadruma)) otherDoshas.push(isHindi ? 'केमद्रुम योग' : 'Kemadruma Yoga');
                    if (isDoshaPresent(summary.gandmool)) otherDoshas.push(isHindi ? 'गंडमूल दोष' : 'Gandmool Dosha');
                    if (isDoshaPresent(summary.kalathra)) otherDoshas.push(isHindi ? 'कलत्र दोष' : 'Kalathra Dosha');
                    if (isDoshaPresent(summary.ketuNaga)) otherDoshas.push(isHindi ? 'केतु नाग दोष' : 'Ketu Naga Dosha');

                    if (otherDoshas.length > 0) {
                      return (
                        <div className="border-l-4 border-destructive rounded-lg overflow-hidden animate-urgent-blink" style={{ backgroundColor: 'hsl(var(--danger-bg))', borderLeftColor: 'hsl(var(--danger-border))' }}>
                          <div className="p-3">
                            <h4 className="font-semibold text-base mb-2 flex items-center gap-2" style={{ color: 'hsl(var(--danger-text))' }}>
                              <AlertTriangle className="w-4 h-4" style={{ color: 'hsl(var(--danger-border))' }} />
                              {isHindi ? 'अन्य दोष' : 'Other Doshas'}
                            </h4>
                            <div className="p-2 rounded-md break-words" style={{ backgroundColor: 'hsl(0 84.2% 95%)' }}>
                              <p className="text-sm font-medium" style={{ color: 'hsl(var(--danger-text))' }}>
                                {otherDoshas.join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>


                {/* Remedies For You - Organized by Dosha */}
                {(() => {
                  // Define major doshas in priority order
                  const majorDoshas: Array<{ type: 'mangal' | 'kaal-sarp' | 'pitra' | 'shani'; label: string }> = [];
                  const otherDoshas: Array<{ type: 'rahu' | 'shrapit' | 'guru-chandal' | 'navagraha'; label: string }> = [];
                  
                  // Check major doshas first (exclude nullified)
                  if (isDoshaPresent(summary.mangal) && !isDoshaNullified(summary.mangal)) {
                    majorDoshas.push({ type: 'mangal', label: isHindi ? 'मंगल दोष' : 'Mangal Dosha' });
                  }
                  if (isDoshaPresent(summary.kaalSarp)) {
                    majorDoshas.push({ type: 'kaal-sarp', label: isHindi ? 'काल सर्प दोष' : 'Kaal Sarp Dosha' });
                  }
                  if (isDoshaPresent(summary.pitra)) {
                    majorDoshas.push({ type: 'pitra', label: isHindi ? 'पितृ दोष' : 'Pitra Dosha' });
                  }
                  if (isDoshaPresent(summary.shaniSadeSati)) {
                    majorDoshas.push({ type: 'shani', label: isHindi ? 'शनि साढ़े साती' : 'Shani Sade Sati' });
                  }
                  
                  // Check other doshas
                  if (summary.grahan && isDoshaPresent(summary.grahan)) {
                    otherDoshas.push({ type: 'rahu', label: isHindi ? 'राहु दोष' : 'Rahu Dosha' });
                  }
                  if (summary.shrapit && isDoshaPresent(summary.shrapit)) {
                    otherDoshas.push({ type: 'shrapit', label: isHindi ? 'श्रापित दोष' : 'Shrapit Dosha' });
                  }
                  if (summary.guruChandal && isDoshaPresent(summary.guruChandal)) {
                    otherDoshas.push({ type: 'guru-chandal', label: isHindi ? 'गुरु चांडाल दोष' : 'Guru Chandal Dosha' });
                  }
                  
                  // Check remaining doshas for Navagraha Shanti Puja
                  const remainingDoshasPresent = [
                    isDoshaPresent(summary.vishDaridra),
                    isDoshaPresent(summary.punarphoo),
                    isDoshaPresent(summary.kemadruma),
                    isDoshaPresent(summary.gandmool),
                    isDoshaPresent(summary.kalathra),
                    isDoshaPresent(summary.ketuNaga)
                  ].some(present => present);
                  
                  if (remainingDoshasPresent) {
                    otherDoshas.push({ type: 'navagraha', label: isHindi ? 'अन्य दोष' : 'Other Doshas' });
                  }

                  // Combine in priority order
                  const allActiveDoshas = [...majorDoshas, ...otherDoshas];
                  
                  if (allActiveDoshas.length === 0) return null;

                  return (
                    <div className="mt-6 space-y-6">
                      <div className="text-center space-y-3">
                        <h3 className="text-2xl font-bold">
                          {isHindi ? '🪔 आपके लिए उपाय' : '🪔 Remedies For You'}
                        </h3>
                        
                        <div className="max-w-2xl mx-auto">
                          {isHindi ? (
                            <p className="text-sm text-foreground leading-relaxed mb-2">
                              वैदिक ऑनलाइन पूजा इन दोषों के नकारात्मक प्रभावों को कम करने का एक शक्तिशाली तरीका है।
                            </p>
                          ) : (
                            <p className="text-sm text-foreground leading-relaxed mb-2">
                              Vedic online puja offers a powerful way to reduce the negative effects of these doshas.
                            </p>
                          )}
                        </div>

                        <p className="text-base font-medium text-foreground pt-2">
                          {isHindi ? '📿 यह पूजा आपके दोष निवारण के लिए सबसे उपयुक्त है।' : '📿 Here are the pujas best suited for your dosha relief.'}
                        </p>
                      </div>
                      
                      {isLoadingPujas ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-3">
                          <Loader2 className="w-8 h-8 animate-spin text-primary" />
                          <p className="text-sm text-muted-foreground">
                            {isHindi ? 'उपाय लोड हो रहे हैं...' : 'Loading...'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {/* Major Doshas Section */}
                          {majorDoshas.map(dosha => {
                            const filtered = filterPujasByDosha(pujas, dosha.type);
                            
                            // Get prioritized single puja
                            let pujaToShow: SriMandirPuja | null = null;
                            if (dosha.type === 'pitra') {
                              pujaToShow = getPrioritizedPuja(filtered, 'pitra');
                            } else if (dosha.type === 'shani') {
                              pujaToShow = getPrioritizedPuja(filtered, 'shani');
                            } else {
                              pujaToShow = getUpcomingPujas(filtered, 1)[0] || null;
                            }
                            
                            if (!pujaToShow) return null;
                            
                            return (
                              <div key={dosha.type} className="space-y-4">
                                <SriMandirPujaVerticalCard 
                                  key={pujaToShow.store_id}
                                  puja={pujaToShow} 
                                  doshaType={dosha.type}
                                  onBookClick={async () => {
                                    if (!hasTrackedBookPuja && calculationId) {
                                      try {
                                        const visitorId = localStorage.getItem('analytics_visitor_id') || 'unknown';
                                        const sessionId = localStorage.getItem('analytics_session_id') || 'unknown';
                                        
                                        const { error: updateError } = await supabase
                                          .from('dosha_calculator2')
                                          .update({ book_puja_clicked: true })
                                          .eq('id', calculationId);
                                        
                                        if (updateError) {
                                          console.error('Failed to update book_puja_clicked:', updateError);
                                          // Fallback: track in analytics_events
                                          await supabase.from('analytics_events').insert({
                                            visitor_id: visitorId,
                                            session_id: sessionId,
                                            event_name: 'book_puja_clicked',
                                            metadata: {
                                              calculation_id: calculationId,
                                              dosha_type: dosha.type
                                            }
                                          });
                                        } else {
                                          setHasTrackedBookPuja(true);
                                          console.log('Book puja tracked for calculation:', calculationId);
                                        }
                                      } catch (err) {
                                        console.error('Failed to track book puja:', err);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}
                          
                          {/* Other Doshas Section */}
                          {otherDoshas.map(dosha => {
                            const filtered = filterPujasByDosha(pujas, dosha.type);
                            
                            // Get prioritized puja for guru-chandal and navagraha, otherwise get upcoming
                            let pujaToShow: SriMandirPuja | null = null;
                            if (dosha.type === 'guru-chandal' || dosha.type === 'navagraha') {
                              pujaToShow = getPrioritizedPuja(filtered, dosha.type);
                            } else {
                              pujaToShow = getUpcomingPujas(filtered, 1)[0] || null;
                            }
                            
                            if (!pujaToShow) return null;
                            
                            return (
                              <div key={dosha.type} className="space-y-4">
                                <SriMandirPujaVerticalCard 
                                  key={pujaToShow.store_id}
                                  puja={pujaToShow} 
                                  doshaType={dosha.type}
                                  onBookClick={async () => {
                                    if (!hasTrackedBookPuja && calculationId) {
                                      try {
                                        const visitorId = localStorage.getItem('analytics_visitor_id') || 'unknown';
                                        const sessionId = localStorage.getItem('analytics_session_id') || 'unknown';
                                        
                                        const { error: updateError } = await supabase
                                          .from('dosha_calculator2')
                                          .update({ book_puja_clicked: true })
                                          .eq('id', calculationId);
                                        
                                        if (updateError) {
                                          console.error('Failed to update book_puja_clicked:', updateError);
                                          // Fallback: track in analytics_events
                                          await supabase.from('analytics_events').insert({
                                            visitor_id: visitorId,
                                            session_id: sessionId,
                                            event_name: 'book_puja_clicked',
                                            metadata: {
                                              calculation_id: calculationId,
                                              dosha_type: dosha.type
                                            }
                                          });
                                        } else {
                                          setHasTrackedBookPuja(true);
                                          console.log('Book puja tracked for calculation:', calculationId);
                                        }
                                      } catch (err) {
                                        console.error('Failed to track book puja:', err);
                                      }
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}
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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('doshaResults.mangal.description')} {t('doshaResults.mangal.impact')}
                    </p>
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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('doshaResults.kaalSarp.description')} {t('doshaResults.kaalSarp.impact')}
                    </p>
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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('doshaResults.pitra.description')} {t('doshaResults.pitra.impact')}
                    </p>
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
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('doshaResults.sadeSati.description')} {t('doshaResults.sadeSati.impact')}
                    </p>
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
      
      {/* Callback Floater - appears after calculation */}
      <CallbackFloater calculationId={calculationId} />
    </div>
  );
};
