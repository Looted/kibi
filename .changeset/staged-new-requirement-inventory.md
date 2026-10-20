---
"kibi-cli": minor
---

`kibi check --staged` (the pre-commit hook) now rejects a new requirement whose semantic inventory is missing or does not match its prose, the same way `kibi sync` refuses it. Before, the hook passed such a requirement as long as it had a Context section, and it reached history even though sync then refused it. A requirement is new when its path is not in `HEAD`, so a renamed requirement is judged too. A repository's first commit is exempt, since sync imports it as its semantic baseline.

Migration: requirements already committed without an inventory are unaffected until they are edited in a way sync judges. For a new requirement the hook rejects, run `kb_model` mode analyze (CLI: `semantic-advisor`) with its complete prose and write the returned inventory contract into it, or create it through `kb_upsert` with that contract.
