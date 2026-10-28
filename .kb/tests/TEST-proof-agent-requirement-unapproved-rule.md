---
title: The unapproved agent requirement rule shall be agent-requirement-unapproved, by a regex proof
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
    - symbol_id: SYM-proof-agent-requirement-unapproved-rule
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-agent-requirement-unapproved-rule
  proves:
    - CLAIM-F67FF62F420AF804
origin:
  kind: agent
  recorded_at: '2026-10-28T20:20:37.837Z'
id: TEST-proof-agent-requirement-unapproved-rule
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-8005f4700b7fc50c83ac1cf4
    test_id: TEST-proof-agent-requirement-unapproved-rule
    scope: unit
    outcome: passed
    code_snapshot: 1527b4cbcc3ade2f38aa86a1134590cb549c79eb8db739cb67bcdea1f5054201
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T20:24:22.354Z'
    finished_at: '2026-10-28T20:24:22.510Z'
    artifact_digest: ad8870cfed9f9b358fd6b0180ef40a9d9566904417a564811571b8dda26dad7f
    contract_hash: 9124f294fee64b2efe15bbd3396cacfd308335b66080a09f74cd1f02c2db500f
    binding_hash: 9f636e871d3dcc48c63e491bec78a0bd272ae3c6ee54f6f9a0363306bb358267
    fingerprint: e793e8e301ec6432ae4687a7c71175824120a43afcca759141a3ec41d51e5aa4
    fingerprint_components:
      contract: 9124f294fee64b2efe15bbd3396cacfd308335b66080a09f74cd1f02c2db500f
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
      - symbol_id: SYM-proof-agent-requirement-unapproved-rule
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
      test_id: TEST-proof-agent-requirement-unapproved-rule
      pattern:
        symbol_id: SYM-const-agent-requirement-unapproved-rule
        type: string
        value: agent-requirement-unapproved
    certificate_digest: 1ef5b09fec85ee0b4af0bc160ec3806d8e44994431f3d331e78e61cca22b64c3
    claim_bindings:
      - claim_key: CLAIM-F67FF62F420AF804
        requirement_id: REQ-kibi-check-rule-names
        fact_id: FACT-agent-requirement-unapproved-rule
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: agent-requirement-unapproved
---
Proves that the unapproved agent requirement rule shall be agent-requirement-unapproved, against the code Kibi reads at ingest.