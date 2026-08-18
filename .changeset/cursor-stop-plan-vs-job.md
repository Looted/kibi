---
"kibi-cursor": patch
---

The Cursor stop hook no longer starts an extra Kibi follow-up after you only deliver a plan. Reads and search no longer look like source edits, so plan mode can finish without an impact-check nudge. If that same turn actually edited source or updated the knowledge base, the existing follow-up still runs.

- Record dirty paths only from known editable tools.
- Treat `CreatePlan` as plan delivery and stay silent at stop unless that turn also edited source or mutated the KB.
- Skip follow-up when `stop.status` is `aborted` or `error`.
