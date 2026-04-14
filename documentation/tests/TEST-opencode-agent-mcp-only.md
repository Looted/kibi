---
id: TEST-opencode-agent-mcp-only
title: OpenCode agent guidance avoids direct Kibi CLI instructions
type: test
status: pending
created_at: 2026-03-22T00:00:00Z
updated_at: 2026-03-22T00:00:00Z
source: documentation/tests/TEST-opencode-agent-mcp-only.md
priority: must
tags:
  - opencode
  - agent
  - mcp
  - policy
  - test
links:
  - type: validates
    target: SCEN-opencode-agent-mcp-only
---

## Test Coverage

### Unit Tests

- `packages/opencode/tests/prompt.test.ts`: base guidance names public MCP tools and excludes direct CLI command patterns.
- `packages/opencode/tests/prompt.test.ts`: bootstrap guidance includes `/init-kibi` and excludes direct init/doctor instructions.
- `packages/opencode/tests/prompt.test.ts`: `.kb/**` warning guidance redirects to public MCP tools only.

### Policy Tests

- `packages/opencode/tests/agent-surface-policy.test.ts`: scans agent-facing prompt and instruction files for forbidden `kibi <verb>` command patterns.

### Integration and Regression

- Existing scheduler tests still prove background maintenance remains non-blocking.
- Existing plugin tests still prove prompt injection, sentinel dedupe, and hook compatibility.
