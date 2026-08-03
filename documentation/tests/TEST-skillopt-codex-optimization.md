---
id: TEST-skillopt-codex-optimization
title: Codex SkillOpt contract rejects stale hosts and gates
type: test
status: passing
created_at: 2026-07-21T00:00:00Z
updated_at: 2026-08-03T00:00:00Z
source: scripts/skillopt-eval/tests/methodology-contract.test.ts
priority: must
tags: [skillopt, codex, evaluation, integration, security]
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-codex-optimization
---

The parsed methodology and run-lock contracts require the same Codex-only host, held-out, family, bootstrap, and bundle gate values. The run-lock schema rejects stale evaluation-host arrays before a run can start.

The offline Codex cell-runner suite verifies canonical four-skill assembly with body-only candidate replacement, immutable frontmatter and resources, required diagnostic-mode Kibi MCP startup, sealed network and `.kb` permissions, deterministic variant blinding, sanitized tolerant JSONL replay, terminal evidence receipts, and bounded cleanup. Adversarial cases cover candidate surface edits, direct `.kb` access, missing MCP evidence, forbidden writes, malformed or empty JSONL, timeout, and hidden-data leakage without paid model calls. Process-tree harnesses prove that Python-owned Bun, Codex, and grandchild processes are reaped after timeout and interruption; cleanup fault injection proves private auth/workspaces remain retryable until removal succeeds.

The bridge CLI suite verifies that non-fake requests construct a Codex cell from bridge inputs and delegate it through the real default dependency factory rather than returning synthetic scores.

The current contract tests also cover CLI parsing and dispatch, schema compatibility for unknown fields, official trainer request and result lineage, fresh development and blinded held-out evaluation, and the guard that no adoption happens before eligibility.

Learning-loop regressions prove that behavioral misses retain partial score, the bridge forwards structured public failure/tool/final-state evidence, the trainer uses the balanced 8/4 corpus, and `--max-steps` configures the same number of full ReflACT proposal rounds. Runtime configuration asserts `gpt-5.4-mini`/low for targets and `gpt-5.6-sol`/xhigh for the optimizer. Development workflow tests compare baseline and one-shot, seed with the stronger variant, require a strict mean improvement without hard or family regression, and prove a failed public gate launches zero held-out cells. Predicate-gate tests require matrix completeness and every candidate replicate while proving weak comparator cells do not veto candidate success.

The runtime and smoke suites additionally verify one private runtime staging lease, identical executable propagation through every real evaluation lane, cleanup on success and failure, explicit bridge flags with rejection of partial configuration, and smoke evidence for the shell probe, model-originated semantic-advisor and branch-status calls, broker hash chain, and matching diagnostic receipts. The generated probe is executed against a genuinely read-only `.runtime` directory to prove the expected denial produces no stderr and preserves the exact pass token. The evidence validator rejects a trace that omits the branch-dependent call. Workflow tests verify that infrastructure failures stop subsequent cells and emit exit code 1 with stage/task/variant/failure/receipt details, while behavioral failures remain eligible for ordinary gate evaluation.

The staged-MCP integration suite launches a real server in a non-Git fixture and verifies that status, query, and check all succeed on the fixed `skillopt-eval` branch. Runtime configuration tests prove the same branch reaches the probe, target process, Codex MCP configuration, and independent verifier, and that only target cells pre-approve the allowlisted evaluation broker.

Default-evidence regressions seal authentic all-entity query results, clean checks, status receipts, diagnostic JSONL, and request-only broker calls. They verify per-result hashes, broker hash-chain integrity, derived task/isolation claims, optional calls between required operations, early-mutation rejection, and the distinction between semantic behavioral failure and actual evidence tampering.

The diagnostic regressions require one successful usage row for each brokered tool call, accept the ordinary MCP logger's explicit `telemetry: null` shape, and continue rejecting missing, malformed, failed, or tool-mismatched rows. Smoke-specific tests separately require complete telemetry for the model-originated canary calls.

Broker-response regressions preserve failed attempts in ordered protocol evidence while excluding MCP `isError` responses from the expected diagnostic-success multiset. They cover an invalid call followed by a corrected successful call and require exactly one matching success receipt.

Broker lifecycle regressions close a target transport around a deliberately unresponsive downstream server and verify bounded process-group reaping. Runtime-config tests require the inherited-group marker in the Codex MCP environment, and trainer setup tests require an unmarked nonzero trainer exit to become a structured training infrastructure error with the retained stderr path.
