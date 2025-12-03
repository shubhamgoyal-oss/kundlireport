import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from 'lucide-react';

interface DateOfBirthPickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  error?: string;
}

const months = [
  { value: '01', labelEn: 'January', labelHi: 'जनवरी' },
  { value: '02', labelEn: 'February', labelHi: 'फरवरी' },
  { value: '03', labelEn: 'March', labelHi: 'मार्च' },
  { value: '04', labelEn: 'April', labelHi: 'अप्रैल' },
  { value: '05', labelEn: 'May', labelHi: 'मई' },
  { value: '06', labelEn: 'June', labelHi: 'जून' },
  { value: '07', labelEn: 'July', labelHi: 'जुलाई' },
  { value: '08', labelEn: 'August', labelHi: 'अगस्त' },
  { value: '09', labelEn: 'September', labelHi: 'सितंबर' },
  { value: '10', labelEn: 'October', labelHi: 'अक्टूबर' },
  { value: '11', labelEn: 'November', labelHi: 'नवंबर' },
  { value: '12', labelEn: 'December', labelHi: 'दिसंबर' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

const getDaysInMonth = (month: string, year: string): number => {
  if (!month || !year) return 31;
  return new Date(parseInt(year), parseInt(month), 0).getDate();
};

export const DateOfBirthPicker = ({ value, onChange, error }: DateOfBirthPickerProps) => {
  const { t, i18n } = useTranslation();
  const isHindi = i18n.language === 'hi';
  
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>('');

  // Parse initial value
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setYear(y);
      setMonth(m);
      setDay(d);
    }
  }, []);

  // Update parent when all fields are filled
  useEffect(() => {
    if (day && month && year) {
      const formattedDate = `${year}-${month}-${day.padStart(2, '0')}`;
      onChange(formattedDate);
    }
  }, [day, month, year, onChange]);

  const daysInMonth = getDaysInMonth(month, year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Adjust day if it exceeds days in selected month
  useEffect(() => {
    if (day && parseInt(day) > daysInMonth) {
      setDay(String(daysInMonth).padStart(2, '0'));
    }
  }, [month, year, daysInMonth, day]);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm sm:text-base">
        <Calendar className="w-4 h-4 flex-shrink-0" />
        {t('dosha.dateOfBirth')} <span className="text-destructive">*</span>
      </Label>
      
      <div className="grid grid-cols-3 gap-2">
        {/* Day */}
        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="min-h-[44px] bg-input">
            <SelectValue placeholder={isHindi ? "दिन" : "Day"} />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {days.map((d) => (
              <SelectItem key={d} value={String(d).padStart(2, '0')}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month */}
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="min-h-[44px] bg-input">
            <SelectValue placeholder={isHindi ? "महीना" : "Month"} />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {isHindi ? m.labelHi : m.labelEn.slice(0, 3)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year */}
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="min-h-[44px] bg-input">
            <SelectValue placeholder={isHindi ? "वर्ष" : "Year"} />
          </SelectTrigger>
          <SelectContent className="max-h-[200px]">
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};
