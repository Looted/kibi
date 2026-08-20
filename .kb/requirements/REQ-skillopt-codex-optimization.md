---
id: REQ-skillopt-codex-optimization
title: SkillOpt optimization must use Codex-only behavioral evidence
status: open
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-08-09T00:00:00Z
source: documentation/facts/FACT-skillopt-methodology.md
priority: must
tags: [skillopt, codex, evaluation, security, umbrella]
links:
  - type: specified_by
    target: SCEN-skillopt-codex-optimization
  - type: verified_by
    target: TEST-skillopt-codex-optimization
  - type: supersedes
    target: REQ-skill-behavioral-efficacy
---

SkillOpt behavioral evaluation must use Codex as its sole host. Candidate adoption remains forbidden until every individual and bundle gate passes and a reviewer explicitly approves the exact candidate hashes. Optimization may change skill bodies only; skill frontmatter and declared resources remain immutable.

Target cells must use `gpt-5.4-mini` at low effort. One-shot and iterative optimizer calls must use `gpt-5.6-sol` at xhigh effort. The trainer must use all eight balanced public training cases and all four balanced public development cases. `--max-steps` must represent 1–4 complete rollout/reflection/proposal/development rounds rather than a display-only or post-training limit. The outer trainer deadline must cover the internal baseline selection, every target cell, and one optimizer allowance per requested round instead of imposing a fixed 15-minute cap.

Optimizer candidate capture must use Codex's dedicated final-message artifact, never the first `agent_message` in the JSONL progress stream. Before any candidate evaluation cell launches, the captured body must pass body-only safety validation, retain the required non-installing CLI and direct-`.kb` prohibition text, retain the core Kibi discovery/mutation/check operations, and have enough substantive content to be a complete replacement rather than a progress note. Every accepted one-shot and iterative optimizer result must be copied out of the ephemeral runtime into its run artifact tree before cleanup so paid optimization work remains available for seeding, audit, and recovery.

Behavioral failures must preserve their earned 60/25/15 score for optimizer feedback while infrastructure, interruption, budget, evidence-conflict, and critical-security failures remain zero. Reflection must receive structured public status, score, failure categories, model-originated Kibi tool sequence, and final-state evidence, and must produce reusable procedural guidance without copying raw evidence into the skill.

Optimizer output must remain portable across consuming repositories. It may not copy Kibi's own branch names, package manager commands, release scripts, changeset policy, merge flow, publishing policy, evaluator task IDs, or trajectory payloads into the reusable skill. Predicate-first optimization must distinguish graph relationships from ontology predicate schemas and include actionable prose-to-ground-predicate guidance covering schema name and arity, ordered arguments, canonical key, polarity, strict-scalar routing, and observation/ontology-gap fallbacks. Each optimizer round receives a compact cumulative public failure summary so recurring family failures are not forgotten when the latest stochastic rollout differs.

An operator may explicitly seed a new paid run from a preserved candidate body. The seed must pass ordinary candidate safety validation, bind to the current immutable frontmatter and resource hashes, be recorded by hash and byte length in the new run, and become the trainer's initial skill without replacing the canonical baseline or one-shot comparators.

Baseline and one-shot must both be scored on development before training, and the stronger result must seed the trainer. A frozen candidate's trainer selection score is feedback only; before admission, the candidate must be independently re-evaluated through the authoritative development cell lane. A frozen candidate may enter held-out only when that four-case public development result has mean at least 0.85, at least three hard passes, and worst-family mean at least 0.75, and it also strictly improves mean without regressing hard passes or worst-family mean against the stronger comparator. A development miss must emit a blocked `development_gate_ineligible` review with held-out `not-run`. The complete 36-cell predicate supplement remains required for integrity, but only SkillOpt predicate cells determine the supplemental behavioral predicate pass; comparator misses remain paired calibration evidence.

Versioned evaluation artifacts must enforce the same completion, identity, timestamp, uniqueness, size, source-pin, and approval-integrity rules in JSON Schema, TypeScript, and Python.

The authenticated bridge must own a single POSIX process group spanning Bun, Codex, and MCP descendants; the TypeScript cell and MCP broker runtimes must inherit that group rather than detach. Timeout or interruption must terminate and reap the group. Copied ChatGPT auth must be mode `0600` and every private workspace root must remain cleanup-retryable until all removals succeed.

Each paid optimization run must stage one private Codex/bwrap runtime lease under its artifact root and pass the same absolute executable paths to development, trainer-bridge, and held-out cells. Real target execution must not fall back to a bare `codex` command or the host bwrap path. The paid smoke must prove exactly one shell-isolation probe, one model-originated read-only `kb_semantic_advisor` call, one successful model-originated branch-dependent `kb_status` call, matching valid broker hash-chain entries, and successful diagnostic usage receipts. Expected permission denials inside the shell probe must be silenced before exact-output validation so a successful isolation check cannot become a false infrastructure no-go. Runtime, training, or evidence infrastructure failures must stop the matrix and return a structured no-go rather than produce an eligibility review.

Every non-Git evaluation fixture must pin the target cell, Codex-launched MCP broker, and independent verifier to the same dedicated Kibi branch and persist a valid empty branch snapshot before serving repeated reads. The Codex MCP configuration must declare that branch explicitly rather than relying on parent-process or shell environment inheritance. Noninteractive mutation approval must be limited to the target cell's evaluator-owned, allowlisted MCP broker; optimizer MCP calls remain annotation-gated.

Real cell scoring must seal the independent verifier's exact query, check, and status requests, validate every result hash and the broker trace hash chain, and derive evaluator claims from those receipts. Tool-order scoring uses target-to-server requests only and permits advisory or validation calls between required ordered operations. Semantically incorrect but internally consistent final state is a behavioral failure; only missing, malformed, tampered, or contradictory evidence is an infrastructure no-go.

A real cell's diagnostic receipt proves successful tool execution by matching the broker's tool-call multiset. Optional per-call diagnostic telemetry may be an object or `null`; its absence from a successful ordinary cell call is not evidence tampering. The paid smoke retains its stronger complete-telemetry requirement.

Protocol evidence retains every brokered tool attempt so invalid, forbidden, and absent calls remain scoreable. Diagnostic success reconciliation is narrower: it requires matching success rows only for calls whose broker response completed without an MCP `isError` result. An empty diagnostic receipt is valid when that successful-call multiset is empty, so a model that makes no required MCP call receives an ordinary behavioral protocol failure. A rejected attempt followed by a successful correction is behavioral protocol evidence, not an infrastructure conflict.

Every staged MCP broker must keep its downstream Kibi server in the bridge-owned process group and perform bounded TERM-to-KILL cleanup when the target transport closes or the broker is interrupted. Cleanup must finish before the disposable workspace is removed so deleted staged executables cannot remain mapped by orphan processes and exhaust the artifact tmpfs. An unmarked nonzero trainer-process exit or thrown outer-process timeout is a typed training infrastructure no-go with its diagnostic path, rather than an unstructured trainer exception.
