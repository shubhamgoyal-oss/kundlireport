import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

interface DateOfBirthPickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  error?: string;
}

export const DateOfBirthPicker = ({ value, onChange, error }: DateOfBirthPickerProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm sm:text-base">
        <Calendar className="w-4 h-4 flex-shrink-0" />
        {t('dosha.dateOfBirth')} <span className="text-destructive">*</span>
      </Label>
      
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[44px] bg-input"
        required
      />

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};
