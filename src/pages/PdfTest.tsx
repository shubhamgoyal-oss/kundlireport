import { useState } from 'react';
import { pdf, Document, Page, Text, View, Font, StyleSheet } from '@react-pdf/renderer';
import { preWrapText, wrapIndicSync, ensurePreWrapFontsLoaded } from '@/utils/preWrapText';

Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 700 },
  ]
});

// ── Exact same page/container styles as KundliPDFDocument.tsx ──
const styles = StyleSheet.create({
  page: {
    paddingTop: 66,
    paddingBottom: 72,
    paddingLeft: 42,
    paddingRight: 42,
    fontFamily: 'NotoSansDevanagari',
    fontSize: 11.2,
    lineHeight: 1.62,
  },
  // Disclaimer container — exact copy from KundliPDFDocument.tsx line 7483-7490
  disclaimerContainer: {
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#f5e6d3',
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  // Disclaimer text — exact copy from KundliPDFDocument.tsx line 7493-7499
  disclaimerText: {
    fontSize: 10,
    color: '#2C1810',
    lineHeight: 1.55,
    marginBottom: 12,
    textAlign: 'justify',
    paddingHorizontal: 6,
  },
  heading: {
    fontFamily: 'NotoSansDevanagari',
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  label: {
    fontFamily: 'NotoSansDevanagari',
    fontSize: 11,
    fontWeight: 700,
    marginTop: 16,
    marginBottom: 6,
    color: '#ea580c',
  },
});

// ── Exact Hindi disclaimer paragraphs from KundliPDFDocument.tsx DISCLAIMER_CONTENT.hi ──
const DISCLAIMER_PARAS = [
  'यह रिपोर्ट वैदिक ज्योतिष के सिद्धांतों के आधार पर तैयार की गई है और इसका उद्देश्य मार्गदर्शन एवं आत्म-जागरूकता प्रदान करना है, न कि निश्चित भविष्यवाणियाँ करना। ज्योतिष एक समृद्ध एवं व्याख्यात्मक विद्या है, और विभिन्न ज्योतिषियों, पद्धतियों व परंपराओं के अनुसार व्याख्या भिन्न हो सकती है।',
  'इस रिपोर्ट का उद्देश्य आपको स्पष्टता और जागरूकता प्रदान करना है, ताकि आप जीवन में अधिक सूचित निर्णय ले सकें। यह चिकित्सा, कानूनी, वित्तीय या किसी अन्य पेशेवर सलाह का विकल्प नहीं है, और महत्वपूर्ण निर्णय हमेशा योग्य विशेषज्ञों के परामर्श से लिए जाने चाहिए।',
  'रिपोर्ट में उल्लिखित कोई भी उपाय या आध्यात्मिक सुझाव — जैसे मंत्र, साधना या दान — पूर्णतः वैकल्पिक हैं। कृपया वही अपनाएँ जो आपको उचित लगे। इनका प्रभाव व्यक्ति-व्यक्ति पर भिन्न हो सकता है और यह विश्वास, संकल्प एवं निरंतर अभ्यास पर निर्भर करता है। किसी भी परिणाम की गारंटी नहीं दी जाती।',
  'आपके जीवन की दिशा आपके अपने निर्णयों से तय होती है। यह रिपोर्ट आत्मचिंतन और विकास का एक साधन है, और इसकी विषय-वस्तु के आधार पर किए गए कार्यों या प्राप्त परिणामों के लिए लेखक उत्तरदायी नहीं है। इस रिपोर्ट की सामग्री को समय-समय पर अद्यतन या परिष्कृत किया जा सकता है।',
  'इस रिपोर्ट को खुले हृदय और स्थिर मन से पढ़ें — ब्रह्मांड आपका मार्गदर्शन कर सकता है, लेकिन आपकी यात्रा पर नियंत्रण सदैव आपका ही रहता है।',
];

// Available width for disclaimer text:
// A4=595pt - paddingLeft(42) - paddingRight(42) - containerPaddingH(20*2) - textPaddingH(6*2) = 595-84-40-12 = 459pt
const DISCLAIMER_WIDTH_PT = 459;

interface DocProps {
  wrappedParas: string[];
  rawParas: string[];
}

const DisclaimerTestDoc = ({ wrappedParas, rawParas }: DocProps) => (
  <Document>
    {/* Page 1: WITH preWrapText — should have NO word-breaking */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Page 1: WITH wrapIndicSync (should be perfect)</Text>
      <View style={styles.disclaimerContainer}>
        {wrappedParas.map((para, idx) => (
          <Text key={`w-${idx}`} style={styles.disclaimerText}>{para}</Text>
        ))}
      </View>
    </Page>

    {/* Page 2: WITHOUT preWrapText — will show word-breaking issues */}
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Page 2: WITHOUT wrapping (shows word-breaking)</Text>
      <View style={styles.disclaimerContainer}>
        {rawParas.map((para, idx) => (
          <Text key={`r-${idx}`} style={styles.disclaimerText}>{para}</Text>
        ))}
      </View>
    </Page>
  </Document>
);

export default function PdfTest() {
  const [status, setStatus] = useState('Click to generate');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const generate = async () => {
    setStatus('Loading font and wrapping text...');
    try {
      // Load font into browser for canvas measurement (same as KundliReportViewer does)
      await ensurePreWrapFontsLoaded('hi');

      // Wrap each disclaimer paragraph using the SYNC wrapper
      // (font already loaded above, so wrapIndicSync works)
      const wrappedParas = DISCLAIMER_PARAS.map(para =>
        wrapIndicSync(para, 'hi', DISCLAIMER_WIDTH_PT)
      );

      console.log('[PdfTest] Wrapped disclaimer paragraphs:');
      wrappedParas.forEach((p, i) => {
        console.log(`  [${i}] lines: ${p.split('\n').length}`);
        console.log(p);
      });

      setStatus('Generating PDF...');
      const blob = await pdf(
        <DisclaimerTestDoc wrappedParas={wrappedParas} rawParas={DISCLAIMER_PARAS} />
      ).toBlob();

      console.log('[PdfTest] PDF blob created, size:', blob.size);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setStatus(`Done! PDF size: ${blob.size} bytes. Page 1 = wrapped, Page 2 = raw.`);
    } catch (e: any) {
      console.error('[PdfTest] Error:', e);
      setStatus('Error: ' + e.message);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Hindi Disclaimer Page Test</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Generates a 2-page PDF: Page 1 has pre-wrapped text (no word-breaking),
        Page 2 has raw text (shows react-pdf word-breaking bugs).
      </p>
      <button
        onClick={generate}
        style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer', background: '#ea580c', color: 'white', border: 'none', borderRadius: 6 }}
      >
        Generate Disclaimer Test PDF
      </button>
      <p>{status}</p>
      {pdfUrl && (
        <iframe src={pdfUrl} style={{ width: '100%', height: '80vh', border: '1px solid #ccc' }} />
      )}
    </div>
  );
}
