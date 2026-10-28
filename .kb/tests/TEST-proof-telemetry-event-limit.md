---
title: The telemetry acceptance report reads at most 200 usage events, by an arithmetic proof
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
    - symbol_id: SYM-proof-telemetry-event-limit
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-telemetry-default-policy
      export: DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.eventLimit
  proves:
    - CLAIM-1E510239A7351EB3
origin:
  kind: agent
  recorded_at: '2026-10-28T09:43:25.404Z'
id: TEST-proof-telemetry-event-limit
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8cbbe21586cce6b3db11dd20
    test_id: TEST-proof-telemetry-event-limit
    scope: unit
    outcome: passed
    code_snapshot: aaa32e80c832d3a0745978acdf2dc4bdf882c05df0c6e9a2026459b40b6a7a13
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:46:13.670Z'
    finished_at: '2026-10-28T09:46:13.787Z'
    artifact_digest: 6747a3192896bf17c0f1102574e83dd5e158401200735ac809f00e1fa8236e08
    contract_hash: 479c87786ae51fa91f81f40c046581463d4738fac0124ba0857cebef106f52db
    binding_hash: 45d7b4daf7bd07f428b3e829bbc059f6513b5065834229c0f70fe2c450047d6e
    fingerprint: 6979eee568e2928ee26a80b15a1991ffb4c5b206aa61dd1288d2af9c65db2f60
    fingerprint_components:
      contract: 479c87786ae51fa91f81f40c046581463d4738fac0124ba0857cebef106f52db
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
      - symbol_id: SYM-proof-telemetry-event-limit
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
      test_id: TEST-proof-telemetry-event-limit
      variable: event_limit
      value_type: int
      assumptions:
        - operator: eq
          value: 200
      claim:
        operator: eq
        value: 200
    certificate_digest: 84d07a6cd070fac612e71086a3eaba55f72a8dda06e6e18730f2d40f07382c67
    claim_bindings:
      - claim_key: CLAIM-1E510239A7351EB3
        requirement_id: REQ-kibi-telemetry-acceptance-thresholds
        fact_id: FACT-telemetry-event-limit
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 200
          value_type: int
          variable: event_limit
---
Reads DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.eventLimit and proves the telemetry acceptance report reads at most 200 usage events.