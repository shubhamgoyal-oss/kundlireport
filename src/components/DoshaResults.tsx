import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, CheckCircle, Info, Flame, Waves, Users, Moon } from 'lucide-react';

interface DoshaResultsProps {
  summary: {
    mangal: { status: string; severity?: string };
    kaalSarp: { status: string; type?: string };
    pitra: { status: string };
    sadeSati: { status: string; phase?: number };
  };
  details: Record<string, {
    explanation: string;
    placements?: string[];
    notes?: string[];
    remedies: string[];
  }>;
}

const DoshaResults = ({ summary, details }: DoshaResultsProps) => {
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

  const getStatusIcon = (status: string) => {
    if (status.toLowerCase() === 'present' || status.toLowerCase().includes('active')) {
      return <AlertTriangle className="w-4 h-4 mr-1" />;
    }
    return <CheckCircle className="w-4 h-4 mr-1 text-success" />;
  };

  const doshaOneLiners = {
    mangal: "Mangal (Manglik/Kuja) Dosha — Linked with Mars in certain houses; traditionally associated with friction in relationships and decisiveness.",
    kaalSarp: "Kaal Sarp Dosha — All planets hemmed between Rahu and Ketu; often framed as a pattern indicating inner tension and transformation.",
    pitra: "Pitra (Pitru) Dosha — Traditional indicators around the 9th house and Sun–node links; associated with duties, lineage, and guidance.",
    sadeSati: "Shani Sade Sati — Saturn's transit across the natal Moon's neighborhood; a 7½-year cycle emphasizing discipline and patience."
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
              className={`${getSeverityColor(summary.mangal.severity || '')} px-4 py-2 text-sm font-medium`}
            >
              {getStatusIcon(summary.mangal.status)}
              Mangal: {summary.mangal.status}
              {summary.mangal.severity && ` (${summary.mangal.severity})`}
            </Badge>

            {/* Kaal Sarp Dosha Chip */}
            <Badge 
              variant="outline" 
              className={`${getSeverityColor('')} px-4 py-2 text-sm font-medium`}
            >
              {getStatusIcon(summary.kaalSarp.status)}
              Kaal Sarp: {summary.kaalSarp.status}
              {summary.kaalSarp.type && ` (${summary.kaalSarp.type})`}
            </Badge>

            {/* Pitra Dosha Chip */}
            <Badge 
              variant="outline" 
              className={`${getSeverityColor('')} px-4 py-2 text-sm font-medium`}
            >
              {getStatusIcon(summary.pitra.status)}
              Pitra: {summary.pitra.status}
            </Badge>

            {/* Sade Sati Chip */}
            <Badge 
              variant="outline" 
              className={`${getSeverityColor(summary.sadeSati.phase ? 'medium' : '')} px-4 py-2 text-sm font-medium`}
            >
              {getStatusIcon(summary.sadeSati.status)}
              Sade Sati: {summary.sadeSati.status}
              {summary.sadeSati.phase && ` (Phase ${summary.sadeSati.phase})`}
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
                    Status: {summary.mangal.status}
                    {summary.mangal.severity && ` • Severity: ${summary.mangal.severity}`}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary">
                <p className="text-sm text-muted-foreground italic">{doshaOneLiners.mangal}</p>
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

                  {details.mangal.remedies.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Flame className="w-4 h-4" />
                        Traditional Remedies
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.mangal.remedies.map((remedy, i) => (
                          <li key={i}>{remedy}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                    Status: {summary.kaalSarp.status}
                    {summary.kaalSarp.type && ` • Type: ${summary.kaalSarp.type}`}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary">
                <p className="text-sm text-muted-foreground italic">{doshaOneLiners.kaalSarp}</p>
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

                  {details.kaalSarp.remedies.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Waves className="w-4 h-4" />
                        Traditional Remedies
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.kaalSarp.remedies.map((remedy, i) => (
                          <li key={i}>{remedy}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                    Status: {summary.pitra.status}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary">
                <p className="text-sm text-muted-foreground italic">{doshaOneLiners.pitra}</p>
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

                  {details.pitra.remedies.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Traditional Remedies
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.pitra.remedies.map((remedy, i) => (
                          <li key={i}>{remedy}</li>
                        ))}
                      </ul>
                    </div>
                  )}
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
                    Status: {summary.sadeSati.status}
                    {summary.sadeSati.phase && ` • Phase: ${summary.sadeSati.phase}`}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-4 space-y-4">
              {/* One-liner */}
              <div className="p-3 bg-muted/50 rounded-md border-l-4 border-primary">
                <p className="text-sm text-muted-foreground italic">{doshaOneLiners.sadeSati}</p>
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

                  {details.sadeSati.remedies.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        Traditional Remedies
                      </h4>
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        {details.sadeSati.remedies.map((remedy, i) => (
                          <li key={i}>{remedy}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
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
