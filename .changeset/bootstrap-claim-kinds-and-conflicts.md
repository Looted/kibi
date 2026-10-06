---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-codex": patch
"kibi-opencode": patch
"kibi-cursor": patch
"kibi-claude": patch
"kibi-zcode": patch
---

Bootstrap now keeps what the onboarding interview leaves unsettled. Previously every declared claim was treated as intended behavior, and contradictions between sources or open questions had no place in the plan, so they stayed in the agent's own notes and were lost after apply. Now a claim can be marked as an observation or an open question, and conflicts between claims can be declared. Each is kept in the KB as a cited review fact instead of becoming a requirement.

`kb_plan_bootstrap` accepts `bootstrapContext.intentClaims[].kind` (`intent` by default, `observation`, `open_question`) and `bootstrapContext.conflicts[]` (`claimReferences` of two to ten `{ sourceId, reference }` pairs plus a `note`). Observation and open-question claims become `fact_kind: observation` candidates with the claim's citation evidence and `text_ref: <sourceId>:<reference>`; open questions are tagged `review:open-question`. Each conflict becomes a `fact_kind: observation` candidate tagged `review:conflict` that cites every referenced claim; a conflict naming an undeclared claim is reported in `diagnostics`. Kinds and conflicts are part of `declaredContext` and the plan hash (the default `intent` kind is omitted, so existing plans keep their hash), and the facts go through the same plan-time write validation as every other candidate. The `kibi-bootstrap` skill (3.2.3) updates the harvest, declare and approval steps.
