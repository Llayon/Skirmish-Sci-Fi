/**
 * A simple, dependency-free deep clone utility.
 * It works for JSON-serializable objects (no functions, undefined, etc.).
 * @param obj The object to clone.
 * @returns A deep copy of the object.
 */
export function cloneDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    console.error("Failed to deep clone object:", obj, error);
    // Fallback for non-serializable objects might be needed, but for now, this is robust enough.
    return obj;
  }
}
