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
    receipt_id: PR-b9d1ecf013c1b1f37d0784c1
    test_id: TEST-kibi-scoped-check-output
    scope: end_to_end
    outcome: passed
    code_snapshot: faf50ea2a53ba356bb82b4527c1e57ace6fc0e404a4d4d992a39b570ea96441c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-15T18:45:30.751Z'
    finished_at: '2026-11-15T18:45:31.120Z'
    artifact_digest: 424d581b5c0b36e982d06bb88c43fe51630bfe5eae26d0f5b1078a546ac857d8
    contract_hash: 4105393760b29a145766c945a816117a18f7861680851dfdad11f8ab16ef1c73
    binding_hash: fa6e854b6a243d90c8d736d6ec741c8775240d4755a3217cd325411f13a9f5cf
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