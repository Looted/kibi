---
title: CLI status returns machine-readable metadata before first sync
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: kibi.cli.status
canonical_key: req.req_cli_status_pre_first_sync
id: FACT-SUBJ-REQ-CLI-STATUS-PRE-FIRST-SYNC
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The kibi status command, which reports machine-readable KB metadata such as freshness and branch, and works immediately after kibi init before any sync. It reads state; it does not sync.
