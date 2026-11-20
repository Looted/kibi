---
title: Narrowed playwright run evidence tests
status: passing
priority: should
tags:
  - proof
  - cli
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cli-prove-narrowed-run-evidence
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-20T16:10:45.446Z'
id: TEST-cli-prove-narrowed-run-evidence
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-b45edb1def89e3f75c2f1661
    test_id: TEST-cli-prove-narrowed-run-evidence
    scope: integration
    outcome: passed
    code_snapshot: 87f64bce5423a5b17da2e5806cb87f8c5b7ac34518b58aa5f344d9f018960aef
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T16:17:30.553Z'
    finished_at: '2026-11-20T16:17:30.778Z'
    artifact_digest: a042752e9c15e64452870ad1a3a13bb5aa6a7ec8c6421fca7cfe26c157d57841
    contract_hash: d107721a7717265c6fd81951752a6610dd678137b6ba252d6edacb41c6dff541
    binding_hash: c35a0086e0fe6a3c16e200de060dc0adf11ba5ff153305b9994e8145ddf9dd67
    fingerprint: ba30d25186cab8db1ac3724f1d96a913dba6cb0a2c38a3348e2966ae09a4174e
    fingerprint_components:
      contract: d107721a7717265c6fd81951752a6610dd678137b6ba252d6edacb41c6dff541
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
      - symbol_id: SYM-test-cli-prove-narrowed-run-evidence
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The proof ingest operation tests (packages/cli/tests/operations-mutation/proof/ingest-proof.test.ts) ingest artifacts against a workspace whose integrations include a playwright integration `npx playwright test`. A run narrowed to the test's own spec, and a run narrowed to two tests' specs ingested together, each produce passing receipts that record the narrowed command. A run narrowed to another test's spec, or to a spec no ingested test names, is refused. The commandArgvAccepted cases cover the configured command (accepted without reading bindings), a command producer, a shorter or different prefix, a test with no spec files, and a test with a spec the run skipped.

A false pass would be a fixture whose narrowed command equals the configured one, since then the narrowed path is never taken.