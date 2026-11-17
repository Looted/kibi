---
title: A clean store is attached without a repair record
status: active
expects: rejection
priority: must
tags:
  - negative-path
origin:
  kind: agent
  recorded_at: '2026-11-17T09:08:09.213Z'
id: SCEN-NEG-core-snapshot-duplicate-repair-UNREPORTED
type: scenario
---
Given a branch store that holds each triple once, when an engine attaches it, then no repair is recorded, and a repair record older than seven days, unreadable or undated is not reported by kb_status or kibi doctor.