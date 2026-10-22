---
title: Requirements signoff views through the packed CLI and host integrations
status: passing
tags:
  - cli
  - signoff
  - e2e
verification_scope: end_to_end
verification_perspective: consumer
proof_contract:
  version: kibi.proof-contract.v1
  integration: self-proof
  required_proofs:
    - symbol_id: SYM-e2e-packed-cli-signoff
      target: default
  success_policy: all_required_first_attempt
origin:
  kind: agent
  recorded_at: '2026-10-22T09:25:36.470Z'
id: TEST-kibi-signoff-views
type: test
---
Runs kibi signoff through the installed packed CLI on a sandbox repository: the default Markdown block, the JSON summary with proof state, and a questions file rendered to HTML, checking the files written under .kb/briefs/signoff. The same proof run executes the Claude Code display hook tests, which spawn the bundled hook as Claude Code does, and the OpenCode and VS Code signoff tests for the rendered card, toasts and the webview panel.