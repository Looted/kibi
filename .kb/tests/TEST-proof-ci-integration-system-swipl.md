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
    receipt_id: PR-6e889bf159bf57a8cce99efe
    test_id: TEST-proof-ci-integration-system-swipl
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: dbae5db5b2b78f4718965150a2b9aa811166046251891e39c014b511c8d36a46
    binding_hash: 62219806a8b28cec256ec7155f01306acdc8d8faae782a660f5444409868f1f9
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