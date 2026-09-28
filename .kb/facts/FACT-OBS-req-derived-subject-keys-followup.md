---
title: Requirement-derived subject keys remain on 28 requirements
status: active
fact_kind: observation
tags:
  - vocabulary
  - follow-up
  - subject-key-identity
id: FACT-OBS-req-derived-subject-keys-followup
type: fact
---
Observation: the mechanical subset of requirement-derived subject keys (opencode, cursor, vscode, codex, mcp kb_query/kb_upsert, staged check) was renamed to shared component.aspect subjects. 28 subject facts still carry req.<requirement_id> keys (for example req.req_cli_gc, req.req_mcp_search_discovery, req.req_skillopt_*), and 11 subjects fail the component.aspect shape (bare kibi, kibi_zcode_*, bootstrap_workflow). Each needs a judgment about which shared component subject it governs, so they are left for a follow-up rather than renamed mechanically. subject-key-identity and subject-key-shape report them as warnings.
