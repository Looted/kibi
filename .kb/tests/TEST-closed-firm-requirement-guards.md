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
    receipt_id: PR-d7042e2cca86518cac44710a
    test_id: TEST-closed-firm-requirement-guards
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ede2eafea086a2463c8e63d2a86400a3891540e6e3cf3f91bc86344bc717279
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-18T08:38:24.179Z'
    finished_at: '2026-11-18T08:38:25.021Z'
    artifact_digest: 50b6cbbb89884ee29f273d23ab72f2d3f3ae138ad0799f0c01c5cfa19c3c440d
    contract_hash: 587a3b588af621570aafe4c8d42669c35af5a8cec33133b45303f1c43d2bb49a
    binding_hash: d482cf0b55114f64d2485209ceb4f9968fe6db2b808559cca16e5eb25728a525
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
Checks the shared retired-status test: closed, open and in_progress requirements stay current, superseded, deprecated, retired, archived and removed ones do not, and a closed requirement that a current requirement supersedes guards nothing. The hooks' current firm summary, the snippet, the commit gate's current firm requirement test with the change's successors, and kibi review-firm-edit all agree (packages/agent-core/tests/snippets-contract.test.ts, knowledge-index-contract.test.ts, decision-guard.test.ts, packages/cli/tests/public-mutation/impact/firm-edit-gate.mutation.test.ts, firm-edit-staged.mutation.test.ts, operations/firm-edit-review.mutation.test.ts).
