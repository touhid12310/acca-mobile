// Older zone names that ICU (Hermes) and some iOS versions still report, mapped
// to the canonical names the API accepts. Mirrors the backend's
// App\Support\TimeZones aliases; the API answers 422 to the old names.
const TIME_ZONE_ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Asia/Dacca': 'Asia/Dhaka',
  'Asia/Thimbu': 'Asia/Thimphu',
  'Asia/Ujung_Pandang': 'Asia/Makassar',
  'Asia/Ulan_Bator': 'Asia/Ulaanbaatar',
  'Asia/Choibalsan': 'Asia/Ulaanbaatar',
  'Asia/Chongqing': 'Asia/Shanghai',
  'Asia/Chungking': 'Asia/Shanghai',
  'Asia/Harbin': 'Asia/Shanghai',
  'Asia/Kashgar': 'Asia/Urumqi',
  'Asia/Macao': 'Asia/Macau',
  'Asia/Istanbul': 'Europe/Istanbul',
  'Asia/Tel_Aviv': 'Asia/Jerusalem',
  'Europe/Kiev': 'Europe/Kyiv',
  'Europe/Uzhgorod': 'Europe/Kyiv',
  'Europe/Zaporozhye': 'Europe/Kyiv',
  'Europe/Belfast': 'Europe/London',
  'Europe/Nicosia': 'Asia/Nicosia',
  'Africa/Asmera': 'Africa/Asmara',
  'Africa/Timbuktu': 'Africa/Bamako',
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Catamarca': 'America/Argentina/Catamarca',
  'America/Cordoba': 'America/Argentina/Cordoba',
  'America/Jujuy': 'America/Argentina/Jujuy',
  'America/Mendoza': 'America/Argentina/Mendoza',
  'America/Coral_Harbour': 'America/Atikokan',
  'America/Godthab': 'America/Nuuk',
  'America/Indianapolis': 'America/Indiana/Indianapolis',
  'America/Fort_Wayne': 'America/Indiana/Indianapolis',
  'America/Louisville': 'America/Kentucky/Louisville',
  'America/Knox_IN': 'America/Indiana/Knox',
  'America/Nipigon': 'America/Toronto',
  'America/Thunder_Bay': 'America/Toronto',
  'America/Montreal': 'America/Toronto',
  'America/Rainy_River': 'America/Winnipeg',
  'America/Yellowknife': 'America/Edmonton',
  'America/Pangnirtung': 'America/Iqaluit',
  'America/Santa_Isabel': 'America/Tijuana',
  'America/Ensenada': 'America/Tijuana',
  'America/Shiprock': 'America/Denver',
  'America/Porto_Acre': 'America/Rio_Branco',
  'America/Virgin': 'America/St_Thomas',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
  'Atlantic/Jan_Mayen': 'Europe/Oslo',
  'Australia/Currie': 'Australia/Hobart',
  'Australia/Canberra': 'Australia/Sydney',
  'Australia/ACT': 'Australia/Sydney',
  'Australia/NSW': 'Australia/Sydney',
  'Pacific/Enderbury': 'Pacific/Kanton',
  'Pacific/Ponape': 'Pacific/Pohnpei',
  'Pacific/Truk': 'Pacific/Chuuk',
  'Pacific/Yap': 'Pacific/Chuuk',
  'Pacific/Samoa': 'Pacific/Pago_Pago',
  'Pacific/Johnston': 'Pacific/Honolulu',
  'Etc/UTC': 'UTC',
  'Etc/UCT': 'UTC',
  'Etc/Universal': 'UTC',
  'Etc/Zulu': 'UTC',
  'Etc/GMT': 'UTC',
  'Etc/GMT0': 'UTC',
  'Etc/Greenwich': 'UTC',
  GMT: 'UTC',
  UCT: 'UTC',
  Universal: 'UTC',
  Zulu: 'UTC',
  Greenwich: 'UTC',
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
  'US/Alaska': 'America/Anchorage',
  'US/Hawaii': 'Pacific/Honolulu',
  'US/Arizona': 'America/Phoenix',
  'Canada/Eastern': 'America/Toronto',
  'Canada/Pacific': 'America/Vancouver',
};

/** The canonical name for a zone, so the API doesn't refuse an old alias. */
export const normalizeTimeZone = (timeZone: string): string =>
  TIME_ZONE_ALIASES[timeZone.trim()] ?? timeZone.trim();

export const detectTimeZone = (): string => {
  try {
    const reported = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const canonical = normalizeTimeZone(reported);
    // Keep the reported name if this phone's Intl doesn't know the new one.
    return canonical !== reported && isValidTimeZone(canonical) ? canonical : reported;
  } catch {
    return 'UTC';
  }
};

let activeTimeZone: string | null = null;

export const isValidTimeZone = (timeZone?: string | null): boolean => {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return true;
  } catch {
    return false;
  }
};

export const setActiveTimeZone = (timeZone?: string | null): void => {
  activeTimeZone = isValidTimeZone(timeZone) ? timeZone! : null;
};

export const getActiveTimeZone = (): string => activeTimeZone || detectTimeZone();

export const resolveUserTimeZone = (user?: {
  timezone?: string | null;
  settings?: { timezone?: string | null };
} | null): string => user?.timezone || user?.settings?.timezone || detectTimeZone();
