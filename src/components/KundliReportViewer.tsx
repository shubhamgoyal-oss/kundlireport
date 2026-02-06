import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { pdf } from '@react-pdf/renderer';
import { KundliPDFDocument } from './KundliPDFDocument';
import { fetchMultipleCharts, PDF_CHARTS, ChartData, BirthDetails } from '@/utils/kundaliChart';

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
  planetaryPositions: any[];
  ascendant: { sign: string; degree: number };
  charaKarakas: any[];
  aspects: any[];
  conjunctions: any[];
  panchang: any | null;
  pillars: any | null;
  planets: any[];
  houses: any[];
  career: any | null;
  marriage: any | null;
  dasha: any | null;
  rahuKetu: any | null;
  remedies: any | null;
  numerology: any | null;
  spiritual: any | null;
  charaKarakasDetailed?: any | null;
  glossary?: any | null;
  generatedAt: string;
  language: string;
  errors: string[];
  tokensUsed: number;
  qa?: any | null;
  charts?: ChartData[]; // Added for PDF charts
}

interface KundliReportViewerProps {
  report: KundliReport;
  isLoading?: boolean;
}

export const KundliReportViewer = ({ report, isLoading = false }: KundliReportViewerProps) => {
  const { i18n } = useTranslation();
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [isFetchingCharts, setIsFetchingCharts] = useState(false);
  const pdfBlobUrlRef = useRef<string | null>(null);
  const chartsFetchedRef = useRef(false);
  const isHindi = i18n.language?.toLowerCase().startsWith('hi');

  useEffect(() => {
    pdfBlobUrlRef.current = pdfBlobUrl;
  }, [pdfBlobUrl]);

  // Fetch charts after report is ready
  useEffect(() => {
    if (!isLoading && report && !chartsFetchedRef.current) {
      chartsFetchedRef.current = true;
      setIsFetchingCharts(true);
      
      // Parse birth details for chart fetching
      const [year, month, day] = report.birthDetails.dateOfBirth.split('-').map(Number);
      const [hour, minute] = report.birthDetails.timeOfBirth.split(':').map(Number);
      
      const birthDetails: BirthDetails = {
        day,
        month,
        year,
        hour,
        minute,
        lat: report.birthDetails.latitude,
        lon: report.birthDetails.longitude,
        tzone: report.birthDetails.timezone
      };
      
      fetchMultipleCharts(birthDetails, 'North', isHindi ? 'hi' : 'en', PDF_CHARTS)
        .then(fetchedCharts => {
          console.log('[KundliReportViewer] Fetched', fetchedCharts.length, 'charts');
          setCharts(fetchedCharts);
        })
        .catch(err => {
          console.error('[KundliReportViewer] Failed to fetch charts:', err);
        })
        .finally(() => {
          setIsFetchingCharts(false);
        });
    }
  }, [isLoading, report, isHindi]);

  // Generate PDF blob for preview
  const generatePdfBlob = useCallback(async () => {
    console.log('[KundliReportViewer] generatePdfBlob called, pdfBlobUrl:', pdfBlobUrlRef.current);
    if (pdfBlobUrlRef.current) {
      console.log('[KundliReportViewer] PDF already generated, skipping');
      return;
    }
    
    console.log('[KundliReportViewer] Generating PDF blob...');
    setIsGeneratingPdf(true);
    setPdfError(null);
    try {
      // Include charts in the report
      const reportWithCharts = { ...report, charts };
      console.log('[KundliReportViewer] Creating PDF document with report:', report?.birthDetails?.name, 'and', charts.length, 'charts');
      const blob = await pdf(<KundliPDFDocument report={reportWithCharts} />).toBlob();
      console.log('[KundliReportViewer] PDF blob created, size:', blob.size);
      const url = URL.createObjectURL(blob);
      console.log('[KundliReportViewer] Blob URL created:', url);
      pdfBlobUrlRef.current = url;
      setPdfBlobUrl(url);
    } catch (error) {
      console.error('[KundliReportViewer] Failed to generate PDF:', error);
      setPdfError(error instanceof Error ? error.message : 'Failed to generate PDF preview');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [report, charts]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    };
  }, [pdfBlobUrl]);

  // Download PDF
  const handleDownloadPdf = async () => {
    console.log('[KundliReportViewer] Download clicked');
    setIsDownloading(true);
    try {
      const reportWithCharts = { ...report, charts };
      const blob = await pdf(<KundliPDFDocument report={reportWithCharts} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Kundli_Report_${report.birthDetails.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('[KundliReportViewer] Download triggered');
    } catch (error) {
      console.error('[KundliReportViewer] Failed to download PDF:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Generate PDF after charts are fetched (or after a short delay if charts fail)
  useEffect(() => {
    console.log('[KundliReportViewer] useEffect triggered, isLoading:', isLoading, 'hasReport:', !!report, 'hasBlobUrl:', !!pdfBlobUrl, 'isFetchingCharts:', isFetchingCharts);
    if (!isLoading && report && !pdfBlobUrl && !isFetchingCharts) {
      console.log('[KundliReportViewer] Triggering PDF generation from useEffect');
      generatePdfBlob();
    }
  }, [isLoading, report, pdfBlobUrl, isFetchingCharts, generatePdfBlob]);
  if (isLoading) {
    return (
      <Card className="w-full max-w-5xl mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-16 h-16 animate-spin text-primary mb-6" />
          <p className="text-xl font-semibold text-foreground mb-2">
            {isHindi ? 'आपकी कुंडली रिपोर्ट तैयार हो रही है...' : 'Generating your comprehensive Kundli report...'}
          </p>
          <p className="text-muted-foreground text-center max-w-md">
            {isHindi 
              ? 'इसमें 2-3 मिनट लग सकते हैं क्योंकि हम आपके जन्म चार्ट का गहन विश्लेषण कर रहे हैं।' 
              : 'This may take 2-3 minutes as we analyze your birth chart in depth with AI-powered predictions.'}
          </p>
          <div className="mt-6 text-sm text-muted-foreground">
            <p>• Analyzing 9 planets across 12 houses</p>
            <p>• Generating career, marriage & dasha predictions</p>
            <p>• Calculating remedies & spiritual guidance</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Count successful sections
  const sectionCount = [
    report.panchang,
    report.pillars,
    report.planets?.length > 0,
    report.houses?.length > 0,
    report.career,
    report.marriage,
    report.dasha,
    report.rahuKetu,
    report.remedies,
    report.numerology,
    report.spiritual,
  ].filter(Boolean).length;

  const estimatedPages = 
    2 + // Cover + birth details
    (report.panchang ? 1 : 0) +
    (report.pillars ? 1 : 0) +
    (report.planets?.length || 0) +
    1 + // Houses overview
    (report.houses?.length || 0) +
    (report.career ? 1 : 0) +
    (report.marriage ? 1 : 0) +
    (report.dasha ? 1 : 0) +
    (report.rahuKetu ? 1 : 0) +
    (report.numerology ? 1 : 0) +
    (report.spiritual ? 1 : 0) +
    (report.remedies ? 2 : 0) +
    1; // Summary

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary" />
              {isHindi ? 'कुंडली रिपोर्ट' : 'Kundli Report'}
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              {report.birthDetails.name} • {report.birthDetails.dateOfBirth}
            </p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                {sectionCount} sections
              </span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                ~{estimatedPages} pages
              </span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                {report.planets?.length || 0} planet analyses
              </span>
              <span className="bg-primary/10 text-primary px-2 py-1 rounded">
                {report.houses?.length || 0} house analyses
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {!pdfBlobUrl && (
              <Button
                onClick={generatePdfBlob}
                disabled={isGeneratingPdf}
                variant="outline"
                className="min-h-[44px]"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                {isHindi ? 'पूर्वावलोकन' : 'Generate Preview'}
              </Button>
            )}
            <Button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className="min-h-[44px]"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isHindi ? 'PDF डाउनलोड करें' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* PDF Preview */}
        {isGeneratingPdf ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              {isHindi ? 'PDF तैयार हो रहा है...' : 'Generating PDF preview...'}
            </p>
          </div>
        ) : pdfBlobUrl ? (
          <div className="w-full" style={{ height: '80vh' }}>
            {/* object tends to be more reliable than iframe for PDF blobs across browsers */}
            <object
              data={pdfBlobUrl}
              type="application/pdf"
              className="w-full h-full"
              aria-label="Kundli Report PDF Preview"
            >
              <iframe
                src={pdfBlobUrl}
                className="w-full h-full border-0"
                title="Kundli Report PDF Preview"
              />
            </object>
          </div>
        ) : pdfError ? (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              {isHindi ? 'PDF पूर्वावलोकन नहीं बन पाया' : 'Could not generate PDF preview'}
            </p>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {isHindi
                ? 'कृपया दोबारा कोशिश करें या PDF डाउनलोड करें।'
                : 'Please try again, or download the PDF instead.'}
            </p>
            <div className="flex gap-3">
              <Button onClick={() => { setPdfBlobUrl(null); generatePdfBlob(); }} variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                {isHindi ? 'फिर से प्रयास करें' : 'Retry Preview'}
              </Button>
              <Button onClick={handleDownloadPdf}>
                <Download className="w-4 h-4 mr-2" />
                {isHindi ? 'डाउनलोड' : 'Download'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              {isHindi ? 'आपकी रिपोर्ट तैयार है!' : 'Your report is ready!'}
            </p>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {isHindi 
                ? 'पूर्वावलोकन बटन पर क्लिक करें या सीधे PDF डाउनलोड करें।' 
                : 'Click "Generate Preview" to view the PDF inline, or download it directly.'}
            </p>
            <div className="flex gap-3">
              <Button onClick={generatePdfBlob} variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                {isHindi ? 'पूर्वावलोकन' : 'Preview'}
              </Button>
              <Button onClick={handleDownloadPdf}>
                <Download className="w-4 h-4 mr-2" />
                {isHindi ? 'डाउनलोड' : 'Download'}
              </Button>
            </div>

            {/* Report Summary */}
            <div className="mt-8 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">
                {isHindi ? 'रिपोर्ट में शामिल' : 'Report Contents'}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {report.panchang && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Panchang Analysis
                  </div>
                )}
                {report.pillars && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Three Pillars
                  </div>
                )}
                {report.planets?.length > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> {report.planets.length} Planet Profiles
                  </div>
                )}
                {report.houses?.length > 0 && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> 12 House Analysis
                  </div>
                )}
                {report.career && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Career Predictions
                  </div>
                )}
                {report.marriage && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Marriage Analysis
                  </div>
                )}
                {report.dasha && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Dasha Predictions
                  </div>
                )}
                {report.rahuKetu && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Rahu-Ketu Analysis
                  </div>
                )}
                {report.numerology && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Numerology
                  </div>
                )}
                {report.spiritual && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Spiritual Guidance
                  </div>
                )}
                {report.remedies && (
                  <div className="flex items-center gap-2 text-green-600">
                    <span>✓</span> Remedies & Mantras
                  </div>
                )}
              </div>

              {report.errors.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm font-medium mb-1">
                    {isHindi ? 'कुछ खंड उत्पन्न नहीं हो सके:' : 'Some sections could not be generated:'}
                  </p>
                  <ul className="text-amber-700 text-xs list-disc list-inside">
                    {report.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default KundliReportViewer;
