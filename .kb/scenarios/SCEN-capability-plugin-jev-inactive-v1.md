---
title: Jev inactive and failure fallback
status: open
tags:
  - plugins
id: SCEN-capability-plugin-jev-inactive-v1
type: scenario
---
# SCEN-capability-plugin-jev-inactive-v1

Importing kibi-plugin-jev or leaving it inactive makes no TypeSafe client or network call. When the classifier is unavailable, classification falls back to builtin analysis. Plugin diagnostics do not expose credentials.
