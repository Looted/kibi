---
"kibi-plugin-jev": minor
"kibi-plugin-sdk": minor
"kibi-cli": minor
---

Optional Jev plugins can now be configured from the environment after a normal `package.json` activation, and `kibi doctor` shows which capability plugins that activation selected.

`TYPESAFE_API_KEY` remains the only credential and is never read from `package.json`. `KIBI_JEV_MODEL` selects the model (default `jev-latest`; a blank value is ignored). `KIBI_JEV_TIMEOUT_MS` sets a positive timeout up to 120000 milliseconds and fails with a clear provider error when the value is malformed. Explicit constructor options still win. Advisor and compile-intent results include plugin version, mode, external/network/metered flags, fallback, and the effective model when the classifier discloses one. Shadow comparisons stay out of the canonical result.

- Resolve Jev model and timeout from the environment with programmatic precedence
- Preserve optional `semanticClassifier.model` on provenance stamps
- Report parsed `kibi.plugins` from `kibi doctor` without importing plugin packages
---
