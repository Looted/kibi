---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-cursor": patch
"kibi-codex": patch
"kibi-claude": patch
"kibi-zcode": patch
---

A `Kibi-Impact: none` line never changed the result of `kibi check --staged`, so it is no longer parsed or documented, and the `kibi_impact_override_missing_rationale` diagnostic is removed. A behavior edit is cleared only by staged evidence or by a `.kb/symbols.yaml` that covers every declaration of the file. An entity document that quotes the declaration now counts as staged evidence instead of being dropped.

Behaviour change: the diagnostic id `kibi_impact_override_missing_rationale` no longer exists. The bundled `kibi-commit-review` skill drops the audited no-impact section.
