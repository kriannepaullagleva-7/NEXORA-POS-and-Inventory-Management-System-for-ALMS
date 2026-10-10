/**
 * Quantity rules shared by the Laundry and Water Refilling tills.
 *
 * Countable goods — gallons, caps, laundry loads — sell in whole units. A
 * service priced by weight sells in fractions of a kilo. Both POS screens parse
 * and clamp through here rather than each doing its own arithmetic, so the two
 * tills can never disagree about what a valid quantity is.
 */

/** Ceiling for one cart line, so a stuck key cannot ring up 100,000 gallons. */
export const MAX_LINE_QTY = 999;

/** Finest division a shop scale is read to. */
export const WEIGHT_STEP = 0.1;

export interface QuantityRule {
  /** Weight-priced lines accept fractions; everything else is whole units. */
  allowDecimal: boolean;
  /** Hard ceiling — remaining stock for a tracked product, else MAX_LINE_QTY. */
  max: number;
  /** What the ceiling represents, so the message can explain itself. */
  maxReason?: 'stock';
}

/** Whole units step by 1; weight steps by 100g. */
export const quantityStep = (rule: QuantityRule): number =>
  (rule.allowDecimal ? WEIGHT_STEP : 1);

/**
 * Rounds to the precision the rule allows. Stepping 0.1 in binary floating
 * point drifts (0.1 + 0.2 = 0.30000000000000004), which would reach the
 * database as a quantity no scale ever read, so weights settle at 2 decimals.
 */
export const roundQuantity = (value: number, rule: QuantityRule): number =>
  (rule.allowDecimal ? Math.round(value * 100) / 100 : Math.round(value));

export interface QuantityResult {
  /** Parsed quantity, or null when the text is not yet a usable number. */
  value: number | null;
  /** Message to show the cashier, or null when the input is fine. */
  error: string | null;
}

/**
 * Reads what the cashier typed. A half-typed entry ("" or "0.") is not an
 * error — it is simply not a number yet — so it returns a null value with no
 * message and the caller leaves the committed quantity alone.
 */
export function parseQuantity(raw: string, rule: QuantityRule): QuantityResult {
  const text = raw.trim();
  if (text === '' || text === '.') return { value: null, error: null };

  const value = Number(text);
  if (!Number.isFinite(value)) return { value: null, error: 'Enter a number.' };
  if (value <= 0) return { value: null, error: 'Quantity must be more than 0.' };

  if (!rule.allowDecimal && !Number.isInteger(value)) {
    return { value: null, error: 'Whole units only.' };
  }

  const rounded = roundQuantity(value, rule);
  if (rounded > rule.max) {
    return {
      value: null,
      error: rule.maxReason === 'stock'
        ? `Only ${rule.max} left in stock.`
        : `Maximum ${rule.max} per line.`,
    };
  }

  return { value: rounded, error: null };
}

/** Keeps a stepped or programmatic quantity inside the rule's bounds. */
export function clampQuantity(value: number, rule: QuantityRule): number {
  const step = quantityStep(rule);
  return roundQuantity(Math.min(Math.max(value, step), rule.max), rule);
}

/** Trims trailing zeros so a weight reads "1.5" and a count reads "2". */
export const formatQuantity = (value: number): string => String(Number(value.toFixed(2)));
