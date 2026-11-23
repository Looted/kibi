---
title: kibi.vibe.win32_routing subject
status: active
fact_kind: subject
subject_key: kibi.vibe.win32_routing
origin:
  kind: agent
  recorded_at: '2026-11-21T18:27:52.415Z'
id: FACT-SUBJ-VIBE-WIN32-ROUTING
type: fact
---
The kibi-vibe launcher's runtime routing decisions on Windows: which spawn mode (native direct vs WSL wrap) a workspace path gets, and how the KIBI_FORCE_WSL / KIBI_FORCE_DIRECT overrides behave. Implemented by planRuntime in packages/vibe/bin/kibi-runtime.mjs.
