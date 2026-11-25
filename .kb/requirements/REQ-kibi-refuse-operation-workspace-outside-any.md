---
title: Kibi refuses a workspace outside Git with NOT_A_GIT_REPOSITORY and writes nothing there
status: open
firmness: default
origin:
  kind: agent
  recorded_at: '2026-11-25T07:02:53.549Z'
rationale: 'An agent asked to set Kibi up in a directory that is not a Git repository yet must be able to recover on its own. Before this rule, kibi init there exited 1 with no error category and a long diagnostic that led with KIBI_BRANCH; following that advice initialized the workspace for one run only, and every later kibi status failed again, as OPERATION_FAILED marked retryable or as an uncaught error. From 2026-11-15 to 2026-11-25, on 2.44.0 and 2.45.0, 5 of the 9 installations that ran kibi init had such an init fail, on Windows, macOS and Linux. The maintainer named init as one of the issues with Kibi adoption: "One of the issues with KIBI adoption seems to be the init problem." KIBI_BRANCH stays the explicit way to work without Git, and nothing in .kb/ stands in for it (ADR-012).'
semantic_text: Kibi must refuse an operation in a workspace outside any Git repository, when KIBI_BRANCH is not set, with the error code NOT_A_GIT_REPOSITORY and a message that tells the caller to run git init. The kibi init command must write nothing in such a workspace.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 00db93a38918d7affe5448c05c8684e80e57dfbad1e811fcdfe3a6a8b40308c3
semantic_inventory:
  - claim_key: CLAIM-1C8974D8B94AEB3F
    claim_text: Kibi must refuse an operation in a workspace outside any Git repository, when KIBI_BRANCH is not set, with the error code NOT_A_GIT_REPOSITORY and a message that tells the caller to run git init
    role: normative
    status: modeled
    span:
      start: 0
      end: 194
    subjects:
      - kibi.branch_attachment.outside_git
  - claim_key: CLAIM-42EC3C5DDDCEF361
    claim_text: The kibi init command must write nothing in such a workspace
    role: normative
    status: modeled
    span:
      start: 196
      end: 256
    subjects:
      - kibi.branch_attachment.outside_git
logic_claims:
  - CLAIM-1C8974D8B94AEB3F
  - CLAIM-42EC3C5DDDCEF361
id: REQ-kibi-refuse-operation-workspace-outside-any
type: req
priority: must
required_evidence: tested
tags:
  - cli
  - mcp
  - init
  - branching
  - errors
---
Kibi must refuse an operation in a workspace outside any Git repository, when KIBI_BRANCH is not set, with the error code NOT_A_GIT_REPOSITORY and a message that tells the caller to run git init. The kibi init command must write nothing in such a workspace.

## Context

Kibi keeps its knowledge per Git branch (ADR-012), so a directory outside any Git repository has no branch to attach to. Agents set Kibi up in such directories before running git init: kibi init exited 1 with no error category and a long diagnostic that led with KIBI_BRANCH, kibi init with KIBI_BRANCH then worked for that run only, and every later kibi status failed again, as OPERATION_FAILED marked retryable on the JSON route or as an uncaught error in text mode. Product telemetry from 2026-11-15 to 2026-11-25 (2.44.0 and 2.45.0) showed 5 of the 9 installations that ran kibi init hitting a failed init, on Windows, macOS and Linux; the ones that ran kibi doctor next were told there was no Git repository.

Every route now refuses the same way: kibi init, kibi status (text and JSON), every CLI JSON route that opens a runtime and the MCP tools give NOT_A_GIT_REPOSITORY (GIT_NOT_AVAILABLE when Git is missing), not retryable, with one instruction: run git init, then retry. KIBI_BRANCH is named as the standalone alternative together with its cost: nothing in .kb/ remembers it, so every later command, Git hook and MCP server needs the same value, and kibi init says so when it runs that way.

## Source

The maintainer named init as one of the issues with Kibi adoption: "One of the issues with KIBI adoption seems to be the init problem."
