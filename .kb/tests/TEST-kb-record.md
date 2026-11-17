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
    receipt_id: PR-db0db143f840580ffbb5876c
    test_id: TEST-kb-record
    scope: end_to_end
    outcome: passed
    code_snapshot: ea01255979843eae1613367027b109d8dc1220b79358b0c0ad1b69430a2d532a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T18:15:37.440Z'
    finished_at: '2026-11-17T18:16:48.914Z'
    artifact_digest: 896597a3b54903285575dd4ed58ca0cf11ba612c1bfb487b5c45936924ac56b7
    contract_hash: 49cc43b4a82e92363709f289ffd169d15dfdb5202391960424bf41b3667cda4d
    binding_hash: 731bb46d30b0234955c19bb708554350ddd5fda3f940d0ed1c9c80295a1786b4
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
