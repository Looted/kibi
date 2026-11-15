---
title: MCP binary exposes deterministic top-level help without entering stdio mode
status: active
tags:
  - strict-lane
fact_kind: subject
subject_key: mcp.binary.help
canonical_key: req.req_mcp_cli_help
id: FACT-SUBJ-REQ-MCP-CLI-HELP
type: fact
origin:
  kind: migration
  ref: kibi migrate v5->v6
  recorded_at: '2026-10-04T01:17:15.284Z'
---

The --help and -h behavior of the kibi-mcp binary: it prints deterministic top-level help and exits without starting the stdio server, even when other flags are present. It is not the help of the kibi CLI.
