---
title: Scoped kb_check output tests
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
    receipt_id: PR-804b71bad840f4a9ea73a555
    test_id: TEST-kibi-scoped-check-output
    scope: end_to_end
    outcome: passed
    code_snapshot: 380f4ade759859ff4f68ff2518ca4d8e29de3ec3f2906ec2640234970631436c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T11:08:24.191Z'
    finished_at: '2026-11-16T11:08:24.737Z'
    artifact_digest: 31a942c8345738cae250394db20cec9488684eaaf9be479ca804ff65eee8a13d
    contract_hash: 4105393760b29a145766c945a816117a18f7861680851dfdad11f8ab16ef1c73
    binding_hash: b7d39537553f4eac5f179a17bf5e4414186a122a24b8ac6be1605b2e1938664e
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
Runs the scoping, counting, migration-plan summary and budget steps of a kb_check scoped to sourceFiles (packages/cli/tests/public/operations/check-scope.test.ts), including the KB documents a Git work tree reports changed, and the check executor with thirteen blocking violations of which three concern the change (packages/cli/tests/public-mutation/operations/check-executor.mutation.test.ts).

A false pass would be a test that drops omitted violations without counting them, so a scoped check reads as passing while the KB still blocks, or one that cuts the result and loses a blocking rule.