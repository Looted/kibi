---
title: KB merge workflow builds the driver from develop and proof-checks merges
status: passing
priority: should
tags:
  - ci
  - merge
  - proof
verification_scope: end_to_end
verification_perspective: internal
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-ci-kb-merge-resolution
      target: default
  success_policy: all_required_first_attempt
id: TEST-ci-kb-merge-resolution
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-2f6bed05e5af36e1ac3bef14
    test_id: TEST-ci-kb-merge-resolution
    scope: end_to_end
    outcome: passed
    code_snapshot: 95c2368e16c896858e17640973f954ec0c9b541683115c823324e0640e68bdfe
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-16T18:23:07.785Z'
    finished_at: '2026-11-16T18:23:09.136Z'
    artifact_digest: 8cc0347eab01943d32cc06edd3eaceb68edd0329618cc6aabd064c2934240c1f
    contract_hash: 6addbec708ffb861003356ad86179609bf99ef386d16bdc17920fd4a15539d9d
    binding_hash: dac0583f57c9e964c0ce4b4e597a1dead7242f19905925fb63531a8f79d98fe2
    fingerprint: e04550c4ea47e4a3e0bc640a0575996e466e5eb6f3c9bd39d7d7de23e7b7144f
    fingerprint_components:
      contract: 6addbec708ffb861003356ad86179609bf99ef386d16bdc17920fd4a15539d9d
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
      - symbol_id: SYM-test-ci-kb-merge-resolution
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 6): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
---

Reads .github/workflows/kb-merge.yml and runs the Kibi KB merge action the way its resolve job configures it (scripts/tests/kb-merge-resolution.test.ts). It checks that Kibi is built from develop and handed to the action, that the PR branches are never checked out or installed on their own, that the proof gate is the action's check and nothing else pushes, that a push to develop checks every pull request and a push to another branch only its own, and that a merge failing Kibi's real scripts/proof-gate.sh is not pushed while the same merge with a passing gate is.

## Context
The merge workflow failed on PR 320 because it built the driver from a stale PR branch. When both sides add a requirement, Git also keeps one baseline count bump for two new entries. The workflow now builds from develop and checks the baseline before pushing. Source: PR 323.
