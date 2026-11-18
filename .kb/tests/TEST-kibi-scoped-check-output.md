---
title: kb_check output budget tests, scoped and unscoped
status: passing
priority: must
tags:
  - check
  - impact
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-15T18:42:05.866Z'
id: TEST-kibi-scoped-check-output
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-scoped-check-output
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-94594108f07cb14c688f4236
    test_id: TEST-kibi-scoped-check-output
    scope: end_to_end
    outcome: passed
    code_snapshot: df84fc91d0f807889519f20a576fcd787807fc96a14d6cb59f83a53eb62a9ce7
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-17T07:50:58.451Z'
    finished_at: '2026-11-17T07:50:59.003Z'
    artifact_digest: 2b5ae4fe542337b83e92177544ff86ea752f344fcfad5bf00f3245722e69b73b
    contract_hash: 4105393760b29a145766c945a816117a18f7861680851dfdad11f8ab16ef1c73
    binding_hash: 7882e0e8a953117ab821400ebc47a5ac4a7629ad3da22474596fc31d8ca72877
    fingerprint: d097d6fcce9fd32db47228efe4f8d414f3ae61ca8e01b8485449ec72703e2578
    fingerprint_components:
      contract: 4105393760b29a145766c945a816117a18f7861680851dfdad11f8ab16ef1c73
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
      - symbol_id: SYM-test-kibi-scoped-check-output
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the scoping, counting, migration-plan summary and budget steps of a kb_check scoped to sourceFiles (packages/cli/tests/public/operations/check-scope.test.ts), including the KB documents a Git work tree reports changed, the same budget on a check without sourceFiles with its own hint and a summarized migration plan unless includeMigrationPlan is set, and the check executor with thirteen blocking violations of which three concern the change, a rule selection and the full-listing command left uncut, and an unscoped result of 412 findings cut to budget with the asked-for symbol debt list on top (packages/cli/tests/public-mutation/operations/check-executor.mutation.test.ts).

A false pass would be a test that drops omitted violations without counting them, so a scoped check reads as passing while the KB still blocks, or one that cuts the result and loses a blocking rule.