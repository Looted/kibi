---
title: VS Code MCP provider sets KIBI_MCP_ATTACH_ROOT
status: active
fact_kind: property_value
subject_key: vscode.mcp_provider
property_key: attach_env_var
operator: eq
value_type: string
value_string: KIBI_MCP_ATTACH_ROOT
text_ref: REQ-vscode-mcp-server-provider
claim_key: CLAIM-99A33D010BCC43F4
claim_text: The VS Code MCP provider must pass KIBI_MCP_ATTACH_ROOT to the server environment instead of pinning KIBI_WORKSPACE
origin:
  kind: agent
  ref: 'PR #879 review: every other launcher uses KIBI_MCP_ATTACH_ROOT so per-call workspace routing stays active'
  recorded_at: '2026-11-25T18:05:47.557Z'
id: FACT-vscode-mcp-provider-attach-env
type: fact
---
Setting KIBI_MCP_ATTACH_ROOT instead of KIBI_WORKSPACE provides the default attach root without disabling per-call workspace routing.
