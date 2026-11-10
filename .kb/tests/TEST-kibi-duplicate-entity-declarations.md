---
title: CLI kb_check blocks an entity id declared twice and kb_upsert merges link-only copies
status: passing
priority: must
tags:
  - check
  - integrity
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-05T11:48:04.862Z'
id: TEST-kibi-duplicate-entity-declarations
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kibi-duplicate-entity-declarations-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-299dc48d4247df74af73d52d
    test_id: TEST-kibi-duplicate-entity-declarations
    scope: end_to_end
    outcome: passed
    code_snapshot: 1d5bc71e944be8ddccfdb37cf3622375ef36850933b4f87d153a603152368662
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T12:07:51.931Z'
    finished_at: '2026-11-05T12:08:03.982Z'
    artifact_digest: 705155fe39c7013e28b816c8e958c74f66873dd01ee7b6bf52e220366c58b89b
    contract_hash: f3782f1c493f92cecb8be9dca1d37b671b451f8cf215f2df92d06343ad070d5f
    binding_hash: 9d058a90dc293238c7a42d971748d1e22f42b9c5550f78c4e5fda7f097ad7484
    fingerprint: ced6323c748ce99a32dc3e3f9e80022e0bb4508cf53ed5d0812452a571fc799f
    fingerprint_components:
      contract: f3782f1c493f92cecb8be9dca1d37b671b451f8cf215f2df92d06343ad070d5f
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
      - symbol_id: SYM-kibi-duplicate-entity-declarations-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs the CLI on a temporary Git workspace whose `.kb/symbols.yaml` declares one symbol id twice: `kibi check` exits non-zero with one blocking `source-relationship-parity` finding that names both titles, the file and the fix, and passes once one record remains. When the copies differ only in their links, a `kb_upsert` of the symbol leaves one record with both links and the finding is gone. A unit test pins the exact finding for duplicates across entity files and within the manifest.