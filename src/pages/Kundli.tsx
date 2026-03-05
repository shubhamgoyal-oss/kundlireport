import { useState, useEffect } from 'react';
import KundliReportGenerator from '@/components/KundliReportGenerator';
import BulkKundliRunner from '@/components/BulkKundliRunner';
import LanguageToggle from '@/components/LanguageToggle';
import { trackEvent } from '@/lib/analytics';
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const Kundli = () => {
  const { t, i18n } = useTranslation();
  const isHindi = (i18n.language || 'en').toLowerCase().startsWith('hi');

  useEffect(() => {
    trackEvent('page_view', { page: 'kundli' });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Language Toggle */}
      <LanguageToggle />

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 max-w-7xl">
          <div className="flex flex-col items-center mx-auto max-w-4xl w-full">
            {/* Header */}
            <div className="text-center mb-8 sm:mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-spiritual bg-clip-text text-transparent">
                  {isHindi ? 'कुंडली रिपोर्ट' : 'Kundli Report Generator'}
                </h1>
              </div>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                {isHindi
                  ? 'आपकी विस्तृत वैदिक कुंडली रिपोर्ट प्राप्त करें - ग्रह विश्लेषण, भविष्यवाणियां और उपचार सहित।'
                  : 'Get your comprehensive Vedic Kundli report with planetary analysis, predictions, and remedies.'
                }
              </p>
            </div>

            {/* Tabs for Single and Bulk */}
            <div className="w-full">
              <Tabs defaultValue="single" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="single" className="text-base">
                    {isHindi ? 'एक रिपोर्ट' : 'Single Report'}
                  </TabsTrigger>
                  <TabsTrigger value="bulk" className="text-base">
                    {isHindi ? 'बल्क अपलोड' : 'Bulk Upload'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="single" className="w-full">
                  <KundliReportGenerator />
                </TabsContent>

                <TabsContent value="bulk" className="w-full">
                  <BulkKundliRunner />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      {/* Build timestamp */}
      <footer className="text-center text-xs text-muted-foreground/50 py-2">
        Last updated: {new Date(__BUILD_TIME__).toLocaleString()}
      </footer>
    </div>
  );
};

export default Kundli;
