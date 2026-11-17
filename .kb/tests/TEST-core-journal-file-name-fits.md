---
title: Journal file name limit tests
status: passing
priority: must
tags:
  - core
  - persistence
verification_scope: end_to_end
verification_perspective: internal
sourceFile: packages/core/tests/kb.plt
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-core-journal-file-name-fits
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T06:00:16.872Z'
id: TEST-core-journal-file-name-fits
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-311309ade0b3bf5d8731dc30
    test_id: TEST-core-journal-file-name-fits
    scope: end_to_end
    outcome: passed
    code_snapshot: 6955358198e7f0b23939c6e442f99b9a815dd30b717049591f1156e08376c978
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T06:04:38.785Z'
    finished_at: '2026-11-17T06:04:40.700Z'
    artifact_digest: de9cfb8825c07ab99fc7e4a0a002de16a79fbb207dccf7c8867e0da464b52f14
    contract_hash: 391aa9bda0b7bcde826780fd1557a0080c66a35c4dd5cc864b5bb92a1400302c
    binding_hash: 962e6350db3cf7b40456185820d0f2bf24eec220e3bb8b9a30547d92a9bd698b
    fingerprint: 2508fe2f020c67866ba0c28f1aff2f26234bbcee8ccc7c6e364293dbefc64b82
    fingerprint_components:
      contract: 391aa9bda0b7bcde826780fd1557a0080c66a35c4dd5cc864b5bb92a1400302c
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
      - symbol_id: SYM-test-core-journal-file-name-fits
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The kb_storage_lane unit in packages/core/tests/kb.plt. The journal_graph_uri_* tests pin where journal_expected_graph_uri/2 switches from the file:// graph URI to the digest URI: at 247 encoded bytes for letters, `_`, punctuation (three bytes), a non-ASCII letter (three bytes) and a newline (six bytes). a_journaled_store_under_a_punctuated_path_saves_and_reloads attaches a journaled store whose file:// URI is at most 200 characters but whose encoded journal name is over 255 bytes, writes an entity, saves, detaches and reloads it; on the earlier 200-character rule this aborted SWI-Prolog. Run with `swipl -q -g 'run_tests(kb_storage_lane)' -t halt packages/core/tests/kb.plt`.