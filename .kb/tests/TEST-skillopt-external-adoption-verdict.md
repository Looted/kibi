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
    - symbol_id: SYM-e2e-ontology-convergence-witnesses
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6f93f5a7671840ef216a60f4
    test_id: TEST-skillopt-external-adoption-verdict
    scope: integration
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 9dc80cd46b88b3e9ed22847789728d45e26785679f583f7506342eeaba32e1c5
    binding_hash: 0c598d0943fe6f35875966313e9afbbf35772f46c194059b9ea9356e3d981947
    fingerprint: 2c66693d839c50557df5751a7b39163dd45b64ff6aef181995fe671502ba6a1b
    fingerprint_components:
      contract: 9dc80cd46b88b3e9ed22847789728d45e26785679f583f7506342eeaba32e1c5
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
      - symbol_id: SYM-e2e-ontology-convergence-witnesses
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
The contract suite verifies that local or fake SkillOpt evidence remains review-only and cannot mutate canonical or mirror state. Production adoption stays blocked until an independently verified external verdict binds the source root, candidate hash, immutable root authorization, supervisor parent, invocation and matrix identity, and terminal evidence.

The bridge and workflow tests also verify rejection of incomplete staged-runtime configuration, forwarding of absolute Codex/bwrap flags, fail-fast scheduling after infrastructure failures, continued evaluation of behavioral failures, and structured exit-1 no-go output without an eligibility review for incomplete matrices.
