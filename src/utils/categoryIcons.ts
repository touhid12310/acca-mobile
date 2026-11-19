import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Category icons.
 *
 * The admin panel (and the web app) store Lucide icon names on categories
 * ("utensils", "shopping-cart", "zap", …); older rows and user categories can
 * also hold MaterialCommunityIcons names ("food", "office-building") or a
 * PascalCase / camelCase spelling ("ShoppingCart", "creditCard"). The app draws
 * them with MaterialCommunityIcons, which shows a "?" for any name it doesn't
 * know — so every icon goes through `categoryIconName()`.
 *
 * Every value below exists in the MaterialCommunityIcons glyph map
 * (@expo/vector-icons 15). The runtime check against `glyphMap` is a second
 * guard, so a typo here still falls back to a folder instead of a "?".
 */
const LUCIDE_TO_MCI: Record<string, string> = {
  // Money, banking, work
  wallet: "wallet",
  "wallet-cards": "wallet",
  "wallet-minimal": "wallet",
  banknote: "cash",
  coins: "cash-multiple",
  "hand-coins": "hand-coin",
  "piggy-bank": "piggy-bank",
  landmark: "bank",
  bank: "bank",
  vault: "safe",
  safe: "safe",
  "credit-card": "credit-card",
  receipt: "receipt",
  "receipt-text": "receipt-text",
  "dollar-sign": "currency-usd",
  "circle-dollar-sign": "currency-usd",
  "badge-dollar-sign": "currency-usd",
  bitcoin: "bitcoin",
  gem: "diamond-stone",
  diamond: "diamond-stone",
  percent: "percent",
  "circle-percent": "percent-circle",
  "badge-percent": "sale",
  "ticket-percent": "ticket-percent",
  "trending-up": "trending-up",
  "trending-down": "trending-down",
  "bar-chart": "chart-bar",
  "bar-chart-2": "chart-bar",
  "bar-chart-3": "chart-bar",
  "bar-chart-4": "chart-bar",
  "bar-chart-big": "chart-bar",
  "chart-bar": "chart-bar",
  "chart-column": "chart-bar",
  "chart-no-axes-column": "chart-bar",
  "line-chart": "chart-line",
  "chart-line": "chart-line",
  "area-chart": "chart-areaspline",
  "pie-chart": "chart-pie",
  "chart-pie": "chart-pie",
  calculator: "calculator",
  briefcase: "briefcase",
  "briefcase-business": "briefcase",
  building: "office-building",
  "building-2": "office-building",
  store: "store",
  warehouse: "warehouse",
  factory: "factory",
  scale: "scale-balance",
  gavel: "gavel",
  "file-text": "file-document",
  file: "file",
  "file-check": "file-check",
  "id-card": "card-account-details",
  contact: "card-account-details",
  signature: "draw",

  // Home and bills
  home: "home",
  house: "home",
  "house-plus": "home-plus",
  zap: "flash",
  lightbulb: "lightbulb",
  flame: "fire",
  droplet: "water",
  droplets: "water",
  plug: "power-plug",
  battery: "battery",
  wifi: "wifi",
  phone: "phone",
  smartphone: "cellphone",
  tablet: "tablet",
  laptop: "laptop",
  monitor: "monitor",
  tv: "television",
  sofa: "sofa",
  lamp: "lamp",
  bed: "bed",
  bath: "bathtub",
  "shower-head": "shower-head",
  "washing-machine": "washing-machine",
  "paint-roller": "format-paint",
  paintbrush: "brush",
  wrench: "wrench",
  hammer: "hammer",
  tool: "tools",
  tools: "tools",
  "hard-hat": "hard-hat",
  construction: "hard-hat",
  shovel: "shovel",
  recycle: "recycle",
  "trash-2": "delete",
  trash: "delete",

  // Food and shopping
  utensils: "silverware-fork-knife",
  "utensils-crossed": "silverware-fork-knife",
  "chef-hat": "silverware-fork-knife",
  coffee: "coffee",
  pizza: "pizza",
  sandwich: "hamburger",
  hamburger: "hamburger",
  apple: "food-apple",
  carrot: "carrot",
  fish: "fish",
  egg: "egg",
  soup: "bowl-mix",
  cake: "cake-variant",
  "ice-cream": "ice-cream",
  cookie: "cookie",
  candy: "candy",
  popcorn: "popcorn",
  beer: "beer",
  wine: "glass-wine",
  "cup-soda": "cup",
  "shopping-cart": "cart",
  "shopping-bag": "shopping",
  "shopping-basket": "basket",
  shirt: "tshirt-crew",
  glasses: "glasses",
  watch: "watch",
  tag: "tag",
  tags: "tag-multiple",
  package: "package-variant",
  box: "package-variant-closed",
  archive: "archive",

  // Travel and transport
  car: "car",
  "car-front": "car",
  "car-taxi-front": "taxi",
  taxi: "taxi",
  bus: "bus",
  train: "train",
  "tram-front": "tram",
  plane: "airplane",
  "plane-takeoff": "airplane-takeoff",
  bike: "bicycle",
  bicycle: "bicycle",
  fuel: "gas-station",
  truck: "truck",
  ship: "ferry",
  sailboat: "sail-boat",
  anchor: "anchor",
  parking: "parking",
  "square-parking": "parking",
  "circle-parking": "parking",
  "map-pin": "map-marker",
  map: "map",
  globe: "earth",
  luggage: "bag-suitcase",
  "baggage-claim": "bag-suitcase",
  hotel: "bed",
  tent: "tent",
  mountain: "image-filter-hdr",
  footprints: "shoe-print",

  // Fun, learning, people
  film: "filmstrip",
  clapperboard: "movie-open",
  music: "music",
  headphones: "headphones",
  mic: "microphone",
  radio: "radio",
  guitar: "guitar-acoustic",
  gamepad: "gamepad-variant",
  "gamepad-2": "gamepad-variant",
  dice: "dice-multiple",
  dices: "dice-multiple",
  puzzle: "puzzle",
  ticket: "ticket",
  camera: "camera",
  palette: "palette",
  book: "book",
  "book-open": "book-open-variant",
  library: "library",
  notebook: "notebook",
  "graduation-cap": "school",
  school: "school",
  pencil: "pencil",
  user: "account",
  "user-round": "account",
  "user-check": "account-check",
  "user-plus": "account-plus",
  users: "account-group",
  "users-round": "account-group",
  baby: "baby-carriage",
  dog: "dog",
  cat: "cat",
  "paw-print": "paw",
  bone: "bone",
  church: "church",
  handshake: "handshake",
  "hand-heart": "hand-heart",
  "heart-handshake": "hand-heart",
  gift: "gift",
  award: "trophy-award",
  trophy: "trophy",
  crown: "crown",
  star: "star",
  sparkles: "creation",
  rocket: "rocket-launch",
  target: "target",
  flag: "flag",

  // Health and care
  heart: "heart",
  "heart-pulse": "heart-pulse",
  activity: "pulse",
  stethoscope: "stethoscope",
  pill: "pill",
  syringe: "needle",
  hospital: "hospital-building",
  ambulance: "ambulance",
  dumbbell: "dumbbell",
  scissors: "content-cut",
  shield: "shield",
  "shield-check": "shield-check",
  "shield-plus": "shield-plus",
  "shield-alert": "shield-alert",
  umbrella: "umbrella",
  lock: "lock",
  key: "key",

  // Nature and weather
  leaf: "leaf",
  sprout: "sprout",
  flower: "flower",
  tree: "tree",
  trees: "tree",
  sun: "white-balance-sunny",
  cloud: "cloud",
  snowflake: "snowflake",
  thermometer: "thermometer",
  fan: "fan",
  tractor: "tractor",

  // General UI shapes admins pick as "other"
  folder: "folder",
  "folder-open": "folder-open",
  clipboard: "clipboard",
  calendar: "calendar",
  "calendar-days": "calendar-month",
  "calendar-check": "calendar-check",
  clock: "clock-outline",
  timer: "timer",
  hourglass: "timer-sand",
  gauge: "gauge",
  bell: "bell",
  mail: "email",
  "message-circle": "message",
  newspaper: "newspaper",
  printer: "printer",
  cpu: "cpu-64-bit",
  server: "server",
  database: "database",
  code: "code-tags",
  settings: "cog",
  cog: "cog",
  plus: "plus",
  "plus-circle": "plus-circle",
  "circle-plus": "plus-circle",
  "minus-circle": "minus-circle",
  "circle-minus": "minus-circle",
  "more-horizontal": "dots-horizontal",
  ellipsis: "dots-horizontal",
  "more-vertical": "dots-vertical",
  "ellipsis-vertical": "dots-vertical",
  "alert-circle": "alert-circle",
  "circle-alert": "alert-circle",
  "alert-triangle": "alert",
  "triangle-alert": "alert",
  info: "information",
  repeat: "repeat",
  "refresh-cw": "refresh",
  "arrow-left-right": "swap-horizontal",
  "arrow-right-left": "swap-horizontal",
  send: "send",
  download: "download",
  upload: "upload",
  link: "link",

  // Words older app builds stored (kept from the previous categories map)
  food: "food",
  shopping: "shopping",
  health: "hospital-box",
  education: "school",
  entertainment: "movie",
  travel: "airplane",
  utilities: "flash",
  salary: "cash",
  investment: "chart-line",
  other: "dots-horizontal",
  test: "test-tube",
};

const DEFAULT_FALLBACK = "folder";

const glyphMap: Record<string, number> =
  (MaterialCommunityIcons as unknown as { glyphMap?: Record<string, number> })
    .glyphMap || {};
// Empty only if the icon package ever stops exposing it; the map's values are
// verified against the font, so they are still trusted then.
const glyphsLoaded = Object.keys(glyphMap).length > 0;

const hasGlyph = (name: string): boolean => !glyphsLoaded || name in glyphMap;

/**
 * "ShoppingCart" / "creditCard" / "BarChart3" / "shopping_cart" / "lucide-zap"
 * → kebab-case. Letters and digits are only split for PascalCase / camelCase
 * input, so kebab names such as "format-h1" stay as they are.
 */
const normalize = (raw: string): string => {
  const trimmed = raw.trim();
  const camel = /[A-Z]/.test(trimmed);
  return (camel ? trimmed.replace(/([a-zA-Z])(\d)/g, "$1-$2") : trimmed)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/^lucide-/, "")
    .replace(/-icon$/, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
};

/**
 * A MaterialCommunityIcons glyph name for a stored category icon. Never
 * returns a name the font doesn't have.
 */
export function categoryIconName(
  name?: string | null,
  fallback: string = DEFAULT_FALLBACK,
): string {
  const safeFallback = hasGlyph(fallback) ? fallback : DEFAULT_FALLBACK;
  if (!name || typeof name !== "string" || !name.trim()) return safeFallback;

  const key = normalize(name);
  const mapped = LUCIDE_TO_MCI[key];
  if (mapped && hasGlyph(mapped)) return mapped;
  // Already a MaterialCommunityIcons name ("food", "office-building", …).
  if (glyphsLoaded && key in glyphMap) return key;
  // Lucide numbered variants ("bar-chart-3", "gamepad-2") fall back to the base.
  const base = key.replace(/-\d+$/, "");
  if (base !== key) {
    const baseMapped = LUCIDE_TO_MCI[base];
    if (baseMapped && hasGlyph(baseMapped)) return baseMapped;
    if (glyphsLoaded && base in glyphMap) return base;
  }
  return safeFallback;
}

/**
 * Icons offered in the mobile category editor. Stored as Lucide names, the
 * same strings the admin panel and the web app use, so a category edited on
 * the phone looks the same everywhere.
 */
export const CATEGORY_ICON_CHOICES: string[] = [
  "folder",
  "wallet",
  "banknote",
  "credit-card",
  "landmark",
  "piggy-bank",
  "trending-up",
  "briefcase",
  "laptop",
  "building",
  "home",
  "zap",
  "wifi",
  "smartphone",
  "utensils",
  "coffee",
  "shopping-cart",
  "shopping-bag",
  "shirt",
  "car",
  "fuel",
  "bus",
  "plane",
  "film",
  "music",
  "gamepad-2",
  "book",
  "graduation-cap",
  "heart",
  "pill",
  "dumbbell",
  "scissors",
  "baby",
  "paw-print",
  "gift",
  "hand-heart",
  "shield",
  "file-text",
  "receipt",
  "wrench",
  "user",
  "users",
  "percent",
  "award",
  "more-horizontal",
];
