import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, CheckCircle2, XCircle, Info } from 'lucide-react';

interface DoshaResultsProps {
  summary: {
    mangal: 'present' | 'absent' | 'canceled';
    mangalSeverity?: 'mild' | 'moderate' | 'strong';
    kaalSarp: 'present' | 'absent';
    kaalSarpType?: string;
    pitra: 'present' | 'absent';
    shaniSadeSati: 'active' | 'inactive';
    shaniPhase?: 1 | 2 | 3;
  };
  details: Record<string, {
    triggeredBy: string[];
    placements: string[];
    notes: string[];
    explanation: string;
    remedies: string[];
  }>;
}

const DoshaResults = ({ summary, details }: DoshaResultsProps) => {
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'strong': return 'bg-destructive text-destructive-foreground';
      case 'moderate': return 'bg-orange-500 text-white';
      case 'mild': return 'bg-yellow-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'present' || status === 'active') {
      return <AlertCircle className="w-4 h-4 text-orange-500" />;
    } else if (status === 'canceled') {
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    } else {
      return <XCircle className="w-4 h-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-2xl gradient-spiritual bg-clip-text text-transparent">
            Your Dosha Analysis
          </CardTitle>
          <CardDescription>
            Based on your birth chart, here are the traditional Jyotish dosha indicators
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Summary Chips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Mangal Dosha */}
            <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(summary.mangal)}
                <div>
                  <p className="font-semibold">Mangal Dosha</p>
                  <p className="text-sm text-muted-foreground">
                    {summary.mangal === 'present' && summary.mangalSeverity && (
                      <Badge className={getSeverityColor(summary.mangalSeverity)}>
                        {summary.mangalSeverity}
                      </Badge>
                    )}
                    {summary.mangal === 'canceled' && <Badge variant="outline">Canceled</Badge>}
                    {summary.mangal === 'absent' && <Badge variant="secondary">Not Present</Badge>}
                  </p>
                </div>
              </div>
            </div>

            {/* Kaal Sarp Dosha */}
            <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(summary.kaalSarp)}
                <div>
                  <p className="font-semibold">Kaal Sarp Dosha</p>
                  <p className="text-sm text-muted-foreground">
                    {summary.kaalSarp === 'present' && summary.kaalSarpType ? (
                      <Badge variant="outline">{summary.kaalSarpType} Type</Badge>
                    ) : (
                      <Badge variant="secondary">Not Present</Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Pitra Dosha */}
            <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(summary.pitra)}
                <div>
                  <p className="font-semibold">Pitra Dosha</p>
                  <p className="text-sm text-muted-foreground">
                    {summary.pitra === 'present' ? (
                      <Badge variant="outline">Present</Badge>
                    ) : (
                      <Badge variant="secondary">Not Present</Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Sade Sati */}
            <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(summary.shaniSadeSati)}
                <div>
                  <p className="font-semibold">Shani Sade Sati</p>
                  <p className="text-sm text-muted-foreground">
                    {summary.shaniSadeSati === 'active' && summary.shaniPhase ? (
                      <Badge variant="outline">Phase {summary.shaniPhase}</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Accordion */}
          <Accordion type="single" collapsible className="w-full">
            {/* Mangal Dosha Details */}
            <AccordionItem value="mangal">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Mangal Dosha Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">What We Detected</h4>
                  <p className="text-sm text-muted-foreground mb-2">{details.mangal.explanation}</p>
                  
                  {details.mangal.placements.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1">Placements:</p>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.mangal.placements.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {details.mangal.notes.length > 0 && (
                    <div className="mt-3 p-3 bg-accent/20 rounded-md">
                      {details.mangal.notes.map((note, i) => (
                        <p key={i} className="text-sm">{note}</p>
                      ))}
                    </div>
                  )}
                </div>

                {details.mangal.remedies.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Traditional Remedies</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {details.mangal.remedies.map((remedy, i) => (
                        <li key={i}>{remedy}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Kaal Sarp Dosha Details */}
            <AccordionItem value="kaalSarp">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Kaal Sarp Dosha Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">What We Detected</h4>
                  <p className="text-sm text-muted-foreground mb-2">{details.kaalSarp.explanation}</p>
                  
                  {details.kaalSarp.placements.length > 0 && (
                    <div className="mt-3">
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.kaalSarp.placements.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {details.kaalSarp.remedies.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Traditional Remedies</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {details.kaalSarp.remedies.map((remedy, i) => (
                        <li key={i}>{remedy}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Pitra Dosha Details */}
            <AccordionItem value="pitra">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Pitra Dosha Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">What We Detected</h4>
                  <p className="text-sm text-muted-foreground mb-2">{details.pitra.explanation}</p>
                  
                  {details.pitra.placements.length > 0 && (
                    <div className="mt-3">
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.pitra.placements.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {details.pitra.remedies.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Traditional Remedies</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {details.pitra.remedies.map((remedy, i) => (
                        <li key={i}>{remedy}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Sade Sati Details */}
            <AccordionItem value="sadeSati">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span>Shani Sade Sati Details</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                <div>
                  <h4 className="font-semibold mb-2">What We Detected</h4>
                  <p className="text-sm text-muted-foreground mb-2">{details.sadeSati.explanation}</p>
                  
                  {details.sadeSati.notes.length > 0 && (
                    <div className="mt-3 p-3 bg-accent/20 rounded-md">
                      {details.sadeSati.notes.map((note, i) => (
                        <p key={i} className="text-sm">{note}</p>
                      ))}
                    </div>
                  )}
                </div>

                {details.sadeSati.remedies.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Traditional Remedies</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {details.sadeSati.remedies.map((remedy, i) => (
                        <li key={i}>{remedy}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

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
