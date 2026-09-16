---
"kibi-cli": minor
---

The symbol-classification vocabulary — granularity reasons, coarse reasons, symbol roles, role inference, and traceability relationship types — now has a single source: `packages/core/schema/symbol-classification.json`, generated into both the TypeScript constants and Prolog facts (`bun run symbols:generate`, drift-checked by `symbols:check` in CI alongside the schema and rule registries). The user-facing suggestions that used to restate the vocabulary by hand now read from the generated lists, which fixes real drift: the mixed-symbol-role advisory listed only four of the five allowed granularity reasons (it omitted `test-suite`), while the manifest gate and sync failure message listed only the coarse set. The manifest header comment is generated from the same list. No behavior change beyond the corrected suggestion text.

Technical summary: `packages/core/schema/symbol-classification.json` is the source; `scripts/generate-symbol-classification.mjs` emits `symbol-granularity.generated.ts` (constants, role-inference map, prose lists) and `symbol_classification.pl` (facts); `symbol-granularity.ts` re-exports the generated vocabulary and drives `inferSymbolRole` from the generated role-inference map; `sync/manifest.ts`, `impact/diagnostics.ts`, and `operations/mutation/symbol-granularity.ts` consume the generated prose lists.
