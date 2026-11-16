---
title: Restated twin facts pass the duplicate-fact check
status: active
priority: must
expects: success
tags:
  - check
origin:
  kind: agent
  recorded_at: '2026-11-16T10:52:43.245Z'
id: SCEN-check-restated-twin-facts
type: scenario
---
Given two requirements that state one quantity in their own words, each grounding its own fact with the same value on one subject and property, when the second restates the first, then kibi check reports no subject-key-identity finding for the pair, and a third identical fact whose requirement restates neither is still reported with the group.