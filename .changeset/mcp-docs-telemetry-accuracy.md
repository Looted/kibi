---
"kibi-mcp": patch
---

The `kibi://docs` constraints resource no longer says the server sends no telemetry and makes no network requests. It now says what does leave the machine: anonymous usage telemetry (operation names, outcomes and durations, never code, paths, queries or KB content), which `kibi telemetry disable`, `KIBI_TELEMETRY=0` or `DO_NOT_TRACK=1` turns off and which is off in CI and under test runners; git fetches of pinned KB dependencies; and the opt-in `kb_sparql_remote` tool. The `kibi_overview` prompt and the overview resource now list the whole tool set, including `kb_record`, `kb_skills`, `kb_review_firm_edit`, `kb_model` and the planning tools.
