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
    receipt_id: PR-7285cdf23861d4af6b411d95
    test_id: TEST-proof-telemetry-retry-threshold
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:44.843Z'
    finished_at: '2026-11-20T08:30:48.727Z'
    artifact_digest: a61dd1ad2002c8afb89c31fa8f15d0e615ffba59e8970ba0e97f7d06dbed27be
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