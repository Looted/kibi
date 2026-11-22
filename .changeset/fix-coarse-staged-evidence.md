---
"kibi-cli": patch
---

`kibi check --staged` no longer blocks commits to files whose `.kb/symbols.yaml` entries all use a documented coarse `granularity_reason` (such as `config-artifact`, `module-level-behavior`, `extractor-miss`, or `test-suite`). Previously, editing and staging such a file failed with `kibi_impact_evidence_missing` and no `Detail:` lines even when every declaration in the file was already recorded and linked.

- `assessStagedSymbolsManifest` now adds `coarseCovered` files to `coveredPaths` so they are reported as `fresh` (and included in `coveredSourcePaths` when a comparison base is present) instead of being skipped and returning `not_required` with an empty path list.
- Records using `granularity_reason: legacy-link` or an unknown reason are still judged normally against extracted declarations.
