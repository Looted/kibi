---
title: The context review tag shall be review:context-missing, by a regex proof
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
    - symbol_id: SYM-proof-context-missing-tag
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-const-context-missing-tag
  proves:
    - CLAIM-6949C5497269C18C
origin:
  kind: agent
  recorded_at: '2026-10-28T11:05:18.711Z'
id: TEST-proof-context-missing-tag
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-9033dd187713507338502ffe
    test_id: TEST-proof-context-missing-tag
    scope: unit
    outcome: passed
    code_snapshot: 4f161374550f014eb48d8e921619cbdaa1e1e274ac4673138b0e5ff3cbb2b55f
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-28T11:06:09.526Z'
    finished_at: '2026-10-28T11:06:09.762Z'
    artifact_digest: c9bc868471af3703c30b1eb64587edb9f562691c730b5ac9ed988bbca5555604
    contract_hash: ca143c889fe4d1e188a877581fff522dc0a210ec354f6a84a98ff06e52133efa
    binding_hash: 073f391386b000332d5073e8894fff364fa2276a6892c6ff376f95a908091dec
    fingerprint: c849f7ff63c96b9d5053963d44ece65c7584cc537acdab9914174226c4189e8d
    fingerprint_components:
      contract: ca143c889fe4d1e188a877581fff522dc0a210ec354f6a84a98ff06e52133efa
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
      - symbol_id: SYM-proof-context-missing-tag
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
      test_id: TEST-proof-context-missing-tag
      pattern:
        symbol_id: SYM-const-context-missing-tag
        type: string
        value: review:context-missing
    certificate_digest: f825313690337cd177fcca2b31f2b47a3a7601045187cd58befb3970ec949faa
    claim_bindings:
      - claim_key: CLAIM-6949C5497269C18C
        requirement_id: REQ-kb-entity-context-rule-ids
        fact_id: FACT-context-missing-tag
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: review:context-missing
---
Proves that the context review tag shall be review:context-missing, against the code Kibi reads at ingest.