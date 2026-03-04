import React, { useEffect, useState } from 'react';
import { Document, Page, View, Text, StyleSheet, Font, pdf } from '@react-pdf/renderer';

Font.register({ family: 'NotoSansDevanagari', fonts: [
  { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 'normal' },
  { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 'bold' },
]});
Font.register({ family: 'DejaVuSans', fonts: [
  { src: '/fonts/DejaVuSans.ttf', fontWeight: 'normal' },
  { src: '/fonts/DejaVuSans-Bold.ttf', fontWeight: 'bold' },
]});

const s = StyleSheet.create({
  page: { backgroundColor: '#1a1a2e', padding: 30 },
  heading: { fontSize: 14, color: '#f59e0b', fontWeight: 'bold', marginTop: 16, marginBottom: 6, fontFamily: 'DejaVuSans' },
  row: { flexDirection: 'row', marginBottom: 4 },
  label: { fontSize: 9, color: '#999', width: 250, fontFamily: 'DejaVuSans' },
  val: { fontSize: 11, color: '#fff' },
});

const Row = ({ label, value, font }: { label: string; value: string; font: string }) => (
  <View style={s.row}>
    <Text style={s.label}>{label}</Text>
    <Text style={[s.val, { fontFamily: font }]}>{value}</Text>
  </View>
);

const CoverTestDoc = () => (
  <Document>
    <Page size="A4" style={s.page}>
      <Text style={{ fontSize: 16, color: '#fff', textAlign: 'center', marginBottom: 10, fontFamily: 'DejaVuSans', fontWeight: 'bold' }}>
        Font Isolation Test
      </Text>

      <Text style={s.heading}>1. Pure digits - NotoSansDevanagari</Text>
      <Row label='Just "2002"' value="2002" font="NotoSansDevanagari" />
      <Row label='"12345"' value="12345" font="NotoSansDevanagari" />
      <Row label='"200" (3 digits)' value="200" font="NotoSansDevanagari" />
      <Row label='"20022"' value="20022" font="NotoSansDevanagari" />

      <Text style={s.heading}>2. Pure digits - DejaVuSans</Text>
      <Row label='Just "2002"' value="2002" font="DejaVuSans" />
      <Row label='"12345"' value="12345" font="DejaVuSans" />

      <Text style={s.heading}>3. Hindi date - NotoSansDevanagari</Text>
      <Row label='"5 जुलाई 2002"' value="5 जुलाई 2002" font="NotoSansDevanagari" />
      <Row label='"5 जुलाई 2002 "  (trailing space)' value="5 जुलाई 2002 " font="NotoSansDevanagari" />
      <Row label='With zero-width space after year' value={"5 जुलाई 2002\u200B"} font="NotoSansDevanagari" />
      <Row label='With nbsp after year' value={"5 जुलाई 2002\u00A0"} font="NotoSansDevanagari" />

      <Text style={s.heading}>4. Hindi date - DejaVuSans</Text>
      <Row label='"5 जुलाई 2002"' value="5 जुलाई 2002" font="DejaVuSans" />

      <Text style={s.heading}>5. Hindi date - split: Hindi in Noto, year in DejaVu</Text>
      <View style={s.row}>
        <Text style={s.label}>Split rendering</Text>
        <Text style={[s.val, { fontFamily: 'NotoSansDevanagari' }]}>
          5 जुलाई{' '}
          <Text style={{ fontFamily: 'DejaVuSans' }}>2002</Text>
        </Text>
      </View>

      <Text style={s.heading}>6. Different year values - NotoSansDevanagari</Text>
      <Row label='"5 जुलाई 1995"' value="5 जुलाई 1995" font="NotoSansDevanagari" />
      <Row label='"5 जुलाई 1990"' value="5 जुलाई 1990" font="NotoSansDevanagari" />
      <Row label='"5 जुलाई 2023"' value="5 जुलाई 2023" font="NotoSansDevanagari" />
      <Row label='"15 दिसंबर 2002"' value="15 दिसंबर 2002" font="NotoSansDevanagari" />

      <Text style={s.heading}>7. Only Devanagari text - NotoSansDevanagari</Text>
      <Row label='Pure Hindi' value="नमस्ते दुनिया" font="NotoSansDevanagari" />
      <Row label='Hindi + 1 digit' value="नमस्ते 5" font="NotoSansDevanagari" />
    </Page>
  </Document>
);

const CoverTest: React.FC = () => {
  const [status, setStatus] = useState('Generating PDF...');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await pdf(<CoverTestDoc />).toBlob();
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cover-test.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setStatus('PDF downloaded! Check ~/Downloads/cover-test.pdf');
      } catch (err: any) {
        setStatus(`Error: ${err.message}`);
        console.error('PDF gen error:', err);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ padding: 40, background: '#1a1a2e', color: '#fff', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#f59e0b' }}>Font Isolation Test</h1>
      <p>{status}</p>
    </div>
  );
};

export default CoverTest;
