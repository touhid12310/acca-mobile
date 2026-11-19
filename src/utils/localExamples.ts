import regions from "../constants/currencyRegions.json";
import { detectTimeZone } from "./timezone";

/**
 * Examples that fit where the user lives (QA AE-87): a US user shouldn't be
 * shown "Foodpanda" or a "+8801XXXXXXXXX" phone number. Signed-in screens go
 * by the account currency; sign-up and onboarding (no currency yet, or not
 * saved) by the phone's country.
 */

type Regions = { zones: Record<string, string>; countries: Record<string, string> };
const maps = regions as Regions;

/** ISO country for the phone: its timezone (Asia/Dhaka → BD), then its locale region. */
export const detectCountry = (timezone?: string | null): string | null => {
  try {
    const zone = timezone || detectTimeZone();
    const fromZone = zone ? maps.zones[zone] : undefined;
    if (fromZone) return fromZone;
  } catch {
    // fall through to the locale
  }
  try {
    const locale = Intl.NumberFormat().resolvedOptions().locale || "";
    const region = locale
      .split("-")
      .find((part, index) => index > 0 && /^[A-Z]{2}$/.test(part));
    return region ?? null;
  } catch {
    return null;
  }
};

// A plausible mobile number per country, written the way people type it.
const PHONE_EXAMPLES: Record<string, string> = {
  BD: "+880 1712 345678",
  IN: "+91 98765 43210",
  PK: "+92 300 1234567",
  NP: "+977 984 1234567",
  LK: "+94 71 234 5678",
  US: "+1 555 123 4567",
  CA: "+1 555 123 4567",
  GB: "+44 7700 900123",
  IE: "+353 85 123 4567",
  AU: "+61 412 345 678",
  NZ: "+64 21 123 4567",
  AE: "+971 50 123 4567",
  SA: "+966 50 123 4567",
  QA: "+974 3312 3456",
  KW: "+965 5012 3456",
  OM: "+968 9212 3456",
  BH: "+973 3612 3456",
  MY: "+60 12 345 6789",
  SG: "+65 8123 4567",
  ID: "+62 812 3456 7890",
  PH: "+63 917 123 4567",
  TH: "+66 81 234 5678",
  VN: "+84 91 234 56 78",
  JP: "+81 90 1234 5678",
  KR: "+82 10 1234 5678",
  CN: "+86 131 2345 6789",
  DE: "+49 1512 3456789",
  FR: "+33 6 12 34 56 78",
  ES: "+34 612 34 56 78",
  IT: "+39 312 345 6789",
  NL: "+31 6 12345678",
  SE: "+46 70 123 45 67",
  TR: "+90 532 123 45 67",
  NG: "+234 802 123 4567",
  KE: "+254 712 345678",
  ZA: "+27 82 123 4567",
  EG: "+20 100 123 4567",
  BR: "+55 11 91234 5678",
  MX: "+52 55 1234 5678",
};

/** Placeholder for a mobile-number field, e.g. "+1 555 123 4567" in the US. */
export const phonePlaceholder = (country?: string | null): string =>
  (country && PHONE_EXAMPLES[country.toUpperCase()]) ||
  "Mobile number with country code";

const CURRENCY_COUNTRY: Record<string, string> = {
  BDT: "BD",
  INR: "IN",
  PKR: "PK",
  USD: "US",
  GBP: "GB",
  EUR: "DE",
  AUD: "AU",
  CAD: "CA",
  AED: "AE",
  SAR: "SA",
  MYR: "MY",
  SGD: "SG",
};

/**
 * The country to borrow examples from: the phone's when it uses the account
 * currency (EUR in France → FR), else the currency's main country, else the
 * phone's.
 */
export const exampleCountry = (currency?: string | null): string | null => {
  const phoneCountry = detectCountry();
  const code = currency ? currency.toUpperCase() : null;
  if (!code) return phoneCountry;
  if (phoneCountry && maps.countries[phoneCountry] === code) return phoneCountry;
  return (
    CURRENCY_COUNTRY[code] ||
    Object.keys(maps.countries).find((country) => maps.countries[country] === code) ||
    null
  );
};

type MerchantExample = {
  /** A food-delivery merchant people there recognise. */
  delivery: string;
  /** A ride / transport merchant. */
  ride: string;
  /** A supermarket. */
  grocery: string;
  /** A bank name for an account-name hint. */
  bank: string;
};

const MERCHANTS: Record<string, MerchantExample> = {
  BD: { delivery: "Foodpanda", ride: "Pathao", grocery: "Shwapno", bank: "City Bank" },
  IN: { delivery: "Swiggy", ride: "Ola", grocery: "BigBasket", bank: "HDFC Bank" },
  PK: { delivery: "Foodpanda", ride: "Careem", grocery: "Imtiaz", bank: "Meezan Bank" },
  US: { delivery: "DoorDash", ride: "Uber", grocery: "Walmart", bank: "Chase" },
  CA: { delivery: "DoorDash", ride: "Uber", grocery: "Loblaws", bank: "RBC" },
  GB: { delivery: "Deliveroo", ride: "Uber", grocery: "Tesco", bank: "Barclays" },
  IE: { delivery: "Deliveroo", ride: "Uber", grocery: "Tesco", bank: "AIB" },
  AU: { delivery: "Uber Eats", ride: "Uber", grocery: "Woolworths", bank: "CommBank" },
  NZ: { delivery: "Uber Eats", ride: "Uber", grocery: "Countdown", bank: "ANZ" },
  DE: { delivery: "Lieferando", ride: "Uber", grocery: "REWE", bank: "Sparkasse" },
  FR: { delivery: "Uber Eats", ride: "Uber", grocery: "Carrefour", bank: "BNP Paribas" },
  AE: { delivery: "Talabat", ride: "Careem", grocery: "Carrefour", bank: "Emirates NBD" },
  SA: { delivery: "HungerStation", ride: "Careem", grocery: "Panda", bank: "Al Rajhi Bank" },
  MY: { delivery: "GrabFood", ride: "Grab", grocery: "Lotus's", bank: "Maybank" },
  SG: { delivery: "GrabFood", ride: "Grab", grocery: "FairPrice", bank: "DBS" },
};

const GENERIC: MerchantExample = {
  delivery: "Uber Eats",
  ride: "Uber",
  grocery: "Carrefour",
  bank: "My Bank",
};

/** Merchant names for examples, for the account currency (or the phone's country). */
export const merchantExamples = (currency?: string | null): MerchantExample => {
  const country = exampleCountry(currency);
  return (country && MERCHANTS[country]) || GENERIC;
};
