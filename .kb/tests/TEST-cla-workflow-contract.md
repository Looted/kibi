---
title: 'CLA workflow contract: events, allowlist, signature branch and sign sentence'
status: passing
tags:
  - governance
  - ci
  - workflow
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-cla-workflow-contract
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-25T06:08:21.050Z'
id: TEST-cla-workflow-contract
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-58d504de3553d94a4886d86f
    test_id: TEST-cla-workflow-contract
    scope: end_to_end
    outcome: passed
    code_snapshot: 18f312a5d44732f631e81dd8a53ef4fdc18e600b12f2c4737861f2f239ce915b
    environment_hash: 706cc4b3a09461713e9b5f9322b745f0ff9efde3e1a78b85f7ca1a67475b6988
    started_at: '2026-11-25T06:12:21.156Z'
    finished_at: '2026-11-25T06:12:21.224Z'
    artifact_digest: cd7aa0f7bec35e77d5c6f7410350a5689f8fd7c23a4bfb43a5ba03779491fc4f
    contract_hash: a7a9294be8af4cb096139b5f8f0e7cdacdb6cf8e739a2bfffcbb2d1af956382f
    binding_hash: 8d9684d9c9387e4d2d4fa077d41e04dd0891de66b23b33e012275f883f2a96fd
    fingerprint: a9a16f0e24d00e560e76d5540055469dba250acacf7289839e7024f98e1b9977
    fingerprint_components:
      contract: a7a9294be8af4cb096139b5f8f0e7cdacdb6cf8e739a2bfffcbb2d1af956382f
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
      - symbol_id: SYM-test-cla-workflow-contract
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Automated verification lives in `scripts/tests/cla-workflow-contract.test.ts`. It parses `.github/workflows/cla.yml` and checks that the workflow runs on pull_request_target (opened, synchronize, closed) and issue_comment (created), handles only the sign sentence and recheck comments on pull requests, never checks out pull request code, pins the CLA action to a full commit SHA, allowlists only `Looted` and `*[bot]`, stores signatures in `signatures/cla.json` on the `cla-signatures` branch (creating it without parents when missing), links CLA.md on develop, and uses the same sign sentence as CONTRIBUTING.md and CLA.md.