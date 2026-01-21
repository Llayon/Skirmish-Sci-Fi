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
    // Root function/symbol -> '' (matches JSON.stringify returning undefined)
    if (value === undefined || typeof value === 'function' || typeof value === 'symbol') {
        return '';
    }

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

    return serialize(value);
}
