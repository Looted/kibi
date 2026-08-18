---
id: REQ-opencode-comment-routing
title: OpenCode plugin routes durable code comments to Kibi artifacts
status: open
created_at: 2026-03-21T13:00:00Z
updated_at: 2026-08-18T00:00:00Z
priority: should
source: documentation/requirements/REQ-opencode-comment-routing.md
tags:
  - opencode
  - guidance
  - comment-detection
  - python
  - javascript
  - typescript
links:
  - type: specified_by
    target: SCEN-opencode-python-comment-routing
  - type: verified_by
    target: TEST-opencode-python-comment-routing
  - type: relates_to
    target: REQ-opencode-kibi-plugin-v1
---

## Overview

The OpenCode plugin should detect long explanatory comments in code files and provide specific guidance for routing durable knowledge to appropriate Kibi entity types (FACT, ADR, REQ, SCEN, TEST) instead of inline code comments.

## Requirements

1. **Multi-language comment extraction**: Support JavaScript/TypeScript (`//`, `/* */`, `/** */`) and Python (`#` blocks, true docstrings).

2. **Durable knowledge detection**: Extract comment blocks that cross `guidance.commentDetection.minLines` threshold and contain prose suitable for Kibi artifacts.

3. **Smart filtering for Python**: Analyze contiguous `#` comment blocks and true docstrings (module, class, function level). Ignore arbitrary triple-quoted strings not in docstring position.

4. **Classification**: Use `knowledge-classifier.ts` to categorize extracted comments as FACT (invariants/defaults/limits), ADR (decisions/tradeoffs), REQ (behavior/capabilities), SCEN (flows), or TEST (verification).

5. **Specific routing guidance**: Inject targeted prompts based on classification:
   - FACT: "This looks like a domain invariant; route to a FACT via Kibi."
   - ADR: "This looks like decision rationale; route to an ADR."
   - REQ: "This looks like behavior intent; route to a REQ."

6. **Dedupe and noise control**: Track seen comments by fingerprint to avoid repeated guidance for the same content. Only medium/high-confidence suggestions trigger prompts.

7. **Non-blocking behavior**: Analysis runs after `file.edited` events without blocking sync or other plugin operations.

8. **Configurability**: Respect `guidance.commentDetection.enabled` and `guidance.commentDetection.minLines` settings.

## Success Criteria

- Saving a `.py` file with a long docstring triggers specific FACT/ADR/REQ routing guidance.
- Saving a `.ts` file with a long `//` comment block triggers appropriate guidance.
- Short/ordinary comments do not trigger guidance.
- Repeated saves of identical comments do not spam warnings.
- Sync and targeted validation behavior remain unchanged.
