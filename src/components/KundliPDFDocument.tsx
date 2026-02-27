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
      fontStyle: 'normal',
    },
    {
      src: '/fonts/DejaVuSans-Bold.ttf',
      fontWeight: 'bold',
      fontStyle: 'normal',
    },
    // Map italic to regular (we don't have a separate italic font file)
    {
      src: '/fonts/DejaVuSans.ttf',
      fontWeight: 'normal',
      fontStyle: 'italic',
    },
    {
      src: '/fonts/DejaVuSans-Bold.ttf',
      fontWeight: 'bold',
      fontStyle: 'italic',
    },
  ],
});

// Warm orange/saffron color palette — matches Sri Mandir branding (NO purple)
const P = {
  pageBg: '#FDF8F0',       // warm cream page background
  gold: '#C9A84C',          // gold for borders and accents
  goldLight: '#E8D5A0',     // light gold for subtle borders
  primary: '#9a3412',       // deep burnt orange for main headings (was purple)
  secondary: '#c2410c',     // warm dark orange for sub-headings (was purple)
  accent: '#ea580c',        // bright orange for tertiary headings (was purple)
  bodyText: '#2C1810',      // warm dark brown for body text
  mutedText: '#78350f',     // warm amber-brown for secondary text
  cardBg: '#FFF7ED',        // warm peach for cards
  tableAlt: '#FFF7ED',      // alternating table row — warm peach
  highlightBg: '#FFF9E6',   // warm yellow highlight
  white: '#FFFFFF',
  lightBorder: '#fed7aa',   // light orange border
};

const SRIMANDIR_ORANGE = '#f97316';

// Brand header bar color — deep warm brown (NOT purple)
const BRAND_HEADER_DARK = '#7c2d12';

/**
 * Sanitize text to remove characters that DejaVuSans cannot render (Devanagari, etc.).
 * Keeps Latin, common punctuation, and basic symbols. Strips Devanagari Unicode blocks
 * (U+0900–U+097F, U+A8E0–U+A8FF) and other non-renderable scripts to prevent garbled output.
 * If the string contains parenthesized English text after Hindi, extracts just the English part.
 */
const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  const str = String(text);
  // Remove Devanagari and extended Devanagari ranges, and other Indic scripts
  // eslint-disable-next-line no-control-regex
  const cleaned = str.replace(/[\u0900-\u097F\uA8E0-\uA8FF\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F]/g, '');
  // Clean up artifacts: multiple spaces, leading/trailing parens with nothing inside
  return cleaned.replace(/\s+/g, ' ').replace(/^\s*\(\s*\)\s*$/, '').replace(/^\s*\(\s*/, '(').replace(/\s*\)\s*$/, ')').replace(/^\s*-?\s*$/, '').trim();
};

const styles = StyleSheet.create({
  page: {
    // CRITICAL: Page-level padding ensures ALL pages (including overflow/continuation)
    // respect the content safe area. Child View padding does NOT carry over on page breaks.
    paddingTop: 66,       // 14 (orange border) + 40 (header height) + 12 (gap below header)
    paddingBottom: 72,    // 14 (orange border) + 50 (footer height) + 8 (gap above footer)
    paddingLeft: 42,      // 14 (orange border) + 28 (content padding)
    paddingRight: 42,     // 14 (orange border) + 28 (content padding)
    fontFamily: 'DejaVuSans',
    lineHeight: 1.45,
    fontSize: 10.5,
    color: P.bodyText,
    backgroundColor: SRIMANDIR_ORANGE,
  },
  // ── Sri Mandir page template ─────────────────────────────
  pageWhitePanel: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  sriMandirFooterBar: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    height: 50,
    backgroundColor: '#fff7ed',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopWidth: 1,
    borderTopColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sriMandirBrandName: {
    fontSize: 9.2,
    fontWeight: 'bold',
    color: '#c2410c',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  sriMandirTagline: {
    fontSize: 7.8,
    color: '#78350f',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  sriMandirContact: {
    fontSize: 7.8,
    color: '#c2410c',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fixedHeader: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    height: 40,
    backgroundColor: BRAND_HEADER_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 20,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 18,
    right: 20,
    fontSize: 8.5,
    color: '#c2410c',
    opacity: 0.6,
  },
  coverPage: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    fontFamily: 'DejaVuSans',
    backgroundColor: P.pageBg,
  },
  dividerPage: {
    padding: 0,
    fontFamily: 'DejaVuSans',
    backgroundColor: SRIMANDIR_ORANGE,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 13.5,
    color: P.mutedText,
    marginBottom: 26,
    textAlign: 'center',
  },
  coverName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: P.bodyText,
    marginBottom: 8,
    textAlign: 'center',
  },
  coverDetails: {
    fontSize: 11.5,
    color: P.mutedText,
    textAlign: 'center',
    marginBottom: 4,
  },
  coverKicker: {
    fontSize: 10.5,
    color: P.mutedText,
    letterSpacing: 2.2,
    textAlign: 'center',
    marginBottom: 12,
  },
  coverMark: {
    fontSize: 12,
    color: P.gold,
    textAlign: 'center',
    marginBottom: 18,
  },
  coverMetaLabel: {
    fontSize: 9,
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  coverFooterMeta: {
    fontSize: 8.5,
    color: P.mutedText,
    textAlign: 'center',
    marginBottom: 4,
  },
  coverFooterBrand: {
    fontSize: 9.2,
    color: '#c2410c',
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 9,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: P.gold,
  },
  subHeader: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: P.secondary,
    marginTop: 10,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: P.goldLight,
  },
  subSubHeader: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: P.primary,
    marginTop: 7,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 10.2,
    marginBottom: 5,
    textAlign: 'left',
    color: P.bodyText,
    lineHeight: 1.45,
  },
  // Body text — same as paragraph but no margin/justify (for inside cards, highlights, callouts)
  bodyText: {
    fontSize: 10.2,
    color: P.bodyText,
    lineHeight: 1.45,
  },
  // Small italic muted text — for scriptural refs, disclaimers, cautions
  scriptural: {
    fontSize: 9.5,
    fontStyle: 'italic',
    color: '#6b7280',
    marginTop: 3,
    lineHeight: 1.4,
  },
  // Bold label inside highlight/card
  boldLabel: {
    fontWeight: 'bold',
    fontSize: 10.5,
    color: P.bodyText,
    lineHeight: 1.45,
  },
  // Accent text (orange, for emphasis)
  accentText: {
    fontSize: 10.5,
    color: '#ea580c',
    lineHeight: 1.45,
  },
  // Caution/warning text
  cautionText: {
    fontSize: 10,
    color: '#dc2626',
    lineHeight: 1.45,
  },
  // Success/positive text
  successText: {
    fontSize: 10,
    color: '#059669',
    lineHeight: 1.45,
  },
  table: {
    width: '100%',
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    paddingVertical: 5,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    paddingVertical: 5,
    backgroundColor: P.tableAlt,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: P.primary,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    flex: 1,
    color: P.white,
    fontWeight: 'bold',
    fontSize: 10,
    paddingHorizontal: 6,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 6,
    color: P.bodyText,
  },
  card: {
    backgroundColor: P.cardBg,
    borderRadius: 5,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: P.gold,
  },
  cardTitle: {
    fontSize: 11.2,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 5,
  },
  // ── Professional info strip (replaces old pill badges) ────────
  infoStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: P.lightBorder,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  infoStripItem: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: P.lightBorder,
    alignItems: 'center',
  },
  infoStripLabel: {
    fontSize: 7.5,
    color: P.mutedText,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoStripValue: {
    fontSize: 9.5,
    color: P.primary,
    fontWeight: 'bold',
  },
  // Status badges — small, inline, for status indicators only
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  label: {
    width: 130,
    fontWeight: 'bold',
    color: P.primary,
    fontSize: 10,
  },
  value: {
    flex: 1,
    color: P.bodyText,
    fontSize: 10,
  },
  list: {
    marginLeft: 6,
    marginVertical: 5,
  },
  listItem: {
    marginBottom: 4,
  },
  bullet: {
    width: 15,
    color: P.gold,
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionBreak: {
    marginVertical: 14,
  },
  highlight: {
    backgroundColor: P.highlightBg,
    padding: 10,
    borderRadius: 3,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: P.gold,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 6,
  },
  section: {
    marginBottom: 10,
  },
  chartContainer: {
    width: 200,
    height: 200,
    marginVertical: 5,
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.lightBorder,
    borderRadius: 3,
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
    marginBottom: 10,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  chartPurpose: {
    fontSize: 9,
    color: P.mutedText,
    textAlign: 'center',
    marginTop: 3,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    marginVertical: 8,
  },
  tocEntry: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
  },
  tocNumber: {
    width: 26,
    fontSize: 10.5,
    color: P.gold,
    fontWeight: 'bold',
  },
  tocTitle: {
    flex: 1,
    fontSize: 11.2,
    color: P.bodyText,
    fontWeight: 'bold',
  },
  tocSubtitle: {
    fontSize: 8.8,
    color: P.mutedText,
    marginLeft: 26,
    marginTop: -2,
    marginBottom: 3,
  },
  // ── Callout boxes ──────────────────────────────────────────
  calloutBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    padding: 10,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  calloutTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  // ── Grid layout ─────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // ── Nickname badge for houses ──────────────────────────────
  nicknameBadge: {
    backgroundColor: BRAND_HEADER_DARK,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  nicknameBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  nicknameFun: {
    fontSize: 9.5,
    color: P.mutedText,
    fontStyle: 'italic',
    marginBottom: 7,
  },
  // ── Section intro italic ────────────────────────────────────
  sectionIntro: {
    fontSize: 10.5,
    marginBottom: 6,
    fontStyle: 'italic',
    color: P.mutedText,
    lineHeight: 1.45,
    borderLeftWidth: 3,
    borderLeftColor: P.gold,
    paddingLeft: 10,
  },
  // ── Info/Success/Warning boxes ──────────────────────────────
  infoBox: {
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 4,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 4,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  warningBox: {
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 4,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  // ── Footer ────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: P.mutedText,
  },
  fixedHeaderTitle: {
    color: '#ffffff',
    fontSize: 9.2,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  fixedHeaderSection: {
    color: '#ffedd5',
    fontSize: 8.4,
    fontWeight: 'normal',
  },
  dividerKicker: {
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 2.2,
    marginBottom: 20,
    opacity: 0.85,
  },
  dividerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 1.15,
  },
  dividerSubtitle: {
    fontSize: 11.2,
    color: '#fff7ed',
    textAlign: 'center',
    lineHeight: 1.4,
    opacity: 0.9,
  },
  dividerFooter: {
    fontSize: 8.8,
    color: '#ffffff',
    opacity: 0.75,
    letterSpacing: 0.3,
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

// Professional info strip — replaces colorful pill badges
const InfoStrip = ({ items }: { items: { label: string; value: string }[] }) => (
  <View style={styles.infoStrip}>
    {items.map((item, idx) => (
      <View key={idx} style={[styles.infoStripItem, idx === items.length - 1 && { borderRightWidth: 0 }]}>
        <Text style={styles.infoStripLabel}>{item.label.toUpperCase()}</Text>
        <Text style={styles.infoStripValue}>{item.value}</Text>
      </View>
    ))}
  </View>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={[styles.row, { marginBottom: 2 }]}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const SriMandirFooter = () => (
  <View style={styles.sriMandirFooterBar} fixed>
    <Text style={styles.sriMandirBrandName}>SRI MANDIR</Text>
    <Text style={styles.sriMandirTagline}>
      Looking for detailed guidance on your birth chart? Speak to our expert astrologers today
    </Text>
    <Text style={styles.sriMandirContact}>Call or WhatsApp: 080 711 74417</Text>
  </View>
);

// Page wrapper (legacy - kept for cover page compatibility)
const PageWrapper = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Page size="A4" style={[styles.page, style]}>
    <View style={styles.pageWhitePanel} fixed />
    {children}
    <SriMandirFooter />
  </Page>
);

const ContentPage = ({ sectionName, children, pageKey }: { sectionName?: string; children: React.ReactNode; pageKey?: string | number }) => (
  <Page size="A4" style={styles.page} key={pageKey}>
    {/* Fixed elements use absolute positioning — they ignore page padding and repeat on every page */}
    <View style={styles.pageWhitePanel} fixed />
    <View style={styles.fixedHeader} fixed>
      <Text style={styles.fixedHeaderTitle}>Sri Mandir Kundli Report</Text>
      {sectionName && <Text style={styles.fixedHeaderSection}>{sectionName}</Text>}
    </View>
    <SriMandirFooter />
    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    {/* Children flow inside the Page's padding — this is respected on ALL pages including continuations */}
    {children}
  </Page>
);

const SectionDividerPage = ({ partNumber, title, subtitle }: { partNumber: string; title: string; subtitle: string }) => (
  <Page size="A4" style={styles.dividerPage}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 }}>
      <Text style={styles.dividerKicker}>PART {partNumber}</Text>
      <View style={{ width: 60, height: 2, backgroundColor: '#ffffff', marginBottom: 24, opacity: 0.6 }} />
      <Text style={styles.dividerTitle}>{title}</Text>
      <Text style={styles.dividerSubtitle}>{subtitle}</Text>
    </View>
    <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
      <Text style={styles.dividerFooter}>Sri Mandir — Dharma, Karma, Jyotish</Text>
    </View>
  </Page>
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
      <View key={idx} style={{ flexDirection: 'row', marginBottom: 3, alignItems: 'flex-start' }}>
        <Text style={styles.bullet}>•</Text>
        <Text style={[styles.bodyText, { flex: 1 }]}>{item}</Text>
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
  const parseBirthTime = (rawTime: unknown): { hour: number; minute: number } | null => {
    const input = String(rawTime ?? '').trim();
    if (!input) return null;

    const ampm = input.match(/\b(am|pm)\b/i)?.[1]?.toLowerCase();
    const cleaned = input.replace(/\s*(am|pm)\s*/i, '');
    const parts = cleaned.split(':').map((x) => Number(x));
    let hour = parts[0];
    const minute = parts.length > 1 ? parts[1] : 0;

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (ampm) {
      hour = hour % 12;
      if (ampm === 'pm') hour += 12;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  };

  const parseTimezoneOffset = (rawTz: unknown): number => {
    if (typeof rawTz === 'number' && Number.isFinite(rawTz)) return rawTz;
    const input = String(rawTz ?? '').trim();
    if (!input) return 5.5;

    const asNumber = Number(input);
    if (Number.isFinite(asNumber)) return asNumber;

    const m = input.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/);
    if (m) {
      const sign = m[1] === '-' ? -1 : 1;
      const hh = Number(m[2]);
      const mm = Number(m[3] || '0');
      if (Number.isFinite(hh) && Number.isFinite(mm)) return sign * (hh + mm / 60);
    }

    if (input === 'Asia/Kolkata') return 5.5;
    return 5.5;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Frontend safety-net: recompute Dasha timeline deterministically from Moon degree + birth details.
  // This prevents stale/wrong backend values from leaking into final PDF.
  const dashaTruth = React.useMemo(() => {
    try {
      const moon = report?.planetaryPositions?.find((p: any) => p?.name === 'Moon');
      const moonDegreeRaw = parseFloat(String(moon?.degree ?? ""));
      if (!Number.isFinite(moonDegreeRaw)) return null;

      const signToIdx: Record<string, number> = {
        Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3, Leo: 4, Virgo: 5,
        Libra: 6, Scorpio: 7, Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
      };

      let moonDegree = moonDegreeRaw;
      if (moonDegree <= 30 && typeof moon.sign === 'string' && moon.sign in signToIdx) {
        moonDegree = signToIdx[moon.sign] * 30 + moonDegree;
      }

      const birthDateRaw = report?.birthDetails?.dateOfBirth;
      const birthTimeRaw = report?.birthDetails?.timeOfBirth || '12:00';
      if (!birthDateRaw || typeof birthDateRaw !== 'string') return null;

      const [year, month, day] = birthDateRaw.split('-').map((n: string) => Number(n));
      const parsedTime = parseBirthTime(birthTimeRaw);
      if (!parsedTime) return null;
      const { hour, minute } = parsedTime;
      const tz = parseTimezoneOffset(report?.birthDetails?.timezone);

      if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;

      const birthUtcMs = Date.UTC(year, month - 1, day, hour, minute) - tz * 60 * 60 * 1000;
      const birthDate = new Date(birthUtcMs);
      const now = report?.generatedAt ? new Date(report.generatedAt) : new Date();

      const DASHA_YEARS: Record<string, number> = {
        Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16,
        Saturn: 19, Mercury: 17, Ketu: 7, Venus: 20,
      };
      const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
      const NAKSHATRA_LORDS = [
        "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
        "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
        "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
      ];
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const DAYS_PER_YEAR = 365.25;
      const addYears = (d: Date, y: number) => new Date(d.getTime() + y * DAYS_PER_YEAR * MS_PER_DAY);

      const nakshatraSpan = 360 / 27;
      const nakshatraIdx = Math.floor(moonDegree / nakshatraSpan);
      const startLord = NAKSHATRA_LORDS[nakshatraIdx];
      const progress = (moonDegree % nakshatraSpan) / nakshatraSpan;
      const balanceYears = DASHA_YEARS[startLord] * (1 - progress);

      let cursor = new Date(birthDate);
      let dashaIndex = DASHA_ORDER.indexOf(startLord);
      let firstDasha = true;
      let mahadasha = startLord;
      let mdStart = new Date(birthDate);
      let mdEnd = new Date(birthDate);

      while (cursor < now) {
        const years = firstDasha ? balanceYears : DASHA_YEARS[DASHA_ORDER[dashaIndex]];
        mahadasha = DASHA_ORDER[dashaIndex];
        mdStart = new Date(cursor);
        mdEnd = addYears(cursor, years);
        if (mdEnd > now) break;
        cursor = mdEnd;
        dashaIndex = (dashaIndex + 1) % 9;
        firstDasha = false;
      }

      const mdDuration = mdEnd.getTime() - mdStart.getTime();
      const elapsedInMd = now.getTime() - mdStart.getTime();
      const mdProgress = elapsedInMd / mdDuration;
      const mdYears = DASHA_YEARS[mahadasha];
      const adStartIdx = DASHA_ORDER.indexOf(mahadasha);

      let antardasha = mahadasha;
      let adStart = new Date(mdStart);
      let adEnd = new Date(mdStart);
      const adTimeline: Array<{ antardasha: string; startDate: Date; endDate: Date }> = [];
      let adProgress = 0;
      let antardashaResolved = false;

      for (let i = 0; i < 9; i++) {
        const adPlanet = DASHA_ORDER[(adStartIdx + i) % 9];
        const adYears = (DASHA_YEARS[adPlanet] * mdYears) / 120;
        const adRatio = adYears / mdYears;
        const start = new Date(mdStart.getTime() + adProgress * mdDuration);
        const end = new Date(mdStart.getTime() + (adProgress + adRatio) * mdDuration);
        adTimeline.push({ antardasha: adPlanet, startDate: start, endDate: end });
        if (!antardashaResolved && adProgress + adRatio > mdProgress) {
          antardasha = adPlanet;
          adStart = start;
          adEnd = end;
          antardashaResolved = true;
        }
        adProgress += adRatio;
      }

      const upcomingMahadashas: Array<{ planet: string; startDate: Date; endDate: Date }> = [];
      let nextStart = mdEnd;
      let nextIdx = (DASHA_ORDER.indexOf(mahadasha) + 1) % 9;
      for (let i = 0; i < 3; i++) {
        const p = DASHA_ORDER[nextIdx];
        const s = new Date(nextStart);
        const e = addYears(s, DASHA_YEARS[p]);
        upcomingMahadashas.push({ planet: p, startDate: s, endDate: e });
        nextStart = e;
        nextIdx = (nextIdx + 1) % 9;
      }

      return {
        mahadasha,
        mdStart,
        mdEnd,
        antardasha,
        adStart,
        adEnd,
        adTimeline,
        mdTimeline: [{ planet: mahadasha, startDate: mdStart, endDate: mdEnd }, ...upcomingMahadashas],
        startLord,
        balanceYears,
      };
    } catch {
      return null;
    }
  }, [report]);

  const resolveMdDates = (planet: string, fallbackStart?: string, fallbackEnd?: string) => {
    if (!dashaTruth) return { start: fallbackStart || '', end: fallbackEnd || '' };
    const found = dashaTruth.mdTimeline.find(m => m.planet === planet);
    if (!found) return { start: fallbackStart || '', end: fallbackEnd || '' };
    return { start: formatMonthYear(found.startDate), end: formatMonthYear(found.endDate) };
  };

  const resolveAdDates = (planet: string, fallbackStart?: string, fallbackEnd?: string) => {
    if (!dashaTruth) return { start: fallbackStart || '', end: fallbackEnd || '' };
    const found = dashaTruth.adTimeline.find(a => a.antardasha === planet);
    if (!found) return { start: fallbackStart || '', end: fallbackEnd || '' };
    return { start: formatMonthYear(found.startDate), end: formatMonthYear(found.endDate) };
  };

  const charts: ChartData[] = report.charts || [];
  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        {/* Outer decorative border */}
        <Svg width={595} height={842} style={{ position: 'absolute', top: 0, left: 0 }}>
          {/* Outer gold frame */}
          <Rect x={20} y={20} width={555} height={802} fill="none" stroke={P.gold} strokeWidth={2} />
          {/* Inner frame */}
          <Rect x={28} y={28} width={539} height={786} fill="none" stroke={P.goldLight} strokeWidth={0.8} />
          {/* Corner ornaments - top left */}
          <Path d="M20,20 L20,50 M20,20 L50,20" stroke={P.gold} strokeWidth={3} fill="none" />
          {/* Corner ornaments - top right */}
          <Path d="M575,20 L575,50 M575,20 L545,20" stroke={P.gold} strokeWidth={3} fill="none" />
          {/* Corner ornaments - bottom left */}
          <Path d="M20,822 L20,792 M20,822 L50,822" stroke={P.gold} strokeWidth={3} fill="none" />
          {/* Corner ornaments - bottom right */}
          <Path d="M575,822 L575,792 M575,822 L545,822" stroke={P.gold} strokeWidth={3} fill="none" />
          {/* Decorative horizontal line below title area */}
          <Line x1={80} y1={340} x2={515} y2={340} stroke={P.gold} strokeWidth={1} />
          <Line x1={100} y1={345} x2={495} y2={345} stroke={P.goldLight} strokeWidth={0.6} />
          {/* Decorative horizontal line above footer */}
          <Line x1={80} y1={700} x2={515} y2={700} stroke={P.gold} strokeWidth={1} />
          <Line x1={100} y1={705} x2={495} y2={705} stroke={P.goldLight} strokeWidth={0.6} />
        </Svg>

        {/* Header area */}
        <View style={{ marginTop: 80, alignItems: 'center', width: '100%' }}>
          <Text style={styles.coverKicker}>SRI MANDIR</Text>
          <Text style={styles.coverMark}>Om Tat Sat</Text>
          <Text style={styles.coverTitle}>Kundli Report</Text>
          <Text style={{ fontSize: 13, color: P.gold, textAlign: 'center', marginTop: 8, marginBottom: 6 }}>
            ~ Vedic Astrology ~
          </Text>
          <Text style={styles.coverSubtitle}>A Comprehensive Planetary Blueprint</Text>
        </View>

        {/* Decorative divider with diamond */}
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Text style={{ color: P.gold, fontSize: 18 }}>- - - * - - -</Text>
        </View>

        {/* Name and birth details block */}
        <View style={{
          alignItems: 'center',
          paddingVertical: 24,
          paddingHorizontal: 60,
          width: '100%',
        }}>
          <Text style={[styles.coverName, { marginBottom: 16 }]}>{report.birthDetails.name}</Text>
          <View style={{ width: '60%', borderTopWidth: 1, borderTopColor: P.goldLight, marginBottom: 16 }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.coverMetaLabel}>Date of Birth</Text>
            <Text style={[styles.coverDetails, { marginBottom: 8 }]}>{formatBirthDate(report.birthDetails.dateOfBirth)}</Text>
            <Text style={styles.coverMetaLabel}>Time of Birth</Text>
            <Text style={[styles.coverDetails, { marginBottom: 8 }]}>{report.birthDetails.timeOfBirth}</Text>
            <Text style={styles.coverMetaLabel}>Place of Birth</Text>
            <Text style={[styles.coverDetails, { marginBottom: 8 }]}>{report.birthDetails.placeOfBirth}</Text>
          </View>
        </View>

        {/* Footer area */}
        <View style={{ position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={styles.coverFooterMeta}>
            Prepared on {formatDate(report.generatedAt)}
          </Text>
          <Text style={styles.coverFooterBrand}>
            Sri Mandir — Dharma, Karma, Jyotish
          </Text>
        </View>
      </Page>

      {/* Table of Contents Page */}
      <ContentPage sectionName="Table of Contents">
        <Section title="Table of Contents">
          <Text style={[styles.paragraph, { marginBottom: 16, fontStyle: 'italic' }]}>
            This comprehensive Kundli report covers all major dimensions of your birth chart,
            from your fundamental planetary blueprint to specific life-area predictions and
            remedial guidance.
          </Text>

          {/* TOC Entries */}
          {[
            { num: '01', title: 'Birth Details & Planetary Positions', sub: 'Ascendant, planetary placements, Chara Karakas (Jaimini)' },
            { num: '02', title: 'Panchang Analysis', sub: 'Vaar, Tithi, Nakshatra, Yoga, Karana at birth' },
            { num: '03', title: 'Three Pillars of Your Chart', sub: 'Moon Sign, Ascendant, Birth Nakshatra' },
            { num: '04', title: 'Personal Planetary Profiles', sub: 'Detailed analysis of all 9 planets' },
            { num: '05', title: 'Bhavphal — The 12 Houses', sub: 'Complete house-by-house life analysis' },
            { num: '06', title: 'Career & Professional Life', sub: 'Career calling, wealth potential, suitable fields' },
            { num: '07', title: 'Love, Romance & Marriage', sub: 'Partner profile, marriage timing, compatibility' },
            { num: '08', title: 'Health & Well-Being', sub: 'Age-aware lifestyle guidance and preventive care focus' },
            { num: '09', title: 'Vimshottari Dasha Predictions', sub: 'Current & upcoming planetary periods' },
            { num: '10', title: 'Rahu–Ketu Karmic Axis', sub: 'Past karma, future direction, Kaal Sarp Yoga' },
            { num: '11', title: 'Raja Yogas & Auspicious Combinations', sub: 'Pancha Mahapurusha, Dhana Yogas and more' },
            { num: '12', title: 'Dosha Analysis', sub: 'Mangal Dosha, Kaal Sarp and other planetary afflictions' },
            { num: '13', title: 'Sade Sati — Saturn\'s 7.5-Year Transit', sub: 'Current status, phases, remedies' },
            { num: '14', title: 'Numerology Analysis', sub: 'Birth number, destiny number, personal year' },
            { num: '15', title: 'Spiritual Potential & Dharma', sub: 'Atmakaraka, Ishta Devata, Moksha path' },
            { num: '16', title: 'Vedic Remedies', sub: 'Gemstones, Rudraksha, Mantras, Yantras, Pujas' },
            { num: '17', title: 'Chara Karakas — Jaimini System', sub: 'Atmakaraka, Amatyakaraka, Darakaraka in depth' },
          ].map((entry) => (
            <View key={entry.num}>
              <View style={styles.tocEntry}>
                <Text style={styles.tocNumber}>{entry.num}</Text>
                <Text style={styles.tocTitle}>{entry.title}</Text>
              </View>
              <Text style={styles.tocSubtitle}>{entry.sub}</Text>
            </View>
          ))}
        </Section>
      </ContentPage>

      {/* Kundali Charts Section */}
      {charts.length > 0 && (
        <ContentPage sectionName="Kundali Charts">
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
        </ContentPage>
      )}

      {/* Additional Charts Page */}
      {charts.length > 2 && (
        <ContentPage sectionName="Kundali Charts">
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
        </ContentPage>
      )}
      {/* Birth Details & Planetary Positions */}
      <ContentPage sectionName="Birth Details & Planetary Positions">
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
      </ContentPage>

      {/* Panchang Analysis */}
      {report.panchang && (
        <ContentPage sectionName="Panchang Analysis">
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
        </ContentPage>
      )}

      {/* Three Pillars */}
      {report.pillars && (
        <ContentPage sectionName="Three Pillars">
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
        </ContentPage>
      )}

      {/* Planetary Profiles */}
      {report.planets && report.planets.length > 0 && (
        <>
          {report.planets.map((planet: any, idx: number) => (
            <ContentPage key={idx} sectionName={`Planet: ${planet.planet}`}>
              <Section title={`${planet.planet} - Planetary Analysis`}>
                <InfoStrip items={[
                  { label: 'Sign', value: planet.sign || 'N/A' },
                  { label: 'House', value: `${planet.house || 'N/A'}` },
                  { label: 'Dignity', value: planet.dignity || 'N/A' },
                  { label: 'Motion', value: planet.isRetrograde ? 'Retrograde' : 'Direct' },
                ]} />

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
                      <Text style={styles.bodyText}>{planet.retrogradeEffect}</Text>
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
            </ContentPage>
          ))}
        </>
      )}

      {/* House Analysis (Bhavphal) */}
      {report.houses && report.houses.length > 0 && (
        <>
          <ContentPage sectionName="House Analysis (Bhavphal)">
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
          </ContentPage>

          {report.houses.map((house: any, idx: number) => (
            <ContentPage key={idx} sectionName={`House ${house.house}`}>
              <Section title={`House ${house.house}${house.houseHindi ? ' - ' + sanitizeText(house.houseHindi) : ''}`}>
                <InfoStrip items={[
                  { label: 'Sign', value: house.sign || 'N/A' },
                  { label: 'Lord', value: house.lord || 'N/A' },
                  { label: 'Nature', value: house.houseNature || 'N/A' },
                ]} />

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
            </ContentPage>
          ))}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 04 — LIFE PREDICTIONS
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="04"
        title="Life Predictions"
        subtitle="Career, marriage, wealth, health — what the stars reveal about every major chapter of your life"
      />

      {/* Career Analysis */}
      {report.career && (
        <ContentPage sectionName="Career Analysis">
          <Section title="Career Calling">
            <Text style={styles.paragraph}>{report.career.overview || ''}</Text>

            {report.career.careerDirection && (
              <SubSection title="Right Career For You">
                <View style={styles.highlight}>
                  <Text style={styles.boldLabel}>{report.career.careerDirection.rightCareerForYou || ''}</Text>
                </View>
                {report.career.careerDirection.coreStrengths && report.career.careerDirection.coreStrengths.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Core Strengths</Text>
                    <BulletList items={report.career.careerDirection.coreStrengths} />
                  </>
                )}
                {report.career.careerDirection.idealRoles && report.career.careerDirection.idealRoles.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Ideal Roles</Text>
                    <BulletList items={report.career.careerDirection.idealRoles} />
                  </>
                )}
                <InfoRow label="Ideal Work Environment" value={report.career.careerDirection.idealWorkEnvironment || 'N/A'} />
              </SubSection>
            )}

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

            {report.career.careerTiming && (
              <SubSection title="Career Timing & Phases">
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutTitle}>Current Career Phase</Text>
                  <Text style={styles.bodyText}>{report.career.careerTiming.currentPhase || ''}</Text>
                </View>
                {report.career.careerTiming.upcomingOpportunities && report.career.careerTiming.upcomingOpportunities.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Upcoming Opportunities</Text>
                    <BulletList items={report.career.careerTiming.upcomingOpportunities} />
                  </>
                )}
                {report.career.careerTiming.challenges && report.career.careerTiming.challenges.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Challenges to Navigate</Text>
                    <BulletList items={report.career.careerTiming.challenges} />
                  </>
                )}
              </SubSection>
            )}

            {report.career.careerSwitchInsights && (
              <SubSection title="Career Switch Insights">
                <InfoRow label="Is Switch Due Now?" value={report.career.careerSwitchInsights.isSwitchDueNow || 'N/A'} />
                <InfoRow label="Next Switch Window" value={report.career.careerSwitchInsights.nextSwitchWindow || 'N/A'} />
                {report.career.careerSwitchInsights.oneOrTwoFutureChanges && report.career.careerSwitchInsights.oneOrTwoFutureChanges.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Future Career Changes</Text>
                    <BulletList items={report.career.careerSwitchInsights.oneOrTwoFutureChanges} />
                  </>
                )}
                <Text style={styles.paragraph}>{report.career.careerSwitchInsights.rationale || ''}</Text>
                {report.career.careerSwitchInsights.preparationPlan && report.career.careerSwitchInsights.preparationPlan.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Preparation Plan</Text>
                    <BulletList items={report.career.careerSwitchInsights.preparationPlan} />
                  </>
                )}
              </SubSection>
            )}

            <SubSection title="Success Formula">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{report.career.successFormula || ''}</Text>
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
        </ContentPage>
      )}

      {/* Marriage Analysis */}
      {report.marriage && (
        <ContentPage sectionName="Love & Marriage">
          <Section title="Love & Marriage">
            <Text style={styles.paragraph}>{report.marriage.overview || ''}</Text>

            {report.marriage.maritalSafety && (
              <SubSection title="Relationship Safety Framework">
                <InfoRow label="Status Assumption" value={report.marriage.maritalSafety.statusAssumption || 'N/A'} />
                <Text style={styles.paragraph}>{report.marriage.maritalSafety.safeguardPolicy || ''}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{report.marriage.maritalSafety.alreadyMarriedGuidance || ''}</Text>
                </View>
              </SubSection>
            )}

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

            {report.marriage.idealPartnerForUnmarried && (
              <SubSection title="Ideal Partner (If Unmarried)">
                <InfoRow label="Applicability" value={report.marriage.idealPartnerForUnmarried.whenApplicable || 'N/A'} />
                {report.marriage.idealPartnerForUnmarried.keyQualities && report.marriage.idealPartnerForUnmarried.keyQualities.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Key Qualities</Text>
                    <BulletList items={report.marriage.idealPartnerForUnmarried.keyQualities} />
                  </>
                )}
                {report.marriage.idealPartnerForUnmarried.cautionTraits && report.marriage.idealPartnerForUnmarried.cautionTraits.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Caution Traits</Text>
                    <BulletList items={report.marriage.idealPartnerForUnmarried.cautionTraits} />
                  </>
                )}
                <Text style={styles.paragraph}>{report.marriage.idealPartnerForUnmarried.practicalAdvice || ''}</Text>
              </SubSection>
            )}

            {report.marriage.guidanceForMarriedNatives && (
              <SubSection title="Guidance If Married">
                {report.marriage.guidanceForMarriedNatives.focusAreas && report.marriage.guidanceForMarriedNatives.focusAreas.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Focus Areas</Text>
                    <BulletList items={report.marriage.guidanceForMarriedNatives.focusAreas} />
                  </>
                )}
                {report.marriage.guidanceForMarriedNatives.relationshipStrengthening && report.marriage.guidanceForMarriedNatives.relationshipStrengthening.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Relationship Strengthening</Text>
                    <BulletList items={report.marriage.guidanceForMarriedNatives.relationshipStrengthening} />
                  </>
                )}
                {report.marriage.guidanceForMarriedNatives.conflictsToAvoid && report.marriage.guidanceForMarriedNatives.conflictsToAvoid.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>Conflicts to Avoid</Text>
                    <BulletList items={report.marriage.guidanceForMarriedNatives.conflictsToAvoid} />
                  </>
                )}
              </SubSection>
            )}

            <SubSection title="Marriage Timing">
              <InfoRow label="Ideal Age Range" value={report.marriage.marriageTiming?.idealAgeRange || 'N/A'} />
              <InfoRow label="Ideal Time for Young Natives" value={report.marriage.marriageTiming?.idealTimeForYoungNatives || 'N/A'} />
              <InfoRow label="Current Prospects" value={report.marriage.marriageTiming?.currentProspects || 'N/A'} />
              {report.marriage.marriageTiming?.favorablePeriods && (
                <>
                  <Text style={styles.subSubHeader}>Favorable Periods</Text>
                  <BulletList items={report.marriage.marriageTiming.favorablePeriods} />
                </>
              )}
              {report.marriage.marriageTiming?.challengingPeriods && report.marriage.marriageTiming.challengingPeriods.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>Challenging Periods</Text>
                  <BulletList items={report.marriage.marriageTiming.challengingPeriods} />
                </>
              )}
            </SubSection>

            {report.marriage.mangalDosha?.present && (
              <SubSection title="Mangal Dosha">
                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>Severity: {report.marriage.mangalDosha.severity}</Text>
                </View>
                <BulletList items={report.marriage.mangalDosha.remedies || []} />
              </SubSection>
            )}
          </Section>
        </ContentPage>
      )}

      {/* Health Analysis */}
      {(report.remedies?.healthGuidance || report.remedies?.generalAdvice) && (
        <ContentPage sectionName="Health & Well-Being">
          <Section title="Health & Well-Being">
            <Text style={styles.paragraph}>
              {report.remedies?.healthGuidance?.whyThisMatters || 'This guidance focuses on sustainable, age-appropriate health habits and long-term stability.'}
            </Text>

            {report.remedies?.healthGuidance && (
              <>
                <SubSection title="Age Context & Safety">
                  <InfoRow label="Age Group Context" value={report.remedies.healthGuidance.ageGroup || 'N/A'} />
                  {report.remedies.healthGuidance.medicalDisclaimer && (
                    <Text style={styles.scriptural}>{report.remedies.healthGuidance.medicalDisclaimer}</Text>
                  )}
                </SubSection>

                {report.remedies.healthGuidance.safeMovement && report.remedies.healthGuidance.safeMovement.length > 0 && (
                  <SubSection title="Safe Movement Guidance">
                    <BulletList items={report.remedies.healthGuidance.safeMovement} />
                  </SubSection>
                )}

                {report.remedies.healthGuidance.nutritionAndHydration && report.remedies.healthGuidance.nutritionAndHydration.length > 0 && (
                  <SubSection title="Nutrition & Hydration">
                    <BulletList items={report.remedies.healthGuidance.nutritionAndHydration} />
                  </SubSection>
                )}

                {report.remedies.healthGuidance.recoveryAndSleep && report.remedies.healthGuidance.recoveryAndSleep.length > 0 && (
                  <SubSection title="Recovery & Sleep">
                    <BulletList items={report.remedies.healthGuidance.recoveryAndSleep} />
                  </SubSection>
                )}

                {report.remedies.healthGuidance.preventiveChecks && report.remedies.healthGuidance.preventiveChecks.length > 0 && (
                  <SubSection title="Preventive Health Checks">
                    <BulletList items={report.remedies.healthGuidance.preventiveChecks} />
                  </SubSection>
                )}

                {report.remedies.healthGuidance.avoidOverstrain && report.remedies.healthGuidance.avoidOverstrain.length > 0 && (
                  <SubSection title="What to Avoid">
                    <BulletList items={report.remedies.healthGuidance.avoidOverstrain} />
                  </SubSection>
                )}
              </>
            )}

            {report.remedies?.generalAdvice && (
              <SubSection title="General Wellness Note">
                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{report.remedies.generalAdvice}</Text>
                </View>
              </SubSection>
            )}
          </Section>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 05 — YOUR DASHA TIMELINE
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="05"
        title="Your Dasha Timeline"
        subtitle="The planetary periods that govern each phase of your life — your cosmic roadmap from birth to liberation"
      />

      {/* Dasha Predictions - Page 1: Current Mahadasha & Antardasha */}
      {report.dasha && (
        <ContentPage sectionName="Dasha Predictions">
          <Section title="Vimshottari Dasha Predictions">
            <Text style={styles.paragraph}>{report.dasha.overview || ''}</Text>
            <Text style={styles.paragraph}>{report.dasha.vimshottariSystem || ''}</Text>

            <SubSection title="Birth Nakshatra">
              <InfoRow label="Nakshatra" value={report.dasha.birthNakshatra?.name || 'N/A'} />
              <InfoRow label="Lord" value={dashaTruth?.startLord || report.dasha.birthNakshatra?.lord || 'N/A'} />
              <InfoRow label="Starting Dasha" value={dashaTruth?.startLord || report.dasha.birthNakshatra?.startingDasha || 'N/A'} />
              <InfoRow label="Balance at Birth" value={dashaTruth ? `${dashaTruth.balanceYears.toFixed(2)} years` : (report.dasha.birthNakshatra?.balance || 'N/A')} />
            </SubSection>

            <SubSection title={`Current Mahadasha: ${dashaTruth?.mahadasha || report.dasha.currentMahadasha?.planet || 'N/A'}`}>
              <View style={styles.card}>
                <InfoRow
                  label="Period"
                  value={`${dashaTruth ? formatMonthYear(dashaTruth.mdStart) : (report.dasha.currentMahadasha?.startDate || '')} to ${dashaTruth ? formatMonthYear(dashaTruth.mdEnd) : (report.dasha.currentMahadasha?.endDate || '')}`}
                />
                <Text style={[styles.accentText, { marginTop: 5 }]}>
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
                  <Text style={styles.boldLabel}>Advice: </Text>
                  <Text style={styles.bodyText}>{report.dasha.currentMahadasha.advice}</Text>
                </View>
              )}
            </SubSection>

            <SubSection title={`Current Antardasha: ${dashaTruth?.antardasha || report.dasha.currentAntardasha?.planet || 'N/A'}`}>
              <View style={styles.card}>
                <InfoRow
                  label="Period"
                  value={`${dashaTruth ? formatMonthYear(dashaTruth.adStart) : (report.dasha.currentAntardasha?.startDate || '')} to ${dashaTruth ? formatMonthYear(dashaTruth.adEnd) : (report.dasha.currentAntardasha?.endDate || '')}`}
                />
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
        </ContentPage>
      )}

      {/* Dasha Predictions - Page 2: Detailed Mahadasha Predictions */}
      {report.dasha?.mahadashaPredictions && report.dasha.mahadashaPredictions.length > 0 && (
        <>
          {report.dasha.mahadashaPredictions.map((md: any, idx: number) => (
            <ContentPage key={`md-${idx}`} sectionName={`${md.planet} Mahadasha`}>
              <Section title={`${md.planet} Mahadasha Predictions`}>
                {(() => {
                  const mdDates = resolveMdDates(md.planet, md.startDate, md.endDate);
                  return (
                <View style={styles.card}>
                      <InfoRow label="Period" value={`${mdDates.start} to ${mdDates.end}`} />
                  <InfoRow label="Duration" value={md.duration || ''} />
                </View>
                  );
                })()}
                
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
            </ContentPage>
          ))}
        </>
      )}

      {/* Dasha Predictions - Antardasha Details */}
      {report.dasha?.antardashaPredictions && report.dasha.antardashaPredictions.length > 0 && (
        <ContentPage sectionName="Antardasha Predictions">
          <Section title="Antardasha Predictions (Current Mahadasha)">
            <Text style={styles.paragraph}>
              The following are the current and upcoming sub-periods (Antardashas) within your current Mahadasha.
              Completed past Antardashas are intentionally excluded so this section stays forward-looking and actionable.
            </Text>
            
            {report.dasha.antardashaPredictions.map((ad: any, idx: number) => (
              <Card key={idx} title={`${ad.mahadasha}/${ad.antardasha} (${ad.duration || ''})`}>
                {(() => {
                  const adDates = resolveAdDates(ad.antardasha, ad.startDate, ad.endDate);
                  return <InfoRow label="Period" value={`${adDates.start} to ${adDates.end}`} />;
                })()}
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
                    <Text style={styles.bodyText}>{ad.advice}</Text>
                  </View>
                )}
              </Card>
            ))}
          </Section>
        </ContentPage>
      )}

      {/* Dasha Predictions - Upcoming Mahadasha Antardasha Details */}
      {report.dasha?.upcomingMahadashaAntardashaPredictions && report.dasha.upcomingMahadashaAntardashaPredictions.length > 0 && (
        <>
          {report.dasha.upcomingMahadashaAntardashaPredictions.map((mdGroup: any, mdIdx: number) => (
            <ContentPage key={`upcoming-md-ad-${mdIdx}`} sectionName={`${mdGroup.mahadasha} Antardashas`}>
              <Section title={`${mdGroup.mahadasha} Mahadasha - Antardasha Predictions`}>
                <View style={styles.card}>
                  <InfoRow label="Mahadasha Period" value={`${mdGroup.startDate || ''} to ${mdGroup.endDate || ''}`} />
                </View>
                <Text style={styles.paragraph}>{mdGroup.overview || ''}</Text>

                {(mdGroup.antardashas || []).map((ad: any, idx: number) => (
                  <Card key={idx} title={`${mdGroup.mahadasha}/${ad.antardasha} (${ad.duration || ''})`}>
                    <InfoRow label="Period" value={`${ad.startDate || ''} to ${ad.endDate || ''}`} />
                    <Text style={styles.paragraph}>{ad.interpretation || ''}</Text>

                    {ad.focusAreas && ad.focusAreas.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>Focus Areas</Text>
                        <BulletList items={ad.focusAreas} />
                      </>
                    )}

                    {ad.advice && (
                      <View style={styles.highlight}>
                        <Text style={styles.bodyText}>{ad.advice}</Text>
                      </View>
                    )}
                  </Card>
                ))}
              </Section>
            </ContentPage>
          ))}
        </>
      )}

      {/* Yogini Dasha Section */}
      {report.dasha?.yoginiDasha && (
        <ContentPage sectionName="Yogini Dasha">
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
        </ContentPage>
      )}

      {/* Dasha Predictions - Page 3: Upcoming Periods & Sequence */}
      {report.dasha && (
        <ContentPage sectionName="Dasha Sequence">
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
                <Text style={styles.bodyText}>{report.dasha.spiritualGuidance || ''}</Text>
              </View>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 06 — DOSHAS, YOGAS & KARMA
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="06"
        title="Doshas, Yogas & Karma"
        subtitle="Karmic imbalances, auspicious combinations, and the Rahu-Ketu axis that defines your soul's evolutionary mission"
      />

      {/* Rahu-Ketu Analysis */}
      {report.rahuKetu && (
        <ContentPage sectionName="Rahu-Ketu Axis">
          <Section title="Rahu-Ketu Karmic Axis">
            <Text style={styles.paragraph}>{report.rahuKetu.overview || ''}</Text>

            <SubSection title="Karmic Axis">
              <InfoRow label="Rahu" value={`${report.rahuKetu.karmicAxis?.rahuSign || ''} (House ${report.rahuKetu.karmicAxis?.rahuHouse || ''})`} />
              <InfoRow label="Ketu" value={`${report.rahuKetu.karmicAxis?.ketuSign || ''} (House ${report.rahuKetu.karmicAxis?.ketuHouse || ''})`} />
              <Text style={styles.paragraph}>{report.rahuKetu.karmicAxis?.axisInterpretation || ''}</Text>
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>Life Lesson: </Text>
                <Text style={styles.bodyText}>{report.rahuKetu.karmicAxis?.lifeLesson || ''}</Text>
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
                  <Text style={styles.boldLabel}>Type: {report.rahuKetu.kaalSarpYoga.type}</Text>
                  <Text style={styles.bodyText}>Severity: {report.rahuKetu.kaalSarpYoga.severity}</Text>
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
        </ContentPage>
      )}

      {/* Doshas Analysis - Standardized Template */}
      {report.doshas && (
        <>
          <ContentPage sectionName="Dosha Analysis">
            <Section title="Dosha Analysis">
              <Text style={styles.paragraph}>{report.doshas.overview || ''}</Text>
              
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>Total Doshas Detected: {report.doshas.totalDoshasDetected || 0}</Text>
              </View>

              <SubSection title="Major Doshas">
                {(report.doshas.majorDoshas || []).map((dosha: any, idx: number) => (
                  <Card key={idx} title={`${dosha.name}${dosha.nameHindi ? ' (' + sanitizeText(dosha.nameHindi) + ')' : ''}`}>
                    <InfoStrip items={[
                      { label: 'Status', value: dosha.status?.toUpperCase() || 'N/A' },
                      { label: 'Severity', value: dosha.severity?.toUpperCase() || 'N/A' },
                    ]} />
                    
                    <Text style={styles.paragraph}>{dosha.description}</Text>
                    
                    {dosha.cause && (
                      <>
                        <Text style={styles.subSubHeader}>Cause</Text>
                        <Text style={styles.bodyText}>{dosha.cause}</Text>
                      </>
                    )}
                    
                    {dosha.effects && dosha.effects.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>Effects</Text>
                        <BulletList items={dosha.effects} />
                      </>
                    )}
                    
                    {dosha.affectedLifeAreas && dosha.affectedLifeAreas.length > 0 && (
                      <InfoRow label="Affected Areas" value={dosha.affectedLifeAreas.join(', ')} />
                    )}
                    
                    {dosha.nullificationReason && (
                      <View style={styles.highlight}>
                        <Text style={styles.successText}>Nullified: {dosha.nullificationReason}</Text>
                      </View>
                    )}
                    
                    <Text style={styles.scriptural}>{dosha.scripturalReference}</Text>
                  </Card>
                ))}
              </SubSection>
            </Section>
          </ContentPage>

          {/* Minor Doshas */}
          {report.doshas.minorDoshas && report.doshas.minorDoshas.length > 0 && (
            <ContentPage sectionName="Minor Doshas">
              <Section title="Minor Doshas">
                {report.doshas.minorDoshas.map((dosha: any, idx: number) => (
                  <Card key={idx} title={`${dosha.name}${dosha.nameHindi ? ' (' + sanitizeText(dosha.nameHindi) + ')' : ''}`}>
                    <InfoStrip items={[
                      { label: 'Status', value: dosha.status?.toUpperCase() || 'N/A' },
                    ]} />
                    <Text style={styles.paragraph}>{dosha.description}</Text>
                    {dosha.cause && <Text style={styles.bodyText}>Cause: {dosha.cause}</Text>}
                    {dosha.effects && dosha.effects.length > 0 && <BulletList items={dosha.effects} />}
                  </Card>
                ))}
              </Section>
            </ContentPage>
          )}

          {/* Dosha Remedies */}
          {report.doshas.doshaRemedies && report.doshas.doshaRemedies.length > 0 && (
            <ContentPage sectionName="Dosha Remedies">
              <Section title="Dosha Remedies">
                <SubSection title="Priority Remedies">
                  {report.doshas.priorityRemedies && (
                    <>
                      <Text style={styles.subSubHeader}>Immediate (Start Now)</Text>
                      <BulletList items={report.doshas.priorityRemedies.immediate || []} />
                      
                      <Text style={styles.subSubHeader}>Short-Term (1-3 Months)</Text>
                      <BulletList items={report.doshas.priorityRemedies.shortTerm || []} />
                      
                      <Text style={styles.subSubHeader}>Long-Term (Ongoing)</Text>
                      <BulletList items={report.doshas.priorityRemedies.longTerm || []} />
                    </>
                  )}
                </SubSection>

                {report.doshas.doshaRemedies.map((remedy: any, idx: number) => (
                  <Card key={idx} title={`Remedies for ${remedy.doshaName}`}>
                    <Text style={styles.subSubHeader}>Primary Remedy: {remedy.primaryRemedy?.name}</Text>
                    <InfoRow label="Type" value={remedy.primaryRemedy?.type || 'N/A'} />
                    <Text style={styles.bodyText}>{remedy.primaryRemedy?.description}</Text>
                    
                    <Text style={styles.subSubHeader}>Procedure</Text>
                    <Text style={styles.bodyText}>{remedy.primaryRemedy?.procedure}</Text>
                    
                    <InfoRow label="Timing" value={remedy.primaryRemedy?.timing || 'N/A'} />
                    
                    {remedy.primaryRemedy?.expectedBenefits && (
                      <>
                        <Text style={styles.subSubHeader}>Expected Benefits</Text>
                        <BulletList items={remedy.primaryRemedy.expectedBenefits} />
                      </>
                    )}
                    
                    <Text style={styles.scriptural}>{remedy.primaryRemedy?.scripturalBasis}</Text>
                    
                    {remedy.mantras && remedy.mantras.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>Mantras</Text>
                        {remedy.mantras.map((m: any, mIdx: number) => (
                          <View key={mIdx} style={{ marginBottom: 5 }}>
                            <Text style={[styles.boldLabel, { color: '#c2410c' }]}>{m.mantra}</Text>
                            <Text style={styles.bodyText}>Deity: {m.deity} | Count: {m.japaCount} | Timing: {m.timing}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </Card>
                ))}

                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{report.doshas.generalGuidance || ''}</Text>
                </View>

                <Text style={styles.scriptural}>{report.doshas.disclaimerNote || ''}</Text>
              </Section>
            </ContentPage>
          )}
        </>
      )}

      {/* Raj Yogs Analysis - Standardized Template */}
      {report.rajYogs && (
        <>
          <ContentPage sectionName="Raja Yogas">
            <Section title="Raja Yogas (Auspicious Combinations)">
              <Text style={styles.paragraph}>{report.rajYogs.overview || ''}</Text>
              
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>Total Yogas Detected: {report.rajYogs.totalYogasDetected || 0}</Text>
                <Text style={styles.bodyText}>Overall Strength: {report.rajYogs.overallYogaStrength?.rating?.toUpperCase() || 'N/A'}</Text>
              </View>
              
              <Text style={styles.paragraph}>{report.rajYogs.overallYogaStrength?.description || ''}</Text>

              <SubSection title="Raja Yogas (Power & Success)">
                {(report.rajYogs.rajYogas || []).filter((y: any) => y.isPresent).map((yoga: any, idx: number) => (
                  <Card key={idx} title={`${yoga.name}${yoga.nameHindi ? ' (' + sanitizeText(yoga.nameHindi) + ')' : ''}`}>
                    <InfoStrip items={[
                      { label: 'Strength', value: yoga.strength?.toUpperCase() || 'N/A' },
                      { label: 'Activation', value: yoga.activationPeriod || 'N/A' },
                    ]} />
                    
                    <Text style={styles.subSubHeader}>Definition</Text>
                    <Text style={styles.bodyText}>{yoga.definition}</Text>
                    
                    <Text style={styles.subSubHeader}>Formation in Your Chart</Text>
                    <View style={styles.highlight}>
                      <Text style={styles.bodyText}>{yoga.formationInChart}</Text>
                    </View>
                    
                    <Text style={styles.subSubHeader}>Benefits</Text>
                    <BulletList items={yoga.benefits || []} />
                    
                    <InfoRow label="Activation Period" value={yoga.activationPeriod || 'N/A'} />
                    
                    <Text style={styles.scriptural}>{yoga.scripturalReference}</Text>
                  </Card>
                ))}
              </SubSection>
            </Section>
          </ContentPage>

          {/* Dhana Yogas */}
          {report.rajYogs.dhanaYogas && report.rajYogs.dhanaYogas.filter((y: any) => y.isPresent).length > 0 && (
            <ContentPage sectionName="Dhana Yogas">
              <Section title="Dhana Yogas (Wealth Combinations)">
                {report.rajYogs.dhanaYogas.filter((y: any) => y.isPresent).map((yoga: any, idx: number) => (
                  <Card key={idx} title={`${yoga.name}${yoga.nameHindi ? ' (' + sanitizeText(yoga.nameHindi) + ')' : ''}`}>
                    <InfoStrip items={[
                      { label: 'Strength', value: yoga.strength?.toUpperCase() || 'N/A' },
                    ]} />
                    <Text style={styles.bodyText}>{yoga.definition}</Text>
                    <Text style={styles.subSubHeader}>In Your Chart</Text>
                    <Text style={styles.bodyText}>{yoga.formationInChart}</Text>
                    <Text style={styles.subSubHeader}>Benefits</Text>
                    <BulletList items={yoga.benefits || []} />
                    <InfoRow label="Activation" value={yoga.activationPeriod || 'N/A'} />
                  </Card>
                ))}
              </Section>
            </ContentPage>
          )}

          {/* Life Predictions from Yogas */}
          {report.rajYogs.lifePredictions && (
            <ContentPage sectionName="Life Predictions from Yogas">
              <Section title="Life Predictions Based on Yogas">
                <SubSection title="Career">
                  <InfoRow label="Strength" value={report.rajYogs.lifePredictions.career?.strength || 'N/A'} />
                  <Text style={styles.paragraph}>{report.rajYogs.lifePredictions.career?.prediction || ''}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.career?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Wealth">
                  <InfoRow label="Strength" value={report.rajYogs.lifePredictions.wealth?.strength || 'N/A'} />
                  <Text style={styles.paragraph}>{report.rajYogs.lifePredictions.wealth?.prediction || ''}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.wealth?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Fame & Recognition">
                  <InfoRow label="Strength" value={report.rajYogs.lifePredictions.fame?.strength || 'N/A'} />
                  <Text style={styles.paragraph}>{report.rajYogs.lifePredictions.fame?.prediction || ''}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.fame?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Spirituality">
                  <InfoRow label="Strength" value={report.rajYogs.lifePredictions.spirituality?.strength || 'N/A'} />
                  <Text style={styles.paragraph}>{report.rajYogs.lifePredictions.spirituality?.prediction || ''}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.spirituality?.peakPeriod || 'N/A'} />
                </SubSection>

                {report.rajYogs.yogaEnhancement && (
                  <SubSection title="Yoga Enhancement">
                    <Text style={styles.subSubHeader}>Practices to Strengthen Yogas</Text>
                    <BulletList items={report.rajYogs.yogaEnhancement.practices || []} />
                    
                    {report.rajYogs.yogaEnhancement.mantras && report.rajYogs.yogaEnhancement.mantras.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>Mantras</Text>
                        {report.rajYogs.yogaEnhancement.mantras.map((m: any, idx: number) => (
                          <View key={idx} style={{ marginBottom: 5 }}>
                            <Text style={styles.boldLabel}>{m.mantra}</Text>
                            <Text style={styles.bodyText}>Purpose: {m.purpose} | Timing: {m.timing}</Text>
                          </View>
                        ))}
                      </>
                    )}
                    
                    <InfoRow label="Recommended Gemstones" value={(report.rajYogs.yogaEnhancement.gemstones || []).join(', ')} />
                    <InfoRow label="Favorable Periods" value={(report.rajYogs.yogaEnhancement.favorablePeriods || []).join(', ')} />
                  </SubSection>
                )}

                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{report.rajYogs.summaryNote || ''}</Text>
                </View>
              </Section>
            </ContentPage>
          )}

          {/* Challenging Yogas */}
          {report.rajYogs.challengingYogas && report.rajYogs.challengingYogas.filter((y: any) => y.isPresent).length > 0 && (
            <ContentPage sectionName="Challenging Yogas">
              <Section title="Challenging Yogas (For Awareness)">
                <Text style={styles.paragraph}>
                  The following challenging combinations are present in your chart. Awareness of these helps you navigate difficulties and apply appropriate remedies.
                </Text>
                {report.rajYogs.challengingYogas.filter((y: any) => y.isPresent).map((yoga: any, idx: number) => (
                  <Card key={idx} title={`${yoga.name}${yoga.nameHindi ? ' (' + sanitizeText(yoga.nameHindi) + ')' : ''}`}>
                    <Text style={styles.bodyText}>{yoga.definition}</Text>
                    <Text style={styles.subSubHeader}>In Your Chart</Text>
                    <Text style={styles.bodyText}>{yoga.formationInChart}</Text>
                    <Text style={styles.subSubHeader}>Effects</Text>
                    <BulletList items={yoga.benefits || []} />
                  </Card>
                ))}
              </Section>
            </ContentPage>
          )}
        </>
      )}

      {/* ─── Sade Sati — Saturn's 7.5-Year Transit ─────────────────────────── */}
      {report.sadeSati && (
        <>
          {/* Page 1: Overview & Current Status */}
          <ContentPage sectionName="Sade Sati">
            <Section title="Sade Sati — Saturn's 7.5-Year Transit">
              <Text style={styles.paragraph}>{report.sadeSati.overview || ''}</Text>
              <Text style={styles.paragraph}>{report.sadeSati.importanceExplanation || ''}</Text>

              <SubSection title="Your Sade Sati Status">
                <View style={styles.highlight}>
                  <View style={styles.row}>
                    <Text style={styles.label}>Moon Sign</Text>
                    <Text style={[styles.value, { fontWeight: 'bold' }]}>
                      {report.sadeSati.moonSign || 'N/A'}{report.sadeSati.moonSignHindi ? ` (${sanitizeText(report.sadeSati.moonSignHindi)})` : ''}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Currently Active</Text>
                    <Text style={[styles.value, { fontWeight: 'bold', color: report.sadeSati.isCurrentlyActive ? '#dc2626' : '#059669' }]}>
                      {report.sadeSati.isCurrentlyActive ? 'YES — ACTIVE NOW' : 'Not Currently Active'}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>Current Phase</Text>
                    <Text style={styles.value}>{report.sadeSati.currentPhase || 'N/A'}</Text>
                  </View>
                </View>
                {report.sadeSati.currentPhaseInterpretation && (
                  <Text style={styles.paragraph}>{report.sadeSati.currentPhaseInterpretation}</Text>
                )}
              </SubSection>

              <SubSection title="The Moon-Saturn Relationship in Your Chart">
                <Text style={styles.paragraph}>{report.sadeSati.moonSaturnRelationship || ''}</Text>
              </SubSection>
            </Section>
          </ContentPage>

          {/* Page 2: The Three Phases */}
          {report.sadeSati.phases && report.sadeSati.phases.length > 0 && (
            <ContentPage sectionName="Sade Sati">
              <Section title="The Three Phases of Your Sade Sati">
                {report.sadeSati.phases.map((phase: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 6 }}>
                    <Text style={styles.subHeader}>{phase.phaseName}</Text>
                    <View style={styles.card}>
                      <View style={styles.row}>
                        <Text style={styles.label}>Saturn Sign</Text>
                        <Text style={styles.value}>{phase.saturnSign || 'N/A'}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Period</Text>
                        <Text style={styles.value}>{phase.startYear} – {phase.endYear}</Text>
                      </View>
                    </View>
                    <Text style={styles.paragraph}>{phase.description || ''}</Text>
                    <View style={styles.grid2}>
                      {phase.challenges && phase.challenges.length > 0 && (
                        <View style={styles.gridItem}>
                          <Text style={styles.subSubHeader}>Challenges to Navigate</Text>
                          <BulletList items={phase.challenges} />
                        </View>
                      )}
                      {phase.hidden_blessings && phase.hidden_blessings.length > 0 && (
                        <View style={styles.gridItem}>
                          <Text style={styles.subSubHeader}>Hidden Blessings</Text>
                          <BulletList items={phase.hidden_blessings} />
                        </View>
                      )}
                    </View>
                    {phase.advice && (
                      <View style={styles.highlight}>
                        <Text style={[styles.boldLabel, { marginBottom: 2 }]}>Guidance for This Phase</Text>
                        <Text style={styles.bodyText}>{phase.advice}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </Section>
            </ContentPage>
          )}

          {/* Page 3: Detailed Period Analysis */}
          <ContentPage sectionName="Sade Sati">
            <Section title="Sade Sati — Detailed Analysis">
              {/* Current / Past Sade Sati */}
              {report.sadeSati.currentSadeSati && (
                <SubSection title={`Current Sade Sati: ${report.sadeSati.currentSadeSati.period}`}>
                  <Text style={styles.paragraph}>{report.sadeSati.currentSadeSati.overallTheme || ''}</Text>
                  <Text style={styles.subSubHeader}>Phase 1 — The Rising (Building Pressure)</Text>
                  <Text style={styles.paragraph}>{report.sadeSati.currentSadeSati.phase1 || ''}</Text>
                  <Text style={styles.subSubHeader}>Phase 2 — The Peak (Maximum Intensity)</Text>
                  <Text style={styles.paragraph}>{report.sadeSati.currentSadeSati.phase2 || ''}</Text>
                  <Text style={styles.subSubHeader}>Phase 3 — The Setting (Harvest & Release)</Text>
                  <Text style={styles.paragraph}>{report.sadeSati.currentSadeSati.phase3 || ''}</Text>
                  <View style={styles.grid2}>
                    {report.sadeSati.currentSadeSati.whatToExpect && (
                      <View style={styles.gridItem}>
                        <Text style={styles.subSubHeader}>What to Expect</Text>
                        <BulletList items={report.sadeSati.currentSadeSati.whatToExpect} />
                      </View>
                    )}
                    {report.sadeSati.currentSadeSati.opportunities && (
                      <View style={styles.gridItem}>
                        <Text style={styles.subSubHeader}>Unique Opportunities</Text>
                        <BulletList items={report.sadeSati.currentSadeSati.opportunities} />
                      </View>
                    )}
                  </View>
                  {report.sadeSati.currentSadeSati.whatNotToDo && (
                    <>
                      <Text style={styles.subSubHeader}>What to Avoid</Text>
                      <BulletList items={report.sadeSati.currentSadeSati.whatNotToDo} />
                    </>
                  )}
                  {report.sadeSati.currentSadeSati.advice && (
                    <View style={[styles.highlight, { marginTop: 4 }]}>
                      <Text style={[styles.boldLabel, { marginBottom: 4 }]}>Master Guidance for Your Sade Sati</Text>
                      <Text style={styles.bodyText}>{report.sadeSati.currentSadeSati.advice}</Text>
                    </View>
                  )}
                </SubSection>
              )}

              {report.sadeSati.pastSadeSati && !report.sadeSati.currentSadeSati && (
                <SubSection title={`Past Sade Sati: ${report.sadeSati.pastSadeSati.period}`}>
                  <Text style={styles.paragraph}>{report.sadeSati.pastSadeSati.keyLessons || ''}</Text>
                  <Text style={styles.paragraph}>{report.sadeSati.pastSadeSati.lifeEvents || ''}</Text>
                </SubSection>
              )}

              {report.sadeSati.nextSadeSati && (
                <SubSection title={`Next Sade Sati: ${report.sadeSati.nextSadeSati.period}`}>
                  <InfoRow label="Approximate Start" value={report.sadeSati.nextSadeSati.approximateStart || 'N/A'} />
                  <Text style={styles.paragraph}>{report.sadeSati.nextSadeSati.preparationAdvice || ''}</Text>
                </SubSection>
              )}
            </Section>
          </ContentPage>

          {/* Page 4: Remedies & Spiritual Significance */}
          <ContentPage sectionName="Sade Sati">
            <Section title="Sade Sati — Remedies & Spiritual Significance">
              <SubSection title="Spiritual Significance">
                <Text style={styles.paragraph}>{report.sadeSati.spiritualSignificance || ''}</Text>
              </SubSection>

              {report.sadeSati.remedies && report.sadeSati.remedies.length > 0 && (
                <SubSection title="Powerful Remedies for Sade Sati">
                  <BulletList items={report.sadeSati.remedies} />
                </SubSection>
              )}

              {report.sadeSati.mantras && report.sadeSati.mantras.length > 0 && (
                <SubSection title="Sacred Mantras">
                  {report.sadeSati.mantras.map((m: any, idx: number) => (
                    <View key={idx} style={[styles.card, { marginBottom: 8 }]}>
                      <Text style={[styles.boldLabel, { color: '#9a3412', marginBottom: 2 }]}>{m.mantra}</Text>
                      <View style={styles.row}>
                        <Text style={styles.label}>Purpose</Text>
                        <Text style={styles.value}>{m.purpose}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>Best Time</Text>
                        <Text style={styles.value}>{m.timing}</Text>
                      </View>
                    </View>
                  ))}
                </SubSection>
              )}

              {report.sadeSati.famousPeopleThrivedDuringSadeSati && (
                <View style={styles.highlight}>
                  <Text style={[styles.boldLabel, { marginBottom: 2 }]}>Inspiration — Famous People Who Thrived During Sade Sati</Text>
                  <Text style={styles.scriptural}>{report.sadeSati.famousPeopleThrivedDuringSadeSati}</Text>
                </View>
              )}
            </Section>
          </ContentPage>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 07 — NUMEROLOGY & SPIRITUAL POTENTIAL
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="07"
        title="Numerology & Spiritual Potential"
        subtitle="Sacred numbers, your soul's purpose, and the spiritual path written in your chart"
      />

      {/* Numerology */}
      {report.numerology && (
        <ContentPage sectionName="Numerology Analysis">
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
        </ContentPage>
      )}

      {/* Spiritual Potential */}
      {report.spiritual && (
        <ContentPage sectionName="Spiritual Potential">
          <Section title="Spiritual Potential">
            <Text style={styles.paragraph}>{report.spiritual.overview || ''}</Text>

            <SubSection title="Spiritual Rating">
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{report.spiritual.spiritualPotential?.rating || 'N/A'}</Text>
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
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 08 — VEDIC REMEDIES
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="08"
        title="Vedic Remedies"
        subtitle="Gemstones, mantras, rituals, fasting, and lifestyle practices to harmonize your planetary energies"
      />

      {/* Remedies - Understanding the Science */}
      {report.remedies?.remediesPhilosophy && (
        <ContentPage sectionName="Vedic Remedies">
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
                <Text style={styles.bodyText}>{report.remedies.remediesPhilosophy.scientificPerspective || ''}</Text>
              </View>
            </SubSection>

            <SubSection title="Traditional Wisdom">
              <Text style={styles.paragraph}>{report.remedies.remediesPhilosophy.traditionalWisdom || ''}</Text>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Gemstones with Trust Details */}
      {report.remedies && (
        <ContentPage sectionName="Gemstone Therapy">
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
                <Text style={styles.scriptural}>{report.remedies.gemstoneRecommendations?.primary?.scripturalReference || ''}</Text>
              </View>
              
              <Text style={styles.subSubHeader}>How It Works</Text>
              <Text style={styles.paragraph}>{report.remedies.gemstoneRecommendations?.primary?.howItWorks || ''}</Text>
              
              <Text style={styles.subSubHeader}>Scientific Basis</Text>
              <Text style={styles.paragraph}>{report.remedies.gemstoneRecommendations?.primary?.scientificBasis || ''}</Text>
              
              <Text style={styles.subSubHeader}>Quality Guidelines</Text>
              <View style={styles.card}>
                <Text style={styles.bodyText}>{report.remedies.gemstoneRecommendations?.primary?.qualityGuidelines || ''}</Text>
              </View>
              
              <Text style={styles.subSubHeader}>Cautions</Text>
              <Text style={styles.cautionText}>{report.remedies.gemstoneRecommendations?.primary?.cautions || ''}</Text>
            </SubSection>

            {report.remedies.gemstoneRecommendations?.secondary && (
              <SubSection title={`Secondary Gemstone: ${report.remedies.gemstoneRecommendations.secondary.stone}`}>
                <InfoRow label="Planet" value={report.remedies.gemstoneRecommendations.secondary.planet || 'N/A'} />
                <Text style={styles.paragraph}>{report.remedies.gemstoneRecommendations.secondary.benefits || ''}</Text>
                <Text style={styles.scriptural}>{report.remedies.gemstoneRecommendations.secondary.scripturalReference || ''}</Text>
              </SubSection>
            )}

            {report.remedies.gemstoneRecommendations?.avoid && report.remedies.gemstoneRecommendations.avoid.length > 0 && (
              <SubSection title="Gemstones to Avoid">
                <BulletList items={report.remedies.gemstoneRecommendations.avoid} />
              </SubSection>
            )}
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Rudraksha with Trust Details */}
      {report.remedies?.rudrakshaRecommendations && report.remedies.rudrakshaRecommendations.length > 0 && (
        <ContentPage sectionName="Rudraksha Therapy">
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
                <Text style={styles.bodyText}>{rud.wearingInstructions}</Text>
                
                <Text style={styles.subSubHeader}>Scriptural Reference</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{rud.scripturalReference || ''}</Text>
                </View>
                
                <Text style={styles.subSubHeader}>Scientific Basis</Text>
                <Text style={styles.bodyText}>{rud.scientificBasis || ''}</Text>
                
                <Text style={styles.subSubHeader}>How to Verify Authenticity</Text>
                <Text style={styles.successText}>{rud.authenticity || ''}</Text>
              </Card>
            ))}
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Mantras with Trust Details */}
      {report.remedies?.mantras && report.remedies.mantras.length > 0 && (
        <ContentPage sectionName="Mantra Therapy">
          <Section title="Mantra Therapy (Mantra Shastra)">
            <Text style={styles.paragraph}>
              Mantras are sacred sound vibrations that connect the practitioner to cosmic energies. The science of Mantra Shastra explains how specific sound frequencies can influence planetary energies and transform consciousness.
            </Text>

            {report.remedies.mantras.map((mantra: any, idx: number) => (
              <Card key={idx} title={`${mantra.planet} Mantra`}>
                <Text style={[styles.boldLabel, { color: '#c2410c', marginBottom: 2 }]}>{mantra.mantra}</Text>
                
                <View style={styles.row}>
                  <InfoRow label="Japa Count" value={String(mantra.japaCount)} />
                </View>
                <InfoRow label="Timing" value={mantra.timing} />
                <InfoRow label="Pronunciation" value={mantra.pronunciation} />
                
                <Text style={styles.subSubHeader}>Benefits</Text>
                <Text style={styles.paragraph}>{mantra.benefits}</Text>
                
                <Text style={styles.subSubHeader}>Scriptural Source</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{mantra.scripturalSource || ''}</Text>
                </View>
                
                <Text style={styles.subSubHeader}>Vibrational Science</Text>
                <Text style={styles.bodyText}>{mantra.vibrationalScience || ''}</Text>
                
                <Text style={styles.subSubHeader}>Proper Method</Text>
                <Text style={styles.bodyText}>{mantra.properMethod || ''}</Text>
              </Card>
            ))}
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Yantras and Pujas */}
      {report.remedies && (
        <ContentPage sectionName="Yantras & Pujas">
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
                    <Text style={styles.bodyText}>{yantra.geometricSignificance || ''}</Text>
                    
                    <Text style={styles.subSubHeader}>Consecration Method</Text>
                    <Text style={styles.bodyText}>{yantra.consecrationMethod || ''}</Text>
                    
                    <Text style={styles.scriptural}>{yantra.scripturalReference || ''}</Text>
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
                    <Text style={styles.scriptural}>{puja.scripturalBasis || ''}</Text>
                    
                    <Text style={styles.subSubHeader}>Procedure</Text>
                    <Text style={styles.bodyText}>{puja.procedure || ''}</Text>
                  </Card>
                ))}
              </SubSection>
            )}
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Ishta Devata and Spiritual Practices */}
      {report.remedies && (
        <ContentPage sectionName="Ishta Devata & Spiritual Practices">
          <Section title="Ishta Devata & Spiritual Practices">
            <SubSection title="Your Ishta Devata (Personal Deity)">
              <Card title={report.remedies.ishtaDevata?.deity || 'N/A'}>
                <Text style={styles.paragraph}>{report.remedies.ishtaDevata?.reason || ''}</Text>
                
                <InfoRow label="Worship Method" value={report.remedies.ishtaDevata?.worship || 'N/A'} />
                <InfoRow label="Mantra" value={report.remedies.ishtaDevata?.mantra || 'N/A'} />
                <InfoRow label="Temple Visit" value={report.remedies.ishtaDevata?.templeVisit || 'N/A'} />
                
                <Text style={styles.subSubHeader}>Scriptural Derivation</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{report.remedies.ishtaDevata?.scripturalDerivation || ''}</Text>
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
                  <Text style={styles.scriptural}>{fast.scripturalReference || ''}</Text>
                  
                  <Text style={styles.subSubHeader}>Physiological Benefits</Text>
                  <Text style={styles.bodyText}>{fast.physiologicalBenefits || ''}</Text>
                </Card>
              ))}
            </SubSection>

            <SubSection title="Donations (Daan)">
              {(report.remedies.donations || []).map((don: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 5 }}>
                  <Text style={styles.boldLabel}>{don.day} - {don.item}</Text>
                  <Text style={styles.bodyText}>Planet: {don.planet} | {don.reason}</Text>
                  <Text style={styles.scriptural}>{don.scripturalReference || ''}</Text>
                  <Text style={styles.successText}>{don.karmaScience || ''}</Text>
                </View>
              ))}
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Lifestyle Guidance */}
      {report.remedies && (
        <ContentPage sectionName="Lifestyle Remedies">
          <Section title="Lifestyle Remedies & Guidance">
            <SubSection title="Color Therapy">
              <InfoRow label="Favorable Colors" value={(report.remedies.colorTherapy?.favorable || []).join(', ')} />
              <InfoRow label="Colors to Avoid" value={(report.remedies.colorTherapy?.avoid || []).join(', ')} />
              <Text style={styles.paragraph}>{report.remedies.colorTherapy?.explanation || ''}</Text>
              
              <Text style={styles.subSubHeader}>Scientific Basis</Text>
              <Text style={styles.bodyText}>{report.remedies.colorTherapy?.scientificBasis || ''}</Text>
            </SubSection>

            <SubSection title="Direction Guidance (Vastu)">
              <InfoRow label="Favorable Directions" value={(report.remedies.directionGuidance?.favorable || []).join(', ')} />
              <InfoRow label="Directions to Avoid" value={(report.remedies.directionGuidance?.avoid || []).join(', ')} />
              <InfoRow label="Sleep Direction" value={report.remedies.directionGuidance?.sleepDirection || 'N/A'} />
              <InfoRow label="Work Direction" value={report.remedies.directionGuidance?.workDirection || 'N/A'} />
              
              <Text style={styles.subSubHeader}>Vastu Explanation</Text>
              <Text style={styles.bodyText}>{report.remedies.directionGuidance?.vastuExplanation || ''}</Text>
            </SubSection>

            <SubSection title="Daily Routine Recommendations">
              <BulletList items={report.remedies.dailyRoutine || []} />
            </SubSection>

            <SubSection title="Daily Spiritual Practices">
              <BulletList items={report.remedies.spiritualPractices || []} />
            </SubSection>

            <SubSection title="General Advice">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{report.remedies.generalAdvice || ''}</Text>
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
        </ContentPage>
      )}

      {/* Chara Karakas (Jaimini) - Detailed Analysis */}
      {report.charaKarakasDetailed && (
        <>
          <ContentPage sectionName="Chara Karakas (Jaimini)">
            <Section title="Chara Karakas - Jaimini Astrology">
              <Text style={styles.paragraph}>{report.charaKarakasDetailed.overview || ''}</Text>
              
              <SubSection title="Understanding the Jaimini System">
                <Text style={styles.paragraph}>{report.charaKarakasDetailed.jaiminiSystemExplanation || ''}</Text>
              </SubSection>

              <SubSection title="Your Chara Karakas">
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>Karaka</Text>
                    <Text style={styles.tableHeaderCell}>Planet</Text>
                    <Text style={styles.tableHeaderCell}>Sign</Text>
                    <Text style={styles.tableHeaderCell}>House</Text>
                    <Text style={styles.tableHeaderCell}>Signification</Text>
                  </View>
                  {(report.charaKarakasDetailed.karakaInterpretations || []).map((k: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{k.karaka}</Text>
                      <Text style={styles.tableCell}>{k.planet}</Text>
                      <Text style={styles.tableCell}>{k.sign}</Text>
                      <Text style={styles.tableCell}>{k.house}</Text>
                      <Text style={styles.tableCell}>{k.signification}</Text>
                    </View>
                  ))}
                </View>
              </SubSection>
            </Section>
          </ContentPage>

          {/* Atmakaraka Special Analysis */}
          {report.charaKarakasDetailed.atmakarakaSpecial && (
            <ContentPage sectionName="Atmakaraka Analysis">
              <Section title={`Atmakaraka: ${report.charaKarakasDetailed.atmakarakaSpecial.planet} - Soul Significator`}>
                <View style={styles.card}>
                  <Text style={[styles.boldLabel, { color: '#c2410c', marginBottom: 4 }]}>
                    The Atmakaraka is the most important planet in Jaimini astrology, representing your soul's purpose.
                  </Text>
                </View>

                <SubSection title="Soul Purpose">
                  <Text style={styles.paragraph}>{report.charaKarakasDetailed.atmakarakaSpecial.soulPurpose || ''}</Text>
                </SubSection>

                <SubSection title="Spiritual Lesson">
                  <View style={styles.highlight}>
                    <Text style={styles.bodyText}>{report.charaKarakasDetailed.atmakarakaSpecial.spiritualLesson || ''}</Text>
                  </View>
                </SubSection>

                <SubSection title={`Karakamsa: ${report.charaKarakasDetailed.atmakarakaSpecial.karakamsaSign || ''}`}>
                  <Text style={styles.paragraph}>{report.charaKarakasDetailed.atmakarakaSpecial.karakamsaInterpretation || ''}</Text>
                </SubSection>
              </Section>

              {/* Darakaraka Special Analysis */}
              {report.charaKarakasDetailed.darakarakaSpecial && (
                <Section title={`Darakaraka: ${report.charaKarakasDetailed.darakarakaSpecial.planet} - Spouse Significator`}>
                  <SubSection title="Spouse Characteristics">
                    <Text style={styles.paragraph}>{report.charaKarakasDetailed.darakarakaSpecial.spouseCharacteristics || ''}</Text>
                  </SubSection>

                  <SubSection title="Marriage Indications">
                    <Text style={styles.paragraph}>{report.charaKarakasDetailed.darakarakaSpecial.marriageIndications || ''}</Text>
                  </SubSection>

                  {report.charaKarakasDetailed.darakarakaSpecial.partnerQualities && (
                    <SubSection title="Partner Qualities">
                      <BulletList items={report.charaKarakasDetailed.darakarakaSpecial.partnerQualities} />
                    </SubSection>
                  )}
                </Section>
              )}
            </ContentPage>
          )}

          {/* Amatyakaraka and Karaka Details */}
          <ContentPage sectionName="Amatyakaraka Analysis">
            {report.charaKarakasDetailed.amatyakarakaSpecial && (
              <Section title={`Amatyakaraka: ${report.charaKarakasDetailed.amatyakarakaSpecial.planet} - Career Significator`}>
                <SubSection title="Career Direction">
                  <Text style={styles.paragraph}>{report.charaKarakasDetailed.amatyakarakaSpecial.careerDirection || ''}</Text>
                </SubSection>

                {report.charaKarakasDetailed.amatyakarakaSpecial.professionalStrengths && (
                  <SubSection title="Professional Strengths">
                    <BulletList items={report.charaKarakasDetailed.amatyakarakaSpecial.professionalStrengths} />
                  </SubSection>
                )}

                {report.charaKarakasDetailed.amatyakarakaSpecial.suitableProfessions && (
                  <SubSection title="Suitable Professions">
                    <BulletList items={report.charaKarakasDetailed.amatyakarakaSpecial.suitableProfessions} />
                  </SubSection>
                )}
              </Section>
            )}

            {report.charaKarakasDetailed.karakaInteractions && report.charaKarakasDetailed.karakaInteractions.length > 0 && (
              <Section title="Karaka Interactions">
                {report.charaKarakasDetailed.karakaInteractions.map((interaction: any, idx: number) => (
                  <Card key={idx} title={interaction.karakas?.join(' + ') || ''}>
                    <Text style={styles.paragraph}>{interaction.interaction}</Text>
                    <View style={styles.highlight}>
                      <Text style={styles.bodyText}>Effect: {interaction.effect}</Text>
                    </View>
                  </Card>
                ))}
              </Section>
            )}

            <SubSection title="Scriptural References">
              <View style={styles.card}>
                <Text style={styles.scriptural}>{report.charaKarakasDetailed.scripturalReferences || ''}</Text>
              </View>
            </SubSection>

            {report.charaKarakasDetailed.recommendations && (
              <SubSection title="Recommendations">
                <BulletList items={report.charaKarakasDetailed.recommendations} />
              </SubSection>
            )}
          </ContentPage>

          {/* Detailed Karaka Interpretations */}
          {(report.charaKarakasDetailed.karakaInterpretations || []).map((karaka: any, idx: number) => (
            <ContentPage key={`karaka-${idx}`} sectionName={`${karaka.karaka}`}>
              <Section title={`${karaka.karaka}: ${karaka.planet} in ${karaka.sign}`}>
                <View style={styles.card}>
                  <InfoRow label="House" value={String(karaka.house)} />
                  <InfoRow label="Degree" value={`${karaka.degree?.toFixed(2) || 0}°`} />
                  <InfoRow label="Signification" value={karaka.signification || ''} />
                </View>

                <SubSection title="Detailed Interpretation">
                  <Text style={styles.paragraph}>{karaka.detailedInterpretation || ''}</Text>
                </SubSection>

                <SubSection title="Life Impact">
                  <Text style={styles.paragraph}>{karaka.lifeImpact || ''}</Text>
                </SubSection>

                <View style={styles.grid2}>
                  {karaka.strengths && karaka.strengths.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>Strengths</Text>
                      <BulletList items={karaka.strengths} />
                    </View>
                  )}
                  {karaka.challenges && karaka.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>Challenges</Text>
                      <BulletList items={karaka.challenges} />
                    </View>
                  )}
                </View>

                {karaka.remedies && karaka.remedies.length > 0 && (
                  <SubSection title="Remedies">
                    <BulletList items={karaka.remedies} />
                  </SubSection>
                )}

                {karaka.timing && (
                  <SubSection title="Timing">
                    <Text style={styles.paragraph}>{karaka.timing}</Text>
                  </SubSection>
                )}
              </Section>
            </ContentPage>
          ))}
        </>
      )}

      {/* Glossary of Astrological Terms */}
      {report.glossary && (
        <>
          <ContentPage sectionName="Glossary">
            <Section title="Glossary of Vedic Astrology Terms">
              <Text style={styles.paragraph}>{report.glossary.introduction || ''}</Text>

              <SubSection title="Quick Reference">
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>Term</Text>
                    <Text style={styles.tableHeaderCell}>Definition</Text>
                  </View>
                  {(report.glossary.quickReference || []).slice(0, 15).map((term: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{term.term}</Text>
                      <Text style={styles.tableCell}>{term.briefDefinition}</Text>
                    </View>
                  ))}
                </View>
              </SubSection>
            </Section>
          </ContentPage>

          {/* Glossary Sections */}
          {(report.glossary.sections || []).map((section: any, sIdx: number) => (
            <ContentPage key={`glossary-${sIdx}`} sectionName="Glossary">
              <Section title={section.category}>
                <Text style={styles.paragraph}>{section.categoryDescription || ''}</Text>

                {(section.terms || []).map((term: any, tIdx: number) => (
                  <Card key={tIdx} title={`${term.term}${term.termSanskrit ? ' (' + sanitizeText(term.termSanskrit) + ')' : ''}`}>
                    <Text style={[styles.scriptural, { marginBottom: 4 }]}>Pronunciation: {term.pronunciation}</Text>
                    
                    <Text style={[styles.boldLabel, { marginBottom: 3 }]}>{term.definition}</Text>
                    
                    <Text style={styles.paragraph}>{term.detailedExplanation}</Text>
                    
                    {term.example && (
                      <View style={styles.highlight}>
                        <Text style={styles.bodyText}>Example: {term.example}</Text>
                      </View>
                    )}
                    
                    {term.relatedTerms && term.relatedTerms.length > 0 && (
                      <Text style={styles.accentText}>Related: {term.relatedTerms.join(', ')}</Text>
                    )}
                  </Card>
                ))}
              </Section>
            </ContentPage>
          ))}

          {/* Further Reading */}
          {report.glossary.furtherReading && report.glossary.furtherReading.length > 0 && (
            <ContentPage sectionName="Further Reading">
              <Section title="Recommended Reading & Classical Texts">
                <Text style={styles.paragraph}>
                  For deeper understanding of Vedic astrology, the following classical texts and resources are recommended:
                </Text>
                <BulletList items={report.glossary.furtherReading} />
              </Section>
            </ContentPage>
          )}
        </>
      )}

      {/* Final Page */}
      <ContentPage sectionName="Report Summary">
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
            <Text style={{ fontSize: 14, color: '#c2410c', fontWeight: 'bold' }}>May the stars guide your path</Text>
            <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 10 }}>
              For personalized puja recommendations and remedies, consult with Sri Mandir experts.
            </Text>
          </View>
        </Section>
      </ContentPage>
    </Document>
  );
};

export default KundliPDFDocument;
