import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
  const isMobile = useIsMobile();
  
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'month-year' | 'day'>('month-year');
  
  // Default to 1990 for easier selection
  const [selectedMonth, setSelectedMonth] = useState<string>('01');
  const [selectedYear, setSelectedYear] = useState<string>('1990');
  const [selectedDay, setSelectedDay] = useState<string>('01');
  
  // For desktop calendar
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Parse initial value
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split('-');
      setSelectedYear(y);
      setSelectedMonth(m);
      setSelectedDay(d);
      setSelectedDate(new Date(parseInt(y), parseInt(m) - 1, parseInt(d)));
    }
  }, []);

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleMonthYearDone = () => {
    setStep('day');
  };

  const handleDaySelect = (day: number) => {
    const dayStr = String(day).padStart(2, '0');
    setSelectedDay(dayStr);
    const formattedDate = `${selectedYear}-${selectedMonth}-${dayStr}`;
    onChange(formattedDate);
    setIsOpen(false);
    setStep('month-year');
  };

  const handleReset = () => {
    setSelectedMonth('01');
    setSelectedYear('1990');
    setSelectedDay('01');
    setStep('month-year');
  };

  const handleDesktopDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange(formattedDate);
      setIsOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (!value) return isHindi ? 'जन्म तिथि चुनें' : 'Select date of birth';
    const [y, m, d] = value.split('-');
    const month = months.find(mo => mo.value === m);
    const monthLabel = isHindi ? month?.labelHi : month?.labelEn;
    return `${parseInt(d)} ${monthLabel} ${y}`;
  };

  const getSelectedMonthYearDisplay = () => {
    const month = months.find(m => m.value === selectedMonth);
    const monthLabel = isHindi ? month?.labelHi : month?.labelEn;
    return `${monthLabel} ${selectedYear}`;
  };

  // Desktop: Use Popover with Calendar
  if (!isMobile) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm sm:text-base">
          <CalendarIcon className="w-4 h-4 flex-shrink-0" />
          {t('dosha.dateOfBirth')} <span className="text-destructive">*</span>
        </Label>
        
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full min-h-[44px] justify-start text-left font-normal bg-input text-base",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {getDisplayValue()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDesktopDateSelect}
              defaultMonth={selectedDate || new Date(1990, 0, 1)}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
              initialFocus
              captionLayout="dropdown"
              fromYear={1920}
              toYear={currentYear}
            />
          </PopoverContent>
        </Popover>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>
    );
  }

  // Mobile: Use Drawer with step-by-step selection
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-sm sm:text-base">
        <CalendarIcon className="w-4 h-4 flex-shrink-0" />
        {t('dosha.dateOfBirth')} <span className="text-destructive">*</span>
      </Label>
      
      <Drawer open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setStep('month-year');
      }}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full min-h-[44px] justify-start text-left font-normal bg-input text-base",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayValue()}
          </Button>
        </DrawerTrigger>
        <DrawerContent className="bg-background">
          <DrawerHeader className="border-b border-border">
            <DrawerTitle className="text-center">
              {step === 'month-year' 
                ? (isHindi ? 'महीना और वर्ष चुनें' : 'Select Month & Year')
                : (isHindi ? 'दिन चुनें' : 'Select Day')
              }
            </DrawerTitle>
            {step === 'day' && (
              <p className="text-center text-muted-foreground text-sm mt-1">
                {getSelectedMonthYearDisplay()}
              </p>
            )}
          </DrawerHeader>
          
          {step === 'month-year' ? (
            <>
              <div className="flex gap-2 p-4 h-[300px]">
                {/* Month Column */}
                <div className="flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    {isHindi ? 'महीना' : 'Month'}
                  </p>
                  <ScrollArea className="flex-1 border rounded-md">
                    <div className="p-2">
                      {months.map((month) => (
                        <button
                          key={month.value}
                          onClick={() => setSelectedMonth(month.value)}
                          className={`w-full py-3 px-2 text-center rounded-md transition-colors ${
                            selectedMonth === month.value
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {isHindi ? month.labelHi : month.labelEn}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                
                {/* Year Column */}
                <div className="flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground text-center mb-2">
                    {isHindi ? 'वर्ष' : 'Year'}
                  </p>
                  <ScrollArea className="flex-1 border rounded-md">
                    <div className="p-2">
                      {years.map((year) => (
                        <button
                          key={year}
                          onClick={() => setSelectedYear(String(year))}
                          className={`w-full py-3 px-2 text-center rounded-md transition-colors ${
                            selectedYear === String(year)
                              ? 'bg-primary text-primary-foreground font-semibold'
                              : 'hover:bg-muted'
                          }`}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
              
              <DrawerFooter className="border-t border-border flex-row justify-between">
                <Button variant="ghost" onClick={handleReset}>
                  {isHindi ? 'रीसेट' : 'Reset'}
                </Button>
                <Button onClick={handleMonthYearDone}>
                  {isHindi ? 'आगे बढ़ें' : 'Next'}
                </Button>
              </DrawerFooter>
            </>
          ) : (
            <>
              <div className="p-4">
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => (
                    <button
                      key={day}
                      onClick={() => handleDaySelect(day)}
                      className={`aspect-square flex items-center justify-center rounded-full text-sm transition-colors ${
                        selectedDay === String(day).padStart(2, '0')
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'hover:bg-muted'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
              
              <DrawerFooter className="border-t border-border flex-row justify-between">
                <Button variant="ghost" onClick={() => setStep('month-year')}>
                  {isHindi ? 'वापस' : 'Back'}
                </Button>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
};
