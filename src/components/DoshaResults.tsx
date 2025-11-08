import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Info, Flame, Waves, Users, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SriMandirPujaCarousel } from '@/components/SriMandirPujaCarousel';
import { fetchSriMandirPujas, filterPujasByDosha, getUpcomingPujas, SriMandirPuja } from '@/utils/sriMandirPujas';

interface DoshaResultsProps {
  summary: {
    mangal: string;
    mangalSeverity?: string;
    kaalSarp: string;
    kaalSarpType?: string;
    pitra: string;
    shaniSadeSati: string;
    shaniPhase?: number;
  };
  details: Record<string, {
    explanation: string;
    triggeredBy?: string[];
    placements?: string[];
    notes?: string[];
    remedies: string[];
  }>;
}

const DoshaResults = ({ summary, details }: DoshaResultsProps) => {
  const [pujas, setPujas] = useState<SriMandirPuja[]>([]);

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
    return s === 'present' || s.includes('active');
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

  const doshaOneLiners = {
    mangal: {
      description: "Mangal (Manglik/Kuja) Dosha — Linked with Mars in certain houses; traditionally associated with friction in relationships and decisiveness.",
      impact: "Impact if present: Greater likelihood of friction in close relationships, impatience/anger spikes, or delays and stops/starts in marriage or partnerships."
    },
    kaalSarp: {
      description: "Kaal Sarp Dosha — All planets hemmed between Rahu and Ketu; often framed as a pattern indicating inner tension and transformation.",
      impact: "Impact if present: A pattern of inner restlessness and periodic setbacks; plans may feel blocked or get delayed despite effort, requiring extra persistence."
    },
    pitra: {
      description: "Pitra (Pitru) Dosha — Traditional indicators around the 9th house and Sun–node links; associated with duties, lineage, and guidance.",
      impact: "Impact if present: Recurring duties/obligations toward family or elders; guilt, disputes, or legacy issues can surface and demand resolution."
    },
    sadeSati: {
      description: "Shani Sade Sati — Saturn's transit across the natal Moon's neighborhood; a 7½-year cycle emphasizing discipline and patience.",
      impact: "Impact if active: Heavier responsibilities, slower progress, and tests of patience; results tend to come with consistent discipline rather than speed."
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {/* Status Chips Summary Section */}
      <Card className="spiritual-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold gradient-spiritual bg-clip-text text-transparent">
            Your Dosha Summary
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Status Chips Row */}
          <div className="flex flex-wrap gap-3">
            {/* Mangal Dosha Chip */}
            <Badge 
              variant="outline" 
              className={`${getSeverityColor(summary.mangalSeverity || '')} px-4 py-2 text-sm font-medium`}
            >
              {getStatusIcon(summary.mangal)}
              Mangal: {summary.mangal}
              {summary.mangalSeverity && ` (${summary.mangalSeverity})`}
            </Badge>

            {/* Kaal Sarp Dosha Chip */}
            <Badge 
              variant="outline" 
              className={`${getSeverityColor('')} px-4 py-2 text-sm font-medium`}
            >
              {getStatusIcon(summary.kaalSarp)}
              Kaal Sarp: {summary.kaalSarp}
              {summary.kaalSarpType && ` (${summary.kaalSarpType})`}
            </Badge>

            {/* Pitra Dosha Chip */}
            <Badge 
              variant="outline" 
              className={`${getSeverityColor('')} px-4 py-2 text-sm font-medium`}
            >
              {getStatusIcon(summary.pitra)}
              Pitra: {summary.pitra}
            </Badge>

            {/* Sade Sati Chip */}
            <Badge 
              variant="outline" 
              className={`${getSeverityColor(summary.shaniPhase ? 'medium' : '')} px-4 py-2 text-sm font-medium`}
            >
              {getStatusIcon(summary.shaniSadeSati)}
              Sade Sati: {summary.shaniSadeSati}
              {summary.shaniPhase && ` (Phase ${summary.shaniPhase})`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Section */}
      <Card className="spiritual-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center gradient-spiritual bg-clip-text text-transparent">
            Detailed Analysis & Remedies
          </CardTitle>
          <CardDescription className="text-center">
            Based on your birth chart calculations
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Accordion type="single" collapsible className="w-full space-y-4">
          {/* Mangal Dosha Details */}
          <AccordionItem value="mangal" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Flame className="w-5 h-5 text-destructive" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Mangal Dosha (Manglik)</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {summary.mangal}
                    {summary.mangalSeverity && ` • Severity: ${summary.mangalSeverity}`}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary space-y-2">
                <p className="text-sm text-muted-foreground italic">{doshaOneLiners.mangal.description}</p>
                <p className="text-sm text-muted-foreground font-medium">{doshaOneLiners.mangal.impact}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This is an educational tool based on popular Jyotish rules. Interpret with discretion.
                </p>
              </div>
              
              {details.mangal && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Explanation
                    </h4>
                    <p className="text-sm text-muted-foreground">{details.mangal.explanation}</p>
                  </div>

                  {details.mangal.placements && details.mangal.placements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Placements</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.mangal.placements.map((p, i) => (
                          <li key={i}>{p}</li>
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
                        Traditional Remedies
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.mangal.remedies.map((remedy, i) => (
                          <li key={i}>{remedy}</li>
                        ))}
                          <li>Do a Mangal Dosha Nivaran Puja.</li>
                      </ul>
                    </div>

                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Kaal Sarp Dosha Details */}
          <AccordionItem value="kaalSarp" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Waves className="w-5 h-5 text-primary" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Kaal Sarp Dosha</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {summary.kaalSarp}
                    {summary.kaalSarpType && ` • Type: ${summary.kaalSarpType}`}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary space-y-2">
                <p className="text-sm text-muted-foreground italic">{doshaOneLiners.kaalSarp.description}</p>
                <p className="text-sm text-muted-foreground font-medium">{doshaOneLiners.kaalSarp.impact}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This is an educational tool based on popular Jyotish rules. Interpret with discretion.
                </p>
              </div>
              
              {details.kaalSarp && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Explanation
                    </h4>
                    <p className="text-sm text-muted-foreground">{details.kaalSarp.explanation}</p>
                  </div>

                  {details.kaalSarp.placements && details.kaalSarp.placements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Placements</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.kaalSarp.placements.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Waves className="w-4 h-4" />
                        Traditional Remedies
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.kaalSarp.remedies.map((remedy, i) => (
                          <li key={i}>{remedy}</li>
                        ))}
                          <li>Do a Kaal Sarp Dosha Nivaran Puja.</li>
                      </ul>
                    </div>

                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Pitra Dosha Details */}
          <AccordionItem value="pitra" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Pitra Dosha</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {summary.pitra}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary space-y-2">
                <p className="text-sm text-muted-foreground italic">{doshaOneLiners.pitra.description}</p>
                <p className="text-sm text-muted-foreground font-medium">{doshaOneLiners.pitra.impact}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This is an educational tool based on popular Jyotish rules. Interpret with discretion.
                </p>
              </div>
              
              {details.pitra && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Explanation
                    </h4>
                    <p className="text-sm text-muted-foreground">{details.pitra.explanation}</p>
                  </div>

                  {details.pitra.placements && details.pitra.placements.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Placements</h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.pitra.placements.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Traditional Remedies
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.pitra.remedies.map((remedy, i) => (
                          <li key={i}>{remedy}</li>
                        ))}
                          <li>Do a Pitra Dosha Nivaran Puja.</li>
                      </ul>
                    </div>

                </>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Sade Sati Details */}
          <AccordionItem value="sadeSati" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <Moon className="w-5 h-5 text-warning" />
                <div className="text-left">
                  <h3 className="font-semibold text-lg">Shani Sade Sati</h3>
                  <p className="text-sm text-muted-foreground">
                    Status: {summary.shaniSadeSati}
                    {summary.shaniPhase && ` • Phase: ${summary.shaniPhase}`}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary space-y-2">
                <p className="text-sm text-muted-foreground italic">{doshaOneLiners.sadeSati.description}</p>
                <p className="text-sm text-muted-foreground font-medium">{doshaOneLiners.sadeSati.impact}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ This is an educational tool based on popular Jyotish rules. Interpret with discretion.
                </p>
              </div>
              
              {details.sadeSati && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Explanation
                    </h4>
                    <p className="text-sm text-muted-foreground">{details.sadeSati.explanation}</p>
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
                        Traditional Remedies
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.sadeSati.remedies.map((remedy, i) => (
                          <li key={i}>{remedy}</li>
                        ))}
                          <li>Do a Sade Sati Nivaran Puja.</li>
                      </ul>
                    </div>

                </>
              )}
            </AccordionContent>
          </AccordionItem>
          </Accordion>

          {/* Sri Mandir Offered Remedies Carousel */}
          {pujas.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="text-3xl font-bold text-center gradient-spiritual bg-clip-text text-transparent">
                Sri Mandir Offered Remedies
              </h2>
              <SriMandirPujaCarousel pujas={getUpcomingPujas(pujas, 10)} doshaType="all" />
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-accent/10 border border-accent/30 rounded-md">
            <p className="text-xs text-muted-foreground">
              ⚠️ <strong>Important:</strong> These results depend on birth-time precision and the chosen ayanamsha (Lahiri). 
              This is an educational tool based on classical Jyotish rules; not medical, legal, or financial advice. 
              Consult a qualified Vedic astrologer for personalized guidance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DoshaResults;
