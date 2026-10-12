---
"kibi-runtime": patch
"kibi-mcp": patch
---

kibi-mcp 3.9.0 still refused a grounding fact sent with `claim_text` and no `claim_key`, and its `kb_upsert` schema still said `claim_text` requires `claim_key`, although kibi-cli 2.21.0 derives the key. The MCP server loads Kibi's operations from kibi-runtime, which bundles the CLI sources at build time, and kibi-runtime 2.14.1 was built before that change. This release rebuilds kibi-runtime so the derived claim key, the `kibi migrate` receipt and approved-action fixes, and the kibi-usage 2.15.3 skill reach MCP hosts, and bumps kibi-mcp to depend on it.

Technical summary: release-only change; no source edits. kibi-runtime bundles `packages/cli/src` into `dist/index.js`, so any CLI source change that MCP hosts must see needs a kibi-runtime changeset alongside the kibi-cli one.
