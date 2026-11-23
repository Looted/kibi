---
id: TEST-015
title: Packed CLI sync preserves plain Markdown links as relates_to relationships
status: passing
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-issue-93-regression
      target: default
  success_policy: all_required_first_attempt
created_at: 2026-03-20T16:20:00Z
updated_at: 2026-03-20T16:20:00Z
source: documentation/tests/e2e/packed/issue-93-regression.test.ts
priority: must
tags:
  - cli
  - e2e
  - sync
  - extractors
  - relationships
links:
  - type: relates_to
    target: SCEN-012
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-e7030cab1152ce463d01a72c
    test_id: TEST-015
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:37.912Z'
    finished_at: '2026-11-20T08:21:18.271Z'
    artifact_digest: a21c8e10c136bbb6ea0a33dab6b5b26a2fed4728ae082d25627e9361ceb2003c
    contract_hash: cfff3c8849f9019fcab54be8974b8d141c534f82931c80f65f466406431cf9f9
    binding_hash: 135577e5bc405abf71a660c1e416d351553bcf74e98ad19ecc5df152d8478b0c
    fingerprint: b0e0cf2df6e77705f5a7213d6d966234262ae88b1922cc9c2cde8539a3f99dc5
    fingerprint_components:
      contract: cfff3c8849f9019fcab54be8974b8d141c534f82931c80f65f466406431cf9f9
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
      - symbol_id: SYM-e2e-issue-93-regression
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

## Test Cases

1. Pack and install `kibi-cli` in an isolated consumer sandbox.
2. Create a requirement Markdown file that uses a plain string `links` entry.
3. Create the linked scenario Markdown file in the same repo.
4. Run `kibi sync` and assert exit code 0.
5. Run `kibi query req --id <id> --format json`.
6. Run `kibi query --relationships <id> --format json`.
7. Assert both commands expose the linked scenario relationship.

## Expected Result

- Packed consumers get the same string-link behavior as the source repo.
- Plain string Markdown links survive sync as generic `relates_to` edges.
- `kibi query --relationships` returns the synced outgoing link set.
- Typed links in the same file still preserve their explicit relationship type.
