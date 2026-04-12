/**
 * Turn comma-separated user input into a clean list (trimmed, non-empty).
 * Raw text is preserved while typing; parse only when saving or previewing.
 */
export function commaSeparatedToArray(text) {
  if (text == null || typeof text !== 'string') return [];
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
