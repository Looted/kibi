---
title: The packed kibi-opencode package loads on the OpenCode v1 and v2 plugin APIs and keeps registering hooks after one fails
status: passing
priority: must
tags:
  - opencode
  - plugin-api
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
links:
  - type: validates
    target: SCEN-opencode-v2-plugin-load
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-opencode-plugin
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  ref: 'Maintainer decision, 2026-11-04, on review-level findings: "Everything, in this PR".'
  approved_by: maintainer
  recorded_at: '2026-11-04T15:30:00.000Z'
id: TEST-e2e-opencode-v2-plugin-load
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-7b5a37d506f8b8d596171dc6
    test_id: TEST-e2e-opencode-v2-plugin-load
    scope: end_to_end
    outcome: passed
    code_snapshot: 7ed5ab55b3c5d386434b8837b93f63ec6797d0dd5bf2b248a10008d63b41039a
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-04T13:29:52.599Z'
    finished_at: '2026-11-04T13:31:10.378Z'
    artifact_digest: d3d3dca41588c995583cd24de401e7eca9d772c65395e23e27fed39d2a572220
    contract_hash: fda6ee3d82151dd1cee4719e6d67b7b1ebb8eb7cc3d8f7d84715fb2eb44d56a6
    binding_hash: 4406b402bd1c5f9189510c46b6e007bc6f0421d91bbd3d97d7f63e97c1258a7d
    fingerprint: 6cb6521f423fa548cc931afe9997c54414b79165051b87c6a8f369f58c41fd2e
    fingerprint_components:
      contract: fda6ee3d82151dd1cee4719e6d67b7b1ebb8eb7cc3d8f7d84715fb2eb44d56a6
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
      - symbol_id: SYM-e2e-opencode-plugin
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Installs the packed kibi-opencode tarball into an isolated directory and imports its default export. The definition carries a non-empty id, a `server` function that OpenCode v1 reads and a `setup` function that OpenCode v2 calls. It then runs the packaged v2 setup against a host whose session hook throws, and checks that the tool and command hooks still register and that the failed registration is reported.
