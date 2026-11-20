---
title: The default decision firmness shall be default, by a regex proof
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
    - symbol_id: SYM-proof-default-firmness
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-default-firmness
  proves:
    - CLAIM-E9F95F387651D7C8
origin:
  kind: agent
  recorded_at: '2026-10-28T11:03:11.164Z'
id: TEST-proof-default-firmness
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-567793e84be75b1ed21dd306
    test_id: TEST-proof-default-firmness
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: 8a0a7985d00825676f93cbd869d216757b13e8120c5c64ce53182d6dca493129
    binding_hash: 604943c0730cb339e2b4d3c1bbe8599eeab6d638b7e43d9337a2444a3e421b50
    fingerprint: 1743703bfa48d975c6281ebba96926e7601ce756ee227ef5bc4b55a6d40500a9
    fingerprint_components:
      contract: 8a0a7985d00825676f93cbd869d216757b13e8120c5c64ce53182d6dca493129
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
      - symbol_id: SYM-proof-default-firmness
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
      test_id: TEST-proof-default-firmness
      pattern:
        symbol_id: SYM-const-default-firmness
        type: string
        value: default
    certificate_digest: 7b1c9c069e68ccc008498df3ae5487a492b146bfc5b632a79f8b6376cf58dacd
    claim_bindings:
      - claim_key: CLAIM-E9F95F387651D7C8
        requirement_id: REQ-kb-decision-firmness-rule-ids
        fact_id: FACT-default-firmness
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: default
---
Proves that the default decision firmness shall be default, against the code Kibi reads at ingest.