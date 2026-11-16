---
"kibi-cli": patch
"kibi-mcp": patch
"kibi-opencode": patch
---

No user-visible change. Unused internal helpers that no command, tool or hook called any more are removed, with the tests that only exercised them.

Removed: `copySyncCache`, `extractFromRelationshipShards`, `flattenRelationships`, `termVariables`, `manifestRelationships`, `assertRuleSchemaArity`, `getInvalidTypeError`, `buildQuerySummaryText`, `getKbEvidencePaths`, `getVolatileArtifactPatterns`, the deprecated `resolveDefaultBranch`, `readKbManifestOrDefault` and `DEFAULT_SYMBOLS_PATH` in `kibi-cli`; the deprecated `loadEnvFile` and `getEnvFileName` in `kibi-mcp`; `pushEventHintIfKind` in `kibi-opencode`. None of them is part of a package's public exports.
