import { useState } from 'react';
import { pdf, Document, Page, Text, View, Font, StyleSheet } from '@react-pdf/renderer';
import { preWrapText } from '@/utils/preWrapText';

Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 42,
  },
  // Narrow container to force line breaks
  narrowContainer: {
    width: 200,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 20,
  },
  text: {
    fontFamily: 'NotoSansDevanagari',
    fontSize: 10,
    lineHeight: 1.55,
    textAlign: 'left',
  },
  heading: {
    fontFamily: 'NotoSansDevanagari',
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 5,
    color: '#333',
  },
  // Full-width disclaimer test
  fullContainer: {
    backgroundColor: '#fffbf5',
    borderWidth: 1,
    borderColor: '#f3e8d8',
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  disclaimerText: {
    fontFamily: 'NotoSansDevanagari',
    fontSize: 10,
    color: '#4a3728',
    lineHeight: 1.55,
    marginBottom: 12,
    textAlign: 'left',
    paddingHorizontal: 6,
  },
});

// Long realistic paragraph — simulates actual Kundli report body text with complex conjuncts
const longPara = 'आपकी कुंडली में चंद्रमा वृषभ राशि में स्थित है जो उसकी उच्च राशि है। यह स्थिति आपको भावनात्मक स्थिरता, मानसिक शांति और गहरी संवेदनशीलता प्रदान करती है। आपका स्वभाव धैर्यवान, विश्वसनीय और स्नेहपूर्ण है। आप भौतिक सुख-सुविधाओं और सौंदर्य के प्रति स्वाभाविक रूप से आकर्षित होते हैं। वृषभ राशि में उच्च का चंद्रमा आपकी अंतर्ज्ञान शक्ति को प्रबल बनाता है और आपको कठिन परिस्थितियों में भी संतुलित रहने की क्षमता देता है। आपकी स्मरण शक्ति उत्कृष्ट है और आप कलात्मक गतिविधियों में रुचि रखते हैं। परिवार और प्रियजनों के साथ आपका गहरा भावनात्मक जुड़ाव रहता है। मंगल ग्रह आपकी कुंडली में मेष राशि में स्वगृही है जो अत्यंत शुभ स्थिति मानी जाती है। इससे आपमें साहस, नेतृत्व क्षमता, आत्मविश्वास और कर्मठता का विशेष समावेश होता है। आप अपने लक्ष्यों के प्रति दृढ़ संकल्पित रहते हैं और चुनौतियों का सामना करने से पीछे नहीं हटते। शनि ग्रह मकर राशि में स्वगृही होकर आपको अनुशासन, धैर्य और दीर्घकालिक दृष्टिकोण प्रदान करता है। बृहस्पति धनु राशि में स्वगृही होकर आपके जीवन में ज्ञान, धर्म, आध्यात्मिकता और सौभाग्य का विस्तार करता है।';

// Available width calculations:
// Full-width: A4=595pt - paddingH(42*2) - containerPaddingH(20*2) - textPaddingH(6*2) = 595-84-40-12 = 459pt
// Narrow: 200pt - containerPadding(10*2) = 180pt
const FULL_WIDTH_PT = 459;
const NARROW_WIDTH_PT = 180;
const FONT_SIZE = 10;

interface PreWrappedProps {
  fullWidthText: string;
  narrowText: string;
}

const HindiTestDoc = ({ fullWidthText, narrowText }: PreWrappedProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.heading}>Test 1: Long paragraph — full width (preWrapText)</Text>
      <View style={styles.fullContainer}>
        <Text style={styles.disclaimerText}>{fullWidthText}</Text>
      </View>

      <Text style={styles.heading}>Test 2: Same paragraph — narrow 200pt box (preWrapText)</Text>
      <View style={styles.narrowContainer}>
        <Text style={styles.text}>{narrowText}</Text>
      </View>
    </Page>
  </Document>
);

export default function PdfTest() {
  const [status, setStatus] = useState('Click to generate');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const generate = async () => {
    setStatus('Pre-wrapping text with canvas measurement...');
    try {
      console.log('[PdfTest] Pre-wrapping text...');

      const fullWidthText = await preWrapText(longPara, 'hi', FONT_SIZE, FULL_WIDTH_PT);
      const narrowText = await preWrapText(longPara, 'hi', FONT_SIZE, NARROW_WIDTH_PT);

      console.log('[PdfTest] Full-width lines:', fullWidthText.split('\n').length);
      console.log('[PdfTest] Narrow lines:', narrowText.split('\n').length);
      console.log('[PdfTest] Full-width result:\n' + fullWidthText);
      console.log('[PdfTest] Narrow result:\n' + narrowText);

      setStatus('Generating PDF...');
      const blob = await pdf(<HindiTestDoc fullWidthText={fullWidthText} narrowText={narrowText} />).toBlob();
      console.log('[PdfTest] PDF blob created, size:', blob.size);
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setStatus(`Done! PDF size: ${blob.size} bytes`);
    } catch (e: any) {
      console.error('[PdfTest] Error:', e);
      setStatus('Error: ' + e.message);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Hindi PDF Line-Break Test (preWrapText)</h1>
      <button onClick={generate} style={{ padding: '10px 20px', fontSize: 16, cursor: 'pointer', background: '#ea580c', color: 'white', border: 'none', borderRadius: 6 }}>
        Generate Hindi PDF
      </button>
      <p>{status}</p>
      {pdfUrl && (
        <iframe src={pdfUrl} style={{ width: '100%', height: '80vh', border: '1px solid #ccc' }} />
      )}
    </div>
  );
}
