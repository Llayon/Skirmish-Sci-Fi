/**
 * JSON-serializable value type.
 * Use for anything that goes over network or into logs.
 */
export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };
