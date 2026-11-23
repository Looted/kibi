---
title: Packed predicate vocabulary conformance and migration
status: passing
verification_scope: end_to_end
tags:
  - vocabulary-convergence
id: TEST-kibi-predicate-vocabulary-migration-e2e
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-packed-predicate-vocabulary-migration
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e31a3ed8057019152615c330
    test_id: TEST-kibi-predicate-vocabulary-migration-e2e
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
    contract_hash: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
    binding_hash: 6013bfa549036919f039f4fc3cf3c69a1424a14634327294e50de8ee229be1a0
    fingerprint: 5803e6d1ae28c5a40520813633690571ab84665cb01c657e766074987e6d79e3
    fingerprint_components:
      contract: 31e49ef42b61b6402da67966972c916e661f9dfc732e7f26bbb4e8b56400dab4
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
      - symbol_id: SYM-test-packed-predicate-vocabulary-migration
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-10, approving the entity context recovered from history in the KB gold-standard review (context batch 2): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---


## Context
This proves conformance and migration through the packed CLI, as a user runs them. It also shows a rejected upsert reporting its writes as failed: before this PR, the error envelope reported them as completed.
