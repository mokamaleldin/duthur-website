/**
 * Utility functions for numeric normalization supporting
 * Arabic-Indic digits (٠-٩), Persian digits (۰-۹), and ASCII digits (0-9).
 */

/**
 * Normalizes Arabic-Indic and Persian digits to standard ASCII 0-9 digits,
 * handles Arabic decimal separator (٫) and commas, and trims surrounding whitespace.
 */
export function normalizeDigits(input: string): string {
  if (!input) return '';
  return input
    // Convert Arabic-Indic digits ٠-٩ (U+0660 to U+0669)
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    // Convert Persian/Extended Arabic digits ۰-۹ (U+06F0 to U+06F9)
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    // Convert Arabic decimal separator ٫ (U+066B) and comma to period
    .replace(/[\u066B,]/g, '.')
    // Strip zero-width and invisible control characters
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    // Trim leading/trailing whitespace
    .trim();
}

export type ParsedNumberResult = {
  raw: string;
  normalized: string;
  value: number | null;
  isValid: boolean;
};

/**
 * Parses and validates an input string as a clean positive number.
 * Rejects strings containing letters or invalid characters (e.g. "١٧٥cm").
 */
export function parseNumericInput(input: string): ParsedNumberResult {
  const normalized = normalizeDigits(input);

  if (!normalized) {
    return { raw: input, normalized: '', value: null, isValid: false };
  }

  // Check if string contains only digits and at most one decimal point
  const isStrictNumeric = /^\d+(\.\d+)?$/.test(normalized);

  if (!isStrictNumeric) {
    return { raw: input, normalized, value: null, isValid: false };
  }

  const num = parseFloat(normalized);

  if (isNaN(num) || !isFinite(num)) {
    return { raw: input, normalized, value: null, isValid: false };
  }

  return {
    raw: input,
    normalized,
    value: num,
    isValid: true,
  };
}
