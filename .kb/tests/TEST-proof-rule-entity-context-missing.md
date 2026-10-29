---
title: An entity without a context body shall be reported as entity-context-missing, by a regex proof
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
    - symbol_id: SYM-proof-rule-entity-context-missing
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-entity-context-missing-rule
  proves:
    - CLAIM-EF56D3C7B830536E
origin:
  kind: agent
  recorded_at: '2026-10-29T16:42:43.760Z'
id: TEST-proof-rule-entity-context-missing
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-0680edff3f38258ca9152ae2
    test_id: TEST-proof-rule-entity-context-missing
    scope: unit
    outcome: passed
    code_snapshot: a29ab0b7ed18b6a171a62094b8cf21f0c4a2013eca287583b5dc35ba5bd319c0
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-29T17:33:08.550Z'
    finished_at: '2026-10-29T17:33:08.803Z'
    artifact_digest: beeeee8b1a7187577bdf11b202ffdac2251973333ddee2a98a2372032993889a
    contract_hash: c4d2b0639578ec971e92d67551a33ace1b0fc34f79f421087634555a2646ccc0
    binding_hash: 17a51499ca905e2a3a7cf383c4511ca86e665caf8bd754a0a8d3a7a1c898ddbf
    fingerprint: 15ba75328206052822364b2aa51e3661efb2f6def2f8ad9d39321cbd039b1e51
    fingerprint_components:
      contract: c4d2b0639578ec971e92d67551a33ace1b0fc34f79f421087634555a2646ccc0
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
      - symbol_id: SYM-proof-rule-entity-context-missing
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
      test_id: TEST-proof-rule-entity-context-missing
      pattern:
        symbol_id: SYM-const-entity-context-missing-rule
        type: string
        value: entity-context-missing
    certificate_digest: a561cdba2f5aa04c0dec301cd0d13d7fa651b991b7830170c07c39a1923281ec
    claim_bindings:
      - claim_key: CLAIM-EF56D3C7B830536E
        requirement_id: REQ-kb-entity-context-rule-names
        fact_id: FACT-rule-entity-context-missing
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: entity-context-missing
---
Proves that an entity without a context body shall be reported as entity-context-missing, against the code Kibi reads at ingest.