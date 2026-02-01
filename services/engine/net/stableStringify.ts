/**
 * Deterministic JSON stringifier.
 * 
 * Rules:
 * 1. Objects: keys are sorted lexicographically.
 * 2. Arrays: order is preserved.
 * 3. Primitives: standard JSON serialization (NaN/Infinity -> null).
 * 4. Undefined:
 *    - Root: returns empty string ''.
 *    - In objects: key is omitted.
 *    - In arrays: converted to null.
 * 5. BigInt: throws Error.
 * 6. Circular references: throws Error.
 * 7. Strictness: only arrays and plain objects (proto === Object.prototype or null).
 */
export function stableStringify(value: unknown): string {
    const seen = new WeakSet<object>();

    function serialize(node: unknown): string {
        // Primitives
        if (node === undefined) return 'null'; // Safety fallback: should be omitted or handled by parent
        if (node === null) return 'null';
        if (typeof node === 'number') return isFinite(node) ? String(node) : 'null';
        if (typeof node === 'boolean') return String(node);
        if (typeof node === 'string') return JSON.stringify(node);
        if (typeof node === 'bigint') throw new Error('stableStringify: bigint not supported');
        
        // Functions, symbols -> treated as undefined (omitted in objects, null in arrays)
        // If we reach here, it's an unhandled type (should be caught by parent checks usually)
        if (typeof node !== 'object') return 'null'; 

        // Circular check
        if (seen.has(node)) {
            throw new Error('stableStringify: circular reference detected');
        }
        
        // Strict plain object check
        // Allow arrays and plain objects only. Reject Date, Map, Set, Class instances.
        if (!Array.isArray(node) && Object.getPrototypeOf(node) !== Object.prototype && Object.getPrototypeOf(node) !== null) {
            throw new Error('stableStringify: non-plain object detected (only plain objects and arrays allowed)');
        }

        seen.add(node);

        try {
            if (Array.isArray(node)) {
                const elements = node.map(item => {
                    if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
                        return 'null';
                    }
                    return serialize(item);
                });
                return `[${elements.join(',')}]`;
            }

            const keys = Object.keys(node).sort();
            const entries: string[] = [];

            for (const key of keys) {
                const val = (node as Record<string, unknown>)[key];
                // Omit keys with undefined/function/symbol values
                if (val !== undefined && typeof val !== 'function' && typeof val !== 'symbol') {
                    entries.push(`${JSON.stringify(key)}:${serialize(val)}`);
                }
            }

            return `{${entries.join(',')}}`;
        } finally {
            seen.delete(node);
        }
    }

    // Root level handling
    if (value === undefined) return '';
    
    // If root is function/symbol, treating it as undefined per general expectation if not specified, 
    // but strict requirement says "root undefined -> empty string".
    // It doesn't explicitly say what to do with root function/symbol, but usually they are not serializable.
    // Given "Undefined policy" covers function/symbol behavior in objects/arrays, let's assume root function/symbol behaves like undefined -> empty string or undefined string?
    // Requirement 3 says: "In objects: properties with value undefined (as well as function/symbol) are omitted".
    // "In arrays: undefined/function/symbol -> serialized as null".
    // "On root: root undefined -> empty string".
    // It is safest to treat root function/symbol same as undefined -> empty string to be safe, or just let them fall through to serialize which returns 'undefined' which might be wrong.
    // Let's stick to the explicit "root undefined -> empty string" and let serialize handle the rest.
    // Actually, serialize returns 'undefined' string for non-object/non-primitive.
    // If we pass a function to stableStringify, what should happen? JSON.stringify returns undefined.
    // Our contract says "root undefined -> empty string".
    // Let's ensure we return '' for function/symbol at root too to match JSON.stringify behavior (which returns undefined).
    
    if (typeof value === 'function' || typeof value === 'symbol') return '';

    return serialize(value);
}
