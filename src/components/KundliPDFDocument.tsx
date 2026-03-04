import { Document, Page, Text, View, StyleSheet, Svg, Path, G, Rect, Circle, Line, Polygon, Ellipse, Defs, ClipPath, LinearGradient, RadialGradient, Stop, Image } from '@react-pdf/renderer';
import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */

// ── PDF module imports ──────────────────────────────────────────────────────
import '@/lib/pdf/fontSetup';
import {
  P, SRIMANDIR_ORANGE, BRAND_HEADER_DARK, SRI_MANDIR_LOGO_URI,
  SIGN_TO_INDEX, SIGN_SHORT, SIGN_LORDS,
  NAKSHATRA_SPAN, NAKSHATRA_PADA_SPAN, NAKSHATRAS,
  DASHA_ORDER, DASHA_YEARS, CHART_LABEL_MAP, SATURN_TRANSIT_FALLBACK_SIGN, SIGNS,
  sanitizeText, normalizeChartLabel,
  getActivePdfLanguage, getActivePdfFontFamily,
  getActivePdfBodyFontSize, getActivePdfBodyLineHeight,
  applyLanguageTypography, localizePdfUiText,
  formatBirthDate, formatDate, formatMonthYear, formatCoordinate, getWeekday,
  normalizeSadeSatiPhase, computeSadeSatiPhaseFromSigns,
  phaseLabel, isSadeSatiDoshaName, parseYearLike, addMonthsUtc,
  translitPlace, parsePlaceDetails,
  MONTH_NAMES_BY_LANGUAGE, DISCLAIMER_CONTENT, GUIDANCE_CONTENT,
  wrapIndicSync,
} from '@/lib/pdf';
import type { PdfLanguage, ChartData, KundliPDFProps, SadeSatiPhaseKey } from '@/lib/pdf';

// Sri Mandir logo (200×200 PNG, base64-encoded for reliable @react-pdf/renderer rendering)




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
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 841.89,
    fontFamily: 'DejaVuSans',
    backgroundColor: '#5c1d0c',
  },
  coverBackgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
    fontSize: 54,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  coverSubtitle: {
    fontSize: 13,
    color: '#fbbf24',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.9,
  },
  coverName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff7ed',
    marginBottom: 10,
    textAlign: 'center',
  },
  coverDetails: {
    fontSize: 10.2,
    color: '#fde68a',
    textAlign: 'center',
    marginBottom: 5,
  },
  coverKicker: {
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  coverMark: {
    fontSize: 46,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  coverMetaLabel: {
    fontSize: 8.4,
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  coverFooterMeta: {
    fontSize: 11,
    color: '#fff7ed',
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  coverFooterBrand: {
    fontSize: 10.5,
    color: '#fde68a',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  coverBrandRow: {
    marginTop: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBrandLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  coverBrandText: {
    fontSize: 24,
    color: '#f3f4f6',
    fontWeight: 'bold',
  },
  coverDividerRow: {
    marginTop: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverDividerLine: {
    width: 145,
    height: 1,
    backgroundColor: '#fbbf24',
    opacity: 0.7,
  },
  coverDividerCenter: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coverIdentityCard: {
    marginTop: 12,
    width: 430,
    backgroundColor: 'rgba(92, 29, 12, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.50)',
    borderRadius: 14,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 18,
  },
  coverInfoBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  coverInfoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  coverInfoLabel: {
    fontSize: 8.4,
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginRight: 8,
  },
  coverInfoValue: {
    fontSize: 10.2,
    color: '#fde68a',
  },
  coverFooterWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 9,
    paddingBottom: 6,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
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
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
    borderBottomWidth: 1,
    borderBottomColor: P.goldLight,
  },
  subSubHeader: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: P.primary,
    marginTop: 7,
    marginBottom: 4,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
  },
  paragraph: {
    fontSize: 10.2,
    marginBottom: 5,
    textAlign: 'left',
    color: P.bodyText,
    lineHeight: 1.45,
    // Indic script glyphs (Devanagari, Kannada, Telugu) have matras & conjuncts
    // that extend BEYOND the glyph origin (negative side bearings).
    // Without this buffer the edge pixels get clipped at the Text element boundary.
    // Must be on BOTH sides — left matras overhang left, right vowels overhang right.
    paddingHorizontal: 6,
  },
  // Body text — same as paragraph but no margin/justify (for inside cards, highlights, callouts)
  bodyText: {
    fontSize: 10.2,
    color: P.bodyText,
    lineHeight: 1.45,
    paddingHorizontal: 6,  // glyph-overhang buffer (see paragraph comment)
  },
  // Small italic muted text — for scriptural refs, disclaimers, cautions
  scriptural: {
    fontSize: 9.5,
    fontStyle: 'normal',
    color: '#6b7280',
    marginTop: 3,
    lineHeight: 1.4,
    paddingHorizontal: 5,  // Indic glyph-overhang buffer
  },
  // Bold label inside highlight/card
  boldLabel: {
    fontWeight: 'bold',
    fontSize: 10.5,
    color: P.bodyText,
    lineHeight: 1.45,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
  },
  // Accent text (orange, for emphasis)
  accentText: {
    fontSize: 10.5,
    color: '#ea580c',
    lineHeight: 1.45,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
  },
  // Caution/warning text
  cautionText: {
    fontSize: 10,
    color: '#dc2626',
    lineHeight: 1.45,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
  },
  // Success/positive text
  successText: {
    fontSize: 10,
    color: '#059669',
    lineHeight: 1.45,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
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
    paddingHorizontal: 8,  // extra for Indic glyph-overhang
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 8,  // extra for Indic glyph-overhang
    color: P.bodyText,
  },
  advancedTable: {
    width: '100%',
    marginTop: 6,
    borderWidth: 1,
    borderColor: P.lightBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  advancedTableHeader: {
    flexDirection: 'row',
    backgroundColor: P.primary,
    paddingVertical: 5,
  },
  advancedTableHeaderCell: {
    fontSize: 8.2,
    color: P.white,
    fontWeight: 'bold',
    paddingHorizontal: 5,  // extra for Indic glyph-overhang
    textAlign: 'center',
  },
  advancedTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    paddingVertical: 4,
  },
  advancedTableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    paddingVertical: 4,
    backgroundColor: P.tableAlt,
  },
  advancedCellText: {
    fontSize: 7.6,
    lineHeight: 1.2,
    color: P.bodyText,
    textAlign: 'center',
    paddingHorizontal: 5,  // extra for Indic glyph-overhang
  },
  tinyNote: {
    fontSize: 8.2,
    color: P.mutedText,
    marginTop: 4,
    lineHeight: 1.35,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
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
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
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
    paddingHorizontal: 3,  // Indic glyph-overhang buffer
  },
  value: {
    flex: 1,
    color: P.bodyText,
    fontSize: 10,
    paddingHorizontal: 3,  // Indic glyph-overhang buffer
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
  stableTwoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stableCol: {
    width: '48%',
  },
  section: {
    marginBottom: 10,
  },
  chartContainer: {
    width: 240,
    height: 240,
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.lightBorder,
    borderRadius: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartItem: {
    width: '48%',
    marginBottom: 14,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
  },
  chartPurpose: {
    fontSize: 8,
    color: P.mutedText,
    textAlign: 'center',
    marginTop: 3,
    width: '100%',
    maxLines: 2,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
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
    paddingRight: 4,  // Indic glyph-overhang buffer
  },
  tocSubtitle: {
    fontSize: 8.8,
    color: P.mutedText,
    marginLeft: 26,
    marginTop: -2,
    marginBottom: 3,
    paddingRight: 4,  // Indic glyph-overhang buffer
  },
  tocColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tocColumn: {
    width: '48%',
  },
  tocEntryCompact: {
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
  },
  tocEntryCompactTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tocNumberCompact: {
    width: 22,
    fontSize: 9.8,
    color: P.gold,
    fontWeight: 'bold',
  },
  tocTitleCompact: {
    flex: 1,
    fontSize: 9.6,
    color: P.bodyText,
    fontWeight: 'bold',
    lineHeight: 1.2,
    paddingRight: 4,  // Indic glyph-overhang buffer
  },
  tocSubtitleCompact: {
    fontSize: 7.6,
    color: P.mutedText,
    marginLeft: 22,
    marginTop: 1,
    lineHeight: 1.25,
    paddingRight: 4,  // Indic glyph-overhang buffer
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
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
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
    fontStyle: 'normal',
    marginBottom: 7,
    paddingHorizontal: 4,  // Indic glyph-overhang buffer
  },
  // ── Section intro italic ────────────────────────────────────
  sectionIntro: {
    fontSize: 10.5,
    marginBottom: 6,
    fontStyle: 'normal',
    color: P.mutedText,
    lineHeight: 1.45,
    borderLeftWidth: 3,
    borderLeftColor: P.gold,
    paddingLeft: 10,
    paddingRight: 6,  // Indic glyph-overhang buffer on right side
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
    paddingHorizontal: 8,  // Indic glyph-overhang buffer
  },
  dividerSubtitle: {
    fontSize: 11.2,
    color: '#fff7ed',
    textAlign: 'center',
    lineHeight: 1.4,
    opacity: 0.9,
    paddingHorizontal: 6,  // Indic glyph-overhang buffer
  },
  dividerFooter: {
    fontSize: 8.8,
    color: '#ffffff',
    opacity: 0.75,
    letterSpacing: 0.3,
  },
});

// Helper components
const Section = ({
  title,
  children,
  wrap = true,
  keepWithNext = 72,
}: {
  title: string;
  children: React.ReactNode;
  wrap?: boolean;
  keepWithNext?: number;
}) => (
  <View style={styles.section} wrap={wrap}>
    <Text style={styles.header} minPresenceAhead={keepWithNext}>{localizePdfUiText(title)}</Text>
    {children}
  </View>
);

const SubSection = ({
  title,
  children,
  keepWithNext = 56,
}: {
  title: string;
  children: React.ReactNode;
  keepWithNext?: number;
}) => (
  <View>
    <Text style={styles.subHeader} minPresenceAhead={keepWithNext}>{localizePdfUiText(title)}</Text>
    {children}
  </View>
);

// Professional info strip — replaces colorful pill badges
const InfoStrip = ({ items }: { items: { label: string; value: string }[] }) => (
  <View style={styles.infoStrip}>
    {items.map((item, idx) => (
      <View key={idx} style={[styles.infoStripItem, idx === items.length - 1 && { borderRightWidth: 0 }]}>
        <Text style={styles.infoStripLabel}>{localizePdfUiText(item.label).toUpperCase()}</Text>
        <Text style={styles.infoStripValue}>{localizePdfUiText(item.value)}</Text>
      </View>
    ))}
  </View>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={[styles.row, { marginBottom: 2 }]}>
    <Text style={styles.label}>{localizePdfUiText(label)}:</Text>
    <Text style={styles.value}>{localizePdfUiText(value)}</Text>
  </View>
);

const SriMandirFooter = () => (
  <View style={styles.sriMandirFooterBar} fixed>
    <Text style={styles.sriMandirBrandName}>{localizePdfUiText('SRI MANDIR')}</Text>
    <Text style={styles.sriMandirTagline}>
      {localizePdfUiText('Looking for detailed guidance on your birth chart? Speak to our expert astrologers today')}
    </Text>
    <Text style={styles.sriMandirContact}>
      {getActivePdfLanguage() === 'hi'
        ? 'कॉल या व्हाट्सऐप: 080 711 74417'
        : getActivePdfLanguage() === 'te'
          ? 'కాల్ లేదా వాట్సాప్: 080 711 74417'
          : getActivePdfLanguage() === 'kn'
            ? 'ಕರೆ ಮಾಡಿ ಅಥವಾ ವಾಟ್ಸ್‌ಆ್ಯಪ್: 080 711 74417'
            : getActivePdfLanguage() === 'mr'
              ? 'कॉल किंवा व्हॉट्सॲप: 080 711 74417'
              : getActivePdfLanguage() === 'ta'
                ? 'அழைக்கவும் அல்லது வாட்ஸ்அப்: 080 711 74417'
                : 'Call or WhatsApp: 080 711 74417'}
    </Text>
  </View>
);

// Page wrapper (legacy - kept for cover page compatibility)
const PageWrapper = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Page
    size="A4"
    style={[
      styles.page,
      { fontFamily: getActivePdfFontFamily(), fontSize: getActivePdfBodyFontSize(), lineHeight: getActivePdfBodyLineHeight() },
      style,
    ]}
  >
    <View style={styles.pageWhitePanel} fixed />
    {children}
    <SriMandirFooter />
  </Page>
);

const ContentPage = ({ sectionName, children, pageKey }: { sectionName?: string; children: React.ReactNode; pageKey?: string | number }) => (
  <Page
    size="A4"
    style={[styles.page, { fontFamily: getActivePdfFontFamily(), fontSize: getActivePdfBodyFontSize(), lineHeight: getActivePdfBodyLineHeight() }]}
    key={pageKey}
  >
    {/* Fixed elements use absolute positioning — they ignore page padding and repeat on every page */}
    <View style={styles.pageWhitePanel} fixed />
    <View style={styles.fixedHeader} fixed>
      <Text style={styles.fixedHeaderTitle}>{localizePdfUiText('Sri Mandir Kundli Report')}</Text>
      {sectionName && <Text style={styles.fixedHeaderSection}>{localizePdfUiText(sectionName)}</Text>}
    </View>
    <SriMandirFooter />
    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    {/* Children flow inside the Page's padding — this is respected on ALL pages including continuations */}
    {children}
  </Page>
);

const SectionDividerPage = ({ partNumber, title, subtitle }: { partNumber: string; title: string; subtitle: string }) => (
  <Page size="A4" style={[styles.dividerPage, { fontFamily: getActivePdfFontFamily() }]}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 }}>
      <Text style={styles.dividerKicker}>{localizePdfUiText(`PART ${partNumber}`)}</Text>
      <View style={{ width: 60, height: 2, backgroundColor: '#ffffff', marginBottom: 24, opacity: 0.6 }} />
      <Text style={styles.dividerTitle}>{localizePdfUiText(title)}</Text>
      <Text style={styles.dividerSubtitle}>{localizePdfUiText(subtitle)}</Text>
    </View>
    <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
      <Text style={styles.dividerFooter}>
        {getActivePdfLanguage() === 'hi' || getActivePdfLanguage() === 'mr'
          ? 'श्री मंदिर — धर्म, कर्म, ज्योतिष'
          : getActivePdfLanguage() === 'te'
            ? 'శ్రీ మందిర్ — ధర్మ, కర్మ, జ్యోతిష్యం'
            : getActivePdfLanguage() === 'kn'
              ? 'ಶ್ರೀ ಮಂದಿರ — ಧರ್ಮ, ಕರ್ಮ, ಜ್ಯೋತಿಷ'
              : getActivePdfLanguage() === 'ta'
                ? 'ஸ்ரீ மந்திர் — தர்மம், கர்மா, ஜோதிடம்'
                : 'Sri Mandir — Dharma, Karma, Jyotish'}
      </Text>
    </View>
  </Page>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{localizePdfUiText(title)}</Text>
    {children}
  </View>
);

const BulletList = ({ items, maxWidth }: { items: string[]; maxWidth?: number }) => (
  <View style={styles.list}>
    {items
      .map((item) => String(item ?? '').trim())
      .filter((item) => item.length > 0)
      .map((item, idx) => (
        <View key={idx} style={{ flexDirection: 'row', marginBottom: 3, alignItems: 'flex-start' }} wrap={false}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.bodyText, { flex: 1 }]}>{localizePdfUiText(item, maxWidth)}</Text>
        </View>
      ))}
  </View>
);

// SVG Parser - converts SVG string to react-pdf components
const normalizeSvgCoordinate = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;
  const firstToken = text.split(/[,\s]+/).find(Boolean);
  if (!firstToken) return undefined;
  const parsed = Number(firstToken);
  return Number.isFinite(parsed) ? parsed : undefined;
};

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
    const textContent = normalizeChartLabel(element.textContent);
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
    case 'text': {
      attrs.fontFamily = getActivePdfFontFamily();
      const safeX = normalizeSvgCoordinate(attrs.x);
      const safeY = normalizeSvgCoordinate(attrs.y);
      if (safeX !== undefined) attrs.x = safeX; else delete attrs.x;
      if (safeY !== undefined) attrs.y = safeY; else delete attrs.y;
      delete attrs.xCoordinate;
      delete attrs.yCoordinate;
      return <Text key={key} {...(attrs as any)}>{children}</Text>;
    }
    case 'tspan': {
      const tspanText = normalizeChartLabel(element.textContent || '');
      return tspanText || null;
    }
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

const SVGRenderer = ({ svgString, width = 232, height = 232 }: { svgString: string; width?: number; height?: number }) => {
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
export const KundliPDFDocument = ({ report, language }: KundliPDFProps) => {
  // Use explicit language prop if provided, otherwise fall back to report.language
  applyLanguageTypography(language || report?.language);

  // ── Dynamic font-size overrides for Indic languages ──────────────────────
  // StyleSheet.create() is static (module-level). For non-English we need larger
  // body text so the PDF rendering matches the Canvas measurement font size.
  // English keeps the original 10.2 pt; Indic languages use getActivePdfBodyFontSize() (11.2 pt).
  if (getActivePdfLanguage() !== 'en') {
    (styles as Record<string, Record<string, unknown>>).paragraph.fontSize = getActivePdfBodyFontSize();
    (styles as Record<string, Record<string, unknown>>).paragraph.lineHeight = getActivePdfBodyLineHeight();
    (styles as Record<string, Record<string, unknown>>).bodyText.fontSize = getActivePdfBodyFontSize();
    (styles as Record<string, Record<string, unknown>>).bodyText.lineHeight = getActivePdfBodyLineHeight();
    (styles as Record<string, Record<string, unknown>>).scriptural.fontSize = 10.2;
    (styles as Record<string, Record<string, unknown>>).scriptural.lineHeight = 1.5;
  } else {
    // Reset to English defaults in case a previous Indic render mutated them
    (styles as Record<string, Record<string, unknown>>).paragraph.fontSize = 10.2;
    (styles as Record<string, Record<string, unknown>>).paragraph.lineHeight = 1.45;
    (styles as Record<string, Record<string, unknown>>).bodyText.fontSize = 10.2;
    (styles as Record<string, Record<string, unknown>>).bodyText.lineHeight = 1.45;
    (styles as Record<string, Record<string, unknown>>).scriptural.fontSize = 9.5;
    (styles as Record<string, Record<string, unknown>>).scriptural.lineHeight = 1.4;
  }

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

  const formatUtcOffset = (offsetHours: number): string => {
    const sign = offsetHours >= 0 ? '+' : '-';
    const abs = Math.abs(offsetHours);
    const hh = Math.floor(abs);
    const mm = Math.round((abs - hh) * 60);
    return `UTC${sign}${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };


  /** Convert absolute sidereal degree (0-360) to degree within sign (0-30) */
  const degreeWithinSign = (deg: number): number => ((deg % 30) + 30) % 30;

  const formatDegreeInSign = (sign: unknown, degree: unknown): string => {
    const signText = String(sign || '').trim();
    const deg = Number(degree);
    if (!signText || !Number.isFinite(deg)) return 'N/A';
    return `${localizePdfUiText(signText)} (${degreeWithinSign(deg).toFixed(2)}°)`;
  };

  // Place-name transliteration now in lib/pdf/placeUtils.ts

  const normalizeDegree360 = (degree: number): number => {
    const normalized = degree % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  };

  const formatDmsFromSignDegree = (degreeInSign: number): string => {
    const d = Math.max(0, degreeInSign);
    const deg = Math.floor(d);
    const minutesRaw = (d - deg) * 60;
    const min = Math.floor(minutesRaw);
    const sec = Math.floor((minutesRaw - min) * 60);
    return `${String(deg).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const getNakshatraMeta = (degree: number) => {
    const normalized = normalizeDegree360(degree);
    const index = Math.floor(normalized / NAKSHATRA_SPAN);
    const nakshatra = NAKSHATRAS[Math.max(0, Math.min(26, index))];
    const degreeInNakshatra = normalized % NAKSHATRA_SPAN;
    const pada = Math.floor(degreeInNakshatra / NAKSHATRA_PADA_SPAN) + 1;
    return {
      name: nakshatra?.name || 'N/A',
      lord: nakshatra?.lord || 'N/A',
      number: index + 1,
      pada: Math.max(1, Math.min(4, pada)),
      degreeInNakshatra,
    };
  };

  const getKpSubLord = (nakshatraLord: string, degreeInNakshatra: number): string => {
    const startIdx = DASHA_ORDER.indexOf(nakshatraLord);
    if (startIdx < 0) return 'N/A';

    const totalSpan = NAKSHATRA_SPAN;
    let accumulated = 0;
    for (let i = 0; i < 9; i++) {
      const lord = DASHA_ORDER[(startIdx + i) % 9];
      const part = (DASHA_YEARS[lord] / 120) * totalSpan;
      accumulated += part;
      if (degreeInNakshatra <= accumulated + 1e-9) return lord;
    }
    return DASHA_ORDER[(startIdx + 8) % 9];
  };

  const getCombustFlag = (planetName: string, planetDegree: number, sunDegree: number): boolean => {
    const thresholds: Record<string, number> = {
      Moon: 12,
      Mars: 17,
      Mercury: 14,
      Jupiter: 11,
      Venus: 10,
      Saturn: 15,
    };
    const threshold = thresholds[planetName];
    if (!threshold) return false;
    const delta = Math.abs(((planetDegree - sunDegree + 540) % 360) - 180);
    return delta <= threshold;
  };

  const getDignityLabel = (planetName: string, signIdx: number): string => {
    const exaltation: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 7 };
    const debilitation: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 7, Ketu: 1 };
    const ownSigns: Record<string, number[]> = {
      Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10], Rahu: [10], Ketu: [7],
    };
    const friends: Record<string, string[]> = {
      Sun: ['Moon', 'Mars', 'Jupiter'],
      Moon: ['Sun', 'Mercury'],
      Mars: ['Sun', 'Moon', 'Jupiter'],
      Mercury: ['Sun', 'Venus'],
      Jupiter: ['Sun', 'Moon', 'Mars'],
      Venus: ['Mercury', 'Saturn'],
      Saturn: ['Mercury', 'Venus'],
      Rahu: ['Mercury', 'Venus', 'Saturn'],
      Ketu: ['Mars', 'Venus', 'Saturn'],
    };
    const enemies: Record<string, string[]> = {
      Sun: ['Saturn', 'Venus'],
      Moon: [],
      Mars: ['Mercury'],
      Mercury: ['Moon'],
      Jupiter: ['Mercury', 'Venus'],
      Venus: ['Sun', 'Moon'],
      Saturn: ['Sun', 'Moon', 'Mars'],
      Rahu: ['Sun', 'Moon', 'Mars'],
      Ketu: ['Sun', 'Moon'],
    };

    if (exaltation[planetName] === signIdx) return 'Exalted';
    if (debilitation[planetName] === signIdx) return 'Debilitated';
    if (ownSigns[planetName]?.includes(signIdx)) return 'Own';
    const signLord = SIGN_LORDS[signIdx] || '';
    if (friends[planetName]?.includes(signLord)) return 'Friendly';
    if (enemies[planetName]?.includes(signLord)) return 'Enemy';
    return 'Neutral';
  };

  const getVedicRoot = (raw: any) => {
    if (!raw) return null;
    if (raw?.vedic_horoscope) return raw;
    if (raw?.data?.vedic_horoscope) return raw.data;
    if (raw?.data?.data?.vedic_horoscope) return raw.data.data;
    return null;
  };

  const vedicRoot = getVedicRoot(report?.seerRawResponse);
  const rawPlanets = Array.isArray(vedicRoot?.vedic_horoscope?.planets_position)
    ? vedicRoot.vedic_horoscope.planets_position
    : [];
  const rawAstroDetails = vedicRoot?.vedic_horoscope?.astro_details || {};

  const resolveRawPlanet = (name: string) => {
    const nameMap: Record<string, string[]> = {
      Asc: ['लग्न', 'Asc'],
      Sun: ['सूर्य', 'Sun'],
      Moon: ['चन्द्र', 'Moon'],
      Mars: ['मंगल', 'Mars'],
      Mercury: ['बुध', 'Mercury'],
      Jupiter: ['गुरु', 'Jupiter'],
      Venus: ['शुक्र', 'Venus'],
      Saturn: ['शनि', 'Saturn'],
      Rahu: ['राहु', 'Rahu'],
      Ketu: ['केतु', 'Ketu'],
    };
    const aliases = nameMap[name] || [name];
    return rawPlanets.find((p: any) => aliases.includes(String(p?.name || '').trim()));
  };

  const resolveSpeed = (name: string): string => {
    const rawPlanet = resolveRawPlanet(name);
    if (!rawPlanet) return 'N/A';
    const candidates = [
      rawPlanet.speed,
      rawPlanet.planet_speed,
      rawPlanet.motion_speed,
      rawPlanet.gati,
      rawPlanet.daily_motion,
    ];
    const speedVal = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
    return speedVal ? String(speedVal) : 'N/A';
  };

  const pickAstroValue = (...keys: string[]): string => {
    for (const key of keys) {
      const value = rawAstroDetails?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
    }
    return 'N/A';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr || '');
    if (getActivePdfLanguage() === 'en') {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    }
    const months = MONTH_NAMES_BY_LANGUAGE[getActivePdfLanguage()] || MONTH_NAMES_BY_LANGUAGE.en;
    return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}\u200B`;
  };

  const normalizeDashaToken = (value: unknown, which: "first" | "last" = "first") => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const parts = raw.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return raw;
    return which === "first" ? parts[0] : parts[parts.length - 1];
  };

  const formatDashaPair = (mahadasha: unknown, antardasha: unknown) => {
    const md = normalizeDashaToken(mahadasha, 'first');
    const ad = normalizeDashaToken(antardasha, 'last');
    if (md && ad) return `${md}/${ad}`;
    return md || ad || 'N/A';
  };

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
  const birthDetails = report?.birthDetails || {};
  const placeDetails = parsePlaceDetails(birthDetails.placeOfBirth || '', birthDetails);
  const timezoneOffset = parseTimezoneOffset(birthDetails.timezone);
  const timezoneText = typeof birthDetails.timezone === 'string' && birthDetails.timezone.includes('/')
    ? `${birthDetails.timezone} (${formatUtcOffset(timezoneOffset)})`
    : formatUtcOffset(timezoneOffset);
  const genderRaw = String(birthDetails.gender || '').toUpperCase();
  const sex = genderRaw === 'F' || genderRaw === 'FEMALE'
    ? (getActivePdfLanguage() === 'hi' ? 'महिला' : getActivePdfLanguage() === 'te' ? 'స్త్రీ' : getActivePdfLanguage() === 'kn' ? 'ಮಹಿಳೆ' : getActivePdfLanguage() === 'mr' ? 'स्त्री' : getActivePdfLanguage() === 'ta' ? 'பெண்' : 'Female')
    : genderRaw === 'O' || genderRaw === 'OTHER'
      ? (getActivePdfLanguage() === 'hi' ? 'अन्य' : getActivePdfLanguage() === 'te' ? 'ఇతర' : getActivePdfLanguage() === 'kn' ? 'ಇತರ' : getActivePdfLanguage() === 'mr' ? 'इतर' : getActivePdfLanguage() === 'ta' ? 'பிற' : 'Other')
      : genderRaw === 'M' || genderRaw === 'MALE'
        ? (getActivePdfLanguage() === 'hi' ? 'पुरुष' : getActivePdfLanguage() === 'te' ? 'పురుషుడు' : getActivePdfLanguage() === 'kn' ? 'ಪುರುಷ' : getActivePdfLanguage() === 'mr' ? 'पुरुष' : getActivePdfLanguage() === 'ta' ? 'ஆண்' : 'Male')
        : (getActivePdfLanguage() === 'hi' ? 'उपलब्ध नहीं' : getActivePdfLanguage() === 'te' ? 'లభ్యం కాదు' : getActivePdfLanguage() === 'kn' ? 'ಲಭ್ಯವಿಲ್ಲ' : getActivePdfLanguage() === 'mr' ? 'उपलब्ध नाही' : getActivePdfLanguage() === 'ta' ? 'கிடைக்கவில்லை' : 'N/A');
  const birthDateValue = String(birthDetails.dateOfBirth || '');
  const sunPosition = report?.planetaryPositions?.find((planet: any) => planet?.name === 'Sun');
  const tithiName = report?.panchang?.tithi?.name || 'N/A';
  const tithiPaksha = report?.panchang?.tithi?.paksha || '';
  const nakshatraName = report?.panchang?.nakshatra?.name || 'N/A';
  const nakshatraPada = report?.panchang?.nakshatra?.pada;
  const yogaName = report?.panchang?.yoga?.name || 'N/A';
  const karanaName = report?.panchang?.karana?.name || 'N/A';
  const parsedBirthTime = parseBirthTime(birthDetails.timeOfBirth);
  const birthUtcDate = (() => {
    if (!birthDateValue || !parsedBirthTime) return null;
    const [y, m, d] = birthDateValue.split('-').map((x) => Number(x));
    if ([y, m, d].some((n) => Number.isNaN(n))) return null;
    const utcMs = Date.UTC(y, m - 1, d, parsedBirthTime.hour, parsedBirthTime.minute) - timezoneOffset * 60 * 60 * 1000;
    return new Date(utcMs);
  })();
  const lahiriAyanamsha = birthUtcDate
    ? (() => {
        const jd = birthUtcDate.getTime() / 86400000 + 2440587.5;
        const t = (jd - 2451545.0) / 36525;
        return 23.85 + 0.013848 * t * 100;
      })()
    : null;
  const ayanamshaText = pickAstroValue('ayanamsha', 'lahiri_ayanamsha') !== 'N/A'
    ? pickAstroValue('ayanamsha', 'lahiri_ayanamsha')
    : (lahiriAyanamsha ? `${lahiriAyanamsha.toFixed(4)}°` : 'N/A');

  const planetProfileMap = new Map(
    Array.isArray(report?.planets)
      ? report.planets.map((p: any) => [String(p?.planet || ''), p] as const)
      : []
  );
  const sunDegreeAbsolute = Number(sunPosition?.degree);
  const detailedPlanetRows = [
    {
      name: 'Asc',
      sign: report?.ascendant?.sign,
      house: 1,
      degree: Number(report?.ascendant?.degree),
      isRetro: false,
    },
    ...(Array.isArray(report?.planetaryPositions) ? report.planetaryPositions : []),
  ]
    .filter((p: any) => p?.name && Number.isFinite(Number(p?.degree)))
    .map((p: any) => {
      const name = String(p.name);
      const sign = String(p.sign || '');
      const signIdx = SIGN_TO_INDEX[sign];
      const degreeAbs = Number(p.degree);
      const degreeInSign = signIdx !== undefined ? normalizeDegree360(degreeAbs) - signIdx * 30 : degreeAbs % 30;
      const nak = getNakshatraMeta(degreeAbs);
      const profile: any = planetProfileMap.get(name);
      const isRetro = Boolean(p.isRetro || profile?.isRetrograde);
      const isCombust = Number.isFinite(sunDegreeAbsolute)
        ? getCombustFlag(name, degreeAbs, sunDegreeAbsolute)
        : false;
      const signLord = signIdx !== undefined ? SIGN_LORDS[signIdx] : 'N/A';
      const nakLord = profile?.nakshatraLord || nak.lord;
      const compactCellValue = (value: unknown): string => {
        const text = sanitizeText(String(value || ''));
        if (!text) return 'N/A';
        return text.split('(')[0].trim() || 'N/A';
      };
      return {
        name,
        signShort: SIGN_SHORT[sign] || sign || 'N/A',
        degreeText: formatDmsFromSignDegree(Math.max(0, degreeInSign)),
        speed: resolveSpeed(name),
        nakshatra: compactCellValue(profile?.nakshatra || nak.name),
        pada: nak.pada,
        nakNo: nak.number,
        rashiLord: signLord || 'N/A',
        nakLord: nakLord || 'N/A',
        subLord: getKpSubLord(nak.lord, nak.degreeInNakshatra),
        dignity: compactCellValue(profile?.dignity || (signIdx !== undefined ? getDignityLabel(name, signIdx) : 'N/A')),
        retro: isRetro ? 'R' : '',
        combust: isCombust ? 'C' : '',
      };
    });

  const moonPlanet = report?.planetaryPositions?.find((planet: any) => planet?.name === 'Moon');
  const sadeSatiMoonSign = String(report?.sadeSati?.moonSign || moonPlanet?.sign || 'N/A');
  const sadeSatiTransitSign = String(report?.sadeSati?.saturnSign || SATURN_TRANSIT_FALLBACK_SIGN);
  const sadeSatiPhaseFromSigns = computeSadeSatiPhaseFromSigns(sadeSatiMoonSign, sadeSatiTransitSign);
  const sadeSatiPhaseFromText = normalizeSadeSatiPhase(report?.sadeSati?.currentPhase || report?.sadeSati?.phase);
  const sadeSatiPhase = sadeSatiPhaseFromSigns !== 'not_active' || sadeSatiPhaseFromText === 'not_active'
    ? sadeSatiPhaseFromSigns
    : sadeSatiPhaseFromText;
  const sadeSatiIsActive = sadeSatiPhase !== 'not_active';
  const sadeSatiCurrentPhaseLabel = phaseLabel(sadeSatiPhase);

  const originalMajorDoshas = Array.isArray(report?.doshas?.majorDoshas) ? report.doshas.majorDoshas : [];
  const originalMinorDoshas = Array.isArray(report?.doshas?.minorDoshas) ? report.doshas.minorDoshas : [];
  const majorDoshasFiltered = originalMajorDoshas.filter((dosha: any) => !isSadeSatiDoshaName(dosha?.name, dosha?.nameHindi));
  const minorDoshasFiltered = originalMinorDoshas.filter((dosha: any) => !isSadeSatiDoshaName(dosha?.name, dosha?.nameHindi));
  const removedSadeSatiDoshaCount = (originalMajorDoshas.length - majorDoshasFiltered.length) + (originalMinorDoshas.length - minorDoshasFiltered.length);
  const doshaRemediesFiltered = Array.isArray(report?.doshas?.doshaRemedies)
    ? report.doshas.doshaRemedies.filter((r: any) => !isSadeSatiDoshaName(r?.doshaName))
    : [];
  const isDetectedDosha = (d: any) => {
    const status = String(d?.status || '').toLowerCase();
    return Boolean(d?.isPresent) || status === 'present' || status === 'partial' || status === 'nullified';
  };
  const doshaDisplayTotal = majorDoshasFiltered.filter(isDetectedDosha).length + minorDoshasFiltered.filter(isDetectedDosha).length;

  const generatedAtDate = report?.generatedAt ? new Date(report.generatedAt) : new Date();
  const fallbackSadeSatiStartYear = generatedAtDate.getFullYear() + (sadeSatiIsActive ? 0 : 1);
  const explicitSadeSatiStartYear =
    parseYearLike(report?.sadeSati?.startYear) ||
    parseYearLike(report?.sadeSati?.currentSadeSati?.period) ||
    parseYearLike(report?.sadeSati?.nextSadeSati?.approximateStart);
  const sadeSatiAnchorYear = explicitSadeSatiStartYear || fallbackSadeSatiStartYear;
  const sadeSatiPhasesForDisplay = (Array.isArray(report?.sadeSati?.phases) ? report.sadeSati.phases : []).map((phase: any, idx: number) => {
    const estimatedStart = addMonthsUtc(sadeSatiAnchorYear, 2, idx * 30); // March anchor, 30-month Saturn phase
    const estimatedEnd = addMonthsUtc(sadeSatiAnchorYear, 2, ((idx + 1) * 30) - 1);
    const startYear = parseYearLike(phase?.startYear) || estimatedStart.year;
    const endYear = parseYearLike(phase?.endYear) || estimatedEnd.year;
    const langMonths = MONTH_NAMES_BY_LANGUAGE[getActivePdfLanguage()] || MONTH_NAMES_BY_LANGUAGE.en;
    const startMonth = sanitizeText(String(phase?.startMonth || langMonths[estimatedStart.monthIndex] || langMonths[2]));
    const endMonth = sanitizeText(String(phase?.endMonth || langMonths[estimatedEnd.monthIndex] || langMonths[7]));
    return {
      ...phase,
      startYear,
      endYear,
      startMonth,
      endMonth,
      periodLabel: getActivePdfLanguage() === 'hi'
        ? `${startMonth} ${startYear} से ${endMonth} ${endYear}`
        : getActivePdfLanguage() === 'te'
          ? `${startMonth} ${startYear} నుండి ${endMonth} ${endYear} వరకు`
          : getActivePdfLanguage() === 'kn'
            ? `${startMonth} ${startYear} ರಿಂದ ${endMonth} ${endYear} ವರೆಗೆ`
            : getActivePdfLanguage() === 'mr'
              ? `${startMonth} ${startYear} पासून ${endMonth} ${endYear} पर्यंत`
              : getActivePdfLanguage() === 'ta'
                ? `${startMonth} ${startYear} முதல் ${endMonth} ${endYear} வரை`
                : `${startMonth} ${startYear} to ${endMonth} ${endYear}`,
    };
  });

  const tocEntries = [
    { num: '01', title: 'Your Birth Chart', sub: 'Birth details, Panchang, planetary positions, Chara Karakas, Three Pillars' },
    { num: '02', title: 'Personal Planetary Profiles', sub: 'Detailed analysis of all 9 planets in your chart' },
    { num: '03', title: 'Bhavphal — The 12 Houses', sub: 'Complete house-by-house life domain analysis' },
    { num: '04', title: 'Life Predictions', sub: 'Career, marriage, health — what the stars reveal' },
    { num: '05', title: 'Your Dasha Timeline', sub: 'Vimshottari Mahadasha & Antardasha periods' },
    { num: '06', title: 'Doshas, Yogas & Karma', sub: 'Rahu-Ketu axis, Raja Yogas, Dosha analysis, Sade Sati' },
    { num: '07', title: 'Numerology & Spiritual Potential', sub: 'Sacred numbers, Atmakaraka, Ishta Devata, Dharma path' },
    { num: '08', title: 'Vedic Remedies', sub: 'Gemstones, Rudraksha, Mantras, Yantras, Pujas, lifestyle guidance' },
  ];
  const tocSplitIndex = Math.ceil(tocEntries.length / 2);
  const tocColumns = [tocEntries.slice(0, tocSplitIndex), tocEntries.slice(tocSplitIndex)];

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={[styles.coverPage, { fontFamily: getActivePdfFontFamily() }]}>
        <View style={styles.coverBackgroundLayer}>
          <Svg width={595} height={842}>
          <Defs>
            {/* Central saffron glow — brand orange radiating from center */}
            <RadialGradient id="cvBrandGlow" cx="50%" cy="50%" r="60%">
              <Stop offset="0%" stopColor="#f97316" stopOpacity={0.50} />
              <Stop offset="30%" stopColor="#ea580c" stopOpacity={0.35} />
              <Stop offset="60%" stopColor="#c2410c" stopOpacity={0.18} />
              <Stop offset="100%" stopColor="#7c2d12" stopOpacity={0} />
            </RadialGradient>
            {/* Top-to-bottom: lighter saffron top → deep burnt orange bottom */}
            <LinearGradient id="cvBrandGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#9a3412" stopOpacity={0.65} />
              <Stop offset="45%" stopColor="#7c2d12" stopOpacity={0.50} />
              <Stop offset="100%" stopColor="#5c1d0c" stopOpacity={0.75} />
            </LinearGradient>
            {/* Soft top highlight — warm saffron wash at the top */}
            <RadialGradient id="cvTopWash" cx="50%" cy="5%" r="50%">
              <Stop offset="0%" stopColor="#f97316" stopOpacity={0.22} />
              <Stop offset="100%" stopColor="#7c2d12" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Base deep saffron-brown */}
          <Rect x={0} y={0} width={595} height={842} fill="#5c1d0c" />
          <Rect x={0} y={0} width={595} height={842} fill="url(#cvBrandGrad)" />
          <Rect x={0} y={0} width={595} height={842} fill="url(#cvBrandGlow)" />
          <Rect x={0} y={0} width={595} height={842} fill="url(#cvTopWash)" />

          {/* Brand orange top border — like the orange page borders */}
          <Rect x={0} y={0} width={595} height={4} fill="#f97316" opacity={0.85} />
          <Rect x={0} y={838} width={595} height={4} fill="#f97316" opacity={0.85} />
          <Rect x={0} y={0} width={4} height={842} fill="#f97316" opacity={0.45} />
          <Rect x={591} y={0} width={4} height={842} fill="#f97316" opacity={0.45} />

          {/* Inner frame line — gold */}
          <Rect x={18} y={18} width={559} height={1} fill="#fbbf24" opacity={0.35} />
          <Rect x={18} y={823} width={559} height={1} fill="#fbbf24" opacity={0.35} />
          <Rect x={18} y={18} width={1} height={806} fill="#fbbf24" opacity={0.25} />
          <Rect x={576} y={18} width={1} height={806} fill="#fbbf24" opacity={0.25} />

          {/* Corner ornaments — brand orange dots */}
          <Circle cx={18} cy={18} r={3} fill="#f97316" opacity={0.7} />
          <Circle cx={577} cy={18} r={3} fill="#f97316" opacity={0.7} />
          <Circle cx={18} cy={824} r={3} fill="#f97316" opacity={0.7} />
          <Circle cx={577} cy={824} r={3} fill="#f97316" opacity={0.7} />

          {/* Zodiac wheel — subtle concentric rings in brand palette */}
          <Circle cx={297} cy={480} r={210} fill="none" stroke="#f97316" strokeWidth={0.7} opacity={0.12} />
          <Circle cx={297} cy={480} r={175} fill="none" stroke="#ea580c" strokeWidth={1.2} opacity={0.16} />
          <Circle cx={297} cy={480} r={140} fill="none" stroke="#f97316" strokeWidth={0.9} opacity={0.14} />
          <Circle cx={297} cy={480} r={105} fill="none" stroke="#fbbf24" strokeWidth={0.7} opacity={0.12} />

          {/* 12 zodiac rays */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const angle = (idx * 30 - 90) * Math.PI / 180;
            const x1 = 297 + Math.cos(angle) * 105;
            const y1 = 480 + Math.sin(angle) * 105;
            const x2 = 297 + Math.cos(angle) * 210;
            const y2 = 480 + Math.sin(angle) * 210;
            return <Line key={`cv-ray-${idx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f97316" strokeWidth={0.6} opacity={0.12} />;
          })}

          {/* Zodiac marker dots on middle ring */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const angle = (idx * 30 - 75) * Math.PI / 180;
            const cx = 297 + Math.cos(angle) * 192;
            const cy = 480 + Math.sin(angle) * 192;
            return <Circle key={`cv-dot-${idx}`} cx={cx} cy={cy} r={2.5} fill="#f97316" opacity={0.30} />;
          })}

          {/* Star field — gold and orange dots */}
          <Circle cx={62} cy={68} r={1.4} fill="#fbbf24" opacity={0.65} />
          <Circle cx={145} cy={42} r={1.0} fill="#fcd34d" opacity={0.50} />
          <Circle cx={230} cy={58} r={1.5} fill="#f97316" opacity={0.55} />
          <Circle cx={365} cy={45} r={1.2} fill="#fbbf24" opacity={0.55} />
          <Circle cx={460} cy={70} r={1.1} fill="#fcd34d" opacity={0.45} />
          <Circle cx={530} cy={55} r={1.3} fill="#f97316" opacity={0.60} />
          <Circle cx={50} cy={160} r={0.9} fill="#fcd34d" opacity={0.40} />
          <Circle cx={545} cy={175} r={1.0} fill="#fbbf24" opacity={0.45} />
          <Circle cx={85} cy={400} r={0.8} fill="#f97316" opacity={0.35} />
          <Circle cx={510} cy={380} r={0.9} fill="#fcd34d" opacity={0.40} />
          <Circle cx={55} cy={650} r={1.0} fill="#fbbf24" opacity={0.40} />
          <Circle cx={540} cy={670} r={0.8} fill="#f97316" opacity={0.35} />
          <Circle cx={100} cy={770} r={1.1} fill="#fbbf24" opacity={0.45} />
          <Circle cx={495} cy={760} r={0.9} fill="#fcd34d" opacity={0.40} />
          </Svg>
        </View>

        <View style={styles.coverBrandRow}>
          <Image src={SRI_MANDIR_LOGO_URI} style={styles.coverBrandLogo} />
          <Text style={[styles.coverBrandText, { marginLeft: 10 }]}>Sri Mandir</Text>
        </View>

        <View style={{ marginTop: 22, alignItems: 'center', width: '100%' }}>
          <Text style={styles.coverKicker}>{localizePdfUiText('YOUR')}</Text>
          <Text style={styles.coverMark}>{localizePdfUiText('KUNDLI REPORT')}</Text>
          <Text style={styles.coverSubtitle}>{localizePdfUiText('A Personalized Vedic Astrology Blueprint')}</Text>
        </View>

        <View style={styles.coverDividerRow}>
          <View style={styles.coverDividerLine} />
          <Text style={[styles.coverDividerCenter, { marginHorizontal: 12 }]}>✦</Text>
          <View style={styles.coverDividerLine} />
        </View>

        <View style={styles.coverIdentityCard}>
          <Text style={styles.coverName}>{report.birthDetails.name}</Text>
          <View style={styles.coverInfoBlock}>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>{localizePdfUiText('Date of Birth')}</Text>
              <Text style={styles.coverInfoValue}>{formatBirthDate(report.birthDetails.dateOfBirth)}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>{localizePdfUiText('Time of Birth')}</Text>
              <Text style={styles.coverInfoValue}>{report.birthDetails.timeOfBirth}</Text>
            </View>
            <View style={[styles.coverInfoRow, { marginBottom: 0 }]}>
              <Text style={styles.coverInfoLabel}>{localizePdfUiText('Place of Birth')}</Text>
              <Text style={styles.coverInfoValue}>{placeDetails.city || report.birthDetails.placeOfBirth || (getActivePdfLanguage() === 'hi' ? 'उपलब्ध नहीं' : getActivePdfLanguage() === 'te' ? 'అందుబాటులో లేదు' : getActivePdfLanguage() === 'kn' ? 'ಲಭ್ಯವಿಲ್ಲ' : getActivePdfLanguage() === 'mr' ? 'उपलब्ध नाही' : getActivePdfLanguage() === 'ta' ? 'கிடைக்கவில்லை' : 'N/A')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.coverFooterWrap}>
          <Text style={styles.coverFooterMeta}>
            {localizePdfUiText('Created by expert astrologers')}
          </Text>
          <Text style={styles.coverFooterBrand}>
            www.srimandir.com
          </Text>
          <Text style={[styles.coverDetails, { marginTop: 8, color: '#fcd34d' }]}>
            {localizePdfUiText('Prepared on')} {formatDate(report.generatedAt)}
          </Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          DISCLAIMER PAGE
          ═══════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const disc = DISCLAIMER_CONTENT[getActivePdfLanguage()] || DISCLAIMER_CONTENT.en;
        return (
      <Page size="A4" style={[styles.page, { fontFamily: getActivePdfFontFamily(), fontSize: getActivePdfBodyFontSize(), lineHeight: getActivePdfBodyLineHeight() }]}>
        <View style={styles.pageWhitePanel} fixed />
        <View style={styles.fixedHeader} fixed>
          <Text style={styles.fixedHeaderTitle}>{localizePdfUiText('Sri Mandir Kundli Report')}</Text>
          <Text style={styles.fixedHeaderSection}>{disc.title}</Text>
        </View>
        <SriMandirFooter />
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />

        {/* Shield icon + heading */}
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 18 }}>
          <Svg width={44} height={44} viewBox="0 0 24 24">
            <Path
              d="M12 2L3 7v5c0 5.25 3.83 10.16 9 11.33C17.17 22.16 21 17.25 21 12V7l-9-5z"
              fill="none"
              stroke={SRIMANDIR_ORANGE}
              strokeWidth={1.5}
            />
            <Path
              d="M12 2L3 7v5c0 5.25 3.83 10.16 9 11.33C17.17 22.16 21 17.25 21 12V7l-9-5z"
              fill={SRIMANDIR_ORANGE}
              opacity={0.08}
            />
            <Path
              d="M10 12l2 2 4-4"
              fill="none"
              stroke={SRIMANDIR_ORANGE}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: P.primary,
            marginTop: 10,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}>
            {disc.title}
          </Text>
          <View style={{ width: 50, height: 2, backgroundColor: SRIMANDIR_ORANGE, marginTop: 8, opacity: 0.5, borderRadius: 1 }} />
        </View>

        {/* Disclaimer body — styled paragraphs */}
        <View style={{
          backgroundColor: P.cardBg,
          borderWidth: 1,
          borderColor: P.lightBorder,
          borderRadius: 8,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginBottom: 14,
        }}>
          {/* Available width: 595 - 42*2 page padding - 20*2 card padding - 6*2 text padding = 459pt */}
          {disc.paragraphs.slice(0, -1).map((para, idx) => (
            <Text key={`disc-p-${idx}`} style={{
              fontSize: getActivePdfBodyFontSize(),
              color: P.bodyText,
              lineHeight: getActivePdfBodyLineHeight(),
              marginBottom: 12,
              textAlign: 'left',
              paddingHorizontal: 6,
              letterSpacing: getActivePdfLanguage() !== 'en' ? 0.15 : 0,
            }}>
              {wrapIndicSync(para, getActivePdfLanguage(), 459)}
            </Text>
          ))}
          {/* Last paragraph — closing inspiration, italic + centered */}
          <Text style={{
            fontSize: getActivePdfBodyFontSize(),
            color: P.mutedText,
            lineHeight: getActivePdfBodyLineHeight(),
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 4,
            marginBottom: 0,
            paddingHorizontal: 6,
            letterSpacing: getActivePdfLanguage() !== 'en' ? 0.15 : 0,
          }}>
            {wrapIndicSync(disc.paragraphs[disc.paragraphs.length - 1], getActivePdfLanguage(), 459)}
          </Text>
        </View>
      </Page>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
          GUIDANCE FOR YOUR JOURNEY AHEAD
          ═══════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const guide = GUIDANCE_CONTENT[getActivePdfLanguage()] || GUIDANCE_CONTENT.en;
        return (
      <Page size="A4" style={[styles.page, { fontFamily: getActivePdfFontFamily(), fontSize: getActivePdfBodyFontSize(), lineHeight: getActivePdfBodyLineHeight() }]}>
        <View style={styles.pageWhitePanel} fixed />
        <View style={styles.fixedHeader} fixed>
          <Text style={styles.fixedHeaderTitle}>{localizePdfUiText('Sri Mandir Kundli Report')}</Text>
        </View>
        <SriMandirFooter />
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />

        {/* Compass/star icon + heading */}
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 18 }}>
          <Svg width={44} height={44} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={10} fill="none" stroke={SRIMANDIR_ORANGE} strokeWidth={1.3} />
            <Circle cx={12} cy={12} r={10} fill={SRIMANDIR_ORANGE} opacity={0.06} />
            {/* 4-pointed star/compass */}
            <Path d="M12 2 L13.5 10 L12 9 L10.5 10 Z" fill={SRIMANDIR_ORANGE} opacity={0.75} />
            <Path d="M12 22 L13.5 14 L12 15 L10.5 14 Z" fill={SRIMANDIR_ORANGE} opacity={0.75} />
            <Path d="M2 12 L10 10.5 L9 12 L10 13.5 Z" fill={SRIMANDIR_ORANGE} opacity={0.75} />
            <Path d="M22 12 L14 10.5 L15 12 L14 13.5 Z" fill={SRIMANDIR_ORANGE} opacity={0.75} />
            <Circle cx={12} cy={12} r={2} fill={SRIMANDIR_ORANGE} opacity={0.4} />
          </Svg>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: P.primary,
            marginTop: 10,
            letterSpacing: 0.3,
            textAlign: 'center',
          }}>
            {guide.title}
          </Text>
          <View style={{ width: 50, height: 2, backgroundColor: SRIMANDIR_ORANGE, marginTop: 8, opacity: 0.5, borderRadius: 1 }} />
        </View>

        {/* Guidance body */}
        <View style={{
          backgroundColor: P.cardBg,
          borderWidth: 1,
          borderColor: P.lightBorder,
          borderRadius: 8,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginBottom: 14,
        }}>
          {/* Available width: 595 - 42*2 page padding - 20*2 card padding - 6*2 text padding = 459pt */}
          {guide.paragraphs.slice(0, -1).map((para, idx) => (
            <Text key={`guide-p-${idx}`} style={{
              fontSize: getActivePdfBodyFontSize(),
              color: P.bodyText,
              lineHeight: getActivePdfBodyLineHeight(),
              marginBottom: 12,
              textAlign: 'left',
              paddingHorizontal: 6,
              letterSpacing: getActivePdfLanguage() !== 'en' ? 0.15 : 0,
            }}>
              {wrapIndicSync(para, getActivePdfLanguage(), 459)}
            </Text>
          ))}
          {/* Last paragraph — closing inspiration, italic + centered */}
          <Text style={{
            fontSize: getActivePdfBodyFontSize(),
            color: P.mutedText,
            lineHeight: getActivePdfBodyLineHeight(),
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 4,
            marginBottom: 0,
            paddingHorizontal: 6,
            letterSpacing: getActivePdfLanguage() !== 'en' ? 0.15 : 0,
          }}>
            {wrapIndicSync(guide.paragraphs[guide.paragraphs.length - 1], getActivePdfLanguage(), 459)}
          </Text>
        </View>
      </Page>
        );
      })()}

      {/* Table of Contents Page */}
      <ContentPage sectionName="Table of Contents">
        <Section title="Table of Contents">
          <Text style={[styles.paragraph, { marginBottom: 16, fontStyle: 'normal' }]}>
            {localizePdfUiText('This comprehensive Kundli report covers all major dimensions of your birth chart, from your fundamental planetary blueprint to specific life-area predictions and remedial guidance.')}
          </Text>

          <View style={styles.tocColumns}>
            {tocColumns.map((column, cIdx) => (
              <View key={cIdx} style={styles.tocColumn}>
                {column.map((entry) => (
                  <View key={entry.num} style={styles.tocEntryCompact}>
                    <View style={styles.tocEntryCompactTop}>
                      <Text style={styles.tocNumberCompact}>{entry.num}</Text>
                      <Text style={styles.tocTitleCompact}>{localizePdfUiText(entry.title)}</Text>
                    </View>
                    <Text style={styles.tocSubtitleCompact}>{localizePdfUiText(entry.sub)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Section>
      </ContentPage>

      {/* Kundali Charts — 4 per page in a 2×2 grid */}
      {charts.length > 0 && (() => {
        const CHARTS_PER_PAGE = 4;
        const chartPages: ChartData[][] = [];
        for (let i = 0; i < charts.length; i += CHARTS_PER_PAGE) {
          chartPages.push(charts.slice(i, i + CHARTS_PER_PAGE));
        }

        const chartName = (c: ChartData) =>
          getActivePdfLanguage() === 'hi' && c.nameHindi ? c.nameHindi
          : getActivePdfLanguage() === 'te' && c.nameTelugu ? c.nameTelugu
          : getActivePdfLanguage() === 'kn' && c.nameKannada ? c.nameKannada
          : getActivePdfLanguage() === 'mr' && c.nameMarathi ? c.nameMarathi
          : getActivePdfLanguage() === 'ta' && c.nameTamil ? c.nameTamil
          : c.name;

        const renderChartCell = (chart: ChartData, idx: number) => (
          <View key={idx} style={styles.chartItem} wrap={false}>
            <Text style={styles.chartTitle}>{chart.type}: {chartName(chart)}</Text>
            <View style={styles.chartContainer}>
              {chart.dataUrl ? (
                <Image src={chart.dataUrl} style={{ width: 236, height: 236 }} />
              ) : chart.svg ? (
                <SVGRenderer svgString={chart.svg} width={236} height={236} />
              ) : (
                <Text style={{ color: '#6b7280', fontSize: 9, textAlign: 'center', paddingHorizontal: 8 }}>
                  {localizePdfUiText('Chart image unavailable for this section.')}
                </Text>
              )}
            </View>
            <Text style={styles.chartPurpose}>{localizePdfUiText(chart.purpose)}</Text>
          </View>
        );

        return chartPages.map((page, pageIdx) => (
          <ContentPage key={`chart-pg-${pageIdx}`} sectionName="Kundali Charts">
            <Section
              title={pageIdx === 0 ? 'Kundali Charts (Divisional Charts)' : 'Additional Divisional Charts'}
              keepWithNext={260}
            >
              {pageIdx === 0 && (
                <Text style={styles.paragraph}>
                  {localizePdfUiText('These are the key divisional charts (Varga charts) derived from your birth chart. Each chart reveals specific life areas and is used for deeper analysis of those domains.')}
                </Text>
              )}
              <View style={styles.chartGrid}>
                {page.map((chart, idx) => renderChartCell(chart, idx))}
              </View>
            </Section>
          </ContentPage>
        ));
      })()}
      {/* ═══════════════════════════════════════════════════════
          PART 01 — YOUR BIRTH CHART
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="01"
        title="Your Birth Chart"
        subtitle="Birth details, planetary positions, Panchang analysis, and the three foundational pillars of your horoscope"
      />

      {/* Birth Details & Planetary Positions */}
      <ContentPage sectionName="Birth Details & Planetary Positions">
        <Section title="Birth Details" wrap={false}>
          <View style={styles.card}>
            <View style={styles.stableTwoCol}>
              <View style={styles.stableCol}>
                <InfoRow label="Name" value={birthDetails.name || 'N/A'} />
                <InfoRow label="Sex" value={sex} />
                <InfoRow label="Date of Birth" value={formatBirthDate(birthDateValue) || birthDateValue || 'N/A'} />
                <InfoRow label="Day" value={report?.panchang?.vaar?.day || getWeekday(birthDateValue)} />
                <InfoRow label="Time of Birth" value={birthDetails.timeOfBirth || 'N/A'} />
                <InfoRow label="Place of Birth" value={(() => {
                  const raw = birthDetails.placeOfBirth || '';
                  if (!raw) return placeDetails.city || (getActivePdfLanguage() === 'hi' ? 'उपलब्ध नहीं' : getActivePdfLanguage() === 'te' ? 'అందుబాటులో లేదు' : getActivePdfLanguage() === 'kn' ? 'ಲಭ್ಯವಿಲ್ಲ' : getActivePdfLanguage() === 'mr' ? 'उपलब्ध नाही' : getActivePdfLanguage() === 'ta' ? 'கிடைக்கவில்லை' : 'N/A');
                  // Transliterate each comma-separated segment of the place string
                  return raw.split(',').map((s: string) => translitPlace(s.trim())).join(', ');
                })()} />
                <InfoRow label="City" value={placeDetails.city} />
                <InfoRow label="State" value={placeDetails.state} />
                <InfoRow label="Country" value={placeDetails.country} />
              </View>

              <View style={styles.stableCol}>
                <InfoRow label="Latitude" value={formatCoordinate(birthDetails.latitude, 'lat')} />
                <InfoRow label="Longitude" value={formatCoordinate(birthDetails.longitude, 'lon')} />
                <InfoRow label="Timezone" value={timezoneText} />
                <InfoRow label="Tithi at Birth" value={tithiPaksha ? `${tithiName} (${tithiPaksha})` : tithiName} />
                <InfoRow label="Nakshatra at Birth" value={nakshatraPada ? `${nakshatraName} (${localizePdfUiText('Pada')} ${nakshatraPada})` : nakshatraName} />
                <InfoRow label="Yoga at Birth" value={yogaName} />
                <InfoRow label="Karana at Birth" value={karanaName} />
                <InfoRow
                  label="Sun Degree"
                  value={sunPosition ? formatDegreeInSign(sunPosition.sign, sunPosition.degree) : 'N/A'}
                />
                <InfoRow
                  label="Ascendant Degree"
                  value={report?.ascendant ? formatDegreeInSign(report.ascendant.sign, report.ascendant.degree) : 'N/A'}
                />
              </View>
            </View>
          </View>
        </Section>

        <Section title="Planetary Positions" wrap={false}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Sign')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('House')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Degree')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Status')}</Text>
            </View>
            {report.planetaryPositions.map((planet: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCell}>{localizePdfUiText(planet.name)}</Text>
                <Text style={styles.tableCell}>{localizePdfUiText(planet.sign)}</Text>
                <Text style={styles.tableCell}>{planet.house}</Text>
                <Text style={styles.tableCell}>{degreeWithinSign(planet.degree).toFixed(2)}°</Text>
                <Text style={styles.tableCell}>{localizePdfUiText(planet.isRetro ? 'Retrograde' : 'Direct')}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Detailed Planetary Snapshot" keepWithNext={180}>
          {/* Astro details — only render rows whose data the Seer API actually provides */}
          {(() => {
            const ishtaVal = pickAstroValue('ishta', 'ishta_kaal', 'ishtkaal', 'isht');
            const sunriseVal = pickAstroValue('sunrise', 'sun_rise');
            const sunsetVal = pickAstroValue('sunset', 'sun_set');
            const lmtVal = pickAstroValue('local_mean_time', 'lmt');
            const lstVal = pickAstroValue('sidereal_time', 'lst');
            const tithiEndVal = pickAstroValue('tithi_ending_time', 'tithi_end_time');
            const nakEndVal = pickAstroValue('nakshatra_ending_time', 'nakshatra_end_time');
            const leftCol = [
              { label: 'Lahiri Ayanamsha', value: ayanamshaText },
              ...(ishtaVal !== 'N/A' ? [{ label: 'Ishta', value: ishtaVal }] : []),
              ...(sunriseVal !== 'N/A' ? [{ label: 'Sunrise', value: sunriseVal }] : []),
              ...(sunsetVal !== 'N/A' ? [{ label: 'Sunset', value: sunsetVal }] : []),
            ];
            const rightCol = [
              ...(lmtVal !== 'N/A' ? [{ label: 'Local Mean Time', value: lmtVal }] : []),
              ...(lstVal !== 'N/A' ? [{ label: 'Sidereal Time', value: lstVal }] : []),
              ...(tithiEndVal !== 'N/A' ? [{ label: 'Tithi Ending Time', value: tithiEndVal }] : []),
              ...(nakEndVal !== 'N/A' ? [{ label: 'Nakshatra Ending Time', value: nakEndVal }] : []),
            ];
            // Only render the card if there's at least one data row beyond Ayanamsha
            const hasAstroData = leftCol.length > 1 || rightCol.length > 0;
            return (
              <View style={styles.card} wrap={false}>
                <View style={styles.stableTwoCol}>
                  <View style={styles.stableCol}>
                    {leftCol.map((r, i) => <InfoRow key={`al${i}`} label={r.label} value={r.value} />)}
                  </View>
                  {rightCol.length > 0 && (
                    <View style={styles.stableCol}>
                      {rightCol.map((r, i) => <InfoRow key={`ar${i}`} label={r.label} value={r.value} />)}
                    </View>
                  )}
                </View>
              </View>
            );
          })()}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{localizePdfUiText('Planetary Degree Matrix')}</Text>
            <View style={styles.advancedTable}>
              <View style={styles.advancedTableHeader}>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('Pl')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 0.45 }]}>R</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 0.45 }]}>C</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('Rasi')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.3 }]}>{localizePdfUiText('Degree')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.2 }]}>{localizePdfUiText('Speed')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.8 }]}>{localizePdfUiText('Nak')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 0.7 }]}>{localizePdfUiText('Pad')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 0.7 }]}>{localizePdfUiText('No.')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('RL')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('NL')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('Sub')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.5 }]}>{localizePdfUiText('Dignity')}</Text>
              </View>
              {detailedPlanetRows.map((row: any, idx: number) => (
                <View
                  key={`${row.name}-${idx}`}
                  style={idx % 2 === 0 ? styles.advancedTableRow : styles.advancedTableRowAlt}
                  wrap={false}
                >
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.name)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 0.45 }]}>{row.retro}</Text>
                  <Text style={[styles.advancedCellText, { flex: 0.45 }]}>{row.combust}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.signShort)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.3 }]}>{row.degreeText}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.2 }]}>{row.speed}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.8 }]}>{localizePdfUiText(row.nakshatra)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 0.7 }]}>{row.pada}</Text>
                  <Text style={[styles.advancedCellText, { flex: 0.7 }]}>{row.nakNo}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.rashiLord)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.nakLord)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.subLord)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.5 }]}>{localizePdfUiText(row.dignity)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.tinyNote}>
              {localizePdfUiText('R = Retrograde, C = Combust. Fields marked "if available" are shown when present in source astro data.')}
            </Text>
          </View>
        </Section>

        <Section title="Chara Karakas (Jaimini)" wrap={false}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Karaka')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Degree')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Signification')}</Text>
            </View>
            {report.charaKarakas.map((karaka: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCell}>{localizePdfUiText(karaka.karaka)}</Text>
                <Text style={styles.tableCell}>{localizePdfUiText(karaka.planet)}</Text>
                <Text style={styles.tableCell}>{degreeWithinSign(karaka.degree).toFixed(2)}°</Text>
                <Text style={styles.tableCell}>{localizePdfUiText(karaka.signification)}</Text>
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
              {localizePdfUiText("The Panchang (five limbs) provides the foundational cosmic timing of your birth, revealing the day's energy, lunar phase, and celestial influences that shape your destiny.")}
            </Text>
            
            <Card title={`${localizePdfUiText('Vaar (Day)')}: ${localizePdfUiText(report.panchang.vaar?.day || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.vaar?.interpretation || '')}</Text>
            </Card>

            <Card title={`${localizePdfUiText('Tithi')}: ${localizePdfUiText(report.panchang.tithi?.name || 'N/A')} (${localizePdfUiText(report.panchang.tithi?.paksha || '')})`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.tithi?.interpretation || '')}</Text>
            </Card>

            <Card title={`${localizePdfUiText('Nakshatra')}: ${localizePdfUiText(report.panchang.nakshatra?.name || 'N/A')} (${localizePdfUiText('Pada')} ${report.panchang.nakshatra?.pada || ''})`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.nakshatra?.interpretation || '')}</Text>
            </Card>

            <Card title={`${localizePdfUiText('Yoga')}: ${localizePdfUiText(report.panchang.yoga?.name || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.yoga?.interpretation || '')}</Text>
            </Card>

            <Card title={`${localizePdfUiText('Karana')}: ${localizePdfUiText(report.panchang.karana?.name || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.karana?.interpretation || '')}</Text>
            </Card>
          </Section>
        </ContentPage>
      )}

      {/* Three Pillars */}
      {report.pillars && (
        <ContentPage sectionName="Three Pillars">
          <Section title="Three Pillars of Your Chart">
            <Text style={styles.paragraph}>
              {localizePdfUiText('The three fundamental pillars—Moon Sign, Ascendant, and Birth Nakshatra—form the core identity markers of your horoscope, revealing your emotional nature, physical constitution, and life purpose.')}
            </Text>

            <SubSection title={`${localizePdfUiText('Moon Sign (Rashi)')}: ${localizePdfUiText(report.pillars.moonSign?.sign || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.pillars.moonSign?.interpretation || '')}</Text>
              <InfoRow label="Element" value={localizePdfUiText(report.pillars.moonSign?.element || 'N/A')} />
              <InfoRow label="Emotional Nature" value={localizePdfUiText(report.pillars.moonSign?.emotionalNature || 'N/A')} />
            </SubSection>

            <SubSection title={`${localizePdfUiText('Ascendant (Lagna)')}: ${localizePdfUiText(report.pillars.ascendant?.sign || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.pillars.ascendant?.interpretation || '')}</Text>
              <InfoRow label="Ruling Planet" value={localizePdfUiText(report.pillars.ascendant?.rulingPlanet || 'N/A')} />
              <InfoRow label="Personality" value={localizePdfUiText(report.pillars.ascendant?.personality || 'N/A')} />
            </SubSection>

            <SubSection title={`${localizePdfUiText('Birth Nakshatra')}: ${localizePdfUiText(report.pillars.nakshatra?.name || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.pillars.nakshatra?.interpretation || '')}</Text>
              <InfoRow label="Deity" value={localizePdfUiText(report.pillars.nakshatra?.deity || 'N/A')} />
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 02 — PERSONAL PLANETARY PROFILES
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="02"
        title="Personal Planetary Profiles"
        subtitle="A detailed analysis of each planet's placement, dignity, and influence on every dimension of your life"
      />

      {/* Planetary Profiles */}
      {report.planets && report.planets.length > 0 && (
        <>
          {report.planets.map((planet: any, idx: number) => (
            <ContentPage key={idx} sectionName={`Planet: ${planet.planet}`}>
              <Section title={`${localizePdfUiText(planet.planet)} - ${localizePdfUiText('Planetary Analysis')}`}>
                <InfoStrip items={[
                  { label: 'Sign', value: localizePdfUiText(planet.sign || 'N/A') },
                  { label: 'House', value: `${planet.house || 'N/A'}` },
                  { label: 'Dignity', value: localizePdfUiText(planet.dignity || 'N/A') },
                  { label: 'Motion', value: localizePdfUiText(planet.isRetrograde ? 'Retrograde' : 'Direct') },
                ]} />

                <SubSection title="Placement Analysis">
                  <Text style={styles.paragraph}>{localizePdfUiText(planet.placementAnalysis || '')}</Text>
                </SubSection>

                {planet.houseSignificance && (
                  <SubSection title="House Significance">
                    <Text style={styles.paragraph}>{localizePdfUiText(planet.houseSignificance)}</Text>
                  </SubSection>
                )}

                {planet.aspects && planet.aspects.length > 0 && (
                  <SubSection title="Aspects">
                    {planet.aspects.map((aspect: any, aIdx: number) => (
                      <Card key={aIdx} title={`${localizePdfUiText(aspect.aspectType)} ${localizePdfUiText('Aspect')} → ${localizePdfUiText('House')} ${aspect.targetHouse}`}>
                        <Text style={styles.paragraph}>{localizePdfUiText(aspect.interpretation || '')}</Text>
                      </Card>
                    ))}
                  </SubSection>
                )}

                {planet.retrogradeEffect && planet.isRetrograde && (
                  <SubSection title="Retrograde Effect">
                    <View style={styles.highlight}>
                      <Text style={styles.bodyText}>{localizePdfUiText(planet.retrogradeEffect)}</Text>
                    </View>
                  </SubSection>
                )}

                {planet.dashaInfluence && (
                  <SubSection title="Dasha Influence">
                    <Text style={styles.paragraph}>{localizePdfUiText(planet.dashaInfluence)}</Text>
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

      {/* ═══════════════════════════════════════════════════════
          PART 03 — BHAVPHAL: THE 12 HOUSES
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="03"
        title="Bhavphal — The 12 Houses"
        subtitle="A complete house-by-house analysis of every life domain — from self-identity to moksha"
      />

      {/* House Analysis (Bhavphal) */}
      {report.houses && report.houses.length > 0 && (
        <>
          <ContentPage sectionName="House Analysis (Bhavphal)">
            <Section title="Bhavphal - House Analysis Overview">
              <Text style={styles.paragraph}>
                {localizePdfUiText('The twelve houses (Bhavas) of your horoscope govern different areas of life. Each house is colored by its sign, lord placement, and any planetary occupants. This comprehensive analysis reveals the potential in each life domain.')}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('House')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Sign')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Lord')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Lord in')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Occupants')}</Text>
                </View>
                {report.houses.map((house: any, idx: number) => {
                  const houseSign = localizePdfUiText(sanitizeText(String(house.sign || 'N/A')) || 'N/A');
                  const houseLord = localizePdfUiText(sanitizeText(String(house.lord || 'N/A')) || 'N/A');
                  const occupantsText = Array.isArray(house.occupants)
                    ? house.occupants
                        .map((o: any) => localizePdfUiText(sanitizeText(String(o || '')).trim()))
                        .filter(Boolean)
                        .join(', ')
                    : '';
                  return (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{house.house}</Text>
                      <Text style={styles.tableCell}>{houseSign}</Text>
                      <Text style={styles.tableCell}>{houseLord}</Text>
                      <Text style={styles.tableCell}>H{house.lordHouse}</Text>
                      <Text style={styles.tableCell}>{occupantsText || localizePdfUiText('Empty')}</Text>
                    </View>
                  );
                })}
              </View>
            </Section>
          </ContentPage>

          {report.houses.map((house: any, idx: number) => (
            <ContentPage key={idx} sectionName={`House ${house.house}`}>
              <Section title={`House ${house.house}${getActivePdfLanguage() !== 'en' && house.houseHindi ? ' - ' + sanitizeText(house.houseHindi) : ''}`}>
                <InfoStrip items={[
                  { label: 'Sign', value: localizePdfUiText(sanitizeText(String(house.sign || 'N/A')) || 'N/A') },
                  { label: 'Lord', value: localizePdfUiText(sanitizeText(String(house.lord || 'N/A')) || 'N/A') },
                  { label: 'Nature', value: localizePdfUiText(sanitizeText(String(house.houseNature || 'N/A')) || 'N/A') },
                ]} />

                <SubSection title="Significance">
                  <Text style={styles.paragraph}>{localizePdfUiText(house.significance || '')}</Text>
                </SubSection>

                <SubSection title="Detailed Analysis">
                  <Text style={styles.paragraph}>{localizePdfUiText(house.interpretation || '')}</Text>
                </SubSection>

                {house.predictions && house.predictions.length > 0 && (
                  <SubSection title="Predictions">
                    <BulletList items={house.predictions} />
                  </SubSection>
                )}

                <View style={styles.grid2} wrap={false}>
                  {house.strengths && house.strengths.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Strengths')}</Text>
                      <BulletList items={house.strengths} maxWidth={210} />
                    </View>
                  )}
                  {house.challenges && house.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges')}</Text>
                      <BulletList items={house.challenges} maxWidth={210} />
                    </View>
                  )}
                </View>

                {house.timing && (
                  <SubSection title="Timing">
                    <Text style={styles.paragraph}>{localizePdfUiText(house.timing)}</Text>
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
            <Text style={styles.paragraph}>{localizePdfUiText(report.career.overview || '')}</Text>

            {report.career.careerDirection && (
              <SubSection title="Right Career For You">
                <View style={styles.highlight}>
                  <Text style={styles.boldLabel}>{localizePdfUiText(report.career.careerDirection.rightCareerForYou || '')}</Text>
                </View>
                {report.career.careerDirection.coreStrengths && report.career.careerDirection.coreStrengths.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Core Strengths')}</Text>
                    <BulletList items={report.career.careerDirection.coreStrengths} />
                  </>
                )}
                {report.career.careerDirection.idealRoles && report.career.careerDirection.idealRoles.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Ideal Roles')}</Text>
                    <BulletList items={report.career.careerDirection.idealRoles} />
                  </>
                )}
                <InfoRow label="Ideal Work Environment" value={report.career.careerDirection.idealWorkEnvironment || 'N/A'} />
              </SubSection>
            )}

            <SubSection title="10th House Analysis">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.tenthHouse?.interpretation || '')}</Text>
              {report.career.tenthHouse?.careerThemes && (
                <BulletList items={report.career.tenthHouse.careerThemes} />
              )}
            </SubSection>

            <SubSection title="Sun Analysis (Authority)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.sunAnalysis?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Saturn Analysis (Work Ethic)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.saturnAnalysis?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Amatyakaraka (Career Significator)">
              <InfoRow label="Planet" value={localizePdfUiText(report.career.amatyakaraka?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.amatyakaraka?.interpretation || '')}</Text>
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
                  <Text style={styles.calloutTitle}>{localizePdfUiText('Current Career Phase')}</Text>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.career.careerTiming.currentPhase || '')}</Text>
                </View>
                {report.career.careerTiming.upcomingOpportunities && report.career.careerTiming.upcomingOpportunities.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Upcoming Opportunities')}</Text>
                    <BulletList items={report.career.careerTiming.upcomingOpportunities} />
                  </>
                )}
                {report.career.careerTiming.challenges && report.career.careerTiming.challenges.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges to Navigate')}</Text>
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
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Future Career Changes')}</Text>
                    <BulletList items={report.career.careerSwitchInsights.oneOrTwoFutureChanges} />
                  </>
                )}
                <Text style={styles.paragraph}>{localizePdfUiText(report.career.careerSwitchInsights.rationale || '')}</Text>
                {report.career.careerSwitchInsights.preparationPlan && report.career.careerSwitchInsights.preparationPlan.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Preparation Plan')}</Text>
                    <BulletList items={report.career.careerSwitchInsights.preparationPlan} />
                  </>
                )}
              </SubSection>
            )}

            <SubSection title="Success Formula">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.career.successFormula || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="Wealth Potential">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.wealthPotential || '')}</Text>
            </SubSection>

            <SubSection title="Business vs Job">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.businessVsJob || '')}</Text>
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
            <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.overview || '')}</Text>

            {report.marriage.maritalSafety && (
              <SubSection title="Relationship Safety Framework">
                <InfoRow label="Status Assumption" value={localizePdfUiText(report.marriage.maritalSafety.statusAssumption || 'N/A')} />
                <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.maritalSafety.safeguardPolicy || '')}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.marriage.maritalSafety.alreadyMarriedGuidance || '')}</Text>
                </View>
              </SubSection>
            )}

            <SubSection title="5th House (Romance)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.fifthHouse?.interpretation || '')}</Text>
              <InfoRow label="Love Nature" value={report.marriage.fifthHouse?.loveNature || 'N/A'} />
            </SubSection>

            <SubSection title="7th House (Marriage)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.seventhHouse?.interpretation || '')}</Text>
              <InfoRow label="Marriage Prospects" value={report.marriage.seventhHouse?.marriageProspects || 'N/A'} />
            </SubSection>

            <SubSection title="Venus Analysis">
              <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.venusAnalysis?.interpretation || '')}</Text>
              <InfoRow label="Attraction Style" value={report.marriage.venusAnalysis?.attractionStyle || 'N/A'} />
            </SubSection>

            <SubSection title="Darakaraka (Spouse Significator)">
              <InfoRow label="Planet" value={localizePdfUiText(report.marriage.darakaraka?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.darakaraka?.interpretation || '')}</Text>
              {report.marriage.darakaraka?.partnerQualities && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Partner Qualities')}</Text>
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
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Key Qualities')}</Text>
                    <BulletList items={report.marriage.idealPartnerForUnmarried.keyQualities} />
                  </>
                )}
                {report.marriage.idealPartnerForUnmarried.cautionTraits && report.marriage.idealPartnerForUnmarried.cautionTraits.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Caution Traits')}</Text>
                    <BulletList items={report.marriage.idealPartnerForUnmarried.cautionTraits} />
                  </>
                )}
                <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.idealPartnerForUnmarried.practicalAdvice || '')}</Text>
              </SubSection>
            )}

            {report.marriage.guidanceForMarriedNatives && (
              <SubSection title="Guidance If Married">
                {report.marriage.guidanceForMarriedNatives.focusAreas && report.marriage.guidanceForMarriedNatives.focusAreas.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Focus Areas')}</Text>
                    <BulletList items={report.marriage.guidanceForMarriedNatives.focusAreas} />
                  </>
                )}
                {report.marriage.guidanceForMarriedNatives.relationshipStrengthening && report.marriage.guidanceForMarriedNatives.relationshipStrengthening.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Relationship Strengthening')}</Text>
                    <BulletList items={report.marriage.guidanceForMarriedNatives.relationshipStrengthening} />
                  </>
                )}
                {report.marriage.guidanceForMarriedNatives.conflictsToAvoid && report.marriage.guidanceForMarriedNatives.conflictsToAvoid.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Conflicts to Avoid')}</Text>
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
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Favorable Periods')}</Text>
                  <BulletList items={report.marriage.marriageTiming.favorablePeriods} />
                </>
              )}
              {report.marriage.marriageTiming?.challengingPeriods && report.marriage.marriageTiming.challengingPeriods.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Challenging Periods')}</Text>
                  <BulletList items={report.marriage.marriageTiming.challengingPeriods} />
                </>
              )}
            </SubSection>

            {report.marriage.mangalDosha?.present && (
              <SubSection title="Mangal Dosha">
                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText('Severity')}: {report.marriage.mangalDosha.severity}</Text>
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
              {localizePdfUiText(report.remedies?.healthGuidance?.whyThisMatters || 'This guidance focuses on sustainable, age-appropriate health habits and long-term stability.')}
            </Text>

            {report.remedies?.healthGuidance && (
              <>
                <SubSection title="Age Context & Safety">
                  <InfoRow label="Age Group Context" value={report.remedies.healthGuidance.ageGroup || 'N/A'} />
                  {report.remedies.healthGuidance.medicalDisclaimer && (
                    <Text style={styles.scriptural}>{localizePdfUiText(report.remedies.healthGuidance.medicalDisclaimer)}</Text>
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
                  <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.generalAdvice)}</Text>
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
            <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.overview || '')}</Text>
            <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.vimshottariSystem || '')}</Text>

            <SubSection title="Birth Nakshatra">
              <InfoRow label="Nakshatra" value={localizePdfUiText(report.dasha.birthNakshatra?.name || 'N/A')} />
              <InfoRow label="Lord" value={localizePdfUiText(dashaTruth?.startLord || report.dasha.birthNakshatra?.lord || 'N/A')} />
              <InfoRow label="Starting Dasha" value={localizePdfUiText(dashaTruth?.startLord || report.dasha.birthNakshatra?.startingDasha || 'N/A')} />
              <InfoRow label="Balance at Birth" value={dashaTruth ? `${dashaTruth.balanceYears.toFixed(2)} years` : (report.dasha.birthNakshatra?.balance || 'N/A')} />
            </SubSection>

            <SubSection title={`${localizePdfUiText('Current Mahadasha')}: ${localizePdfUiText(dashaTruth?.mahadasha || report.dasha.currentMahadasha?.planet || 'N/A')}`}>
              <View style={styles.card}>
                <InfoRow
                  label="Period"
                  value={`${dashaTruth ? formatMonthYear(dashaTruth.mdStart) : (report.dasha.currentMahadasha?.startDate || '')} to ${dashaTruth ? formatMonthYear(dashaTruth.mdEnd) : (report.dasha.currentMahadasha?.endDate || '')}`}
                />
                <Text style={[styles.accentText, { marginTop: 5 }]}>
                  {localizePdfUiText(report.dasha.currentMahadasha?.planetSignificance || '')}
                </Text>
              </View>
              <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.currentMahadasha?.interpretation || '')}</Text>
              
              {report.dasha.currentMahadasha?.majorThemes && report.dasha.currentMahadasha.majorThemes.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Life Themes')}</Text>
                  <BulletList items={report.dasha.currentMahadasha.majorThemes} />
                </>
              )}
              
              {report.dasha.currentMahadasha?.opportunities && report.dasha.currentMahadasha.opportunities.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Opportunities')}</Text>
                  <BulletList items={report.dasha.currentMahadasha.opportunities} />
                </>
              )}
              
              {report.dasha.currentMahadasha?.challenges && report.dasha.currentMahadasha.challenges.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges')}</Text>
                  <BulletList items={report.dasha.currentMahadasha.challenges} />
                </>
              )}

              {report.dasha.currentMahadasha?.advice && (
                <View style={styles.highlight}>
                  <Text style={styles.boldLabel}>{localizePdfUiText('Advice')}: </Text>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.dasha.currentMahadasha.advice)}</Text>
                </View>
              )}
            </SubSection>

            <SubSection title={`${localizePdfUiText('Current Antardasha')}: ${localizePdfUiText(dashaTruth?.antardasha || report.dasha.currentAntardasha?.planet || 'N/A')}`}>
              <View style={styles.card}>
                <InfoRow
                  label="Period"
                  value={`${dashaTruth ? formatMonthYear(dashaTruth.adStart) : (report.dasha.currentAntardasha?.startDate || '')} to ${dashaTruth ? formatMonthYear(dashaTruth.adEnd) : (report.dasha.currentAntardasha?.endDate || '')}`}
                />
              </View>
              <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.currentAntardasha?.interpretation || '')}</Text>
              
              {report.dasha.currentAntardasha?.keyEvents && report.dasha.currentAntardasha.keyEvents.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Key Events to Watch')}</Text>
                  <BulletList items={report.dasha.currentAntardasha.keyEvents} />
                </>
              )}

              {report.dasha.currentAntardasha?.recommendations && report.dasha.currentAntardasha.recommendations.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Recommendations')}</Text>
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
              <Section title={`${localizePdfUiText(md.planet)} ${localizePdfUiText('Mahadasha Predictions')}`}>
                {(() => {
                  const mdDates = resolveMdDates(md.planet, md.startDate, md.endDate);
                  return (
                <View style={styles.card}>
                      <InfoRow label="Period" value={`${mdDates.start} to ${mdDates.end}`} />
                  <InfoRow label="Duration" value={md.duration || ''} />
                </View>
                  );
                })()}
                
                <Text style={styles.paragraph}>{localizePdfUiText(md.overview || '')}</Text>

                <SubSection title="Career Impact">
                  <Text style={styles.paragraph}>{localizePdfUiText(md.careerImpact || '')}</Text>
                </SubSection>

                <SubSection title="Relationship Impact">
                  <Text style={styles.paragraph}>{localizePdfUiText(md.relationshipImpact || '')}</Text>
                </SubSection>

                <SubSection title="Health Impact">
                  <Text style={styles.paragraph}>{localizePdfUiText(md.healthImpact || '')}</Text>
                </SubSection>

                <SubSection title="Financial Impact">
                  <Text style={styles.paragraph}>{localizePdfUiText(md.financialImpact || '')}</Text>
                </SubSection>

                <SubSection title="Spiritual Growth">
                  <Text style={styles.paragraph}>{localizePdfUiText(md.spiritualGrowth || '')}</Text>
                </SubSection>

                {md.keyEvents && md.keyEvents.length > 0 && (
                  <SubSection title="Key Events">
                    <BulletList items={md.keyEvents} />
                  </SubSection>
                )}

                <View style={styles.grid2}>
                  {md.opportunities && md.opportunities.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Opportunities')}</Text>
                      <BulletList items={md.opportunities} maxWidth={210} />
                    </View>
                  )}
                  {md.challenges && md.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges')}</Text>
                      <BulletList items={md.challenges} maxWidth={210} />
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
              {localizePdfUiText('The following are the current and upcoming sub-periods (Antardashas) within your current Mahadasha. Completed past Antardashas are intentionally excluded so this section stays forward-looking and actionable.')}
            </Text>
            
            {report.dasha.antardashaPredictions.map((ad: any, idx: number) => (
              <Card key={idx} title={`${localizePdfUiText(formatDashaPair(ad.mahadasha, ad.antardasha))} (${ad.duration || ''})`}>
                {(() => {
                  const adDates = resolveAdDates(ad.antardasha, ad.startDate, ad.endDate);
                  return <InfoRow label="Period" value={`${adDates.start} to ${adDates.end}`} />;
                })()}
                <Text style={styles.paragraph}>{localizePdfUiText(ad.overview || '')}</Text>

                {ad.focusAreas && ad.focusAreas.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Focus Areas')}</Text>
                    <BulletList items={ad.focusAreas} />
                  </>
                )}

                {ad.predictions && ad.predictions.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Predictions')}</Text>
                    <BulletList items={ad.predictions} />
                  </>
                )}

                {ad.advice && (
                  <View style={styles.highlight}>
                    <Text style={styles.bodyText}>{localizePdfUiText(ad.advice)}</Text>
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
                <Text style={styles.paragraph}>{localizePdfUiText(mdGroup.overview || '')}</Text>

                {(mdGroup.antardashas || []).map((ad: any, idx: number) => (
                  <Card key={idx} title={`${mdGroup.mahadasha}/${ad.antardasha} (${ad.duration || ''})`}>
                    <InfoRow label="Period" value={`${ad.startDate || ''} to ${ad.endDate || ''}`} />
                    <Text style={styles.paragraph}>{localizePdfUiText(ad.interpretation || '')}</Text>

                    {ad.focusAreas && ad.focusAreas.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Focus Areas')}</Text>
                        <BulletList items={ad.focusAreas} />
                      </>
                    )}

                    {ad.advice && (
                      <View style={styles.highlight}>
                        <Text style={styles.bodyText}>{localizePdfUiText(ad.advice)}</Text>
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
            <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.yoginiDasha.systemExplanation || '')}</Text>

            <SubSection title={`${localizePdfUiText('Current Yogini')}: ${localizePdfUiText(report.dasha.yoginiDasha.currentYogini?.name || 'N/A')}`}>
              <View style={styles.card}>
                <InfoRow label="Associated Planet" value={localizePdfUiText(report.dasha.yoginiDasha.currentYogini?.planet || 'N/A')} />
                <InfoRow label="Duration" value={`${report.dasha.yoginiDasha.currentYogini?.years || 0} ${localizePdfUiText('years')}`} />
                <InfoRow label="Period" value={`${report.dasha.yoginiDasha.currentYogini?.startDate || ''} to ${report.dasha.yoginiDasha.currentYogini?.endDate || ''}`} />
              </View>

              <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.yoginiDasha.currentYogini?.characteristics || '')}</Text>
              
              {report.dasha.yoginiDasha.currentYogini?.lifeThemes && report.dasha.yoginiDasha.currentYogini.lifeThemes.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Life Themes')}</Text>
                  <BulletList items={report.dasha.yoginiDasha.currentYogini.lifeThemes} />
                </>
              )}
              
              <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.yoginiDasha.currentYogini?.predictions || '')}</Text>
            </SubSection>

            <SubSection title="Upcoming Yogini Periods">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Yogini')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Years')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Period')}</Text>
                </View>
                {(report.dasha.yoginiDasha.upcomingYoginis || []).map((y: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.name)}</Text>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.planet)}</Text>
                    <Text style={styles.tableCell}>{y.years}</Text>
                    <Text style={styles.tableCell}>{y.approximatePeriod}</Text>
                  </View>
                ))}
              </View>

              {(report.dasha.yoginiDasha.upcomingYoginis || []).slice(0, 3).map((y: any, idx: number) => (
                <Card key={idx} title={`${localizePdfUiText(y.name)} (${localizePdfUiText(y.planet)})`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(y.briefPrediction)}</Text>
                </Card>
              ))}
            </SubSection>

            <SubSection title="Complete Yogini Dasha Cycle (36 Years)">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Yogini')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Years')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Nature')}</Text>
                </View>
                {(report.dasha.yoginiDasha.yoginiSequence || []).map((y: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.name)}</Text>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.planet)}</Text>
                    <Text style={styles.tableCell}>{y.years}</Text>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.nature)}</Text>
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
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Type')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Period')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Focus')}</Text>
                  </View>
                  {report.dasha.upcomingDashas.map((dasha: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{localizePdfUiText(dasha.type)}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(dasha.planet)}</Text>
                      <Text style={styles.tableCell}>{dasha.period}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(dasha.focus)}</Text>
                    </View>
                  ))}
                </View>
              </SubSection>
            )}

            <SubSection title="Complete Dasha Sequence (Vimshottari 120-Year Cycle)">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Years')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Approximate Period')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Life Focus')}</Text>
                </View>
                {(report.dasha.dashaSequence || []).map((dasha: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{localizePdfUiText(dasha.planet)}</Text>
                    <Text style={styles.tableCell}>{dasha.years}</Text>
                    <Text style={styles.tableCell}>{dasha.approximatePeriod}</Text>
                    <Text style={styles.tableCell}>{localizePdfUiText(dasha.lifeFocus)}</Text>
                  </View>
                ))}
              </View>
            </SubSection>

            {report.dasha.currentTransitImpact && (
              <SubSection title="Current Transit Impact">
                <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.currentTransitImpact)}</Text>
              </SubSection>
            )}

            {report.dasha.periodRecommendations && report.dasha.periodRecommendations.length > 0 && (
              <SubSection title="Period Recommendations">
                <BulletList items={report.dasha.periodRecommendations} />
              </SubSection>
            )}

            <SubSection title="Spiritual Guidance">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.dasha.spiritualGuidance || '')}</Text>
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
            <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.overview || '')}</Text>

            <SubSection title="Karmic Axis">
              <InfoRow label="Rahu" value={`${localizePdfUiText(report.rahuKetu.karmicAxis?.rahuSign || '')} (${localizePdfUiText('House')} ${report.rahuKetu.karmicAxis?.rahuHouse || ''})`} />
              <InfoRow label="Ketu" value={`${localizePdfUiText(report.rahuKetu.karmicAxis?.ketuSign || '')} (${localizePdfUiText('House')} ${report.rahuKetu.karmicAxis?.ketuHouse || ''})`} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.karmicAxis?.axisInterpretation || '')}</Text>
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{localizePdfUiText('Life Lesson')}: </Text>
                <Text style={styles.bodyText}>{localizePdfUiText(report.rahuKetu.karmicAxis?.lifeLesson || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="Rahu Analysis (Future Direction)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.rahuAnalysis?.interpretation || '')}</Text>
              <InfoRow label="Desires" value={report.rahuKetu.rahuAnalysis?.desires || 'N/A'} />
              <InfoRow label="Growth Areas" value={report.rahuKetu.rahuAnalysis?.growthAreas || 'N/A'} />
            </SubSection>

            <SubSection title="Ketu Analysis (Past Life Karma)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.ketuAnalysis?.interpretation || '')}</Text>
              <InfoRow label="Natural Talents" value={report.rahuKetu.ketuAnalysis?.naturalTalents || 'N/A'} />
              <InfoRow label="Spiritual Gifts" value={report.rahuKetu.ketuAnalysis?.spiritualGifts || 'N/A'} />
            </SubSection>

            {report.rahuKetu.kaalSarpYoga?.present && (
              <SubSection title="Kaal Sarp Yoga">
                <View style={styles.highlight}>
                  <Text style={styles.boldLabel}>{localizePdfUiText('Type')}: {report.rahuKetu.kaalSarpYoga.type}</Text>
                  <Text style={styles.bodyText}>{localizePdfUiText('Severity')}: {report.rahuKetu.kaalSarpYoga.severity}</Text>
                </View>
                <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.kaalSarpYoga.effects || '')}</Text>
                <Text style={styles.subSubHeader}>{localizePdfUiText('Remedies')}</Text>
                <BulletList items={report.rahuKetu.kaalSarpYoga.remedies || []} />
              </SubSection>
            )}

            <SubSection title="Spiritual Path">
              <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.spiritualPath || '')}</Text>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Doshas Analysis - Standardized Template */}
      {report.doshas && (
        <>
          <ContentPage sectionName="Dosha Analysis">
            <Section title="Dosha Analysis">
              <Text style={styles.paragraph}>{localizePdfUiText(report.doshas.overview || '')}</Text>
              
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{localizePdfUiText('Total Doshas Detected')}: {doshaDisplayTotal}</Text>
              </View>
              {removedSadeSatiDoshaCount > 0 && (
                <View style={styles.infoBox}>
                  <Text style={styles.bodyText}>
                    {localizePdfUiText('Sade Sati cards are intentionally removed from Dosha pages and handled only in the dedicated Sade Sati section to prevent conflicting status.')}
                  </Text>
                </View>
              )}

              <SubSection title="Major Doshas">
                {majorDoshasFiltered.map((dosha: any, idx: number) => (
                  <Card key={idx} title={`${localizePdfUiText(dosha.nameHindi || dosha.name)}`}>
                    <InfoStrip items={[
                      { label: 'Status', value: localizePdfUiText(dosha.status?.toUpperCase() || 'N/A') },
                      { label: 'Severity', value: localizePdfUiText(dosha.severity?.toUpperCase() || 'N/A') },
                    ]} />
                    
                    <Text style={styles.paragraph}>{localizePdfUiText(dosha.description)}</Text>

                    {dosha.cause && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Cause')}</Text>
                        <Text style={styles.bodyText}>{localizePdfUiText(dosha.cause)}</Text>
                      </>
                    )}
                    
                    {dosha.effects && dosha.effects.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Effects')}</Text>
                        <BulletList items={dosha.effects} />
                      </>
                    )}
                    
                    {dosha.affectedLifeAreas && dosha.affectedLifeAreas.length > 0 && (
                      <InfoRow label="Affected Areas" value={dosha.affectedLifeAreas.join(', ')} />
                    )}
                    
                    {dosha.nullificationReason && (
                      <View style={styles.highlight}>
                        <Text style={styles.successText}>{localizePdfUiText('Nullified')}: {dosha.nullificationReason}</Text>
                      </View>
                    )}
                    
                    <Text style={styles.scriptural}>{localizePdfUiText(dosha.scripturalReference)}</Text>
                  </Card>
                ))}
              </SubSection>
            </Section>
          </ContentPage>

          {/* Minor Doshas */}
          {minorDoshasFiltered.length > 0 && (
            <ContentPage sectionName="Minor Doshas">
              <Section title="Minor Doshas">
                {minorDoshasFiltered.map((dosha: any, idx: number) => (
                  <Card key={idx} title={`${localizePdfUiText(dosha.nameHindi || dosha.name)}`}>
                    <InfoStrip items={[
                      { label: 'Status', value: localizePdfUiText(dosha.status?.toUpperCase() || 'N/A') },
                    ]} />
                    <Text style={styles.paragraph}>{localizePdfUiText(dosha.description)}</Text>
                    {dosha.cause && <Text style={styles.bodyText}>{localizePdfUiText('Cause')}: {localizePdfUiText(dosha.cause)}</Text>}
                    {dosha.effects && dosha.effects.length > 0 && <BulletList items={dosha.effects} />}
                  </Card>
                ))}
              </Section>
            </ContentPage>
          )}

          {/* Dosha Remedies */}
          {doshaRemediesFiltered.length > 0 && (
            <ContentPage sectionName="Dosha Remedies">
              <Section title="Dosha Remedies">
                <SubSection title="Priority Remedies">
                  {report.doshas.priorityRemedies && (
                    <>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Immediate (Start Now)')}</Text>
                      <BulletList items={report.doshas.priorityRemedies.immediate || []} />

                      <Text style={styles.subSubHeader}>{localizePdfUiText('Short-Term (1-3 Months)')}</Text>
                      <BulletList items={report.doshas.priorityRemedies.shortTerm || []} />

                      <Text style={styles.subSubHeader}>{localizePdfUiText('Long-Term (Ongoing)')}</Text>
                      <BulletList items={report.doshas.priorityRemedies.longTerm || []} />
                    </>
                  )}
                </SubSection>

                {doshaRemediesFiltered.map((remedy: any, idx: number) => (
                  <Card key={idx} title={`${localizePdfUiText('Remedies for')} ${remedy.doshaName}`}>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Primary Remedy')}: {remedy.primaryRemedy?.name}</Text>
                    <InfoRow label="Type" value={remedy.primaryRemedy?.type || 'N/A'} />
                    <Text style={styles.bodyText}>{localizePdfUiText(remedy.primaryRemedy?.description)}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Procedure')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(remedy.primaryRemedy?.procedure)}</Text>

                    <InfoRow label="Timing" value={remedy.primaryRemedy?.timing || 'N/A'} />

                    {remedy.primaryRemedy?.expectedBenefits && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Expected Benefits')}</Text>
                        <BulletList items={remedy.primaryRemedy.expectedBenefits} />
                      </>
                    )}
                    
                    <Text style={styles.scriptural}>{localizePdfUiText(remedy.primaryRemedy?.scripturalBasis)}</Text>
                    
                    {remedy.mantras && remedy.mantras.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Mantras')}</Text>
                        {remedy.mantras.map((m: any, mIdx: number) => (
                          <View key={mIdx} style={{ marginBottom: 5 }}>
                            <Text style={[styles.boldLabel, { color: '#c2410c' }]}>{m.mantra}</Text>
                            <Text style={styles.bodyText}>{localizePdfUiText('Deity')}: {m.deity} | {localizePdfUiText('Count')}: {m.japaCount} | {localizePdfUiText('Timing')}: {m.timing}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </Card>
                ))}

                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.doshas.generalGuidance || '')}</Text>
                </View>

                <Text style={styles.scriptural}>{localizePdfUiText(report.doshas.disclaimerNote || '')}</Text>
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
              <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.overview || '')}</Text>

              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{localizePdfUiText('Total Yogas Detected')}: {report.rajYogs.totalYogasDetected || 0}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText('Overall Strength')}: {localizePdfUiText(report.rajYogs.overallYogaStrength?.rating?.toUpperCase() || 'N/A')}</Text>
              </View>

              <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.overallYogaStrength?.description || '')}</Text>

              <SubSection title="Raja Yogas (Power & Success)">
                {(report.rajYogs.rajYogas || []).filter((y: any) => y.isPresent).map((yoga: any, idx: number) => (
                  <Card key={idx} title={`${localizePdfUiText(yoga.nameHindi || yoga.name)}`}>
                    <InfoStrip items={[
                      { label: 'Strength', value: yoga.strength?.toUpperCase() || 'N/A' },
                      { label: 'Activation', value: yoga.activationPeriod || 'N/A' },
                    ]} />
                    
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Definition')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.definition)}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Formation in Your Chart')}</Text>
                    <View style={styles.highlight}>
                      <Text style={styles.bodyText}>{localizePdfUiText(yoga.formationInChart)}</Text>
                    </View>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                    <BulletList items={yoga.benefits || []} />

                    <InfoRow label="Activation Period" value={localizePdfUiText(yoga.activationPeriod || 'N/A')} />

                    <Text style={styles.scriptural}>{localizePdfUiText(yoga.scripturalReference)}</Text>
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
                  <Card key={idx} title={`${localizePdfUiText(yoga.nameHindi || yoga.name)}`}>
                    <InfoStrip items={[
                      { label: 'Strength', value: yoga.strength?.toUpperCase() || 'N/A' },
                    ]} />
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.definition)}</Text>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('In Your Chart')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.formationInChart)}</Text>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                    <BulletList items={yoga.benefits || []} />
                    <InfoRow label="Activation" value={localizePdfUiText(yoga.activationPeriod || 'N/A')} />
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
                  <InfoRow label="Strength" value={localizePdfUiText(report.rajYogs.lifePredictions.career?.strength || 'N/A')} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.lifePredictions.career?.prediction || '')}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.career?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Wealth">
                  <InfoRow label="Strength" value={localizePdfUiText(report.rajYogs.lifePredictions.wealth?.strength || 'N/A')} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.lifePredictions.wealth?.prediction || '')}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.wealth?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Fame & Recognition">
                  <InfoRow label="Strength" value={localizePdfUiText(report.rajYogs.lifePredictions.fame?.strength || 'N/A')} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.lifePredictions.fame?.prediction || '')}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.fame?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Spirituality">
                  <InfoRow label="Strength" value={localizePdfUiText(report.rajYogs.lifePredictions.spirituality?.strength || 'N/A')} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.lifePredictions.spirituality?.prediction || '')}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.spirituality?.peakPeriod || 'N/A'} />
                </SubSection>

                {report.rajYogs.yogaEnhancement && (
                  <SubSection title="Yoga Enhancement">
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Practices to Strengthen Yogas')}</Text>
                    <BulletList items={report.rajYogs.yogaEnhancement.practices || []} />
                    
                    {report.rajYogs.yogaEnhancement.mantras && report.rajYogs.yogaEnhancement.mantras.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Mantras')}</Text>
                        {report.rajYogs.yogaEnhancement.mantras.map((m: any, idx: number) => (
                          <View key={idx} style={{ marginBottom: 5 }}>
                            <Text style={styles.boldLabel}>{m.mantra}</Text>
                            <Text style={styles.bodyText}>{localizePdfUiText('Purpose')}: {m.purpose} | {localizePdfUiText('Timing')}: {m.timing}</Text>
                          </View>
                        ))}
                      </>
                    )}
                    
                    <InfoRow label="Recommended Gemstones" value={(report.rajYogs.yogaEnhancement.gemstones || []).join(', ')} />
                    <InfoRow label="Favorable Periods" value={(report.rajYogs.yogaEnhancement.favorablePeriods || []).join(', ')} />
                  </SubSection>
                )}

                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.rajYogs.summaryNote || '')}</Text>
                </View>
              </Section>
            </ContentPage>
          )}

          {/* Challenging Yogas */}
          {report.rajYogs.challengingYogas && report.rajYogs.challengingYogas.filter((y: any) => y.isPresent).length > 0 && (
            <ContentPage sectionName="Challenging Yogas">
              <Section title="Challenging Yogas (For Awareness)">
                <Text style={styles.paragraph}>
                  {localizePdfUiText('The following challenging combinations are present in your chart. Awareness of these helps you navigate difficulties and apply appropriate remedies.')}
                </Text>
                {report.rajYogs.challengingYogas.filter((y: any) => y.isPresent).map((yoga: any, idx: number) => (
                  <Card key={idx} title={`${localizePdfUiText(yoga.nameHindi || yoga.name)}`}>
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.definition)}</Text>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('In Your Chart')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.formationInChart)}</Text>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Effects')}</Text>
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
              <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.overview || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.importanceExplanation || '')}</Text>

              <SubSection title="Your Sade Sati Status">
                <View style={styles.highlight}>
                  <View style={styles.row}>
                    <Text style={styles.label}>{localizePdfUiText('Moon Sign')}</Text>
                    <Text style={[styles.value, { fontWeight: 'bold' }]}>
                      {sadeSatiMoonSign || 'N/A'}{getActivePdfLanguage() !== 'en' && report.sadeSati.moonSignHindi ? ` (${sanitizeText(report.sadeSati.moonSignHindi)})` : ''}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>{localizePdfUiText('Transit Saturn')}</Text>
                    <Text style={styles.value}>{sadeSatiTransitSign}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>{localizePdfUiText('Currently Active')}</Text>
                    <Text style={[styles.value, { fontWeight: 'bold', color: sadeSatiIsActive ? '#dc2626' : '#059669' }]}>
                      {sadeSatiIsActive
                        ? localizePdfUiText('YES — ACTIVE NOW')
                        : localizePdfUiText('Not Currently Active')}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>{localizePdfUiText('Current Phase')}</Text>
                    <Text style={styles.value}>
                      {sadeSatiCurrentPhaseLabel}
                    </Text>
                  </View>
                </View>
                {report.sadeSati.currentPhaseInterpretation && (
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentPhaseInterpretation)}</Text>
                )}
              </SubSection>

              <SubSection title="The Moon-Saturn Relationship in Your Chart">
                <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.moonSaturnRelationship || '')}</Text>
              </SubSection>
            </Section>
          </ContentPage>

          {/* Page 2: The Three Phases */}
          {sadeSatiPhasesForDisplay.length > 0 && (
            <ContentPage sectionName="Sade Sati">
              <Section title="The Three Phases of Your Sade Sati">
                <Text style={styles.scriptural}>
                  {localizePdfUiText('Month-level periods below are approximate transit windows derived from Saturn phase sequencing.')}
                </Text>
                {sadeSatiPhasesForDisplay.map((phase: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 6 }}>
                    <Text style={styles.subHeader}>{phase.phaseName}</Text>
                    <View style={styles.card}>
                      <View style={styles.row}>
                        <Text style={styles.label}>{localizePdfUiText('Saturn Sign')}</Text>
                        <Text style={styles.value}>{phase.saturnSign || 'N/A'}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>{localizePdfUiText('Period')}</Text>
                        <Text style={styles.value}>{phase.periodLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.paragraph}>{localizePdfUiText(phase.description || '')}</Text>
                    <View style={styles.grid2}>
                      {phase.challenges && phase.challenges.length > 0 && (
                        <View style={styles.gridItem}>
                          <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges to Navigate')}</Text>
                          <BulletList items={phase.challenges} maxWidth={210} />
                        </View>
                      )}
                      {phase.hidden_blessings && phase.hidden_blessings.length > 0 && (
                        <View style={styles.gridItem}>
                          <Text style={styles.subSubHeader}>{localizePdfUiText('Hidden Blessings')}</Text>
                          <BulletList items={phase.hidden_blessings} maxWidth={210} />
                        </View>
                      )}
                    </View>
                    {phase.advice && (
                      <View style={styles.highlight}>
                        <Text style={[styles.boldLabel, { marginBottom: 2 }]}>{localizePdfUiText('Guidance for This Phase')}</Text>
                        <Text style={styles.bodyText}>{localizePdfUiText(phase.advice)}</Text>
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
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentSadeSati.overallTheme || '')}</Text>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Phase 1 — The Rising (Building Pressure)')}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentSadeSati.phase1 || '')}</Text>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Phase 2 — The Peak (Maximum Intensity)')}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentSadeSati.phase2 || '')}</Text>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Phase 3 — The Setting (Harvest & Release)')}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentSadeSati.phase3 || '')}</Text>
                  <View style={styles.grid2}>
                    {report.sadeSati.currentSadeSati.whatToExpect && (
                      <View style={styles.gridItem}>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('What to Expect')}</Text>
                        <BulletList items={report.sadeSati.currentSadeSati.whatToExpect} maxWidth={210} />
                      </View>
                    )}
                    {report.sadeSati.currentSadeSati.opportunities && (
                      <View style={styles.gridItem}>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Unique Opportunities')}</Text>
                        <BulletList items={report.sadeSati.currentSadeSati.opportunities} maxWidth={210} />
                      </View>
                    )}
                  </View>
                  {report.sadeSati.currentSadeSati.whatNotToDo && (
                    <>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('What to Avoid')}</Text>
                      <BulletList items={report.sadeSati.currentSadeSati.whatNotToDo} />
                    </>
                  )}
                  {report.sadeSati.currentSadeSati.advice && (
                    <View style={[styles.highlight, { marginTop: 4 }]}>
                      <Text style={[styles.boldLabel, { marginBottom: 4 }]}>{localizePdfUiText('Master Guidance for Your Sade Sati')}</Text>
                      <Text style={styles.bodyText}>{localizePdfUiText(report.sadeSati.currentSadeSati.advice)}</Text>
                    </View>
                  )}
                </SubSection>
              )}

              {report.sadeSati.pastSadeSati && !report.sadeSati.currentSadeSati && (
                <SubSection title={`Past Sade Sati: ${report.sadeSati.pastSadeSati.period}`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.pastSadeSati.keyLessons || '')}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.pastSadeSati.lifeEvents || '')}</Text>
                </SubSection>
              )}

              {report.sadeSati.nextSadeSati && (
                <SubSection title={`Next Sade Sati: ${report.sadeSati.nextSadeSati.period}`}>
                  <InfoRow label="Approximate Start" value={report.sadeSati.nextSadeSati.approximateStart || 'N/A'} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.nextSadeSati.preparationAdvice || '')}</Text>
                </SubSection>
              )}
            </Section>
          </ContentPage>

          {/* Page 4: Remedies & Spiritual Significance */}
          <ContentPage sectionName="Sade Sati">
            <Section title="Sade Sati — Remedies & Spiritual Significance">
              <SubSection title="Spiritual Significance">
                <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.spiritualSignificance || '')}</Text>
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
                        <Text style={styles.label}>{localizePdfUiText('Purpose')}</Text>
                        <Text style={styles.value}>{m.purpose}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>{localizePdfUiText('Best Time')}</Text>
                        <Text style={styles.value}>{m.timing}</Text>
                      </View>
                    </View>
                  ))}
                </SubSection>
              )}

              {report.sadeSati.famousPeopleThrivedDuringSadeSati && (
                <View style={styles.highlight}>
                  <Text style={[styles.boldLabel, { marginBottom: 2 }]}>{localizePdfUiText('Inspiration — Famous People Who Thrived During Sade Sati')}</Text>
                  <Text style={styles.scriptural}>{localizePdfUiText(report.sadeSati.famousPeopleThrivedDuringSadeSati)}</Text>
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
            <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.overview || '')}</Text>

            <SubSection title={`${localizePdfUiText('Birth Number (Mulank)')}: ${report.numerology.birthNumber?.number || ''}`}>
              <InfoRow label="Planet" value={localizePdfUiText(report.numerology.birthNumber?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.birthNumber?.interpretation || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.birthNumber?.personality || '')}</Text>
            </SubSection>

            <SubSection title={`${localizePdfUiText('Destiny Number (Bhagyank)')}: ${report.numerology.destinyNumber?.number || ''}`}>
              <InfoRow label="Planet" value={localizePdfUiText(report.numerology.destinyNumber?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.destinyNumber?.interpretation || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.destinyNumber?.lifePath || '')}</Text>
            </SubSection>

            <SubSection title={`${localizePdfUiText('Name Number')}: ${report.numerology.nameNumber?.number || ''}`}>
              <InfoRow label="Planet" value={localizePdfUiText(report.numerology.nameNumber?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.nameNumber?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Lucky Associations">
              <InfoRow label="Lucky Numbers" value={(report.numerology.luckyNumbers || []).join(', ')} />
              <InfoRow label="Unlucky Numbers" value={(report.numerology.unluckyNumbers || []).join(', ')} />
              <InfoRow label="Lucky Days" value={(report.numerology.luckyDays || []).join(', ')} />
              <InfoRow label="Lucky Colors" value={(report.numerology.luckyColors || []).join(', ')} />
            </SubSection>

            <SubSection title={`Personal Year ${new Date().getFullYear()}: ${report.numerology.yearPrediction?.personalYear || ''}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.yearPrediction?.interpretation || '')}</Text>
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
            <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.overview || '')}</Text>

            <SubSection title="Spiritual Rating">
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{localizePdfUiText(report.spiritual.spiritualPotential?.rating || 'N/A')}</Text>
              </View>
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.spiritualPotential?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Atmakaraka (Soul Purpose)">
              <InfoRow label="Planet" value={localizePdfUiText(report.spiritual.atmakaraka?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.atmakaraka?.soulPurpose || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.atmakaraka?.spiritualLesson || '')}</Text>
            </SubSection>

            <SubSection title="9th House (Dharma)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.ninthHouse?.interpretation || '')}</Text>
              <InfoRow label="Dharma Path" value={report.spiritual.ninthHouse?.dharmaPath || 'N/A'} />
            </SubSection>

            <SubSection title="12th House (Moksha)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.twelfthHouse?.interpretation || '')}</Text>
              <InfoRow label="Liberation Path" value={report.spiritual.twelfthHouse?.mokshaIndications || 'N/A'} />
            </SubSection>

            <SubSection title="Ishta Devata (Personal Deity)">
              <InfoRow label="Deity" value={report.spiritual.ishtaDevata?.deity || 'N/A'} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.ishtaDevata?.reason || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.ishtaDevata?.worship || '')}</Text>
            </SubSection>

            <SubSection title="Meditation Guidance">
              <InfoRow label="Style" value={report.spiritual.meditationStyle?.recommended || 'N/A'} />
              <InfoRow label="Best Timing" value={report.spiritual.meditationStyle?.timing || 'N/A'} />
              {report.spiritual.meditationStyle?.techniques && (
                <BulletList items={report.spiritual.meditationStyle.techniques} />
              )}
            </SubSection>

            <SubSection title="Moksha Path">
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.mokshaPath || '')}</Text>
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
              {localizePdfUiText('Before exploring specific remedies, it is essential to understand the profound science and tradition behind Vedic Upayas (remedial measures). This section explains why these remedies work and how they have been validated through millennia of practice.')}
            </Text>

            <SubSection title="Vedic Foundation">
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.remediesPhilosophy.vedicFoundation || '')}</Text>
            </SubSection>

            <SubSection title="How Remedies Work">
              <View style={styles.card}>
                <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.remediesPhilosophy.howRemediesWork || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="The Role of Faith and Intention">
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.remediesPhilosophy.importanceOfFaith || '')}</Text>
            </SubSection>

            <SubSection title="Scientific Perspective">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.remediesPhilosophy.scientificPerspective || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="Traditional Wisdom">
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.remediesPhilosophy.traditionalWisdom || '')}</Text>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Gemstones with Trust Details */}
      {report.remedies && (
        <ContentPage sectionName="Gemstone Therapy">
          <Section title="Gemstone Therapy (Ratna Shastra)">
            <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.gemologyExplanation || 'Gemstones have been used in Vedic astrology for millennia to harness planetary energies and balance cosmic influences.')}</Text>

            <SubSection title={`${localizePdfUiText('Primary Gemstone')}: ${localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.stone || 'N/A')}`}>
              <View style={styles.card}>
                <InfoRow label="Planet" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.planet || 'N/A')} />
                <InfoRow label="Weight" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.weight || 'N/A')} />
                <InfoRow label="Metal" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.metal || 'N/A')} />
                <InfoRow label="Finger" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.finger || 'N/A')} />
                <InfoRow label="Day to Wear" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.day || 'N/A')} />
              </View>
              
              <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.benefits || '')}</Text>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Reference')}</Text>
              <View style={styles.highlight}>
                <Text style={styles.scriptural}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.scripturalReference || '')}</Text>
              </View>

              <Text style={styles.subSubHeader}>{localizePdfUiText('How It Works')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.howItWorks || '')}</Text>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Scientific Basis')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.scientificBasis || '')}</Text>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Quality Guidelines')}</Text>
              <View style={styles.card}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.qualityGuidelines || '')}</Text>
              </View>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Cautions')}</Text>
              <Text style={styles.cautionText}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.cautions || '')}</Text>
            </SubSection>

            {report.remedies.gemstoneRecommendations?.secondary && (
              <SubSection title={`${localizePdfUiText('Secondary Gemstone')}: ${localizePdfUiText(report.remedies.gemstoneRecommendations.secondary.stone)}`}>
                <InfoRow label="Planet" value={localizePdfUiText(report.remedies.gemstoneRecommendations.secondary.planet || 'N/A')} />
                <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations.secondary.benefits || '')}</Text>
                <Text style={styles.scriptural}>{localizePdfUiText(report.remedies.gemstoneRecommendations.secondary.scripturalReference || '')}</Text>
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
              {localizePdfUiText('Rudraksha beads are sacred seeds from the Elaeocarpus ganitrus tree, revered for their spiritual and healing properties. Each Mukhi (face) of Rudraksha resonates with specific planetary energies.')}
            </Text>

            {report.remedies.rudrakshaRecommendations.map((rud: any, idx: number) => (
              <Card key={idx} title={`${rud.mukhi} ${localizePdfUiText('Mukhi Rudraksha')} - ${localizePdfUiText(rud.name)}`}>
                <InfoRow label="Associated Planet" value={localizePdfUiText(rud.planet)} />

                <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                <Text style={styles.paragraph}>{localizePdfUiText(rud.benefits)}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Wearing Instructions')}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText(rud.wearingInstructions)}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Reference')}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{localizePdfUiText(rud.scripturalReference || '')}</Text>
                </View>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Scientific Basis')}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText(rud.scientificBasis || '')}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('How to Verify Authenticity')}</Text>
                <Text style={styles.successText}>{localizePdfUiText(rud.authenticity || '')}</Text>
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
              {localizePdfUiText('Mantras are sacred sound vibrations that connect the practitioner to cosmic energies. The science of Mantra Shastra explains how specific sound frequencies can influence planetary energies and transform consciousness.')}
            </Text>

            {report.remedies.mantras.map((mantra: any, idx: number) => (
              <Card key={idx} title={`${localizePdfUiText(mantra.planet)} ${localizePdfUiText('Mantra')}`}>
                <Text style={[styles.boldLabel, { color: '#c2410c', marginBottom: 2 }]}>{mantra.mantra}</Text>

                <View style={styles.row}>
                  <InfoRow label="Japa Count" value={String(mantra.japaCount)} />
                </View>
                <InfoRow label="Timing" value={localizePdfUiText(mantra.timing)} />
                <InfoRow label="Pronunciation" value={mantra.pronunciation} />

                <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                <Text style={styles.paragraph}>{localizePdfUiText(mantra.benefits)}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Source')}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{localizePdfUiText(mantra.scripturalSource || '')}</Text>
                </View>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Vibrational Science')}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText(mantra.vibrationalScience || '')}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Proper Method')}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText(mantra.properMethod || '')}</Text>
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
                  {localizePdfUiText('Yantras are sacred geometric diagrams that serve as focal points for meditation and planetary propitiation. Each Yantra embodies specific cosmic energies through precise mathematical proportions.')}
                </Text>
                {report.remedies.yantras.map((yantra: any, idx: number) => (
                  <Card key={idx} title={localizePdfUiText(yantra.name)}>
                    <InfoRow label="Planet" value={localizePdfUiText(yantra.planet)} />
                    <InfoRow label="Placement" value={localizePdfUiText(yantra.placement)} />
                    <Text style={styles.paragraph}>{localizePdfUiText(yantra.benefits)}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Geometric Significance')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yantra.geometricSignificance || '')}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Consecration Method')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yantra.consecrationMethod || '')}</Text>

                    <Text style={styles.scriptural}>{localizePdfUiText(yantra.scripturalReference || '')}</Text>
                  </Card>
                ))}
              </SubSection>
            )}

            {report.remedies.pujaRecommendations && report.remedies.pujaRecommendations.length > 0 && (
              <SubSection title="Recommended Pujas">
                {report.remedies.pujaRecommendations.map((puja: any, idx: number) => (
                  <Card key={idx} title={localizePdfUiText(puja.name)}>
                    <InfoRow label="Deity" value={localizePdfUiText(puja.deity)} />
                    <InfoRow label="Purpose" value={localizePdfUiText(puja.purpose)} />
                    <InfoRow label="Frequency" value={localizePdfUiText(puja.frequency)} />

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                    <BulletList items={puja.benefits || []} />

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Basis')}</Text>
                    <Text style={styles.scriptural}>{localizePdfUiText(puja.scripturalBasis || '')}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Procedure')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(puja.procedure || '')}</Text>
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
              <Card title={localizePdfUiText(report.remedies.ishtaDevata?.deity || 'N/A')}>
                <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.ishtaDevata?.reason || '')}</Text>

                <InfoRow label="Worship Method" value={localizePdfUiText(report.remedies.ishtaDevata?.worship || 'N/A')} />
                <InfoRow label="Mantra" value={report.remedies.ishtaDevata?.mantra || 'N/A'} />
                <InfoRow label="Temple Visit" value={localizePdfUiText(report.remedies.ishtaDevata?.templeVisit || 'N/A')} />

                <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Derivation')}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{localizePdfUiText(report.remedies.ishtaDevata?.scripturalDerivation || '')}</Text>
                </View>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Significance')}</Text>
                <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.ishtaDevata?.significance || '')}</Text>
              </Card>
            </SubSection>

            <SubSection title="Fasting Recommendations (Vrata)">
              {(report.remedies.fasting || []).map((fast: any, idx: number) => (
                <Card key={idx} title={`${localizePdfUiText(fast.day)} - ${localizePdfUiText(fast.planet)}`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(fast.method)}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(fast.benefits)}</Text>

                  <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Reference')}</Text>
                  <Text style={styles.scriptural}>{localizePdfUiText(fast.scripturalReference || '')}</Text>

                  <Text style={styles.subSubHeader}>{localizePdfUiText('Physiological Benefits')}</Text>
                  <Text style={styles.bodyText}>{localizePdfUiText(fast.physiologicalBenefits || '')}</Text>
                </Card>
              ))}
            </SubSection>

            <SubSection title="Donations (Daan)">
              {(report.remedies.donations || []).map((don: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 5 }}>
                  <Text style={styles.boldLabel}>{localizePdfUiText(don.day)} - {localizePdfUiText(don.item)}</Text>
                  <Text style={styles.bodyText}>{localizePdfUiText('Planet')}: {localizePdfUiText(don.planet)} | {localizePdfUiText(don.reason)}</Text>
                  <Text style={styles.scriptural}>{localizePdfUiText(don.scripturalReference || '')}</Text>
                  <Text style={styles.successText}>{localizePdfUiText(don.karmaScience || '')}</Text>
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
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.colorTherapy?.explanation || '')}</Text>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Scientific Basis')}</Text>
              <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.colorTherapy?.scientificBasis || '')}</Text>
            </SubSection>

            <SubSection title="Direction Guidance (Vastu)">
              <InfoRow label="Favorable Directions" value={(report.remedies.directionGuidance?.favorable || []).join(', ')} />
              <InfoRow label="Directions to Avoid" value={(report.remedies.directionGuidance?.avoid || []).join(', ')} />
              <InfoRow label="Sleep Direction" value={report.remedies.directionGuidance?.sleepDirection || 'N/A'} />
              <InfoRow label="Work Direction" value={report.remedies.directionGuidance?.workDirection || 'N/A'} />
              
              <Text style={styles.subSubHeader}>{localizePdfUiText('Vastu Explanation')}</Text>
              <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.directionGuidance?.vastuExplanation || '')}</Text>
            </SubSection>

            <SubSection title="Daily Routine Recommendations">
              <BulletList items={report.remedies.dailyRoutine || []} />
            </SubSection>

            <SubSection title="Daily Spiritual Practices">
              <BulletList items={report.remedies.spiritualPractices || []} />
            </SubSection>

            <SubSection title="General Advice">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.generalAdvice || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="Weak Planets Summary">
              {(report.remedies.weakPlanets || []).map((wp: any, idx: number) => (
                <View key={idx} style={styles.row}>
                  <Text style={styles.label}>{localizePdfUiText(wp.planet)}:</Text>
                  <Text style={styles.value}>{localizePdfUiText(wp.reason)} ({localizePdfUiText('Severity')}: {localizePdfUiText(wp.severity)})</Text>
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
              <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.overview || '')}</Text>

              <SubSection title="Understanding the Jaimini System">
                <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.jaiminiSystemExplanation || '')}</Text>
              </SubSection>

              <SubSection title="Your Chara Karakas">
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Karaka')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Sign')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('House')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Signification')}</Text>
                  </View>
                  {(report.charaKarakasDetailed.karakaInterpretations || []).map((k: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{localizePdfUiText(k.karaka)}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(k.planet)}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(k.sign)}</Text>
                      <Text style={styles.tableCell}>{k.house}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(k.signification)}</Text>
                    </View>
                  ))}
                </View>
              </SubSection>
            </Section>
          </ContentPage>

          {/* Atmakaraka Special Analysis */}
          {report.charaKarakasDetailed.atmakarakaSpecial && (
            <ContentPage sectionName="Atmakaraka Analysis">
              <Section title={`${localizePdfUiText('Atmakaraka')}: ${report.charaKarakasDetailed.atmakarakaSpecial.planet} - ${localizePdfUiText('Soul Significator')}`}>
                <View style={styles.card}>
                  <Text style={[styles.boldLabel, { color: '#c2410c', marginBottom: 4 }]}>
                    {localizePdfUiText('The Atmakaraka is the most important planet in Jaimini astrology, representing your soul\'s purpose.')}
                  </Text>
                </View>

                <SubSection title="Soul Purpose">
                  <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.atmakarakaSpecial.soulPurpose || '')}</Text>
                </SubSection>

                <SubSection title="Spiritual Lesson">
                  <View style={styles.highlight}>
                    <Text style={styles.bodyText}>{localizePdfUiText(report.charaKarakasDetailed.atmakarakaSpecial.spiritualLesson || '')}</Text>
                  </View>
                </SubSection>

                <SubSection title={`${localizePdfUiText('Karakamsa')}: ${localizePdfUiText(report.charaKarakasDetailed.atmakarakaSpecial.karakamsaSign || '')}`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.atmakarakaSpecial.karakamsaInterpretation || '')}</Text>
                </SubSection>
              </Section>

              {/* Darakaraka Special Analysis */}
              {report.charaKarakasDetailed.darakarakaSpecial && (
                <Section title={`${localizePdfUiText('Darakaraka')}: ${report.charaKarakasDetailed.darakarakaSpecial.planet} - ${localizePdfUiText('Spouse Significator')}`}>
                  <SubSection title="Spouse Characteristics">
                    <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.darakarakaSpecial.spouseCharacteristics || '')}</Text>
                  </SubSection>

                  <SubSection title="Marriage Indications">
                    <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.darakarakaSpecial.marriageIndications || '')}</Text>
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
              <Section title={`${localizePdfUiText('Amatyakaraka')}: ${report.charaKarakasDetailed.amatyakarakaSpecial.planet} - ${localizePdfUiText('Career Significator')}`}>
                <SubSection title="Career Direction">
                  <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.amatyakarakaSpecial.careerDirection || '')}</Text>
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
                    <Text style={styles.paragraph}>{localizePdfUiText(interaction.interaction)}</Text>
                    <View style={styles.highlight}>
                      <Text style={styles.bodyText}>{localizePdfUiText('Effect')}: {localizePdfUiText(interaction.effect)}</Text>
                    </View>
                  </Card>
                ))}
              </Section>
            )}

            <SubSection title="Scriptural References">
              <View style={styles.card}>
                <Text style={styles.scriptural}>{localizePdfUiText(report.charaKarakasDetailed.scripturalReferences || '')}</Text>
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
              <Section title={`${localizePdfUiText(karaka.karaka)}: ${localizePdfUiText(karaka.planet)} ${localizePdfUiText('in')} ${localizePdfUiText(karaka.sign)}`}>
                <View style={styles.card}>
                  <InfoRow label="House" value={String(karaka.house)} />
                  <InfoRow label="Degree" value={`${degreeWithinSign(karaka.degree ?? 0).toFixed(2)}°`} />
                  <InfoRow label="Signification" value={localizePdfUiText(karaka.signification || '')} />
                </View>

                <SubSection title="Detailed Interpretation">
                  <Text style={styles.paragraph}>{localizePdfUiText(karaka.detailedInterpretation || '')}</Text>
                </SubSection>

                <SubSection title="Life Impact">
                  <Text style={styles.paragraph}>{localizePdfUiText(karaka.lifeImpact || '')}</Text>
                </SubSection>

                <View style={styles.grid2}>
                  {karaka.strengths && karaka.strengths.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Strengths')}</Text>
                      <BulletList items={karaka.strengths} maxWidth={210} />
                    </View>
                  )}
                  {karaka.challenges && karaka.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges')}</Text>
                      <BulletList items={karaka.challenges} maxWidth={210} />
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
                    <Text style={styles.paragraph}>{localizePdfUiText(karaka.timing)}</Text>
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
              <Text style={styles.paragraph}>{localizePdfUiText(report.glossary.introduction || '')}</Text>

              <SubSection title="Quick Reference">
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Term')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Definition')}</Text>
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
                <Text style={styles.paragraph}>{localizePdfUiText(section.categoryDescription || '')}</Text>

                {(section.terms || []).map((term: any, tIdx: number) => (
                  <Card key={tIdx} title={`${term.term}${term.termSanskrit ? ' (' + sanitizeText(term.termSanskrit) + ')' : ''}`}>
                    <Text style={[styles.scriptural, { marginBottom: 4 }]}>{localizePdfUiText('Pronunciation')}: {term.pronunciation}</Text>

                    <Text style={[styles.boldLabel, { marginBottom: 3 }]}>{localizePdfUiText(term.definition)}</Text>

                    <Text style={styles.paragraph}>{localizePdfUiText(term.detailedExplanation)}</Text>

                    {term.example && (
                      <View style={styles.highlight}>
                        <Text style={styles.bodyText}>{localizePdfUiText('Example')}: {term.example}</Text>
                      </View>
                    )}

                    {term.relatedTerms && term.relatedTerms.length > 0 && (
                      <Text style={styles.accentText}>{localizePdfUiText('Related')}: {term.relatedTerms.join(', ')}</Text>
                    )}
                  </Card>
                ))}
              </Section>
            </ContentPage>
          ))}

        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          THANK YOU / CLOSING PAGE
          ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={[styles.coverPage, { fontFamily: getActivePdfFontFamily() }]}>

        {/* Spacer to push content toward vertical center */}
        <View style={{ marginTop: 260 }} />

        {/* Decorative line above */}
        <View style={{ width: 60, height: 2, backgroundColor: '#f59e0b', marginBottom: 28, opacity: 0.7 }} />

        <Text style={{
          fontSize: 38,
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: 8,
          letterSpacing: 2,
        }}>
          {localizePdfUiText('THANK YOU')}
        </Text>

        {/* Divider ornament */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <View style={{ width: 40, height: 1, backgroundColor: '#fbbf24', opacity: 0.5 }} />
          <Text style={{ color: '#fbbf24', fontSize: 12, marginHorizontal: 12, opacity: 0.8 }}>✦</Text>
          <View style={{ width: 40, height: 1, backgroundColor: '#fbbf24', opacity: 0.5 }} />
        </View>

        <Text style={{
          fontSize: 11,
          color: '#fff7ed',
          textAlign: 'center',
          lineHeight: 1.6,
          marginBottom: 36,
          paddingHorizontal: 60,
          opacity: 0.9,
        }}>
          {localizePdfUiText('Thank you for choosing Sri Mandir for your Kundli report. We hope this personalized Vedic astrology blueprint brings you clarity, guidance, and confidence on your life journey.')}
        </Text>

        {/* Consultation CTA */}
        <View style={{
          backgroundColor: 'rgba(92, 29, 12, 0.70)',
          borderWidth: 1,
          borderColor: 'rgba(249, 115, 22, 0.45)',
          borderRadius: 8,
          paddingVertical: 16,
          paddingHorizontal: 24,
          marginBottom: 28,
          marginHorizontal: 60,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 10, color: '#fcd34d', marginBottom: 8, opacity: 0.85 }}>
            {localizePdfUiText('For personalized consultations with our expert astrologers')}
          </Text>
          <Text style={{ fontSize: 13, color: '#ffffff', fontWeight: 'bold', letterSpacing: 0.5 }}>
            {getActivePdfLanguage() === 'hi'
              ? 'कॉल या व्हाट्सऐप: 080 711 74417'
              : getActivePdfLanguage() === 'te'
                ? 'కాల్ లేదా వాట్సాప్: 080 711 74417'
                : getActivePdfLanguage() === 'kn'
                  ? 'ಕರೆ ಮಾಡಿ ಅಥವಾ ವಾಟ್ಸ್‌ಆ್ಯಪ್: 080 711 74417'
                  : getActivePdfLanguage() === 'mr'
                    ? 'कॉल किंवा व्हॉट्सॲप: 080 711 74417'
                    : getActivePdfLanguage() === 'ta'
                      ? 'அழைக்கவும் அல்லது வாட்ஸ்அப்: 080 711 74417'
                      : 'Call or WhatsApp: 080 711 74417'}
          </Text>
        </View>

        {/* Website link */}
        <Text style={{
          fontSize: 11,
          color: '#fbbf24',
          letterSpacing: 0.8,
          marginBottom: 6,
        }}>
          www.srimandir.com
        </Text>
        {/* Blessing */}
        <Text style={{
          fontSize: 12,
          color: '#fbbf24',
          textAlign: 'center',
          fontWeight: 'bold',
          fontStyle: 'italic',
          opacity: 0.85,
          letterSpacing: 0.4,
        }}>
          {localizePdfUiText('May the stars guide your path')}
        </Text>

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={styles.dividerFooter}>
            {getActivePdfLanguage() === 'hi' || getActivePdfLanguage() === 'mr'
              ? 'श्री मंदिर — धर्म, कर्म, ज्योतिष'
              : getActivePdfLanguage() === 'te'
                ? 'శ్రీ మందిర్ — ధర్మ, కర్మ, జ్యోతిష్యం'
                : getActivePdfLanguage() === 'kn'
                  ? 'ಶ್ರೀ ಮಂದಿರ — ಧರ್ಮ, ಕರ್ಮ, ಜ್ಯೋತಿಷ'
                  : getActivePdfLanguage() === 'ta'
                    ? 'ஸ்ரீ மந்திர் — தர்மம், கர்மா, ஜோதிடம்'
                    : 'Sri Mandir — Dharma, Karma, Jyotish'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default KundliPDFDocument;
