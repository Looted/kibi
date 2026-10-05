---
id: TEST-skillopt-external-adoption-verdict
title: SkillOpt rejects local-only evidence for production adoption
type: test
status: passing
created_at: 2026-07-30T00:00:00.000Z
updated_at: 2026-08-01T00:00:00.000Z
source: scripts/skillopt-eval/tests/real-workflow.test.ts
priority: must
tags:
  - skillopt
  - codex
  - evaluation
  - security
  - self-improvement
verification_scope: integration
verification_perspective: internal
links:
  - type: validates
    target: SCEN-skillopt-external-adoption-verdict
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-skillopt-external-adoption-verdict
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v1
    receipt_id: PR-c3655bc19873edf7e88c65f5
    test_id: TEST-skillopt-external-adoption-verdict
    scope: integration
    outcome: passed
    code_snapshot: 1d442bd07788e49f01747ce90fcac74ae56fd006d23b7e6912f021fb0809ca83
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-10-04T21:14:16.353Z'
    finished_at: '2026-10-04T22:06:01.024Z'
    artifact_digest: 9c5d99e7639c043a2240c0d58f9e934f6a75ac252c6f7774a6667b697f58a8d4
    contract_hash: 045b2eae677eca3a28946fd99e1d4d0b99be19990af0b521bbc5f77dc334d93e
    binding_hash: 7e54209512f17e0acad9ba27e693878715dba7dde7e81e97cb6ee5c365ce24f8
    fingerprint: 41580ab3960834bc6cc6ea6af29abd2e734c1473434db3aecabe2fce26340ad7
    fingerprint_components:
      contract: 045b2eae677eca3a28946fd99e1d4d0b99be19990af0b521bbc5f77dc334d93e
      integration: 41d3ed0ab7afab1838edccfd3c24450bd77214cd1a41cdc82378e69a99b2e84f
      command: 7c365191a875641a88c83d96feedbb95a8c54007a2602b1eaa2e7742d2ae0e24
      bindings: 4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945
      producer: 3f1ef45ea6f7a150dff44ba43ea098e729d8dcd4e35f67bb455191a7f38609be
    integration_id: self-proof
    producer:
      name: kibi-command-producer
    command_argv:
      - node
      - scripts/run-proof-producer.mjs
    run_outcome: passed
    proof_results:
      - symbol_id: SYM-e2e-test-skillopt-external-adoption-verdict
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The contract suite verifies that local or fake SkillOpt evidence remains review-only and cannot mutate canonical or mirror state. Production adoption stays blocked until an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence.

The bridge and workflow tests also verify rejection of incomplete staged-runtime configuration, forwarding of absolute Codex/bwrap flags, fail-fast scheduling after infrastructure failures, continued evaluation of behavioral failures, and structured exit-1 no-go output without an eligibility review for incomplete matrices.
