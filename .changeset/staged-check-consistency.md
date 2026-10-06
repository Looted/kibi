---
"kibi-cli": patch
---

The pre-commit hook now stops a commit that makes the knowledge base contradict itself. Before, `kibi check --staged` (what the hook runs) only checked symbol traceability, so a commit could add a success scenario that a current requirement forbids, such as a free order checking out under "checkout only when the cart total is positive", while a full `kibi check` on the same tree failed. A violation that was already committed still does not block unrelated commits.

When the staged change touches entity documents or relationship shards under `.kb/`, `kibi check --staged` now runs the `domain-contradictions`, `scenario-feasibility` and `exception-claim-keys` rules on a temporary KB projected from the staged tree. Code symbols are left out of that projection, since these rules never read them, which keeps the added hook time to seconds on a large KB. Only violations missing from the base commit's tree block; the base tree is analyzed only when the staged tree has violations. The staged projection also carries a scenario's `expects` outcome, which it previously dropped, so feasibility rules saw no success scenarios.
