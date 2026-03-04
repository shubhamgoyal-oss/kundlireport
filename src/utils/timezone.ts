/**
 * Country-based timezone detection for Kundli report generation.
 *
 * Strategy:
 *  1. Extract country from geocoding result (Place.address.country or display_name)
 *  2. Map country → IANA timezone (single-tz countries) or resolve via lat/lon zones (multi-tz countries)
 *  3. Compute DST-aware UTC offset using Intl.DateTimeFormat
 *
 * Why country-based, not longitude-based?
 *  Countries at the same longitude can have different timezones (e.g., China uses UTC+8 across
 *  all longitudes, Spain uses CET despite being at 0° longitude).
 */

// ─── Single-timezone countries ──────────────────────────────────────────────
// Comprehensive map: country name (English, lowercase) → IANA timezone
const COUNTRY_TIMEZONE: Record<string, string> = {
  // South Asia
  india: 'Asia/Kolkata',
  'sri lanka': 'Asia/Colombo',
  nepal: 'Asia/Kathmandu',
  bangladesh: 'Asia/Dhaka',
  bhutan: 'Asia/Thimphu',
  maldives: 'Indian/Maldives',
  pakistan: 'Asia/Karachi',
  afghanistan: 'Asia/Kabul',
  myanmar: 'Asia/Yangon',
  // East Asia
  china: 'Asia/Shanghai',
  japan: 'Asia/Tokyo',
  'south korea': 'Asia/Seoul',
  'north korea': 'Asia/Pyongyang',
  taiwan: 'Asia/Taipei',
  'hong kong': 'Asia/Hong_Kong',
  macau: 'Asia/Macau',
  singapore: 'Asia/Singapore',
  // Southeast Asia
  thailand: 'Asia/Bangkok',
  vietnam: 'Asia/Ho_Chi_Minh',
  cambodia: 'Asia/Phnom_Penh',
  laos: 'Asia/Vientiane',
  philippines: 'Asia/Manila',
  // Middle East
  'united arab emirates': 'Asia/Dubai',
  uae: 'Asia/Dubai',
  'saudi arabia': 'Asia/Riyadh',
  qatar: 'Asia/Qatar',
  bahrain: 'Asia/Bahrain',
  kuwait: 'Asia/Kuwait',
  oman: 'Asia/Muscat',
  yemen: 'Asia/Aden',
  iraq: 'Asia/Baghdad',
  iran: 'Asia/Tehran',
  jordan: 'Asia/Amman',
  lebanon: 'Asia/Beirut',
  syria: 'Asia/Damascus',
  israel: 'Asia/Jerusalem',
  palestine: 'Asia/Hebron',
  // Central Asia
  uzbekistan: 'Asia/Tashkent',
  turkmenistan: 'Asia/Ashgabat',
  tajikistan: 'Asia/Dushanbe',
  kyrgyzstan: 'Asia/Bishkek',
  // Europe (single-tz)
  'united kingdom': 'Europe/London',
  uk: 'Europe/London',
  ireland: 'Europe/Dublin',
  iceland: 'Atlantic/Reykjavik',
  france: 'Europe/Paris',
  germany: 'Europe/Berlin',
  italy: 'Europe/Rome',
  spain: 'Europe/Madrid',
  netherlands: 'Europe/Amsterdam',
  belgium: 'Europe/Brussels',
  switzerland: 'Europe/Zurich',
  austria: 'Europe/Vienna',
  poland: 'Europe/Warsaw',
  'czech republic': 'Europe/Prague',
  czechia: 'Europe/Prague',
  slovakia: 'Europe/Bratislava',
  hungary: 'Europe/Budapest',
  romania: 'Europe/Bucharest',
  bulgaria: 'Europe/Sofia',
  greece: 'Europe/Athens',
  turkey: 'Europe/Istanbul',
  sweden: 'Europe/Stockholm',
  norway: 'Europe/Oslo',
  denmark: 'Europe/Copenhagen',
  finland: 'Europe/Helsinki',
  estonia: 'Europe/Tallinn',
  latvia: 'Europe/Riga',
  lithuania: 'Europe/Vilnius',
  croatia: 'Europe/Zagreb',
  serbia: 'Europe/Belgrade',
  'bosnia and herzegovina': 'Europe/Sarajevo',
  montenegro: 'Europe/Podgorica',
  'north macedonia': 'Europe/Skopje',
  albania: 'Europe/Tirane',
  slovenia: 'Europe/Ljubljana',
  'republic of kosovo': 'Europe/Belgrade',
  kosovo: 'Europe/Belgrade',
  belarus: 'Europe/Minsk',
  moldova: 'Europe/Chisinau',
  georgia: 'Asia/Tbilisi',
  armenia: 'Asia/Yerevan',
  azerbaijan: 'Asia/Baku',
  // Africa
  'south africa': 'Africa/Johannesburg',
  nigeria: 'Africa/Lagos',
  kenya: 'Africa/Nairobi',
  ethiopia: 'Africa/Addis_Ababa',
  egypt: 'Africa/Cairo',
  morocco: 'Africa/Casablanca',
  algeria: 'Africa/Algiers',
  tunisia: 'Africa/Tunis',
  libya: 'Africa/Tripoli',
  ghana: 'Africa/Accra',
  tanzania: 'Africa/Dar_es_Salaam',
  uganda: 'Africa/Kampala',
  rwanda: 'Africa/Kigali',
  sudan: 'Africa/Khartoum',
  'south sudan': 'Africa/Juba',
  senegal: 'Africa/Dakar',
  'ivory coast': 'Africa/Abidjan',
  "cote d'ivoire": 'Africa/Abidjan',
  cameroon: 'Africa/Douala',
  'democratic republic of the congo': 'Africa/Kinshasa',
  'democratic republic of congo': 'Africa/Kinshasa',
  congo: 'Africa/Brazzaville',
  angola: 'Africa/Luanda',
  mozambique: 'Africa/Maputo',
  zimbabwe: 'Africa/Harare',
  zambia: 'Africa/Lusaka',
  malawi: 'Africa/Blantyre',
  madagascar: 'Indian/Antananarivo',
  mauritius: 'Indian/Mauritius',
  botswana: 'Africa/Gaborone',
  namibia: 'Africa/Windhoek',
  // Americas (single-tz)
  colombia: 'America/Bogota',
  venezuela: 'America/Caracas',
  peru: 'America/Lima',
  chile: 'America/Santiago',
  argentina: 'America/Argentina/Buenos_Aires',
  uruguay: 'America/Montevideo',
  paraguay: 'America/Asuncion',
  bolivia: 'America/La_Paz',
  ecuador: 'America/Guayaquil',
  'costa rica': 'America/Costa_Rica',
  panama: 'America/Panama',
  'el salvador': 'America/El_Salvador',
  guatemala: 'America/Guatemala',
  honduras: 'America/Tegucigalpa',
  nicaragua: 'America/Managua',
  cuba: 'America/Havana',
  'dominican republic': 'America/Santo_Domingo',
  jamaica: 'America/Jamaica',
  haiti: 'America/Port-au-Prince',
  'trinidad and tobago': 'America/Port_of_Spain',
  guyana: 'America/Guyana',
  suriname: 'America/Paramaribo',
  // Oceania
  'new zealand': 'Pacific/Auckland',
  fiji: 'Pacific/Fiji',
  samoa: 'Pacific/Apia',
  tonga: 'Pacific/Tongatapu',
  // Other
  malaysia: 'Asia/Kuala_Lumpur',
  'east timor': 'Asia/Dili',
  'timor-leste': 'Asia/Dili',
};

// ─── Multi-timezone countries ───────────────────────────────────────────────
// For countries spanning multiple timezones, resolve using latitude/longitude zones.
interface TzZone {
  iana: string;
  lonMin: number;
  lonMax: number;
  latMin?: number;
  latMax?: number;
}

const MULTI_TZ_COUNTRIES: Record<string, TzZone[]> = {
  'united states': [
    { iana: 'Pacific/Honolulu', lonMin: -180, lonMax: -154 },
    { iana: 'America/Anchorage', lonMin: -180, lonMax: -130, latMin: 51, latMax: 72 },
    { iana: 'America/Los_Angeles', lonMin: -125, lonMax: -114 },
    { iana: 'America/Denver', lonMin: -114, lonMax: -102 },
    { iana: 'America/Chicago', lonMin: -102, lonMax: -87 },
    { iana: 'America/New_York', lonMin: -87, lonMax: -66 },
  ],
  usa: [
    { iana: 'Pacific/Honolulu', lonMin: -180, lonMax: -154 },
    { iana: 'America/Anchorage', lonMin: -180, lonMax: -130, latMin: 51, latMax: 72 },
    { iana: 'America/Los_Angeles', lonMin: -125, lonMax: -114 },
    { iana: 'America/Denver', lonMin: -114, lonMax: -102 },
    { iana: 'America/Chicago', lonMin: -102, lonMax: -87 },
    { iana: 'America/New_York', lonMin: -87, lonMax: -66 },
  ],
  'united states of america': [
    { iana: 'Pacific/Honolulu', lonMin: -180, lonMax: -154 },
    { iana: 'America/Anchorage', lonMin: -180, lonMax: -130, latMin: 51, latMax: 72 },
    { iana: 'America/Los_Angeles', lonMin: -125, lonMax: -114 },
    { iana: 'America/Denver', lonMin: -114, lonMax: -102 },
    { iana: 'America/Chicago', lonMin: -102, lonMax: -87 },
    { iana: 'America/New_York', lonMin: -87, lonMax: -66 },
  ],
  canada: [
    { iana: 'America/Vancouver', lonMin: -141, lonMax: -114 },
    { iana: 'America/Edmonton', lonMin: -114, lonMax: -102 },
    { iana: 'America/Winnipeg', lonMin: -102, lonMax: -87 },
    { iana: 'America/Toronto', lonMin: -87, lonMax: -60 },
    { iana: 'America/Halifax', lonMin: -60, lonMax: -52 },
    { iana: 'America/St_Johns', lonMin: -60, lonMax: -52, latMin: 46, latMax: 55 },
  ],
  russia: [
    { iana: 'Europe/Kaliningrad', lonMin: 19, lonMax: 23 },
    { iana: 'Europe/Moscow', lonMin: 23, lonMax: 45 },
    { iana: 'Europe/Samara', lonMin: 45, lonMax: 55 },
    { iana: 'Asia/Yekaterinburg', lonMin: 55, lonMax: 68 },
    { iana: 'Asia/Omsk', lonMin: 68, lonMax: 79 },
    { iana: 'Asia/Krasnoyarsk', lonMin: 79, lonMax: 97 },
    { iana: 'Asia/Irkutsk', lonMin: 97, lonMax: 113 },
    { iana: 'Asia/Yakutsk', lonMin: 113, lonMax: 130 },
    { iana: 'Asia/Vladivostok', lonMin: 130, lonMax: 143 },
    { iana: 'Asia/Magadan', lonMin: 143, lonMax: 160 },
    { iana: 'Asia/Kamchatka', lonMin: 160, lonMax: 180 },
  ],
  australia: [
    { iana: 'Australia/Perth', lonMin: 113, lonMax: 129 },
    { iana: 'Australia/Darwin', lonMin: 129, lonMax: 138, latMin: -20, latMax: -10 },
    { iana: 'Australia/Adelaide', lonMin: 129, lonMax: 141, latMin: -40, latMax: -20 },
    { iana: 'Australia/Sydney', lonMin: 141, lonMax: 154 },
    { iana: 'Australia/Brisbane', lonMin: 141, lonMax: 154, latMin: -29, latMax: -10 },
  ],
  brazil: [
    { iana: 'America/Manaus', lonMin: -73, lonMax: -56, latMin: -10, latMax: 5 },
    { iana: 'America/Cuiaba', lonMin: -60, lonMax: -50, latMin: -24, latMax: -10 },
    { iana: 'America/Sao_Paulo', lonMin: -53, lonMax: -34 },
    { iana: 'America/Recife', lonMin: -42, lonMax: -34, latMin: -10, latMax: 0 },
  ],
  mexico: [
    { iana: 'America/Tijuana', lonMin: -118, lonMax: -110 },
    { iana: 'America/Mazatlan', lonMin: -110, lonMax: -104 },
    { iana: 'America/Mexico_City', lonMin: -104, lonMax: -86 },
    { iana: 'America/Cancun', lonMin: -92, lonMax: -86, latMin: 17, latMax: 22 },
  ],
  indonesia: [
    { iana: 'Asia/Jakarta', lonMin: 95, lonMax: 115 },
    { iana: 'Asia/Makassar', lonMin: 115, lonMax: 130 },
    { iana: 'Asia/Jayapura', lonMin: 130, lonMax: 142 },
  ],
  // Kazakhstan spans 2 zones
  kazakhstan: [
    { iana: 'Asia/Oral', lonMin: 46, lonMax: 60 },
    { iana: 'Asia/Almaty', lonMin: 60, lonMax: 88 },
  ],
  // Mongolia
  mongolia: [
    { iana: 'Asia/Hovd', lonMin: 88, lonMax: 100 },
    { iana: 'Asia/Ulaanbaatar', lonMin: 100, lonMax: 120 },
  ],
  // Portugal
  portugal: [
    { iana: 'Atlantic/Azores', lonMin: -32, lonMax: -24 },
    { iana: 'Europe/Lisbon', lonMin: -10, lonMax: 0 },
  ],
  // Ukraine
  ukraine: [
    { iana: 'Europe/Kyiv', lonMin: 22, lonMax: 41 },
  ],
};

// ─── Core functions ─────────────────────────────────────────────────────────

/**
 * Compute UTC offset (in fractional hours) for a given IANA timezone at a specific date.
 * Uses Intl.DateTimeFormat with 'shortOffset'.
 *
 * @param ianaTimezone - e.g. 'America/New_York'
 * @param date - the date for offset calculation (defaults to now)
 * @returns UTC offset in hours (e.g. -5, 5.5, 5.75)
 */
function _getOffsetAtDate(ianaTimezone: string, date: Date): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: ianaTimezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    if (tzPart) {
      // Format: "GMT+5:30", "GMT-5", "GMT+10", "GMT"
      const match = tzPart.value.match(/GMT([+-])?(\d+)?(?::(\d+))?/);
      if (match) {
        const sign = match[1] === '-' ? -1 : 1;
        const hours = parseInt(match[2] || '0', 10);
        const minutes = parseInt(match[3] || '0', 10);
        return sign * (hours + minutes / 60);
      }
    }
  } catch (e) {
    console.warn(`[timezone] Failed to compute offset for ${ianaTimezone}:`, e);
  }
  return 0;
}

/**
 * Compute DST-aware UTC offset for a given IANA timezone at a specific date.
 *
 * @param ianaTimezone - e.g. 'America/New_York'
 * @param date - the date for DST calculation (defaults to now)
 * @returns UTC offset in hours (e.g. -5, -4, 5.5)
 */
export function getUtcOffsetHours(ianaTimezone: string, date?: Date): number {
  return _getOffsetAtDate(ianaTimezone, date || new Date());
}

/**
 * Extract country name from a Place object or display_name string.
 * Works with geocoding results from Nominatim, Photon, Google, or local DB.
 */
export function extractCountryFromPlace(place: {
  address?: { country?: string };
  display_name?: string;
}): string {
  // Direct address.country (available from all geocoding providers)
  if (place.address?.country) {
    return place.address.country;
  }

  // Parse from display_name: "City, State, Country" — last component
  if (place.display_name) {
    const parts = place.display_name.split(',').map((s) => s.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 1];
    }
  }

  return '';
}

export interface TimezoneResult {
  ianaTimezone: string;
  utcOffsetHours: number;
  displayLabel: string; // e.g. "UTC+5:30 (Asia/Kolkata)"
}

/**
 * Detect timezone for a birth place.
 * Returns DST-aware UTC offset at the birth date/time.
 *
 * @param country - Country name from geocoding (e.g. "India", "Kenya", "United States")
 * @param lat - Latitude (used for multi-tz countries)
 * @param lon - Longitude (used for multi-tz countries)
 * @param birthDate - Birth date "YYYY-MM-DD" for DST calculation
 * @param birthTime - Birth time "HH:MM" for DST precision
 */
export function detectTimezone(
  country: string,
  lat: number,
  lon: number,
  birthDate?: string,
  birthTime?: string,
): TimezoneResult {
  const countryLower = country.toLowerCase().trim();

  // Build reference date for DST-aware offset calculation
  let refDate: Date | undefined;
  if (birthDate) {
    const [y, m, d] = birthDate.split('-').map(Number);
    if (y && m && d) {
      const [hh, mm] = (birthTime || '12:00').split(':').map(Number);
      refDate = new Date(Date.UTC(y, m - 1, d, hh || 12, mm || 0));
    }
  }

  let iana: string | undefined;

  // 1. Check single-timezone countries
  iana = COUNTRY_TIMEZONE[countryLower];

  // 2. Check multi-timezone countries
  if (!iana) {
    const zones = MULTI_TZ_COUNTRIES[countryLower];
    if (zones) {
      // Find best matching zone by lat/lon
      for (const zone of zones) {
        const lonMatch = lon >= zone.lonMin && lon <= zone.lonMax;
        const latMatch =
          zone.latMin === undefined ||
          zone.latMax === undefined ||
          (lat >= zone.latMin && lat <= zone.latMax);
        if (lonMatch && latMatch) {
          iana = zone.iana;
          break;
        }
      }
      // Fallback to first zone if no coordinate match
      if (!iana && zones.length > 0) {
        iana = zones[0].iana;
      }
    }
  }

  // 3. If still unknown, use longitude-based rough estimate
  if (!iana) {
    iana = estimateFromLongitude(lat, lon);
  }

  const offset = getUtcOffsetHours(iana, refDate);
  const displayLabel = formatOffsetLabel(offset, iana);

  return { ianaTimezone: iana, utcOffsetHours: offset, displayLabel };
}

/**
 * Longitude-based fallback for countries not in our database.
 */
function estimateFromLongitude(lat: number, lon: number): string {
  // Round to nearest standard offset
  const offsetHours = Math.round(lon / 15);
  // Try to find a representative IANA zone
  // Common offset → zone mapping for fallback
  const offsetMap: Record<number, string> = {
    '-12': 'Etc/GMT+12',
    '-11': 'Pacific/Pago_Pago',
    '-10': 'Pacific/Honolulu',
    '-9': 'America/Anchorage',
    '-8': 'America/Los_Angeles',
    '-7': 'America/Denver',
    '-6': 'America/Chicago',
    '-5': 'America/New_York',
    '-4': 'America/Halifax',
    '-3': 'America/Sao_Paulo',
    '-2': 'Atlantic/South_Georgia',
    '-1': 'Atlantic/Azores',
    '0': 'UTC',
    '1': 'Europe/Paris',
    '2': 'Europe/Athens',
    '3': 'Africa/Nairobi',
    '4': 'Asia/Dubai',
    '5': 'Asia/Karachi',
    '6': 'Asia/Dhaka',
    '7': 'Asia/Bangkok',
    '8': 'Asia/Shanghai',
    '9': 'Asia/Tokyo',
    '10': 'Australia/Sydney',
    '11': 'Pacific/Noumea',
    '12': 'Pacific/Auckland',
  };
  return offsetMap[String(offsetHours) as unknown as number] || 'UTC';
}

/**
 * Format offset for display: "UTC+5:30 (Asia/Kolkata)"
 */
function formatOffsetLabel(offset: number, iana: string): string {
  const sign = offset >= 0 ? '+' : '-';
  const absOffset = Math.abs(offset);
  const hours = Math.floor(absOffset);
  const minutes = Math.round((absOffset - hours) * 60);
  const offsetStr = minutes > 0 ? `${hours}:${String(minutes).padStart(2, '0')}` : `${hours}`;
  return `UTC${sign}${offsetStr} (${iana})`;
}

/**
 * Get current browser's time zone
 */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
