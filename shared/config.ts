export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type Configuration = { [key: string]: JsonValue };
export interface Session { configured: boolean; authenticated: boolean; storage: boolean }
