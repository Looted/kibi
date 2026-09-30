---
"kibi-plugin-sdk": minor
"kibi-plugin-builtin": minor
"kibi-cli": minor
"kibi-runtime": minor
---

Kibi can now analyze source in Python, Go, Rust and a broader set of common programming and configuration languages, offline, while JavaScript and TypeScript keep working as before. Staged checks read source and authored knowledge from one immutable Git tree, inspect both sides of every change, and keep incomplete analysis explicit instead of treating it as proof. Large files now return an explicit analysis failure instead of a second validation error.

- Add the asynchronous `kibi.symbol-extractor.v2` contract with validated UTF-16 ranges, bounded inputs and host-assigned provenance, plus a ts-morph v2 adapter.
- Add the optional `kibi-plugin-treesitter` package with pinned WASM grammars, queries, licenses and an approved-analyzer closure verified before import.
- Capture staged and explicit-diff snapshots from Git objects; merge duplicate symbol-manifest records deterministically and fail conflicting authored fields with `SOURCE_DUPLICATE_CONFLICT`.
- Add opt-in, bounded parser-phase and Prolog round-trip timing observations that never enter result schemas.
