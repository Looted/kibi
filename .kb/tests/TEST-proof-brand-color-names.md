---
title: A Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger, by an exhaustive proof
status: passing
tags:
  - proof
  - certificate
  - exhaustive
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-brand-color-names
      target: default
  success_policy: all_required_first_attempt
  kind: exhaustive
  domain_source:
    symbol_id: SYM-cli-report-brand-tokens
  proves:
    - CLAIM-13A7E1BD0A658DBA
origin:
  kind: agent
  recorded_at: '2026-10-28T22:27:53.646Z'
id: TEST-proof-brand-color-names
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8a44e56e14e4631f9b1e6d7a
    test_id: TEST-proof-brand-color-names
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 98dcbda85ea01cc27c2b943c3436e6b188494f2b3c9c3f919bba4b26e1a01774
    binding_hash: 749c95838fcb98acac4c5dd0435ad0049ecf0433cc629bec52fb0b19b2c47e5a
    fingerprint: 9a6c9953f1660a0e340e3870cffb4d96daff6fcf4c2f40d8148dae218ed3ddae
    fingerprint_components:
      contract: 98dcbda85ea01cc27c2b943c3436e6b188494f2b3c9c3f919bba4b26e1a01774
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
      - symbol_id: SYM-proof-brand-color-names
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: exhaustive
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: exhaustive
      test_id: TEST-proof-brand-color-names
      domain:
        symbol_id: SYM-cli-report-brand-tokens
        members:
          - carbon
          - deepCarbon
          - panel
          - ice
          - signal
          - snow
          - mist
          - rail
          - success
          - warning
          - danger
      results:
        - member: carbon
          outcome: passed
        - member: deepCarbon
          outcome: passed
        - member: panel
          outcome: passed
        - member: ice
          outcome: passed
        - member: signal
          outcome: passed
        - member: snow
          outcome: passed
        - member: mist
          outcome: passed
        - member: rail
          outcome: passed
        - member: success
          outcome: passed
        - member: warning
          outcome: passed
        - member: danger
          outcome: passed
    certificate_digest: 53370fabb52a6f1fe934829ff43fce0610f8b2e5651e047be9dd7aca0ef7571d
    claim_bindings:
      - claim_key: CLAIM-13A7E1BD0A658DBA
        requirement_id: REQ-kibi-report-brand-colors
        fact_id: FACT-brand-color-names
        binding: derived
        scope: code
        obligation:
          kind: set_equals
          members:
            - carbon
            - danger
            - deepCarbon
            - ice
            - mist
            - panel
            - rail
            - signal
            - snow
            - success
            - warning
---
Proves that a Kibi brand colour shall be carbon, deepCarbon, panel, ice, signal, snow, mist, rail, success, warning or danger, against the code Kibi reads at ingest.