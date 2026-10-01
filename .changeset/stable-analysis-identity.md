---
"kibi-cli": minor
"kibi-runtime": patch
"kibi-plugin-sdk": minor
"kibi-plugin-builtin": patch
---

An impact review prepared on one machine now still validates in CI, and the MCP server and the CLI agree on whether it is current. Checks only block on incomplete source analysis the author can act on: the committed side of a change never blocks, and a known analyzer limitation such as a Rust macro or a Python decorator matters only where it overlaps the changed lines. Syntax, parse, timeout and integrity problems in the staged file still block. Long-running hosts no longer grow memory with every analyzed file, and Tree-sitter analysis reuses warm workers instead of starting one per file.

- Identify the impact evaluator by its contract version and the canonical JSON of the schemas it consumes, instead of hashing the installed file tree and `process.version`. Identify the builtin analyzer runtime by its package identity rather than its installed tree.
- `kibi-runtime` bundles the CLI operations again (`kibi-cli` is a build-time dependency only); it no longer installs `kibi-cli`.
- Add one shared analysis gate (`analysisObligation`) used by staged checks, impact-review preparation and validation, and impact reports.
- Classify source paths from a single extension table in `source-classification`, with parity tests against the Tree-sitter catalog and the builtin extractor.
- Remove analyzed files from the ts-morph project after each v1 and v2 analysis.
- Add an optional `timeoutMs` budget to `SymbolExtractorV2AnalyzeInput`; the host sets it slightly below its own deadline, so providers report their own timeout. Tree-sitter uses a bounded, persistent worker pool with grammars loaded once per worker, and the host analyzes up to four changed files at a time.
