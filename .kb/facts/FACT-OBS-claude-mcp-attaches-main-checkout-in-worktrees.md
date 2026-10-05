---
title: Claude desktop worktree sessions attach the Kibi MCP server to the main checkout
status: closed
fact_kind: observation
tags:
  - claude
  - mcp
  - worktree
  - search
  - review:bug
id: FACT-OBS-claude-mcp-attaches-main-checkout-in-worktrees
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---
Observed 2026-10-01 in a Claude Code desktop session running in the git worktree .claude/worktrees/kibi-usage-telemetry-e124d4.

The kibi-claude MCP launcher started with cwd, CLAUDE_PROJECT_DIR, and KIBI_WORKSPACE all set to the main checkout (/home/looted/projects/kibi, on a different branch), not the session worktree. Every MCP kb_query and kb_search then answered from the main checkout branch store:

- kb_query({id:"REQ-claude-code-kibi-plugin-v1"}) returned 0 entities although the requirement is tracked on the worktree branch.
- kb_query({sourceFile:"packages/claude/src/hook-runner.ts"}) returned 0 entities; the worktree CLI returned the linked symbols.
- kb_status and first lookups timed out at 90s while that store was busy with another host prove run.

The hooks resolve the workspace from the hook input cwd and were correct, so hook snippets and MCP answers disagreed within one session. The results look like an empty or stale KB, which is a plausible contributor to agents not trusting search and to the 60% zero-result rate of historical sourceFile lookups.

Possible fix directions: resolve the workspace lazily from MCP roots or from the first tool call, or report the attached workspace and branch in every result envelope so the mismatch is visible.