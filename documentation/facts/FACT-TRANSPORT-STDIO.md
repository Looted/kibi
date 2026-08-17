---
id: FACT-TRANSPORT-STDIO
title: MCP Transport Is Stdio
status: active
created_at: 2026-02-20T14:25:00.000Z
updated_at: 2026-02-20T14:25:00.000Z
source: documentation/facts/FACT-TRANSPORT-STDIO.md
tags:
  - mcp
  - transport
fact_kind: property_value
subject_key: kibi.mcp.server_interface
property_key: transport_protocol
operator: eq
value_type: string
value_string: stdio
claim_key: CLAIM-6F8F2560C37BC20C
claim_text: The kibi-mcp server exposes a JSON-RPC 2.0 interface over stdin/stdout
type: fact
---

The MCP transport uses stdin and stdout for JSON-RPC messages.
