import regions from '../constants/currencyRegions.json';
import { detectTimeZone } from './timezone';

type Regions = { zones: Record<string, string>; countries: Record<string, string> };
const maps = regions as Regions;

/**
 * The currency a new user most likely uses, for onboarding's default — from
 * the phone's timezone (Asia/Dhaka → BD → BDT), then its locale region. The
 * maps (timezone → country, country → currency) were generated from the tz
 * database and ICU, limited to the currencies AccountE supports.
 *
 * Returns an ISO currency code, or null when unsure.
 */
export function detectCurrency({ supported = [], timezone }: { supported?: string[]; timezone?: string } = {}): string | null {
  const zone = timezone || safeTimeZone();
  const country = (zone ? maps.zones[zone] : undefined) || localeCountry();
  const code = country ? maps.countries[country] : undefined;
  if (!code) return null;
  return supported.length === 0 || supported.includes(code) ? code : null;
}

const safeTimeZone = (): string | null => {
  try {
    return detectTimeZone();
  } catch {
    return null;
  }
};

const localeCountry = (): string | null => {
  try {
    const locale = Intl.NumberFormat().resolvedOptions().locale || '';
    const region = locale.split('-').find((part, index) => index > 0 && /^[A-Z]{2}$/.test(part));
    return region ?? null;
  } catch {
    return null;
  }
};
