---
title: Retired requirement status checks, search, upsert guard and migration tests
status: passing
priority: must
tags:
  - kb
  - lifecycle
  - retired-status
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kb-requirement-retired-status
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-11T17:31:30.223Z'
id: TEST-kb-requirement-retired-status
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a1ee124f1221bb7cd2da47e7
    test_id: TEST-kb-requirement-retired-status
    scope: end_to_end
    outcome: passed
    code_snapshot: 294e115eab197dc60260fd04d6a4ef5772d12152929d4b4722f5688eebee9d4a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-12T16:18:59.042Z'
    finished_at: '2026-11-12T16:19:11.786Z'
    artifact_digest: efd3786fcbc7172ee9ea60c9c9511d3aadaafb6c7edb922920cd6e392a89d36b
    contract_hash: 92abb2863950a009e6c7d35b81d9714c60e72d5df8b590627a8871e3d9b749ee
    binding_hash: 6c84f97e86cc9e5109cda3dc07dff773cd6e70b75c14691864ca1031b0e12dba
    fingerprint: 3a728e3429be17751aa944e33a23a9a87fbbbba43cf68153480a74d3aa0b9a97
    fingerprint_components:
      contract: 92abb2863950a009e6c7d35b81d9714c60e72d5df8b590627a8871e3d9b749ee
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
      - symbol_id: SYM-test-kb-requirement-retired-status
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the real `kibi` CLI on temporary Git workspaces (packages/cli/tests/commands/retired-status.test.ts): `kibi sync` and `kibi check --rules retired-reason-missing,retired-owner-only,req-status-vocabulary` over retired, unexplained and closed requirements with owned and shared facts; `kibi search` for the retired behavior; a `kibi upsert` of a retired requirement without a reason; and `kibi migrate --format json` followed by `--apply-safe` with and without `--approved-action req-retired-status-<id>`, comparing the requirement file byte for byte.

A false pass would be a check that reports nothing because the rules never ran; the test therefore also expects the findings it should get (the unshared fact and the unexplained requirement), and the migration test expects the unapproved apply to leave the file untouched before the approved one changes exactly two lines.