// The decimal separator of the phone's region format, e.g. ',' in Germany,
// Brazil, Indonesia or Turkey.
const deviceDecimalSeparator = (() => {
  try {
    const sample = new Intl.NumberFormat().format(1.5);
    return sample.includes(',') ? ',' : '.';
  } catch {
    return '.';
  }
})();

/**
 * Cleans what is typed into an amount field to digits and a single '.'.
 *
 * In comma-decimal regions the decimal pad types ',' (on iOS it is the only
 * separator key; Gboard and Samsung offer it next to '.'), so there a lone
 * ',' becomes '.'. Anywhere else a ',' can only be a grouping comma from a
 * paste ('1,250.50'), so it is dropped.
 */
export const toDecimalInput = (text: string): string => {
  let value = text.replace(/[^0-9.,]/g, '');
  if (deviceDecimalSeparator === ',' && !value.includes('.')) {
    const comma = value.indexOf(',');
    if (comma >= 0) {
      value = `${value.slice(0, comma)}.${value.slice(comma + 1)}`;
    }
  }
  value = value.replace(/,/g, '');
  const dot = value.indexOf('.');
  return dot < 0 ? value : value.slice(0, dot + 1) + value.slice(dot + 1).replace(/\./g, '');
};

/** Parses a typed amount ('12,50' on a comma-region phone, '1,250.5', '12.5'). */
export const parseDecimalInput = (text: string, fallback = 0): number => {
  const parsed = parseFloat(toDecimalInput(text));
  return Number.isNaN(parsed) ? fallback : parsed;
};
