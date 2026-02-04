import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Download, FileText, Loader2, Star, Sun, Moon, Sparkles, Target, Heart, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PlanetPosition {
  name: string;
  sign: string;
  house: number;
  degree: number;
  isRetro: boolean;
}

interface CharaKaraka {
  name: string;
  planet: string;
  degree: number;
}

interface Aspect {
  planet: string;
  aspectType: string;
  targetHouse: number;
  targetSign: string;
}

interface PanchangPrediction {
  vaar: { day: string; planet: string; interpretation: string };
  tithi: { name: string; paksha: string; interpretation: string };
  nakshatra: { name: string; pada: number; lord: string; interpretation: string };
  karana: { name: string; interpretation: string };
  yoga: { name: string; interpretation: string };
}

interface PillarsPrediction {
  moonSign: { sign: string; element: string; interpretation: string; emotionalNature: string };
  ascendant: { sign: string; rulingPlanet: string; interpretation: string; personality: string };
  nakshatra: { name: string; deity: string; interpretation: string };
}

interface PlanetProfile {
  planet: string;
  sign: string;
  house: number;
  degree: number;
  isRetro: boolean;
  dignity: string;
  interpretation: string;
  aspects: string[];
}

interface KundliReport {
  birthDetails: {
    name: string;
    dateOfBirth: string;
    timeOfBirth: string;
    placeOfBirth: string;
    latitude: number;
    longitude: number;
    timezone: number;
  };
  planetaryPositions: PlanetPosition[];
  ascendant: {
    sign: string;
    degree: number;
  };
  charaKarakas: CharaKaraka[];
  aspects: Aspect[];
  conjunctions: Array<{ house: number; planets: string[] }>;
  panchang: PanchangPrediction | null;
  pillars: PillarsPrediction | null;
  planets: PlanetProfile[];
  generatedAt: string;
  language: string;
  errors: string[];
  tokensUsed: number;
}

interface KundliReportViewerProps {
  report: KundliReport;
  isLoading?: boolean;
}

export const KundliReportViewer = ({ report, isLoading = false }: KundliReportViewerProps) => {
  const { i18n } = useTranslation();
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const isHindi = i18n.language?.toLowerCase().startsWith('hi');

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Use browser print functionality for PDF
      const printWindow = window.open('', '_blank');
      if (printWindow && reportRef.current) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Kundli Report - ${report.birthDetails.name}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: white; color: #1a1a1a; }
              h1 { color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
              h2 { color: #6d28d9; margin-top: 30px; }
              h3 { color: #4c1d95; }
              .section { margin-bottom: 30px; padding: 20px; background: #faf5ff; border-radius: 8px; }
              .planet-card { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #7c3aed; }
              .badge { display: inline-block; padding: 4px 12px; background: #7c3aed; color: white; border-radius: 20px; font-size: 12px; margin: 2px; }
              .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
              table { width: 100%; border-collapse: collapse; margin: 15px 0; }
              th, td { padding: 12px; text-align: left; border: 1px solid #e5e5e5; }
              th { background: #7c3aed; color: white; }
              @media print { body { padding: 20px; } }
            </style>
          </head>
          <body>
            <h1>🕉️ ${isHindi ? 'कुंडली रिपोर्ट' : 'Kundli Report'}</h1>
            <p style="color: #666;">Generated on ${new Date(report.generatedAt).toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN')}</p>
            
            <div class="section">
              <h2>👤 ${isHindi ? 'जन्म विवरण' : 'Birth Details'}</h2>
              <div class="info-row"><span>${isHindi ? 'नाम' : 'Name'}:</span><span>${report.birthDetails.name}</span></div>
              <div class="info-row"><span>${isHindi ? 'जन्म तिथि' : 'Date of Birth'}:</span><span>${report.birthDetails.dateOfBirth}</span></div>
              <div class="info-row"><span>${isHindi ? 'जन्म समय' : 'Time of Birth'}:</span><span>${report.birthDetails.timeOfBirth}</span></div>
              <div class="info-row"><span>${isHindi ? 'जन्म स्थान' : 'Place of Birth'}:</span><span>${report.birthDetails.placeOfBirth}</span></div>
              <div class="info-row"><span>${isHindi ? 'लग्न' : 'Ascendant'}:</span><span>${report.ascendant.sign} (${report.ascendant.degree.toFixed(2)}°)</span></div>
            </div>

            <div class="section">
              <h2>🌟 ${isHindi ? 'ग्रह स्थिति' : 'Planetary Positions'}</h2>
              <table>
                <tr><th>${isHindi ? 'ग्रह' : 'Planet'}</th><th>${isHindi ? 'राशि' : 'Sign'}</th><th>${isHindi ? 'भाव' : 'House'}</th><th>${isHindi ? 'अंश' : 'Degree'}</th><th>${isHindi ? 'स्थिति' : 'Status'}</th></tr>
                ${report.planetaryPositions.map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td>${p.sign}</td>
                    <td>${p.house}</td>
                    <td>${p.degree.toFixed(2)}°</td>
                    <td>${p.isRetro ? (isHindi ? 'वक्री' : 'Retrograde') : (isHindi ? 'मार्गी' : 'Direct')}</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            ${report.panchang ? `
            <div class="section">
              <h2>📅 ${isHindi ? 'पंचांग विश्लेषण' : 'Panchang Analysis'}</h2>
              <div class="planet-card">
                <h3>${isHindi ? 'वार' : 'Vaar'}: ${report.panchang.vaar.day}</h3>
                <p>${report.panchang.vaar.interpretation}</p>
              </div>
              <div class="planet-card">
                <h3>${isHindi ? 'तिथि' : 'Tithi'}: ${report.panchang.tithi.name}</h3>
                <p>${report.panchang.tithi.interpretation}</p>
              </div>
              <div class="planet-card">
                <h3>${isHindi ? 'नक्षत्र' : 'Nakshatra'}: ${report.panchang.nakshatra.name}</h3>
                <p>${report.panchang.nakshatra.interpretation}</p>
              </div>
            </div>
            ` : ''}

            ${report.pillars ? `
            <div class="section">
              <h2>🏛️ ${isHindi ? 'तीन स्तंभ' : 'Three Pillars'}</h2>
              <div class="planet-card">
                <h3>${isHindi ? 'चंद्र राशि' : 'Moon Sign'}: ${report.pillars.moonSign.sign}</h3>
                <p>${report.pillars.moonSign.interpretation}</p>
              </div>
              <div class="planet-card">
                <h3>${isHindi ? 'लग्न' : 'Ascendant'}: ${report.pillars.ascendant.sign}</h3>
                <p>${report.pillars.ascendant.interpretation}</p>
              </div>
              <div class="planet-card">
                <h3>${isHindi ? 'जन्म नक्षत्र' : 'Birth Nakshatra'}: ${report.pillars.nakshatra.name}</h3>
                <p>${report.pillars.nakshatra.interpretation}</p>
              </div>
            </div>
            ` : ''}

            ${report.planets.length > 0 ? `
            <div class="section">
              <h2>🪐 ${isHindi ? 'ग्रह विश्लेषण' : 'Planetary Analysis'}</h2>
              ${report.planets.map(p => `
                <div class="planet-card">
                  <h3>${p.planet} ${isHindi ? 'में' : 'in'} ${p.sign} (${isHindi ? 'भाव' : 'House'} ${p.house})</h3>
                  <p><span class="badge">${p.dignity}</span> ${p.isRetro ? '<span class="badge">Retrograde</span>' : ''}</p>
                  <p>${p.interpretation}</p>
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${report.charaKarakas.length > 0 ? `
            <div class="section">
              <h2>👑 ${isHindi ? 'चर कारक' : 'Chara Karakas'}</h2>
              <table>
                <tr><th>${isHindi ? 'कारक' : 'Karaka'}</th><th>${isHindi ? 'ग्रह' : 'Planet'}</th><th>${isHindi ? 'अंश' : 'Degree'}</th></tr>
                ${report.charaKarakas.map(k => `
                  <tr><td>${k.name}</td><td>${k.planet}</td><td>${k.degree.toFixed(2)}°</td></tr>
                `).join('')}
              </table>
            </div>
            ` : ''}

            <p style="text-align: center; color: #666; margin-top: 40px; font-size: 12px;">
              ${isHindi ? 'श्री मंदिर द्वारा निर्मित' : 'Generated by Sri Mandir'} | ${new Date().toLocaleDateString()}
            </p>
          </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {isHindi ? 'आपकी कुंडली रिपोर्ट तैयार हो रही है...' : 'Generating your Kundli report...'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {isHindi ? 'इसमें कुछ समय लग सकता है' : 'This may take a moment'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto spiritual-glow overflow-hidden">
      {/* Header with Download Button */}
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-bold gradient-spiritual bg-clip-text text-transparent flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              {isHindi ? 'कुंडली रिपोर्ट' : 'Kundli Report'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {report.birthDetails.name} • {report.birthDetails.dateOfBirth}
            </p>
          </div>
          <Button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="min-h-[44px]"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {isHindi ? 'PDF डाउनलोड करें' : 'Download PDF'}
          </Button>
        </div>
      </CardHeader>

      {/* Report Content */}
      <CardContent className="p-4 sm:p-6" ref={reportRef}>
        <Accordion type="multiple" defaultValue={['birth-details', 'planetary-positions', 'panchang', 'pillars']} className="space-y-4">
          
          {/* Birth Details Section */}
          <AccordionItem value="birth-details" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <span className="font-semibold">{isHindi ? 'जन्म विवरण' : 'Birth Details'}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{isHindi ? 'नाम' : 'Name'}</p>
                  <p className="font-medium">{report.birthDetails.name}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{isHindi ? 'जन्म तिथि' : 'Date of Birth'}</p>
                  <p className="font-medium">{report.birthDetails.dateOfBirth}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{isHindi ? 'जन्म समय' : 'Time of Birth'}</p>
                  <p className="font-medium">{report.birthDetails.timeOfBirth}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{isHindi ? 'जन्म स्थान' : 'Place of Birth'}</p>
                  <p className="font-medium">{report.birthDetails.placeOfBirth}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{isHindi ? 'लग्न' : 'Ascendant'}</p>
                  <p className="font-medium">{report.ascendant.sign} ({report.ascendant.degree.toFixed(2)}°)</p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Planetary Positions */}
          <AccordionItem value="planetary-positions" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                <span className="font-semibold">{isHindi ? 'ग्रह स्थिति' : 'Planetary Positions'}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">{isHindi ? 'ग्रह' : 'Planet'}</th>
                      <th className="text-left py-2 font-medium">{isHindi ? 'राशि' : 'Sign'}</th>
                      <th className="text-left py-2 font-medium">{isHindi ? 'भाव' : 'House'}</th>
                      <th className="text-left py-2 font-medium">{isHindi ? 'अंश' : 'Degree'}</th>
                      <th className="text-left py-2 font-medium">{isHindi ? 'स्थिति' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.planetaryPositions.map((planet, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="py-2 font-medium">{planet.name}</td>
                        <td className="py-2">{planet.sign}</td>
                        <td className="py-2">{planet.house}</td>
                        <td className="py-2">{planet.degree.toFixed(2)}°</td>
                        <td className="py-2">
                          {planet.isRetro && (
                            <Badge variant="outline" className="text-xs">
                              {isHindi ? 'वक्री' : 'R'}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Panchang Analysis */}
          {report.panchang && (
            <AccordionItem value="panchang" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Sun className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{isHindi ? 'पंचांग विश्लेषण' : 'Panchang Analysis'}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">
                      {isHindi ? 'वार' : 'Vaar'}: {report.panchang.vaar.day}
                    </h4>
                    <p className="text-sm text-muted-foreground">{report.panchang.vaar.interpretation}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">
                      {isHindi ? 'तिथि' : 'Tithi'}: {report.panchang.tithi.name} ({report.panchang.tithi.paksha})
                    </h4>
                    <p className="text-sm text-muted-foreground">{report.panchang.tithi.interpretation}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">
                      {isHindi ? 'नक्षत्र' : 'Nakshatra'}: {report.panchang.nakshatra.name} ({isHindi ? 'पद' : 'Pada'} {report.panchang.nakshatra.pada})
                    </h4>
                    <p className="text-sm text-muted-foreground">{report.panchang.nakshatra.interpretation}</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-semibold text-primary mb-2">
                      {isHindi ? 'योग' : 'Yoga'}: {report.panchang.yoga.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">{report.panchang.yoga.interpretation}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Three Pillars */}
          {report.pillars && (
            <AccordionItem value="pillars" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{isHindi ? 'तीन स्तंभ' : 'Three Pillars'}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/5 rounded-lg border border-blue-500/20">
                    <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">
                      {isHindi ? 'चंद्र राशि' : 'Moon Sign'}: {report.pillars.moonSign.sign}
                    </h4>
                    <Badge variant="outline" className="mb-2">{report.pillars.moonSign.element}</Badge>
                    <p className="text-sm text-muted-foreground">{report.pillars.moonSign.interpretation}</p>
                    <p className="text-sm mt-2"><strong>{isHindi ? 'भावनात्मक स्वभाव' : 'Emotional Nature'}:</strong> {report.pillars.moonSign.emotionalNature}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/5 rounded-lg border border-purple-500/20">
                    <h4 className="font-semibold text-purple-600 dark:text-purple-400 mb-2">
                      {isHindi ? 'लग्न' : 'Ascendant'}: {report.pillars.ascendant.sign}
                    </h4>
                    <Badge variant="outline" className="mb-2">{isHindi ? 'स्वामी' : 'Lord'}: {report.pillars.ascendant.rulingPlanet}</Badge>
                    <p className="text-sm text-muted-foreground">{report.pillars.ascendant.interpretation}</p>
                    <p className="text-sm mt-2"><strong>{isHindi ? 'व्यक्तित्व' : 'Personality'}:</strong> {report.pillars.ascendant.personality}</p>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/5 rounded-lg border border-amber-500/20">
                    <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2">
                      {isHindi ? 'जन्म नक्षत्र' : 'Birth Nakshatra'}: {report.pillars.nakshatra.name}
                    </h4>
                    <Badge variant="outline" className="mb-2">{isHindi ? 'देवता' : 'Deity'}: {report.pillars.nakshatra.deity}</Badge>
                    <p className="text-sm text-muted-foreground">{report.pillars.nakshatra.interpretation}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Planetary Analysis */}
          {report.planets.length > 0 && (
            <AccordionItem value="planets" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{isHindi ? 'ग्रह विश्लेषण' : 'Planetary Analysis'}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 py-4">
                  {report.planets.map((planet, idx) => (
                    <div key={idx} className="p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{planet.planet}</h4>
                        <Badge variant="outline">{planet.sign}</Badge>
                        <Badge variant="outline">{isHindi ? 'भाव' : 'H'}{planet.house}</Badge>
                        <Badge variant="secondary">{planet.dignity}</Badge>
                        {planet.isRetro && <Badge variant="destructive">{isHindi ? 'वक्री' : 'R'}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{planet.interpretation}</p>
                      {planet.aspects.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-muted-foreground">{isHindi ? 'दृष्टि' : 'Aspects'}:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {planet.aspects.map((aspect, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{aspect}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Chara Karakas */}
          {report.charaKarakas.length > 0 && (
            <AccordionItem value="karakas" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{isHindi ? 'चर कारक' : 'Chara Karakas'}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
                  {report.charaKarakas.map((karaka, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg text-center">
                      <p className="text-xs text-muted-foreground">{karaka.name}</p>
                      <p className="font-semibold text-primary">{karaka.planet}</p>
                      <p className="text-xs">{karaka.degree.toFixed(2)}°</p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Conjunctions */}
          {report.conjunctions.length > 0 && (
            <AccordionItem value="conjunctions" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{isHindi ? 'ग्रह युति' : 'Planetary Conjunctions'}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 py-4">
                  {report.conjunctions.map((conj, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                      <Badge>{isHindi ? 'भाव' : 'House'} {conj.house}</Badge>
                      <span className="text-sm">{conj.planets.join(' + ')}</span>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

        </Accordion>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            {isHindi ? 'श्री मंदिर द्वारा निर्मित' : 'Generated by Sri Mandir'} • {new Date(report.generatedAt).toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN')}
          </p>
          {report.errors.length > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              {isHindi ? 'कुछ खंड उत्पन्न नहीं हो सके' : 'Some sections could not be generated'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
