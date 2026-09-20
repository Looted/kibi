---
"kibi-cli": patch
"kibi-runtime": patch
"kibi-mcp": patch
---

Capability plugins can now be loaded safely from a project's package.json without changing default behavior when none are configured.

Kibi hosts a lazy, injectable capability-plugin registry shared by CLI and MCP. Builtin providers always register; optional packages load only when a capability is first used, with replace/augment/shadow mode rules and an allowlist that keeps external semantic classifiers out of sync/check/upsert/status/proof paths.

- Add `packages/cli/src/plugins` host loader/registry, composition helpers, and source-analysis service
- Wire `OperationContext.ensurePlugins` through CLI and MCP runtimes
- Pass operation context through MCP semantic-advisor / model-requirement / suggest-predicates registration
- Depend on `kibi-plugin-sdk` `^0.1.0` and re-export the registry from `kibi-runtime`
