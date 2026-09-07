---
id: REQ-skillopt-codex-optimization
title: SkillOpt optimization must use Codex-only behavioral evidence
status: open
created_at: 2026-07-21T00:00:00.000Z
updated_at: 2026-09-05T00:00:00.000Z
source: documentation/facts/FACT-skillopt-methodology.md
priority: must
tags: []
links:
  - type: specified_by
    target: SCEN-skillopt-codex-optimization
  - type: verified_by
    target: TEST-skillopt-codex-optimization
  - type: supersedes
    target: REQ-skill-behavioral-efficacy
semantic_text: |-
  SkillOpt behavioral evaluation must use Codex as its sole host. Candidate adoption remains forbidden until every individual and bundle gate passes and a reviewer explicitly approves the exact candidate hashes. Optimization may change skill bodies only; skill frontmatter and declared resources remain immutable.

  Target cells must use `gpt-5.4-mini` at low effort. One-shot and iterative optimizer calls must use `gpt-5.6-sol` at xhigh effort. The trainer must use all eight balanced public training cases and all four balanced public development cases. `--max-steps` must represent 1–4 complete rollout/reflection/proposal/development rounds rather than a display-only or post-training limit. The outer trainer deadline must cover the internal baseline selection, every target cell, and one optimizer allowance per requested round instead of imposing a fixed 15-minute cap.

  Optimizer candidate capture must use Codex's dedicated final-message artifact, never the first `agent_message` in the JSONL progress stream. Before any candidate evaluation cell launches, the captured body must pass body-only safety validation, retain the required non-installing CLI and direct-`.kb` prohibition text, retain the core Kibi discovery/mutation/check operations, and have enough substantive content to be a complete replacement rather than a progress note. Every accepted one-shot and iterative optimizer result must be copied out of the ephemeral runtime into its run artifact tree before cleanup so paid optimization work remains available for seeding, audit, and recovery.

  Behavioral failures must preserve their earned 60/25/15 score for optimizer feedback while infrastructure, interruption, budget, evidence-conflict, and critical-security failures remain zero. Reflection must receive structured public status, score, failure categories, model-originated Kibi tool sequence, and final-state evidence, and must produce reusable procedural guidance without copying raw evidence into the skill.

  Optimizer output must remain portable across consuming repositories. It may not copy Kibi's own branch names, package manager commands, release scripts, changeset policy, merge flow, publishing policy, evaluator task IDs, or trajectory payloads into the reusable skill. Predicate-first optimization must distinguish graph relationships from ontology predicate schemas and include actionable prose-to-ground-predicate guidance covering schema name and arity, ordered arguments, canonical key, polarity, strict-scalar routing, and observation/ontology-gap fallbacks. Each optimizer round receives a compact cumulative public failure summary so recurring family failures are not forgotten when the latest stochastic rollout differs.

  An operator may explicitly seed a new paid run from a preserved candidate body. The seed must pass ordinary candidate safety validation, bind to the current immutable frontmatter and resource hashes, be recorded by hash and byte length in the new run, and become the trainer's initial skill without replacing the canonical baseline or one-shot comparators.

  Baseline and one-shot must both be scored on development before training, and the stronger result must seed the trainer. A frozen candidate's trainer selection score is feedback only; before admission, the candidate must be independently re-evaluated through the authoritative development cell lane. A frozen candidate may enter held-out only when that four-case public development result has mean at least 0.85, at least three hard passes, and worst-family mean at least 0.75, and it also strictly improves mean without regressing hard passes or worst-family mean against the stronger comparator. A development miss must emit a blocked `development_gate_ineligible` review with held-out `not-run`. The complete 36-cell predicate supplement remains required for integrity, but only SkillOpt predicate cells determine the supplemental behavioral predicate pass; comparator misses remain paired calibration evidence.

  Versioned evaluation artifacts must enforce the same completion, identity, timestamp, uniqueness, size, source-pin, and approval-integrity rules in JSON Schema, TypeScript, and Python.

  The authenticated bridge must own a single POSIX process group spanning Bun, Codex, and MCP descendants; the TypeScript cell and MCP broker runtimes must inherit that group rather than detach. Timeout or interruption must terminate and reap the group. Copied ChatGPT auth must be mode `0600` and every private workspace root must remain cleanup-retryable until all removals succeed. After a canary, optimizer, or target cell refreshes ChatGPT tokens inside its private `CODEX_HOME`, the refreshed `auth.json` must be written back to the host auth file under an exclusive lock so the next cell does not reuse a spent refresh token. A missing or non-ChatGPT private copy must not replace the host credentials.

  Each paid optimization run must stage one private Codex/bwrap runtime lease under its artifact root and pass the same absolute executable paths to development, trainer-bridge, and held-out cells. Real target execution must not fall back to a bare `codex` command or the host bwrap path. The paid smoke must prove exactly one shell-isolation probe, one model-originated read-only `kb_semantic_advisor` call, one successful model-originated branch-dependent `kb_status` call, matching valid broker hash-chain entries, and successful diagnostic usage receipts. Expected permission denials inside the shell probe must be silenced before exact-output validation so a successful isolation check cannot become a false infrastructure no-go. Runtime, training, or evidence infrastructure failures must stop the matrix and return a structured no-go rather than produce an eligibility review.

  Every non-Git evaluation fixture must pin the target cell, Codex-launched MCP broker, and independent verifier to the same dedicated Kibi branch and persist a valid empty branch snapshot before serving repeated reads. The Codex MCP configuration must declare that branch explicitly rather than relying on parent-process or shell environment inheritance. Noninteractive mutation approval must be limited to the target cell's evaluator-owned, allowlisted MCP broker; optimizer MCP calls remain annotation-gated.

  Real cell scoring must seal the independent verifier's exact query, check, and status requests, validate every result hash and the broker trace hash chain, and derive evaluator claims from those receipts. Tool-order scoring uses target-to-server requests only and permits advisory or validation calls between required ordered operations. Semantically incorrect but internally consistent final state is a behavioral failure; only missing, malformed, tampered, or contradictory evidence is an infrastructure no-go.

  A real cell's diagnostic receipt proves successful tool execution by matching the broker's tool-call multiset. Optional per-call diagnostic telemetry may be an object or `null`; its absence from a successful ordinary cell call is not evidence tampering. The paid smoke retains its stronger complete-telemetry requirement.

  Protocol evidence retains every brokered tool attempt so invalid, forbidden, and absent calls remain scoreable. Diagnostic success reconciliation is narrower: it requires matching success rows only for calls whose broker response completed without an MCP `isError` result. An empty diagnostic receipt is valid when that successful-call multiset is empty, so a model that makes no required MCP call receives an ordinary behavioral protocol failure. A rejected attempt followed by a successful correction is behavioral protocol evidence, not an infrastructure conflict.

  Every staged MCP broker must keep its downstream Kibi server in the bridge-owned process group and perform bounded TERM-to-KILL cleanup when the target transport closes or the broker is interrupted. Cleanup must finish before the disposable workspace is removed so deleted staged executables cannot remain mapped by orphan processes and exhaust the artifact tmpfs. An unmarked nonzero trainer-process exit or thrown outer-process timeout is a typed training infrastructure no-go with its diagnostic path, rather than an unstructured trainer exception.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 4cf0d8de9a3db60aeef0a628cc3218c596e359bbb9dfdb6358211bd0621bbd11
semantic_inventory:
  - claim_key: CLAIM-E002D9B8AFFE0354
    claim_text: SkillOpt behavioral evaluation must use Codex as its sole host
    role: normative
    status: ontology_gap
    span:
      start: 0
      end: 62
  - claim_key: CLAIM-69CDA48DDEBD5265
    claim_text: Candidate adoption remains forbidden until every individual and bundle gate passes and a reviewer explicitly approves the exact candidate hashes
    role: normative
    status: ontology_gap
    span:
      start: 64
      end: 208
  - claim_key: CLAIM-70EA650678BA873F
    claim_text: Optimization may change skill bodies only
    role: descriptive
    status: missing
    span:
      start: 210
      end: 251
  - claim_key: CLAIM-9B0F9BF39520DF0E
    claim_text: skill frontmatter and declared resources remain immutable
    role: descriptive
    status: missing
    span:
      start: 253
      end: 310
  - claim_key: CLAIM-C311ED13F46B7A29
    claim_text: Target cells must use `gpt-5.4-mini` at low effort
    role: normative
    status: ontology_gap
    span:
      start: 313
      end: 363
  - claim_key: CLAIM-13DE70EB200A0AB1
    claim_text: One-shot and iterative optimizer calls must use `gpt-5.6-sol` at xhigh effort
    role: normative
    status: ontology_gap
    span:
      start: 365
      end: 442
  - claim_key: CLAIM-C9029EF3E41C1E0A
    claim_text: The trainer must use all eight balanced public training cases and all four balanced public development cases. `--max-steps` must represent 1–4 complete rollout/reflection/proposal/development rounds rather than a display-only or post-training limit
    role: normative
    status: ontology_gap
    span:
      start: 444
      end: 694
  - claim_key: CLAIM-78686C5A4ACEB876
    claim_text: The outer trainer deadline must cover the internal baseline selection, every target cell, and one optimizer allowance per requested round instead of imposing a fixed 15-minute cap
    role: normative
    status: ontology_gap
    span:
      start: 696
      end: 875
  - claim_key: CLAIM-E67417EC06976697
    claim_text: Optimizer candidate capture must use Codex's dedicated final-message artifact, never the first `agent_message` in the JSONL progress stream
    role: normative
    status: ontology_gap
    span:
      start: 878
      end: 1017
  - claim_key: CLAIM-3FA9094E828A1C56
    claim_text: Before any candidate evaluation cell launches, the captured body must pass body-only safety validation, retain the required non-installing CLI and direct-`.kb` prohibition text, retain the core Kibi discovery/mutation/check operations, and have enough substantive content to be a complete replacement rather than a progress note
    role: normative
    status: ontology_gap
    span:
      start: 1019
      end: 1347
  - claim_key: CLAIM-13A3FC10CF70E24A
    claim_text: Every accepted one-shot and iterative optimizer result must be copied out of the ephemeral runtime into its run artifact tree before cleanup so paid optimization work remains available for seeding, audit, and recovery
    role: normative
    status: missing
    span:
      start: 1349
      end: 1566
  - claim_key: CLAIM-91FB5CB738C26A56
    claim_text: Behavioral failures must preserve their earned 60/25/15 score for optimizer feedback while infrastructure, interruption, budget, evidence-conflict, and critical-security failures remain zero
    role: normative
    status: ontology_gap
    span:
      start: 1569
      end: 1759
  - claim_key: CLAIM-3270B5E990972802
    claim_text: Reflection must receive structured public status, score, failure categories, model-originated Kibi tool sequence
    role: normative
    status: ontology_gap
    span:
      start: 1761
      end: 1873
  - claim_key: CLAIM-227484F5F78A5459
    claim_text: final-state evidence, and must produce reusable procedural guidance without copying raw evidence into the skill
    role: normative
    status: ontology_gap
    span:
      start: 1879
      end: 1990
  - claim_key: CLAIM-D984D58798983454
    claim_text: Optimizer output must remain portable across consuming repositories
    role: normative
    status: ontology_gap
    span:
      start: 1993
      end: 2060
  - claim_key: CLAIM-922753F1E2BCCBBD
    claim_text: It may not copy Kibi's own branch names, package manager commands, release scripts, changeset policy, merge flow, publishing policy, evaluator task IDs, or trajectory payloads into the reusable skill
    role: descriptive
    status: missing
    span:
      start: 2062
      end: 2261
  - claim_key: CLAIM-F322713C0769B323
    claim_text: Predicate-first optimization must distinguish graph relationships from ontology predicate schemas and include actionable prose-to-ground-predicate guidance covering schema name and arity, ordered arguments, canonical key, polarity, strict-scalar routing, and observation/ontology-gap fallbacks
    role: normative
    status: ontology_gap
    span:
      start: 2263
      end: 2556
  - claim_key: CLAIM-9A99BABBBCC8702E
    claim_text: Each optimizer round receives a compact cumulative public failure summary so recurring family failures are not forgotten when the latest stochastic rollout differs
    role: normative
    status: ontology_gap
    span:
      start: 2558
      end: 2721
  - claim_key: CLAIM-153EF2EB6AF4F8C6
    claim_text: An operator may explicitly seed a new paid run from a preserved candidate body
    role: descriptive
    status: missing
    span:
      start: 2724
      end: 2802
  - claim_key: CLAIM-6F2EF51F6F1EABCD
    claim_text: The seed must pass ordinary candidate safety validation, bind to the current immutable frontmatter and resource hashes, be recorded by hash and byte length in the new run, and become the trainer's initial skill without replacing the canonical baseline or one-shot comparators
    role: normative
    status: ontology_gap
    span:
      start: 2804
      end: 3079
  - claim_key: CLAIM-887C3764E72C641C
    claim_text: Baseline and one-shot must both be scored on development before training, and the stronger result must seed the trainer
    role: normative
    status: ontology_gap
    span:
      start: 3082
      end: 3201
  - claim_key: CLAIM-17B3D757B9D374F5
    claim_text: A frozen candidate's trainer selection score is feedback only
    role: descriptive
    status: missing
    span:
      start: 3203
      end: 3264
  - claim_key: CLAIM-BFAB15F7A93E30C5
    claim_text: before admission, the candidate must be independently re-evaluated through the authoritative development cell lane
    role: normative
    status: ontology_gap
    span:
      start: 3266
      end: 3380
  - claim_key: CLAIM-6407D4615703EB8B
    claim_text: A frozen candidate may enter held-out only when that four-case public development result has mean at least 0.85, at least three hard passes, and worst-family mean at least 0.75, and it also strictly improves mean without regressing hard passes or worst-family mean against the stronger comparator
    role: normative
    status: ontology_gap
    span:
      start: 3382
      end: 3678
  - claim_key: CLAIM-0AAA79ACB32AB4FF
    claim_text: A development miss must emit a blocked `development_gate_ineligible` review with held-out `not-run`
    role: normative
    status: ontology_gap
    span:
      start: 3680
      end: 3779
  - claim_key: CLAIM-BDF0180239AD6EA4
    claim_text: The complete 36-cell predicate supplement remains required for integrity, but only SkillOpt predicate cells determine the supplemental behavioral predicate pass
    role: normative
    status: ontology_gap
    span:
      start: 3781
      end: 3941
  - claim_key: CLAIM-DAD49DB44278ABD3
    claim_text: comparator misses remain paired calibration evidence
    role: descriptive
    status: missing
    span:
      start: 3943
      end: 3995
  - claim_key: CLAIM-9552E0A9B0F8D51C
    claim_text: Versioned evaluation artifacts must enforce the same completion, identity, timestamp, uniqueness, size, source-pin, and approval-integrity rules in JSON Schema, TypeScript, and Python
    role: normative
    status: ontology_gap
    span:
      start: 3998
      end: 4181
  - claim_key: CLAIM-AA702CD1012337EC
    claim_text: The authenticated bridge must own a single POSIX process group spanning Bun, Codex, and MCP descendants
    role: normative
    status: ontology_gap
    span:
      start: 4184
      end: 4287
  - claim_key: CLAIM-C3CA779DC6FE6833
    claim_text: the TypeScript cell and MCP broker runtimes must inherit that group rather than detach
    role: normative
    status: ontology_gap
    span:
      start: 4289
      end: 4375
  - claim_key: CLAIM-7E97B7A5520E2AFF
    claim_text: Timeout or interruption must terminate and reap the group
    role: normative
    status: ontology_gap
    span:
      start: 4377
      end: 4434
  - claim_key: CLAIM-43A35C3A10454C4C
    claim_text: Copied ChatGPT auth must be mode `0600`
    role: normative
    status: ontology_gap
    span:
      start: 4436
      end: 4475
  - claim_key: CLAIM-EB6B75206DDC44E0
    claim_text: every private workspace root must remain cleanup-retryable until all removals succeed
    role: normative
    status: ontology_gap
    span:
      start: 4480
      end: 4565
  - claim_key: CLAIM-79A646EFD8F00D00
    claim_text: After a canary, optimizer, or target cell refreshes ChatGPT tokens inside its private `CODEX_HOME`, the refreshed `auth.json` must be written back to the host auth file under an exclusive lock so the next cell does not reuse a spent refresh token
    role: normative
    status: ontology_gap
    span:
      start: 4567
      end: 4813
  - claim_key: CLAIM-C7B8DB9FBE15B06E
    claim_text: A missing or non-ChatGPT private copy must not replace the host credentials
    role: normative
    status: missing
    span:
      start: 4815
      end: 4890
  - claim_key: CLAIM-0742164B430DC3E4
    claim_text: Each paid optimization run must stage one private Codex/bwrap runtime lease under its artifact root and pass the same absolute executable paths to development, trainer-bridge, and held-out cells
    role: normative
    status: ontology_gap
    span:
      start: 4893
      end: 5087
  - claim_key: CLAIM-3D247C82DB8160EE
    claim_text: Real target execution must not fall back to a bare `codex` command or the host bwrap path
    role: normative
    status: missing
    span:
      start: 5089
      end: 5178
  - claim_key: CLAIM-7A6104BDDCBE656F
    claim_text: The paid smoke must prove exactly one shell-isolation probe, one model-originated read-only `kb_semantic_advisor` call, one successful model-originated branch-dependent `kb_status` call, matching valid broker hash-chain entries, and successful diagnostic usage receipts
    role: normative
    status: ontology_gap
    span:
      start: 5180
      end: 5449
  - claim_key: CLAIM-A4D82D5FD5392626
    claim_text: Expected permission denials inside the shell probe must be silenced before exact-output validation so a successful isolation check cannot become a false infrastructure no-go
    role: normative
    status: missing
    span:
      start: 5451
      end: 5624
  - claim_key: CLAIM-0BC782CFECD58272
    claim_text: Runtime, training, or evidence infrastructure failures must stop the matrix and return a structured no-go rather than produce an eligibility review
    role: normative
    status: ontology_gap
    span:
      start: 5626
      end: 5773
  - claim_key: CLAIM-B795A30A27173AD8
    claim_text: Every non-Git evaluation fixture must pin the target cell, Codex-launched MCP broker, and independent verifier to the same dedicated Kibi branch and persist a valid empty branch snapshot before serving repeated reads
    role: normative
    status: ontology_gap
    span:
      start: 5776
      end: 5992
  - claim_key: CLAIM-B89EAA3D891EAF1A
    claim_text: The Codex MCP configuration must declare that branch explicitly rather than relying on parent-process or shell environment inheritance
    role: normative
    status: ontology_gap
    span:
      start: 5994
      end: 6128
  - claim_key: CLAIM-43DF8F614AB9C14C
    claim_text: Noninteractive mutation approval must be limited to the target cell's evaluator-owned, allowlisted MCP broker
    role: normative
    status: ontology_gap
    span:
      start: 6130
      end: 6239
  - claim_key: CLAIM-7184B17736C16848
    claim_text: optimizer MCP calls remain annotation-gated
    role: descriptive
    status: missing
    span:
      start: 6241
      end: 6284
  - claim_key: CLAIM-E6155501E5F2ADBF
    claim_text: Real cell scoring must seal the independent verifier's exact query, check, and status requests, validate every result hash and the broker trace hash chain, and derive evaluator claims from those receipts
    role: normative
    status: ontology_gap
    span:
      start: 6287
      end: 6490
  - claim_key: CLAIM-7AE16A40B7AA9AB9
    claim_text: Tool-order scoring uses target-to-server requests only and permits advisory or validation calls between required ordered operations
    role: normative
    status: ontology_gap
    span:
      start: 6492
      end: 6623
  - claim_key: CLAIM-5F56773091B9D9F1
    claim_text: Semantically incorrect but internally consistent final state is a behavioral failure
    role: descriptive
    status: missing
    span:
      start: 6625
      end: 6709
  - claim_key: CLAIM-C5ED8882C89D2F2C
    claim_text: only missing, malformed, tampered, or contradictory evidence is an infrastructure no-go
    role: descriptive
    status: missing
    span:
      start: 6711
      end: 6798
  - claim_key: CLAIM-84145819213040FA
    claim_text: A real cell's diagnostic receipt proves successful tool execution by matching the broker's tool-call multiset
    role: descriptive
    status: missing
    span:
      start: 6801
      end: 6910
  - claim_key: CLAIM-98B7DEFCC4FEA725
    claim_text: Optional per-call diagnostic telemetry may be an object or `null`
    role: descriptive
    status: missing
    span:
      start: 6912
      end: 6977
  - claim_key: CLAIM-F60A47E722B45B7B
    claim_text: its absence from a successful ordinary cell call is not evidence tampering
    role: descriptive
    status: missing
    span:
      start: 6979
      end: 7053
  - claim_key: CLAIM-68C457FC107F2D86
    claim_text: The paid smoke retains its stronger complete-telemetry requirement
    role: descriptive
    status: missing
    span:
      start: 7055
      end: 7121
  - claim_key: CLAIM-5972365FB5B5E6B3
    claim_text: Protocol evidence retains every brokered tool attempt so invalid, forbidden, and absent calls remain scoreable
    role: normative
    status: ontology_gap
    span:
      start: 7124
      end: 7234
  - claim_key: CLAIM-A5DD5A5612FA95C3
    claim_text: 'Diagnostic success reconciliation is narrower: it requires matching success rows only for calls whose broker response completed without an MCP `isError` result'
    role: normative
    status: ontology_gap
    span:
      start: 7236
      end: 7395
  - claim_key: CLAIM-C79F823A4343253B
    claim_text: An empty diagnostic receipt is valid when that successful-call multiset is empty, so a model that makes no required MCP call receives an ordinary behavioral protocol failure
    role: normative
    status: ontology_gap
    span:
      start: 7397
      end: 7570
  - claim_key: CLAIM-005123CD8D36C4A0
    claim_text: A rejected attempt followed by a successful correction is behavioral protocol evidence, not an infrastructure conflict
    role: descriptive
    status: missing
    span:
      start: 7572
      end: 7690
  - claim_key: CLAIM-A5BE55C3ACFC8C51
    claim_text: Every staged MCP broker must keep its downstream Kibi server in the bridge-owned process group and perform bounded TERM-to-KILL cleanup when the target transport closes or the broker is interrupted
    role: normative
    status: ontology_gap
    span:
      start: 7693
      end: 7890
  - claim_key: CLAIM-9D3C3944BE609E75
    claim_text: Cleanup must finish before the disposable workspace is removed so deleted staged executables cannot remain mapped by orphan processes and exhaust the artifact tmpfs
    role: normative
    status: missing
    span:
      start: 7892
      end: 8056
  - claim_key: CLAIM-2AD43E76A1C69BA8
    claim_text: An unmarked nonzero trainer-process exit or thrown outer-process timeout is a typed training infrastructure no-go with its diagnostic path, rather than an unstructured trainer exception
    role: descriptive
    status: missing
    span:
      start: 8058
      end: 8243
logic_claims:
  - CLAIM-E002D9B8AFFE0354
  - CLAIM-69CDA48DDEBD5265
  - CLAIM-70EA650678BA873F
  - CLAIM-9B0F9BF39520DF0E
  - CLAIM-C311ED13F46B7A29
  - CLAIM-13DE70EB200A0AB1
  - CLAIM-C9029EF3E41C1E0A
  - CLAIM-78686C5A4ACEB876
  - CLAIM-E67417EC06976697
  - CLAIM-3FA9094E828A1C56
  - CLAIM-13A3FC10CF70E24A
  - CLAIM-91FB5CB738C26A56
  - CLAIM-3270B5E990972802
  - CLAIM-227484F5F78A5459
  - CLAIM-D984D58798983454
  - CLAIM-922753F1E2BCCBBD
  - CLAIM-F322713C0769B323
  - CLAIM-9A99BABBBCC8702E
  - CLAIM-153EF2EB6AF4F8C6
  - CLAIM-6F2EF51F6F1EABCD
  - CLAIM-887C3764E72C641C
  - CLAIM-17B3D757B9D374F5
  - CLAIM-BFAB15F7A93E30C5
  - CLAIM-6407D4615703EB8B
  - CLAIM-0AAA79ACB32AB4FF
  - CLAIM-BDF0180239AD6EA4
  - CLAIM-DAD49DB44278ABD3
  - CLAIM-9552E0A9B0F8D51C
  - CLAIM-AA702CD1012337EC
  - CLAIM-C3CA779DC6FE6833
  - CLAIM-7E97B7A5520E2AFF
  - CLAIM-43A35C3A10454C4C
  - CLAIM-EB6B75206DDC44E0
  - CLAIM-79A646EFD8F00D00
  - CLAIM-C7B8DB9FBE15B06E
  - CLAIM-0742164B430DC3E4
  - CLAIM-3D247C82DB8160EE
  - CLAIM-7A6104BDDCBE656F
  - CLAIM-A4D82D5FD5392626
  - CLAIM-0BC782CFECD58272
  - CLAIM-B795A30A27173AD8
  - CLAIM-B89EAA3D891EAF1A
  - CLAIM-43DF8F614AB9C14C
  - CLAIM-7184B17736C16848
  - CLAIM-E6155501E5F2ADBF
  - CLAIM-7AE16A40B7AA9AB9
  - CLAIM-5F56773091B9D9F1
  - CLAIM-C5ED8882C89D2F2C
  - CLAIM-84145819213040FA
  - CLAIM-98B7DEFCC4FEA725
  - CLAIM-F60A47E722B45B7B
  - CLAIM-68C457FC107F2D86
  - CLAIM-5972365FB5B5E6B3
  - CLAIM-A5DD5A5612FA95C3
  - CLAIM-C79F823A4343253B
  - CLAIM-005123CD8D36C4A0
  - CLAIM-A5BE55C3ACFC8C51
  - CLAIM-9D3C3944BE609E75
  - CLAIM-2AD43E76A1C69BA8
type: req
---

SkillOpt behavioral evaluation must use Codex as its sole host. Candidate adoption remains forbidden until every individual and bundle gate passes and a reviewer explicitly approves the exact candidate hashes. Optimization may change skill bodies only; skill frontmatter and declared resources remain immutable.

Target cells must use `gpt-5.4-mini` at low effort. One-shot and iterative optimizer calls must use `gpt-5.6-sol` at xhigh effort. The trainer must use all eight balanced public training cases and all four balanced public development cases. `--max-steps` must represent 1–4 complete rollout/reflection/proposal/development rounds rather than a display-only or post-training limit. The outer trainer deadline must cover the internal baseline selection, every target cell, and one optimizer allowance per requested round instead of imposing a fixed 15-minute cap.

Optimizer candidate capture must use Codex's dedicated final-message artifact, never the first `agent_message` in the JSONL progress stream. Before any candidate evaluation cell launches, the captured body must pass body-only safety validation, retain the required non-installing CLI and direct-`.kb` prohibition text, retain the core Kibi discovery/mutation/check operations, and have enough substantive content to be a complete replacement rather than a progress note. Every accepted one-shot and iterative optimizer result must be copied out of the ephemeral runtime into its run artifact tree before cleanup so paid optimization work remains available for seeding, audit, and recovery.

Behavioral failures must preserve their earned 60/25/15 score for optimizer feedback while infrastructure, interruption, budget, evidence-conflict, and critical-security failures remain zero. Reflection must receive structured public status, score, failure categories, model-originated Kibi tool sequence, and final-state evidence, and must produce reusable procedural guidance without copying raw evidence into the skill.

Optimizer output must remain portable across consuming repositories. It may not copy Kibi's own branch names, package manager commands, release scripts, changeset policy, merge flow, publishing policy, evaluator task IDs, or trajectory payloads into the reusable skill. Predicate-first optimization must distinguish graph relationships from ontology predicate schemas and include actionable prose-to-ground-predicate guidance covering schema name and arity, ordered arguments, canonical key, polarity, strict-scalar routing, and observation/ontology-gap fallbacks. Each optimizer round receives a compact cumulative public failure summary so recurring family failures are not forgotten when the latest stochastic rollout differs.

An operator may explicitly seed a new paid run from a preserved candidate body. The seed must pass ordinary candidate safety validation, bind to the current immutable frontmatter and resource hashes, be recorded by hash and byte length in the new run, and become the trainer's initial skill without replacing the canonical baseline or one-shot comparators.

Baseline and one-shot must both be scored on development before training, and the stronger result must seed the trainer. A frozen candidate's trainer selection score is feedback only; before admission, the candidate must be independently re-evaluated through the authoritative development cell lane. A frozen candidate may enter held-out only when that four-case public development result has mean at least 0.85, at least three hard passes, and worst-family mean at least 0.75, and it also strictly improves mean without regressing hard passes or worst-family mean against the stronger comparator. A development miss must emit a blocked `development_gate_ineligible` review with held-out `not-run`. The complete 36-cell predicate supplement remains required for integrity, but only SkillOpt predicate cells determine the supplemental behavioral predicate pass; comparator misses remain paired calibration evidence.

Versioned evaluation artifacts must enforce the same completion, identity, timestamp, uniqueness, size, source-pin, and approval-integrity rules in JSON Schema, TypeScript, and Python.

The authenticated bridge must own a single POSIX process group spanning Bun, Codex, and MCP descendants; the TypeScript cell and MCP broker runtimes must inherit that group rather than detach. Timeout or interruption must terminate and reap the group. Copied ChatGPT auth must be mode `0600` and every private workspace root must remain cleanup-retryable until all removals succeed. After a canary, optimizer, or target cell refreshes ChatGPT tokens inside its private `CODEX_HOME`, the refreshed `auth.json` must be written back to the host auth file under an exclusive lock so the next cell does not reuse a spent refresh token. A missing or non-ChatGPT private copy must not replace the host credentials.

Each paid optimization run must stage one private Codex/bwrap runtime lease under its artifact root and pass the same absolute executable paths to development, trainer-bridge, and held-out cells. Real target execution must not fall back to a bare `codex` command or the host bwrap path. The paid smoke must prove exactly one shell-isolation probe, one model-originated read-only `kb_semantic_advisor` call, one successful model-originated branch-dependent `kb_status` call, matching valid broker hash-chain entries, and successful diagnostic usage receipts. Expected permission denials inside the shell probe must be silenced before exact-output validation so a successful isolation check cannot become a false infrastructure no-go. Runtime, training, or evidence infrastructure failures must stop the matrix and return a structured no-go rather than produce an eligibility review.

Every non-Git evaluation fixture must pin the target cell, Codex-launched MCP broker, and independent verifier to the same dedicated Kibi branch and persist a valid empty branch snapshot before serving repeated reads. The Codex MCP configuration must declare that branch explicitly rather than relying on parent-process or shell environment inheritance. Noninteractive mutation approval must be limited to the target cell's evaluator-owned, allowlisted MCP broker; optimizer MCP calls remain annotation-gated.

Real cell scoring must seal the independent verifier's exact query, check, and status requests, validate every result hash and the broker trace hash chain, and derive evaluator claims from those receipts. Tool-order scoring uses target-to-server requests only and permits advisory or validation calls between required ordered operations. Semantically incorrect but internally consistent final state is a behavioral failure; only missing, malformed, tampered, or contradictory evidence is an infrastructure no-go.

A real cell's diagnostic receipt proves successful tool execution by matching the broker's tool-call multiset. Optional per-call diagnostic telemetry may be an object or `null`; its absence from a successful ordinary cell call is not evidence tampering. The paid smoke retains its stronger complete-telemetry requirement.

Protocol evidence retains every brokered tool attempt so invalid, forbidden, and absent calls remain scoreable. Diagnostic success reconciliation is narrower: it requires matching success rows only for calls whose broker response completed without an MCP `isError` result. An empty diagnostic receipt is valid when that successful-call multiset is empty, so a model that makes no required MCP call receives an ordinary behavioral protocol failure. A rejected attempt followed by a successful correction is behavioral protocol evidence, not an infrastructure conflict.

Every staged MCP broker must keep its downstream Kibi server in the bridge-owned process group and perform bounded TERM-to-KILL cleanup when the target transport closes or the broker is interrupted. Cleanup must finish before the disposable workspace is removed so deleted staged executables cannot remain mapped by orphan processes and exhaust the artifact tmpfs. An unmarked nonzero trainer-process exit or thrown outer-process timeout is a typed training infrastructure no-go with its diagnostic path, rather than an unstructured trainer exception.
