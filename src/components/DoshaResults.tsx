import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Info, Flame, Waves, Users, Moon } from 'lucide-react';
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
  const [hasTrackedBookPuja, setHasTrackedBookPuja] = useState(false);
  const isHindi = i18n.language?.toLowerCase().startsWith('hi');

  useEffect(() => {
    // Initial fetch
    fetchSriMandirPujas().then(setPujas);

    // Set up hourly refresh
    const intervalId = setInterval(() => {
      fetchSriMandirPujas().then(setPujas);
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(intervalId);
  }, []);

  const isDoshaPresent = (status: string) => {
    const s = status.toLowerCase();
    return s === 'present' || s === 'active';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
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
    const map: Record<string, string> = {
      present: t('doshaResults.statusValues.present'),
      absent: t('doshaResults.statusValues.absent'),
      inactive: t('doshaResults.statusValues.inactive'),
      active: t('doshaResults.statusValues.active'),
      suggested: t('doshaResults.statusValues.suggested'),
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

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {/* Status Chips Summary Section */}
      <Card className="spiritual-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold gradient-spiritual bg-clip-text text-transparent">
            {t('doshaResults.summary')}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Check if any doshas are present */}
          {(() => {
            const hasAnyDosha = 
              isDoshaPresent(summary.mangal) ||
              isDoshaPresent(summary.kaalSarp) ||
              isDoshaPresent(summary.pitra) ||
              isDoshaPresent(summary.shaniSadeSati);
            
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
                {/* Status Chips Row */}
                <div className="flex flex-wrap gap-3">
                  {/* Mangal Dosha Chip - Only show if present */}
                  {isDoshaPresent(summary.mangal) && (
                    <Badge 
                      variant="outline" 
                      className={`${getSeverityColor(summary.mangalSeverity || '')} px-4 py-2 text-sm font-medium`}
                    >
                      {getStatusIcon(summary.mangal)}
                      {t('doshaResults.mangal.name')}: {translateStatus(summary.mangal)}
                      {summary.mangalSeverity && ` (${summary.mangalSeverity})`}
                    </Badge>
                  )}

                  {/* Kaal Sarp Dosha Chip - Only show if present */}
                  {isDoshaPresent(summary.kaalSarp) && (
                    <Badge 
                      variant="outline" 
                      className={`${getSeverityColor('')} px-4 py-2 text-sm font-medium`}
                    >
                      {getStatusIcon(summary.kaalSarp)}
                      {t('doshaResults.kaalSarp.name')}: {translateStatus(summary.kaalSarp)}
                      {summary.kaalSarpType && ` (${summary.kaalSarpType})`}
                      {summary.kaalSarpSubtype === 'partial' && (
                        <span className="ml-1 text-xs bg-accent/30 px-1.5 py-0.5 rounded">Partial (edge)</span>
                      )}
                    </Badge>
                  )}

                  {/* Pitra Dosha Chip - Only show if present */}
                  {isDoshaPresent(summary.pitra) && (
                    <Badge 
                      variant="outline" 
                      className={`${getSeverityColor('')} px-4 py-2 text-sm font-medium`}
                    >
                      {getStatusIcon(summary.pitra)}
                      {t('doshaResults.pitra.name')}: {translateStatus(summary.pitra)}
                    </Badge>
                  )}

                  {/* Sade Sati Chip - Only show if present */}
                  {isDoshaPresent(summary.shaniSadeSati) && (
                    <Badge 
                      variant="outline" 
                      className={`${getSeverityColor(summary.shaniPhase ? 'medium' : '')} px-4 py-2 text-sm font-medium`}
                    >
                      {getStatusIcon(summary.shaniSadeSati)}
                      {t('doshaResults.sadeSati.name')}: {translateStatus(summary.shaniSadeSati)}
                      {summary.shaniPhase && ` (${t('doshaResults.phase')} ${summary.shaniPhase})`}
                    </Badge>
                  )}
                </div>

                {/* Remedies For You - Moved here from below */}
                {(() => {
                  const activeDoshas: Array<{ type: 'mangal' | 'kaal-sarp' | 'pitra' | 'shani' | 'rahu' | 'shrapit' | 'guru-chandal'; label: string }> = [];
                  
                  // Check each dosha and add to list if present/active
                  if (isDoshaPresent(summary.mangal)) {
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

                  // Only show section if there are active doshas and pujas available
                  if (activeDoshas.length === 0 || uniquePersonalizedPujas.length === 0) {
                    return null;
                  }

                  return (
                    <div className="mt-6 space-y-4">
                      <div className="text-center">
                        <h3 className="text-2xl font-bold gradient-spiritual bg-clip-text text-transparent">
                          {isHindi ? 'आपके लिए उपाय' : 'Remedies For You'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                          {isHindi 
                            ? `आपके ${activeDoshas.length} दोष${activeDoshas.length > 1 ? 'ों' : ''} के लिए व्यक्तिगत उपाय`
                            : `Personalized remedies for your ${activeDoshas.length} detected dosha${activeDoshas.length > 1 ? 's' : ''}`
                          }
                        </p>
                      </div>
                      <SriMandirPujaCarousel 
                        pujas={uniquePersonalizedPujas} 
                        doshaType="personalized"
                        calculationId={calculationId}
                        onBookPujaClick={async () => {
                          if (!hasTrackedBookPuja && calculationId) {
                            try {
                              await supabase
                                .from('dosha_calculations')
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
