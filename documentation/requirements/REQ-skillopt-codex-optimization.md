---
id: REQ-skillopt-codex-optimization
title: SkillOpt optimization must use Codex-only behavioral evidence
status: open
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-08-02T00:00:00Z
source: documentation/facts/FACT-skillopt-methodology.md
priority: must
tags: [skillopt, codex, evaluation, security]
links:
  - type: specified_by
    target: SCEN-skillopt-codex-optimization
  - type: verified_by
    target: TEST-skillopt-codex-optimization
  - type: supersedes
    target: REQ-skill-behavioral-efficacy
---

SkillOpt behavioral evaluation must use Codex as its sole host. Candidate adoption remains forbidden until every individual and bundle gate passes and a reviewer explicitly approves the exact candidate hashes. Optimization may change skill bodies only; skill frontmatter and declared resources remain immutable.

Versioned evaluation artifacts must enforce the same completion, identity, timestamp, uniqueness, size, source-pin, and approval-integrity rules in JSON Schema, TypeScript, and Python.

The authenticated bridge must own a single POSIX process group spanning Bun, Codex, and MCP descendants; the TypeScript cell and MCP broker runtimes must inherit that group rather than detach. Timeout or interruption must terminate and reap the group. Copied ChatGPT auth must be mode `0600` and every private workspace root must remain cleanup-retryable until all removals succeed.

Each paid optimization run must stage one private Codex/bwrap runtime lease under its artifact root and pass the same absolute executable paths to development, trainer-bridge, and held-out cells. Real target execution must not fall back to a bare `codex` command or the host bwrap path. The paid smoke must prove exactly one shell-isolation probe, one model-originated read-only `kb_semantic_advisor` call, one successful model-originated branch-dependent `kb_status` call, matching valid broker hash-chain entries, and successful diagnostic usage receipts. Expected permission denials inside the shell probe must be silenced before exact-output validation so a successful isolation check cannot become a false infrastructure no-go. Runtime, training, or evidence infrastructure failures must stop the matrix and return a structured no-go rather than produce an eligibility review.

Every non-Git evaluation fixture must pin the target cell, Codex-launched MCP broker, and independent verifier to the same dedicated Kibi branch and persist a valid empty branch snapshot before serving repeated reads. The Codex MCP configuration must declare that branch explicitly rather than relying on parent-process or shell environment inheritance. Noninteractive mutation approval must be limited to the target cell's evaluator-owned, allowlisted MCP broker; optimizer MCP calls remain annotation-gated.

Real cell scoring must seal the independent verifier's exact query, check, and status requests, validate every result hash and the broker trace hash chain, and derive evaluator claims from those receipts. Tool-order scoring uses target-to-server requests only and permits advisory or validation calls between required ordered operations. Semantically incorrect but internally consistent final state is a behavioral failure; only missing, malformed, tampered, or contradictory evidence is an infrastructure no-go.

A real cell's diagnostic receipt proves successful tool execution by matching the broker's tool-call multiset. Optional per-call diagnostic telemetry may be an object or `null`; its absence from a successful ordinary cell call is not evidence tampering. The paid smoke retains its stronger complete-telemetry requirement.
