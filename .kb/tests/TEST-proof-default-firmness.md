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
    receipt_id: PR-6629edaf441c83eccfdf6a9f
    test_id: TEST-proof-default-firmness
    scope: unit
    outcome: passed
    code_snapshot: bf6dc28c237eeec059b86c44f4831693a4d73c2fae9e3e3657e51164096248f7
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T14:59:34.389Z'
    finished_at: '2026-10-28T14:59:34.614Z'
    artifact_digest: 95337ac986a40a27cbc1a6a8c21164d5e0c0824203aa1ce5a7a3dcbbbd53b3a4
    contract_hash: 8a0a7985d00825676f93cbd869d216757b13e8120c5c64ce53182d6dca493129
    binding_hash: a068b83929c2e2e26bf926e6525cf90cca52844027e33effa68c9eadb612d211
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