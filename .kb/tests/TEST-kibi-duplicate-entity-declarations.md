---
title: CLI kb_check blocks an entity id declared twice and kb_upsert merges link-only copies
status: passing
priority: must
tags:
  - check
  - integrity
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-05T11:48:04.862Z'
id: TEST-kibi-duplicate-entity-declarations
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-duplicate-entity-declarations-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-c3ec919b21175db7d30f427e
    test_id: TEST-kibi-duplicate-entity-declarations
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: f3782f1c493f92cecb8be9dca1d37b671b451f8cf215f2df92d06343ad070d5f
    binding_hash: eac0ff720a435610366b4c1e4e47c4b7a8b8614bd207015ee503139a307e35ad
    fingerprint: ced6323c748ce99a32dc3e3f9e80022e0bb4508cf53ed5d0812452a571fc799f
    fingerprint_components:
      contract: f3782f1c493f92cecb8be9dca1d37b671b451f8cf215f2df92d06343ad070d5f
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
      - symbol_id: SYM-kibi-duplicate-entity-declarations-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the CLI on a temporary Git workspace whose `.kb/symbols.yaml` declares one symbol id twice: `kibi check` exits non-zero with one blocking `source-relationship-parity` finding that names both titles, the file and the fix, and passes once one record remains. When the copies differ only in their links, a `kb_upsert` of the symbol leaves one record with both links and the finding is gone. A unit test pins the exact finding for duplicates across entity files and within the manifest.