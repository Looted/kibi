---
"kibi-cli": patch
---

`kibi sync --refresh-symbol-coordinates` no longer reports coarse symbol anchors as coordinate-refresh failures. Symbols that intentionally represent a whole test file, module-level behavior, config artifact, or an acknowledged extractor miss legitimately carry no per-symbol coordinates, so they are now counted as unchanged instead of failed. This makes the refresh summary trustworthy: `failed` now means a fine-grained code symbol that should have coordinates but could not be located.

- Treat `test-suite`, `module-level-behavior`, `config-artifact`, and `extractor-miss` granularity reasons as coordinate-ineligible.
- Repoint `formatInvalidRelationshipError`/`Tuple` and `formatRelationshipSourceMismatch` to their defining module and merge their interface-parity traceability.
- Drop duplicate and dead symbol manifest entries (`SkillsLoadPayload`, re-export duplicate `SemanticAdvisorArgs`, `SYM-parity-format-*`, duplicate `process-control` anchor).
- Fix `kibiOpencodePlugin` to point at its defining file with an acknowledged `extractor-miss`.
- Add `test-suite`/`config-artifact` granularity to remaining prose-titled test and scope anchors.
