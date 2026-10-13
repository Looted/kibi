---
title: Unreferenced firm decisions and unexplained supersedes are blocked, migrated legacy is not
status: active
priority: must
tags:
  - kb
  - decisions
origin:
  kind: agent
  recorded_at: '2026-10-12T22:24:31.840Z'
id: SCEN-kb-decision-firmness
type: scenario
---
Given a requirement marked firmness: firm with no origin.ref or approval_ref, kibi check reports decision-firm-unreferenced and kb_upsert refuses the write. Given a default requirement that supersedes a firm one, kibi check reports decision-firm-superseded. Given a current requirement that supersedes another without a "## Why this changed" section of at least 12 words, kibi check reports supersedes-reason-missing, unless the schema 9 migration recorded its id in the manifest, in which case only the advisory supersedes-reason-acknowledged count lists it. Search answer rows, kb_query results and hook snippets show the firmness of requirements and ADRs.

## Context
This is the end-to-end path the maintainer asked for: a later agent sees how firmly each decision was made and cannot silently replace a human's decision or supersede without evidence, while an existing KB upgrades through one migration without invented reasons.
