---
title: The logic IR version shall be kibi.logic.v1, by a regex proof
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
    - symbol_id: SYM-proof-logic-ir-version
      target: default
  success_policy: all_required_first_attempt
  kind: regex
  pattern_source:
    symbol_id: SYM-cli-logic-ir-LOGIC_IR_VERSION
  proves:
    - CLAIM-9C471A9A9A09BBF9
origin:
  kind: agent
  recorded_at: '2026-10-28T17:18:52.726Z'
id: TEST-proof-logic-ir-version
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-1c5eacea1d5e62c0bfcc1981
    test_id: TEST-proof-logic-ir-version
    scope: unit
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: 78cefca1d5171687e659070177ce7b3f5b148049a94b62c5f956da1681057a1c
    binding_hash: 57b0eef449a7ba12c1e3a9c18f87f83af4823317af1f57dc6b37d525d91348ee
    fingerprint: f72afe2638f0d3ff4fad1c9572a7ce8c04acbaf567ac51f7d1e270fd09c2fdc0
    fingerprint_components:
      contract: 78cefca1d5171687e659070177ce7b3f5b148049a94b62c5f956da1681057a1c
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
      - symbol_id: SYM-proof-logic-ir-version
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
      test_id: TEST-proof-logic-ir-version
      pattern:
        symbol_id: SYM-cli-logic-ir-LOGIC_IR_VERSION
        type: string
        value: kibi.logic.v1
    certificate_digest: c5273bb390856833282fda32690e47c7ed54226407e7ad3c77739649bcf3dfb4
    claim_bindings:
      - claim_key: CLAIM-9C471A9A9A09BBF9
        requirement_id: REQ-kibi-logic-rule-limits
        fact_id: FACT-logic-ir-version
        binding: derived
        scope: code
        obligation:
          kind: string_constraint
          operator: eq
          polarity: require
          value: kibi.logic.v1
---
Proves that the logic IR version shall be kibi.logic.v1, against the code Kibi reads at ingest.