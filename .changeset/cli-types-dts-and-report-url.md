---
"kibi-cli": patch
---

The published CLI now loads the HTML report stylesheet with a Node-compatible `import.meta.url` path, so `kibi-cli` builds under `tsc`. Type-only telemetry, proof, apply-plan, and engine contracts live in `.d.ts` files, which the existing coverage ignore already excludes.

- Replace Bun-only `import.meta.dir` in the HTML report
- Rename extracted type modules to `.d.ts` so the unit-coverage manifest does not require them
