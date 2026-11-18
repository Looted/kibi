---
title: Workspace env files cannot set keys that change what Kibi runs or loads
status: pending
priority: must
verification_scope: end_to_end
verification_perspective: internal
tags:
  - unit
  - integration
  - security
  - env
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-test-kibi-env-workspace-file-key-policy
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-11-16T20:33:17.015Z'
id: TEST-kibi-env-workspace-file-key-policy
type: test
proof_receipts:
  - version: kibi.proof-receipt.v2
    receipt_id: PR-fce8bbe1f21323522f060a40
    test_id: TEST-kibi-env-workspace-file-key-policy
    scope: end_to_end
    outcome: passed
    code_snapshot: 41b874d07340b68ce52925d0db2e1efd0d144d4a30d39495f7ae549d8fd48930
    environment_hash: 0fe4faff3abd9383846f773ccd03a2e551c0e1792023b3084ed58b8687bccfaa
    started_at: '2026-11-18T08:21:36.181Z'
    finished_at: '2026-11-18T08:21:38.181Z'
    artifact_digest: 89965f08e02219a8d89e384c1063cd3d42b4e3361caf86b758159c4a1a9d1b04
    contract_hash: 9ec80bc57b9413a300aea5d4cd7236f639cb312b29f4f1a2750f444c7e0c9201
    binding_hash: fd1b8831aa79845ab21d88b5b82a34aa5e4483abeff33fa981980ec0720c66c9
    fingerprint: 223132e0ee200c37a0eabf36f4ec80bc6d9f15a72bb05b430f035eb9de200f5d
    fingerprint_components:
      contract: 9ec80bc57b9413a300aea5d4cd7236f639cb312b29f4f1a2750f444c7e0c9201
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
      - symbol_id: SYM-test-kibi-env-workspace-file-key-policy
        target: default
        outcome: passed
        binding: aggregate_run
        attempts:
          status: unavailable
    kind: e2e
    evidence_level: tested
---
Runs `packages/cli/tests/env/workspace-env-policy.test.ts` and `packages/mcp/tests/env-workspace-policy.test.ts` (steps in `proof/steps/TEST-kibi-env-workspace-file-key-policy.json`). They check the policy predicate over provider keys, denied `KIBI_*` keys and process variables in any case; that among the `KIBI_*` names in the production sources only the `KIBI_JEV_*` settings pass; that the bootstrap ignores and reports denied keys from `.env.kibi` and `.env` while the user file and the process stay trusted; that the stderr notice names keys once and never values; and, end to end, that `kibi query req` in a workspace whose `.env` and `.env.kibi` set `KIBI_NODE_PATH=./evil.sh` succeeds without running `evil.sh`. The MCP suite checks `loadDefaultEnvFile` and the deprecated `loadEnvFile` apply the same policy.
