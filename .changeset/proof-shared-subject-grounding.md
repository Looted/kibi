---
"kibi-core": patch
---

A requirement with two or more strict property clauses about the same
subject can now be proven. `kb_model_requirement` creates one subject fact
per strict claim, so such a requirement links several subject facts that
share one subject key. Proof then counted every property claim once per
matching subject and marked it `ambiguous_logic_grounding`, even though each
claim had exactly one property fact. That left the requirement unprovable no
matter what evidence existed.

- `requirement_proof.pl`: property-lane ground evidence treats the
  constrained subject as an existential match (`once/1`), so each property
  fact is one ground representation.
- plunit regression test covering two same-key subject facts and one
  property fact.
