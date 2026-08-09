---
"kibi-cli": patch
---

`kibi check --staged` now reports the paths Kibi is actually configured to use. Previously the stale-coordinates and missing-evidence diagnostics always printed the default `documentation/symbols.yaml` and `documentation/symbol-coordinates.yaml`, so repos that configure `paths.symbols` (for example `docs/symbols.yaml`) were told to stage files that do not exist. The staged-symbols freshness check also stopped treating coarse-documented symbols as a perpetual failure: source files whose manifest entries are all documented with a canonical granularity reason (for example `module-level-behavior`) no longer require per-symbol coordinate refresh and no longer emit `symbols_manifest_stale` after a coordinate refresh.

- Thread the config-resolved symbols manifest path from `check --staged` into `collectStagedKibiDiagnostics` and render `files`/`message`/`suggestion` with the effective `symbols-coordinates.yaml` path carried on the impact evidence.
- Define "coarse" with the canonical no-coordinates granularity set (`COARSE_GRANULARITY_REASONS`: `config-artifact`, `module-level-behavior`, `extractor-miss`, `test-suite`), so unknown or malformed reasons cannot bypass freshness checks. `legacy-link` records stay coordinate-bearing because they track real extractable symbols.
- Exclude coarse records from per-symbol coordinate comparison; a file with only coarse records is `not_required`, mixed manifests still require complete fresh fine-grained coverage, and record-less files remain `stale`/`missing`.
- Add unit and CLI-level regression tests covering configured `docs/` diagnostics paths and coarse/mixed/invalid-granularity freshness.
