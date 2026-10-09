---
"kibi-core": patch
---

`subject-key-identity` no longer reports a `forbid` fact and its `require` twin as "the same claim minted as several facts": the two state opposite claims, so the check now keeps them apart (an absent `polarity` still counts as `require`). Facts that only superseded or deprecated requirements still link are treated as history kept for the append-only `supersedes` chain and no longer count as live duplicates; a `closed` requirement still counts, because `closed` means done, not retired.

Technical summary: `duplicate_property_fact_violations/1` (`semantic_quality.pl`) groups by `key(SubjectKey, PropertyKey, Operator, Polarity, Value)` through the new `property_value_polarity/2`, and the evidence carries `polarity`. `identity_live_fact/1` keeps a fact when no requirement links it through `constrains`, `requires_property`, `requires_predicate` or `requires_rule`, or when at least one linking requirement is `kb:current_req/1`; both the subject and the property duplicate groups use it. New `kb.plt` tests cover the require/forbid pair and the superseded-only case.
