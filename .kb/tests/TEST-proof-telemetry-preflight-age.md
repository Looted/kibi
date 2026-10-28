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
    receipt_id: PR-76af71a2c1ff42825580dbd7
    test_id: TEST-proof-telemetry-preflight-age
    scope: unit
    outcome: passed
    code_snapshot: aaa32e80c832d3a0745978acdf2dc4bdf882c05df0c6e9a2026459b40b6a7a13
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T09:46:25.636Z'
    finished_at: '2026-10-28T09:46:25.764Z'
    artifact_digest: ec85dbd6ecf3bd0ba8f86957d318793d80215fa0b3e841034c2b426ef0d913b8
    contract_hash: 6f1fed141a83fdcde107cb49cf445a1fec3e3a60c7fb9ec871d4bc4ef4e85346
    binding_hash: d7a59ed5549361f8decd4598c1add7a673042804bd028711cbd2156b0bef77e8
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