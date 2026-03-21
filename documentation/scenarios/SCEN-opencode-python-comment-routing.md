---
id: SCEN-opencode-python-comment-routing
title: Python docstrings and comment blocks trigger Kibi routing guidance
type: scenario
status: active
created_at: 2026-03-21T13:00:00Z
updated_at: 2026-03-21T13:00:00Z
source: documentation/scenarios/SCEN-opencode-python-comment-routing.md
priority: should
tags:
  - opencode
  - python
  - guidance
  - comment-detection
links:
  - REQ-opencode-comment-routing
---

## Scenario

An AI agent is working on Python code in an OpenCode session with the Kibi plugin active.

### Steps

1. Agent edits a Python file `src/models.py` and adds a module-level docstring describing domain invariants:
   ```python
   """
   User accounts must have unique email addresses.
   Each user can have at most 5 active sessions.
   Sessions expire after 30 minutes of inactivity.
   """
   ```

2. Plugin detects the `.py` file edit and extracts the docstring.

3. Plugin analyzes the docstring content and classifies it as FACT-type knowledge (invariants, limits).

4. Plugin stores a recent suggestion with type `fact`, confidence `high`, and reasoning about domain invariants.

5. Plugin injects specific guidance into the next system prompt:
   "This looks like a domain invariant; route to a FACT via Kibi instead of inline comments."

6. Agent edits another Python file `src/database.py` and adds a `#` comment block:
   ```python
   # We chose PostgreSQL over MongoDB because we need ACID transactions
   # and strong consistency. The tradeoff is higher operational complexity
   # but ensures data integrity for financial records.
   ```

7. Plugin detects the comment block, classifies it as ADR-type knowledge (decision/tradeoff).

8. Plugin injects guidance: "This looks like decision rationale; route to an ADR."

9. Agent adds a short inline comment: `# increment counter`.

10. Plugin ignores short comments (below `minLines` threshold).

11. Agent saves the same file again without changes.

12. Plugin recognizes duplicate content via fingerprint and does not re-trigger guidance.

### Expected Outcomes

- Long durable-knowledge comments in Python trigger specific Kibi artifact routing guidance.
- Short/ordinary comments are ignored.
- Repeated identical comments are deduplicated.
- Sync and validation behavior remain unchanged.
- Non-docstring triple-quoted strings are not analyzed.
