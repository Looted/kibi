export type Color = "red" | "blue";
export const SIZES = ["s", "m"] as const;
export interface User { id: string; name?: string; email: string | null }
export class Account { id = 1; }
export const LIMIT = 5;