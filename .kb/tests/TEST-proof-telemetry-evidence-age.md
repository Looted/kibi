---
title: The maximum telemetry evidence age is 604800 seconds, by an arithmetic proof
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
    - symbol_id: SYM-proof-telemetry-evidence-age
      target: default
  success_policy: all_required_first_attempt
  kind: arithmetic
  value_source:
    - symbol_id: SYM-reqcompiler-telemetry-default-policy
      export: DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.maxEvidenceAgeSeconds
  proves:
    - CLAIM-0731977316FB677B
origin:
  kind: agent
  recorded_at: '2026-10-28T09:43:38.768Z'
id: TEST-proof-telemetry-evidence-age
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-cc9316de6213681c3de5a35f
    test_id: TEST-proof-telemetry-evidence-age
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 2b9c101c3283770f00705a8e8c1b9d92c00908895592ca5f160464eaa67ff158
    binding_hash: 113d9048d9d18587ce10360dfa76e305fd0e6e0f09199adf0ec16c3561768cb7
    fingerprint: 420d139b99113549ba83ea02f577c6f112437cc43bdb8260fc2625c971bf2bd9
    fingerprint_components:
      contract: 2b9c101c3283770f00705a8e8c1b9d92c00908895592ca5f160464eaa67ff158
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
      - symbol_id: SYM-proof-telemetry-evidence-age
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
      test_id: TEST-proof-telemetry-evidence-age
      variable: max_evidence_age_seconds
      value_type: int
      assumptions:
        - operator: eq
          value: 604800
      claim:
        operator: eq
        value: 604800
    certificate_digest: c1652a6e3536dca7ac61fc5735823aae374721ee89f7860598c96679a7624e0c
    claim_bindings:
      - claim_key: CLAIM-0731977316FB677B
        requirement_id: REQ-kibi-telemetry-acceptance-thresholds
        fact_id: FACT-telemetry-evidence-age
        binding: derived
        scope: code
        obligation:
          kind: numeric_constraint
          operator: eq
          value: 604800
          value_type: int
          variable: max_evidence_age_seconds
---
Reads DEFAULT_TELEMETRY_ACCEPTANCE_POLICY.maxEvidenceAgeSeconds and proves the maximum telemetry evidence age is 604800 seconds.