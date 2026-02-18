declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: (done?: unknown) => unknown): void;
  export function beforeEach(fn: () => void): void;
  export function afterEach(fn: () => void): void;
  export const expect: (actual: unknown) => {
    toBe(expected: unknown): void;
    toContain(expected: string | RegExp): void;
    not: {
      toContain(expected: string | RegExp): void;
    };
    toBeTruthy(): void;
    toEqual(expected: unknown): void;
  };
}
