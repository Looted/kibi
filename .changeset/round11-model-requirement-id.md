---
"kibi-cli": patch
"kibi-mcp": patch
---

`kb_model` `mode: "requirement"` now honours `requirementId` for an ordinary strict claim: the returned write set and `applyPlan` update that requirement instead of minting a separate `REQ-AUTO-<hash>` requirement beside it, so applying the plan no longer leaves a second requirement behind. When the plan reuses an existing subject fact, `writeSet.subjectFact.source` now names that fact's own file instead of the file of the subject fact that is never created.

Technical summary: `buildStrictWriteSet` takes an optional `requirementId` that replaces the minted `reqId` (the `req` step, its `source` and the `constrains`/`requires_property` relationships); fact ids, `subject_key` and the claim key stay derived from the claim. `applyVocabularyAlignment` threads `args.requirementId` into both write-set builds. `reuseExistingSubject` rewrites `properties.source` to `factSourcePath(existingFactId)` (`.kb/facts/<id>.md`, where Kibi stores every authored fact); the reused subject step stays out of `applyPlan` as before. The `requirementId` input description and the frozen MCP contract fixtures say what the field now does.
