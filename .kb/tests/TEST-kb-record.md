---
title: kb_record translation, executor and equivalence tests
status: active
priority: must
verification_scope: end_to_end
verification_perspective: internal
tags:
  - kb-record
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-record-equivalence
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T06:43:21.598Z'
id: TEST-kb-record
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c6a581e9f97f6a168dd5f825
    test_id: TEST-kb-record
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:47:27.150Z'
    finished_at: '2026-11-17T07:48:20.239Z'
    artifact_digest: 457d63e07e4255ebb3f2d29035118a2a6d39d326776addbb5719959881cb948b
    contract_hash: 49cc43b4a82e92363709f289ffd169d15dfdb5202391960424bf41b3667cda4d
    binding_hash: 15ca1c84e58af587ed3a123ee3ad3efc3367ee57501622f9122c98b49320214a
    fingerprint: 175adc2b64368c27e9a9cb43aeaa73208b33a68455480c05d5d42059e117d172
    fingerprint_components:
      contract: 49cc43b4a82e92363709f289ffd169d15dfdb5202391960424bf41b3667cda4d
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
      - symbol_id: SYM-test-kb-record-equivalence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The translation tests check every kb_record input against the one kb_upsert payload it builds (firm with a human origin and the quote for a user or maintainer, default with an agent origin for the agent, the code as implementedBy and a test as verified_by and coveredBy) and the refusal of every other field, naming kb_upsert. The executor tests check that the payload goes through kb_upsert's schema and executor once, then kb_check changed:true over the named files, and what a dry run returns. The consumer test records rules in one workspace with kibi record and in an identical one with kibi upsert of the returned payload followed by kibi check --changed, and compares the results, verdicts, KB documents and queried entities.
