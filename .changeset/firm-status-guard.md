---
"kibi-cli": patch
"kibi-mcp": patch
---

A status change no longer switches off the protection of a firm requirement. `kibi check --staged` used to treat any status change, such as `closed` or `in_progress`, as a restatement and stopped gating edits of the requirement's code in the same commit; now only a new statement or a supersede does. Retiring a firm requirement or ADR (`deprecated`, `retired` and the other retired statuses), or reopening one, is now a change of its claim: `kb_upsert` refuses it without new human words in `origin.ref` or `approval_ref`, and `kibi check` reports a hand edit as `decision-firm-edited`, so a rule can no longer be deprecated, rewritten and reopened without the person.
