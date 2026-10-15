---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

`kb_compile_intent` no longer reports "no conflict" for intent it could not check. Prolog compares only requirements that have a logical model, so a claim the advisor left as an ontology gap, or one next to a current requirement that exists only as prose, used to come back as `no_conflict` even when discovery had just returned a requirement saying the opposite. The plan now says the check is unresolved, names the related requirements the agent must compare, and blocks when the agent reports a conflict. Bootstrap plans name the same requirements for review before approval.

- `contradictionAnalysis` gains `reasons` (`unmodeled_target` with the claim keys, `unmodeled_related` with the requirement ids, `analysis_unavailable`), `reviewCandidates` (up to five related current requirements with discovery score at least 0.1: id, title, the sentence sharing the most terms with the intent, statement, score, `modeled`, `review`) and `nextAction`. Any reason makes `outcome` `unresolved`.
- New `kb_compile_intent` input `conflictReviews: [{requirementId, verdict: "conflict" | "no_conflict", note?}]`. A `conflict` verdict makes the outcome `conflict` and the plan `blocked`; `no_conflict` clears that candidate. A verdict on a current requirement discovery did not rank is honored; one that names no current requirement is ignored with a diagnostic.
- Pending reviews do not change the plan status: a plan whose propositions are modeled stays `ready` with `Contradiction check incomplete: …` in its diagnostics and becomes `no_conflict` once every candidate is reviewed. An unmodeled target keeps the plan `needs_resolution` as before, and its outcome stays `unresolved` after review.
- `kb_plan_bootstrap` adds `review_against:<id>` evidence and a `conflict-review:` diagnostic for each planned intent claim that has prose-only current requirements on the same topic.
- `kibi-usage` 2.20.0 and `kibi-bootstrap` 3.15.0 tell the agent to compare and report instead of reading `unresolved` as consistent.
