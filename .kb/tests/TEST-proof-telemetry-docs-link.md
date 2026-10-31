---
title: The Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html, by a regex proof
status: passing
tags:
  - proof
  - certificate
  - regex
verification_scope: unit
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-telemetry-docs-link
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  proves:
    - CLAIM-8547DA9ED05ED915
  pattern_source:
    symbol_id: SYM-const-telemetry-docs-url
origin:
  kind: agent
  recorded_at: '2026-10-30T19:42:34.762Z'
id: TEST-proof-telemetry-docs-link
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a17e97b6a6e4e929763e70a7
    test_id: TEST-proof-telemetry-docs-link
    scope: unit
    outcome: passed
    code_snapshot: e2663d10a2e1a0b8fdd0d38e888ee46d8031436be2244a613e1c406fbfa714b0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-30T19:45:46.100Z'
    finished_at: '2026-10-30T19:45:46.236Z'
    artifact_digest: 25decf556a4bd2839ad4973f28de2f2a37cb95c59d5526e5679becfe42d8dc6a
    contract_hash: 4e608a077561226847fc2894326d4ebf2c75a05014630334e7af2db7cbb6fdb9
    binding_hash: 91b690a6d86b66ae7a372eeecae7fde6b76fb80298cc08ae8fdae0a1c6472115
    fingerprint: 146d9f3f1ecea372bbd1020e9dd2ec6e8afafb9646e708d83d4ce4ec2cf5d548
    fingerprint_components:
      contract: 4e608a077561226847fc2894326d4ebf2c75a05014630334e7af2db7cbb6fdb9
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
      - symbol_id: SYM-proof-telemetry-docs-link
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: regex
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: regex
      test_id: TEST-proof-telemetry-docs-link
      pattern:
        symbol_id: SYM-const-telemetry-docs-url
        type: string
        value: https://looted.github.io/kibi/guide/telemetry.html
    certificate_digest: 91088e6efa971fbec3c331a72efe5e11a30e227e83a4265e8bc5e520579c0300
    claim_bindings:
      - claim_key: CLAIM-8547DA9ED05ED915
        requirement_id: REQ-telemetry-docs-link
        fact_id: FACT-telemetry-docs-link
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: https://looted.github.io/kibi/guide/telemetry.html
---
Proves that the Kibi telemetry documentation page shall be https://looted.github.io/kibi/guide/telemetry.html, against the code Kibi reads at ingest.