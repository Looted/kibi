---
title: The kibi-zcode hooks register the lifecycle events, by a source proof
status: passing
tags:
  - proof
  - certificate
  - source
verification_scope: unit
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-10-27T07:27:54.923Z'
id: TEST-proof-zcode-lifecycle-hooks
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-proof-zcode-lifecycle-hooks
      target: default
  success_policy: all_required_first_attempt
  kind: source
  source:
    reader: json
    file: packages/zcode/hooks/hooks.json
    path: /hooks
    select: keys
  proves:
    - CLAIM-AE2131CEB3BC5794
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fd39b24360805021d95cfd13
    test_id: TEST-proof-zcode-lifecycle-hooks
    scope: unit
    outcome: passed
    code_snapshot: fb035ebe8ad317f96c2ab68de5a7680a017812416249fe122eef3f4de5e136c9
    environment_hash: 70794eb189f6bb0bd59b638fedca584356a0b61f01329f6f9f4e9f53a3b5be53
    started_at: '2026-10-27T07:28:58.492Z'
    finished_at: '2026-10-27T07:28:58.647Z'
    artifact_digest: 4acce5263d70c51b1c2a733c2b936168133882303751bc2735638f94e7d90006
    contract_hash: 79564eafa037ca3b40b68b2a5f516638e91d8536d9a955a8e3ffbcf712aa4552
    binding_hash: 9c0fb9ab48b837a53ed3f063e9797f0c142376852fdfb3a9d82dc1262660106f
    fingerprint: 3a91f02807f19451e726b500c76b0b2cd3efc29357b729bf6b8c3cc4242be750
    fingerprint_components:
      contract: 79564eafa037ca3b40b68b2a5f516638e91d8536d9a955a8e3ffbcf712aa4552
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
      - symbol_id: SYM-proof-zcode-lifecycle-hooks
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: source
    evidence_level: proved
    certificate:
      version: kibi.code-certificate.v1
      kind: source
      test_id: TEST-proof-zcode-lifecycle-hooks
      source:
        reader: json
        file: packages/zcode/hooks/hooks.json
        path: /hooks
        select: keys
      model:
        members:
          - PostToolUse
          - PreToolUse
          - SessionStart
          - Stop
          - UserPromptSubmit
    certificate_digest: eb0270fce0e877d31213b74d9aa9e01b4ccb244397260f36c17e8b5577398f6e
    claim_bindings:
      - claim_key: CLAIM-AE2131CEB3BC5794
        requirement_id: REQ-zcode-plugin-package
        fact_id: FACT-zcode-lifecycle-hooks
        binding: derived
        scope: code
        obligation:
          kind: set_relation
          members:
            - PostToolUse
            - PreToolUse
            - SessionStart
            - Stop
            - UserPromptSubmit
          operator: includes
---
Proves that the kibi-zcode hooks configuration registers SessionStart, UserPromptSubmit, PreToolUse, PostToolUse and Stop hooks: Kibi reads the hook events itself.