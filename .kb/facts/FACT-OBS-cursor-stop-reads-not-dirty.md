---
id: FACT-OBS-cursor-stop-reads-not-dirty
title: Read and search tools do not mark dirty paths
status: active
created_at: 2026-08-18T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
source: documentation/facts/FACT-OBS-cursor-stop-reads-not-dirty.md
tags:
  - cursor
  - plugin
  - hooks
  - observation
fact_kind: observation
links:
  - type: relates_to
    target: REQ-cursor-stop-job-vs-plan
---

Source-file reads, search, and other non-edit tools must not be recorded as dirty paths for stop-hook freshness follow-up. Only known editable tools such as `Write`, `StrReplace`, and `Edit` mark dirty paths.
