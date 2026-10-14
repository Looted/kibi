---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-runtime": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Bootstrap no longer plans a declared intent claim as a new requirement when it only restates a requirement that is already in the knowledge base. A claim whose statement or excerpt matches an existing requirement's title, its semantic text or one of its sentences (ignoring case, whitespace and punctuation) is counted as already in the KB and names that requirement; a claim that comes close without matching is still planned, with a diagnostic naming the requirement to review. MCP tools that reject their input now return the same error code the CLI does (for example `VALIDATION_FAILED` for a clause that is not a verbatim fragment), in `structuredContent.error`, instead of a plain text failure.

- `kb_plan_bootstrap`: before planning an `intent` claim, the planner reads every current requirement (`kb:current_req/1`, projected to id, title and `semantic_text`) through the engine it already uses for existing ids, only when intent claims are declared. A normalized exact match of the claim's `statement` or `excerpt` against the title, the whole semantic text or one sentence of it adds an `entity_exists` row with `matchedId`, `matchedBy: "restatement"` and `matchedField`, and the per-source accounting counts it as already in the KB. A token-set Jaccard of 0.8 or more (the entity-context restatement threshold) without an exact match keeps the candidate, adds `possible_restatement:<id>` to its evidence and emits a diagnostic. Requirements are compared in id order, so the plan hash stays stable for the same KB and context.
- MCP `addTool`: an `InputError` or `OperationError` thrown by a handler (matched by class, or by name and an upper-case `code` when bundled separately) returns `isError: true` with a protocol 1 error envelope (`status: "error"`, `error: { code, message, retryable }`) and the text `Tool <name> failed: [<code>] <message>`, matching the CLI JSON route. Errors without a Kibi code still raise `Tool <name> failed: …`.
- `kibi-runtime` exports `codedErrorOf` and `CodedErrorFields`.
- Skills: `kibi-bootstrap` 3.14.0 (claims that restate a current requirement count as already in the KB; review "closely restates" diagnostics before approval).
