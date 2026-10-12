---
"kibi-cli": minor
"kibi-mcp": minor
---

A grounding fact (`property_value`, `predicate`, `rule`) no longer has to carry a `claim_key`: send the exact atomic clause as `claim_text` and Kibi derives the key on `kb_upsert`, `kb_apply_plan`, `plannedFacts` and `kibi sync`. A key that is sent must still equal the one derived from the text, so a copied pair keeps its integrity check and a guessed key is refused with the expected value, and a `claim_key` without `claim_text` is refused. Observation and meta facts keep quoting a claim without a key. An evaluation on a test project ended a modeling trace on `claim_key must equal the stable key derived from claim_text` after guessing the key; that failure mode is gone.

Technical summary: the entity schema and the `kb_upsert` properties schema replace the "claim_text on a non-observation fact requires claim_key" conditional with "claim_key requires claim_text"; `deriveFactClaimKey` in `semantic-advisor/clauses.ts` fills the key in `validateUpsertInput` and in the Markdown extractor before the existing mismatch check. The kibi-usage skill (2.15.3), the modeling cheatsheet and the error reference describe the derived key. Requirement REQ-kibi-review-observation-claim-text is superseded by REQ-kibi-review-observation-claim-text-v2.
