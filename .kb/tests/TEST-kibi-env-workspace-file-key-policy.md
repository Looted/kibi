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
    receipt_id: PR-71a61f02016db9b27a2bf277
    test_id: TEST-kibi-env-workspace-file-key-policy
    scope: end_to_end
    outcome: passed
    code_snapshot: c8eb1d23283f58b865363262f3431160f7e6f378d63fca3f89c3dca61a4cf659
    environment_hash: 8c28bfe97999f50f6b499d06d26c16ce63bd84a450e406e91985a733468b47c7
    started_at: '2026-11-20T07:56:41.136Z'
    finished_at: '2026-11-20T08:25:06.631Z'
    artifact_digest: 9889eda5b2fb23ed4a9cbb12aec4df1839d7f559d0597c27764d91f9509a8c97
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
