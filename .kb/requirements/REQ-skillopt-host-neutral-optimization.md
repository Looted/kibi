---
title: SkillOpt optimization runs on the harness chosen for the run and keeps its evidence with that harness
status: open
priority: must
tags:
  - skillopt
  - harness
  - evaluation
firmness: firm
origin:
  kind: human
  ref: 'Maintainer decision, 2026-10-21: "Make SkillOpt treat the agent harness as an explicit per-run choice, finish the leftovers of the bundle removal, and record missing protocol calls."'
  recorded_at: '2026-10-21T11:05:29.674Z'
rationale: Operators switch agent harnesses often; the Codex-only rule tied every SkillOpt guarantee to one harness and to a removed bundle gate. Evidence from different harnesses is not comparable, so each run records its harness and refuses evidence from another.
semantic_text: SkillOpt must run every cell of a run on the agent harness chosen for that run before it starts. Each run must record its harness and the harness CLI version in the campaign record, the evaluation context and the package receipt. Confirm and package must refuse evidence produced on a different harness before any artifact or paid preparation. Candidate adoption must stay blocked until every individual gate passes and a reviewer approves the exact candidate hashes. Optimization must change only skill bodies and must keep skill frontmatter and declared resources unchanged. A cell receipt with zero protocol points must record the first missing required MCP call as a public tool name and position. Public feedback for the next revision must carry that missing call without call arguments, task identifiers or private evaluator content. The offline workflow contracts must carry no assembled-bundle gate, phase or result.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 2592be140f87c7536fba868d2d885ef5f1dd5c31c30a599f130ca15a309ec4d7
semantic_inventory:
  - claim_key: CLAIM-9BEF03F5EEE96A3C
    claim_text: SkillOpt must run every cell of a run on the agent harness chosen for that run before it starts
    role: normative
    status: modeled
    span:
      start: 0
      end: 95
  - claim_key: CLAIM-80E2220C68C6E70C
    claim_text: Each run must record its harness and the harness CLI version in the campaign record, the evaluation context and the package receipt
    role: normative
    status: modeled
    span:
      start: 97
      end: 228
  - claim_key: CLAIM-13BF49C39258644F
    claim_text: Confirm and package must refuse evidence produced on a different harness before any artifact or paid preparation
    role: normative
    status: modeled
    span:
      start: 230
      end: 342
  - claim_key: CLAIM-FEB7DB627F63E85C
    claim_text: Candidate adoption must stay blocked until every individual gate passes and a reviewer approves the exact candidate hashes
    role: normative
    status: modeled
    span:
      start: 344
      end: 466
  - claim_key: CLAIM-5C91D119516DA596
    claim_text: Optimization must change only skill bodies and must keep skill frontmatter and declared resources unchanged
    role: normative
    status: modeled
    span:
      start: 468
      end: 575
  - claim_key: CLAIM-73539D9504DAEC97
    claim_text: A cell receipt with zero protocol points must record the first missing required MCP call as a public tool name and position
    role: normative
    status: modeled
    span:
      start: 577
      end: 700
  - claim_key: CLAIM-F40BEC0A4F9DF19A
    claim_text: Public feedback for the next revision must carry that missing call without call arguments, task identifiers or private evaluator content
    role: normative
    status: modeled
    span:
      start: 702
      end: 838
  - claim_key: CLAIM-9F6D9D7156768934
    claim_text: The offline workflow contracts must carry no assembled-bundle gate, phase or result
    role: normative
    status: modeled
    span:
      start: 840
      end: 923
logic_claims:
  - CLAIM-9BEF03F5EEE96A3C
  - CLAIM-80E2220C68C6E70C
  - CLAIM-13BF49C39258644F
  - CLAIM-FEB7DB627F63E85C
  - CLAIM-5C91D119516DA596
  - CLAIM-73539D9504DAEC97
  - CLAIM-F40BEC0A4F9DF19A
  - CLAIM-9F6D9D7156768934
id: REQ-skillopt-host-neutral-optimization
type: req
---
SkillOpt must run every cell of a run on the agent harness chosen for that run before it starts. Each run must record its harness and the harness CLI version in the campaign record, the evaluation context and the package receipt. Confirm and package must refuse evidence produced on a different harness before any artifact or paid preparation. Candidate adoption must stay blocked until every individual gate passes and a reviewer approves the exact candidate hashes. Optimization must change only skill bodies and must keep skill frontmatter and declared resources unchanged. A cell receipt with zero protocol points must record the first missing required MCP call as a public tool name and position. Public feedback for the next revision must carry that missing call without call arguments, task identifiers or private evaluator content. The offline workflow contracts must carry no assembled-bundle gate, phase or result.

## Carried-forward rules

These rules of the superseded Codex-only requirement keep applying, now for whichever harness the run uses:

- Target and optimizer models and efforts are pinned for the run. The trainer uses all eight balanced public training cases and all four balanced public development cases; `--max-steps` means 1–4 complete rollout, reflection, proposal and development rounds, and the trainer deadline covers baseline selection, every target cell and one optimizer allowance per round.
- Optimizer capture uses the harness's dedicated final answer, never an early progress message. Before any candidate cell launches, the body passes body-only safety validation, keeps the non-installing CLI and direct-`.kb` prohibition text and the core Kibi discovery, mutation and check operations, and is a complete replacement. Accepted optimizer output is saved into the run's artifact tree before cleanup.
- Behavioral failures keep their earned 60/25/15 score for optimizer feedback; infrastructure, interruption, budget, evidence-conflict and critical-security failures score zero. Reflection receives structured public status, score, failure categories, the model-originated Kibi tool sequence and final-state evidence, never raw evidence.
- Optimizer output stays portable: no names of Kibi's own Git refs, package manager commands, release scripts, changeset policy, merge or publishing flow, evaluator task IDs or trajectory payloads. Predicate guidance distinguishes graph relationships from ontology predicate schemas. Each round receives a compact cumulative public failure summary.
- A paid run may be seeded from a preserved candidate body that passes candidate validation, binds to the current frontmatter and resource hashes, and is recorded by hash and byte length, without replacing the baseline or one-shot comparators.
- Baseline and one-shot are both scored on development before training and the stronger seeds the trainer. A frozen candidate is re-evaluated through the development cell lane and enters held-out only with mean at least 0.85, at least three hard passes and worst-family mean at least 0.75, while strictly improving mean without regressing hard passes or worst-family mean; a miss emits a blocked `development_gate_ineligible` review. The 36-cell predicate supplement stays required for integrity.
- Versioned evaluation artifacts enforce the same completion, identity, timestamp, uniqueness, size, source-pin and approval-integrity rules in JSON Schema, TypeScript and Python.
- The bridge owns one process group spanning Bun, the harness CLI and MCP descendants, and terminates and reaps it on timeout or interruption. Private credential files are mode `0600`, private workspace roots stay cleanup-retryable, and refreshed Codex ChatGPT tokens are written back to the host auth file under an exclusive lock.
- Each paid run stages one private runtime lease for its harness and passes the same executable paths to every cell lane, with no fallback to a bare harness command. Infrastructure failures stop the matrix with a structured no-go.
- Fixtures pin the target cell, the harness-launched MCP broker and the independent verifier to one dedicated Kibi ref name, declared explicitly in the harness MCP configuration. Noninteractive mutation approval is limited to the evaluator-owned, allowlisted broker.
- Scoring seals the verifier's exact requests, validates every result hash and the broker hash chain, and uses target-to-server requests for tool order. Protocol evidence keeps every brokered attempt; an empty diagnostic receipt is valid when no call succeeded. Staged MCP brokers clean up their Kibi server before the workspace is removed.

## Context

The earlier rule named Codex as the sole SkillOpt host and pinned one target model, so every other part of it (capture, scoring, portability, gates, isolation and evidence) was tied to one harness. Harnesses are now switched often, and the maintainer decided that SkillOpt supports several of them with one chosen explicitly before each run. Evidence from different harnesses is not comparable, so a run records its harness and refuses evidence from another one. The assembled four-skill bundle gate was removed earlier and is not carried forward. Who asked: the maintainer; source: the decision quoted below.

## Source

> Make SkillOpt treat the agent harness as an explicit per-run choice, finish the leftovers of the bundle removal, and record missing protocol calls.

Maintainer decision, 2026-10-21.

## Why this changed

The Codex-only rule no longer matches how SkillOpt runs: operators now pick Codex or Claude Code per run, the bundle gate was removed from the methodology, and the target model it pinned is stale. This requirement keeps every still-valid rule host-neutral, adds the per-run harness record and cross-harness refusal, and records the first missing required call.