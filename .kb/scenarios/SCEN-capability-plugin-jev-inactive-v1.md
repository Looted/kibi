---
title: Jev inactive and failure fallback
status: open
tags:
  - plugins
id: SCEN-capability-plugin-jev-inactive-v1
type: scenario
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
# SCEN-capability-plugin-jev-inactive-v1

Importing kibi-plugin-jev or leaving it inactive makes no TypeSafe client or network call. When the classifier is unavailable, classification falls back to builtin analysis. Plugin diagnostics do not expose credentials.
