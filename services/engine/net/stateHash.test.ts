import { describe, it, expect } from 'vitest';
import { calculateStateHash, hashString } from './stateHash';
import { stableStringify } from './stableStringify';

describe('Deterministic State Hash (Engine V2)', () => {

    it('Test A — Key order invariance', () => {
        const a = { b: 2, a: 1, c: { y: 20, x: 10 } };
        const b = { a: 1, b: 2, c: { x: 10, y: 20 } };
        
        expect(calculateStateHash(a)).toBe(calculateStateHash(b));
        expect(stableStringify(a)).toBe('{"a":1,"b":2,"c":{"x":10,"y":20}}');
    });

    it('Test B — Nested object invariance', () => {
        const complexA = {
            id: '1',
            data: {
                stats: { str: 10, dex: 15 },
                tags: ['a', 'b']
            }
        };
        const complexB = {
            data: {
                tags: ['a', 'b'],
                stats: { dex: 15, str: 10 }
            },
            id: '1'
        };

        expect(calculateStateHash(complexA)).toBe(calculateStateHash(complexB));
    });

    it('Test C — Arrays preserve order', () => {
        expect(calculateStateHash([1, 2])).not.toBe(calculateStateHash([2, 1]));
        
        const arrA = [{ a: 1 }, { b: 2 }];
        const arrB = [{ b: 2 }, { a: 1 }];
        expect(calculateStateHash(arrA)).not.toBe(calculateStateHash(arrB));
    });

    it('Test D — Change detection', () => {
        const base = { hp: 100, status: 'active' };
        const modified = { hp: 99, status: 'active' };
        
        expect(calculateStateHash(base)).not.toBe(calculateStateHash(modified));
    });

    it('Test E — Undefined policy (objects omit, arrays null)', () => {
        // Objects: undefined omitted
        const obj1 = { a: 1 };
        const obj2 = { a: 1, x: undefined, y: () => {}, z: Symbol('test') };
        expect(calculateStateHash(obj1)).toBe(calculateStateHash(obj2));
        expect(stableStringify(obj2)).toBe('{"a":1}');
        
        // Arrays: undefined/function/symbol -> null
        const arr1 = [1, null, null, null, 3];
        const arr2 = [1, undefined, () => {}, Symbol('test'), 3];
        expect(calculateStateHash(arr1)).toBe(calculateStateHash(arr2));
        expect(stableStringify(arr2)).toBe('[1,null,null,null,3]');
    });

    it('Test F — Root undefined handling', () => {
        expect(stableStringify(undefined)).toBe('');
        // calculateStateHash(undefined) -> hashString('') -> '811c9dc5'
        expect(calculateStateHash(undefined)).toBe(hashString(''));
    });

    it('Test G — Circular reference throws', () => {
        const obj: any = {};
        obj.self = obj;
        expect(() => calculateStateHash(obj)).toThrow(/circular/i);
    });
    
    it('Test H — Strict plain object enforcement', () => {
        expect(() => calculateStateHash({ d: new Date() })).toThrow(/non-plain object/i);
        expect(() => calculateStateHash({ m: new Map() })).toThrow(/non-plain object/i);
        expect(() => calculateStateHash({ s: new Set() })).toThrow(/non-plain object/i);
        
        class Foo { x = 1; }
        expect(() => calculateStateHash({ f: new Foo() })).toThrow(/non-plain object/i);
        
        // Allowed
        expect(() => calculateStateHash({ x: 1 })).not.toThrow();
        const nullProto = Object.create(null);
        nullProto.x = 1;
        expect(() => calculateStateHash(nullProto)).not.toThrow();
    });

    it('Test I — BigInt throws', () => {
        expect(() => calculateStateHash({ x: 1n })).toThrow(/bigint/i);
    });

    it('Test J — Lexical sort verification', () => {
        // "10" comes before "2" in string sort
        const obj = { "2": "b", "10": "a" };
        expect(stableStringify(obj)).toBe('{"10":"a","2":"b"}');
    });

    it('Test K — Special primitives (NaN, Infinity)', () => {
        expect(stableStringify({ a: NaN, b: Infinity, c: -Infinity })).toBe('{"a":null,"b":null,"c":null}');
    });

    it('Should produce consistent FNV-1a hashes', () => {
        // Empty string -> 0x811C9DC5 -> "811c9dc5"
        expect(hashString('')).toBe('811c9dc5');
        
        // "a" -> 0xE40C292C -> "e40c292c"
        expect(hashString('a')).toBe('e40c292c');
        
        // "foobar" -> bf9cf968 (JS Math.imul implementation specific)
        expect(hashString('foobar')).toBe('bf9cf968');
    });
});
