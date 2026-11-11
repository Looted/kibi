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
    receipt_id: PR-0a3d91ab298a75458d971f6a
    test_id: TEST-proof-agent-requirement-unapproved-rule
    scope: unit
    outcome: passed
    code_snapshot: e25a1f0385dac8dcff3382f76f7940204d134ea7aa298c9b083cb2fcd11015b2
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T18:30:06.210Z'
    finished_at: '2026-11-04T18:30:06.354Z'
    artifact_digest: aceb0cbe7bb3bdc1bbbd6e2710a7c2c6ff101020a51090d48f40acf81ab0859e
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
        requirement_id: REQ-kibi-origin-review-rule-names
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