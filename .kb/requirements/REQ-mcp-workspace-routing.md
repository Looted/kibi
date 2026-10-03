---
title: Kibi MCP answers every call from the workspace the caller is working in
status: open
priority: must
tags:
  - mcp
  - worktree
  - routing
  - search
semantic_text: |-
  When a Kibi MCP tool call carries a workspaceRoot argument, the Kibi MCP server must answer the call from the Kibi workspace that owns that directory.

  When a Kibi MCP tool call without a workspaceRoot argument arrives from a client that declares MCP roots, the Kibi MCP server must answer the call from the Kibi workspace named by the client roots.

  The Kibi MCP server must serve another workspace only when it is a worktree of the attached repository, lies under the client roots, or is listed in the routable roots allowlist.

  When the Kibi MCP server cannot answer a call from the requested workspace, it must answer from the attached workspace and add a workspace_mismatch diagnostic to the result.

  When a Kibi workspace environment variable is set, the Kibi MCP server must not route calls.

  A routed Kibi MCP child server must not route calls further.

  The Kibi MCP server must strip the workspaceRoot argument before dispatching a tool call.
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 015be168c10ecc71aad7ed5c03d1ad7aea7c21e4c08955204ecaa36b4ae770bc
semantic_inventory:
  - claim_key: CLAIM-C9164B1BE4E1435D
    claim_text: When a Kibi MCP tool call carries a workspaceRoot argument, the Kibi MCP server must answer the call from the Kibi workspace that owns that directory
    role: condition
    status: modeled
    span:
      start: 0
      end: 149
    payload_hash: a9eaf69f77825db01e26a082e497707c5b0f4601a60d91365e8101ec5cced278
  - claim_key: CLAIM-5B147F886790864A
    claim_text: When a Kibi MCP tool call without a workspaceRoot argument arrives from a client that declares MCP roots, the Kibi MCP server must answer the call from the Kibi workspace named by the client roots
    role: condition
    status: modeled
    span:
      start: 152
      end: 348
    payload_hash: a9eaf69f77825db01e26a082e497707c5b0f4601a60d91365e8101ec5cced278
  - claim_key: CLAIM-827D3DB6400B3DB5
    claim_text: The Kibi MCP server must serve another workspace only when it is a worktree of the attached repository, lies under the client roots, or is listed in the routable roots allowlist
    role: normative
    status: modeled
    span:
      start: 351
      end: 528
    payload_hash: a9eaf69f77825db01e26a082e497707c5b0f4601a60d91365e8101ec5cced278
  - claim_key: CLAIM-0820764EE8F52C4D
    claim_text: When the Kibi MCP server cannot answer a call from the requested workspace, it must answer from the attached workspace and add a workspace_mismatch diagnostic to the result
    role: condition
    status: modeled
    span:
      start: 531
      end: 703
    payload_hash: a9eaf69f77825db01e26a082e497707c5b0f4601a60d91365e8101ec5cced278
  - claim_key: CLAIM-B1DC92D16151D65A
    claim_text: When a Kibi workspace environment variable is set, the Kibi MCP server must not route calls
    role: condition
    status: modeled
    span:
      start: 706
      end: 797
    payload_hash: a9eaf69f77825db01e26a082e497707c5b0f4601a60d91365e8101ec5cced278
  - claim_key: CLAIM-2062509417525DE5
    claim_text: A routed Kibi MCP child server must not route calls further
    role: normative
    status: modeled
    span:
      start: 800
      end: 859
    payload_hash: a9eaf69f77825db01e26a082e497707c5b0f4601a60d91365e8101ec5cced278
  - claim_key: CLAIM-55A4848586289BB2
    claim_text: The Kibi MCP server must strip the workspaceRoot argument before dispatching a tool call
    role: normative
    status: modeled
    span:
      start: 862
      end: 950
    payload_hash: a9eaf69f77825db01e26a082e497707c5b0f4601a60d91365e8101ec5cced278
logic_claims:
  - CLAIM-C9164B1BE4E1435D
  - CLAIM-5B147F886790864A
  - CLAIM-827D3DB6400B3DB5
  - CLAIM-0820764EE8F52C4D
  - CLAIM-B1DC92D16151D65A
  - CLAIM-2062509417525DE5
  - CLAIM-55A4848586289BB2
id: REQ-mcp-workspace-routing
type: req
---
When a Kibi MCP tool call carries a workspaceRoot argument, the Kibi MCP server must answer the call from the Kibi workspace that owns that directory.

When a Kibi MCP tool call without a workspaceRoot argument arrives from a client that declares MCP roots, the Kibi MCP server must answer the call from the Kibi workspace named by the client roots.

The Kibi MCP server must serve another workspace only when it is a worktree of the attached repository, lies under the client roots, or is listed in the routable roots allowlist.

When the Kibi MCP server cannot answer a call from the requested workspace, it must answer from the attached workspace and add a workspace_mismatch diagnostic to the result.

When a Kibi workspace environment variable is set, the Kibi MCP server must not route calls.

A routed Kibi MCP child server must not route calls further.

The Kibi MCP server must strip the workspaceRoot argument before dispatching a tool call.
