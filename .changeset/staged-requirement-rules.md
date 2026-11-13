---
"kibi-cli": minor
---

The pre-commit gate (`kibi check --staged`) now enforces the requirement rules that `kibi check` blocks on, judged only for the entities the commit stages and only from the KB schema that introduced each rule:

- From schema 16: `claim-subject-missing`, `claim-subject-undefined`, and `subject-definition-missing` for staged subject facts.
- From schema 17: `must-positive-scenario`, except for the must requirements `.kb/manifest.json` acknowledges.
- From schema 18: `related-requirement-unmodeled`, run only when a staged requirement has an unmodeled claim.
- `evidence-floor` and `agent-requirement-unapproved-implemented` for a requirement the commit adds or whose status, priority, firmness, `required_evidence` or `origin` changes, judged on the front matter and links the commit stages. These rules read tests, symbols and proof receipts from the synced branch store, as `kibi check` does, through a private copy of it with the staged requirement documents projected over the synced ones, so an edit you have not run `kibi sync` on yet is judged as it will be committed: adding `approved_by` clears the finding, and removing it blocks. A requirement the store does not hold yet is judged after its first sync.

A finding in a document the commit does not touch keeps failing only the full `kibi check`.
