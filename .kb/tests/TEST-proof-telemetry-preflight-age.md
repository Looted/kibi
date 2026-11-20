---
title: The maximum validation preflight age is 3600 seconds, by an arithmetic proof
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
    - symbol_id: SYM-proof-telemetry-preflight-age
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-telemetry-default-policy
      export: DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.preflightMaxAgeSeconds
  proves:
    - CLAIM-DCD38AF69BA97336
origin:
  kind: agent
  recorded_at: '2026-10-28T09:43:52.387Z'
id: TEST-proof-telemetry-preflight-age
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2ca400e37007eca51653a9be
    test_id: TEST-proof-telemetry-preflight-age
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 6f1fed141a83fdcde107cb49cf445a1fec3e3a60c7fb9ec871d4bc4ef4e85346
    binding_hash: dd08f465523588c36b284a9c9c615488b79d0d1c7b806ff8f26b950dc4efcaff
    fingerprint: d110c1906d4a4ca50dd6c18b2026fe47bd57ab2744307716912b4cb9314b6995
    fingerprint_components:
      contract: 6f1fed141a83fdcde107cb49cf445a1fec3e3a60c7fb9ec871d4bc4ef4e85346
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
      - symbol_id: SYM-proof-telemetry-preflight-age
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
      test_id: TEST-proof-telemetry-preflight-age
      variable: preflight_max_age_seconds
      value_type: int
      assumptions:
        - operator: eq
          value: 3600
      claim:
        operator: eq
        value: 3600
    certificate_digest: f729b9006c3d981a7d8d47e489514124b63b8d10de1644ff84c8d16bbd93fe9c
    claim_bindings:
      - claim_key: CLAIM-DCD38AF69BA97336
        requirement_id: REQ-kibi-telemetry-acceptance-thresholds
        fact_id: FACT-telemetry-preflight-age
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 3600
          value_type: int
          variable: preflight_max_age_seconds
---
Reads DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.preflightMaxAgeSeconds and proves the maximum validation preflight age is 3600 seconds.