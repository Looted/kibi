---
title: 'Reported: symbol sourceFile coordinate refresh could oracle files outside the workspace'
status: active
tags:
  - security
  - symbols
  - coordinates
  - path-escape
  - mcp-safeguard
fact_kind: observation
id: FACT-OBS-SYMBOL-SOURCEFILE-PATH-ESCAPE
type: fact
---
# Reported: symbol sourceFile coordinate refresh could oracle files outside the workspace

Private disclosure (mcp-safeguard, 2026-10-19): `sourceFile` typed as uri accepted any string; coordinate refresh resolved absolute paths and searched titles, returning line/column and content hash without returning raw file bytes. Fixed by workspace-relative validation and confined reads.
