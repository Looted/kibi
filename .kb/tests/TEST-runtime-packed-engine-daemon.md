---
title: Packed runtime engine daemon consumer proof
status: passing
tags:
  - runtime
  - engine
  - packed
  - e2e
  - proof
  - review:context-missing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-runtime-engine-daemon
      target: default
  success_policy: all_required_first_attempt
id: TEST-runtime-packed-engine-daemon
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c4589595a59b0303aea6ca8d
    test_id: TEST-runtime-packed-engine-daemon
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ed5ab55b3c5d386434b8837b93f63ec6797d0dd5bf2b248a10008d63b41039a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T13:32:13.285Z'
    finished_at: '2026-11-04T13:32:15.421Z'
    artifact_digest: 5dffb78f32c0e893952a04f879680101d36dbf15e0fb3ce2e5eba9c5ce437c7c
    contract_hash: ec8538cede0c497fbd808316e461fbd35bbfa5bd13aca63444a8eb8affe6c8a3
    binding_hash: f7178b907b93b4dfbe0419da3c03e9c8b405c067f2ff14fe6c5a49b8953c8762
    fingerprint: 76e8e28be0080a3523df987dfd0fd913a3938502845df485e52a8ca7b04e3b6a
    fingerprint_components:
      contract: ec8538cede0c497fbd808316e461fbd35bbfa5bd13aca63444a8eb8affe6c8a3
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
      - symbol_id: SYM-test-runtime-engine-daemon
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---