---
title: Superseded requirements end closed, sources resolve, and what needs a person stays a review action
status: active
priority: must
tags:
  - lifecycle
  - supersedes
  - source
  - migration
  - checks
origin:
  kind: agent
  recorded_at: '2026-10-04T05:38:09.355Z'
id: SCEN-kibi-kb-lifecycle-integrity
type: scenario
---
# Superseded requirements end closed, sources resolve, and what needs a person stays a review action

Given a schema 6 KB with an open requirement that another requirement supersedes, two requirements that supersede each other, an authored source naming a legacy `documentation/` path, a source naming the entity's own file, a source that resolves to nothing, and a source value that cannot be edited safely
When `kibi migrate` plans and `--apply-safe` applies the repairs
Then the superseded requirement's status line reads `closed`, the legacy source points at its `.kb/` file, and the self-referencing and dead sources are removed
And nothing else in those files changes.

Given the same KB after the repairs
When `kb_check` runs the `superseded-requirement-open` and `source-path-dangling` rules
Then it reports the supersession cycle once and the unsafe source as blocking violations
And the next migration plan carries them only as review actions.
