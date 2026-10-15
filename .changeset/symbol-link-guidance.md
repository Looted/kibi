---
"kibi-cli": minor
"kibi-core": patch
"kibi-runtime": minor
"kibi-mcp": minor
---

`kb_upsert` now refuses a coarse symbol link when it is written instead of leaving it for the pre-commit hook. A payload that only adds `implements` or `covered_by` to a stored symbol is judged against the stored `sourceFile` and `granularity_reason`, and a class-level symbol whose public methods are behavioral symbols is refused with those methods as candidates, as `kibi check` (`symbol-granularity`) and the staged hook already did. `symbol-coverage` on a symbol that already has `covered_by` now names the missing link: which test does not verify which implemented requirement, and the `verified_by(SCEN-…, TEST-…)` or `verified_by(REQ-…, TEST-…)` that connects them, instead of asking for `covered_by` again.

Migration: a `kb_upsert` with `dryRun: true` on an invalid payload now returns an error envelope (`status: "error"`, MCP `isError: true`, CLI exit code 1) with code `UPSERT_DRY_RUN_INVALID`; `data.valid: false` and `data.errors` are unchanged. Callers that read `status` to decide whether a dry run passed now see the failure; callers that read `data.valid` need no change. Links-only upserts that relied on the gap to attach a class-level symbol are now refused: move the links to the method symbol or set an allowed `granularity_reason`.

An invalid `status` lists only the values of the entity's type. A requirement whose grounding fact does not exist yet is told to write the fact from the `kb_compile_intent` plan's earlier step first, instead of being told the fact lacks a `claim_key`.
