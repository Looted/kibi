---
title: The schema 20 upgrade keeps the level and says how to choose remember
status: active
expects: success
tags:
  - levels
origin:
  kind: agent
  recorded_at: '2026-11-25T09:48:23.491Z'
id: SCEN-kibi-schema-20-level
type: scenario
---
Given a project that sets no level, when it upgrades to schema 20, then it stays at test and the upgrade notes say a person sets kibi.level to remember or runs kibi init --level remember; given a project at remember, it stays at remember. Nothing is written.
