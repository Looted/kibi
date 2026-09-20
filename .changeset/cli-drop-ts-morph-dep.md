---
"kibi-plugin-builtin": minor
"kibi-cli": patch
---

Coordinate enrichment, granularity candidate collection, and private-member helpers now live in `kibi-plugin-builtin`, so the CLI can analyze TypeScript/JavaScript symbols without depending on `ts-morph` directly. Hosts that only install `kibi-cli` still get the same enrichment and staged-symbol behavior through the builtin plugin.

- Export `enrichSymbolCoordinatesWithTsMorph`, `collectGranularityCandidates`, `onlyCandidate`, and `isPrivateClassMember` from `kibi-plugin-builtin`
- Thin-wrap those helpers from CLI `symbols-ts`, `symbol-granularity`, and `symbol-extract`
- Drop `ts-morph` from `kibi-cli` runtime dependencies (kept as a test-only devDependency for AST spies)
