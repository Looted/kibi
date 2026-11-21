---
title: The maximum source analysis input shall be 5242880 code units, by an arithmetic proof
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
    - symbol_id: SYM-proof-source-analysis-max-input
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-source-analysis-v2-max-input-code-units
  proves:
    - CLAIM-82659EB982EDC5B2
origin:
  kind: agent
  recorded_at: '2026-10-28T10:52:19.448Z'
id: TEST-proof-source-analysis-max-input
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-bb334f7032ef79f5e98c3542
    test_id: TEST-proof-source-analysis-max-input
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 22028699441fe6c8a1f9bed5773aafb6dbb910308bba94a056186cbd7502a4f5
    binding_hash: 5dad1adf0d7a5378b339e711ada579910f04bafe528683054033ec2482e9ef05
    fingerprint: c19fa4d4f579f4b0f3ab603497a2637d50c71c42b19736d0cff89f2cb11751b6
    fingerprint_components:
      contract: 22028699441fe6c8a1f9bed5773aafb6dbb910308bba94a056186cbd7502a4f5
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
      - symbol_id: SYM-proof-source-analysis-max-input
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
      test_id: TEST-proof-source-analysis-max-input
      variable: max_input_code_units
      value_type: int
      assumptions:
        - operator: eq
          value: 5242880
      claim:
        operator: eq
        value: 5242880
    certificate_digest: 567e1ac5a5a6c278aab4e4ef8a9f00e1c0abdbaee0afd49f6df6e8ac9dde43b2
    claim_bindings:
      - claim_key: CLAIM-82659EB982EDC5B2
        requirement_id: REQ-capability-plugin-source-analysis-input-limit
        fact_id: FACT-source-analysis-max-input
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 5242880
          value_type: int
          variable: max_input_code_units
---
Proves that the maximum source analysis input shall be 5242880 code units, against the code Kibi reads at ingest.