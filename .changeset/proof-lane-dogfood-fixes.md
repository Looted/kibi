---
"kibi-core": minor
"kibi-cli": minor
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-plugin-treesitter": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Fixes from running the formal-proof lane on two test projects.

**Migration note:** a type-shape symbol (interface, type alias, enum) covered by a unit test now counts as covered only while that unit test has a current passing receipt; an authored `status: passing` is no longer enough. After upgrading, give those unit tests a `proof_contract` and run `kibi prove --stale`. Until then coverage lists the symbols in `uncoveredSymbols` with `structural_unit_receipt_not_current`.

- `kibi migrate` pins a `tested` floor only where the proof ladder would accept it (newest receipt, every gap), so a migrated project no longer starts with dozens of `evidence-floor` violations.
- `kibi check` prints the evidence-floor suggestion in text output without `--fix`, and the suggestion names the failing receipts, uncovered symbols and missing coordinates.
- `kibi coverage --status` judges receipts with the same per-contract binding as the unfiltered report.
- Certificate domains: `domain_source.export` names the export when it differs from the symbol title; TypeScript domains load through bun, the workspace's tsx, or node with a resolve hook for extensionless and `.js` imports; imports of compiled output map back to sources through `tsconfig.json`; Python domains (`Enum`, `dict`, list, tuple, set) load with `python3`.
- An exported constant matched by name is judged as a narrow symbol by the upsert granularity check, as the staged gate and `kibi check` already did.
- `kibi prove` no longer prints a raw `git show` error for a newly added test document, attributes a valid all-pass test report per test, and stops the producer's whole process group on Ctrl-C.
- New `kibi prove --stale` reruns only tests without a current passing receipt.
- New `kibi proof run-steps` runs `proof/steps.json` as a `command` integration and writes the per-test report.
- Receipt binding ignores a test document's `links`, so adding a link no longer stales its receipts; receipts bound the earlier way stay current.
- The tree-sitter analyzer keeps a file with more than 64 decorated declarations decorator-only (the last diagnostic summarizes the rest), so `kibi sync --refresh-symbol-coordinates` no longer aborts on it.
- `kibi sync --refresh-symbol-coordinates` counts refreshed symbols against the stored coordinate artifact.
- New `coarse_anchor_only_review` diagnostic for requirements implemented only by whole-file anchors.
- `kibi proof inspect` detects `node --test` and `bun test` in root and workspace scripts.
- `kibi doctor` warns instead of failing when an augment-mode plugin's secret is missing, and the merge-driver setup names the project's package manager.
- `kibi coverage` text output groups traceability and proof counts.
- Claim texts that differ only in whitespace or trailing punctuation match.
- `pack:all -- --dev-version` stamps local packs `<version>-dev.<sha>`.
