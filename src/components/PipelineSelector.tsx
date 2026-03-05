import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Cloud, Database } from 'lucide-react';
import type { Pipeline } from '@/lib/kundliApi';

interface Props {
  value: Pipeline;
  onChange: (v: Pipeline) => void;
  disabled?: boolean;
  isHindi?: boolean;
}

export function PipelineSelector({ value, onChange, disabled, isHindi }: Props) {
  // Hide entirely when Cloud Run URL is not configured
  if (!import.meta.env.VITE_CLOUD_RUN_URL) return null;

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">
        {isHindi ? 'पाइपलाइन' : 'Pipeline'}
      </Label>
      <RadioGroup
        value={value}
        onValueChange={(v) => onChange(v as Pipeline)}
        className="flex gap-4"
        disabled={disabled}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="supabase" id="pipe-sb" />
          <Label htmlFor="pipe-sb" className="cursor-pointer flex items-center gap-1">
            <Database className="w-3.5 h-3.5" /> Supabase
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="cloudrun" id="pipe-cr" />
          <Label htmlFor="pipe-cr" className="cursor-pointer flex items-center gap-1">
            <Cloud className="w-3.5 h-3.5" /> Google Cloud
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}
