---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

When `kibi check --staged` refuses a new or changed declaration that no requirement owns, it now prints one block for it instead of four findings for the same cause. The block lists the requirements the rest of the file already implements, each with a paste-ready `kb_upsert` input that links the declaration and its tests, and never picks one. On a test project, one new unowned function went from 3,278 characters in four findings to one 788-character block, and pasting the block's input made the next commit pass.

- One `[BLOCKS COMMIT]` block per declaration stands for its `symbols_manifest_stale`, `kibi_impact_evidence_missing`, `symbol_semantic_review_needed` and `Traceability failed` findings. It names the candidates in id order, a payload for the first three, the CLI form (`npx --no-install kibi upsert --input -`), the new-behavior path and `git add .kb && git commit`. A type gets a `type-shape` record payload instead.
- `--format json` keeps every underlying finding and adds `ownerFindings` (`blocks: "commit"`, `symbol`, `file`, `line`, `state`, `typeShape`, `causes`, `candidates`, `payloads`).
- `kb_upsert` `implementedBy` entries accept `coveredBy` test ids; each becomes a `covered_by` link from the same symbol.
- `symbol_semantic_review_needed` carries `evidence.symbol`.
- The `kibi-commit-review` skill describes the block.
