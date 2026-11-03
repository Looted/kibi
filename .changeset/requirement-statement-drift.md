---
"kibi-cli": minor
---

The staged gate (`kibi check --staged`, run by the pre-commit hook) has a new blocking rule, `requirement-statement-drift`. When a requirement pins `semantic_text` in its front matter, Kibi models, grounds and proves that text and never reads the body. Before this rule, you could rewrite the statement in the body and every claim, fact and proof stayed bound to the old wording, with nothing reported. Now a commit that changes a current requirement's body statement while leaving its pinned `semantic_text` untouched is refused. To get past it, restate `semantic_text` to match the body and re-derive its inventory, or, if the new text is background rather than a change to the requirement, move it under a context section (`## Context`, `## Rationale`, `## Notes`, ...). Context-only and whitespace-only edits, requirements without a pinned `semantic_text`, and retired requirements are not affected.
