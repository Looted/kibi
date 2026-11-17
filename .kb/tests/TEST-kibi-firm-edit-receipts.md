---
title: Firm-edit receipt tests
status: passing
priority: must
tags:
  - firmness
  - cli
verification_scope: end_to_end
verification_perspective: internal
origin:
  kind: agent
  recorded_at: '2026-11-16T06:59:01.038Z'
id: TEST-kibi-firm-edit-receipts
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-firm-edit-receipts
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-a30ad15cbf189dd7501d8d9e
    test_id: TEST-kibi-firm-edit-receipts
    scope: end_to_end
    outcome: passed
    code_snapshot: 84a6fe37e5bb684e8e6f19943420ecc7e6817232bebc83407da028d1543f2d38
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-17T15:22:56.971Z'
    finished_at: '2026-11-17T15:23:24.387Z'
    artifact_digest: ce78500e0983ba24fd4d116cf2f79f93eeb2ebf4466db805713c774f47462672
    contract_hash: 38a432c1294f100d5eb4223ad32add98cc10c8e7d67fe6275694b5df801f0fa0
    binding_hash: 27167d5af140cfbd40d7022e36c7a9588bab88bce69f3efa3dc110345f34e4dc
    fingerprint: 31e7b4b4991cd7fceb0bbe7f2aa3e82dcfc5e645473f76c76636b623b8a16749
    fingerprint_components:
      contract: 38a432c1294f100d5eb4223ad32add98cc10c8e7d67fe6275694b5df801f0fa0
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
      - symbol_id: SYM-test-kibi-firm-edit-receipts
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
The agent-core tests write and parse receipts, read a requirement statement the same way for the hooks and the CLI, hash a symbol's line range, find unchanged code wherever it moved in the file, and check that a receipt stops matching once the statement or the code changes (packages/agent-core/tests/firm-edit-review.test.ts). Receipt files are named by a hash of the source file and symbol, and receipts written under the earlier names are still read and replaced. The operation tests run kibi review-firm-edit against a workspace: a keeps or changes verdict on a symbol that implements a current firm requirement (a declaration, a coarse manifest symbol with coordinates, or a symbol the change removed) is written under .kb/firm-edit-reviews/<requirement>/ with the statement and code hashes, staged:true reads the Git index, and a requirement that is not current and firm, a file outside the workspace or a symbol that implements nothing is refused (packages/cli/tests/public-mutation/operations/firm-edit-review.mutation.test.ts, packages/cli/tests/consumer/firm-edit-review.test.ts).

A false pass would be a test that checks only that a file was written, never that a changed statement or changed code makes the receipt stop matching.