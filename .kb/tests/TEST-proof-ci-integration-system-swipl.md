---
title: The ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-ci-integration-system-swipl
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: yaml
    file: .github/workflows/ci.yml
    path: jobs.ci-integration.env.KIBI_SWIPL
  proves:
    - CLAIM-DF4E3136C1465174
origin:
  kind: agent
  recorded_at: '2026-10-28T10:37:16.859Z'
id: TEST-proof-ci-integration-system-swipl
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c339152064d09efd72a7a715
    test_id: TEST-proof-ci-integration-system-swipl
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: dbae5db5b2b78f4718965150a2b9aa811166046251891e39c014b511c8d36a46
    binding_hash: fc785f751ae3c788a8d58cad69f0205af9a90ed4238ba5605d1f80e7a08ebf76
    fingerprint: 87546f0cc516a64c3a4ff893cc9b8a02e89b9da166690b54e9c973307cad9434
    fingerprint_components:
      contract: dbae5db5b2b78f4718965150a2b9aa811166046251891e39c014b511c8d36a46
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
      - symbol_id: SYM-proof-ci-integration-system-swipl
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-ci-integration-system-swipl
      source:
        reader: yaml
        file: .github/workflows/ci.yml
        path: jobs.ci-integration.env.KIBI_SWIPL
      model:
        members:
          - system
    certificate_digest: 2cd272299baf87505acc51bb4b839a783660248c9596751c1a4d3c05cfa556b1
    claim_bindings:
      - claim_key: CLAIM-DF4E3136C1465174
        requirement_id: REQ-prolog-ci-system-swipl-job
        fact_id: FACT-ci-integration-system-swipl
        binding: derived
        scope: source
        obligation:
          kind: set_relation
          members:
            - system
          operator: eq
---
Proves that the ci-integration job of the Kibi CI workflow shall set KIBI_SWIPL to system, against the file Kibi reads at ingest.