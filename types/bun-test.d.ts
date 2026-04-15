/**
 * Minimal test-type compatibility layer.
 *
 * Bun matcher/types must come from `bun-types` via each package test tsconfig.
 * This file exists only for small compatibility shims that do not redefine
 * Bun's core `bun:test` surface.
 */

declare module "vitest" {
  export * from "bun:test";
}
