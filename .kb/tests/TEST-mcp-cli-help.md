---
id: TEST-mcp-cli-help
title: kibi-mcp help exits cleanly in workspace and packed installs
status: active
created_at: 2026-04-17T12:00:00.000Z
updated_at: 2026-04-17T12:00:00.000Z
source: documentation/tests/TEST-mcp-cli-help.md
tags:
  - mcp
  - cli
  - regression
links:
  - type: validates
    target: SCEN-mcp-cli-help
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-test-mcp-cli-help
      target: default
  success_policy: all_required_first_attempt
type: test
---

The test verifies that the `kibi-mcp` binary correctly handles help requests without entering an interactive loop.

**Coverage:**
- Verified in `packages/mcp/tests/cli-help.test.ts` (workspace)
- Verified in `documentation/tests/e2e/packed/mcp-cli-help.test.ts` (packed tarball)
- Verifies that help flags (`--help`, `-h`) result in exit code 0
- Verifies that usage information is output to the console
- Verifies that the process terminates automatically.
