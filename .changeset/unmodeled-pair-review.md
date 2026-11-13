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
- New requirement property `pair_reviews`: a verdict on a pair (`no_conflict` with `separated_by`, `interacts` with `resolved_by`, or `conflict`) keyed by the claims it covers (`claim_key`), so it goes stale when an unmodeled claim it does not name appears. A `payload_hash` on a claim is accepted and ignored. A verdict counts only while a `relates_to` edge links the pair. `resolved_by` names a scenario either requirement is `specified_by`, a fact either links, a third current requirement, or a `condition` or `exception` claim key of either, never the two requirements themselves. A `conflict` never settles a pair. On a pair with a must or firm requirement, a verdict whose `origin` is missing or not `kind: human`, or that sits on a requirement an agent wrote, counts only with `origin.approved_by`.
- One finding per requirement and problem: it lists the requirements the claims pair with (the first 8, then how many more), so a subject shared by many prose requirements no longer floods `kibi check`. The finding also names a `pair_reviews` `with` that is no current requirement (a misspelled id settles nothing), and a `missing` claim whose role states no rule (classify it as `nonlogical` or review it).
- The domain rules follow the KB schema: `claim-subject-missing` and `claim-subject-undefined` apply from schema 16, and the pair semantics from schema 18; below 18 the earlier `related-requirement-unmodeled` rule still runs.
- KB schema 18: `kibi migrate` writes nothing for this step (a verdict is a judgement Kibi does not make); it reports how many current requirements have unmodeled rule claims and points to `kibi check` for the pairs.
- The proposition plan no longer suggests `kb_upsert` as a way around the contradiction review.
- `kibi-usage` and `kibi-decisions` explain how to model or review a reported pair and that a person approves an agent's verdict.
