import { PLACE_TRANSLIT } from './i18n/placeNames';
import { getActivePdfLanguage } from './localization';

/**
 * Transliterate an English place name to the active PDF language.
 */
export const translitPlace = (name: string): string => {
  const lang = getActivePdfLanguage();
  if (!name || lang === 'en') return name;
  const map = PLACE_TRANSLIT[lang];
  if (!map) return name;
  // Exact match first
  if (map[name]) return map[name];
  // Strip trailing punctuation/dashes (backend sometimes appends "-" or "।")
  const cleaned = name.replace(/[-\u2013\u2014\u0964.]+$/, '').trim();
  if (cleaned && map[cleaned]) return map[cleaned];
  // Try removing "District" / "Division" suffix (e.g., "Mumbai Suburban District" → "Mumbai Suburban")
  const withoutSuffix = cleaned.replace(/\s+(District|Division|Region|Taluk|Tehsil)$/i, '').trim();
  if (withoutSuffix && map[withoutSuffix]) return map[withoutSuffix];
  return name;
};

/** Known Indian states/UTs — used to detect when a state is misidentified as a country */
const INDIAN_STATES = new Set([
  'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
  'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
  'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
  'nagaland', 'odisha', 'orissa', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
  'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
  // Union territories
  'andaman and nicobar islands', 'chandigarh', 'dadra and nagar haveli',
  'daman and diu', 'delhi', 'jammu and kashmir', 'ladakh', 'lakshadweep',
  'puducherry', 'pondicherry',
  // Common short forms
  'j&k', 'up', 'mp', 'hp', 'ap', 'tn', 'wb',
]);

function isIndianState(name: string): boolean {
  return INDIAN_STATES.has(name.toLowerCase().trim());
}

/** Determine the actual country from the place parts and coordinates */
function resolveCountry(parts: string[], fallback: any): string {
  // 1. If fallback explicitly has a country field, use it
  if (fallback?.country) {
    const c = String(fallback.country).trim();
    // But validate it's actually a country, not a state
    if (c && !isIndianState(c)) return c;
    // If the "country" field is actually an Indian state, fix it
    if (isIndianState(c)) return 'India';
  }

  // 2. Check if the last part of the place string is a known country
  if (parts.length > 2) {
    const lastPart = parts[parts.length - 1];
    // If last part is a state, country = India
    if (isIndianState(lastPart)) return 'India';
    // Otherwise, assume last part is the country
    return lastPart;
  }

  // 3. Check coordinates — if within India's bounding box, default to India
  const lat = Number(fallback?.latitude);
  const lon = Number(fallback?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97) return 'India';
  }

  // 4. Check timezone — IST (5.5) = India
  const tz = Number(fallback?.timezone);
  if (tz === 5.5) return 'India';

  // 5. If we still don't know, look at parts
  if (parts.length === 2) {
    // "City, State" format — if state is an Indian state, country = India
    if (isIndianState(parts[1])) return 'India';
  }

  return '';
}

/** Determine the state, excluding any country name from parts */
function resolveState(parts: string[], fallback: any): string {
  if (fallback?.state) return String(fallback.state).trim();

  if (parts.length === 2) {
    // "City, State" format
    return parts[1];
  }
  if (parts.length >= 3) {
    // "City, District, State, Country" or "City, District, State"
    // The state is typically the second-to-last or the second part
    const lastPart = parts[parts.length - 1];
    if (isIndianState(lastPart)) {
      // Last part IS the state (no country in string)
      return lastPart;
    }
    // Last part is country; second-to-last is state
    return parts[parts.length - 2] || parts[1] || '';
  }
  return '';
}

/**
 * Parse a comma-separated place string into city/state/country with transliteration.
 */
export const parsePlaceDetails = (place: string, fallback: any) => {
  const lang = getActivePdfLanguage();
  const parts = String(place || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  // Build a lat/lon fallback when no place text is available
  const lat = fallback?.latitude;
  const lon = fallback?.longitude;
  const hasCoords = lat != null && lon != null && (lat !== 0 || lon !== 0);
  const latNum = Number(lat);
  const lonNum = Number(lon);
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lonDir = lonNum >= 0 ? 'E' : 'W';
  const latLonFallback = hasCoords
    ? `${Math.abs(latNum).toFixed(4)}\u00B0${latDir}, ${Math.abs(lonNum).toFixed(4)}\u00B0${lonDir}`
    : (lang === 'hi' ? '\u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u0939\u0940\u0902' : lang === 'te' ? '\u0C05\u0C02\u0C26\u0C41\u0C2C\u0C3E\u0C1F\u0C41\u0C32\u0C4B \u0C32\u0C47\u0C26\u0C41' : lang === 'kn' ? '\u0CB2\u0CAD\u0CCD\u0CAF\u0CB5\u0CBF\u0CB2\u0CCD\u0CB2' : lang === 'mr' ? '\u0909\u092A\u0932\u092C\u094D\u0927 \u0928\u093E\u0939\u0940' : lang === 'ta' ? '\u0B95\u0BBF\u0B9F\u0BC8\u0B95\u0BCD\u0B95\u0BB5\u0BBF\u0BB2\u0BCD\u0BB2\u0BC8' : 'N/A');
  const rawCity = String(fallback?.city || parts[0] || latLonFallback);
  const rawState = resolveState(parts, fallback);
  const rawCountry = resolveCountry(parts, fallback);
  return {
    city: translitPlace(rawCity),
    state: translitPlace(rawState),
    country: translitPlace(rawCountry),
  };
};
