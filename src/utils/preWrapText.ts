/**
 * Pre-compute line breaks for Indic scripts using the browser's text shaping engine.
 *
 * @react-pdf/renderer's Knuth-Plass line breaker doesn't properly handle
 * Devanagari / Telugu / Kannada — it splits words mid-character. The browser's
 * Canvas API (backed by HarfBuzz) measures Indic text correctly. We use it to
 * determine where lines should break, then insert '\n' so react-pdf just
 * renders pre-broken lines without making its own line-breaking decisions.
 */

// Shared offscreen canvas — created once, reused across calls.
let _canvas: HTMLCanvasElement | null = null;
function getCanvas(): HTMLCanvasElement {
  if (!_canvas) {
    _canvas = document.createElement('canvas');
  }
  return _canvas;
}

// Track which fonts have been loaded into the browser (for canvas measurement).
const _loadedFonts = new Set<string>();

/**
 * Ensure a font is available to the browser's Canvas text measurement.
 * The same .ttf files served by Vite for @react-pdf are loaded via FontFace API.
 */
async function ensureFontLoaded(family: string, src: string): Promise<void> {
  if (_loadedFonts.has(family)) return;
  try {
    const face = new FontFace(family, `url(${src})`);
    await face.load();
    document.fonts.add(face);
    _loadedFonts.add(family);
  } catch (e) {
    console.warn(`[preWrapText] Failed to load font "${family}" from ${src}:`, e);
  }
}

/** Font config per language — matches KundliPDFDocument.tsx applyLanguageTypography(). */
const FONT_CONFIG: Record<string, { family: string; src: string; fontSize: number }> = {
  hi: { family: 'NotoSansDevanagari', src: '/fonts/NotoSansDevanagari-Regular.ttf', fontSize: 11.2 },
  mr: { family: 'NotoSansDevanagari', src: '/fonts/NotoSansDevanagari-Regular.ttf', fontSize: 11.2 },
  te: { family: 'NotoSansTelugu',     src: '/fonts/NotoSansTelugu-Regular.ttf',     fontSize: 11.2 },
  kn: { family: 'NotoSansKannada',    src: '/fonts/NotoSansKannada-Regular.ttf',    fontSize: 11.2 },
};

// Page layout constants (must match KundliPDFDocument.tsx styles)
// A4 = 595pt wide. paddingLeft=42, paddingRight=42 → 511pt content area.
// Paragraph text has paddingHorizontal=6 → 499pt text area.
// Use a conservative width to account for nested containers with extra padding.
const DEFAULT_MAX_WIDTH_PT = 460;

/**
 * Core line-wrapping logic (synchronous — assumes font already loaded in canvas).
 */
function wrapWithCanvas(
  text: string,
  ctx: CanvasRenderingContext2D,
  effectiveMax: number,
): string {
  // Split ONLY at ASCII spaces — each token is a word or space run.
  const tokens = text.split(/([ ]+)/g).filter(Boolean);

  const lines: string[] = [];
  let currentLine = '';

  for (const token of tokens) {
    const candidate = currentLine + token;
    const measured = ctx.measureText(candidate).width;

    if (measured <= effectiveMax) {
      currentLine = candidate;
    } else if (currentLine === '') {
      // Single word wider than the line — keep it whole (don't break words).
      currentLine = token;
    } else {
      lines.push(currentLine.trimEnd());
      currentLine = token.trim() === '' ? '' : token;
    }
  }

  if (currentLine) {
    lines.push(currentLine.trimEnd());
  }

  return lines.join('\n');
}

/**
 * Pre-wrap a text string so that line breaks occur only at word boundaries.
 * Async version — loads font if not already loaded.
 */
export async function preWrapText(
  text: string,
  language: string,
  fontSize: number,
  maxWidthPt: number,
): Promise<string> {
  if (!text || !text.trim()) return text;

  const config = FONT_CONFIG[language];
  if (!config) return text;

  await ensureFontLoaded(config.family, config.src);

  const canvas = getCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) return text;

  const SAFETY_FACTOR = 0.92;
  const effectiveMax = maxWidthPt * SAFETY_FACTOR;

  ctx.font = `${fontSize}px "${config.family}"`;

  return wrapWithCanvas(text, ctx, effectiveMax);
}

/**
 * Load fonts for a language into the browser. Call this ONCE before
 * generating a PDF so that preWrapReportTexts can run synchronously.
 */
export async function ensurePreWrapFontsLoaded(language: string): Promise<void> {
  const config = FONT_CONFIG[language];
  if (!config) return;
  await ensureFontLoaded(config.family, config.src);
}

/**
 * Synchronous text wrapping for use at render time inside KundliPDFDocument.
 *
 * IMPORTANT: Call `ensurePreWrapFontsLoaded(language)` once before generating
 * the PDF so the font is already loaded in the browser when this runs.
 *
 * @param text       - The string to wrap.
 * @param language   - Language code ('hi', 'mr', 'te', 'kn'). English returns unchanged.
 * @param maxWidthPt - Available width in PDF points (default: 460).
 * @returns          - Text with '\n' at computed word-boundary break points.
 */
export function wrapIndicSync(
  text: string | null | undefined,
  language: string,
  maxWidthPt: number = DEFAULT_MAX_WIDTH_PT,
): string {
  if (!text) return text || '';
  if (text.length < 40) return text;
  // Already has newlines — already wrapped (or pre-formatted)
  if (text.includes('\n')) return text;

  const config = FONT_CONFIG[language];
  if (!config) return text; // English — no wrapping needed

  const canvas = getCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) return text;

  const SAFETY_FACTOR = 0.92;
  const effectiveMax = maxWidthPt * SAFETY_FACTOR;
  ctx.font = `${config.fontSize}px "${config.family}"`;

  return wrapWithCanvas(text, ctx, effectiveMax);
}

/**
 * Pre-wrap ALL string fields in a report JSON object that are longer than
 * `minLength` characters. This deep-walks the object and modifies strings
 * in-place (on a shallow clone) so that react-pdf receives pre-broken text.
 *
 * Call `ensurePreWrapFontsLoaded(language)` first!
 *
 * @param report    - The Kundli report JSON (will NOT be mutated; returns a deep clone).
 * @param language  - Language code ('hi', 'mr', 'te', 'kn'). English returns unchanged.
 * @param maxWidthPt - Available width in PDF points (default: 460).
 * @returns         - Deep clone of report with pre-wrapped text fields.
 */
export function preWrapReportTexts(
  report: Record<string, unknown>,
  language: string,
  maxWidthPt: number = DEFAULT_MAX_WIDTH_PT,
): Record<string, unknown> {
  const config = FONT_CONFIG[language];
  if (!config) return report; // English — no wrapping needed

  const canvas = getCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) return report;

  const SAFETY_FACTOR = 0.92;
  const effectiveMax = maxWidthPt * SAFETY_FACTOR;
  // Use the body font size from the language config
  ctx.font = `${config.fontSize}px "${config.family}"`;

  const MIN_LENGTH = 40; // Only pre-wrap strings longer than this

  function deepWrap(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      if (obj.length < MIN_LENGTH) return obj;
      // Skip strings that already have newlines (e.g., pre-formatted)
      if (obj.includes('\n')) return obj;
      return wrapWithCanvas(obj, ctx!, effectiveMax);
    }

    if (Array.isArray(obj)) {
      return obj.map(deepWrap);
    }

    if (typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        // Skip known non-text fields (binary data, URLs, IDs)
        if (key === 'charts' || key === 'chartImages' || key === 'errors') {
          result[key] = value;
        } else {
          result[key] = deepWrap(value);
        }
      }
      return result;
    }

    return obj; // numbers, booleans, etc.
  }

  return deepWrap(report) as Record<string, unknown>;
}
