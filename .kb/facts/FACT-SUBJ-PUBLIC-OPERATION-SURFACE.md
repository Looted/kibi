---
title: Kibi Public Operation Surface
status: active
tags:
  - strict-lane
  - surface
fact_kind: subject
subject_key: kibi.public_operation_surface
id: FACT-SUBJ-PUBLIC-OPERATION-SURFACE
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The single versioned catalog of Kibi public operations and their input and output contracts that both the MCP server and the CLI JSON route expose, so the same input gives the same result or error on both. It excludes internal helpers and plugin APIs.
