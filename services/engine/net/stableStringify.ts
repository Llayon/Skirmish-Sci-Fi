
/**
 * Converts a value to a stable JSON string representation.
 * Keys in objects are sorted alphabetically to ensure determinism.
 * Arrays preserve their order.
 *
 * @param value The value to stringify
 * @returns A JSON string
 */
export function stableStringify(value: unknown): string {
  // Primitives
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }

  // Array
  if (Array.isArray(value)) {
    const items = value.map((item) => {
      const str = stableStringify(item);
      // In JSON, undefined in array becomes null
      if (str === 'undefined') return 'null';
      return str;
    });
    return `[${items.join(',')}]`;
  }

  // Object
  if (typeof value === 'object') {
    // Treat other object types (Date, RegExp, etc) generically if needed,
    // but for game state usually it's plain objects.
    // If it has toJSON, JSON.stringify would use it. We can mimic that or just iterate keys.
    // For this task, we iterate keys.

    // Check if it has a custom toJSON method, if so, use result of that first?
    // The requirement says "Take 'semantic' state ... stable stringify".
    // Let's stick to simple key sorting for plain objects.

    const keys = Object.keys(value as object).sort();
    const properties: string[] = [];

    for (const key of keys) {
      const val = (value as Record<string, unknown>)[key];

      // JSON.stringify skips undefined values and functions in objects
      if (val === undefined || typeof val === 'function') {
        continue;
      }

      const valString = stableStringify(val);
      properties.push(`${JSON.stringify(key)}:${valString}`);
    }

    return `{${properties.join(',')}}`;
  }

  // Fallback (symbols, functions, etc - though usually ignored in JSON)
  return JSON.stringify(value) || 'undefined';
}
