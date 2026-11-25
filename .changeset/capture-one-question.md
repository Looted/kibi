---
"kibi-cli": minor
"kibi-core": patch
---

A requirement written with `kb_record` or `kb_upsert` now gets every step `kb_check` will ask for in one answer, and the person is asked once.

- `nextActions` adds the pair reviews `kb_check` asks for once the claims name their subjects (one `pair_reviews` template per related requirement), a `kb_model` step for unmodeled claims below a `tested` floor, the failure-side scenario (`expects: rejection`) validated by the same test, and the `kibi proof inspect` setup when the workspace has no `.kb/proof/integrations.json`.
- A new `approvalsNeeded` list names what only the person can settle: the statement itself, verdicts on firm pairs, the new integration file, and a failure-side waiver as the alternative to the failure scenario. The text result asks the agent to put them to the person in one question.
- `kb_query` and `kibi query` by `sourceFile` now return the requirements that the file's symbols implement, not only entities whose own `source` is the file.
- When `kb_search`'s top matches are close, its digest calls the reached requirements "candidate requirements, not confirmed to govern" instead of "Governing", and `answer.note` asks the agent to keep only those about the code being changed.
