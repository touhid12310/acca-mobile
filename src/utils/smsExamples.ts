/**
 * The example alert in the SMS paste box, in the user's own currency, so the
 * screen makes sense in any country. The fixed examples and the card alert in
 * common currencies are formats the free built-in reader understands (see
 * Backend-Laravel-API/tests/Unit/SmsTransactionParserTest.php). The web twin
 * is acca-tanstack/src/utils/smsExamples.js — keep them in step.
 */
const EXAMPLES: Record<string, string> = {
  BDT: 'Send Money Tk 500.00 to 01712345678 successful. Fee Tk 5.00. TrxID 9IN5ABCDEG',
  INR: 'Rs.450.00 debited from A/c XX1234 to grocer@upi on 12-10-26. UPI Ref 628512345678',
  KES: 'QJK3ABC123 Confirmed. Ksh1,500.00 sent to JOHN DOE 0712345678 on 12/10/26 at 3:15 PM. New balance is Ksh5,000.00.',
  NGN: 'Debit Alert: NGN 5,000.00 paid to SHOPRITE on 12-Oct-26. Acct: ***1234. Bal: NGN 45,000.00',
  PHP: 'You have sent PHP 500.00 to JUAN DELA CRUZ on 10-12-2026. Ref No. 1234567890123.',
  MYR: 'RM25.00 spent at CITY MART on 12/10/26 with card ending 1234.',
};

const SYMBOLS: Record<string, string> = { USD: '$', GBP: '£', EUR: '€' };

// Currencies where everyday prices run into the thousands.
const LARGE_UNITS = new Set(['JPY', 'KRW', 'VND', 'IDR', 'CLP', 'COP', 'UGX', 'TZS', 'HUF', 'PYG']);

export const smsExampleFor = (currency: string | null | undefined): string => {
  const code = String(currency || 'USD').toUpperCase();
  if (EXAMPLES[code]) return EXAMPLES[code];

  const amount = LARGE_UNITS.has(code) ? '25,000' : '25.40';
  const money = SYMBOLS[code] ? `${SYMBOLS[code]}${amount}` : `${code} ${amount}`;
  return `Your card ending 1234 was charged ${money} at CITY MARKET on 12 Oct.`;
};
