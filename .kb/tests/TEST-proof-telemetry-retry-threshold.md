---
title: The repeated mutation failure threshold is 3 failed upserts, by an arithmetic proof
status: passing
tags:
  - proof
  - certificate
  - arithmetic
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-telemetry-retry-threshold
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-telemetry-default-policy
      export: DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.repeatedMutationFailureThreshold
  proves:
    - CLAIM-7359B46424CC0BF4
origin:
  kind: agent
  recorded_at: '2026-10-28T09:44:20.355Z'
id: TEST-proof-telemetry-retry-threshold
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-3a5bb2ce2e249bb7fa28cd97
    test_id: TEST-proof-telemetry-retry-threshold
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 09c191395ded26c7062905eabc2f12c9c29f9d4b2b1ecfe9722eb6261a332b66
    binding_hash: 3eab04a4bf11b8c0154ec94c9f2ca0a9e0311b7b1d52a0e328547424f466a8b2
    fingerprint: 907c4e465d24a6d694cefcea5fb30a178c29046a47eab4065755b1d334a2a7d7
    fingerprint_components:
      contract: 09c191395ded26c7062905eabc2f12c9c29f9d4b2b1ecfe9722eb6261a332b66
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
      - symbol_id: SYM-proof-telemetry-retry-threshold
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: arithmetic
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: arithmetic
      test_id: TEST-proof-telemetry-retry-threshold
      variable: repeated_mutation_failure_threshold
      value_type: int
      assumptions:
        - operator: eq
          value: 3
      claim:
        operator: eq
        value: 3
    certificate_digest: 22dfc6e37ac1fcdde72ac75c4e8d73e9a0d21624db35c9fa3b908c69cc8b27b9
    claim_bindings:
      - claim_key: CLAIM-7359B46424CC0BF4
        requirement_id: REQ-kibi-telemetry-acceptance-thresholds
        fact_id: FACT-telemetry-retry-threshold
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 3
          value_type: int
          variable: repeated_mutation_failure_threshold
---
Reads DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.repeatedMutationFailureThreshold and proves the repeated mutation failure threshold is 3 failed upserts.