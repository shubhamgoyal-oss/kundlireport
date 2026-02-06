import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, G, Rect, Circle, Line, Polygon, Ellipse, Defs, ClipPath, LinearGradient, RadialGradient, Stop, Tspan } from '@react-pdf/renderer';
import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
// Disable hyphenation to prevent character substitution issues
Font.registerHyphenationCallback(word => [word]);

// Register DejaVu Sans as fallback to handle all characters properly
// DejaVu Sans has complete Latin character coverage
Font.register({
  family: 'DejaVuSans',
  fonts: [
    {
      src: '/fonts/DejaVuSans.ttf',
      fontWeight: 'normal',
    },
    {
      src: '/fonts/DejaVuSans-Bold.ttf',
      fontWeight: 'bold',
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'DejaVuSans',
    lineHeight: 1.5,
  },
  coverPage: {
    padding: 40,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    fontFamily: 'DejaVuSans',
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 20,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  coverName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  coverDetails: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 5,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7c3aed',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#7c3aed',
  },
  subHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4c1d95',
    marginTop: 15,
    marginBottom: 8,
  },
  subSubHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#6d28d9',
    marginTop: 10,
    marginBottom: 5,
  },
  paragraph: {
    marginBottom: 10,
    // Justify can cause bad word spacing/overlap in some PDF renderers.
    // Left-aligned is more reliable/readable.
    textAlign: 'left',
  },
  table: {
    width: '100%',
    marginVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#7c3aed',
    paddingVertical: 8,
  },
  tableHeaderCell: {
    flex: 1,
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 10,
    paddingHorizontal: 5,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 5,
  },
  card: {
    backgroundColor: '#f5f3ff',
    borderRadius: 5,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7c3aed',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#4c1d95',
    marginBottom: 5,
  },
  badge: {
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 9,
    marginRight: 5,
  },
  badgeOutline: {
    borderWidth: 1,
    borderColor: '#7c3aed',
    color: '#7c3aed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 9,
    marginRight: 5,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 120,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  value: {
    flex: 1,
    color: '#1f2937',
  },
  list: {
    marginLeft: 15,
    marginVertical: 5,
  },
  listItem: {
    marginBottom: 4,
  },
  bullet: {
    width: 15,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionBreak: {
    marginVertical: 20,
  },
  highlight: {
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 4,
    marginVertical: 5,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 8,
  },
  section: {
    marginBottom: 10,
  },
  chartContainer: {
    width: 200,
    height: 200,
    marginVertical: 5,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartItem: {
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4c1d95',
    marginBottom: 5,
    textAlign: 'center',
  },
  chartPurpose: {
    fontSize: 9,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 3,
  },
});

// Helper components
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.header}>{title}</Text>
    {children}
  </View>
);

const SubSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View>
    <Text style={styles.subHeader}>{title}</Text>
    {children}
  </View>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{title}</Text>
    {children}
  </View>
);

const BulletList = ({ items }: { items: string[] }) => (
  <View style={styles.list}>
    {items.map((item, idx) => (
      <View key={idx} style={{ flexDirection: 'row', marginBottom: 3 }}>
        <Text style={styles.bullet}>-</Text>
        <Text style={{ flex: 1 }}>{item}</Text>
      </View>
    ))}
  </View>
);

// SVG Parser - converts SVG string to react-pdf components
const parseSvgElement = (element: Element, key: number): React.ReactNode | null => {
  const tagName = element.tagName.toLowerCase();
  const attrs: Record<string, any> = {};
  
  // Convert attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    let name = attr.name;
    let value: string | number = attr.value;
    
    // Convert kebab-case to camelCase
    name = name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    
    // Skip class and style (we handle these separately)
    if (name === 'class' || name === 'className') continue;
    
    // Convert numeric values
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      value = parseFloat(value);
    }
    
    attrs[name] = value;
  }
  
  // Parse children
  const children: React.ReactNode[] = [];
  for (let i = 0; i < element.children.length; i++) {
    const child = parseSvgElement(element.children[i], i);
    if (child) children.push(child);
  }
  
  // Handle text content
  if (element.children.length === 0 && element.textContent) {
    const textContent = element.textContent.trim();
    if (textContent && (tagName === 'text' || tagName === 'tspan')) {
      children.push(textContent);
    }
  }
  
  // Map to react-pdf SVG components - cast to any to bypass strict prop requirements
  switch (tagName) {
    case 'svg':
      return <Svg key={key} {...(attrs as any)}>{children}</Svg>;
    case 'g':
      return <G key={key} {...(attrs as any)}>{children}</G>;
    case 'path':
      if (!attrs.d) return null;
      return <Path key={key} {...(attrs as any)} />;
    case 'rect':
      return <Rect key={key} width={attrs.width || 0} height={attrs.height || 0} {...(attrs as any)} />;
    case 'circle':
      return <Circle key={key} r={attrs.r || 0} {...(attrs as any)} />;
    case 'ellipse':
      return <Ellipse key={key} rx={attrs.rx || 0} ry={attrs.ry || 0} {...(attrs as any)} />;
    case 'line':
      return <Line key={key} x1={attrs.x1 || 0} x2={attrs.x2 || 0} y1={attrs.y1 || 0} y2={attrs.y2 || 0} {...(attrs as any)} />;
    case 'polygon':
      if (!attrs.points) return null;
      return <Polygon key={key} {...(attrs as any)} />;
    case 'text':
      return <Text key={key} {...(attrs as any)}>{children}</Text>;
    case 'tspan':
      return <Tspan key={key} {...(attrs as any)}>{children}</Tspan>;
    case 'defs':
      return <Defs key={key}>{children}</Defs>;
    case 'clippath':
      if (!attrs.id) return null;
      return <ClipPath key={key} {...(attrs as any)}>{children}</ClipPath>;
    case 'lineargradient':
      if (!attrs.id) return null;
      return <LinearGradient key={key} {...(attrs as any)}>{children}</LinearGradient>;
    case 'radialgradient':
      if (!attrs.id) return null;
      return <RadialGradient key={key} {...(attrs as any)}>{children}</RadialGradient>;
    case 'stop':
      return <Stop key={key} offset={attrs.offset || '0%'} stopColor={attrs.stopColor || '#000'} {...(attrs as any)} />;
    default:
      return null;
  }
};

const SVGRenderer = ({ svgString, width = 200, height = 200 }: { svgString: string; width?: number; height?: number }) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('No SVG element found');
    }
    
    // Set dimensions
    svgElement.setAttribute('width', String(width));
    svgElement.setAttribute('height', String(height));
    
    const parsed = parseSvgElement(svgElement, 0);
    return <>{parsed}</>;
  } catch (error) {
    console.error('[SVGRenderer] Failed to parse SVG:', error);
    return (
      <View style={styles.chartContainer}>
        <Text style={{ color: '#6b7280', fontSize: 9, textAlign: 'center' }}>
          Chart available in web view
        </Text>
      </View>
    );
  }
};
interface ChartData {
  type: string;
  name: string;
  nameHindi: string;
  purpose: string;
  svg: string;
}

interface KundliPDFProps {
  report: any; // Full KundliReport type
}

export const KundliPDFDocument = ({ report }: KundliPDFProps) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const charts: ChartData[] = report.charts || [];
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        {/* Avoid emoji here: the embedded font may not contain emoji glyphs and can break layout */}
        <Text style={styles.coverTitle}>Kundli Report</Text>
        <Text style={styles.coverSubtitle}>Comprehensive Vedic Astrology Analysis</Text>
        <View style={{ marginTop: 40 }}>
          <Text style={styles.coverName}>{report.birthDetails.name}</Text>
          <Text style={styles.coverDetails}>Date of Birth: {report.birthDetails.dateOfBirth}</Text>
          <Text style={styles.coverDetails}>Time of Birth: {report.birthDetails.timeOfBirth}</Text>
          <Text style={styles.coverDetails}>Place of Birth: {report.birthDetails.placeOfBirth}</Text>
        </View>
        <View style={{ marginTop: 60 }}>
          <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>
            Generated on {formatDate(report.generatedAt)}
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 5 }}>
            Sri Mandir
          </Text>
        </View>
      </Page>

      {/* Kundali Charts Section */}
      {charts.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Section title="Kundali Charts (Divisional Charts)">
            <Text style={styles.paragraph}>
              These are the key divisional charts (Varga charts) derived from your birth chart. Each chart reveals specific life areas and is used for deeper analysis of those domains.
            </Text>
            <View style={styles.chartGrid}>
              {charts.slice(0, 2).map((chart, idx) => (
                <View key={idx} style={styles.chartItem}>
                  <Text style={styles.chartTitle}>{chart.type}: {chart.name}</Text>
                  <View style={styles.chartContainer}>
                    <SVGRenderer svgString={chart.svg} />
                  </View>
                  <Text style={styles.chartPurpose}>{chart.purpose}</Text>
                </View>
              ))}
            </View>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Additional Charts Page */}
      {charts.length > 2 && (
        <Page size="A4" style={styles.page}>
          <Section title="Additional Divisional Charts">
            <View style={styles.chartGrid}>
              {charts.slice(2, 4).map((chart, idx) => (
                <View key={idx} style={styles.chartItem}>
                  <Text style={styles.chartTitle}>{chart.type}: {chart.name}</Text>
                  <View style={styles.chartContainer}>
                    <SVGRenderer svgString={chart.svg} />
                  </View>
                  <Text style={styles.chartPurpose}>{chart.purpose}</Text>
                </View>
              ))}
            </View>
            {charts.length > 4 && (
              <View style={styles.chartGrid}>
                {charts.slice(4).map((chart, idx) => (
                  <View key={idx} style={styles.chartItem}>
                    <Text style={styles.chartTitle}>{chart.type}: {chart.name}</Text>
                    <View style={styles.chartContainer}>
                      <SVGRenderer svgString={chart.svg} />
                    </View>
                    <Text style={styles.chartPurpose}>{chart.purpose}</Text>
                  </View>
                ))}
              </View>
            )}
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}
      {/* Birth Details & Planetary Positions */}
      <Page size="A4" style={styles.page}>
        <Section title="Birth Details">
          <View style={styles.card}>
            <InfoRow label="Name" value={report.birthDetails.name} />
            <InfoRow label="Date of Birth" value={report.birthDetails.dateOfBirth} />
            <InfoRow label="Time of Birth" value={report.birthDetails.timeOfBirth} />
            <InfoRow label="Place of Birth" value={report.birthDetails.placeOfBirth} />
            <InfoRow label="Ascendant (Lagna)" value={`${report.ascendant.sign} (${report.ascendant.degree.toFixed(2)}°)`} />
          </View>
        </Section>

        <Section title="Planetary Positions">
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Planet</Text>
              <Text style={styles.tableHeaderCell}>Sign</Text>
              <Text style={styles.tableHeaderCell}>House</Text>
              <Text style={styles.tableHeaderCell}>Degree</Text>
              <Text style={styles.tableHeaderCell}>Status</Text>
            </View>
            {report.planetaryPositions.map((planet: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCell}>{planet.name}</Text>
                <Text style={styles.tableCell}>{planet.sign}</Text>
                <Text style={styles.tableCell}>{planet.house}</Text>
                <Text style={styles.tableCell}>{planet.degree.toFixed(2)}°</Text>
                <Text style={styles.tableCell}>{planet.isRetro ? 'Retrograde' : 'Direct'}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Chara Karakas (Jaimini)">
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>Karaka</Text>
              <Text style={styles.tableHeaderCell}>Planet</Text>
              <Text style={styles.tableHeaderCell}>Degree</Text>
              <Text style={styles.tableHeaderCell}>Signification</Text>
            </View>
            {report.charaKarakas.map((karaka: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCell}>{karaka.karaka}</Text>
                <Text style={styles.tableCell}>{karaka.planet}</Text>
                <Text style={styles.tableCell}>{karaka.degree.toFixed(2)}°</Text>
                <Text style={styles.tableCell}>{karaka.signification}</Text>
              </View>
            ))}
          </View>
        </Section>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>

      {/* Panchang Analysis */}
      {report.panchang && (
        <Page size="A4" style={styles.page}>
          <Section title="Panchang Analysis">
            <Text style={styles.paragraph}>
              The Panchang (five limbs) provides the foundational cosmic timing of your birth, revealing the day's energy, lunar phase, and celestial influences that shape your destiny.
            </Text>
            
            <Card title={`Vaar (Day): ${report.panchang.vaar?.day || 'N/A'}`}>
              <Text style={styles.paragraph}>{report.panchang.vaar?.interpretation || ''}</Text>
            </Card>

            <Card title={`Tithi: ${report.panchang.tithi?.name || 'N/A'} (${report.panchang.tithi?.paksha || ''})`}>
              <Text style={styles.paragraph}>{report.panchang.tithi?.interpretation || ''}</Text>
            </Card>

            <Card title={`Nakshatra: ${report.panchang.nakshatra?.name || 'N/A'} (Pada ${report.panchang.nakshatra?.pada || ''})`}>
              <Text style={styles.paragraph}>{report.panchang.nakshatra?.interpretation || ''}</Text>
            </Card>

            <Card title={`Yoga: ${report.panchang.yoga?.name || 'N/A'}`}>
              <Text style={styles.paragraph}>{report.panchang.yoga?.interpretation || ''}</Text>
            </Card>

            <Card title={`Karana: ${report.panchang.karana?.name || 'N/A'}`}>
              <Text style={styles.paragraph}>{report.panchang.karana?.interpretation || ''}</Text>
            </Card>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Three Pillars */}
      {report.pillars && (
        <Page size="A4" style={styles.page}>
          <Section title="Three Pillars of Your Chart">
            <Text style={styles.paragraph}>
              The three fundamental pillars—Moon Sign, Ascendant, and Birth Nakshatra—form the core identity markers of your horoscope, revealing your emotional nature, physical constitution, and life purpose.
            </Text>

            <SubSection title={`Moon Sign (Rashi): ${report.pillars.moonSign?.sign || 'N/A'}`}>
              <Text style={styles.paragraph}>{report.pillars.moonSign?.interpretation || ''}</Text>
              <InfoRow label="Element" value={report.pillars.moonSign?.element || 'N/A'} />
              <InfoRow label="Emotional Nature" value={report.pillars.moonSign?.emotionalNature || 'N/A'} />
            </SubSection>

            <SubSection title={`Ascendant (Lagna): ${report.pillars.ascendant?.sign || 'N/A'}`}>
              <Text style={styles.paragraph}>{report.pillars.ascendant?.interpretation || ''}</Text>
              <InfoRow label="Ruling Planet" value={report.pillars.ascendant?.rulingPlanet || 'N/A'} />
              <InfoRow label="Personality" value={report.pillars.ascendant?.personality || 'N/A'} />
            </SubSection>

            <SubSection title={`Birth Nakshatra: ${report.pillars.nakshatra?.name || 'N/A'}`}>
              <Text style={styles.paragraph}>{report.pillars.nakshatra?.interpretation || ''}</Text>
              <InfoRow label="Deity" value={report.pillars.nakshatra?.deity || 'N/A'} />
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Planetary Profiles */}
      {report.planets && report.planets.length > 0 && (
        <>
          {report.planets.map((planet: any, idx: number) => (
            <Page key={idx} size="A4" style={styles.page}>
              <Section title={`${planet.planet} - Planetary Analysis`}>
                <View style={styles.row}>
                  <View style={{ marginRight: 10 }}>
                    <Text style={styles.badgeOutline}>{planet.sign}</Text>
                  </View>
                  <View style={{ marginRight: 10 }}>
                    <Text style={styles.badgeOutline}>House {planet.house}</Text>
                  </View>
                  <View style={{ marginRight: 10 }}>
                    <Text style={styles.badge}>{planet.dignity}</Text>
                  </View>
                  {planet.isRetrograde && (
                    <View>
                      <Text style={{ ...styles.badge, backgroundColor: '#dc2626' }}>Retrograde</Text>
                    </View>
                  )}
                </View>

                <SubSection title="Placement Analysis">
                  <Text style={styles.paragraph}>{planet.placementAnalysis || ''}</Text>
                </SubSection>

                {planet.houseSignificance && (
                  <SubSection title="House Significance">
                    <Text style={styles.paragraph}>{planet.houseSignificance}</Text>
                  </SubSection>
                )}

                {planet.aspects && planet.aspects.length > 0 && (
                  <SubSection title="Aspects">
                    {planet.aspects.map((aspect: any, aIdx: number) => (
                      <Card key={aIdx} title={`${aspect.aspectType} Aspect → House ${aspect.targetHouse}`}>
                        <Text style={styles.paragraph}>{aspect.interpretation || ''}</Text>
                      </Card>
                    ))}
                  </SubSection>
                )}

                {planet.retrogradeEffect && planet.isRetrograde && (
                  <SubSection title="Retrograde Effect">
                    <View style={styles.highlight}>
                      <Text>{planet.retrogradeEffect}</Text>
                    </View>
                  </SubSection>
                )}

                {planet.dashaInfluence && (
                  <SubSection title="Dasha Influence">
                    <Text style={styles.paragraph}>{planet.dashaInfluence}</Text>
                  </SubSection>
                )}

                {planet.remedies && planet.remedies.length > 0 && (
                  <SubSection title="Remedies">
                    <BulletList items={planet.remedies} />
                  </SubSection>
                )}
              </Section>
              <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
            </Page>
          ))}
        </>
      )}

      {/* House Analysis (Bhavphal) */}
      {report.houses && report.houses.length > 0 && (
        <>
          <Page size="A4" style={styles.page}>
            <Section title="Bhavphal - House Analysis Overview">
              <Text style={styles.paragraph}>
                The twelve houses (Bhavas) of your horoscope govern different areas of life. Each house is colored by its sign, 
                lord placement, and any planetary occupants. This comprehensive analysis reveals the potential in each life domain.
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>House</Text>
                  <Text style={styles.tableHeaderCell}>Sign</Text>
                  <Text style={styles.tableHeaderCell}>Lord</Text>
                  <Text style={styles.tableHeaderCell}>Lord in</Text>
                  <Text style={styles.tableHeaderCell}>Occupants</Text>
                </View>
                {report.houses.map((house: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{house.house}</Text>
                    <Text style={styles.tableCell}>{house.sign}</Text>
                    <Text style={styles.tableCell}>{house.lord}</Text>
                    <Text style={styles.tableCell}>H{house.lordHouse}</Text>
                    <Text style={styles.tableCell}>{house.occupants?.join(', ') || 'Empty'}</Text>
                  </View>
                ))}
              </View>
            </Section>
            <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
          </Page>

          {report.houses.map((house: any, idx: number) => (
            <Page key={idx} size="A4" style={styles.page}>
              <Section title={`House ${house.house} - ${house.houseHindi || ''}`}>
                <View style={styles.row}>
                  <View style={{ marginRight: 10 }}>
                    <Text style={styles.badgeOutline}>{house.sign}</Text>
                  </View>
                  <View style={{ marginRight: 10 }}>
                    <Text style={styles.badge}>Lord: {house.lord}</Text>
                  </View>
                  <View>
                    <Text style={styles.badgeOutline}>{house.houseNature}</Text>
                  </View>
                </View>

                <SubSection title="Significance">
                  <Text style={styles.paragraph}>{house.significance || ''}</Text>
                </SubSection>

                <SubSection title="Detailed Analysis">
                  <Text style={styles.paragraph}>{house.interpretation || ''}</Text>
                </SubSection>

                {house.predictions && house.predictions.length > 0 && (
                  <SubSection title="Predictions">
                    <BulletList items={house.predictions} />
                  </SubSection>
                )}

                <View style={styles.grid2}>
                  {house.strengths && house.strengths.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>Strengths</Text>
                      <BulletList items={house.strengths} />
                    </View>
                  )}
                  {house.challenges && house.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>Challenges</Text>
                      <BulletList items={house.challenges} />
                    </View>
                  )}
                </View>

                {house.timing && (
                  <SubSection title="Timing">
                    <Text style={styles.paragraph}>{house.timing}</Text>
                  </SubSection>
                )}
              </Section>
              <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
            </Page>
          ))}
        </>
      )}

      {/* Career Analysis */}
      {report.career && (
        <Page size="A4" style={styles.page}>
          <Section title="Career Calling">
            <Text style={styles.paragraph}>{report.career.overview || ''}</Text>

            <SubSection title="10th House Analysis">
              <Text style={styles.paragraph}>{report.career.tenthHouse?.interpretation || ''}</Text>
              {report.career.tenthHouse?.careerThemes && (
                <BulletList items={report.career.tenthHouse.careerThemes} />
              )}
            </SubSection>

            <SubSection title="Sun Analysis (Authority)">
              <Text style={styles.paragraph}>{report.career.sunAnalysis?.interpretation || ''}</Text>
            </SubSection>

            <SubSection title="Saturn Analysis (Work Ethic)">
              <Text style={styles.paragraph}>{report.career.saturnAnalysis?.interpretation || ''}</Text>
            </SubSection>

            <SubSection title="Amatyakaraka (Career Significator)">
              <InfoRow label="Planet" value={report.career.amatyakaraka?.planet || 'N/A'} />
              <Text style={styles.paragraph}>{report.career.amatyakaraka?.interpretation || ''}</Text>
            </SubSection>

            <SubSection title="Suitable Career Fields">
              <BulletList items={report.career.suitableFields || []} />
            </SubSection>

            {report.career.avoidFields && report.career.avoidFields.length > 0 && (
              <SubSection title="Fields to Avoid">
                <BulletList items={report.career.avoidFields} />
              </SubSection>
            )}

            <SubSection title="Success Formula">
              <View style={styles.highlight}>
                <Text>{report.career.successFormula || ''}</Text>
              </View>
            </SubSection>

            <SubSection title="Wealth Potential">
              <Text style={styles.paragraph}>{report.career.wealthPotential || ''}</Text>
            </SubSection>

            <SubSection title="Business vs Job">
              <Text style={styles.paragraph}>{report.career.businessVsJob || ''}</Text>
            </SubSection>

            <SubSection title="Recommendations">
              <BulletList items={report.career.recommendations || []} />
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Marriage Analysis */}
      {report.marriage && (
        <Page size="A4" style={styles.page}>
          <Section title="Love & Marriage">
            <Text style={styles.paragraph}>{report.marriage.overview || ''}</Text>

            <SubSection title="5th House (Romance)">
              <Text style={styles.paragraph}>{report.marriage.fifthHouse?.interpretation || ''}</Text>
              <InfoRow label="Love Nature" value={report.marriage.fifthHouse?.loveNature || 'N/A'} />
            </SubSection>

            <SubSection title="7th House (Marriage)">
              <Text style={styles.paragraph}>{report.marriage.seventhHouse?.interpretation || ''}</Text>
              <InfoRow label="Marriage Prospects" value={report.marriage.seventhHouse?.marriageProspects || 'N/A'} />
            </SubSection>

            <SubSection title="Venus Analysis">
              <Text style={styles.paragraph}>{report.marriage.venusAnalysis?.interpretation || ''}</Text>
              <InfoRow label="Attraction Style" value={report.marriage.venusAnalysis?.attractionStyle || 'N/A'} />
            </SubSection>

            <SubSection title="Darakaraka (Spouse Significator)">
              <InfoRow label="Planet" value={report.marriage.darakaraka?.planet || 'N/A'} />
              <Text style={styles.paragraph}>{report.marriage.darakaraka?.interpretation || ''}</Text>
              {report.marriage.darakaraka?.partnerQualities && (
                <>
                  <Text style={styles.subSubHeader}>Partner Qualities</Text>
                  <BulletList items={report.marriage.darakaraka.partnerQualities} />
                </>
              )}
            </SubSection>

            <SubSection title="Partner Profile">
              <InfoRow label="Physical Traits" value={report.marriage.partnerProfile?.physicalTraits || 'N/A'} />
              <InfoRow label="Personality" value={report.marriage.partnerProfile?.personality || 'N/A'} />
              <InfoRow label="Background" value={report.marriage.partnerProfile?.background || 'N/A'} />
              <InfoRow label="Meeting" value={report.marriage.partnerProfile?.meetingCircumstances || 'N/A'} />
            </SubSection>

            <SubSection title="Marriage Timing">
              <InfoRow label="Ideal Age Range" value={report.marriage.marriageTiming?.idealAgeRange || 'N/A'} />
              {report.marriage.marriageTiming?.favorablePeriods && (
                <>
                  <Text style={styles.subSubHeader}>Favorable Periods</Text>
                  <BulletList items={report.marriage.marriageTiming.favorablePeriods} />
                </>
              )}
            </SubSection>

            {report.marriage.mangalDosha?.present && (
              <SubSection title="Mangal Dosha">
                <View style={styles.highlight}>
                  <Text>Severity: {report.marriage.mangalDosha.severity}</Text>
                </View>
                <BulletList items={report.marriage.mangalDosha.remedies || []} />
              </SubSection>
            )}
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Dasha Predictions - Page 1: Current Mahadasha & Antardasha */}
      {report.dasha && (
        <Page size="A4" style={styles.page}>
          <Section title="Vimshottari Dasha Predictions">
            <Text style={styles.paragraph}>{report.dasha.overview || ''}</Text>
            <Text style={styles.paragraph}>{report.dasha.vimshottariSystem || ''}</Text>

            <SubSection title="Birth Nakshatra">
              <InfoRow label="Nakshatra" value={report.dasha.birthNakshatra?.name || 'N/A'} />
              <InfoRow label="Lord" value={report.dasha.birthNakshatra?.lord || 'N/A'} />
              <InfoRow label="Starting Dasha" value={report.dasha.birthNakshatra?.startingDasha || 'N/A'} />
              <InfoRow label="Balance at Birth" value={report.dasha.birthNakshatra?.balance || 'N/A'} />
            </SubSection>

            <SubSection title={`Current Mahadasha: ${report.dasha.currentMahadasha?.planet || 'N/A'}`}>
              <View style={styles.card}>
                <InfoRow label="Period" value={`${report.dasha.currentMahadasha?.startDate || ''} to ${report.dasha.currentMahadasha?.endDate || ''}`} />
                <Text style={{ fontSize: 10, color: '#6d28d9', marginTop: 5 }}>
                  {report.dasha.currentMahadasha?.planetSignificance || ''}
                </Text>
              </View>
              <Text style={styles.paragraph}>{report.dasha.currentMahadasha?.interpretation || ''}</Text>
              
              {report.dasha.currentMahadasha?.majorThemes && report.dasha.currentMahadasha.majorThemes.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>Major Themes</Text>
                  <BulletList items={report.dasha.currentMahadasha.majorThemes} />
                </>
              )}
              
              {report.dasha.currentMahadasha?.opportunities && report.dasha.currentMahadasha.opportunities.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>Opportunities</Text>
                  <BulletList items={report.dasha.currentMahadasha.opportunities} />
                </>
              )}
              
              {report.dasha.currentMahadasha?.challenges && report.dasha.currentMahadasha.challenges.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>Challenges</Text>
                  <BulletList items={report.dasha.currentMahadasha.challenges} />
                </>
              )}

              {report.dasha.currentMahadasha?.advice && (
                <View style={styles.highlight}>
                  <Text style={{ fontWeight: 'bold' }}>Advice: </Text>
                  <Text>{report.dasha.currentMahadasha.advice}</Text>
                </View>
              )}
            </SubSection>

            <SubSection title={`Current Antardasha: ${report.dasha.currentAntardasha?.planet || 'N/A'}`}>
              <View style={styles.card}>
                <InfoRow label="Period" value={`${report.dasha.currentAntardasha?.startDate || ''} to ${report.dasha.currentAntardasha?.endDate || ''}`} />
              </View>
              <Text style={styles.paragraph}>{report.dasha.currentAntardasha?.interpretation || ''}</Text>
              
              {report.dasha.currentAntardasha?.keyEvents && report.dasha.currentAntardasha.keyEvents.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>Key Events to Watch</Text>
                  <BulletList items={report.dasha.currentAntardasha.keyEvents} />
                </>
              )}

              {report.dasha.currentAntardasha?.recommendations && report.dasha.currentAntardasha.recommendations.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>Recommendations</Text>
                  <BulletList items={report.dasha.currentAntardasha.recommendations} />
                </>
              )}
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Dasha Predictions - Page 2: Detailed Mahadasha Predictions */}
      {report.dasha?.mahadashaPredictions && report.dasha.mahadashaPredictions.length > 0 && (
        <>
          {report.dasha.mahadashaPredictions.map((md: any, idx: number) => (
            <Page key={`md-${idx}`} size="A4" style={styles.page}>
              <Section title={`${md.planet} Mahadasha Predictions`}>
                <View style={styles.card}>
                  <InfoRow label="Period" value={`${md.startDate || ''} to ${md.endDate || ''}`} />
                  <InfoRow label="Duration" value={md.duration || ''} />
                </View>
                
                <Text style={styles.paragraph}>{md.overview || ''}</Text>

                <SubSection title="Career Impact">
                  <Text style={styles.paragraph}>{md.careerImpact || ''}</Text>
                </SubSection>

                <SubSection title="Relationship Impact">
                  <Text style={styles.paragraph}>{md.relationshipImpact || ''}</Text>
                </SubSection>

                <SubSection title="Health Impact">
                  <Text style={styles.paragraph}>{md.healthImpact || ''}</Text>
                </SubSection>

                <SubSection title="Financial Impact">
                  <Text style={styles.paragraph}>{md.financialImpact || ''}</Text>
                </SubSection>

                <SubSection title="Spiritual Growth">
                  <Text style={styles.paragraph}>{md.spiritualGrowth || ''}</Text>
                </SubSection>

                {md.keyEvents && md.keyEvents.length > 0 && (
                  <SubSection title="Key Events">
                    <BulletList items={md.keyEvents} />
                  </SubSection>
                )}

                <View style={styles.grid2}>
                  {md.opportunities && md.opportunities.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>Opportunities</Text>
                      <BulletList items={md.opportunities} />
                    </View>
                  )}
                  {md.challenges && md.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>Challenges</Text>
                      <BulletList items={md.challenges} />
                    </View>
                  )}
                </View>

                {md.remedies && md.remedies.length > 0 && (
                  <SubSection title="Recommended Remedies">
                    <BulletList items={md.remedies} />
                  </SubSection>
                )}
              </Section>
              <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
            </Page>
          ))}
        </>
      )}

      {/* Dasha Predictions - Antardasha Details */}
      {report.dasha?.antardashaPredictions && report.dasha.antardashaPredictions.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Section title="Antardasha Predictions (Current Mahadasha)">
            <Text style={styles.paragraph}>
              The following are the sub-periods (Antardashas) within your current Mahadasha. Each sub-period brings specific influences based on the interplay between the Mahadasha and Antardasha lords.
            </Text>
            
            {report.dasha.antardashaPredictions.map((ad: any, idx: number) => (
              <Card key={idx} title={`${ad.mahadasha}/${ad.antardasha} (${ad.duration || ''})`}>
                <InfoRow label="Period" value={`${ad.startDate || ''} to ${ad.endDate || ''}`} />
                <Text style={styles.paragraph}>{ad.overview || ''}</Text>
                
                {ad.focusAreas && ad.focusAreas.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Focus Areas</Text>
                    <BulletList items={ad.focusAreas} />
                  </>
                )}
                
                {ad.predictions && ad.predictions.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Predictions</Text>
                    <BulletList items={ad.predictions} />
                  </>
                )}
                
                {ad.advice && (
                  <View style={styles.highlight}>
                    <Text style={{ fontSize: 10 }}>{ad.advice}</Text>
                  </View>
                )}
              </Card>
            ))}
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Yogini Dasha Section */}
      {report.dasha?.yoginiDasha && (
        <Page size="A4" style={styles.page}>
          <Section title="Yogini Dasha System">
            <Text style={styles.paragraph}>{report.dasha.yoginiDasha.systemExplanation || ''}</Text>
            
            <SubSection title={`Current Yogini: ${report.dasha.yoginiDasha.currentYogini?.name || 'N/A'}`}>
              <View style={styles.card}>
                <InfoRow label="Associated Planet" value={report.dasha.yoginiDasha.currentYogini?.planet || 'N/A'} />
                <InfoRow label="Duration" value={`${report.dasha.yoginiDasha.currentYogini?.years || 0} years`} />
                <InfoRow label="Period" value={`${report.dasha.yoginiDasha.currentYogini?.startDate || ''} to ${report.dasha.yoginiDasha.currentYogini?.endDate || ''}`} />
              </View>
              
              <Text style={styles.paragraph}>{report.dasha.yoginiDasha.currentYogini?.characteristics || ''}</Text>
              
              {report.dasha.yoginiDasha.currentYogini?.lifeThemes && report.dasha.yoginiDasha.currentYogini.lifeThemes.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>Life Themes</Text>
                  <BulletList items={report.dasha.yoginiDasha.currentYogini.lifeThemes} />
                </>
              )}
              
              <Text style={styles.paragraph}>{report.dasha.yoginiDasha.currentYogini?.predictions || ''}</Text>
            </SubSection>

            <SubSection title="Upcoming Yogini Periods">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Yogini</Text>
                  <Text style={styles.tableHeaderCell}>Planet</Text>
                  <Text style={styles.tableHeaderCell}>Years</Text>
                  <Text style={styles.tableHeaderCell}>Period</Text>
                </View>
                {(report.dasha.yoginiDasha.upcomingYoginis || []).map((y: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{y.name}</Text>
                    <Text style={styles.tableCell}>{y.planet}</Text>
                    <Text style={styles.tableCell}>{y.years}</Text>
                    <Text style={styles.tableCell}>{y.approximatePeriod}</Text>
                  </View>
                ))}
              </View>
              
              {(report.dasha.yoginiDasha.upcomingYoginis || []).slice(0, 3).map((y: any, idx: number) => (
                <Card key={idx} title={`${y.name} (${y.planet})`}>
                  <Text style={styles.paragraph}>{y.briefPrediction}</Text>
                </Card>
              ))}
            </SubSection>

            <SubSection title="Complete Yogini Dasha Cycle (36 Years)">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Yogini</Text>
                  <Text style={styles.tableHeaderCell}>Planet</Text>
                  <Text style={styles.tableHeaderCell}>Years</Text>
                  <Text style={styles.tableHeaderCell}>Nature</Text>
                </View>
                {(report.dasha.yoginiDasha.yoginiSequence || []).map((y: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{y.name}</Text>
                    <Text style={styles.tableCell}>{y.planet}</Text>
                    <Text style={styles.tableCell}>{y.years}</Text>
                    <Text style={styles.tableCell}>{y.nature}</Text>
                  </View>
                ))}
              </View>
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Dasha Predictions - Page 3: Upcoming Periods & Sequence */}
      {report.dasha && (
        <Page size="A4" style={styles.page}>
          <Section title="Dasha Sequence & Timing">
            {/* Upcoming Antardashas within current Mahadasha */}
            {report.dasha.upcomingDashas && report.dasha.upcomingDashas.length > 0 && (
              <SubSection title="Upcoming Periods">
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>Type</Text>
                    <Text style={styles.tableHeaderCell}>Planet</Text>
                    <Text style={styles.tableHeaderCell}>Period</Text>
                    <Text style={styles.tableHeaderCell}>Focus</Text>
                  </View>
                  {report.dasha.upcomingDashas.map((dasha: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{dasha.type}</Text>
                      <Text style={styles.tableCell}>{dasha.planet}</Text>
                      <Text style={styles.tableCell}>{dasha.period}</Text>
                      <Text style={styles.tableCell}>{dasha.focus}</Text>
                    </View>
                  ))}
                </View>
              </SubSection>
            )}

            <SubSection title="Complete Dasha Sequence (Vimshottari 120-Year Cycle)">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Planet</Text>
                  <Text style={styles.tableHeaderCell}>Years</Text>
                  <Text style={styles.tableHeaderCell}>Approximate Period</Text>
                  <Text style={styles.tableHeaderCell}>Life Focus</Text>
                </View>
                {(report.dasha.dashaSequence || []).map((dasha: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{dasha.planet}</Text>
                    <Text style={styles.tableCell}>{dasha.years}</Text>
                    <Text style={styles.tableCell}>{dasha.approximatePeriod}</Text>
                    <Text style={styles.tableCell}>{dasha.lifeFocus}</Text>
                  </View>
                ))}
              </View>
            </SubSection>

            {report.dasha.currentTransitImpact && (
              <SubSection title="Current Transit Impact">
                <Text style={styles.paragraph}>{report.dasha.currentTransitImpact}</Text>
              </SubSection>
            )}

            {report.dasha.periodRecommendations && report.dasha.periodRecommendations.length > 0 && (
              <SubSection title="Period Recommendations">
                <BulletList items={report.dasha.periodRecommendations} />
              </SubSection>
            )}

            <SubSection title="Spiritual Guidance">
              <View style={styles.highlight}>
                <Text>{report.dasha.spiritualGuidance || ''}</Text>
              </View>
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}
      {/* Rahu-Ketu Analysis */}
      {report.rahuKetu && (
        <Page size="A4" style={styles.page}>
          <Section title="Rahu-Ketu Karmic Axis">
            <Text style={styles.paragraph}>{report.rahuKetu.overview || ''}</Text>

            <SubSection title="Karmic Axis">
              <InfoRow label="Rahu" value={`${report.rahuKetu.karmicAxis?.rahuSign || ''} (House ${report.rahuKetu.karmicAxis?.rahuHouse || ''})`} />
              <InfoRow label="Ketu" value={`${report.rahuKetu.karmicAxis?.ketuSign || ''} (House ${report.rahuKetu.karmicAxis?.ketuHouse || ''})`} />
              <Text style={styles.paragraph}>{report.rahuKetu.karmicAxis?.axisInterpretation || ''}</Text>
              <View style={styles.highlight}>
                <Text style={{ fontWeight: 'bold' }}>Life Lesson: </Text>
                <Text>{report.rahuKetu.karmicAxis?.lifeLesson || ''}</Text>
              </View>
            </SubSection>

            <SubSection title="Rahu Analysis (Future Direction)">
              <Text style={styles.paragraph}>{report.rahuKetu.rahuAnalysis?.interpretation || ''}</Text>
              <InfoRow label="Desires" value={report.rahuKetu.rahuAnalysis?.desires || 'N/A'} />
              <InfoRow label="Growth Areas" value={report.rahuKetu.rahuAnalysis?.growthAreas || 'N/A'} />
            </SubSection>

            <SubSection title="Ketu Analysis (Past Life Karma)">
              <Text style={styles.paragraph}>{report.rahuKetu.ketuAnalysis?.interpretation || ''}</Text>
              <InfoRow label="Natural Talents" value={report.rahuKetu.ketuAnalysis?.naturalTalents || 'N/A'} />
              <InfoRow label="Spiritual Gifts" value={report.rahuKetu.ketuAnalysis?.spiritualGifts || 'N/A'} />
            </SubSection>

            {report.rahuKetu.kaalSarpYoga?.present && (
              <SubSection title="Kaal Sarp Yoga">
                <View style={styles.highlight}>
                  <Text style={{ fontWeight: 'bold' }}>Type: {report.rahuKetu.kaalSarpYoga.type}</Text>
                  <Text>Severity: {report.rahuKetu.kaalSarpYoga.severity}</Text>
                </View>
                <Text style={styles.paragraph}>{report.rahuKetu.kaalSarpYoga.effects || ''}</Text>
                <Text style={styles.subSubHeader}>Remedies</Text>
                <BulletList items={report.rahuKetu.kaalSarpYoga.remedies || []} />
              </SubSection>
            )}

            <SubSection title="Spiritual Path">
              <Text style={styles.paragraph}>{report.rahuKetu.spiritualPath || ''}</Text>
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Numerology */}
      {report.numerology && (
        <Page size="A4" style={styles.page}>
          <Section title="Numerology Analysis">
            <Text style={styles.paragraph}>{report.numerology.overview || ''}</Text>

            <SubSection title={`Birth Number (Mulank): ${report.numerology.birthNumber?.number || ''}`}>
              <InfoRow label="Planet" value={report.numerology.birthNumber?.planet || 'N/A'} />
              <Text style={styles.paragraph}>{report.numerology.birthNumber?.interpretation || ''}</Text>
              <Text style={styles.paragraph}>{report.numerology.birthNumber?.personality || ''}</Text>
            </SubSection>

            <SubSection title={`Destiny Number (Bhagyank): ${report.numerology.destinyNumber?.number || ''}`}>
              <InfoRow label="Planet" value={report.numerology.destinyNumber?.planet || 'N/A'} />
              <Text style={styles.paragraph}>{report.numerology.destinyNumber?.interpretation || ''}</Text>
              <Text style={styles.paragraph}>{report.numerology.destinyNumber?.lifePath || ''}</Text>
            </SubSection>

            <SubSection title={`Name Number: ${report.numerology.nameNumber?.number || ''}`}>
              <InfoRow label="Planet" value={report.numerology.nameNumber?.planet || 'N/A'} />
              <Text style={styles.paragraph}>{report.numerology.nameNumber?.interpretation || ''}</Text>
            </SubSection>

            <SubSection title="Lucky Associations">
              <InfoRow label="Lucky Numbers" value={(report.numerology.luckyNumbers || []).join(', ')} />
              <InfoRow label="Unlucky Numbers" value={(report.numerology.unluckyNumbers || []).join(', ')} />
              <InfoRow label="Lucky Days" value={(report.numerology.luckyDays || []).join(', ')} />
              <InfoRow label="Lucky Colors" value={(report.numerology.luckyColors || []).join(', ')} />
            </SubSection>

            <SubSection title={`Personal Year ${new Date().getFullYear()}: ${report.numerology.yearPrediction?.personalYear || ''}`}>
              <Text style={styles.paragraph}>{report.numerology.yearPrediction?.interpretation || ''}</Text>
              {report.numerology.yearPrediction?.themes && (
                <BulletList items={report.numerology.yearPrediction.themes} />
              )}
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Spiritual Potential */}
      {report.spiritual && (
        <Page size="A4" style={styles.page}>
          <Section title="Spiritual Potential">
            <Text style={styles.paragraph}>{report.spiritual.overview || ''}</Text>

            <SubSection title="Spiritual Rating">
              <View style={styles.highlight}>
                <Text style={{ fontWeight: 'bold', fontSize: 14 }}>{report.spiritual.spiritualPotential?.rating || 'N/A'}</Text>
              </View>
              <Text style={styles.paragraph}>{report.spiritual.spiritualPotential?.interpretation || ''}</Text>
            </SubSection>

            <SubSection title="Atmakaraka (Soul Purpose)">
              <InfoRow label="Planet" value={report.spiritual.atmakaraka?.planet || 'N/A'} />
              <Text style={styles.paragraph}>{report.spiritual.atmakaraka?.soulPurpose || ''}</Text>
              <Text style={styles.paragraph}>{report.spiritual.atmakaraka?.spiritualLesson || ''}</Text>
            </SubSection>

            <SubSection title="9th House (Dharma)">
              <Text style={styles.paragraph}>{report.spiritual.ninthHouse?.interpretation || ''}</Text>
              <InfoRow label="Dharma Path" value={report.spiritual.ninthHouse?.dharmaPath || 'N/A'} />
            </SubSection>

            <SubSection title="12th House (Moksha)">
              <Text style={styles.paragraph}>{report.spiritual.twelfthHouse?.interpretation || ''}</Text>
              <InfoRow label="Liberation Path" value={report.spiritual.twelfthHouse?.mokshaIndications || 'N/A'} />
            </SubSection>

            <SubSection title="Ishta Devata (Personal Deity)">
              <InfoRow label="Deity" value={report.spiritual.ishtaDevata?.deity || 'N/A'} />
              <Text style={styles.paragraph}>{report.spiritual.ishtaDevata?.reason || ''}</Text>
              <Text style={styles.paragraph}>{report.spiritual.ishtaDevata?.worship || ''}</Text>
            </SubSection>

            <SubSection title="Meditation Guidance">
              <InfoRow label="Style" value={report.spiritual.meditationStyle?.recommended || 'N/A'} />
              <InfoRow label="Best Timing" value={report.spiritual.meditationStyle?.timing || 'N/A'} />
              {report.spiritual.meditationStyle?.techniques && (
                <BulletList items={report.spiritual.meditationStyle.techniques} />
              )}
            </SubSection>

            <SubSection title="Moksha Path">
              <Text style={styles.paragraph}>{report.spiritual.mokshaPath || ''}</Text>
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Remedies - Understanding the Science */}
      {report.remedies?.remediesPhilosophy && (
        <Page size="A4" style={styles.page}>
          <Section title="Understanding Vedic Remedies">
            <Text style={styles.paragraph}>
              Before exploring specific remedies, it is essential to understand the profound science and tradition behind Vedic Upayas (remedial measures). This section explains why these remedies work and how they have been validated through millennia of practice.
            </Text>

            <SubSection title="Vedic Foundation">
              <Text style={styles.paragraph}>{report.remedies.remediesPhilosophy.vedicFoundation || ''}</Text>
            </SubSection>

            <SubSection title="How Remedies Work">
              <View style={styles.card}>
                <Text style={styles.paragraph}>{report.remedies.remediesPhilosophy.howRemediesWork || ''}</Text>
              </View>
            </SubSection>

            <SubSection title="The Role of Faith and Intention">
              <Text style={styles.paragraph}>{report.remedies.remediesPhilosophy.importanceOfFaith || ''}</Text>
            </SubSection>

            <SubSection title="Scientific Perspective">
              <View style={styles.highlight}>
                <Text>{report.remedies.remediesPhilosophy.scientificPerspective || ''}</Text>
              </View>
            </SubSection>

            <SubSection title="Traditional Wisdom">
              <Text style={styles.paragraph}>{report.remedies.remediesPhilosophy.traditionalWisdom || ''}</Text>
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Remedies - Gemstones with Trust Details */}
      {report.remedies && (
        <Page size="A4" style={styles.page}>
          <Section title="Gemstone Therapy (Ratna Shastra)">
            <Text style={styles.paragraph}>{report.remedies.gemstoneRecommendations?.gemologyExplanation || 'Gemstones have been used in Vedic astrology for millennia to harness planetary energies and balance cosmic influences.'}</Text>

            <SubSection title={`Primary Gemstone: ${report.remedies.gemstoneRecommendations?.primary?.stone || 'N/A'}`}>
              <View style={styles.card}>
                <InfoRow label="Planet" value={report.remedies.gemstoneRecommendations?.primary?.planet || 'N/A'} />
                <InfoRow label="Weight" value={report.remedies.gemstoneRecommendations?.primary?.weight || 'N/A'} />
                <InfoRow label="Metal" value={report.remedies.gemstoneRecommendations?.primary?.metal || 'N/A'} />
                <InfoRow label="Finger" value={report.remedies.gemstoneRecommendations?.primary?.finger || 'N/A'} />
                <InfoRow label="Day to Wear" value={report.remedies.gemstoneRecommendations?.primary?.day || 'N/A'} />
              </View>
              
              <Text style={styles.subSubHeader}>Benefits</Text>
              <Text style={styles.paragraph}>{report.remedies.gemstoneRecommendations?.primary?.benefits || ''}</Text>
              
              <Text style={styles.subSubHeader}>Scriptural Reference</Text>
              <View style={styles.highlight}>
                <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{report.remedies.gemstoneRecommendations?.primary?.scripturalReference || ''}</Text>
              </View>
              
              <Text style={styles.subSubHeader}>How It Works</Text>
              <Text style={styles.paragraph}>{report.remedies.gemstoneRecommendations?.primary?.howItWorks || ''}</Text>
              
              <Text style={styles.subSubHeader}>Scientific Basis</Text>
              <Text style={styles.paragraph}>{report.remedies.gemstoneRecommendations?.primary?.scientificBasis || ''}</Text>
              
              <Text style={styles.subSubHeader}>Quality Guidelines</Text>
              <View style={styles.card}>
                <Text style={{ fontSize: 10 }}>{report.remedies.gemstoneRecommendations?.primary?.qualityGuidelines || ''}</Text>
              </View>
              
              <Text style={styles.subSubHeader}>Cautions</Text>
              <Text style={{ fontSize: 10, color: '#dc2626' }}>{report.remedies.gemstoneRecommendations?.primary?.cautions || ''}</Text>
            </SubSection>

            {report.remedies.gemstoneRecommendations?.secondary && (
              <SubSection title={`Secondary Gemstone: ${report.remedies.gemstoneRecommendations.secondary.stone}`}>
                <InfoRow label="Planet" value={report.remedies.gemstoneRecommendations.secondary.planet || 'N/A'} />
                <Text style={styles.paragraph}>{report.remedies.gemstoneRecommendations.secondary.benefits || ''}</Text>
                <Text style={{ fontSize: 10, fontStyle: 'italic', color: '#6b7280' }}>{report.remedies.gemstoneRecommendations.secondary.scripturalReference || ''}</Text>
              </SubSection>
            )}

            {report.remedies.gemstoneRecommendations?.avoid && report.remedies.gemstoneRecommendations.avoid.length > 0 && (
              <SubSection title="Gemstones to Avoid">
                <BulletList items={report.remedies.gemstoneRecommendations.avoid} />
              </SubSection>
            )}
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Remedies - Rudraksha with Trust Details */}
      {report.remedies?.rudrakshaRecommendations && report.remedies.rudrakshaRecommendations.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Section title="Rudraksha Therapy">
            <Text style={styles.paragraph}>
              Rudraksha beads are sacred seeds from the Elaeocarpus ganitrus tree, revered for their spiritual and healing properties. Each Mukhi (face) of Rudraksha resonates with specific planetary energies.
            </Text>

            {report.remedies.rudrakshaRecommendations.map((rud: any, idx: number) => (
              <Card key={idx} title={`${rud.mukhi} Mukhi Rudraksha - ${rud.name}`}>
                <InfoRow label="Associated Planet" value={rud.planet} />
                
                <Text style={styles.subSubHeader}>Benefits</Text>
                <Text style={styles.paragraph}>{rud.benefits}</Text>
                
                <Text style={styles.subSubHeader}>Wearing Instructions</Text>
                <Text style={{ fontSize: 10 }}>{rud.wearingInstructions}</Text>
                
                <Text style={styles.subSubHeader}>Scriptural Reference</Text>
                <View style={styles.highlight}>
                  <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{rud.scripturalReference || ''}</Text>
                </View>
                
                <Text style={styles.subSubHeader}>Scientific Basis</Text>
                <Text style={{ fontSize: 10 }}>{rud.scientificBasis || ''}</Text>
                
                <Text style={styles.subSubHeader}>How to Verify Authenticity</Text>
                <Text style={{ fontSize: 10, color: '#059669' }}>{rud.authenticity || ''}</Text>
              </Card>
            ))}
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Remedies - Mantras with Trust Details */}
      {report.remedies?.mantras && report.remedies.mantras.length > 0 && (
        <Page size="A4" style={styles.page}>
          <Section title="Mantra Therapy (Mantra Shastra)">
            <Text style={styles.paragraph}>
              Mantras are sacred sound vibrations that connect the practitioner to cosmic energies. The science of Mantra Shastra explains how specific sound frequencies can influence planetary energies and transform consciousness.
            </Text>

            {report.remedies.mantras.map((mantra: any, idx: number) => (
              <Card key={idx} title={`${mantra.planet} Mantra`}>
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: '#7c3aed', marginBottom: 5 }}>{mantra.mantra}</Text>
                
                <View style={styles.row}>
                  <InfoRow label="Japa Count" value={String(mantra.japaCount)} />
                </View>
                <InfoRow label="Timing" value={mantra.timing} />
                <InfoRow label="Pronunciation" value={mantra.pronunciation} />
                
                <Text style={styles.subSubHeader}>Benefits</Text>
                <Text style={styles.paragraph}>{mantra.benefits}</Text>
                
                <Text style={styles.subSubHeader}>Scriptural Source</Text>
                <View style={styles.highlight}>
                  <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{mantra.scripturalSource || ''}</Text>
                </View>
                
                <Text style={styles.subSubHeader}>Vibrational Science</Text>
                <Text style={{ fontSize: 10 }}>{mantra.vibrationalScience || ''}</Text>
                
                <Text style={styles.subSubHeader}>Proper Method</Text>
                <Text style={{ fontSize: 10 }}>{mantra.properMethod || ''}</Text>
              </Card>
            ))}
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Remedies - Yantras and Pujas */}
      {report.remedies && (
        <Page size="A4" style={styles.page}>
          <Section title="Yantras & Puja Recommendations">
            {report.remedies.yantras && report.remedies.yantras.length > 0 && (
              <SubSection title="Yantra Recommendations">
                <Text style={styles.paragraph}>
                  Yantras are sacred geometric diagrams that serve as focal points for meditation and planetary propitiation. Each Yantra embodies specific cosmic energies through precise mathematical proportions.
                </Text>
                {report.remedies.yantras.map((yantra: any, idx: number) => (
                  <Card key={idx} title={yantra.name}>
                    <InfoRow label="Planet" value={yantra.planet} />
                    <InfoRow label="Placement" value={yantra.placement} />
                    <Text style={styles.paragraph}>{yantra.benefits}</Text>
                    
                    <Text style={styles.subSubHeader}>Geometric Significance</Text>
                    <Text style={{ fontSize: 10 }}>{yantra.geometricSignificance || ''}</Text>
                    
                    <Text style={styles.subSubHeader}>Consecration Method</Text>
                    <Text style={{ fontSize: 10 }}>{yantra.consecrationMethod || ''}</Text>
                    
                    <Text style={{ fontSize: 9, fontStyle: 'italic', color: '#6b7280', marginTop: 5 }}>{yantra.scripturalReference || ''}</Text>
                  </Card>
                ))}
              </SubSection>
            )}

            {report.remedies.pujaRecommendations && report.remedies.pujaRecommendations.length > 0 && (
              <SubSection title="Recommended Pujas">
                {report.remedies.pujaRecommendations.map((puja: any, idx: number) => (
                  <Card key={idx} title={puja.name}>
                    <InfoRow label="Deity" value={puja.deity} />
                    <InfoRow label="Purpose" value={puja.purpose} />
                    <InfoRow label="Frequency" value={puja.frequency} />
                    
                    <Text style={styles.subSubHeader}>Benefits</Text>
                    <BulletList items={puja.benefits || []} />
                    
                    <Text style={styles.subSubHeader}>Scriptural Basis</Text>
                    <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{puja.scripturalBasis || ''}</Text>
                    
                    <Text style={styles.subSubHeader}>Procedure</Text>
                    <Text style={{ fontSize: 10 }}>{puja.procedure || ''}</Text>
                  </Card>
                ))}
              </SubSection>
            )}
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Remedies - Ishta Devata and Spiritual Practices */}
      {report.remedies && (
        <Page size="A4" style={styles.page}>
          <Section title="Ishta Devata & Spiritual Practices">
            <SubSection title="Your Ishta Devata (Personal Deity)">
              <Card title={report.remedies.ishtaDevata?.deity || 'N/A'}>
                <Text style={styles.paragraph}>{report.remedies.ishtaDevata?.reason || ''}</Text>
                
                <InfoRow label="Worship Method" value={report.remedies.ishtaDevata?.worship || 'N/A'} />
                <InfoRow label="Mantra" value={report.remedies.ishtaDevata?.mantra || 'N/A'} />
                <InfoRow label="Temple Visit" value={report.remedies.ishtaDevata?.templeVisit || 'N/A'} />
                
                <Text style={styles.subSubHeader}>Scriptural Derivation</Text>
                <View style={styles.highlight}>
                  <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{report.remedies.ishtaDevata?.scripturalDerivation || ''}</Text>
                </View>
                
                <Text style={styles.subSubHeader}>Significance</Text>
                <Text style={styles.paragraph}>{report.remedies.ishtaDevata?.significance || ''}</Text>
              </Card>
            </SubSection>

            <SubSection title="Fasting Recommendations (Vrata)">
              {(report.remedies.fasting || []).map((fast: any, idx: number) => (
                <Card key={idx} title={`${fast.day} - ${fast.planet}`}>
                  <Text style={styles.paragraph}>{fast.method}</Text>
                  <Text style={styles.paragraph}>{fast.benefits}</Text>
                  
                  <Text style={styles.subSubHeader}>Scriptural Reference</Text>
                  <Text style={{ fontSize: 10, fontStyle: 'italic' }}>{fast.scripturalReference || ''}</Text>
                  
                  <Text style={styles.subSubHeader}>Physiological Benefits</Text>
                  <Text style={{ fontSize: 10 }}>{fast.physiologicalBenefits || ''}</Text>
                </Card>
              ))}
            </SubSection>

            <SubSection title="Donations (Daan)">
              {(report.remedies.donations || []).map((don: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>{don.day} - {don.item}</Text>
                  <Text style={{ fontSize: 10 }}>Planet: {don.planet} | {don.reason}</Text>
                  <Text style={{ fontSize: 9, fontStyle: 'italic', color: '#6b7280' }}>{don.scripturalReference || ''}</Text>
                  <Text style={{ fontSize: 9, color: '#059669' }}>{don.karmaScience || ''}</Text>
                </View>
              ))}
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Remedies - Lifestyle Guidance */}
      {report.remedies && (
        <Page size="A4" style={styles.page}>
          <Section title="Lifestyle Remedies & Guidance">
            <SubSection title="Color Therapy">
              <InfoRow label="Favorable Colors" value={(report.remedies.colorTherapy?.favorable || []).join(', ')} />
              <InfoRow label="Colors to Avoid" value={(report.remedies.colorTherapy?.avoid || []).join(', ')} />
              <Text style={styles.paragraph}>{report.remedies.colorTherapy?.explanation || ''}</Text>
              
              <Text style={styles.subSubHeader}>Scientific Basis</Text>
              <Text style={{ fontSize: 10 }}>{report.remedies.colorTherapy?.scientificBasis || ''}</Text>
            </SubSection>

            <SubSection title="Direction Guidance (Vastu)">
              <InfoRow label="Favorable Directions" value={(report.remedies.directionGuidance?.favorable || []).join(', ')} />
              <InfoRow label="Directions to Avoid" value={(report.remedies.directionGuidance?.avoid || []).join(', ')} />
              <InfoRow label="Sleep Direction" value={report.remedies.directionGuidance?.sleepDirection || 'N/A'} />
              <InfoRow label="Work Direction" value={report.remedies.directionGuidance?.workDirection || 'N/A'} />
              
              <Text style={styles.subSubHeader}>Vastu Explanation</Text>
              <Text style={{ fontSize: 10 }}>{report.remedies.directionGuidance?.vastuExplanation || ''}</Text>
            </SubSection>

            <SubSection title="Daily Routine Recommendations">
              <BulletList items={report.remedies.dailyRoutine || []} />
            </SubSection>

            <SubSection title="Daily Spiritual Practices">
              <BulletList items={report.remedies.spiritualPractices || []} />
            </SubSection>

            <SubSection title="General Advice">
              <View style={styles.highlight}>
                <Text>{report.remedies.generalAdvice || ''}</Text>
              </View>
            </SubSection>

            <SubSection title="Weak Planets Summary">
              {(report.remedies.weakPlanets || []).map((wp: any, idx: number) => (
                <View key={idx} style={styles.row}>
                  <Text style={styles.label}>{wp.planet}:</Text>
                  <Text style={styles.value}>{wp.reason} (Severity: {wp.severity})</Text>
                </View>
              ))}
            </SubSection>
          </Section>
          <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
        </Page>
      )}

      {/* Final Page */}
      <Page size="A4" style={styles.page}>
        <Section title="Report Summary">
          <Text style={styles.paragraph}>
            This comprehensive Kundli report has been generated using Vedic astrology principles and AI-powered analysis. 
            The predictions and recommendations are based on your birth chart data and should be used as guidance for self-improvement and life planning.
          </Text>

          <SubSection title="Report Statistics">
            <InfoRow label="Generated On" value={new Date(report.generatedAt).toLocaleString('en-IN')} />
            <InfoRow label="Language" value={report.language === 'hi' ? 'Hindi' : 'English'} />
            <InfoRow label="Planets Analyzed" value={String(report.planets?.length || 0)} />
            <InfoRow label="Houses Analyzed" value={String(report.houses?.length || 0)} />
          </SubSection>

          {report.errors && report.errors.length > 0 && (
            <SubSection title="Notes">
              <Text style={styles.paragraph}>
                Some sections could not be fully generated. The following areas had issues:
              </Text>
              <BulletList items={report.errors} />
            </SubSection>
          )}

          <View style={{ marginTop: 40, textAlign: 'center' }}>
            <Text style={{ fontSize: 14, color: '#7c3aed', fontWeight: 'bold' }}>🙏 May the stars guide your path 🙏</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 10 }}>
              For personalized puja recommendations and remedies, consult with Sri Mandir experts.
            </Text>
          </View>
        </Section>

        <Text style={styles.footer}>
          © Sri Mandir • This report is for guidance purposes only • www.srimandir.com
        </Text>
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
      </Page>
    </Document>
  );
};

export default KundliPDFDocument;
