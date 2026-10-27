---
title: The symbol coordinate cache
status: active
fact_kind: subject
subject_key: kibi.symbols.coordinate_cache
tags:
  - strict-modeling
  - lane:strict
origin:
  kind: agent
  recorded_at: '2026-10-27T00:00:00.000Z'
id: FACT-SUBJ-symbol-coordinates-derived-locally
type: fact
---
`.kb/symbol-coordinates.yaml`: the source line ranges and hashes of every symbol in `.kb/symbols.yaml`. `kibi sync` derives it from source in each working tree; it is gitignored and never committed, so parallel branches that edit the same source file do not conflict on it.