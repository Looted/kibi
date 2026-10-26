---
title: kibi query from a subdirectory with the packed CLI
status: passing
tags:
  - cli
  - workspace
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-subdirectory-workspace
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-26T13:32:49.092Z'
id: TEST-cli-subdirectory-workspace
type: test
---
Runs the installed packed CLI on a sandbox repository with a synced requirement, then runs kibi query from apps/server with a relative --input file in that directory. The query lists the requirement from the root knowledge base, and no .kb directory appears in apps/server. The unit suite checks the directory and path rewriting rules, including kibi init, an explicit KIBI_WORKSPACE and a directory outside any workspace.