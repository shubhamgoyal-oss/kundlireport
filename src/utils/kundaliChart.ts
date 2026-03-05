import { supabase } from '@/integrations/supabase/client';

export interface BirthDetails {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  lat: number;
  lon: number;
  tzone: number;
}

export type ChartType = 'North' | 'South';

// Divisional chart types supported by Seer API
export type DivisionalChart = 'D1' | 'D2' | 'D3' | 'D4' | 'D7' | 'D9' | 'D10' | 'D12' | 'D16' | 'D20' | 'D24' | 'D27' | 'D30' | 'D40' | 'D45' | 'D60';

export const CHART_INFO: Record<DivisionalChart, {
  name: string; nameHindi: string; nameTelugu: string; nameKannada: string; nameMarathi: string; nameTamil: string; nameGujarati?: string;
  purpose: string; purposeHindi: string; purposeTelugu: string; purposeTamil: string;
}> = {
  D1:  { name: 'Rashi (Birth Chart)', nameHindi: 'राशि चक्र', nameTelugu: 'జన్మ కుండలి', nameKannada: 'ಜನ್ಮ ಕುಂಡಲಿ', nameMarathi: 'जन्म कुंडली', nameTamil: 'ராசி குண்டலி', nameGujarati: 'જન્મ કુંડલી', purpose: 'Overall life assessment', purposeHindi: 'संपूर्ण जीवन आकलन', purposeTelugu: 'సమగ్ర జీవిత అంచనా', purposeTamil: 'முழுமையான வாழ்க்கை மதிப்பீடு' },
  D2:  { name: 'Hora', nameHindi: 'होरा', nameTelugu: 'హోరా కుండలి', nameKannada: 'ಹೋರಾ ಕುಂಡಲಿ', nameMarathi: 'होरा कुंडली', nameTamil: 'ஹோரா குண்டலி', purpose: 'Wealth and finances', purposeHindi: 'धन और वित्त', purposeTelugu: 'సంపద మరియు ఆర్థిక', purposeTamil: 'செல்வம் மற்றும் நிதி' },
  D3:  { name: 'Drekkana', nameHindi: 'द्रेक्काण', nameTelugu: 'ద్రేక్కాణ కుండలి', nameKannada: 'ದ್ರೇಕ್ಕಾಣ ಕುಂಡಲಿ', nameMarathi: 'द्रेक्काण कुंडली', nameTamil: 'த்ரேக்காணம் குண்டலி', purpose: 'Siblings and courage', purposeHindi: 'भाई-बहन और साहस', purposeTelugu: 'తోబుట్టువులు మరియు ధైర్యం', purposeTamil: 'உடன்பிறப்புகள் மற்றும் தைரியம்' },
  D4:  { name: 'Chaturthamsa', nameHindi: 'चतुर्थांश', nameTelugu: 'చతుర్థాంశ కుండలి', nameKannada: 'ಚತುರ್ಥಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'चतुर्थांश कुंडली', nameTamil: 'சதுர்த்தாம்சம் குண்டலி', purpose: 'Fortune and property', purposeHindi: 'भाग्य और संपत्ति', purposeTelugu: 'అదృష్టం మరియు ఆస్తి', purposeTamil: 'அதிர்ஷ்டம் மற்றும் சொத்து' },
  D7:  { name: 'Saptamsa', nameHindi: 'सप्तांश', nameTelugu: 'సప్తాంశ కుండలి', nameKannada: 'ಸಪ್ತಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'सप्तांश कुंडली', nameTamil: 'சப்தாம்சம் குண்டலி', purpose: 'Children and progeny', purposeHindi: 'संतान और संतति', purposeTelugu: 'సంతానం మరియు వారసులు', purposeTamil: 'குழந்தைகள் மற்றும் சந்ததி' },
  D9:  { name: 'Navamsa', nameHindi: 'नवांश', nameTelugu: 'నవాంశ కుండలి', nameKannada: 'ನವಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'नवांश कुंडली', nameTamil: 'நவாம்சம் குண்டலி', nameGujarati: 'નવાંશ કુંડલી', purpose: 'Marriage and spouse', purposeHindi: 'विवाह और जीवनसाथी', purposeTelugu: 'వివాహం మరియు జీవిత భాగస్వామి', purposeTamil: 'திருமணம் மற்றும் வாழ்க்கைத் துணை' },
  D10: { name: 'Dasamsa', nameHindi: 'दशांश', nameTelugu: 'దశాంశ కుండలి', nameKannada: 'ದಶಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'दशांश कुंडली', nameTamil: 'தசாம்சம் குண்டலி', purpose: 'Career and profession', purposeHindi: 'करियर और व्यवसाय', purposeTelugu: 'వృత్తి మరియు వ్యాపారం', purposeTamil: 'தொழில் மற்றும் வணிகம்' },
  D12: { name: 'Dwadasamsa', nameHindi: 'द्वादशांश', nameTelugu: 'ద్వాదశాంశ కుండలి', nameKannada: 'ದ್ವಾದಶಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'द्वादशांश कुंडली', nameTamil: 'த்வாதசாம்சம் குண்டலி', purpose: 'Parents and ancestry', purposeHindi: 'माता-पिता और वंश', purposeTelugu: 'తల్లిదండ్రులు మరియు వంశం', purposeTamil: 'பெற்றோர் மற்றும் வம்சம்' },
  D16: { name: 'Shodasamsa', nameHindi: 'षोडशांश', nameTelugu: 'షోడశాంశ కుండలి', nameKannada: 'ಷೋಡಶಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'षोडशांश कुंडली', nameTamil: 'ஷோடசாம்சம் குண்டலி', purpose: 'Vehicles and comforts', purposeHindi: 'वाहन और सुविधाएं', purposeTelugu: 'వాహనాలు మరియు సౌకర్యాలు', purposeTamil: 'வாகனங்கள் மற்றும் வசதிகள்' },
  D20: { name: 'Vimsamsa', nameHindi: 'विंशांश', nameTelugu: 'వింశాంశ కుండలి', nameKannada: 'ವಿಂಶಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'विंशांश कुंडली', nameTamil: 'விம்சாம்சம் குண்டலி', purpose: 'Spiritual progress', purposeHindi: 'आध्यात्मिक प्रगति', purposeTelugu: 'ఆధ్యాత్మిక ప్రగతి', purposeTamil: 'ஆன்மீக முன்னேற்றம்' },
  D24: { name: 'Chaturvimsamsa', nameHindi: 'चतुर्विंशांश', nameTelugu: 'చతుర్వింశాంశ కుండలి', nameKannada: 'ಚತುರ್ವಿಂಶಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'चतुर्विंशांश कुंडली', nameTamil: 'சதுர்விம்சாம்சம் குண்டலி', purpose: 'Education and learning', purposeHindi: 'शिक्षा और सीखना', purposeTelugu: 'విద్య మరియు నేర్చుకోవడం', purposeTamil: 'கல்வி மற்றும் கற்றல்' },
  D27: { name: 'Bhamsa', nameHindi: 'भांश', nameTelugu: 'సప్తవింశాంశ కుండలి', nameKannada: 'ಸಪ್ತವಿಂಶಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'सप्तविंशांश कुंडली', nameTamil: 'சப்தவிம்சாம்சம் குண்டலி', purpose: 'Strength and weakness', purposeHindi: 'शक्ति और कमजोरी', purposeTelugu: 'బలం మరియు బలహీనత', purposeTamil: 'பலம் மற்றும் பலவீனம்' },
  D30: { name: 'Trimsamsa', nameHindi: 'त्रिंशांश', nameTelugu: 'త్రింశాంశ కుండలి', nameKannada: 'ತ್ರಿಂಶಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'त्रिंशांश कुंडली', nameTamil: 'த்ரிம்சாம்சம் குண்டலி', purpose: 'Misfortune and evil', purposeHindi: 'दुर्भाग्य और बुराई', purposeTelugu: 'దురదృష్టం మరియు చెడు', purposeTamil: 'துரதிர்ஷ்டம் மற்றும் தீமை' },
  D40: { name: 'Khavedamsa', nameHindi: 'खवेदांश', nameTelugu: 'ఖవేదాంశ కుండలి', nameKannada: 'ಖವೇದಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'खवेदांश कुंडली', nameTamil: 'கவேதாம்சம் குண்டலி', purpose: 'Auspiciousness', purposeHindi: 'शुभता', purposeTelugu: 'శుభత్వం', purposeTamil: 'நற்பலன்' },
  D45: { name: 'Akshavedamsa', nameHindi: 'अक्षवेदांश', nameTelugu: 'అక్షవేదాంశ కుండలి', nameKannada: 'ಅಕ್ಷವೇದಾಂಶ ಕುಂಡಲಿ', nameMarathi: 'अक्षवेदांश कुंडली', nameTamil: 'அக்ஷவேதாம்சம் குண்டலி', purpose: 'Character and morals', purposeHindi: 'चरित्र और नैतिकता', purposeTelugu: 'వ్యక్తిత్వం మరియు నైతికత', purposeTamil: 'குணநலன் மற்றும் நெறிமுறை' },
  D60: { name: 'Shashtiamsa', nameHindi: 'षष्ट्यंश', nameTelugu: 'షష్ట్యంశ కుండలి', nameKannada: 'ಷಷ್ಟ್ಯಂಶ ಕುಂಡಲಿ', nameMarathi: 'षष्ट्यंश कुंडली', nameTamil: 'ஷஷ்ட்யாம்சம் குண்டலி', purpose: 'Past life karma', purposeHindi: 'पूर्वजन्म कर्म', purposeTelugu: 'పూర్వజన్మ కర్మ', purposeTamil: 'முற்பிறவி கர்மா' },
};

// Important charts for PDF report (12 key divisional charts)
export const PDF_CHARTS: DivisionalChart[] = [
  'D1',  // Rashi - Birth Chart
  'D2',  // Hora - Wealth
  'D3',  // Drekkana - Siblings
  'D4',  // Chaturthamsa - Fortune
  'D7',  // Saptamsa - Children
  'D9',  // Navamsa - Marriage
  'D10', // Dasamsa - Career
  'D12', // Dwadasamsa - Parents
  'D20', // Vimsamsa - Spiritual
  'D24', // Chaturvimsamsa - Education
  'D27', // Bhamsa - Strength
  'D60', // Shashtiamsa - Past Karma
];

interface CacheEntry {
  svg: string;
  timestamp: number;
}

// In-memory cache
const svgCache = new Map<string, CacheEntry>();

// Cache TTL: 30 minutes
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(birthDetails: BirthDetails, chartType: ChartType, language: string, divisionalChart: DivisionalChart): string {
  return `${divisionalChart}|${chartType}|svg|${birthDetails.day}-${birthDetails.month}-${birthDetails.year}-${birthDetails.hour}-${birthDetails.minute}-${birthDetails.lat}-${birthDetails.lon}-${birthDetails.tzone}|${language}`;
}

function getFromCache(key: string): string | null {
  // Try memory cache first
  const memEntry = svgCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < CACHE_TTL) {
    return memEntry.svg;
  }
  
  // Try sessionStorage
  try {
    const stored = sessionStorage.getItem(`kundali_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored) as CacheEntry;
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        // Restore to memory cache
        svgCache.set(key, parsed);
        return parsed.svg;
      }
      // Expired, remove it
      sessionStorage.removeItem(`kundali_${key}`);
    }
  } catch (e) {
    // sessionStorage not available or parse error
  }
  
  return null;
}

function setCache(key: string, svg: string): void {
  const entry: CacheEntry = { svg, timestamp: Date.now() };
  
  // Set memory cache
  svgCache.set(key, entry);
  
  // Try sessionStorage
  try {
    sessionStorage.setItem(`kundali_${key}`, JSON.stringify(entry));
  } catch (e) {
    // sessionStorage full or not available
  }
}

/**
 * Transform SVG string to be responsive
 */
function makeResponsiveSvg(svgString: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (!svg) return svgString;
    
    // Remove fixed width/height
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    
    // Ensure viewBox exists
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', '0 0 350 350');
    }
    
    // Set preserveAspectRatio
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // Set responsive style
    svg.setAttribute('style', 'width:100%;height:auto;display:block;');
    
    return new XMLSerializer().serializeToString(doc);
  } catch (e) {
    console.error('[kundaliChart] SVG transform error:', e);
    return svgString;
  }
}

export interface FetchKundaliOptions {
  birthDetails: BirthDetails;
  chartType: ChartType;
  language: 'en' | 'hi';
  divisionalChart?: DivisionalChart;
  signal?: AbortSignal;
}

export async function fetchKundaliSvg(options: FetchKundaliOptions): Promise<string> {
  const { birthDetails, chartType, language, divisionalChart = 'D1', signal } = options;
  
  const cacheKey = getCacheKey(birthDetails, chartType, language, divisionalChart);
  
  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[kundaliChart] Cache hit:', cacheKey);
    return cached;
  }
  
  console.log('[kundaliChart] Fetching:', cacheKey);
  
  const response = await supabase.functions.invoke('get-kundali-chart', {
    body: {
      ...birthDetails,
      chartType,
      language,
      divisionalChart
    }
  });

  // Check if aborted
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  let svg = response.error ? null : (response.data?.data?.svg as string | null);

  // Fallback: call Seer chart API directly from browser if edge function failed or returned no SVG
  if (!svg) {
    console.warn('[kundaliChart] Edge function failed/empty, trying direct API call for', divisionalChart);
    const directRes = await fetch(
      `https://api-sbox.a4b.io/gw2/seer/external/v1/chart/horo-image/${divisionalChart}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-fe-server': 'true',
          'x-afb-r-uid': '7160881',
        },
        body: JSON.stringify({
          day: birthDetails.day, month: birthDetails.month, year: birthDetails.year,
          hour: birthDetails.hour, minute: birthDetails.minute,
          lat: birthDetails.lat, lon: birthDetails.lon, tzone: birthDetails.tzone,
          chartType, image_type: 'svg', language,
        }),
        signal,
      }
    );
    if (directRes.ok) {
      const directData = await directRes.json();
      svg = (directData?.data?.svg as string) || null;
    }
  }

  if (!svg) {
    throw new Error(response.error?.message || 'No SVG data in response');
  }
  
  // Transform to responsive
  const responsiveSvg = makeResponsiveSvg(svg);
  
  // Cache the result
  setCache(cacheKey, responsiveSvg);
  
  return responsiveSvg;
}

export interface ChartData {
  type: DivisionalChart;
  name: string;
  nameHindi: string;
  nameTelugu: string;
  nameKannada: string;
  nameMarathi: string;
  nameTamil: string;
  purpose: string;
  svg: string;
  dataUrl?: string; // PNG data URL for PDF embedding (bypasses react-pdf SVG parser)
}

/**
 * Fetch multiple divisional charts in parallel
 */
export async function fetchMultipleCharts(
  birthDetails: BirthDetails,
  chartType: ChartType,
  language: 'en' | 'hi',
  charts: DivisionalChart[] = PDF_CHARTS
): Promise<ChartData[]> {
  const results = await Promise.allSettled(
    charts.map(async (chart) => {
      const svg = await fetchKundaliSvg({
        birthDetails,
        chartType,
        language,
        divisionalChart: chart
      });
      const info = CHART_INFO[chart];
      return {
        type: chart,
        name: info.name,
        nameHindi: info.nameHindi,
        nameTelugu: info.nameTelugu,
        nameKannada: info.nameKannada,
        nameMarathi: info.nameMarathi,
        nameTamil: info.nameTamil,
        purpose: info.purpose,
        svg
      };
    })
  );
  
  return results
    .filter((r): r is PromiseFulfilledResult<ChartData> => r.status === 'fulfilled')
    .map(r => r.value);
}