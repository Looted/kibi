---
title: Migrating a legacy KB maps delivered statuses and reports what stays uncompiled
status: active
expects: success
tags:
  - migration
  - requirement-status
origin:
  kind: agent
  recorded_at: '2026-10-14T08:56:44.511Z'
id: SCEN-cli-migrate-legacy-requirement-status
type: scenario
---
Given a legacy KB whose requirements use `status: implemented` or `done` (one with a Markdown table in its body) and one requirement with `status: wip`, `kibi migrate --dry-run` lists the mapping it would apply, and `kibi migrate --yes` rewrites the delivered statuses to `closed` with the tag `implemented`, records the count in the audit as `legacyStatusesMapped`, and prints the mapping. `kibi sync` then compiles those requirements as closed and implemented, so `kb_query` returns them and must-priority coverage still asks for their scenarios and tests. Because the `wip` requirement still cannot be compiled, the run prints `Migration incomplete`, names that requirement and the edit that fixes it, and does not claim that future runs are a no-op.
