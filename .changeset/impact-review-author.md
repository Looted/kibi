---
"kibi-cli": minor
"kibi-mcp": minor
"kibi-runtime": minor
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

Impact reviews no longer need a hand-built record. On a large staged change, `kb_prepare_impact_review` returned the complete evidence and an unauthored record template for every file, which outgrew a host's tool-result cap.

- `kb_prepare_impact_review` (CLI `kibi prepare-impact-review`) returns the record headers, bindings and residual obligations, a row per file (status, disposition, analysis status, requirement ids, pending obligations) and each scoped requirement once with its before and after fingerprints. It pages within the result budget (`offset`), and every page carries the scope fingerprint and file count. Complete evidence is returned only for the files named in `paths`, on the page that lists each file's row. Neither paging nor `paths` narrows the review inventory.
- The record schema is published once, as the `kibi-commit-review` skill resource `resources/impact-review.schema.json`.
- New operation `kb_author_impact_review` (CLI `kibi author-impact-review`) writes `.kibi/impact-review.json` for the staged scope from the reviewer's decisions; Kibi captures the evidence itself. It refuses decisions made against a different scope fingerprint, refuses a record that fails strict validation and leaves the existing file unchanged, keeps an earlier decision only for a file whose evidence and requirements are unchanged and reports the ones it drops. It never stages the record, generates a decision or creates proof.
- When the person signs the review, the agent saves its decisions with an empty `reviewer.id` to `.kibi/impact-review-decisions.json`, and the person adds their id and runs `kibi author-impact-review --input .kibi/impact-review-decisions.json`.
- A hand-written record still validates.
