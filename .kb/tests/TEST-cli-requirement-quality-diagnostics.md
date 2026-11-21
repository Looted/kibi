---
id: TEST-cli-requirement-quality-diagnostics
title: CLI requirement quality diagnostic tests
status: passing
source: packages/cli/tests/traceability/impact-requirement-quality.test.ts
links:
  - type: validates
    target: SCEN-audit-quality-diagnostics-v1
verification_scope: unit
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-unit-test-cli-requirement-quality-diagnostics
      target: default
  success_policy: all_required_first_attempt
type: test
origin:
  kind: migration
  ref: 'kibi migrate v5->v6 Maintainer decision, 2026-11-11, approving the entity context recovered from history in the KB gold-standard review (context batch 7): "Ok"'
  recorded_at: '2026-10-04T01:17:15.284Z'
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-165b4d2c45ab7c9b801702a2
    test_id: TEST-cli-requirement-quality-diagnostics
    scope: unit
    outcome: passed
    code_snapshot: 98d97c8bd4627c2974c44d4832f5db6e6bfc7ad145d38b08d3cc4880d60fd5e0
    environment_hash: 114832ed09273138cf1b4fc0e28f03cc356725e7e240bccf0117e45557f6397a
    started_at: '2026-11-20T19:26:36.497Z'
    finished_at: '2026-11-20T20:25:50.166Z'
    artifact_digest: 380d9339357826178df6ba566f4b4b862eca8d3c650c57f098bfe1ba906d055d
    contract_hash: d54c1c2df053d89c8f5eeebebca4715be99fc45545fb4bf72e59bcc340f121e4
    binding_hash: 9c290a2f59831203adc4748e02ccdb2072be85d46e10e579572f357279f4e17b
    fingerprint: 81087035b7003189440355d78c878e203c11cf26c100b34631945834f8530535
    fingerprint_components:
      contract: d54c1c2df053d89c8f5eeebebca4715be99fc45545fb4bf72e59bcc340f121e4
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
      - symbol_id: SYM-unit-test-cli-requirement-quality-diagnostics
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---

Validates broad requirement, requirement-status, and strict-fact modeling review diagnostics.

## Context
This checks the requirement-side advisories (broad requirements, status and strict-fact modeling) without making them blocking.
