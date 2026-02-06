import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Phase {
  id: string;
  label: string;
  labelHi: string;
  minProgress: number;
}

const PHASES: Phase[] = [
  { id: "init", label: "Initializing", labelHi: "आरंभ हो रहा है", minProgress: 0 },
  { id: "planetary", label: "Fetching planetary data", labelHi: "ग्रहों का डेटा प्राप्त हो रहा है", minProgress: 10 },
  { id: "panchang", label: "Analyzing Panchang & Numerology", labelHi: "पंचांग और अंक ज्योतिष विश्लेषण", minProgress: 20 },
  { id: "planets", label: "Analyzing planetary positions", labelHi: "ग्रहों की स्थिति का विश्लेषण", minProgress: 40 },
  { id: "houses", label: "Analyzing houses", labelHi: "भावों का विश्लेषण", minProgress: 55 },
  { id: "life", label: "Predicting life areas", labelHi: "जीवन क्षेत्रों की भविष्यवाणी", minProgress: 70 },
  { id: "remedies", label: "Generating remedies & spiritual insights", labelHi: "उपाय और आध्यात्मिक अंतर्दृष्टि", minProgress: 85 },
  { id: "qa", label: "Running quality checks", labelHi: "गुणवत्ता जांच चल रही है", minProgress: 95 },
  { id: "complete", label: "Complete", labelHi: "पूर्ण", minProgress: 100 },
];

interface KundliProgressTrackerProps {
  progress: number;
  currentPhase: string;
  isHindi: boolean;
}

export const KundliProgressTracker = ({ progress, currentPhase, isHindi }: KundliProgressTrackerProps) => {
  // Find current phase index based on progress
  const currentPhaseIndex = PHASES.findIndex((phase, idx) => {
    const nextPhase = PHASES[idx + 1];
    if (!nextPhase) return true;
    return progress >= phase.minProgress && progress < nextPhase.minProgress;
  });

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 p-6 bg-card rounded-xl border border-border shadow-lg">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {isHindi ? "रिपोर्ट बन रही है..." : "Generating Report..."}
        </h3>
        <span className="text-2xl font-bold text-primary">{progress}%</span>
      </div>

      {/* Main Progress Bar */}
      <Progress value={progress} className="h-3 mb-6" />

      {/* Current Phase Highlight */}
      <div className="bg-primary/10 rounded-lg p-4 mb-6 flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-primary animate-spin" />
        <span className="font-medium text-primary">
          {currentPhase || (isHindi ? "प्रारंभ हो रहा है..." : "Starting...")}
        </span>
      </div>

      {/* Phase Steps */}
      <div className="space-y-2">
        {PHASES.slice(1, -1).map((phase, idx) => {
          const isComplete = progress > phase.minProgress;
          const isCurrent = currentPhaseIndex === idx + 1;
          
          return (
            <div
              key={phase.id}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-all duration-300",
                isComplete && "bg-primary/10",
                isCurrent && "bg-primary/5 border border-primary/20"
              )}
            >
              {isComplete ? (
                <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm transition-colors",
                  isComplete && "text-primary",
                  isCurrent && "text-primary font-medium",
                  !isComplete && !isCurrent && "text-muted-foreground"
                )}
              >
                {isHindi ? phase.labelHi : phase.label}
              </span>
              {isComplete && (
                <span className="ml-auto text-xs text-primary">
                  {isHindi ? "✓ पूर्ण" : "✓ Done"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Estimated Time */}
      <p className="text-xs text-muted-foreground mt-4 text-center">
        {isHindi 
          ? "अनुमानित समय: 2-4 मिनट • कृपया इस पेज को बंद न करें"
          : "Estimated time: 2-4 minutes • Please don't close this page"}
      </p>
    </div>
  );
};
