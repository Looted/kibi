---
title: 'KB dependencies from git: lock, fetch, status, scoped reads over CLI and MCP, and every refusal'
status: passing
verification_scope: end_to_end
verification_perspective: consumer
origin:
  kind: agent
  recorded_at: '2026-11-04T10:43:11.892Z'
id: TEST-kb-dependencies-git
type: test
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-kb-dependencies-git-verifier
      target: default
  success_policy: all_required_first_attempt
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-894318740c731243c6ab4c35
    test_id: TEST-kb-dependencies-git
    scope: end_to_end
    outcome: passed
    code_snapshot: 14bbd89bbfd9c19f6bfeea4eb0c1b036aff0de450428065c2bd73bd0c912f8c8
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-05T06:57:18.175Z'
    finished_at: '2026-11-05T06:57:26.825Z'
    artifact_digest: 4f365cbe131db97e2741222e541a454fa95def2c5f5b6d1da51b946949c4458f
    contract_hash: e27265dbf6479b6e957d4503fef9bcbecc471997ec083a6f3f1dfc91a01d214a
    binding_hash: fd6be7fe117949162bf2d3c135afbbd74162c8f798420b06c6d514f31d635e21
    fingerprint: 90afaabf4e9be5cb440e502c673db46b87b4966e9f6c82dc69fe0f0d41af77bd
    fingerprint_components:
      contract: e27265dbf6479b6e957d4503fef9bcbecc471997ec083a6f3f1dfc91a01d214a
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
      - symbol_id: SYM-kb-dependencies-git-verifier
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Creates real Git repositories holding Kibi KBs, declares them as dependencies of a project and runs `kibi deps lock`, `kibi deps fetch` and `kibi deps status`; checks tag, branch and commit pins, the detached cached checkout, lock updates, schema 6 and the refusal of older or newer schemas, the scoped `--kb` CLI reads and JSON routes, and that the MCP server answers a `kb` read from a separate routed child for the dependency (packages/cli/tests/dependencies/kb-dependencies.test.ts, packages/cli/tests/dependencies/kb-dependency-commands.test.ts, packages/mcp/tests/server/workspace-router-dependency.test.ts, packages/mcp/tests/server/add-tool-paths.test.ts).