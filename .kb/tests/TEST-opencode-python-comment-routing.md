---
id: TEST-opencode-python-comment-routing
title: OpenCode plugin verifies Python durable-comment routing
type: test
status: pending
created_at: 2026-03-21T13:00:00Z
updated_at: 2026-03-21T13:00:00Z
source: documentation/tests/TEST-opencode-python-comment-routing.md
priority: should
tags:
  - opencode
  - python
  - test
  - comment-detection
links:
  - type: validates
    target: SCEN-opencode-python-comment-routing
---

## Test Coverage

### Unit Tests

**comment-analysis.test.ts:**
- Extract JS/TS long `//` comment block -> classify as FACT
- Extract JS/TS `/* */` rationale block -> classify as ADR
- Extract Python `#` comment block -> classify as ADR
- Extract Python module docstring with invariants -> classify as FACT
- Extract Python function docstring -> classify appropriately
- Short comments ignored (below minLines)
- Non-docstring triple-quoted strings ignored
- Fingerprint stability for dedupe

**path-kind.test.ts:**
- `.py` files classified as `code` kind

**prompt.test.ts:**
- Recent `fact` suggestion triggers FACT-specific routing guidance
- Recent `adr` suggestion triggers ADR-specific routing guidance
- No suggestion keeps generic code guidance

**index.test.ts:**
- `.py` file edit stores recent suggestion
- Repeated identical saves do not duplicate warnings
- Sync scheduling unchanged by comment analysis

### E2E Tests

**opencode-comment-guidance.test.ts:**
- Pack and install `kibi-opencode` tarball
- Create temp repo with `.opencode/kibi.json`
- Add Python file with long docstring containing durable knowledge
- Invoke `event` hook with `file.edited`
- Invoke `experimental.chat.system.transform`
- Assert prompt contains specific routing guidance (FACT/ADR/REQ)
- Repeated edit does not duplicate guidance

### Non-Regression

- `nonblocking.test.ts`: Comment analysis does not block sync
- `opencode-install.test.ts`: Packed install still works
- `opencode-plugin.test.ts`: Loader safety maintained
