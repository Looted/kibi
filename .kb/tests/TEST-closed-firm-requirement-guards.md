---
title: A closed firm requirement guards its code in hooks and the commit gate
status: passing
priority: must
verification_scope: end_to_end
tags:
  - firmness
  - check-staged
  - hooks
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-closed-firm-requirement-guards
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-17T19:21:25.930Z'
id: TEST-closed-firm-requirement-guards
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-f534e5ce64262146682d241f
    test_id: TEST-closed-firm-requirement-guards
    scope: end_to_end
    outcome: passed
    code_snapshot: db8cfa1e2f309f0b25b2601f21d38211d4f63e761a778ad2caba846c1df8826c
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T19:23:43.963Z'
    finished_at: '2026-11-17T19:23:44.065Z'
    artifact_digest: 5245f462bee4ebce7ef9404ffb5d34ec8859ef2c16d4b465df73b85e5f816b75
    contract_hash: 587a3b588af621570aafe4c8d42669c35af5a8cec33133b45303f1c43d2bb49a
    binding_hash: 4ad833f43ae0c66afe3cf8bb09a94c55fef3b205cbc8b9dbf55b1d6b73dee6cf
    fingerprint: d50b9dbdf26407407523f11e359190a9a7f90c0ba18cd84b4af831ecc35cd565
    fingerprint_components:
      contract: 587a3b588af621570aafe4c8d42669c35af5a8cec33133b45303f1c43d2bb49a
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
      - symbol_id: SYM-test-closed-firm-requirement-guards
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Checks the shared retired-status test: closed, open and in_progress requirements stay current, superseded, deprecated, retired, archived and removed ones do not, and the commit gate's current firm requirement test agrees (packages/agent-core/tests/snippets-contract.test.ts, packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts).