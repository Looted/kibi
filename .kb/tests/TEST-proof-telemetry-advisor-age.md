---
title: The maximum semantic-advisor age is 86400 seconds, by an arithmetic proof
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
    - symbol_id: SYM-proof-telemetry-advisor-age
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-telemetry-default-policy
      export: DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.advisorMaxAgeSeconds
  proves:
    - CLAIM-F3DAB90B091449BF
origin:
  kind: agent
  recorded_at: '2026-10-28T09:44:06.153Z'
id: TEST-proof-telemetry-advisor-age
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-04aaffeaea4a9efaa85c16df
    test_id: TEST-proof-telemetry-advisor-age
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: a13f633621f79861b1b2445c68c19787bf980f3384dd705b98656d2c24750346
    binding_hash: 7f6a2f8241f2dda16108ee55900d6b4458a26b416e02fdc0bf8f9eedbbceb2a5
    fingerprint: 4e02d166e8b527283482b1294ec90eaffaded6efe85f888f80c8f4f017b3610d
    fingerprint_components:
      contract: a13f633621f79861b1b2445c68c19787bf980f3384dd705b98656d2c24750346
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
      - symbol_id: SYM-proof-telemetry-advisor-age
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
      test_id: TEST-proof-telemetry-advisor-age
      variable: advisor_max_age_seconds
      value_type: int
      assumptions:
        - operator: eq
          value: 86400
      claim:
        operator: eq
        value: 86400
    certificate_digest: 077b0d89f2612922b66aec3f51c20dce5b753d71ed204947ca18da65428ae359
    claim_bindings:
      - claim_key: CLAIM-F3DAB90B091449BF
        requirement_id: REQ-kibi-telemetry-acceptance-thresholds
        fact_id: FACT-telemetry-advisor-age
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 86400
          value_type: int
          variable: advisor_max_age_seconds
---
Reads DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.advisorMaxAgeSeconds and proves the maximum semantic-advisor age is 86400 seconds.