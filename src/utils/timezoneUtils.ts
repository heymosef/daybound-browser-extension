import { format as formatTz, toZonedTime } from "date-fns-tz";
import { format as formatLocal } from "date-fns";

export interface TimezoneConfig {
  id: string;
  timezone: string;
  label?: string;
  city?: string;
  country?: string;
  isHome?: boolean;
}

export interface AppSettings {
  use24Hour: boolean;
  theme: "light" | "dark" | "system";
  designTheme: "gamut" | "te-1" | "dos";
  showBadge: boolean;
  showWeekends: boolean;
}

export const getCommonTimezones = (): string[] => {
  if (
    typeof Intl !== "undefined" &&
    "supportedValuesOf" in Intl
  ) {
    try {
      // @ts-ignore
      return Intl.supportedValuesOf("timeZone");
    } catch (e) {
      console.warn("Intl.supportedValuesOf failed", e);
    }
  }

  // Fallback list
  return [
    "UTC",
    "America/New_York",
    "America/Los_Angeles",
    "America/Chicago",
    "America/Toronto",
    "America/Vancouver",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Asia/Tokyo",
    "Asia/Singapore",
    "Australia/Sydney",
    "Pacific/Auckland",
  ];
};

export const formatTimezoneTime = (
  date: Date,
  timezone: string,
  use24Hour: boolean,
) => {
  try {
    // We use the original date (timestamp) and pass timezone to formatTz
    const pattern = use24Hour ? "HH:mm" : "h:mm a";

    // formatTz from date-fns-tz handles the timezone conversion internally when 'timeZone' option is present
    return formatTz(date, pattern, { timeZone: timezone });
  } catch (e) {
    console.error("Format error", e);
    return "--:--";
  }
};

export const getAbbreviation = (
  date: Date,
  timezone: string,
) => {
  try {
    return formatTz(date, "zzz", { timeZone: timezone });
  } catch (e) {
    return "";
  }
};

export const getCityName = (timezone: string) => {
  const parts = timezone.split("/");
  return parts[parts.length - 1].replace(/_/g, " ");
};

export const getRegionName = (timezone: string) => {
  const parts = timezone.split("/");
  if (parts.length > 1) return parts[0];
  return "";
};

/**
 * Major city aliases → IANA timezone.
 * These cover well-known cities whose names don't appear in the IANA database.
 */
export const CITY_ALIASES: Record<
  string,
  { timezone: string; country: string }
> = {
  // ── US State Capitals ──
  Montgomery: { timezone: "America/Chicago", country: "USA" },
  Juneau: { timezone: "America/Juneau", country: "USA" },
  Phoenix: { timezone: "America/Phoenix", country: "USA" },
  "Little Rock": { timezone: "America/Chicago", country: "USA" },
  Sacramento: { timezone: "America/Los_Angeles", country: "USA" },
  Denver: { timezone: "America/Denver", country: "USA" },
  Hartford: { timezone: "America/New_York", country: "USA" },
  Dover: { timezone: "America/New_York", country: "USA" },
  Tallahassee: { timezone: "America/New_York", country: "USA" },
  Atlanta: { timezone: "America/New_York", country: "USA" },
  Honolulu: { timezone: "Pacific/Honolulu", country: "USA" },
  Boise: { timezone: "America/Boise", country: "USA" },
  Springfield: { timezone: "America/Chicago", country: "USA" },
  Indianapolis: { timezone: "America/Indiana/Indianapolis", country: "USA" },
  "Des Moines": { timezone: "America/Chicago", country: "USA" },
  Topeka: { timezone: "America/Chicago", country: "USA" },
  Frankfort: { timezone: "America/New_York", country: "USA" },
  "Baton Rouge": { timezone: "America/Chicago", country: "USA" },
  Augusta: { timezone: "America/New_York", country: "USA" },
  Annapolis: { timezone: "America/New_York", country: "USA" },
  Boston: { timezone: "America/New_York", country: "USA" },
  Lansing: { timezone: "America/Detroit", country: "USA" },
  "St. Paul": { timezone: "America/Chicago", country: "USA" },
  Jackson: { timezone: "America/Chicago", country: "USA" },
  "Jefferson City": { timezone: "America/Chicago", country: "USA" },
  Helena: { timezone: "America/Denver", country: "USA" },
  Lincoln: { timezone: "America/Chicago", country: "USA" },
  "Carson City": { timezone: "America/Los_Angeles", country: "USA" },
  Concord: { timezone: "America/New_York", country: "USA" },
  Trenton: { timezone: "America/New_York", country: "USA" },
  "Santa Fe": { timezone: "America/Denver", country: "USA" },
  Albany: { timezone: "America/New_York", country: "USA" },
  Raleigh: { timezone: "America/New_York", country: "USA" },
  Bismarck: { timezone: "America/North_Dakota/Center", country: "USA" },
  Columbus: { timezone: "America/New_York", country: "USA" },
  "Oklahoma City": { timezone: "America/Chicago", country: "USA" },
  Salem: { timezone: "America/Los_Angeles", country: "USA" },
  Harrisburg: { timezone: "America/New_York", country: "USA" },
  Providence: { timezone: "America/New_York", country: "USA" },
  Columbia: { timezone: "America/New_York", country: "USA" },
  Pierre: { timezone: "America/Chicago", country: "USA" },
  Nashville: { timezone: "America/Chicago", country: "USA" },
  Austin: { timezone: "America/Chicago", country: "USA" },
  "Salt Lake City": { timezone: "America/Denver", country: "USA" },
  Montpelier: { timezone: "America/New_York", country: "USA" },
  Richmond: { timezone: "America/New_York", country: "USA" },
  Olympia: { timezone: "America/Los_Angeles", country: "USA" },
  Charleston: { timezone: "America/New_York", country: "USA" },
  Madison: { timezone: "America/Chicago", country: "USA" },
  Cheyenne: { timezone: "America/Denver", country: "USA" },
  "Washington DC": { timezone: "America/New_York", country: "USA" },

  // ── Canadian Capitals ──
  Ottawa: { timezone: "America/Toronto", country: "Canada" },
  Edmonton: { timezone: "America/Edmonton", country: "Canada" },
  Victoria: { timezone: "America/Vancouver", country: "Canada" },
  Winnipeg: { timezone: "America/Winnipeg", country: "Canada" },
  Fredericton: { timezone: "America/Moncton", country: "Canada" },
  "St. John's": { timezone: "America/St_Johns", country: "Canada" },
  Halifax: { timezone: "America/Halifax", country: "Canada" },
  Toronto: { timezone: "America/Toronto", country: "Canada" },
  Charlottetown: { timezone: "America/Halifax", country: "Canada" },
  "Quebec City": { timezone: "America/Toronto", country: "Canada" },
  Regina: { timezone: "America/Regina", country: "Canada" },
  Yellowknife: { timezone: "America/Yellowknife", country: "Canada" },
  Iqaluit: { timezone: "America/Iqaluit", country: "Canada" },
  Whitehorse: { timezone: "America/Whitehorse", country: "Canada" },

  // ── World Capitals & Major Cities ──
  // UK/Europe
  London: { timezone: "Europe/London", country: "UK" },
  Edinburgh: { timezone: "Europe/London", country: "UK" },
  Cardiff: { timezone: "Europe/London", country: "UK" },
  Belfast: { timezone: "Europe/London", country: "UK" },
  Paris: { timezone: "Europe/Paris", country: "France" },
  Berlin: { timezone: "Europe/Berlin", country: "Germany" },
  Madrid: { timezone: "Europe/Madrid", country: "Spain" },
  Rome: { timezone: "Europe/Rome", country: "Italy" },
  Lisbon: { timezone: "Europe/Lisbon", country: "Portugal" },
  Vienna: { timezone: "Europe/Vienna", country: "Austria" },
  Brussels: { timezone: "Europe/Brussels", country: "Belgium" },
  Amsterdam: { timezone: "Europe/Amsterdam", country: "Netherlands" },
  "The Hague": { timezone: "Europe/Amsterdam", country: "Netherlands" },
  Bern: { timezone: "Europe/Zurich", country: "Switzerland" },
  Stockholm: { timezone: "Europe/Stockholm", country: "Sweden" },
  Oslo: { timezone: "Europe/Oslo", country: "Norway" },
  Copenhagen: { timezone: "Europe/Copenhagen", country: "Denmark" },
  Helsinki: { timezone: "Europe/Helsinki", country: "Finland" },
  Warsaw: { timezone: "Europe/Warsaw", country: "Poland" },
  Prague: { timezone: "Europe/Prague", country: "Czech Republic" },
  Budapest: { timezone: "Europe/Budapest", country: "Hungary" },
  Athens: { timezone: "Europe/Athens", country: "Greece" },
  Dublin: { timezone: "Europe/Dublin", country: "Ireland" },
  Moscow: { timezone: "Europe/Moscow", country: "Russia" },
  Kyiv: { timezone: "Europe/Kyiv", country: "Ukraine" },
  Bucharest: { timezone: "Europe/Bucharest", country: "Romania" },
  Sofia: { timezone: "Europe/Sofia", country: "Bulgaria" },
  Belgrade: { timezone: "Europe/Belgrade", country: "Serbia" },
  Zagreb: { timezone: "Europe/Zagreb", country: "Croatia" },
  Ankara: { timezone: "Europe/Istanbul", country: "Turkey" },
  Istanbul: { timezone: "Europe/Istanbul", country: "Turkey" },

  // Asia
  Beijing: { timezone: "Asia/Shanghai", country: "China" },
  Tokyo: { timezone: "Asia/Tokyo", country: "Japan" },
  Seoul: { timezone: "Asia/Seoul", country: "South Korea" },
  Pyongyang: { timezone: "Asia/Pyongyang", country: "North Korea" },
  "New Delhi": { timezone: "Asia/Kolkata", country: "India" },
  Mumbai: { timezone: "Asia/Kolkata", country: "India" },
  Bangkok: { timezone: "Asia/Bangkok", country: "Thailand" },
  Hanoi: { timezone: "Asia/Ho_Chi_Minh", country: "Vietnam" },
  Jakarta: { timezone: "Asia/Jakarta", country: "Indonesia" },
  "Kuala Lumpur": { timezone: "Asia/Kuala_Lumpur", country: "Malaysia" },
  Singapore: { timezone: "Asia/Singapore", country: "Singapore" },
  Manila: { timezone: "Asia/Manila", country: "Philippines" },
  Dhaka: { timezone: "Asia/Dhaka", country: "Bangladesh" },
  Islamabad: { timezone: "Asia/Karachi", country: "Pakistan" },
  Kabul: { timezone: "Asia/Kabul", country: "Afghanistan" },
  Tehran: { timezone: "Asia/Tehran", country: "Iran" },
  Baghdad: { timezone: "Asia/Baghdad", country: "Iraq" },
  Riyadh: { timezone: "Asia/Riyadh", country: "Saudi Arabia" },
  "Abu Dhabi": { timezone: "Asia/Dubai", country: "UAE" },
  Dubai: { timezone: "Asia/Dubai", country: "UAE" },
  Doha: { timezone: "Asia/Qatar", country: "Qatar" },
  Jerusalem: { timezone: "Asia/Jerusalem", country: "Israel" },
  Beirut: { timezone: "Asia/Beirut", country: "Lebanon" },
  Amman: { timezone: "Asia/Amman", country: "Jordan" },
  Damascus: { timezone: "Asia/Damascus", country: "Syria" },
  Ulaanbaatar: { timezone: "Asia/Ulaanbaatar", country: "Mongolia" },
  Kathmandu: { timezone: "Asia/Kathmandu", country: "Nepal" },
  Colombo: { timezone: "Asia/Colombo", country: "Sri Lanka" },
  Yangon: { timezone: "Asia/Yangon", country: "Myanmar" },
  "Phnom Penh": { timezone: "Asia/Phnom_Penh", country: "Cambodia" },
  Vientiane: { timezone: "Asia/Vientiane", country: "Laos" },
  Tashkent: { timezone: "Asia/Tashkent", country: "Uzbekistan" },
  Astana: { timezone: "Asia/Almaty", country: "Kazakhstan" },
  Baku: { timezone: "Asia/Baku", country: "Azerbaijan" },
  Yerevan: { timezone: "Asia/Yerevan", country: "Armenia" },
  Tbilisi: { timezone: "Asia/Tbilisi", country: "Georgia" },

  // Africa
  Cairo: { timezone: "Africa/Cairo", country: "Egypt" },
  Pretoria: { timezone: "Africa/Johannesburg", country: "South Africa" },
  "Cape Town": { timezone: "Africa/Johannesburg", country: "South Africa" },
  Nairobi: { timezone: "Africa/Nairobi", country: "Kenya" },
  Addis_Ababa: { timezone: "Africa/Addis_Ababa", country: "Ethiopia" },
  Lagos: { timezone: "Africa/Lagos", country: "Nigeria" },
  Abuja: { timezone: "Africa/Lagos", country: "Nigeria" },
  Accra: { timezone: "Africa/Accra", country: "Ghana" },
  Dakar: { timezone: "Africa/Dakar", country: "Senegal" },
  Casablanca: { timezone: "Africa/Casablanca", country: "Morocco" },
  Rabat: { timezone: "Africa/Casablanca", country: "Morocco" },
  Tunis: { timezone: "Africa/Tunis", country: "Tunisia" },
  Algiers: { timezone: "Africa/Algiers", country: "Algeria" },
  Tripoli: { timezone: "Africa/Tripoli", country: "Libya" },
  Khartoum: { timezone: "Africa/Khartoum", country: "Sudan" },

  // Oceania
  Canberra: { timezone: "Australia/Sydney", country: "Australia" },
  Sydney: { timezone: "Australia/Sydney", country: "Australia" },
  Melbourne: { timezone: "Australia/Melbourne", country: "Australia" },
  Brisbane: { timezone: "Australia/Brisbane", country: "Australia" },
  Perth: { timezone: "Australia/Perth", country: "Australia" },
  Adelaide: { timezone: "Australia/Adelaide", country: "Australia" },
  Darwin: { timezone: "Australia/Darwin", country: "Australia" },
  Wellington: { timezone: "Pacific/Auckland", country: "New Zealand" },
  Auckland: { timezone: "Pacific/Auckland", country: "New Zealand" },
  Suva: { timezone: "Pacific/Fiji", country: "Fiji" },
  "Port Moresby": { timezone: "Pacific/Port_Moresby", country: "Papua New Guinea" },

  // South America
  Brasilia: { timezone: "America/Sao_Paulo", country: "Brazil" },
  "Rio de Janeiro": { timezone: "America/Sao_Paulo", country: "Brazil" },
  "Sao Paulo": { timezone: "America/Sao_Paulo", country: "Brazil" },
  "Buenos Aires": { timezone: "America/Argentina/Buenos_Aires", country: "Argentina" },
  Santiago: { timezone: "America/Santiago", country: "Chile" },
  Lima: { timezone: "America/Lima", country: "Peru" },
  Bogota: { timezone: "America/Bogota", country: "Colombia" },
  Caracas: { timezone: "America/Caracas", country: "Venezuela" },
  Quito: { timezone: "America/Guayaquil", country: "Ecuador" },
  "La Paz": { timezone: "America/La_Paz", country: "Bolivia" },
  Asuncion: { timezone: "America/Asuncion", country: "Paraguay" },
  Montevideo: { timezone: "America/Montevideo", country: "Uruguay" },
  Georgetown: { timezone: "America/Guyana", country: "Guyana" },
  Paramaribo: { timezone: "America/Paramaribo", country: "Suriname" },

  // Central America & Caribbean
  "Mexico City": { timezone: "America/Mexico_City", country: "Mexico" },
  "Guatemala City": { timezone: "America/Guatemala", country: "Guatemala" },
  "San Jose": { timezone: "America/Costa_Rica", country: "Costa Rica" },
  "Panama City": { timezone: "America/Panama", country: "Panama" },
  Havana: { timezone: "America/Havana", country: "Cuba" },
  "Santo Domingo": { timezone: "America/Santo_Domingo", country: "Dominican Republic" },
  "Port-au-Prince": { timezone: "America/Port-au-Prince", country: "Haiti" },
  Kingston: { timezone: "America/Jamaica", country: "Jamaica" },
  "San Juan": { timezone: "America/Puerto_Rico", country: "Puerto Rico" },

  // Other US Major Cities (kept for legacy support)
  "San Francisco": { timezone: "America/Los_Angeles", country: "USA" },
  Seattle: { timezone: "America/Los_Angeles", country: "USA" },
  "San Diego": { timezone: "America/Los_Angeles", country: "USA" },
  Portland: { timezone: "America/Los_Angeles", country: "USA" },
  "Las Vegas": { timezone: "America/Los_Angeles", country: "USA" },
  Miami: { timezone: "America/New_York", country: "USA" },
  Philadelphia: { timezone: "America/New_York", country: "USA" },
  Dallas: { timezone: "America/Chicago", country: "USA" },
  Houston: { timezone: "America/Chicago", country: "USA" },
  Minneapolis: { timezone: "America/Chicago", country: "USA" },
  Detroit: { timezone: "America/Detroit", country: "USA" },
  "San Antonio": { timezone: "America/Chicago", country: "USA" },
  
  // ── Restored Major Non-Capital Cities ──
  // India
  Bangalore: { timezone: "Asia/Kolkata", country: "India" },
  Bengaluru: { timezone: "Asia/Kolkata", country: "India" },
  Chennai: { timezone: "Asia/Kolkata", country: "India" },
  Hyderabad: { timezone: "Asia/Kolkata", country: "India" },
  Pune: { timezone: "Asia/Kolkata", country: "India" },
  Ahmedabad: { timezone: "Asia/Kolkata", country: "India" },
  Jaipur: { timezone: "Asia/Kolkata", country: "India" },
  Lucknow: { timezone: "Asia/Kolkata", country: "India" },
  Kochi: { timezone: "Asia/Kolkata", country: "India" },
  Chandigarh: { timezone: "Asia/Kolkata", country: "India" },
  Goa: { timezone: "Asia/Kolkata", country: "India" },

  // China
  Guangzhou: { timezone: "Asia/Shanghai", country: "China" },
  Shenzhen: { timezone: "Asia/Shanghai", country: "China" },
  Chengdu: { timezone: "Asia/Shanghai", country: "China" },
  Wuhan: { timezone: "Asia/Shanghai", country: "China" },
  Hangzhou: { timezone: "Asia/Shanghai", country: "China" },
  Nanjing: { timezone: "Asia/Shanghai", country: "China" },
  Tianjin: { timezone: "Asia/Shanghai", country: "China" },
  "Xi'an": { timezone: "Asia/Shanghai", country: "China" },
  Suzhou: { timezone: "Asia/Shanghai", country: "China" },

  // Japan
  Osaka: { timezone: "Asia/Tokyo", country: "Japan" },
  Kyoto: { timezone: "Asia/Tokyo", country: "Japan" },
  Yokohama: { timezone: "Asia/Tokyo", country: "Japan" },
  Nagoya: { timezone: "Asia/Tokyo", country: "Japan" },
  Fukuoka: { timezone: "Asia/Tokyo", country: "Japan" },
  Sapporo: { timezone: "Asia/Tokyo", country: "Japan" },

  // South Korea
  Busan: { timezone: "Asia/Seoul", country: "South Korea" },
  Incheon: { timezone: "Asia/Seoul", country: "South Korea" },

  // Europe
  Milan: { timezone: "Europe/Rome", country: "Italy" },
  Naples: { timezone: "Europe/Rome", country: "Italy" },
  Barcelona: { timezone: "Europe/Madrid", country: "Spain" },
  Munich: { timezone: "Europe/Berlin", country: "Germany" },
  Frankfurt: { timezone: "Europe/Berlin", country: "Germany" },
  Hamburg: { timezone: "Europe/Berlin", country: "Germany" },
  Manchester: { timezone: "Europe/London", country: "UK" },
  Birmingham: { timezone: "Europe/London", country: "UK" },
  Glasgow: { timezone: "Europe/London", country: "UK" },
  Geneva: { timezone: "Europe/Zurich", country: "Switzerland" },
  Basel: { timezone: "Europe/Zurich", country: "Switzerland" },
  Lyon: { timezone: "Europe/Paris", country: "France" },
  Marseille: { timezone: "Europe/Paris", country: "France" },
  Nice: { timezone: "Europe/Paris", country: "France" },
  Rotterdam: { timezone: "Europe/Amsterdam", country: "Netherlands" },
  Antwerp: { timezone: "Europe/Brussels", country: "Belgium" },
  "St. Petersburg": { timezone: "Europe/Moscow", country: "Russia" },
  Gothenburg: { timezone: "Europe/Stockholm", country: "Sweden" },

  // Middle East
  Sharjah: { timezone: "Asia/Dubai", country: "UAE" },
  Mecca: { timezone: "Asia/Riyadh", country: "Saudi Arabia" },
  Jeddah: { timezone: "Asia/Riyadh", country: "Saudi Arabia" },

  // South America
  Medellin: { timezone: "America/Bogota", country: "Colombia" },

  // Canada
  Montreal: { timezone: "America/Toronto", country: "Canada" },
  Calgary: { timezone: "America/Edmonton", country: "Canada" },
  Vancouver: { timezone: "America/Vancouver", country: "Canada" },
};

/**
 * Maps IANA timezone IDs → country name.
 * Covers all commonly-used zones; falls back to the IANA region (e.g. "Europe")
 * for any timezone not in the map.
 */
const IANA_COUNTRY: Record<string, string> = {
  // ── UTC ──
  UTC: "UTC",
  "Etc/UTC": "UTC",
  "Etc/GMT": "UTC",

  // ── United States ──
  "America/New_York": "United States",
  "America/Chicago": "United States",
  "America/Denver": "United States",
  "America/Los_Angeles": "United States",
  "America/Anchorage": "United States",
  "America/Phoenix": "United States",
  "America/Adak": "United States",
  "America/Boise": "United States",
  "America/Detroit": "United States",
  "America/Indiana/Indianapolis": "United States",
  "America/Indiana/Knox": "United States",
  "America/Indiana/Marengo": "United States",
  "America/Indiana/Petersburg": "United States",
  "America/Indiana/Tell_City": "United States",
  "America/Indiana/Vevay": "United States",
  "America/Indiana/Vincennes": "United States",
  "America/Indiana/Winamac": "United States",
  "America/Juneau": "United States",
  "America/Kentucky/Louisville": "United States",
  "America/Kentucky/Monticello": "United States",
  "America/Menominee": "United States",
  "America/Nome": "United States",
  "America/North_Dakota/Beulah": "United States",
  "America/North_Dakota/Center": "United States",
  "America/North_Dakota/New_Salem": "United States",
  "America/Sitka": "United States",
  "America/Yakutat": "United States",
  "Pacific/Honolulu": "United States",

  // ── Canada ──
  "America/Toronto": "Canada",
  "America/Vancouver": "Canada",
  "America/Edmonton": "Canada",
  "America/Halifax": "Canada",
  "America/Winnipeg": "Canada",
  "America/Regina": "Canada",
  "America/St_Johns": "Canada",
  "America/Iqaluit": "Canada",
  "America/Moncton": "Canada",
  "America/Thunder_Bay": "Canada",
  "America/Yellowknife": "Canada",
  "America/Whitehorse": "Canada",
  "America/Dawson": "Canada",
  "America/Dawson_Creek": "Canada",
  "America/Rankin_Inlet": "Canada",
  "America/Resolute": "Canada",
  "America/Swift_Current": "Canada",

  // ── Mexico ──
  "America/Mexico_City": "Mexico",
  "America/Cancun": "Mexico",
  "America/Tijuana": "Mexico",
  "America/Monterrey": "Mexico",
  "America/Merida": "Mexico",
  "America/Chihuahua": "Mexico",
  "America/Hermosillo": "Mexico",
  "America/Mazatlan": "Mexico",

  // ── Central America & Caribbean ──
  "America/Guatemala": "Guatemala",
  "America/Belize": "Belize",
  "America/Costa_Rica": "Costa Rica",
  "America/El_Salvador": "El Salvador",
  "America/Tegucigalpa": "Honduras",
  "America/Managua": "Nicaragua",
  "America/Panama": "Panama",
  "America/Havana": "Cuba",
  "America/Jamaica": "Jamaica",
  "America/Port-au-Prince": "Haiti",
  "America/Santo_Domingo": "Dominican Republic",
  "America/Puerto_Rico": "Puerto Rico",
  "America/Martinique": "Martinique",
  "America/Barbados": "Barbados",
  "America/Port_of_Spain": "Trinidad & Tobago",

  // ── South America ──
  "America/Sao_Paulo": "Brazil",
  "America/Manaus": "Brazil",
  "America/Fortaleza": "Brazil",
  "America/Recife": "Brazil",
  "America/Belem": "Brazil",
  "America/Bahia": "Brazil",
  "America/Noronha": "Brazil",
  "America/Argentina/Buenos_Aires": "Argentina",
  "America/Argentina/Cordoba": "Argentina",
  "America/Argentina/Mendoza": "Argentina",
  "America/Bogota": "Colombia",
  "America/Lima": "Peru",
  "America/Santiago": "Chile",
  "America/Caracas": "Venezuela",
  "America/Guayaquil": "Ecuador",
  "America/La_Paz": "Bolivia",
  "America/Asuncion": "Paraguay",
  "America/Montevideo": "Uruguay",
  "America/Paramaribo": "Suriname",
  "America/Cayenne": "French Guiana",
  "America/Guyana": "Guyana",

  // ── Europe ──
  "Europe/London": "United Kingdom",
  "Europe/Paris": "France",
  "Europe/Berlin": "Germany",
  "Europe/Madrid": "Spain",
  "Europe/Rome": "Italy",
  "Europe/Amsterdam": "Netherlands",
  "Europe/Brussels": "Belgium",
  "Europe/Zurich": "Switzerland",
  "Europe/Vienna": "Austria",
  "Europe/Stockholm": "Sweden",
  "Europe/Oslo": "Norway",
  "Europe/Copenhagen": "Denmark",
  "Europe/Helsinki": "Finland",
  "Europe/Dublin": "Ireland",
  "Europe/Lisbon": "Portugal",
  "Europe/Warsaw": "Poland",
  "Europe/Prague": "Czech Republic",
  "Europe/Budapest": "Hungary",
  "Europe/Bucharest": "Romania",
  "Europe/Sofia": "Bulgaria",
  "Europe/Athens": "Greece",
  "Europe/Istanbul": "Turkey",
  "Europe/Moscow": "Russia",
  "Europe/Kiev": "Ukraine",
  "Europe/Kyiv": "Ukraine",
  "Europe/Minsk": "Belarus",
  "Europe/Belgrade": "Serbia",
  "Europe/Zagreb": "Croatia",
  "Europe/Ljubljana": "Slovenia",
  "Europe/Bratislava": "Slovakia",
  "Europe/Luxembourg": "Luxembourg",
  "Europe/Tallinn": "Estonia",
  "Europe/Riga": "Latvia",
  "Europe/Vilnius": "Lithuania",
  "Europe/Malta": "Malta",
  "Europe/Tirane": "Albania",
  "Europe/Sarajevo": "Bosnia & Herzegovina",
  "Europe/Skopje": "North Macedonia",
  "Europe/Podgorica": "Montenegro",
  "Europe/Chisinau": "Moldova",
  "Europe/Monaco": "Monaco",
  "Europe/Andorra": "Andorra",
  "Europe/Gibraltar": "Gibraltar",
  "Atlantic/Reykjavik": "Iceland",

  // ── Asia ──
  "Asia/Tokyo": "Japan",
  "Asia/Shanghai": "China",
  "Asia/Hong_Kong": "Hong Kong",
  "Asia/Taipei": "Taiwan",
  "Asia/Seoul": "South Korea",
  "Asia/Kolkata": "India",
  "Asia/Calcutta": "India",
  "Asia/Mumbai": "India",
  "Asia/Singapore": "Singapore",
  "Asia/Dubai": "UAE",
  "Asia/Riyadh": "Saudi Arabia",
  "Asia/Baghdad": "Iraq",
  "Asia/Tehran": "Iran",
  "Asia/Karachi": "Pakistan",
  "Asia/Dhaka": "Bangladesh",
  "Asia/Colombo": "Sri Lanka",
  "Asia/Kathmandu": "Nepal",
  "Asia/Bangkok": "Thailand",
  "Asia/Ho_Chi_Minh": "Vietnam",
  "Asia/Saigon": "Vietnam",
  "Asia/Jakarta": "Indonesia",
  "Asia/Makassar": "Indonesia",
  "Asia/Jayapura": "Indonesia",
  "Asia/Kuala_Lumpur": "Malaysia",
  "Asia/Manila": "Philippines",
  "Asia/Yangon": "Myanmar",
  "Asia/Phnom_Penh": "Cambodia",
  "Asia/Vientiane": "Laos",
  "Asia/Almaty": "Kazakhstan",
  "Asia/Tashkent": "Uzbekistan",
  "Asia/Tbilisi": "Georgia",
  "Asia/Yerevan": "Armenia",
  "Asia/Baku": "Azerbaijan",
  "Asia/Beirut": "Lebanon",
  "Asia/Jerusalem": "Israel",
  "Asia/Amman": "Jordan",
  "Asia/Damascus": "Syria",
  "Asia/Kuwait": "Kuwait",
  "Asia/Qatar": "Qatar",
  "Asia/Bahrain": "Bahrain",
  "Asia/Muscat": "Oman",
  "Asia/Kabul": "Afghanistan",
  "Asia/Ulaanbaatar": "Mongolia",
  "Asia/Brunei": "Brunei",
  "Asia/Macau": "Macau",

  // ── Africa ──
  "Africa/Cairo": "Egypt",
  "Africa/Johannesburg": "South Africa",
  "Africa/Lagos": "Nigeria",
  "Africa/Nairobi": "Kenya",
  "Africa/Casablanca": "Morocco",
  "Africa/Algiers": "Algeria",
  "Africa/Tunis": "Tunisia",
  "Africa/Accra": "Ghana",
  "Africa/Addis_Ababa": "Ethiopia",
  "Africa/Dar_es_Salaam": "Tanzania",
  "Africa/Kampala": "Uganda",
  "Africa/Khartoum": "Sudan",
  "Africa/Maputo": "Mozambique",
  "Africa/Lusaka": "Zambia",
  "Africa/Harare": "Zimbabwe",
  "Africa/Abidjan": "Ivory Coast",
  "Africa/Dakar": "Senegal",
  "Africa/Tripoli": "Libya",

  // ── Oceania ──
  "Australia/Sydney": "Australia",
  "Australia/Melbourne": "Australia",
  "Australia/Brisbane": "Australia",
  "Australia/Perth": "Australia",
  "Australia/Adelaide": "Australia",
  "Australia/Hobart": "Australia",
  "Australia/Darwin": "Australia",
  "Australia/Lord_Howe": "Australia",
  "Pacific/Auckland": "New Zealand",
  "Pacific/Chatham": "New Zealand",
  "Pacific/Fiji": "Fiji",
  "Pacific/Guam": "Guam",
  "Pacific/Tongatapu": "Tonga",
  "Pacific/Apia": "Samoa",
  "Pacific/Port_Moresby": "Papua New Guinea",
  "Pacific/Noumea": "New Caledonia",
};

/**
 * Resolves a country name from an IANA timezone identifier.
 * Priority: static IANA map → reverse CITY_ALIASES lookup → IANA region fallback.
 */
export const getCountryFromTimezone = (
  timezone: string,
): string => {
  // 1. Direct IANA lookup
  if (IANA_COUNTRY[timezone]) return IANA_COUNTRY[timezone];

  // 2. Reverse lookup from CITY_ALIASES (first alias whose IANA matches)
  for (const info of Object.values(CITY_ALIASES)) {
    if (info.timezone === timezone) return info.country;
  }

  // 3. Fallback to the region portion of the IANA ID (e.g. "America")
  return getRegionName(timezone);
};

export interface SearchResult {
  timezone: string;
  displayCity: string;
  iana: string; // always the IANA id, shown as secondary text
  isAlias: boolean;
}