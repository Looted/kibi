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
    receipt_id: PR-c171fb740c7ddcdc3351f1eb
    test_id: TEST-cli-prove-narrowed-run-evidence
    scope: end_to_end
    outcome: passed
    code_snapshot: 0023b69c8d093f9a5478ff9bf8a51a9b243f0a5261615cf251f83dc6ba9333c8
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-20T16:29:11.336Z'
    finished_at: '2026-11-20T16:29:11.611Z'
    artifact_digest: 4fe7a0df3f09223513f035270b9055f3ae9ae15455c612fb1bd0882390d64614
    contract_hash: d107721a7717265c6fd81951752a6610dd678137b6ba252d6edacb41c6dff541
    binding_hash: 858a9f3ff21f3d47d78b2a2957734029362b36f7969ece3389c8e3b9ac7de9eb
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