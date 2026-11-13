---
"kibi-cli": minor
"kibi-core": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": minor
"kibi-codex": minor
"kibi-cursor": minor
"kibi-zcode": minor
---

Requirements that Kibi cannot compare are no longer let through unexamined: a requirement whose rule claims stay unmodeled is blocked against every current requirement it pairs with until the claims are modeled or a checkable verdict settles the pair.

- `related-requirement-unmodeled` now covers `ontology_gap` and `ambiguous` rule claims as well as `missing` ones, and pairs requirements through a shared subject as well as a `relates_to` edge, in either direction. It no longer requires the other requirement to be modeled with strict facts.
- New requirement property `pair_reviews`: a verdict on a pair (`no_conflict` with `separated_by`, `interacts` with `resolved_by`, or `conflict`) keyed by the claims it covers (`claim_key` and optional `payload_hash`), so it goes stale when a claim changes. It counts only while a `relates_to` edge links the pair. A `conflict` never settles a pair, and an agent's verdict on a pair with a must or firm requirement counts only with `origin.approved_by`.
- KB schema 18: `kibi migrate` writes nothing for this step (a verdict is a judgement Kibi does not make); it reports how many current requirements have unmodeled rule claims and points to `kibi check` for the pairs.
- The proposition plan no longer suggests `kb_upsert` as a way around the contradiction review.
- `kibi-usage` 2.46.0 and `kibi-decisions` 1.9.0 explain how to model or review a reported pair and that a person approves an agent's verdict.
