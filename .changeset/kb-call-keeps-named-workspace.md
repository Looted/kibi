---
"kibi-agent-core": patch
"kibi-claude": patch
"kibi-codex": patch
"kibi-cursor": patch
"kibi-zcode": patch
---

The Claude Code, Codex, Cursor and ZCode pre-tool hooks no longer replace a `workspaceRoot` that the agent passes on a Kibi MCP call. Before, a call that named another git worktree was silently answered from the session's checkout, so a read returned the wrong branch and a write would have landed in the session's knowledge base. The hooks now add the session's workspace only to a call that carries none, which is what the kibi-usage skill tells agents to do for a worktree.

`stampKibiWorkspace` returns undefined when the tool input already carries a non-blank string `workspaceRoot`; a blank or non-string value is still replaced. The four host hook runners return their silent result for a Kibi MCP call that names its own workspace instead of an `updatedInput` rewrite, and their committed hook bundles are regenerated. REQ-agent-hosts-kb-call-workspace-stamp records the rule with a positive and a failure-side scenario, verified by the new TEST-agent-hosts-kb-call-workspace-stamp, which runs the stamping tests of the helper and of the four host runners.
