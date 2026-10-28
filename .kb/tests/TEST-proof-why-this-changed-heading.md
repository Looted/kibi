---
title: The supersede explanation heading shall be Why this changed, by a regex proof
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
    - symbol_id: SYM-proof-why-this-changed-heading
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-decision-firmness-why-heading
  proves:
    - CLAIM-B6471B91793A326B
origin:
  kind: agent
  recorded_at: '2026-10-28T10:33:43.876Z'
id: TEST-proof-why-this-changed-heading
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-6a8577df41aa95f5e7430c09
    test_id: TEST-proof-why-this-changed-heading
    scope: unit
    outcome: passed
    code_snapshot: d1a0d2ef8f66c9c334383a818f6f2125685d0b4f5590d2f4a61aaeadee65c910
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T10:34:53.676Z'
    finished_at: '2026-10-28T10:34:53.822Z'
    artifact_digest: d7c21c3e5f78c1db6d065e96ccb12c636122b4152d37f604a2cbae70de6a92d5
    contract_hash: 98bbafe46f9f2b72e816b509c2728a47ff3144ef015352ac251743471f3c151a
    binding_hash: 0bbbd5d1c591cb53ff4fc4a359d07510f26edda28bbfe5c6df00d00b53dc9c42
    fingerprint: 82c0dcf8fc409b3ab6d3dabb82290d3a87aea43ab301292d1c7ae35baa6748de
    fingerprint_components:
      contract: 98bbafe46f9f2b72e816b509c2728a47ff3144ef015352ac251743471f3c151a
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
      - symbol_id: SYM-proof-why-this-changed-heading
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
      test_id: TEST-proof-why-this-changed-heading
      pattern:
        symbol_id: SYM-decision-firmness-why-heading
        type: string
        value: Why this changed
    certificate_digest: 02fa9beb54f378090c0ae50074fe8324a2a75be5fb2b38d248b3657f4590796e
    claim_bindings:
      - claim_key: CLAIM-B6471B91793A326B
        requirement_id: REQ-kb-decision-firmness-settings
        fact_id: FACT-why-this-changed-heading
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: Why this changed
---
Proves that the supersede explanation heading shall be Why this changed, against the code Kibi reads at ingest.