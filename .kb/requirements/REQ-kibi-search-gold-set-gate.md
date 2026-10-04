---
title: CI gates kb_search answers on a versioned gold set of questions about Kibi's own KB
status: open
priority: should
tags:
  - evaluation
  - search
  - gold-set
  - ci
  - latency
semantic_text: The proof workflow must ask Kibi's own KB every question of the current versioned repository search gold set through the built CLI after the proof baseline. The repository search gate must restart the engine and warm it with a question outside the gold set before it asks each gold question once. The repository search gate must fail when recall at three, the superseded-result rate, abstention precision, abstention recall, or warm p50 or p95 latency misses its committed threshold. A gold question the CLI cannot answer must fail the repository search gate. The repository search gate must list every missed question, superseded result, and false abstention in its output.
semantic_clauses:
  - The proof workflow must ask Kibi's own KB every question of the current versioned repository search gold set through the built CLI after the proof baseline.
  - The repository search gate must restart the engine and warm it with a question outside the gold set before it asks each gold question once.
  - The repository search gate must fail when recall at three, the superseded-result rate, abstention precision, abstention recall, or warm p50 or p95 latency misses its committed threshold.
  - A gold question the CLI cannot answer must fail the repository search gate.
  - The repository search gate must list every missed question, superseded result, and false abstention in its output.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4aa3a270b2e8df1c00166a08c1f2591f7cbee2a016e8e6649faddcfab224658a
semantic_inventory:
  - claim_key: CLAIM-935B9A89155C94E1
    claim_text: The proof workflow must ask Kibi's own KB every question of the current versioned repository search gold set through the built CLI after the proof baseline
    role: normative
    span:
      start: 0
      end: 155
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-7F1D42B648D91402
    claim_text: The repository search gate must restart the engine and warm it with a question outside the gold set before it asks each gold question once
    role: normative
    span:
      start: 157
      end: 295
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-97BBCE082A5947F0
    claim_text: The repository search gate must fail when recall at three, the superseded-result rate, abstention precision, abstention recall, or warm p50 or p95 latency misses its committed threshold
    role: normative
    span:
      start: 297
      end: 482
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-6A1E0A7FC53207AC
    claim_text: A gold question the CLI cannot answer must fail the repository search gate
    role: normative
    span:
      start: 484
      end: 558
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
  - claim_key: CLAIM-3CA540C3A4E7EB38
    claim_text: The repository search gate must list every missed question, superseded result, and false abstention in its output
    role: normative
    span:
      start: 560
      end: 673
    status: modeled
    reason: Grounded by a logical_requirement_rule predicate fact over the reviewed project-local logical_requirement_rule schema.
logic_claims:
  - CLAIM-935B9A89155C94E1
  - CLAIM-7F1D42B648D91402
  - CLAIM-97BBCE082A5947F0
  - CLAIM-6A1E0A7FC53207AC
  - CLAIM-3CA540C3A4E7EB38
origin:
  kind: agent
  recorded_at: '2026-10-04T02:40:22.709Z'
id: REQ-kibi-search-gold-set-gate
type: req
---
The proof workflow must ask Kibi's own KB every question of the current versioned repository search gold set through the built CLI after the proof baseline. The repository search gate must restart the engine and warm it with a question outside the gold set before it asks each gold question once. The repository search gate must fail when recall at three, the superseded-result rate, abstention precision, abstention recall, or warm p50 or p95 latency misses its committed threshold. A gold question the CLI cannot answer must fail the repository search gate. The repository search gate must list every missed question, superseded result, and false abstention in its output.

## Rationale

The `kb_search` answer layer is how agents learn which requirements govern a change, so a ranking or answer regression on Kibi's own KB, such as a superseded requirement shown as current or a warm search that slows past the latency budget, has to fail CI rather than surface later in an agent session (changeset `search-answer-layer`). The thresholds sit just under the measured baseline, and a KB change that moves what governs a question adds a new gold set version instead of relabelling an existing one, so a score change is never a silent relabelling.
