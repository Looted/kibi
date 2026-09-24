---
"kibi-cli": minor
---

Commits now stop early when the staged source snapshot would regenerate different Kibi symbol manifests. The error names the affected manifest and gives a safe refresh and selective staging path, so a long proof run does not end with a dirty snapshot caused by generated files.

- Add `kibi check-generated --staged` with exact Git-index materialization, byte comparison, and index-race rejection.
- Run the gate in pre-commit and strict-proof CI before `prove --all`; keep proof freshness and baseline rules unchanged.
