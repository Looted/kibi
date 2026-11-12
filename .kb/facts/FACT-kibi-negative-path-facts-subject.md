---
title: Negative-path facts in kb_search
status: active
fact_kind: subject
subject_key: kibi.search.negative_path_fact
canonical_key: kibi.search.negative_path_fact
tags:
  - strict-modeling
  - lane:strict
  - fact:subject
  - search
text_ref: packages/cli/src/negative-path-facts.ts
origin:
  kind: agent
  recorded_at: '2026-11-11T17:20:21.423Z'
id: FACT-kibi-negative-path-facts-subject
type: fact
---
A negative-path fact is a fact that a scenario expecting rejection or error assumes and on which no requirement grounds a claim. It describes a situation that must not happen, so its title read alone states the opposite of the requirement it guards. This subject covers how kb_search, its answer layer, its hints and the kibi search table show such facts.